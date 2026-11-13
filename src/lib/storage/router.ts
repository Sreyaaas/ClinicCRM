import 'server-only';
import { randomUUID } from 'node:crypto';
import type { DocumentType } from '@prisma/client';
import { b2Adapter, isB2Configured } from './b2-adapter';
import { localAdapter } from './local-adapter';
import type { SignedUploadTarget, StorageAdapter, StorageProviderId } from './types';

export function getActiveStorageProvider(): StorageProviderId {
  const configured = process.env.ACTIVE_STORAGE_PROVIDER;
  if (configured === 'b2') return 'b2';
  if (configured === 'local') return 'local';
  return isB2Configured() ? 'b2' : 'local';
}

export function getAdapterForProvider(provider: string): StorageAdapter {
  if (provider === 'b2') return b2Adapter;
  if (provider === 'local') return localAdapter;
  throw new Error(`Unsupported storage provider: ${provider}`);
}

const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export function isAllowedDocumentMime(mimeType: string): boolean {
  return mimeType in MIME_TO_EXT;
}

export function buildStorageKey(params: {
  clinicId: string;
  patientId: string;
  docType: DocumentType;
  mimeType: string;
}): string {
  const ext = MIME_TO_EXT[params.mimeType] ?? 'bin';
  return `clinics/${params.clinicId}/patients/${params.patientId}/${params.docType.toLowerCase()}/${randomUUID()}.${ext}`;
}

export async function createUploadTarget(params: {
  clinicId: string;
  patientId: string;
  docType: DocumentType;
  mimeType: string;
  sizeBytes: number;
}): Promise<SignedUploadTarget> {
  const provider = getActiveStorageProvider();
  const adapter = getAdapterForProvider(provider);
  const storageKey = buildStorageKey(params);
  return adapter.createSignedUploadUrl({
    storageKey,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  });
}

export async function createReadUrlForDocument(params: {
  storageProvider: string;
  storageKey: string;
  filename?: string;
}): Promise<string> {
  const adapter = getAdapterForProvider(params.storageProvider);
  return adapter.createSignedReadUrl({
    storageKey: params.storageKey,
    filename: params.filename,
  });
}

export async function deleteStoredDocument(params: {
  storageProvider: string;
  storageKey: string;
}): Promise<void> {
  const adapter = getAdapterForProvider(params.storageProvider);
  await adapter.deleteObject(params.storageKey);
}
