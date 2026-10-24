import React from 'react';
import { Sliders, Zap, ShieldCheck, HelpCircle } from 'lucide-react';
import { ProcessingOptions } from '../utils/imageProcessor';

interface ProcessingToolbarProps {
  options: ProcessingOptions;
  onChangeOptions: (newOptions: ProcessingOptions) => void;
  preserveExif: boolean;
  onTogglePreserveExif: (val: boolean) => void;
}

const PRESET_LONG_EDGES = [
  { label: '2048 px (Standard)', value: 2048, note: 'Web & Social Max Clarity' },
  { label: '1920 px (Full HD)', value: 1920, note: '1080p display fit' },
  { label: '2560 px (2K / QHD)', value: 2560, note: 'Retina displays' },
  { label: '4096 px (4K Master)', value: 4096, note: 'Ultra HD archival' },
];

export const ProcessingToolbar: React.FC<ProcessingToolbarProps> = ({
  options,
  onChangeOptions,
  preserveExif,
  onTogglePreserveExif,
}) => {
  const updateOption = <K extends keyof ProcessingOptions>(key: K, value: ProcessingOptions[K]) => {
    onChangeOptions({
      ...options,
      [key]: value,
    });
  };

  return (
    <div id="settings" className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Export Configuration &amp; Enhancement Controls
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict aspect-ratio preservation · High-fidelity bicubic downsampling · Lossless metadata retention
          </p>
        </div>

        {/* EXIF Preservation Switch */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-xl">
          <ShieldCheck className={`w-4 h-4 ${preserveExif ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200">Retain Full EXIF Metadata</span>
            <span className="text-[11px] text-zinc-400">Preserves Camera, Lens, ISO, GPS &amp; Timestamp</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preserveExif}
            onClick={() => onTogglePreserveExif(!preserveExif)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              preserveExif ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                preserveExif ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-4">
        {/* 1. Long Edge Resolution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">Target Long Edge</label>
            <span className="text-xs font-mono font-semibold text-amber-400 tabular-nums">
              {options.longEdge} px
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_LONG_EDGES.map((preset) => {
              const isSelected = options.longEdge === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => updateOption('longEdge', preset.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-mono tabular-nums leading-tight">{preset.value} px</div>
                  <div className="text-[10px] text-zinc-500 truncate">{preset.label.split(' ')[1] || preset.label}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-400 whitespace-nowrap">Custom:</span>
            <input
              type="number"
              min="300"
              max="8192"
              step="32"
              value={options.longEdge}
              onChange={(e) => updateOption('longEdge', Math.max(100, Math.min(10000, Number(e.target.value) || 2048)))}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-md px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 2. JPEG Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">JPEG Master Quality</label>
            <span className="text-xs font-mono font-semibold text-zinc-100 tabular-nums">
              {Math.round(options.jpegQuality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="70"
            max="100"
            step="1"
            value={Math.round(options.jpegQuality * 100)}
            onChange={(e) => updateOption('jpegQuality', Number(e.target.value) / 100)}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>70% (Compact)</span>
            <span className="text-amber-400/90 font-medium">94% (Pro Default)</span>
            <span>100% (Max)</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Encodes smooth gradients and retains fine micro-contrasts with minimal compression artifacts.
          </p>
        </div>

        {/* 3. Subject-Aware Sharpening */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-zinc-300">Sharpen Subject</label>
              <span title="Detects subject contours (eyes, facial features, texture) and sharpens high-frequency edges while ignoring flat background noise" className="text-zinc-500 hover:text-zinc-300 cursor-help">
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={options.enableSharpen}
              onClick={() => updateOption('enableSharpen', !options.enableSharpen)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                options.enableSharpen ? 'bg-amber-400' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-zinc-950 ring-0 transition duration-200 ease-in-out ${
                  options.enableSharpen ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={`space-y-1.5 transition-opacity ${options.enableSharpen ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Amount</span>
              <span className="text-amber-400 tabular-nums">{options.sharpenAmount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={!options.enableSharpen}
              value={options.sharpenAmount}
              onChange={(e) => updateOption('sharpenAmount', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <p className="text-[11px] text-zinc-400 leading-tight">
              Edge-selective unsharp mask: crisps focal details without adding halos.
            </p>
          </div>
        </div>

        {/* 4. Denoise Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-zinc-300">Bilateral Denoise</label>
              <span title="Bilateral edge-preserving filter clears sensor grain and chrominance speckles without softening sharp lines" className="text-zinc-500 hover:text-zinc-300 cursor-help">
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={options.enableDenoise}
              onClick={() => updateOption('enableDenoise', !options.enableDenoise)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                options.enableDenoise ? 'bg-amber-400' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-zinc-950 ring-0 transition duration-200 ease-in-out ${
                  options.enableDenoise ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={`space-y-1.5 transition-opacity ${options.enableDenoise ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Strength</span>
              <span className="text-amber-400 tabular-nums">{options.denoiseStrength}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={!options.enableDenoise}
              value={options.denoiseStrength}
              onChange={(e) => updateOption('denoiseStrength', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <p className="text-[11px] text-zinc-400 leading-tight">
              Smooths high-ISO shadows &amp; chromatic noise while locking edge contrast.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
