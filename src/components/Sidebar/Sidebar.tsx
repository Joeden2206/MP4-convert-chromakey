import React from 'react';
import { Pipette, Sparkles } from 'lucide-react';
import { AiMattingStatus } from '../../lib/aiMatting';
import {
  ExtractionMode, MobileTab, RGBColor, CustomMatteZone,
  MatteToolType, AspectRatioType, VideoItem
} from '../../types';
import { AiMatteControls } from './AiMatteControls';
import { ChromaKeyControls } from './ChromaKeyControls';
import { OutputSettings } from './OutputSettings';

interface SidebarProps {
  mobileTab: MobileTab;
  isSidebarOpen: boolean;
  extractionMode: ExtractionMode;
  setExtractionMode: (mode: ExtractionMode) => void;
  onReset: () => void;
  // AI props
  aiStatus: AiMattingStatus;
  aiError: string | null;
  useVectorMask: boolean;
  setUseVectorMask: (val: boolean) => void;
  vectorCurveSmoothness: number;
  setVectorCurveSmoothness: (val: number) => void;
  cornerThreshold: number;
  setCornerThreshold: (val: number) => void;
  aiEdgeShift: number;
  setAiEdgeShift: (val: number) => void;
  aiSmoothness: number;
  setAiSmoothness: (val: number) => void;
  aiDefringe: number;
  setAiDefringe: (val: number) => void;
  aiThreshold: number;
  setAiThreshold: (val: number) => void;
  aiFeather: number;
  setAiFeather: (val: number) => void;
  aiInvert: boolean;
  setAiInvert: (val: boolean) => void;
  strokeWidth: number;
  setStrokeWidth: (val: number) => void;
  strokeColor: string;
  setStrokeColor: (val: string) => void;
  showVectorContour: boolean;
  setShowVectorContour: (val: boolean) => void;
  vectorContourColor: string;
  setVectorContourColor: (val: string) => void;
  customZones: CustomMatteZone[];
  setCustomZones: React.Dispatch<React.SetStateAction<CustomMatteZone[]>>;
  activeMatteTool: MatteToolType;
  setActiveMatteTool: (tool: MatteToolType) => void;
  removeCustomZone: (id: string) => void;
  // Chroma props
  targetColors: RGBColor[];
  setTargetColors: React.Dispatch<React.SetStateAction<RGBColor[]>>;
  isPicking: boolean;
  setIsPicking: (val: boolean) => void;
  videoSrc: string | null;
  similarity: number;
  setSimilarity: (val: number) => void;
  colorBlend: number;
  setColorBlend: (val: number) => void;
  shadingTolerance: number;
  setShadingTolerance: (val: number) => void;
  contiguous: boolean;
  setContiguous: (val: boolean) => void;
  edgeShift: number;
  setEdgeShift: (val: number) => void;
  edgeSoftness: number;
  setEdgeSoftness: (val: number) => void;
  spillSuppression: number;
  setSpillSuppression: (val: number) => void;
  removeColor: (idx: number) => void;
  // Output props
  aspectRatio: AspectRatioType;
  setAspectRatio: (ratio: AspectRatioType) => void;
  gifFps: number;
  setGifFps: (fps: number) => void;
  gifFrameLimit: number;
  setGifFrameLimit: (limit: number) => void;
  handleExportWebM: () => void;
  handleExportGIF: () => void;
  isExporting: boolean;
  isBatchExporting: boolean;
  useDithering: boolean;
  setUseDithering: (val: boolean) => void;
  isGifLooping: boolean;
  setIsGifLooping: (val: boolean) => void;
  videoQueue: VideoItem[];
  doBatchExport: (type: 'GIF' | 'WebM') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileTab,
  isSidebarOpen,
  extractionMode,
  setExtractionMode,
  onReset,
  aiStatus,
  aiError,
  useVectorMask,
  setUseVectorMask,
  vectorCurveSmoothness,
  setVectorCurveSmoothness,
  cornerThreshold,
  setCornerThreshold,
  aiEdgeShift,
  setAiEdgeShift,
  aiSmoothness,
  setAiSmoothness,
  aiDefringe,
  setAiDefringe,
  aiThreshold,
  setAiThreshold,
  aiFeather,
  setAiFeather,
  aiInvert,
  setAiInvert,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  showVectorContour,
  setShowVectorContour,
  vectorContourColor,
  setVectorContourColor,
  customZones,
  setCustomZones,
  activeMatteTool,
  setActiveMatteTool,
  removeCustomZone,
  targetColors,
  setTargetColors,
  isPicking,
  setIsPicking,
  videoSrc,
  similarity,
  setSimilarity,
  colorBlend,
  setColorBlend,
  shadingTolerance,
  setShadingTolerance,
  contiguous,
  setContiguous,
  edgeShift,
  setEdgeShift,
  edgeSoftness,
  setEdgeSoftness,
  spillSuppression,
  setSpillSuppression,
  removeColor,
  aspectRatio,
  setAspectRatio,
  gifFps,
  setGifFps,
  gifFrameLimit,
  setGifFrameLimit,
  handleExportWebM,
  handleExportGIF,
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
    <aside className={`w-full sm:w-[340px] md:w-[360px] border-l border-[#222] bg-[#0A0A0B] flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-all duration-300 ${
      mobileTab === 'view' ? 'hidden sm:flex' : 'flex'
    } ${!isSidebarOpen ? 'sm:hidden' : 'sm:flex'}`}>
      <div className={`p-5 sm:p-8 border-b border-[#222] ${mobileTab === 'export' ? 'hidden sm:block' : 'block'}`}>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-serif italic text-2xl mb-1 text-white">Extraction</h2>
            <p className="text-[11px] text-[#666] uppercase tracking-widest">Engine & Parameters</p>
          </div>
          <button
            onClick={onReset}
            className="text-[9px] uppercase tracking-widest text-[#666] hover:text-white transition-colors underline decoration-[#333] underline-offset-4"
          >
            Reset
          </button>
        </div>

        {/* Extraction Mode Segmented Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#121215] border border-[#222] rounded-lg mb-8">
          <button
            onClick={() => setExtractionMode('chroma')}
            className={`py-2 px-3 text-[10px] font-mono tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all ${
              extractionMode === 'chroma'
                ? 'bg-white text-black font-semibold shadow-md'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <Pipette className="w-3 h-3" />
            CHROMA KEY
          </button>
          <button
            onClick={() => setExtractionMode('ai')}
            className={`py-2 px-3 text-[10px] font-mono tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all ${
              extractionMode === 'ai'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-semibold shadow-md'
                : 'text-[#888] hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI MATTE
          </button>
        </div>
        
        <div className="space-y-8">
          {extractionMode === 'ai' ? (
            <AiMatteControls
              aiStatus={aiStatus}
              aiError={aiError}
              useVectorMask={useVectorMask}
              setUseVectorMask={setUseVectorMask}
              vectorCurveSmoothness={vectorCurveSmoothness}
              setVectorCurveSmoothness={setVectorCurveSmoothness}
              cornerThreshold={cornerThreshold}
              setCornerThreshold={setCornerThreshold}
              aiEdgeShift={aiEdgeShift}
              setAiEdgeShift={setAiEdgeShift}
              aiSmoothness={aiSmoothness}
              setAiSmoothness={setAiSmoothness}
              aiDefringe={aiDefringe}
              setAiDefringe={setAiDefringe}
              aiThreshold={aiThreshold}
              setAiThreshold={setAiThreshold}
              aiFeather={aiFeather}
              setAiFeather={setAiFeather}
              aiInvert={aiInvert}
              setAiInvert={setAiInvert}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              showVectorContour={showVectorContour}
              setShowVectorContour={setShowVectorContour}
              vectorContourColor={vectorContourColor}
              setVectorContourColor={setVectorContourColor}
              customZones={customZones}
              setCustomZones={setCustomZones}
              activeMatteTool={activeMatteTool}
              setActiveMatteTool={setActiveMatteTool}
              removeCustomZone={removeCustomZone}
            />
          ) : (
            <ChromaKeyControls
              targetColors={targetColors}
              setTargetColors={setTargetColors}
              isPicking={isPicking}
              setIsPicking={setIsPicking}
              videoSrc={videoSrc}
              similarity={similarity}
              setSimilarity={setSimilarity}
              colorBlend={colorBlend}
              setColorBlend={setColorBlend}
              shadingTolerance={shadingTolerance}
              setShadingTolerance={setShadingTolerance}
              contiguous={contiguous}
              setContiguous={setContiguous}
              edgeShift={edgeShift}
              setEdgeShift={setEdgeShift}
              edgeSoftness={edgeSoftness}
              setEdgeSoftness={setEdgeSoftness}
              spillSuppression={spillSuppression}
              setSpillSuppression={setSpillSuppression}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              removeColor={removeColor}
            />
          )}
        </div>
      </div>

      <div className={`${mobileTab === 'tune' ? 'hidden sm:block' : 'block'} mt-auto`}>
        <OutputSettings
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          gifFps={gifFps}
          setGifFps={setGifFps}
          gifFrameLimit={gifFrameLimit}
          setGifFrameLimit={setGifFrameLimit}
          handleExportWebM={handleExportWebM}
          handleExportGIF={handleExportGIF}
          videoSrc={videoSrc}
          isExporting={isExporting}
          isBatchExporting={isBatchExporting}
          useDithering={useDithering}
          setUseDithering={setUseDithering}
          isGifLooping={isGifLooping}
          setIsGifLooping={setIsGifLooping}
          videoQueue={videoQueue}
          doBatchExport={doBatchExport}
        />
      </div>
    </aside>
  );
};
