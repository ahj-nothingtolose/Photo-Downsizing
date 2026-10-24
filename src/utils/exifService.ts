import exifr from 'exifr';
import piexif, { type ExifDict } from 'piexifjs';
import { extractSonyArwPreview, formatSonyCameraModel } from './sonyRawExtractor';

export interface PhotoExifData {
  make?: string;
  model?: string;
  lensModel?: string;
  focalLength?: number;
  focalLengthIn35mm?: number;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  exposureProgram?: string;
  meteringMode?: string;
  flash?: string;
  dateTimeOriginal?: Date | string;
  software?: string;
  artist?: string;
  copyright?: string;
  latitude?: number;
  longitude?: number;
  originalWidth?: number;
  originalHeight?: number;
  colorSpace?: string;
  rawExifDict?: any;
}

/**
 * Parses EXIF metadata from any File or Blob (JPEG, ARW, DNG, TIFF, etc.)
 */
export async function extractExif(file: File | Blob): Promise<PhotoExifData> {
  const result: PhotoExifData = {};

  try {
    // exifr can parse deep TIFF/RAW/JPEG tags
    const parsed = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: true,
      jfif: true,
      ihdr: true,
      iptc: true,
      exif: true,
      gps: true,
      interop: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
    });

    if (parsed) {
      result.make = parsed.Make ? String(parsed.Make).trim() : undefined;
      const rawModel = parsed.Model ? String(parsed.Model).trim() : undefined;
      result.model = formatSonyCameraModel(rawModel, result.make);
      result.lensModel = parsed.LensModel || parsed.LensInfo ? String(parsed.LensModel || parsed.LensInfo).trim() : undefined;
      result.focalLength = parsed.FocalLength;
      result.focalLengthIn35mm = parsed.FocalLengthIn35mmFormat || parsed.FocalLengthIn35mmFilm;
      result.fNumber = parsed.FNumber || parsed.ApertureValue;
      result.exposureTime = parsed.ExposureTime;
      result.iso = parsed.ISO || parsed.ISOSpeedRatings;
      result.exposureProgram = parsed.ExposureProgram ? String(parsed.ExposureProgram) : undefined;
      result.meteringMode = parsed.MeteringMode ? String(parsed.MeteringMode) : undefined;
      result.flash = parsed.Flash ? String(parsed.Flash) : undefined;
      result.dateTimeOriginal = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate;
      result.software = parsed.Software ? String(parsed.Software) : undefined;
      result.artist = parsed.Artist ? String(parsed.Artist) : undefined;
      result.copyright = parsed.Copyright ? String(parsed.Copyright) : undefined;
      result.latitude = parsed.latitude;
      result.longitude = parsed.longitude;
      result.originalWidth = parsed.ExifImageWidth || parsed.ImageWidth;
      result.originalHeight = parsed.ExifImageHeight || parsed.ImageHeight;
      result.colorSpace = parsed.ColorSpace ? String(parsed.ColorSpace) : undefined;

      // Special resolution normalization for Sony a7R VI / ILCE-7RM6 (61.0 MP)
      if (result.model && result.model.includes('7R VI') && (!result.originalWidth || result.originalWidth < 4000)) {
        result.originalWidth = 9504;
        result.originalHeight = 6336;
      }
    }
  } catch (err) {
    console.warn('Could not parse with exifr:', err);
  }

  // Also try reading raw EXIF dict with piexif if it is a JPEG or dataUrl
  try {
    const arrayBuffer = await file.arrayBuffer();
    const binary = arrayBufferToBinaryString(arrayBuffer);
    if (binary.startsWith('\xFF\xD8')) {
      const rawDict = piexif.load(binary);
      result.rawExifDict = rawDict;
    }
  } catch (err) {
    // Not a direct JPEG or piexif could not parse directly, which is normal for RAW
  }

  return result;
}

/**
 * Tries to extract an image preview URL for RAW files (Sony ARW, a7R VI, DNG, etc.) or standard files.
 */
export async function extractPreviewUrl(file: File): Promise<{ url: string; isFromRawPreview: boolean; extractedWidth?: number; extractedHeight?: number }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isSonyArw = extension === 'arw';
  const isRaw = ['arw', 'dng', 'cr2', 'cr3', 'nef', 'nrw', 'orf', 'rw2', 'pef', 'raf'].includes(extension);

  // For Sony ARW files (including Sony a7R VI), try our dedicated embedded JPEG scanner first
  if (isSonyArw) {
    try {
      const sonyResult = await extractSonyArwPreview(file);
      if (sonyResult) {
        return {
          url: sonyResult.url,
          isFromRawPreview: true,
          extractedWidth: sonyResult.width,
          extractedHeight: sonyResult.height,
        };
      }
    } catch (e) {
      console.warn('Sony ARW binary extraction attempt failed:', e);
    }
  }

  // Next attempt: try exifr.thumbnailUrl which extracts embedded JPEG preview in DNG/RAW files
  if (isRaw) {
    try {
      const thumbUrl = await exifr.thumbnailUrl(file);
      if (thumbUrl) {
        return { url: thumbUrl, isFromRawPreview: true };
      }
    } catch (e) {
      console.warn('RAW preview extraction via exifr failed:', e);
    }

    // Secondary scan for any other raw file format
    try {
      const deepResult = await extractSonyArwPreview(file);
      if (deepResult) {
        return {
          url: deepResult.url,
          isFromRawPreview: true,
          extractedWidth: deepResult.width,
          extractedHeight: deepResult.height,
        };
      }
    } catch (e) {
      console.warn('Deep raw preview extraction failed:', e);
    }
  }

  // Fallback or standard JPEG/PNG
  return { url: URL.createObjectURL(file), isFromRawPreview: false };
}

/**
 * Inserts preserved EXIF metadata into the downscaled JPEG data URL.
 * Automatically updates dimensions and software signature while retaining camera/lens tags.
 */
export function injectExifIntoJpeg(
  jpegDataUrl: string,
  exifData: PhotoExifData,
  newWidth: number,
  newHeight: number
): string {
  try {
    let exifObj: ExifDict = {
      '0th': {},
      Exif: {},
      GPS: {},
      Interop: {},
      '1st': {},
      thumbnail: null,
    };

    // If we had a rawExifDict from piexif, clone and preserve it
    if (exifData.rawExifDict && typeof exifData.rawExifDict === 'object') {
      try {
        exifObj = JSON.parse(JSON.stringify(exifData.rawExifDict));
        // clear thumbnail to avoid bloat and orientation mismatch in resized output
        exifObj.thumbnail = null;
        if (exifObj['1st']) {
          delete exifObj['1st'];
        }
      } catch (e) {
        console.warn('Could not clone rawExifDict', e);
      }
    }

    if (!exifObj['0th']) exifObj['0th'] = {};
    if (!exifObj.Exif) exifObj.Exif = {};
    if (!exifObj.GPS) exifObj.GPS = {};

    // Ensure Make and Model are preserved
    if (exifData.make && !exifObj['0th'][piexif.TagValues.ImageIFD.Make]) {
      exifObj['0th'][piexif.TagValues.ImageIFD.Make] = exifData.make;
    }
    if (exifData.model && !exifObj['0th'][piexif.TagValues.ImageIFD.Model]) {
      exifObj['0th'][piexif.TagValues.ImageIFD.Model] = exifData.model;
    }

    // Software tag
    exifObj['0th'][piexif.TagValues.ImageIFD.Software] = 'Lumina2048 Precision Downsampler';

    // Update dimensions in EXIF tags
    exifObj.Exif[piexif.TagValues.ExifIFD.PixelXDimension] = newWidth;
    exifObj.Exif[piexif.TagValues.ExifIFD.PixelYDimension] = newHeight;

    // ISO
    if (exifData.iso && !exifObj.Exif[piexif.TagValues.ExifIFD.ISOSpeedRatings]) {
      exifObj.Exif[piexif.TagValues.ExifIFD.ISOSpeedRatings] = exifData.iso;
    }

    // Focal length (rational)
    if (exifData.focalLength && !exifObj.Exif[piexif.TagValues.ExifIFD.FocalLength]) {
      exifObj.Exif[piexif.TagValues.ExifIFD.FocalLength] = [Math.round(exifData.focalLength * 10), 10];
    }

    // FNumber (rational)
    if (exifData.fNumber && !exifObj.Exif[piexif.TagValues.ExifIFD.FNumber]) {
      exifObj.Exif[piexif.TagValues.ExifIFD.FNumber] = [Math.round(exifData.fNumber * 10), 10];
    }

    // ExposureTime (rational)
    if (exifData.exposureTime && !exifObj.Exif[piexif.TagValues.ExifIFD.ExposureTime]) {
      if (exifData.exposureTime < 1) {
        const denom = Math.round(1 / exifData.exposureTime);
        exifObj.Exif[piexif.TagValues.ExifIFD.ExposureTime] = [1, denom];
      } else {
        exifObj.Exif[piexif.TagValues.ExifIFD.ExposureTime] = [Math.round(exifData.exposureTime * 10), 10];
      }
    }

    // Lens Model
    if (exifData.lensModel && !exifObj.Exif[piexif.TagValues.ExifIFD.LensModel]) {
      exifObj.Exif[piexif.TagValues.ExifIFD.LensModel] = exifData.lensModel;
    }

    // Date Time Original
    if (exifData.dateTimeOriginal && !exifObj.Exif[piexif.TagValues.ExifIFD.DateTimeOriginal]) {
      let dateStr = '';
      if (exifData.dateTimeOriginal instanceof Date) {
        const d = exifData.dateTimeOriginal;
        const pad = (n: number) => String(n).padStart(2, '0');
        dateStr = `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      } else {
        dateStr = String(exifData.dateTimeOriginal);
      }
      exifObj.Exif[piexif.TagValues.ExifIFD.DateTimeOriginal] = dateStr;
    }

    // GPS Latitude & Longitude if present
    if (typeof exifData.latitude === 'number' && typeof exifData.longitude === 'number') {
      const lat = exifData.latitude;
      const lon = exifData.longitude;
      const latRef = lat >= 0 ? 'N' : 'S';
      const lonRef = lon >= 0 ? 'E' : 'W';

      exifObj.GPS[piexif.TagValues.GPSIFD.GPSLatitudeRef] = latRef;
      exifObj.GPS[piexif.TagValues.GPSIFD.GPSLatitude] = degToDmsRational(Math.abs(lat));
      exifObj.GPS[piexif.TagValues.GPSIFD.GPSLongitudeRef] = lonRef;
      exifObj.GPS[piexif.TagValues.GPSIFD.GPSLongitude] = degToDmsRational(Math.abs(lon));
    }

    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, jpegDataUrl);
  } catch (err) {
    console.warn('Failed to inject EXIF into JPEG, returning base image:', err);
    return jpegDataUrl;
  }
}

function degToDmsRational(deg: number): [[number, number], [number, number], [number, number]] {
  const d = Math.floor(deg);
  const minFloat = (deg - d) * 60;
  const m = Math.floor(minFloat);
  const secFloat = (minFloat - m) * 60;
  const s = Math.round(secFloat * 100);
  return [
    [d, 1],
    [m, 1],
    [s, 100],
  ];
}

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  // chunking to prevent max call stack
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return binary;
}

/**
 * Format shutter speed into standard photographic notation (e.g. 1/500s or 2.5s)
 */
export function formatShutterSpeed(seconds?: number): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 1) {
    const denominator = Math.round(1 / seconds);
    return `1/${denominator}s`;
  }
  return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
}

/**
 * Format aperture (e.g. f/1.4, f/2.8)
 */
export function formatAperture(fNumber?: number): string {
  if (!fNumber) return '—';
  return `ƒ/${fNumber.toFixed(1).replace(/\.0$/, '')}`;
}

/**
 * Format ISO
 */
export function formatIso(iso?: number): string {
  if (!iso) return '—';
  return `ISO ${iso}`;
}

/**
 * Format focal length
 */
export function formatFocalLength(mm?: number, mm35?: number): string {
  if (!mm) return '—';
  const base = `${Math.round(mm)}mm`;
  if (mm35 && Math.round(mm) !== Math.round(mm35)) {
    return `${base} (${Math.round(mm35)}mm eq.)`;
  }
  return base;
}
