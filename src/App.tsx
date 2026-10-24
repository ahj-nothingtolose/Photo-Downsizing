import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  Sparkles,
  Download,
  Trash2,
  Layers,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Info,
  Maximize2,
} from 'lucide-react';
import { Header } from './components/Header';
import { ProcessingToolbar } from './components/ProcessingToolbar';
import { DropZone } from './components/DropZone';
import { PhotoQueueItem, PhotoQueueEntry } from './components/PhotoQueueItem';
import { ExifModal } from './components/ExifModal';
import { BeforeAfterModal } from './components/BeforeAfterModal';
import { SAMPLE_PHOTOS } from './utils/samplePhotos';
import { extractExif, extractPreviewUrl } from './utils/exifService';
import {
  ProcessingOptions,
  processAndDownsizePhoto,
  calculateDownsizedDimensions,
  formatBytes,
} from './utils/imageProcessor';

export default function App() {
  const [options, setOptions] = useState<ProcessingOptions>({
    longEdge: 2048,
    jpegQuality: 0.94,
    enableSharpen: true,
    sharpenAmount: 35,
    sharpenRadius: 1.0,
    enableDenoise: true,
    denoiseStrength: 25,
  });

  const [preserveExif, setPreserveExif] = useState<boolean>(true);
  const [queue, setQueue] = useState<PhotoQueueEntry[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Modals state
  const [activeExifItem, setActiveExifItem] = useState<PhotoQueueEntry | null>(null);
  const [activeCompareItem, setActiveCompareItem] = useState<PhotoQueueEntry | null>(null);

  // Initialize with sample photography items on mount
  useEffect(() => {
    loadSamplePhotos();
  }, []);

  const loadSamplePhotos = () => {
    const samples: PhotoQueueEntry[] = SAMPLE_PHOTOS.map((sample) => {
      const { width: targetWidth, height: targetHeight } = calculateDownsizedDimensions(
        sample.width,
        sample.height,
        options.longEdge
      );

      return {
        id: sample.id,
        name: sample.name,
        format: sample.format,
        previewUrl: sample.url,
        originalWidth: sample.width,
        originalHeight: sample.height,
        originalBytes: sample.originalBytes,
        targetWidth,
        targetHeight,
        exif: sample.exif,
        isProcessing: false,
      };
    });

    setQueue(samples);
  };

  // Recalculate target dimensions when longEdge option changes
  useEffect(() => {
    setQueue((prevQueue) =>
      prevQueue.map((item) => {
        const { width: targetWidth, height: targetHeight } = calculateDownsizedDimensions(
          item.originalWidth,
          item.originalHeight,
          options.longEdge
        );
        return {
          ...item,
          targetWidth,
          targetHeight,
        };
      })
    );
  }, [options.longEdge]);

  const handleLoadSonyA7RVI = () => {
    const a7rviSample = SAMPLE_PHOTOS.find((s) => s.id === 'sample-sony-a7rvi');
    if (!a7rviSample) return;

    const { width: targetWidth, height: targetHeight } = calculateDownsizedDimensions(
      a7rviSample.width,
      a7rviSample.height,
      options.longEdge
    );

    const entry: PhotoQueueEntry = {
      id: `sony-a7rvi-${Date.now()}`,
      name: a7rviSample.name,
      format: a7rviSample.format,
      previewUrl: a7rviSample.url,
      originalWidth: a7rviSample.width,
      originalHeight: a7rviSample.height,
      originalBytes: a7rviSample.originalBytes,
      targetWidth,
      targetHeight,
      exif: a7rviSample.exif,
      isProcessing: false,
    };

    setQueue((prev) => [entry, ...prev.filter((p) => p.name !== a7rviSample.name)]);
  };

  // Handle files selected via file input or drag-and-drop
  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'JPEG';
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        const { url: previewUrl, extractedWidth, extractedHeight } = await extractPreviewUrl(file);
        const exif = await extractExif(file);

        // Load image to determine natural dimensions
        const img = new Image();
        img.src = previewUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        const origW = exif.originalWidth || extractedWidth || img.naturalWidth || 9504;
        const origH = exif.originalHeight || extractedHeight || img.naturalHeight || 6336;

        const { width: targetWidth, height: targetHeight } = calculateDownsizedDimensions(
          origW,
          origH,
          options.longEdge
        );

        const newEntry: PhotoQueueEntry = {
          id,
          file,
          name: file.name,
          format: ext,
          previewUrl,
          originalWidth: origW,
          originalHeight: origH,
          originalBytes: file.size,
          targetWidth,
          targetHeight,
          exif: {
            ...exif,
            originalWidth: origW,
            originalHeight: origH,
          },
          isProcessing: false,
        };

        setQueue((prev) => [...prev, newEntry]);
      } catch (err) {
        console.error('Failed to parse file:', file.name, err);
      }
    }
  };

  // Downsize and process single photo
  const handleProcessSingle = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isProcessing: true } : q))
    );

    try {
      const result = await processAndDownsizePhoto(
        item.previewUrl,
        options,
        preserveExif ? item.exif : undefined,
        item.originalBytes
      );

      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                isProcessing: false,
                result,
                targetWidth: result.outputWidth,
                targetHeight: result.outputHeight,
              }
            : q
        )
      );
    } catch (err) {
      console.error('Failed to downsize photo:', err);
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, isProcessing: false } : q))
      );
    }
  };

  // Batch process all unprocessed photos in queue
  const handleProcessAll = async () => {
    if (queue.length === 0 || isProcessingAll) return;

    setIsProcessingAll(true);
    setBatchProgress({ current: 0, total: queue.length });

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setBatchProgress({ current: i + 1, total: queue.length });

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, isProcessing: true } : q))
      );

      try {
        const result = await processAndDownsizePhoto(
          item.previewUrl,
          options,
          preserveExif ? item.exif : undefined,
          item.originalBytes
        );

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  isProcessing: false,
                  result,
                  targetWidth: result.outputWidth,
                  targetHeight: result.outputHeight,
                }
              : q
          )
        );
      } catch (e) {
        console.error('Error processing item in batch:', item.name, e);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, isProcessing: false } : q))
        );
      }
    }

    setIsProcessingAll(false);
    setBatchProgress(null);
  };

  // Download single processed JPEG file
  const handleDownloadSingle = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item || !item.result) return;

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_2048px.jpg`;

    const link = document.createElement('a');
    link.href = item.result.dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all processed photos in a ZIP file
  const handleDownloadZip = async () => {
    const processedItems = queue.filter((item) => item.result);
    if (processedItems.length === 0) return;

    const zip = new JSZip();

    for (const item of processedItems) {
      if (item.result) {
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        const fileName = `${baseName}_2048px.jpg`;
        zip.file(fileName, item.result.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `Lumina2048_Exports_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setQueue([]);
  };

  // Stats calculation
  const totalOriginalBytes = queue.reduce((sum, item) => sum + item.originalBytes, 0);
  const totalOutputBytes = queue.reduce((sum, item) => sum + (item.result?.outputBytes || 0), 0);
  const processedCount = queue.filter((item) => item.result).length;
  const hasExportedFiles = processedCount > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Strict 3-zone Header */}
      <Header
        onExportAll={handleProcessAll}
        onDownloadZip={handleDownloadZip}
        isProcessingAll={isProcessingAll}
        totalPhotos={queue.length}
        processedCount={processedCount}
        hasExportedFiles={hasExportedFiles}
        onResetToSamples={loadSamplePhotos}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero & Intro Strip */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                  Sony Alpha 7R VI Ready
                </span>
                <span className="text-xs text-zinc-400">· 61MP ARW Native Pipeline</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                High-Fidelity 2048px Photo Downsampler
              </h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
                Downsizes Sony <span className="font-mono text-amber-300 font-semibold">Alpha 7R VI (.ARW)</span>, Sony a7R V / IV, Adobe <span className="font-mono text-zinc-300">.DNG</span>, Canon <span className="font-mono text-zinc-300">.CR2</span>, and <span className="font-mono text-zinc-300">.JPEG</span> files to long edge 2048px while locking original aspect ratio, preserving camera EXIF &amp; GPS data, and enhancing subject sharpness and clarity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleLoadSonyA7RVI}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-all cursor-pointer"
                title="Load 61MP Sony Alpha 7R VI ARW RAW sample file"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Sony a7R VI ARW</span>
              </button>

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleProcessAll}
                  disabled={isProcessingAll}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer ${
                    isProcessingAll
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessingAll ? `Processing (${batchProgress?.current}/${batchProgress?.total})...` : `Downsize All to ${options.longEdge}px`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
              <span className="text-[11px] text-zinc-400">Target Long Edge</span>
              <div className="text-base font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                {options.longEdge} px
              </div>
              <span className="text-[10px] text-zinc-500">Aspect Ratio Locked</span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
              <span className="text-[11px] text-zinc-400">Batch Queue</span>
              <div className="text-base font-mono font-bold text-white tabular-nums mt-0.5">
                {processedCount} / {queue.length} ready
              </div>
              <span className="text-[10px] text-zinc-500">
                {queue.length === 0 ? 'Empty queue' : `${queue.length - processedCount} pending`}
              </span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
              <span className="text-[11px] text-zinc-400">EXIF Preservation</span>
              <div className="text-base font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{preserveExif ? 'Active (Lossless)' : 'Disabled'}</span>
              </div>
              <span className="text-[10px] text-zinc-500">Camera, Lens, ISO &amp; GPS</span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
              <span className="text-[11px] text-zinc-400">Storage Optimization</span>
              <div className="text-base font-mono font-bold text-zinc-200 tabular-nums mt-0.5">
                {totalOriginalBytes > 0 ? formatBytes(totalOriginalBytes) : '0 MB'}
                {totalOutputBytes > 0 && (
                  <span className="text-emerald-400 text-xs ml-1 font-medium">
                    → {formatBytes(totalOutputBytes)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500">
                {totalOutputBytes > 0
                  ? `~${Math.round((1 - totalOutputBytes / totalOriginalBytes) * 100)}% lighter for web`
                  : 'High-efficiency JPEGs'}
              </span>
            </div>
          </div>
        </div>

        {/* Processing & Polish Toolbar */}
        <ProcessingToolbar
          options={options}
          onChangeOptions={setOptions}
          preserveExif={preserveExif}
          onTogglePreserveExif={setPreserveExif}
        />

        {/* Drag and Drop Zone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          onLoadSamples={loadSamplePhotos}
          hasItems={queue.length > 0}
        />

        {/* Batch Queue Section */}
        <div id="queue" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white tracking-tight">
                Photo Queue ({queue.length})
              </h3>
            </div>

            {queue.length > 0 && (
              <div className="flex items-center gap-3">
                {hasExportedFiles && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All ({processedCount}) as ZIP</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Queue</span>
                </button>
              </div>
            )}
          </div>

          {/* Queue Items List */}
          {queue.length === 0 ? (
            <div className="p-12 text-center border border-zinc-800/80 rounded-2xl bg-zinc-900/30">
              <HardDrive className="w-8 h-8 text-zinc-600 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-zinc-300">No photos in batch queue</p>
              <p className="text-xs text-zinc-500 mt-1">
                Drag and drop your RAW (.ARW, .DNG) or JPEG files above, or click below to load sample shots.
              </p>
              <button
                type="button"
                onClick={loadSamplePhotos}
                className="mt-4 px-4 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                Load Sony, Fuji &amp; Leica Samples
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queue.map((item) => (
                <PhotoQueueItem
                  key={item.id}
                  item={item}
                  onProcess={handleProcessSingle}
                  onDownload={handleDownloadSingle}
                  onOpenExif={() => setActiveExifItem(item)}
                  onOpenCompare={() => setActiveCompareItem(item)}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Technical FAQ & Explanations */}
        <div className="border border-zinc-800/80 rounded-2xl p-6 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Why 2048px Long Edge, Sony a7R VI ARW &amp; Full EXIF Preservation?
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-400">
            <div>
              <span className="font-semibold text-zinc-200 block mb-1">Sony Alpha 7R VI (.ARW) &amp; 61MP Raw Engine</span>
              Native binary stream scanner reads Sony TIFF SubIFD embedded JPEG previews from Sony a7R VI (ILCE-7RM6), a7R V, and a7R IV files. Decodes 61.0 MP (9504 × 6336 px) raw files and steps them down cleanly to 2048px without aliasing.
            </div>
            <div>
              <span className="font-semibold text-zinc-200 block mb-1">Lossless EXIF &amp; GPS Injection</span>
              Standard canvas exports discard camera metadata. Lumina2048 extracts and injects the original Sony MakerNotes, Exif IFD, GPS coordinates, and lens data into the exported JPEG, while updating PixelX/YDimension to match 2048px.
            </div>
            <div>
              <span className="font-semibold text-zinc-200 block mb-1">Edge-Aware Sharpening &amp; Bilateral Denoising</span>
              Downscaling high-resolution sensors (61MP down to 2048px) can soften micro-textures. Edge-aware sharpening targets subject contours (eyes, hair, architecture) while bilateral filtering clears sensor grain without blurring edges.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 px-6 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Lumina2048 Precision Downsampler · Built for professional photographers</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="text-amber-400 font-medium">Sony Alpha 7R VI .ARW</span>
            <span>·</span>
            <span>Sony a7R V / IV</span>
            <span>·</span>
            <span>Adobe .DNG</span>
            <span>·</span>
            <span>Full EXIF Retention</span>
          </div>
        </div>
      </footer>

      {/* EXIF Inspector Modal */}
      {activeExifItem && (
        <ExifModal
          isOpen={Boolean(activeExifItem)}
          onClose={() => setActiveExifItem(null)}
          fileName={activeExifItem.name}
          thumbnailUrl={activeExifItem.result?.dataUrl || activeExifItem.previewUrl}
          exif={activeExifItem.exif}
          originalWidth={activeExifItem.originalWidth}
          originalHeight={activeExifItem.originalHeight}
          targetWidth={activeExifItem.targetWidth}
          targetHeight={activeExifItem.targetHeight}
          originalBytes={activeExifItem.originalBytes}
          outputBytes={activeExifItem.result?.outputBytes}
        />
      )}

      {/* Before / After Loupe Modal */}
      {activeCompareItem && (
        <BeforeAfterModal
          isOpen={Boolean(activeCompareItem)}
          onClose={() => setActiveCompareItem(null)}
          fileName={activeCompareItem.name}
          originalUrl={activeCompareItem.previewUrl}
          processedUrl={activeCompareItem.result?.dataUrl}
          originalWidth={activeCompareItem.originalWidth}
          originalHeight={activeCompareItem.originalHeight}
          targetWidth={activeCompareItem.targetWidth}
          targetHeight={activeCompareItem.targetHeight}
          originalBytes={activeCompareItem.originalBytes}
          outputBytes={activeCompareItem.result?.outputBytes}
          sharpenEnabled={options.enableSharpen}
          denoiseEnabled={options.enableDenoise}
          sharpenAmount={options.sharpenAmount}
          denoiseStrength={options.denoiseStrength}
        />
      )}
    </div>
  );
}
