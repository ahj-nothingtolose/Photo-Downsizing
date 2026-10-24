import { PhotoExifData } from './exifService';

export interface SamplePhotoItem {
  id: string;
  name: string;
  format: 'ARW' | 'DNG' | 'JPEG';
  url: string;
  originalBytes: number;
  width: number;
  height: number;
  aspectRatio: string;
  exif: PhotoExifData;
}

export const SAMPLE_PHOTOS: SamplePhotoItem[] = [
  {
    id: 'sample-sony-a7rvi',
    name: 'DSC0001_SONY_A7RVI_61MP.ARW',
    format: 'ARW',
    url: '/src/assets/images/sample_sony_a7rvi_1792852167828.jpg',
    originalBytes: 65420000, // ~65.4 MB raw (Sony a7R VI 61MP BSI Exmor R)
    width: 9504,
    height: 5346,
    aspectRatio: '16:9',
    exif: {
      make: 'SONY',
      model: 'Sony Alpha 7R VI (ILCE-7RM6)',
      lensModel: 'FE 24-70mm F2.8 GM II',
      focalLength: 35,
      focalLengthIn35mm: 35,
      fNumber: 4.0,
      exposureTime: 0.066667, // 1/15s
      iso: 100,
      exposureProgram: 'Aperture Priority',
      meteringMode: 'Multi-segment',
      flash: 'Did not fire',
      dateTimeOriginal: '2026:10:24 18:45:12',
      colorSpace: 'sRGB',
      software: 'Sony BIONZ XR+ AI Processing Engine',
      latitude: 35.6895,
      longitude: 139.6917,
    },
  },
  {
    id: 'sample-sony-portrait',
    name: 'DSC04892_STUDIO_ARTIST.ARW',
    format: 'ARW',
    url: '/src/assets/images/sample_sony_portrait_1792585509754.jpg',
    originalBytes: 42189200, // ~42.1 MB raw
    width: 6048,
    height: 4536,
    aspectRatio: '4:3',
    exif: {
      make: 'SONY',
      model: 'Sony Alpha 7R IV (ILCE-7RM4)',
      lensModel: 'FE 50mm F1.2 GM',
      focalLength: 50,
      focalLengthIn35mm: 50,
      fNumber: 1.4,
      exposureTime: 0.002, // 1/500s
      iso: 160,
      exposureProgram: 'Aperture Priority',
      meteringMode: 'Multi-segment',
      flash: 'Did not fire',
      dateTimeOriginal: '2026:09:14 16:42:08',
      colorSpace: 'sRGB',
      latitude: 35.6895,
      longitude: 139.6917,
    },
  },
  {
    id: 'sample-fuji-street',
    name: 'DSCF9102_RAINY_SHINJUKU.DNG',
    format: 'DNG',
    url: '/src/assets/images/sample_fuji_street_1792585511235.jpg',
    originalBytes: 38450100, // ~38.4 MB raw
    width: 6240,
    height: 3510,
    aspectRatio: '16:9',
    exif: {
      make: 'FUJIFILM',
      model: 'X-T5',
      lensModel: 'XF 23mm F1.4 R LM WR',
      focalLength: 23,
      focalLengthIn35mm: 35,
      fNumber: 1.8,
      exposureTime: 0.016667, // 1/60s
      iso: 1600,
      exposureProgram: 'Manual',
      meteringMode: 'Center-weighted average',
      flash: 'Did not fire',
      dateTimeOriginal: '2026:10:02 19:28:44',
      colorSpace: 'sRGB',
      latitude: 35.6938,
      longitude: 139.7034,
    },
  },
  {
    id: 'sample-leica-landscape',
    name: 'L1003429_ALPS_ZERMATT.JPEG',
    format: 'JPEG',
    url: '/src/assets/images/sample_leica_landscape_1792585511391.jpg',
    originalBytes: 28940000, // ~28.9 MB
    width: 6000,
    height: 3375,
    aspectRatio: '16:9',
    exif: {
      make: 'LEICA CAMERA AG',
      model: 'LEICA M11',
      lensModel: 'APO-Summicron-M 35mm f/2 ASPH.',
      focalLength: 35,
      focalLengthIn35mm: 35,
      fNumber: 5.6,
      exposureTime: 0.004, // 1/250s
      iso: 64,
      exposureProgram: 'Aperture Priority',
      meteringMode: 'Spot',
      flash: 'Did not fire',
      dateTimeOriginal: '2026:08:20 08:15:31',
      colorSpace: 'sRGB',
      latitude: 45.9765,
      longitude: 7.7491,
    },
  },
];
