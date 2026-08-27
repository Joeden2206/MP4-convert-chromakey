import React from 'react';
import { Pipette, Trash2 } from 'lucide-react';
import { RGBColor } from '../../types';

interface ChromaKeyControlsProps {
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
  strokeWidth: number;
  setStrokeWidth: (val: number) => void;
  strokeColor: string;
  setStrokeColor: (val: string) => void;
  removeColor: (idx: number) => void;
}

export const ChromaKeyControls: React.FC<ChromaKeyControlsProps> = ({
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
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  removeColor
}) => {
  return (
    <>
      {/* Target Colors */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="text-[9px] uppercase tracking-[0.2em] text-[#888] block">Primary Key Color</label>
          <span className="text-[9px] font-mono text-[#666]">{targetColors.length}/10</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {targetColors.map((color, idx) => (
            <div 
              key={idx} 
              className="group relative w-10 h-10 rounded-full border border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer overflow-hidden transition-all"
              style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
              onClick={() => removeColor(idx)}
              title="Click to remove"
            >
              <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
          
          {targetColors.length < 10 && videoSrc && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsPicking(!isPicking)}
                className={`w-10 h-10 rounded-full border border-[#333] flex items-center justify-center transition-colors ${
                  isPicking ? 'bg-white text-black' : 'text-[#888] hover:bg-white hover:text-black'
                }`}
                title="Pick color from video"
              >
                <Pipette className="w-4 h-4" />
              </button>
              
              <div className="relative w-10 h-10 rounded-full border border-[#333] flex items-center justify-center text-[#888] hover:bg-white hover:text-black transition-colors cursor-pointer" title="Add hex color manually">
                <span className="text-xl font-light mb-1">+</span>
                <input 
                  type="color" 
                  onChange={(e) => {
                    const hex = e.target.value.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    const newColor = { r, g, b };
                    
                    const isDuplicate = targetColors.some(c => 
                      Math.abs(c.r - newColor.r) < 5 && 
                      Math.abs(c.g - newColor.g) < 5 && 
                      Math.abs(c.b - newColor.b) < 5
                    );
                    
                    if (!isDuplicate) {
                      setTargetColors(prev => [...prev, newColor]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
        
        {targetColors.length === 0 && videoSrc && (
          <p className="text-[9px] text-[#555] italic mt-4 font-serif">Click the pipette to sample colors. Tip: Pick the shadow as a 2nd color.</p>
        )}
        {targetColors.length > 0 && videoSrc && contiguous && (
          <p className="text-[9px] text-[#555] italic mt-4 font-serif">Tip: If "Contiguous" is missing enclosed gaps (like between arms), pick a color inside that gap to force its removal.</p>
        )}
      </div>

      {/* Adjustments */}
      {videoSrc && (
        <div className="space-y-6">
          <h3 className="text-[9px] uppercase tracking-widest text-[#555] border-b border-[#222] pb-2">Matte Generation</h3>
          
          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Similarity</span>
              <span className="font-mono text-white">{similarity}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={similarity} 
              onChange={(e) => setSimilarity(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>
          
          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Color Blend</span>
              <span className="font-mono text-white">{colorBlend}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={colorBlend} 
              onChange={(e) => setColorBlend(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>
          
          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Shading Tolerance</span>
              <span className="font-mono text-white">{shadingTolerance}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={shadingTolerance} 
              onChange={(e) => setShadingTolerance(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>

          <div className="group flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-[#888]">Contiguous (Protect Subject)</span>
            <button 
              onClick={() => setContiguous(!contiguous)}
              className={`w-8 h-4 rounded-full relative transition-colors ${contiguous ? 'bg-[#1DB954]' : 'bg-[#333]'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${contiguous ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>

          <h3 className="text-[9px] uppercase tracking-widest text-[#555] border-b border-[#222] pb-2 pt-2">Matte Cleanup</h3>

          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Edge Shift (Choke)</span>
              <span className="font-mono text-white">{edgeShift > 0 ? '+' : ''}{edgeShift}%</span>
            </div>
            <input 
              type="range" min="-100" max="100" value={edgeShift} 
              onChange={(e) => setEdgeShift(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>

          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Edge Softness</span>
              <span className="font-mono text-white">{edgeSoftness}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={edgeSoftness} 
              onChange={(e) => setEdgeSoftness(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>

          <div className="group">
            <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
              <span className="text-[#888]">Spill Suppression</span>
              <span className="font-mono text-white">{spillSuppression}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={spillSuppression} 
              onChange={(e) => setSpillSuppression(Number(e.target.value))}
              className="w-full h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
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
        </div>
      )}
    </>
  );
};
