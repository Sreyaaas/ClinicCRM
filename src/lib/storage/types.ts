export type StorageProviderId = 'b2' | 'local';

export interface SignedUploadTarget {
  provider: StorageProviderId;
  storageKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface StorageAdapter {
  readonly id: StorageProviderId;
  createSignedUploadUrl(params: {
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<SignedUploadTarget>;
  createSignedReadUrl(params: {
    storageKey: string;
    filename?: string;
  }): Promise<string>;
  deleteObject(storageKey: string): Promise<void>;
}
