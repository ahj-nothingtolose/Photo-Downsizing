import React from 'react';
import { Download, Eye, Sparkles, Trash2, CheckCircle2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { PhotoExifData, formatShutterSpeed, formatAperture, formatIso, formatFocalLength } from '../utils/exifService';
import { ProcessedPhotoResult, formatBytes } from '../utils/imageProcessor';

export interface PhotoQueueEntry {
  id: string;
  file?: File;
  name: string;
  format: string; // ARW, DNG, JPEG, etc.
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  targetWidth: number;
  targetHeight: number;
  exif: PhotoExifData;
  isProcessing: boolean;
  result?: ProcessedPhotoResult;
}

interface PhotoQueueItemProps {
  item: PhotoQueueEntry;
  onProcess: (id: string) => void;
  onDownload: (id: string) => void;
  onOpenExif: (id: string) => void;
  onOpenCompare: (id: string) => void;
  onRemove: (id: string) => void;
}

export const PhotoQueueItem: React.FC<PhotoQueueItemProps> = ({
  item,
  onProcess,
  onDownload,
  onOpenExif,
  onOpenCompare,
  onRemove,
}) => {
  const isLandscape = item.originalWidth >= item.originalHeight;
  const ratioLabel = isLandscape
    ? `${(item.originalWidth / (item.originalHeight || 1)).toFixed(2)}:1`
    : `1:${(item.originalHeight / (item.originalWidth || 1)).toFixed(2)}`;

  const savingsPercent =
    item.result && item.originalBytes > 0
      ? Math.round((1 - item.result.outputBytes / item.originalBytes) * 100)
      : null;

  return (
    <div className="group relative bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3.5 sm:p-4 transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Thumbnail & Info */}
        <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
          {/* Thumbnail Container */}
          <div
            onClick={() => onOpenCompare(item.id)}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 cursor-pointer group-hover:ring-1 group-hover:ring-amber-400/50 transition-all"
            title="Click to view full loupe & compare"
          >
            <img
              src={item.result?.dataUrl || item.previewUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Format watermark */}
            <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono font-semibold text-zinc-300">
              {item.format.toUpperCase()}
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                {item.name}
              </h4>
              {item.result && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              )}
            </div>

            {/* Resolution conversion progression */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300">
              <span className="text-zinc-400">{item.originalWidth}×{item.originalHeight}</span>
              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-amber-300 font-semibold">{item.targetWidth}×{item.targetHeight}</span>
              <span className="text-zinc-500 text-[11px]">({ratioLabel})</span>
            </div>

            {/* Unboxed EXIF metadata with typographic separators */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
              {item.exif.model && (
                <span className="font-medium text-zinc-300">{item.exif.model}</span>
              )}
              {item.exif.lensModel && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="truncate max-w-[150px]">{item.exif.lensModel}</span>
                </>
              )}
              {item.exif.fNumber && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-mono tabular-nums">{formatAperture(item.exif.fNumber)}</span>
                </>
              )}
              {item.exif.exposureTime && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-mono tabular-nums">{formatShutterSpeed(item.exif.exposureTime)}</span>
                </>
              )}
              {item.exif.iso && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-mono tabular-nums">{formatIso(item.exif.iso)}</span>
                </>
              )}
            </div>

            {/* File size & savings */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 pt-0.5">
              <span>{formatBytes(item.originalBytes)}</span>
              {item.result && (
                <>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-200">{formatBytes(item.result.outputBytes)}</span>
                  {savingsPercent !== null && (
                    <span className="text-emerald-400 font-medium">(-{savingsPercent}%)</span>
                  )}
                  <span className="text-zinc-500 text-[10px]">in {item.result.timeMs}ms</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/80">
          {/* Inspect EXIF button */}
          <button
            type="button"
            onClick={() => onOpenExif(item.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Inspect full EXIF metadata and hardware parameters"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>EXIF</span>
          </button>

          {/* Compare Before / After Loupe */}
          <button
            type="button"
            onClick={() => onOpenCompare(item.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Inspect before/after sharpening and downscaled details"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Compare</span>
          </button>

          {/* Process / Download */}
          {item.result ? (
            <button
              type="button"
              onClick={() => onDownload(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-amber-400/20"
              title="Download high-quality 2048px JPEG with EXIF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JPEG</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onProcess(item.id)}
              disabled={item.isProcessing}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                item.isProcessing
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-sm shadow-amber-400/20'
              }`}
            >
              {item.isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downsizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Downsize</span>
                </>
              )}
            </button>
          )}

          {/* Remove */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Remove from batch queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
