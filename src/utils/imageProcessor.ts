import { PhotoExifData, injectExifIntoJpeg } from './exifService';

export interface ProcessingOptions {
  longEdge: number; // e.g. 2048
  jpegQuality: number; // 0.70 to 1.0 (default 0.94)
  enableSharpen: boolean;
  sharpenAmount: number; // 0 to 100
  sharpenRadius: number; // 0.5 to 2.5
  enableDenoise: boolean;
  denoiseStrength: number; // 0 to 100
}

export interface ProcessedPhotoResult {
  dataUrl: string;
  blob: Blob;
  outputWidth: number;
  outputHeight: number;
  originalWidth: number;
  originalHeight: number;
  outputBytes: number;
  originalBytes: number;
  timeMs: number;
}

/**
 * Calculates downsized dimensions preserving aspect ratio with the specified long edge.
 */
export function calculateDownsizedDimensions(
  origW: number,
  origH: number,
  targetLongEdge: number = 2048
): { width: number; height: number; scale: number } {
  if (origW <= 0 || origH <= 0) {
    return { width: targetLongEdge, height: targetLongEdge, scale: 1 };
  }

  const isLandscapeOrSquare = origW >= origH;
  let targetW: number;
  let targetH: number;

  if (isLandscapeOrSquare) {
    targetW = Math.min(origW, targetLongEdge);
    targetH = Math.round((targetW * origH) / origW);
  } else {
    targetH = Math.min(origH, targetLongEdge);
    targetW = Math.round((targetH * origW) / origH);
  }

  // Ensure minimum 1px
  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  const scale = targetW / origW;
  return { width: targetW, height: targetH, scale };
}

/**
 * Loads an HTMLImageElement from a URL with CORS support.
 */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = url;
  });
}

/**
 * Downsizes photo using multi-step downsampling for maximum quality and antialiasing,
 * applies edge-aware subject sharpening and bilateral denoising, and injects EXIF metadata.
 */
export async function processAndDownsizePhoto(
  imageUrl: string,
  options: ProcessingOptions,
  exifData?: PhotoExifData,
  originalBytes: number = 0
): Promise<ProcessedPhotoResult> {
  const startTime = performance.now();
  const img = await loadImageElement(imageUrl);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const { width: targetW, height: targetH } = calculateDownsizedDimensions(origW, origH, options.longEdge);

  // High-fidelity multi-step downscaling canvas pipeline
  // If downscaling by more than 2x (e.g. 6000px down to 2048px), step-down halving produces
  // significantly better sharpness and avoids aliasing/shimmering.
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = origW;
  currentCanvas.height = origH;
  let currentCtx = currentCanvas.getContext('2d', { willReadFrequently: true })!;
  currentCtx.drawImage(img, 0, 0, origW, origH);

  let curW = origW;
  let curH = origH;

  // Step down by half until near target
  while (curW / 2 >= targetW && curH / 2 >= targetH) {
    const nextW = Math.round(curW / 2);
    const nextH = Math.round(curH / 2);
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d', { willReadFrequently: true })!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

    currentCanvas = stepCanvas;
    currentCtx = stepCtx;
    curW = nextW;
    curH = nextH;
  }

  // Final resize to exact target dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true })!;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(currentCanvas, 0, 0, curW, curH, 0, 0, targetW, targetH);

  // Apply Pixel Filters (Denoise & Sharpen) if enabled
  if (options.enableDenoise || options.enableSharpen) {
    const imageData = finalCtx.getImageData(0, 0, targetW, targetH);

    // 1. Bilateral Denoising (smoothes grain in out-of-focus & uniform areas while preserving high contrast edges)
    if (options.enableDenoise && options.denoiseStrength > 0) {
      applyEdgePreservingDenoise(imageData, options.denoiseStrength);
    }

    // 2. Subject & Edge-Aware Sharpening (amplifies subject textures, eyes, facial details, landscape rocks without amplifying sky noise)
    if (options.enableSharpen && options.sharpenAmount > 0) {
      applySubjectAwareSharpen(imageData, options.sharpenAmount, options.sharpenRadius);
    }

    finalCtx.putImageData(imageData, 0, 0);
  }

  // Export to high-quality JPEG
  const rawJpegDataUrl = finalCanvas.toDataURL('image/jpeg', options.jpegQuality);

  // Inject preserved EXIF metadata if available
  let finalDataUrl = rawJpegDataUrl;
  if (exifData) {
    finalDataUrl = injectExifIntoJpeg(rawJpegDataUrl, exifData, targetW, targetH);
  }

  // Convert to Blob for easy download and zip
  const blob = dataUrlToBlob(finalDataUrl);
  const timeMs = Math.round(performance.now() - startTime);

  return {
    dataUrl: finalDataUrl,
    blob,
    outputWidth: targetW,
    outputHeight: targetH,
    originalWidth: origW,
    originalHeight: origH,
    outputBytes: blob.size,
    originalBytes: originalBytes || 0,
    timeMs,
  };
}

/**
 * Fast edge-preserving bilateral-like denoising filter for high-ISO grain and chrominance noise.
 */
function applyEdgePreservingDenoise(imageData: ImageData, strength: number) {
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const len = data.length;

  // Map 0-100 to sigma range
  const sigmaRange = 12 + (strength / 100) * 35; // Color sensitivity
  const radius = strength > 60 ? 2 : 1; // 3x3 or 5x5 window

  const rangeWeight = (diff: number) => {
    return Math.exp(-(diff * diff) / (2 * sigmaRange * sigmaRange));
  };

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      const r0 = src[idx];
      const g0 = src[idx + 1];
      const b0 = src[idx + 2];

      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          const nr = src[nIdx];
          const ng = src[nIdx + 1];
          const nb = src[nIdx + 2];

          // Color Euclidean distance
          const colorDiff = Math.sqrt(
            (r0 - nr) * (r0 - nr) +
            (g0 - ng) * (g0 - ng) +
            (b0 - nb) * (b0 - nb)
          );

          // Spatial weight
          const spatialDistSq = dx * dx + dy * dy;
          const sWeight = Math.exp(-spatialDistSq / 4);
          const weight = sWeight * rangeWeight(colorDiff);

          rSum += nr * weight;
          gSum += ng * weight;
          bSum += nb * weight;
          wSum += weight;
        }
      }

      if (wSum > 0) {
        // Blend between original and denoised based on strength
        const factor = (strength / 100) * 0.85;
        data[idx] = Math.round(r0 * (1 - factor) + (rSum / wSum) * factor);
        data[idx + 1] = Math.round(g0 * (1 - factor) + (gSum / wSum) * factor);
        data[idx + 2] = Math.round(b0 * (1 - factor) + (bSum / wSum) * factor);
      }
    }
  }
}

/**
 * Subject-Aware Unsharp Mask Sharpening.
 * Uses local gradient magnitude to detect subject boundaries and textures (eyes, eyelashes, hair,
 * foliage, architectural edges), focusing the sharpening on subjects while suppressing flat noise.
 */
function applySubjectAwareSharpen(imageData: ImageData, amount: number, radius: number = 1.0) {
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);

  // Sharpen multiplier (0 to 100 maps to 0 to 1.5)
  const strength = (amount / 100) * 1.35;
  const threshold = 6; // minimum contrast difference to qualify as a subject feature

  // 3x3 high-pass / unsharp mask with edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Current pixel RGB
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Neighbor luminance values for edge gradient & blur calculation
      const topIdx = ((y - 1) * width + x) * 4;
      const botIdx = ((y + 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;

      const lumTop = 0.299 * src[topIdx] + 0.587 * src[topIdx + 1] + 0.114 * src[topIdx + 2];
      const lumBot = 0.299 * src[botIdx] + 0.587 * src[botIdx + 1] + 0.114 * src[botIdx + 2];
      const lumLeft = 0.299 * src[leftIdx] + 0.587 * src[leftIdx + 1] + 0.114 * src[leftIdx + 2];
      const lumRight = 0.299 * src[rightIdx] + 0.587 * src[rightIdx + 1] + 0.114 * src[rightIdx + 2];

      // Sobel gradient magnitude (measures if this is an edge of the subject)
      const gradX = lumRight - lumLeft;
      const gradY = lumBot - lumTop;
      const grad = Math.sqrt(gradX * gradX + gradY * gradY);

      if (grad >= threshold) {
        // High-frequency detail estimation (laplacian)
        const avgR = (src[topIdx] + src[botIdx] + src[leftIdx] + src[rightIdx]) / 4;
        const avgG = (src[topIdx + 1] + src[botIdx + 1] + src[leftIdx + 1] + src[rightIdx + 1]) / 4;
        const avgB = (src[topIdx + 2] + src[botIdx + 2] + src[leftIdx + 2] + src[rightIdx + 2]) / 4;

        // Modulate sharpening by edge presence (subject boost, avoiding flat noise)
        const edgeWeight = Math.min(1.5, Math.max(0.2, grad / 25));
        const effectiveGain = strength * edgeWeight;

        const diffR = r - avgR;
        const diffG = g - avgG;
        const diffB = b - avgB;

        data[idx] = Math.min(255, Math.max(0, Math.round(r + diffR * effectiveGain)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(g + diffG * effectiveGain)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(b + diffB * effectiveGain)));
      }
    }
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Formats byte size into human readable string (e.g. 4.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
