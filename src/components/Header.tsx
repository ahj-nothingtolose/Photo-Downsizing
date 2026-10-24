import React from 'react';
import { Camera, Download, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onExportAll: () => void;
  onDownloadZip: () => void;
  isProcessingAll: boolean;
  totalPhotos: number;
  processedCount: number;
  hasExportedFiles: boolean;
  onResetToSamples: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExportAll,
  onDownloadZip,
  isProcessingAll,
  totalPhotos,
  processedCount,
  hasExportedFiles,
  onResetToSamples,
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 shadow-sm shadow-amber-500/20">
          <Camera className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          Lumina<span className="text-amber-400">2048</span>
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
        <a href="#queue" className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
          Batch Queue ({totalPhotos})
        </a>
        <a href="#settings" className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
          Downsize &amp; Polish
        </a>
        <button
          onClick={onResetToSamples}
          className="flex items-center gap-1.5 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 text-zinc-400 cursor-pointer"
          title="Reload Sony a7R VI, Sony a7R IV, Fuji, and Leica sample files"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Load Sony a7R VI Samples</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {hasExportedFiles ? (
          <button
            onClick={onDownloadZip}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm shadow-amber-400/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All ({processedCount}) as ZIP</span>
          </button>
        ) : (
          <button
            onClick={onExportAll}
            disabled={totalPhotos === 0 || isProcessingAll}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              totalPhotos === 0 || isProcessingAll
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-sm shadow-amber-400/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isProcessingAll ? 'Downsizing 2048px...' : `Downsize All to 2048px`}</span>
          </button>
        )}
      </div>
    </header>
  );
};
