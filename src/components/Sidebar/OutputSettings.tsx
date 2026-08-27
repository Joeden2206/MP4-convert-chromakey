import React from 'react';
import { AspectRatioType, VideoItem } from '../../types';

interface OutputSettingsProps {
  aspectRatio: AspectRatioType;
  setAspectRatio: (ratio: AspectRatioType) => void;
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

export const OutputSettings: React.FC<OutputSettingsProps> = ({
  aspectRatio,
  setAspectRatio,
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
  return (
    <div className="p-5 sm:p-8 mt-auto bg-[#0F0F11]">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#888] mb-4">Output Settings</h3>
      
      <div className="mb-4">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Aspect Ratio / Crop</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['original', '1:1', '9:16', '16:9'] as const).map(ratio => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`py-2 text-[9px] font-mono tracking-widest border transition-colors ${
                aspectRatio === ratio 
                  ? 'bg-white text-black border-white' 
                  : 'border-[#333] text-[#888] hover:bg-[#222]'
              }`}
            >
              {ratio.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 bg-[#161618] p-3 border border-[#222]">
        <div className="flex justify-between items-center text-[9px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">GIF Encoding Limits</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[8px] text-[#666] uppercase tracking-widest">FPS Limit</label>
            <input 
              type="number" 
              min="1" max="30" 
              value={gifFps} 
              onChange={(e) => setGifFps(Number(e.target.value) || 1)} 
              className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[10px] font-mono px-2 py-1.5 focus:border-[#666] outline-none transition-colors" 
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[8px] text-[#666] uppercase tracking-widest" title="0 for unlimited">Max Frames <span className="opacity-50">(0 = none)</span></label>
            <input 
              type="number" 
              min="0" 
              value={gifFrameLimit} 
              onChange={(e) => setGifFrameLimit(Number(e.target.value) || 0)} 
              className="w-full bg-[#0A0A0B] border border-[#333] text-white text-[10px] font-mono px-2 py-1.5 focus:border-[#666] outline-none transition-colors" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportWebM}
          disabled={!videoSrc || isExporting || isBatchExporting}
          className="p-4 border border-white hover:bg-white hover:text-black flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-30 disabled:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#E0E0E0]"
        >
          <span className="text-[10px] font-bold tracking-widest">WEBM</span>
          <span className="text-[8px] opacity-60">TRANSPARENT</span>
        </button>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportGIF}
            disabled={!videoSrc || isExporting || isBatchExporting}
            className="flex-1 p-4 border border-[#333] hover:border-[#666] flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-30 disabled:hover:border-[#333]"
          >
            <span className="text-[10px] font-bold tracking-widest text-[#aaa]">GIF</span>
            <span className="text-[8px] opacity-40">ANIMATED</span>
          </button>
          <label 
            className="flex items-center justify-center gap-2 cursor-pointer group"
            onClick={(e) => { e.preventDefault(); setUseDithering(!useDithering); }}
          >
            <div className={`w-3 h-3 border ${useDithering ? 'bg-white border-white' : 'border-[#444] group-hover:border-[#666]'} flex items-center justify-center transition-colors`}>
              {useDithering && <div className="w-1.5 h-1.5 bg-black" />}
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#888] group-hover:text-[#aaa] transition-colors">Dither GIF</span>
          </label>
          <label 
            className="flex items-center justify-center gap-2 cursor-pointer group"
            onClick={(e) => { e.preventDefault(); setIsGifLooping(!isGifLooping); }}
          >
            <div className={`w-3 h-3 border ${isGifLooping ? 'bg-white border-white' : 'border-[#444] group-hover:border-[#666]'} flex items-center justify-center transition-colors`}>
              {isGifLooping && <div className="w-1.5 h-1.5 bg-black" />}
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#888] group-hover:text-[#aaa] transition-colors">Loop GIF</span>
          </label>
        </div>
      </div>

      {videoQueue.length > 1 && (
        <div className="mt-4 border-t border-[#222] pt-4">
          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest mb-3">
            <span className="text-[#888]">Batch Process ({videoQueue.length} files)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => doBatchExport('WebM')}
              disabled={isExporting || isBatchExporting}
              className="p-3 border border-[#333] hover:bg-[#222] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30"
            >
              <span className="text-[9px] tracking-widest text-white">BATCH WEBM</span>
            </button>
            <button
              onClick={() => doBatchExport('GIF')}
              disabled={isExporting || isBatchExporting}
              className="p-3 border border-[#333] hover:bg-[#222] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30"
            >
              <span className="text-[9px] tracking-widest text-[#aaa]">BATCH GIF</span>
            </button>
          </div>
        </div>
      )}
      
      <p className="mt-6 text-[9px] leading-relaxed text-[#555] font-serif italic">
         Hardware acceleration enabled. Real-time extraction with live preview.
      </p>
    </div>
  );
};
