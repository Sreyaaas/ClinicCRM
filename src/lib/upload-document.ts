import { prepareDocumentForUpload } from './client-image';

export type DocTypeValue =
  | 'PAPER_SLIP'
  | 'BLOOD_REPORT'
  | 'IMAGING_SCAN'
  | 'ECG'
  | 'DISCHARGE_SUMMARY'
  | 'EXTERNAL_RX'
  | 'OTHER';

export interface UploadedDocResult {
  id: string;
  docType: DocTypeValue;
  title: string;
  reportDate: string;
  storageProvider: string;
  sizeBytes: number;
}

export async function uploadPatientDocument(params: {
  file: File;
  patientId: string;
  visitId?: string | null;
  docType: DocTypeValue;
  title: string;
  notes?: string;
  reportDate?: string;
  highContrastScan?: boolean;
}): Promise<{ document: UploadedDocResult; originalSizeBytes: number }> {
  const prepared = await prepareDocumentForUpload(params.file, {
    highContrastScan: params.highContrastScan,
  });

  const targetRes = await fetch('/api/documents/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: params.patientId,
      docType: params.docType,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.sizeBytes,
    }),
  });

  const targetData = await targetRes.json();
  if (!targetRes.ok) {
    throw new Error(targetData.error || 'Could not initiate upload.');
  }

  const putRes = await fetch(targetData.uploadUrl, {
    method: targetData.method || 'PUT',
    headers: targetData.headers || { 'Content-Type': prepared.mimeType },
    body: prepared.blob,
  });

  if (!putRes.ok) {
    throw new Error(`Storage upload failed (${putRes.status}). Check B2 CORS/keys if using Backblaze.`);
  }

  const saveRes = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: params.patientId,
      visitId: params.visitId ?? null,
      docType: params.docType,
      title: params.title,
      notes: params.notes || null,
      reportDate: params.reportDate,
      storageProvider: targetData.provider,
      storageKey: targetData.storageKey,
      originalFilename: prepared.filename,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.sizeBytes,
    }),
  });

  const saveData = await saveRes.json();
  if (!saveRes.ok) {
    throw new Error(saveData.error || 'Could not save document metadata.');
  }

  return {
    document: saveData.document,
    originalSizeBytes: prepared.originalSizeBytes,
  };
}
