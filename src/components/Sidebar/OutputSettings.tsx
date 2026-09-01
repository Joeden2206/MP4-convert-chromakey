import React, { useState, useEffect } from 'react';
import { Lock, Unlock, RefreshCw, Sparkles, Monitor, Smartphone, Square, Tv, Layers, ArrowLeftRight, Minimize2, Maximize2 } from 'lucide-react';
import { AspectRatioType, VideoItem, OutputSizeMode, OutputFitMode } from '../../types';

interface OutputSettingsProps {
  aspectRatio: AspectRatioType;
  setAspectRatio: (ratio: AspectRatioType) => void;
  // Output Size & Scaling
  outputSizeMode: OutputSizeMode;
  setOutputSizeMode: (mode: OutputSizeMode) => void;
  outputScale: number;
  setOutputScale: (scale: number) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  customHeight: number;
  setCustomHeight: (h: number) => void;
  lockAspectRatio: boolean;
  setLockAspectRatio: (lock: boolean) => void;
  outputFitMode: OutputFitMode;
  setOutputFitMode: (mode: OutputFitMode) => void;
  videoWidth: number;
  videoHeight: number;
  // GIF / Export
  gifFps: number;
  setGifFps: (fps: number) => void;
  gifFrameLimit: number;
  setGifFrameLimit: (limit: number) => void;
  handleExportWebM: () => void;
  handleExportGIF: () => void;
  videoSrc: string | null;
  isExporting: boolean;
  isBatchExporting: boolean;
  useDithering: boolean;
  setUseDithering: (val: boolean) => void;
  isGifLooping: boolean;
  setIsGifLooping: (val: boolean) => void;
  videoQueue: VideoItem[];
  doBatchExport: (type: 'GIF' | 'WebM') => void;
}

const COMMON_PRESETS = [
  { label: '1080p FHD', w: 1920, h: 1080, icon: Monitor, tag: '16:9' },
  { label: '720p HD', w: 1280, h: 720, icon: Tv, tag: '16:9' },
  { label: '4K UHD', w: 3840, h: 2160, icon: Monitor, tag: '16:9' },
  { label: '9:16 Shorts', w: 1080, h: 1920, icon: Smartphone, tag: '9:16' },
  { label: '1:1 Square', w: 1080, h: 1080, icon: Square, tag: '1:1' },
  { label: '512px Icon', w: 512, h: 512, icon: Layers, tag: 'Sticker' },
];

export const OutputSettings: React.FC<OutputSettingsProps> = ({
  aspectRatio,
  setAspectRatio,
  outputSizeMode,
  setOutputSizeMode,
  outputScale,
  setOutputScale,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  lockAspectRatio,
  setLockAspectRatio,
  outputFitMode,
  setOutputFitMode,
  videoWidth,
  videoHeight,
  gifFps,
  setGifFps,
  gifFrameLimit,
  setGifFrameLimit,
  handleExportWebM,
  handleExportGIF,
  videoSrc,
  isExporting,
  isBatchExporting,
  useDithering,
  setUseDithering,
  isGifLooping,
  setIsGifLooping,
  videoQueue,
  doBatchExport
}) => {
  // Local string states for smooth, unrestricted text input
  const initialW = customWidth || videoWidth || 1920;
  const initialH = customHeight || videoHeight || 1080;

  const [widthText, setWidthText] = useState<string>(String(initialW));
  const [heightText, setHeightText] = useState<string>(String(initialH));

  // Keep local text inputs in sync when customWidth / customHeight change externally (e.g. preset clicked or video loaded)
  useEffect(() => {
    if (customWidth > 0 && String(customWidth) !== widthText) {
      setWidthText(String(customWidth));
    }
  }, [customWidth]);

  useEffect(() => {
    if (customHeight > 0 && String(customHeight) !== heightText) {
      setHeightText(String(customHeight));
    }
  }, [customHeight]);

  // When video loads for the first time, initialize if zero
  useEffect(() => {
    if (videoWidth > 0 && videoHeight > 0 && customWidth === 0 && customHeight === 0) {
      setCustomWidth(videoWidth);
      setCustomHeight(videoHeight);
      setWidthText(String(videoWidth));
      setHeightText(String(videoHeight));
    }
  }, [videoWidth, videoHeight]);

  // Determine current aspect ratio ratio multiplier
  const getEffectiveRatio = () => {
    const currentW = parseInt(widthText) || customWidth || videoWidth || 1920;
    const currentH = parseInt(heightText) || customHeight || videoHeight || 1080;
    if (currentW > 0 && currentH > 0) return currentW / currentH;
    if (videoWidth > 0 && videoHeight > 0) return videoWidth / videoHeight;
    return 16 / 9;
  };

  // Handle user typing in Width input
  const handleWidthChange = (raw: string) => {
    setWidthText(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      setCustomWidth(val);
      if (lockAspectRatio) {
        const ratio = (videoWidth > 0 && videoHeight > 0) ? (videoWidth / videoHeight) : getEffectiveRatio();
        const newH = Math.max(1, Math.round(val / ratio));
        setCustomHeight(newH);
        setHeightText(String(newH));
      }
    }
  };

  const handleWidthBlur = () => {
    const val = parseInt(widthText, 10);
    const safeVal = (!isNaN(val) && val > 0) ? Math.min(8192, val) : (customWidth || videoWidth || 1920);
    setWidthText(String(safeVal));
    setCustomWidth(safeVal);
    if (lockAspectRatio) {
      const ratio = (videoWidth > 0 && videoHeight > 0) ? (videoWidth / videoHeight) : (16 / 9);
      const newH = Math.max(1, Math.round(safeVal / ratio));
      setCustomHeight(newH);
      setHeightText(String(newH));
    }
  };

  // Handle user typing in Height input
  const handleHeightChange = (raw: string) => {
    setHeightText(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      setCustomHeight(val);
      if (lockAspectRatio) {
        const ratio = (videoWidth > 0 && videoHeight > 0) ? (videoWidth / videoHeight) : getEffectiveRatio();
        const newW = Math.max(1, Math.round(val * ratio));
        setCustomWidth(newW);
        setWidthText(String(newW));
      }
    }
  };

  const handleHeightBlur = () => {
    const val = parseInt(heightText, 10);
    const safeVal = (!isNaN(val) && val > 0) ? Math.min(8192, val) : (customHeight || videoHeight || 1080);
    setHeightText(String(safeVal));
    setCustomHeight(safeVal);
    if (lockAspectRatio) {
      const ratio = (videoWidth > 0 && videoHeight > 0) ? (videoWidth / videoHeight) : (16 / 9);
      const newW = Math.max(1, Math.round(safeVal * ratio));
      setCustomWidth(newW);
      setWidthText(String(newW));
    }
  };

  const handleApplyPreset = (w: number, h: number) => {
    setCustomWidth(w);
    setCustomHeight(h);
    setWidthText(String(w));
    setHeightText(String(h));
    setOutputSizeMode('custom');
  };

  const handleMultiplySize = (factor: number) => {
    const curW = parseInt(widthText, 10) || customWidth || videoWidth || 1920;
    const curH = parseInt(heightText, 10) || customHeight || videoHeight || 1080;
    const newW = Math.max(16, Math.round(curW * factor));
    const newH = Math.max(16, Math.round(curH * factor));
    setCustomWidth(newW);
    setCustomHeight(newH);
    setWidthText(String(newW));
    setHeightText(String(newH));
    setOutputSizeMode('custom');
  };

  const handleResetToNative = () => {
    const w = videoWidth || 1920;
    const h = videoHeight || 1080;
    setCustomWidth(w);
    setCustomHeight(h);
    setWidthText(String(w));
    setHeightText(String(h));
    setOutputScale(1.0);
    setOutputSizeMode('original');
  };

  const handleSwapDimensions = () => {
    const curW = parseInt(widthText, 10) || customWidth || videoWidth || 1920;
    const curH = parseInt(heightText, 10) || customHeight || videoHeight || 1080;
    setCustomWidth(curH);
    setCustomHeight(curW);
    setWidthText(String(curH));
    setHeightText(String(curW));
    setOutputSizeMode('custom');
  };

  // Compute live current output resolution preview badge
  let calculatedOutW = videoWidth || 1920;
  let calculatedOutH = videoHeight || 1080;
  if (outputSizeMode === 'scale') {
    calculatedOutW = Math.round((videoWidth || 1920) * (outputScale || 1));
    calculatedOutH = Math.round((videoHeight || 1080) * (outputScale || 1));
  } else if (outputSizeMode === 'custom' || outputSizeMode === 'preset') {
    calculatedOutW = parseInt(widthText, 10) || customWidth || videoWidth || 1920;
    calculatedOutH = parseInt(heightText, 10) || customHeight || videoHeight || 1080;
  }

  return (
    <div className="p-4 sm:p-6 mt-auto bg-[#0F0F11] border-t border-[#1C1C1F] flex flex-col gap-5">
      {/* Header with Active Output Summary Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#888] font-bold">Output Dimensions & Scale</h3>
        <span className="px-2 py-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded">
          {calculatedOutW} × {calculatedOutH} px
        </span>
      </div>

      {/* Aspect Ratio / Crop */}
      <div>
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-2 text-[#888]">
          <span>Aspect Ratio / Crop</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['original', '1:1', '9:16', '16:9'] as const).map(ratio => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`py-1.5 text-[9px] font-mono tracking-widest border transition-colors ${
                aspectRatio === ratio 
                  ? 'bg-white text-black border-white font-bold shadow-sm' 
                  : 'border-[#333] text-[#888] hover:bg-[#222]'
              }`}
            >
              {ratio.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Output Size Mode Selector */}
      <div className="bg-[#141416] p-3 border border-[#242428] rounded flex flex-col gap-3">
        <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#aaa]">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Output Scale & Size
          </span>
          {outputSizeMode !== 'original' && (
            <button
              onClick={handleResetToNative}
              className="text-[8px] text-[#666] hover:text-white flex items-center gap-1 transition-colors"
              title="Reset về độ phân giải gốc của video"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Reset Native
            </button>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#0A0A0B] p-0.5 border border-[#2A2A2E] rounded">
          <button
            onClick={() => setOutputSizeMode('original')}
            className={`py-1 text-[8.5px] font-mono uppercase tracking-wider rounded transition-all ${
              outputSizeMode === 'original'
                ? 'bg-[#2A2A2E] text-white font-bold shadow'
                : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            1:1 Native
          </button>
          <button
            onClick={() => setOutputSizeMode('scale')}
            className={`py-1 text-[8.5px] font-mono uppercase tracking-wider rounded transition-all ${
              outputSizeMode === 'scale'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-bold shadow'
                : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            Scale %
          </button>
          <button
            onClick={() => setOutputSizeMode('custom')}
            className={`py-1 text-[8.5px] font-mono uppercase tracking-wider rounded transition-all ${
              outputSizeMode === 'custom' || outputSizeMode === 'preset'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 font-bold shadow'
                : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            Custom W×H
          </button>
        </div>

        {/* SCALE (%) CONTROLS */}
        {outputSizeMode === 'scale' && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-[#888]">Scale Multiplier</span>
              <span className="text-cyan-400 font-bold">{Math.round(outputScale * 100)}% ({outputScale.toFixed(2)}x)</span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="2.0" 
              step="0.05"
              value={outputScale}
              onChange={(e) => setOutputScale(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            {/* Quick Scale Buttons */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0].slice(1).map(s => (
                <button
                  key={s}
                  onClick={() => setOutputScale(s)}
                  className={`py-1 text-[8px] font-mono rounded border transition-colors ${
                    outputScale === s
                      ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                      : 'border-[#333] text-[#888] hover:bg-[#222] hover:text-white'
                  }`}
                >
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM W x H CONTROLS */}
        {(outputSizeMode === 'custom' || outputSizeMode === 'preset') && (
          <div className="flex flex-col gap-3 pt-1">
            {/* W x H Inputs with no rigid minimums during typing */}
            <div className="flex items-center gap-2">
              {/* Width Input */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] text-[#888] uppercase tracking-widest font-mono">Width (px)</label>
                  <span className="text-[7.5px] text-[#555] font-mono">W</span>
                </div>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={widthText}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  onBlur={handleWidthBlur}
                  placeholder="1920"
                  className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[12px] font-mono font-semibold px-2.5 py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 outline-none rounded transition-all"
                />
              </div>

              {/* Lock / Swap Center Buttons */}
              <div className="flex flex-col items-center justify-center gap-1 pt-4">
                <button
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  className={`p-1.5 rounded border transition-colors ${
                    lockAspectRatio 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50' 
                      : 'border-[#333] text-[#666] hover:text-[#aaa]'
                  }`}
                  title={lockAspectRatio ? 'Khóa tỷ lệ (Aspect Ratio Locked)' : 'Mở khóa tỷ lệ (Free Scaling)'}
                >
                  {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleSwapDimensions}
                  className="p-1.5 rounded border border-[#333] text-[#666] hover:text-white hover:border-[#555] transition-colors"
                  title="Đảo chiều Chiều rộng ↔ Chiều cao (Swap W/H)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Height Input */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] text-[#888] uppercase tracking-widest font-mono">Height (px)</label>
                  <span className="text-[7.5px] text-[#555] font-mono">H</span>
                </div>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={heightText}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  onBlur={handleHeightBlur}
                  placeholder="1080"
                  className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[12px] font-mono font-semibold px-2.5 py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 outline-none rounded transition-all"
                />
              </div>
            </div>

            {/* Quick Multipliers (0.5x, 0.75x, 1.5x, 2x) */}
            <div className="flex items-center gap-1">
              <span className="text-[7.5px] text-[#666] uppercase tracking-wider font-mono mr-1">Scale:</span>
              {[0.5, 0.75, 1.25, 1.5, 2.0].map((factor) => (
                <button
                  key={factor}
                  onClick={() => handleMultiplySize(factor)}
                  className="flex-1 py-0.5 text-[8px] font-mono text-[#888] bg-[#101012] border border-[#2A2A2E] rounded hover:border-[#555] hover:text-white transition-colors"
                  title={`Nhân kích thước hiện tại lên ${factor}x`}
                >
                  {factor}x
                </button>
              ))}
            </div>

            {/* Quick Resolution Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] text-[#777] uppercase tracking-widest font-mono">Quick Presets</span>
              <div className="grid grid-cols-3 gap-1">
                {COMMON_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const curW = parseInt(widthText, 10) || customWidth;
                  const curH = parseInt(heightText, 10) || customHeight;
                  const isSelected = curW === preset.w && curH === preset.h;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleApplyPreset(preset.w, preset.h)}
                      className={`px-1.5 py-1.5 text-left border rounded transition-all flex flex-col gap-0.5 ${
                        isSelected 
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-sm' 
                          : 'border-[#28282C] bg-[#0C0C0E] text-[#888] hover:text-white hover:border-[#444]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold tracking-tight truncate">{preset.label}</span>
                        <Icon className="w-2.5 h-2.5 opacity-60" />
                      </div>
                      <span className="text-[7.5px] font-mono opacity-50">{preset.w}×{preset.h}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fit Mode Selector */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#222]">
              <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-[#888] font-mono">
                <span>Fit Mode (Khi tỉ lệ lệch)</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['contain', 'cover', 'stretch'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setOutputFitMode(mode)}
                    className={`py-1 text-[8px] font-mono uppercase tracking-wider rounded border transition-colors ${
                      outputFitMode === mode
                        ? 'bg-white text-black font-bold border-white'
                        : 'border-[#333] text-[#777] hover:bg-[#1A1A1D] hover:text-white'
                    }`}
                  >
                    {mode === 'contain' ? 'Fit (Center)' : mode === 'cover' ? 'Fill (Crop)' : 'Stretch'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GIF Encoding Limits */}
      <div className="bg-[#161618] p-3 border border-[#222] rounded flex flex-col gap-2">
        <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#888]">
          <span>GIF Encoding Limits</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[8px] text-[#666] uppercase tracking-widest">FPS Limit</label>
            <input 
              type="number" 
              min="1" max="30" 
              value={gifFps} 
              onChange={(e) => setGifFps(Number(e.target.value) || 1)} 
              className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[10px] font-mono px-2 py-1.5 focus:border-[#666] outline-none transition-colors rounded" 
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[8px] text-[#666] uppercase tracking-widest" title="0 for unlimited">Max Frames <span className="opacity-50">(0 = all)</span></label>
            <input 
              type="number" 
              min="0" 
              value={gifFrameLimit} 
              onChange={(e) => setGifFrameLimit(Number(e.target.value) || 0)} 
              className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[10px] font-mono px-2 py-1.5 focus:border-[#666] outline-none transition-colors rounded" 
            />
          </div>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportWebM}
          disabled={!videoSrc || isExporting || isBatchExporting}
          className="p-3 sm:p-4 border border-white bg-white text-black hover:bg-[#E0E0E0] flex flex-col items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:border-[#333] disabled:bg-transparent disabled:text-[#E0E0E0] rounded shadow-lg"
        >
          <span className="text-[10px] font-bold tracking-widest">EXPORT WEBM</span>
          <span className="text-[8px] opacity-75 font-mono">TRANSPARENT ALPHA</span>
        </button>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportGIF}
            disabled={!videoSrc || isExporting || isBatchExporting}
            className="flex-1 p-3 sm:p-4 border border-[#333] hover:border-[#666] bg-[#141416] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 disabled:hover:border-[#333] rounded"
          >
            <span className="text-[10px] font-bold tracking-widest text-[#aaa]">EXPORT GIF</span>
            <span className="text-[8px] opacity-40 font-mono">ANIMATED SPRITE</span>
          </button>
          <div className="flex items-center justify-between px-1">
            <label 
              className="flex items-center gap-1.5 cursor-pointer group"
              onClick={(e) => { e.preventDefault(); setUseDithering(!useDithering); }}
            >
              <div className={`w-3 h-3 border rounded-sm ${useDithering ? 'bg-white border-white' : 'border-[#444] group-hover:border-[#666]'} flex items-center justify-center transition-colors`}>
                {useDithering && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
              </div>
              <span className="text-[8.5px] uppercase tracking-wider text-[#888] group-hover:text-[#aaa] transition-colors">Dither</span>
            </label>
            <label 
              className="flex items-center gap-1.5 cursor-pointer group"
              onClick={(e) => { e.preventDefault(); setIsGifLooping(!isGifLooping); }}
            >
              <div className={`w-3 h-3 border rounded-sm ${isGifLooping ? 'bg-white border-white' : 'border-[#444] group-hover:border-[#666]'} flex items-center justify-center transition-colors`}>
                {isGifLooping && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
              </div>
              <span className="text-[8.5px] uppercase tracking-wider text-[#888] group-hover:text-[#aaa] transition-colors">Loop</span>
            </label>
          </div>
        </div>
      </div>

      {/* Batch Processing */}
      {videoQueue.length > 1 && (
        <div className="border-t border-[#222] pt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#888]">
            <span>Batch Process ({videoQueue.length} files)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => doBatchExport('WebM')}
              disabled={isExporting || isBatchExporting}
              className="p-2.5 border border-[#333] hover:bg-[#222] text-white flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-30 rounded text-[9px] font-mono tracking-wider"
            >
              BATCH WEBM
            </button>
            <button
              onClick={() => doBatchExport('GIF')}
              disabled={isExporting || isBatchExporting}
              className="p-2.5 border border-[#333] hover:bg-[#222] text-white flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-30 rounded text-[9px] font-mono tracking-wider"
            >
              BATCH GIF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
