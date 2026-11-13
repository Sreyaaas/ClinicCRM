/**
 * Client-side image optimization for Gemini Multimodal OCR.
 *
 * Saves up to 80% tokens by downscaling ultra-high-resolution smartphone photos
 * (e.g. 4000x3000, 10MB) to 1600px max dimension at 85% JPEG quality.
 * This keeps handwriting and decimal points razor-sharp while reducing vision tiles from ~24 to ~4.
 */

export interface OptimizedImageResult {
  base64Data: string;
  mimeType: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  width: number;
  height: number;
  file: File;
}

export async function optimizePrescriptionImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<OptimizedImageResult> {
  // If not running in a browser environment, return raw
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    return {
      base64Data,
      mimeType: file.type || 'image/jpeg',
      originalSizeBytes: file.size,
      optimizedSizeBytes: file.size,
      width: 0,
      height: 0,
      file,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Calculate aspect-preserving dimensions if larger than maxDimension
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Fill white background (useful for transparent PNGs)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // High-quality downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create JPEG blob from canvas'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Strip data:image/jpeg;base64, prefix for Gemini API
            const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve({
              base64Data,
              mimeType,
              originalSizeBytes: file.size,
              optimizedSizeBytes: blob.size,
              width: targetWidth,
              height: targetHeight,
              file: optimizedFile,
            });
          };
          reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
          reader.readAsDataURL(blob);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image file'));
    };

    img.src = objectUrl;
  });
}
