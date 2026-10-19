// frontend/src/services/ocrService.js

import axios from 'axios';

const API = '/api/ocr';
const OCR_TIMEOUT_MS = 60000; // 60s timeout per implementation plan

export const MATERIAL_WHITELIST = [
  'Battery',
  'L. Steel',
  'M. Steel',
  'H. Steel',
  'Steel',
  'L. Wire',
  'M. Wire',
  'H. Wire',
  'Ex',
  'Ex. D.D',
  'Dom',
  'AL Dom',
  'Rad',
  'RD Copper',
  'RD. C',
  'RD. D',
  'C B Rad D',
  'C B Rad C',
  'ACR C',
  'ACR D',
  'Starter',
  'C. Brass',
  'No.1',
  'No.2',
  'No.3',
  'No.4',
  'Brass C',
  'Brass D',
  'Copper Domestic',
  'Dom Brass',
  'Copper 1',
  'Copper 2',
  'Copper 3',
  'Copper 4',
  'Black Engine',
  'White Engine',
  'W. Eng',
  'B. Eng',
  'Irony',
  'H. Irony',
  'E Part',
  'Eng',
  'Fan',
  'Motor',
  'E. Motor',
  'RIM',
  'RIM D',
  'S.S',
  'S/S',
  '316',
  'Cast',
  'Lead',
  'Box',
  'Cutting',
  'Beer',
  'Plug',
  'C Wire',
  'Car Wire',
  'Computer',
];

/**
 * Downscales high-resolution camera photos (e.g. 48MP) to max 2000px
 * and applies any manual rotation (0, 90, 180, 270 degrees) on an HTML5 canvas
 * before uploading to the backend.
 */
export async function compressAndRotateImage(
  fileOrBlob,
  rotationDeg = 0,
  maxDimension = 2000,
  quality = 0.86
) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
        const swapDimensions = normalizedRotation === 90 || normalizedRotation === 270;

        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          const scale = maxDimension / Math.max(targetWidth, targetHeight);
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = swapDimensions ? targetHeight : targetWidth;
        canvas.height = swapDimensions ? targetWidth : targetHeight;

        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normalizedRotation * Math.PI) / 180);
        ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image on canvas.'));
              return;
            }
            const fileName = (fileOrBlob.name || 'capture.webp').replace(/\.[^.]+$/, '') + '.webp';
            const processedFile = new File([blob], fileName, { type: 'image/webp' });
            const previewUrl = URL.createObjectURL(blob);
            resolve({ file: processedFile, previewUrl });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for preprocessing.'));
    };

    img.src = objectUrl;
  });
}

const ocrService = {
  /**
   * Sends 1 to N docket page images to POST /api/ocr/scan-docket
   * @param {Array<{file: File, rotation?: number}>} pageItems
   * @param {Function} onStageChange Optional callback: (stageIndex, percent, title) => void
   */
  scanDocket: async (pageItems, onStageChange) => {
    if (onStageChange) {
      onStageChange(0, 25, 'Compressing & optimizing docket pages...');
    }

    const formData = new FormData();
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const { file: optimizedFile } = await compressAndRotateImage(
        item.file,
        item.rotation || 0
      );
      formData.append('files', optimizedFile, `docket_page_${i + 1}.webp`);
    }

    if (onStageChange) {
      onStageChange(1, 65, 'Gemini 4 Argon reading handwriting...');
    }

    const res = await axios.post(`${API}/scan-docket`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: OCR_TIMEOUT_MS,
    });

    if (onStageChange) {
      onStageChange(2, 100, 'Ready! Opening review workspace...');
    }

    return res.data;
  },

  /**
   * Sends a single Customer ID / Driver Licence image to POST /api/ocr/scan-id
   * @param {File} file
   * @param {number} rotation
   * @param {Function} onStageChange Optional callback: (stageIndex, percent, title) => void
   */
  scanCustomerId: async (file, rotation = 0, onStageChange) => {
    if (onStageChange) {
      onStageChange(0, 25, 'Optimizing ID card image...');
    }

    const { file: optimizedFile } = await compressAndRotateImage(file, rotation);
    const formData = new FormData();
    formData.append('file', optimizedFile, 'customer_id.webp');

    if (onStageChange) {
      onStageChange(1, 65, 'Gemini 4 Argon extracting ID details...');
    }

    const res = await axios.post(`${API}/scan-id`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: OCR_TIMEOUT_MS,
    });

    if (onStageChange) {
      onStageChange(2, 100, 'Extraction complete!');
    }

    return res.data;
  },
};

export default ocrService;

