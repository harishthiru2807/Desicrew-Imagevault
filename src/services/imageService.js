/**
 * imageService.js
 * Handles image compression, conversion, and platform-aware reading/writing.
 */

/**
 * Compress an image Blob to target quality.
 * @param {Blob} blob - Input image blob
 * @param {number} maxWidth - Max output width in px
 * @param {number} quality - JPEG quality 0–1
 * @returns {Promise<Blob>}
 */
export async function compressImage(blob, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) resolve(compressedBlob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}

/**
 * Convert a File or Blob to a data URL string.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a data URL to a Blob.
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

/**
 * Read a File object, optionally compress it, and return both blob and preview URL.
 * @param {File} file
 * @param {{ compress?: boolean, maxWidth?: number, quality?: number }} opts
 * @returns {Promise<{ blob: Blob, previewUrl: string }>}
 */
export async function processImageFile(file, opts = {}) {
  const { compress = true, maxWidth = 1200, quality = 0.8 } = opts;
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not a valid image');
  }
  let blob = file;
  if (compress && file.size > 500 * 1024) {
    try {
      blob = await compressImage(file, maxWidth, quality);
    } catch {
      // Fall back to original
      blob = file;
    }
  }
  const previewUrl = URL.createObjectURL(blob);
  return { blob, previewUrl };
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
