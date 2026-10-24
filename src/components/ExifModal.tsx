import React from 'react';
import { X, Camera, Eye, MapPin, Calendar, Layers, ShieldCheck } from 'lucide-react';
import { PhotoExifData, formatShutterSpeed, formatAperture, formatIso, formatFocalLength } from '../utils/exifService';
import { formatBytes } from '../utils/imageProcessor';

interface ExifModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  thumbnailUrl: string;
  exif: PhotoExifData;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  originalBytes?: number;
  outputBytes?: number;
}

export const ExifModal: React.FC<ExifModalProps> = ({
  isOpen,
  onClose,
  fileName,
  thumbnailUrl,
  exif,
  originalWidth,
  originalHeight,
  targetWidth,
  targetHeight,
  originalBytes,
  outputBytes,
}) => {
  if (!isOpen) return null;

  const hasGps = typeof exif.latitude === 'number' && typeof exif.longitude === 'number';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight truncate max-w-md">
                {fileName}
              </h3>
              <p className="text-xs text-zinc-400">EXIF Metadata &amp; Hardware Profile Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Quick Camera Exposure Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div>
              <div className="text-[11px] text-zinc-400">Shutter Speed</div>
              <div className="text-sm font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                {formatShutterSpeed(exif.exposureTime)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Aperture</div>
              <div className="text-sm font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                {formatAperture(exif.fNumber)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Sensitivity</div>
              <div className="text-sm font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                {formatIso(exif.iso)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Focal Length</div>
              <div className="text-sm font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                {formatFocalLength(exif.focalLength, exif.focalLengthIn35mm)}
              </div>
            </div>
          </div>

          {/* Side-by-side: Photo Preview & Primary Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[4/3] flex items-center justify-center">
              <img
                src={thumbnailUrl}
                alt={fileName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="sm:col-span-2 space-y-2.5">
              <div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Camera Body</span>
                <p className="text-sm font-medium text-white">
                  {exif.make || 'Unknown'} {exif.model ? `· ${exif.model}` : ''}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Lens Attached</span>
                <p className="text-sm font-medium text-zinc-200">
                  {exif.lensModel || 'Manual / Prime Lens'}
                </p>
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Conversion &amp; Downscaling</span>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 mt-0.5">
                  <span className="text-zinc-400">{originalWidth} × {originalHeight} px</span>
                  <span className="text-amber-400 font-bold">→</span>
                  <span className="text-amber-300 font-semibold">{targetWidth} × {targetHeight} px</span>
                  <span className="text-zinc-500 text-[11px]">(Long: 2048px)</span>
                </div>
                {originalBytes && outputBytes && (
                  <div className="text-[11px] text-zinc-400 font-mono mt-1">
                    Size: {formatBytes(originalBytes)} → {formatBytes(outputBytes)}
                    <span className="text-emerald-400 ml-1.5 font-medium">
                      ({Math.round((1 - outputBytes / originalBytes) * 100)}% reduction)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Technical Data Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">
              Embedded Metadata Records (Preserved in Export)
            </h4>
            <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40 text-xs">
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Date &amp; Time Original</span>
                <span className="font-mono text-zinc-200">
                  {exif.dateTimeOriginal ? String(exif.dateTimeOriginal) : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Metering Mode</span>
                <span className="text-zinc-200">{exif.meteringMode || 'Multi-pattern / Evaluative'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Exposure Program</span>
                <span className="text-zinc-200">{exif.exposureProgram || 'Aperture Priority'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Color Space</span>
                <span className="font-mono text-zinc-200">{exif.colorSpace || 'sRGB'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Flash Status</span>
                <span className="text-zinc-200">{exif.flash || 'Did not fire'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Export Processing Engine</span>
                <span className="font-mono text-amber-400/90">Lumina2048 Precision Downsampler</span>
              </div>
              {hasGps && (
                <div className="flex justify-between items-center px-3.5 py-2.5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> GPS Geolocation
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${exif.latitude},${exif.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-amber-400 hover:underline"
                  >
                    {exif.latitude?.toFixed(4)}°, {exif.longitude?.toFixed(4)}°
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>All metadata tags will be injected directly into the exported JPEG.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
