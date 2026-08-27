import React from 'react';
import {
  Wand2, Loader2, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck,
  Trash2
} from 'lucide-react';
import { AiMattingStatus } from '../../lib/aiMatting';
import { CustomMatteZone, MatteToolType } from '../../types';

interface AiMatteControlsProps {
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
}

export const AiMatteControls: React.FC<AiMatteControlsProps> = ({
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
  removeCustomZone
}) => {
  return (
    <div className="space-y-6">
      {/* AI Status Banner */}
      <div className="p-3 bg-[#161618] border border-[#26262a] rounded-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase tracking-widest text-[#888] flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-emerald-400" />
            Neural Model
          </span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#222] text-[#aaa]">
            Client GPU
          </span>
        </div>

        {aiStatus === 'loading' && (
          <div className="flex items-center gap-2 text-yellow-400 text-[10px] font-mono mt-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading AI model (~2MB)...</span>
          </div>
        )}
        {aiStatus === 'ready' && (
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready (WebGPU / WASM Active)</span>
          </div>
        )}
        {aiStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-[10px] font-mono mt-2">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{aiError || 'Failed to initialize AI model'}</span>
          </div>
        )}
        {aiStatus === 'idle' && (
          <p className="text-[10px] text-[#777] font-mono mt-1">Initializing segmentation engine...</p>
        )}
      </div>

      <h3 className="text-[9px] uppercase tracking-widest text-[#555] border-b border-[#222] pb-2">AI Matte Tuning</h3>

      {/* Vector Bézier Mask Toggle */}
      <div className="group flex items-center justify-between py-2 border-b border-[#222]">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-1.5">
            <span>Vector Bézier Spline Mask</span>
            <span className="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 rounded">Zero-Aliasing</span>
          </span>
          <span className="text-[8px] text-[#666]">Mô phỏng Image Trace: cắt viền bằng đường cong Bézier toán học</span>
        </div>
        <button 
          onClick={() => setUseVectorMask(!useVectorMask)}
          className={`w-8 h-4 rounded-full relative transition-colors ${useVectorMask ? 'bg-emerald-500' : 'bg-[#333]'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${useVectorMask ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Bézier Tangent Handle Tension (Độ cong đòn gánh) */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Bézier Handle Curve (Đòn gánh)</span>
          <span className="font-mono text-cyan-400">{Math.round(vectorCurveSmoothness * 100)}%</span>
        </div>
        <input 
          type="range" min="0.05" max="0.65" step="0.01" value={vectorCurveSmoothness} 
          onChange={(e) => setVectorCurveSmoothness(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
        <span className="text-[8px] text-[#666] mt-1 block">Tăng độ dài đòn gánh tiếp tuyến để uốn cong mượt mà theo cấu trúc tóc & vai.</span>
      </div>

      {/* Sharp Corner Angle Threshold */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Corner Threshold (Góc uốn góc nhọn)</span>
          <span className="font-mono text-cyan-400">{cornerThreshold}°</span>
        </div>
        <input 
          type="range" min="25" max="90" step="1" value={cornerThreshold} 
          onChange={(e) => setCornerThreshold(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
        <span className="text-[8px] text-[#666] mt-1 block">Giữ nguyên các góc nhọn thực tế (như chóp tóc, ve áo) mà không bị bo tròn sai lệch.</span>
      </div>

      {/* Edge Shift / Choke */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Edge Shift (Choke)</span>
          <span className="font-mono text-emerald-400">{aiEdgeShift > 0 ? `+${aiEdgeShift}` : aiEdgeShift}px</span>
        </div>
        <input 
          type="range" min="-8" max="6" step="0.5" value={aiEdgeShift} 
          onChange={(e) => setAiEdgeShift(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
        <span className="text-[8px] text-[#666] mt-1 block">Kéo âm (-1px đến -5px) để thu hẹp viền & xóa sạch bóng tối/viền đen.</span>
      </div>

      {/* Edge Anti-Aliasing (Smoothness) */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Anti-Aliasing (Khử gai)</span>
          <span className="font-mono text-emerald-400">{aiSmoothness}px</span>
        </div>
        <input 
          type="range" min="0" max="8" step="0.5" value={aiSmoothness} 
          onChange={(e) => setAiSmoothness(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
        <span className="text-[8px] text-[#666] mt-1 block">Làm mượt đường răng cưa, loại bỏ gai và mép gợn sóng.</span>
      </div>

      {/* Dark Halo Defringe */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Defringe (Khử viền tối)</span>
          <span className="font-mono text-emerald-400">{aiDefringe}%</span>
        </div>
        <input 
          type="range" min="0" max="100" step="5" value={aiDefringe} 
          onChange={(e) => setAiDefringe(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
        <span className="text-[8px] text-[#666] mt-1 block">Tự động tẩy sạch dải màu tối & bóng đen ám ở rìa viền.</span>
      </div>

      {/* Subject Confidence */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Subject Confidence</span>
          <span className="font-mono text-white">{aiThreshold}%</span>
        </div>
        <input 
          type="range" min="10" max="90" value={aiThreshold} 
          onChange={(e) => setAiThreshold(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
      </div>

      {/* Edge Feather */}
      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Edge Feather (Làm mờ êm)</span>
          <span className="font-mono text-white">{aiFeather}px</span>
        </div>
        <input 
          type="range" min="0" max="10" step="0.5" value={aiFeather} 
          onChange={(e) => setAiFeather(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
      </div>

      <div className="group flex items-center justify-between py-2 border-y border-[#222]">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#888] block">Invert Mask</span>
          <span className="text-[8px] text-[#555]">Keep background instead of subject</span>
        </div>
        <button 
          onClick={() => setAiInvert(!aiInvert)}
          className={`w-8 h-4 rounded-full relative transition-colors ${aiInvert ? 'bg-[#10B981]' : 'bg-[#333]'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${aiInvert ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      <h3 className="text-[9px] uppercase tracking-widest text-[#555] border-b border-[#222] pb-2 pt-2">Stroke / Outline</h3>

      <div className="group">
        <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Stroke Width</span>
          <span className="font-mono text-white">{strokeWidth}px</span>
        </div>
        <input 
          type="range" min="0" max="20" value={strokeWidth} 
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
        />
      </div>

      <div className="group">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-3">
          <span className="text-[#888]">Stroke Color</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-white">{strokeColor.toUpperCase()}</span>
            <input 
              type="color" 
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-6 h-6 p-0 border-0 outline-none cursor-pointer rounded-full overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full"
              title="Click to pick stroke color"
            />
          </div>
        </div>
      </div>

      <h3 className="text-[9px] uppercase tracking-widest text-[#555] border-b border-[#222] pb-2 pt-2 flex items-center justify-between">
        <span>Vector Contour & Zones</span>
        <span className="text-[8px] text-cyan-400 font-mono">Zero-Lag</span>
      </h3>

      {/* Vector Contour Glow Overlay */}
      <div className="group flex items-center justify-between py-1">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#888] block">Vector Contour Glow</span>
          <span className="text-[8px] text-[#555]">Vẽ đường bao vector viền thời gian thực</span>
        </div>
        <div className="flex items-center gap-2">
          {showVectorContour && (
            <input 
              type="color" 
              value={vectorContourColor}
              onChange={(e) => setVectorContourColor(e.target.value)}
              className="w-4 h-4 p-0 border-0 outline-none cursor-pointer rounded-full overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full"
              title="Chọn màu phát sáng vector"
            />
          )}
          <button 
            onClick={() => setShowVectorContour(!showVectorContour)}
            className={`w-8 h-4 rounded-full relative transition-colors ${showVectorContour ? 'bg-cyan-500' : 'bg-[#333]'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showVectorContour ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Custom Matte Zones Manager */}
      <div className="pt-2 border-t border-[#222]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase tracking-widest text-[#888]">Custom Matte Zones</span>
          <span className="text-[8px] font-mono text-[#666]">{customZones.length} vùng</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button 
            onClick={() => setActiveMatteTool(activeMatteTool === 'remove_rect' ? 'none' : 'remove_rect')}
            className={`px-2 py-1.5 text-[9px] font-mono rounded border flex items-center justify-center gap-1.5 transition-all ${activeMatteTool === 'remove_rect' ? 'bg-red-500 text-white border-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-red-950/30 text-red-400 border-red-900/50 hover:bg-red-900/40'}`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>+ Ép Xóa</span>
          </button>
          <button 
            onClick={() => setActiveMatteTool(activeMatteTool === 'keep_rect' ? 'none' : 'keep_rect')}
            className={`px-2 py-1.5 text-[9px] font-mono rounded border flex items-center justify-center gap-1.5 transition-all ${activeMatteTool === 'keep_rect' ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/40'}`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>+ Ép Giữ</span>
          </button>
        </div>

        {/* Zones list */}
        {customZones.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1 mt-2">
            {customZones.map((zone, idx) => (
              <div 
                key={zone.id}
                className="flex items-center justify-between px-2 py-1 bg-[#141416] border border-[#26262a] rounded text-[9px] font-mono"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${zone.type === 'remove' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'}`} />
                  <span className={zone.type === 'remove' ? 'text-red-300' : 'text-emerald-300'}>
                    {zone.type === 'remove' ? 'Ép Xóa (Garbage)' : 'Ép Giữ (Holdout)'} #{idx + 1}
                  </span>
                </div>
                <button 
                  onClick={() => removeCustomZone(zone.id)}
                  className="text-[#666] hover:text-red-400 transition-colors p-1"
                  title="Xóa vùng này"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setCustomZones([])}
              className="w-full text-center text-[8px] uppercase tracking-widest text-red-400 hover:text-red-300 py-1 transition-colors"
            >
              Xóa tất cả vùng can thiệp
            </button>
          </div>
        )}
      </div>

      <p className="text-[9px] text-[#555] italic font-serif leading-relaxed">
        Tip: Điều chỉnh <b>Edge Shift</b> về giá trị âm (-1px đến -4px) kết hợp <b>Anti-Aliasing</b> để loại bỏ hoàn toàn viền đen và gai viền.
      </p>
    </div>
  );
};
