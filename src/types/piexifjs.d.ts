// Type declarations for piexifjs
declare module 'piexifjs' {
  export interface ExifDict {
    '0th'?: Record<number | string, any>;
    Exif?: Record<number | string, any>;
    GPS?: Record<number | string, any>;
    Interop?: Record<number | string, any>;
    '1st'?: Record<number | string, any>;
    thumbnail?: string | null;
  }

  export const TagValues: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
  };

  export function load(data: string): ExifDict;
  export function dump(dict: ExifDict): string;
  export function insert(exifBytes: string, jpegData: string): string;
  export function remove(jpegData: string): string;

  const piexif: {
    load: typeof load;
    dump: typeof dump;
    insert: typeof insert;
    remove: typeof remove;
    TagValues: typeof TagValues;
  };

  export default piexif;
}
