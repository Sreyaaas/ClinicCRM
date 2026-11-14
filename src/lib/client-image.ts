export interface PreparedUploadFile {
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
}

const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

/**
 * Compresses camera photos in the browser before uploading to Backblaze B2 / storage.
 * Keeps printed blood reports and handwritten slips sharp (~200-350 KB) while cutting 4G upload time.
 */
export async function prepareDocumentForUpload(
  file: File,
  options?: { highContrastScan?: boolean }
): Promise<PreparedUploadFile> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('PDF file exceeds the 6 MB limit.');
    }
    return {
      blob: file,
      filename: file.name || 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: file.size,
      originalSizeBytes: file.size,
    };
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPG, PNG, WebP) and PDFs are supported.');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas is unavailable for image processing.');
    }

    if (options?.highContrastScan) {
      ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.05)';
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await encodeBestEffort(canvas);
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = (file.name || 'scan').replace(/\.[^.]+$/, '');

    return {
      blob,
      filename: `${baseName}.${ext}`,
      mimeType: blob.type,
      sizeBytes: blob.size,
      originalSizeBytes: file.size,
    };
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), type, quality);
  });
}

async function encodeBestEffort(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await canvasToBlob(canvas, 'image/webp', 0.8);
  if (webp && webp.type === 'image/webp') {
    return webp;
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.82);
  if (jpeg) {
    return jpeg;
  }
  throw new Error('Could not compress selected image.');
}
