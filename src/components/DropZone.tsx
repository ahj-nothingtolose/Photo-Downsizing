import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, Sparkles, Image as ImageIcon, Camera, FileCheck } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  hasItems: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  hasItems,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      onFilesSelected(fileList);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      onFilesSelected(fileList);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
        isDragging
          ? 'border-amber-400 bg-amber-500/10 scale-[1.005]'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
      } ${hasItems ? 'p-6' : 'p-10 lg:p-14'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".arw,.dng,.cr2,.cr3,.nef,.nrw,.orf,.rw2,.pef,.raf,.jpg,.jpeg,.png,.webp,.tiff"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="max-w-xl mx-auto flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
          <Upload className="w-6 h-6 stroke-[1.8]" />
        </div>

        <h3 className="text-base font-semibold text-white tracking-tight">
          Drop RAW &amp; JPEG photos here
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-lg">
          Native support for Sony <span className="font-mono text-amber-300 font-semibold">Alpha 7R VI (.ARW)</span>, Sony a7R V / IV, Adobe <span className="font-mono text-zinc-300">.DNG</span>, Canon <span className="font-mono text-zinc-300">.CR2</span>, Nikon <span className="font-mono text-zinc-300">.NEF</span>, and high-res <span className="font-mono text-zinc-300">.JPEG</span>.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm shadow-amber-400/20 transition-colors cursor-pointer"
          >
            Select Photos from Computer
          </button>

          <button
            type="button"
            onClick={onLoadSamples}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Sony a7R VI &amp; Pro Samples</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-500 mt-6 pt-4 border-t border-zinc-800/60">
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            Downsize to Long Edge 2048px
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            EXIF &amp; GPS Intact
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            Subject Sharpen &amp; Denoise
          </span>
        </div>
      </div>
    </div>
  );
};
