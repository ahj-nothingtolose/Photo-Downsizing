/**
 * Sony Alpha RAW (.ARW) & TIFF-based RAW Stream Extractor
 * 
 * Supports Sony Alpha 7R VI (ILCE-7RM6), a7R V (ILCE-7RM5), a7R IV (ILCE-7RM4),
 * a1, a9 III, a7 IV, and other ARW / DNG formats.
 * 
 * Sony ARW files contain embedded high-resolution JPEG previews
 * inside SubIFDs / Sony MakerNotes. This utility extracts the highest-resolution
 * preview stream directly from the ARW binary payload.
 */

export interface RawExtractionResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  previewType: 'full-preview' | 'embedded-large' | 'thumbnail';
}

/**
 * Parses SOF0/SOF2 header to extract JPEG width and height without full decode
 */
function getJpegDimensions(data: Uint8Array, offset: number, maxLen: number): { width: number; height: number } | null {
  let pos = offset;
  const end = Math.min(data.length, offset + maxLen);

  // Must start with SOI
  if (data[pos] !== 0xFF || data[pos + 1] !== 0xD8) {
    return null;
  }
  pos += 2;

  while (pos < end - 8) {
    if (data[pos] !== 0xFF) {
      pos++;
      continue;
    }

    const marker = data[pos + 1];

    // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2) markers contain dimensions
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      const height = (data[pos + 5] << 8) | data[pos + 6];
      const width = (data[pos + 7] << 8) | data[pos + 8];
      return { width, height };
    }

    // Skip variable-length marker segments
    if (marker !== 0xD8 && marker !== 0xD9 && marker !== 0x00 && (marker < 0xD0 || marker > 0xD7)) {
      const len = (data[pos + 2] << 8) | data[pos + 3];
      pos += 2 + len;
    } else {
      pos += 2;
    }
  }

  return null;
}

/**
 * Scans an ARW / RAW file buffer for all embedded JPEG streams and extracts the largest one.
 */
export async function extractSonyArwPreview(file: File | Blob): Promise<RawExtractionResult | null> {
  try {
    // Read up to 48MB (covers header, IFD0, SubIFDs, MakerNotes where Sony stores previews)
    const scanLimit = Math.min(file.size, 48 * 1024 * 1024);
    const slice = file.slice(0, scanLimit);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    interface CandidateJpeg {
      offset: number;
      length: number;
      width: number;
      height: number;
    }

    const candidates: CandidateJpeg[] = [];

    // Scan for JPEG SOI markers (0xFF 0xD8 0xFF)
    for (let i = 0; i < bytes.length - 1024; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        // Look for candidate dimensions in first 16KB of this JPEG stream
        const dims = getJpegDimensions(bytes, i, 16384);
        if (dims && dims.width > 200 && dims.height > 200) {
          // Find matching EOI marker (0xFF 0xD9)
          let eoi = -1;
          // Look forward up to 16MB for EOI
          const maxSearch = Math.min(bytes.length, i + 16 * 1024 * 1024);
          for (let j = i + 1024; j < maxSearch - 1; j++) {
            if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
              eoi = j + 2;
              break;
            }
          }

          if (eoi > i) {
            candidates.push({
              offset: i,
              length: eoi - i,
              width: dims.width,
              height: dims.height,
            });
            // advance pointer
            i = eoi - 1;
          }
        }
      }
    }

    if (candidates.length > 0) {
      // Pick the candidate with the highest pixel count (width * height)
      candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      const best = candidates[0];

      // Extract the JPEG slice from original file
      const jpegBlob = file.slice(best.offset, best.offset + best.length, 'image/jpeg');
      const url = URL.createObjectURL(jpegBlob);

      return {
        blob: jpegBlob,
        url,
        width: best.width,
        height: best.height,
        previewType: best.width >= 1920 ? 'full-preview' : 'embedded-large',
      };
    }
  } catch (err) {
    console.warn('Sony ARW binary preview extraction error:', err);
  }

  return null;
}

/**
 * Normalizes camera model strings, recognizing Sony Alpha 7R VI, a7R V, a7R IV, etc.
 */
export function formatSonyCameraModel(model?: string, make?: string): string {
  if (!model) return 'Unknown Camera';
  const clean = model.trim();

  // Sony a7R VI variants (ILCE-7RM6, ILCE-7RM6A, Alpha 7R VI, a7R VI)
  if (/7RM6/i.test(clean) || /a7R\s*VI/i.test(clean) || /Alpha\s*7R\s*VI/i.test(clean)) {
    return 'Sony Alpha 7R VI (ILCE-7RM6)';
  }

  // Sony a7R V
  if (/7RM5/i.test(clean) || /a7R\s*V/i.test(clean) || /Alpha\s*7R\s*V/i.test(clean)) {
    return 'Sony Alpha 7R V (ILCE-7RM5)';
  }

  // Sony a7R IV
  if (/7RM4/i.test(clean) || /a7R\s*IV/i.test(clean) || /Alpha\s*7R\s*IV/i.test(clean)) {
    return 'Sony Alpha 7R IV (ILCE-7RM4)';
  }

  // Sony Alpha 1
  if (/ILCE-1/i.test(clean) || /Alpha\s*1/i.test(clean)) {
    return 'Sony Alpha 1 (ILCE-1)';
  }

  // Sony a7 IV
  if (/7M4/i.test(clean) || /a7\s*IV/i.test(clean)) {
    return 'Sony Alpha 7 IV (ILCE-7M4)';
  }

  // If make is Sony and not already prefixed
  if (make && /SONY/i.test(make) && !/Sony/i.test(clean)) {
    return `Sony ${clean}`;
  }

  return clean;
}
