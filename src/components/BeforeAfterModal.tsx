import React, { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { X, ZoomIn, ZoomOut, Sparkles, Check, ArrowLeftRight } from 'lucide-react';
import { formatBytes } from '../utils/imageProcessor';

interface BeforeAfterModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  originalUrl: string;
  processedUrl?: string;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  originalBytes?: number;
  outputBytes?: number;
  sharpenEnabled: boolean;
  denoiseEnabled: boolean;
  sharpenAmount: number;
  denoiseStrength: number;
}

export const BeforeAfterModal: React.FC<BeforeAfterModalProps> = ({
  isOpen,
  onClose,
  fileName,
  originalUrl,
  processedUrl,
  originalWidth,
  originalHeight,
  targetWidth,
  targetHeight,
  originalBytes,
  outputBytes,
  sharpenEnabled,
  denoiseEnabled,
  sharpenAmount,
  denoiseStrength,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 to 100
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveProcessedUrl = processedUrl || originalUrl;

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    isDragging.current = true;
    updateSlider(e);
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.current) return;
    updateSlider(e);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const updateSlider = (e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPos(percentage);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      <div
        className="relative w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight truncate max-w-sm sm:max-w-md">
                {fileName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span>Original {originalWidth}×{originalHeight}</span>
                <span>·</span>
                <span className="text-amber-400 font-semibold">Downsized {targetWidth}×{targetHeight} (Long: 2048px)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom 100% Toggle */}
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isZoomed
                  ? 'bg-amber-400 text-zinc-950 border-amber-400'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
              <span>{isZoomed ? 'Fit Screen' : '100% Loupe'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enhancement Badges Sub-header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 bg-zinc-900/30 border-b border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Left: Original Source ({originalWidth}×{originalHeight}px)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Right: 2048px JPEG + Processing
            </span>
          </div>

          <div className="flex items-center gap-3">
            {sharpenEnabled && (
              <span className="flex items-center gap-1 text-amber-400">
                <Sparkles className="w-3 h-3" />
                Subject Sharpen: {sharpenAmount}%
              </span>
            )}
            {denoiseEnabled && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                Denoise: {denoiseStrength}%
              </span>
            )}
            {originalBytes && outputBytes && (
              <span className="font-mono text-zinc-300">
                {formatBytes(originalBytes)} → {formatBytes(outputBytes)}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Split Canvas Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          className="relative flex-1 w-full bg-zinc-950 overflow-hidden select-none cursor-ew-resize flex items-center justify-center p-2"
        >
          <div
            className={`relative max-w-full max-h-full transition-transform duration-150 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
          >
            {/* Background image: Processed Downsized 2048px */}
            <img
              src={effectiveProcessedUrl}
              alt="Processed"
              className="max-h-[70vh] w-auto object-contain block mx-auto pointer-events-none rounded-lg"
              referrerPolicy="no-referrer"
            />

            {/* Foreground image: Original clipped by sliderPos */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="max-h-[70vh] w-auto object-contain block mx-auto pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Split Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Handle */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg border-2 border-zinc-950">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Floating Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 text-[11px] text-zinc-400 pointer-events-none backdrop-blur-sm">
            Drag divider left/right to compare detail · Click 100% Loupe to zoom
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-900/70">
          <span className="text-xs text-zinc-400">
            Aspect ratio maintained at 2048px long edge with high-frequency clarity preservation.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
