import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getJwtSecretBytes } from '@/lib/auth';
import type { SignedUploadTarget, StorageAdapter } from './types';

const LOCAL_ROOT = path.resolve(process.cwd(), '.local-storage');

export function resolveSafeLocalPath(storageKey: string): string {
  const cleanKey = storageKey.replace(/^\/+/, '');
  const resolved = path.resolve(LOCAL_ROOT, cleanKey);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error('Invalid storage key path.');
  }
  return resolved;
}

export function signLocalUploadToken(storageKey: string, mimeType: string, expMs: number): string {
  const hmac = createHmac('sha256', getJwtSecretBytes());
  hmac.update(`${storageKey}|${mimeType}|${expMs}`);
  return hmac.digest('hex');
}

export function verifyLocalUploadToken(
  storageKey: string,
  mimeType: string,
  expMs: number,
  signature: string
): boolean {
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const expected = signLocalUploadToken(storageKey, mimeType, expMs);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function writeLocalStorageObject(storageKey: string, data: Buffer): Promise<void> {
  const filePath = resolveSafeLocalPath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export async function readLocalStorageObject(storageKey: string): Promise<Buffer> {
  const filePath = resolveSafeLocalPath(storageKey);
  return readFile(filePath);
}

export const localAdapter: StorageAdapter = {
  id: 'local',

  async createSignedUploadUrl({ storageKey, mimeType }) {
    const expMs = Date.now() + 5 * 60 * 1000;
    const sig = signLocalUploadToken(storageKey, mimeType, expMs);
    const params = new URLSearchParams({
      key: storageKey,
      mime: mimeType,
      exp: String(expMs),
      sig,
    });
    const target: SignedUploadTarget = {
      provider: 'local',
      storageKey,
      uploadUrl: `/api/files/local-upload?${params.toString()}`,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
    };
    return target;
  },

  async createSignedReadUrl({ storageKey }) {
    return `/api/files/local-read?key=${encodeURIComponent(storageKey)}`;
  },

  async deleteObject(storageKey: string) {
    const filePath = resolveSafeLocalPath(storageKey);
    await unlink(filePath).catch(() => undefined);
  },
};
