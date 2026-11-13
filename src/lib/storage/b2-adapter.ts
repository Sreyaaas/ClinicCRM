import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { SignedUploadTarget, StorageAdapter } from './types';

function getB2Config() {
  const endpoint = process.env.B2_ENDPOINT;
  const region = process.env.B2_REGION;
  const bucket = process.env.B2_BUCKET;
  const accessKeyId = process.env.B2_KEY_ID;
  const secretAccessKey = process.env.B2_APP_KEY;

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Backblaze B2 is selected as storage provider, but B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_KEY_ID, or B2_APP_KEY is missing.'
    );
  }

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function isB2Configured(): boolean {
  return Boolean(
    process.env.B2_ENDPOINT &&
      process.env.B2_REGION &&
      process.env.B2_BUCKET &&
      process.env.B2_KEY_ID &&
      process.env.B2_APP_KEY
  );
}

let cachedClient: S3Client | null = null;

function getB2Client(): { client: S3Client; bucket: string } {
  const cfg = getB2Config();
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, bucket: cfg.bucket };
}

export const b2Adapter: StorageAdapter = {
  id: 'b2',

  async createSignedUploadUrl({ storageKey, mimeType }) {
    const { client, bucket } = getB2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const target: SignedUploadTarget = {
      provider: 'b2',
      storageKey,
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
    };
    return target;
  },

  async createSignedReadUrl({ storageKey, filename }) {
    const { client, bucket } = getB2Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ResponseContentDisposition: filename
        ? `inline; filename="${filename.replace(/["\r\n]/g, '')}"`
        : 'inline',
    });
    return getSignedUrl(client, command, { expiresIn: 300 });
  },

  async deleteObject(storageKey: string) {
    const { client, bucket } = getB2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      })
    );
  },
};
