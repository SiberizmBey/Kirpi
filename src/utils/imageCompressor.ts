/**
 * Kirpi - Image Compression Utility
 * Resizes and compresses image files into small, high-quality Base64 DataURLs
 * to ensure fast Firestore storage and eliminate document size overflow errors.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  cropToSquare?: boolean;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 320,
    maxHeight = 320,
    quality = 0.85,
    cropToSquare = true,
  } = options;

  return new Promise((resolve, reject) => {
    // Check if it is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Lütfen geçerli bir görsel dosyası seçin.'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Canvas bağlamı oluşturulamadı.'));
        }

        let sx = 0;
        let sy = 0;
        let sWidth = img.width;
        let sHeight = img.height;
        let dWidth = maxWidth;
        let dHeight = maxHeight;

        if (cropToSquare) {
          // Center crop to 1:1 square
          const minDim = Math.min(img.width, img.height);
          sx = (img.width - minDim) / 2;
          sy = (img.height - minDim) / 2;
          sWidth = minDim;
          sHeight = minDim;
          dWidth = Math.min(maxWidth, minDim);
          dHeight = dWidth;
        } else {
          // Preserve aspect ratio
          const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          dWidth = Math.round(img.width * ratio);
          dHeight = Math.round(img.height * ratio);
        }

        canvas.width = dWidth;
        canvas.height = dHeight;

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);

        // Export as compressed WebP if supported, otherwise JPEG
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Görsel dosyası okunamadı.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Dosya yüklenemedi.'));
    };

    reader.readAsDataURL(file);
  });
}
