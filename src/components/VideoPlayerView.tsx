import React, { RefObject } from 'react';
import {
  Upload, Play, Pause, Eye, Activity, ShieldAlert, ShieldCheck
} from 'lucide-react';
import {
  VideoItem, BgMode, MatteToolType, CustomMatteZone, MobileTab
} from '../types';
import { formatTime } from '../utils/formatUtils';
import { VideoQueueVerticalBar } from './VideoQueueVerticalBar';

interface VideoPlayerViewProps {
  mobileTab: MobileTab;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  videoSrc: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hiddenCanvasRef: RefObject<HTMLCanvasElement | null>;
  setDuration: (dur: number) => void;
  drawFrame: () => void;
  isScrubbing: boolean;
  setIsScrubbing: (scrubbing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  isPicking: boolean;
  activeMatteTool: MatteToolType;
  setActiveMatteTool: (tool: MatteToolType) => void;
  bgMode: BgMode;
  setBgMode: (mode: BgMode) => void;
  customBgColor: string;
  setCustomBgColor: (color: string) => void;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerUp: () => void;
  drawingStart: { x: number; y: number } | null;
  drawingCurrent: { x: number; y: number } | null;
  customZones: CustomMatteZone[];
  showVectorContour: boolean;
  setShowVectorContour: (show: boolean) => void;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  videoQueue: VideoItem[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  setVideoQueue: React.Dispatch<React.SetStateAction<VideoItem[]>>;
  isBatchExporting: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  isExporting: boolean;
  exportType: string | null;
  exportFrame: number;
  exportTotalFrames: number;
  batchProgressText: string;
  exportProgress: number;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  mobileTab,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  videoSrc,
  videoRef,
  canvasRef,
  hiddenCanvasRef,
  setDuration,
  drawFrame,
  isScrubbing,
  setIsScrubbing,
  currentTime,
  setCurrentTime,
  duration,
  isPicking,
  activeMatteTool,
  setActiveMatteTool,
  bgMode,
  setBgMode,
  customBgColor,
  setCustomBgColor,
  handleCanvasClick,
  handleCanvasPointerDown,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  drawingStart,
  drawingCurrent,
  customZones,
  showVectorContour,
  setShowVectorContour,
  showOriginal,
  setShowOriginal,
  videoQueue,
  activeIndex,
  setActiveIndex,
  setVideoQueue,
  isBatchExporting,
  handleFileUpload,
  isPlaying,
  togglePlay,
  isExporting,
  exportType,
  exportFrame,
  exportTotalFrames,
  batchProgressText,
  exportProgress
}) => {
  return (
    <section 
      className={`flex-1 bg-[#050505] relative flex items-center justify-center p-2 sm:p-6 md:p-8 overflow-hidden transition-all duration-300 ${
        mobileTab !== 'view' ? 'hidden sm:flex' : 'flex'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm border-2 border-dashed border-white/50 m-4 rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-12 h-12 text-white mb-4 animate-bounce" />
            <span className="text-xl font-bold tracking-widest text-white uppercase">Drop Video Here</span>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      {videoSrc ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
          
          <video 
            ref={videoRef} 
            src={videoSrc} 
            className="hidden" 
            muted 
            playsInline
            crossOrigin="anonymous"
            onLoadedMetadata={() => {
               if (videoRef.current && canvasRef.current) {
                   canvasRef.current.width = videoRef.current.videoWidth;
                   canvasRef.current.height = videoRef.current.videoHeight;
                   setDuration(videoRef.current.duration);
               }
            }}
            onLoadedData={() => drawFrame()}
            onTimeUpdate={() => {
                if (videoRef.current && !isScrubbing) {
                    setCurrentTime(videoRef.current.currentTime);
                }
            }}
            onSeeked={() => drawFrame()}
          />
          
          <canvas ref={hiddenCanvasRef} className="hidden" />

          {/* Canvas Container */}
          <div 
            className={`relative w-full h-full border border-[#222] shadow-2xl flex items-center justify-center overflow-hidden transition-all ${isPicking ? 'cursor-crosshair ring-1 ring-white' : activeMatteTool !== 'none' ? 'cursor-crosshair ring-1 ring-emerald-400' : ''}`}
            style={
              bgMode === 'black' ? { backgroundColor: '#000000' } :
              bgMode === 'white' ? { backgroundColor: '#FFFFFF' } :
              bgMode === 'custom' ? { backgroundColor: customBgColor } :
              { backgroundImage: 'conic-gradient(#111 0.25turn, #181818 0.25turn 0.5turn, #111 0.5turn 0.75turn, #181818 0.75turn)', backgroundSize: '40px 40px' }
            }
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          >
            <canvas 
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-w-full max-h-full object-contain pointer-events-auto select-none"
            />

            {/* Drawing & Custom Zones Overlay Layer */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-full h-full max-w-full max-h-full">
                {/* Render live drawing box */}
                {drawingStart && drawingCurrent && (
                  <div 
                    className={`absolute border-2 ${activeMatteTool === 'remove_rect' ? 'border-red-500 bg-red-500/20' : 'border-emerald-400 bg-emerald-400/20'} rounded-sm z-30 transition-none`}
                    style={{
                      left: `${Math.min(drawingStart.x, drawingCurrent.x) * 100}%`,
                      top: `${Math.min(drawingStart.y, drawingCurrent.y) * 100}%`,
                      width: `${Math.abs(drawingCurrent.x - drawingStart.x) * 100}%`,
                      height: `${Math.abs(drawingCurrent.y - drawingStart.y) * 100}%`
                    }}
                  >
                    <span className={`absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-white rounded ${activeMatteTool === 'remove_rect' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                      {activeMatteTool === 'remove_rect' ? 'Ép Xóa (Garbage)' : 'Ép Giữ (Holdout)'}
                    </span>
                  </div>
                )}

                {/* Active Zones Indicators when drawing or managing */}
                {activeMatteTool !== 'none' && customZones.map((zone) => {
                  if (zone.shape === 'rect' && zone.points.length >= 2) {
                    const minX = Math.min(zone.points[0].x, zone.points[1].x) * 100;
                    const minY = Math.min(zone.points[0].y, zone.points[1].y) * 100;
                    const width = Math.abs(zone.points[1].x - zone.points[0].x) * 100;
                    const height = Math.abs(zone.points[1].y - zone.points[0].y) * 100;
                    return (
                      <div 
                        key={zone.id}
                        className={`absolute border border-dashed ${zone.type === 'remove' ? 'border-red-400/70 bg-red-500/10' : 'border-emerald-400/70 bg-emerald-500/10'} rounded-sm z-20`}
                        style={{ left: `${minX}%`, top: `${minY}%`, width: `${width}%`, height: `${height}%` }}
                      >
                        <span className={`text-[7px] font-mono px-1 py-0.2 rounded absolute -top-3 left-0 ${zone.type === 'remove' ? 'bg-red-900/80 text-red-200' : 'bg-emerald-900/80 text-emerald-200'}`}>
                          {zone.type === 'remove' ? 'Cut Zone' : 'Keep Zone'}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Top Center Quick Matte Toolbar - Responsive */}
            <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap max-w-[95%] items-center justify-center gap-1 sm:gap-1.5 bg-black/80 backdrop-blur-md border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xl">
              {/* Vector Contour Glow Toggle */}
              <button 
                onClick={(e) => { e.stopPropagation(); setShowVectorContour(!showVectorContour); }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-[8px] sm:text-[9px] uppercase tracking-wider font-mono rounded-full transition-all ${showVectorContour ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'text-[#888] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-transparent'}`}
                title="Hiển thị đường viền vector contour phát sáng (Zero lag)"
              >
                <Activity className={`w-3 h-3 ${showVectorContour ? 'animate-pulse text-cyan-400' : ''}`} />
                <span className="hidden xs:inline">Vector</span> Glow
              </button>

              <div className="w-[1px] h-3 bg-white/20 mx-0.5 sm:mx-1" />

              {/* Garbage Matte (Cut) */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveMatteTool(activeMatteTool === 'remove_rect' ? 'none' : 'remove_rect'); 
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-[8px] sm:text-[9px] uppercase tracking-wider font-mono rounded-full transition-all ${activeMatteTool === 'remove_rect' ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] font-bold' : 'text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30'}`}
                title="Vẽ vùng hình chữ nhật để ép xóa triệt để (Garbage Matte)"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>+ Xóa</span>
              </button>

              {/* Holdout Matte (Keep) */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveMatteTool(activeMatteTool === 'keep_rect' ? 'none' : 'keep_rect'); 
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-[8px] sm:text-[9px] uppercase tracking-wider font-mono rounded-full transition-all ${activeMatteTool === 'keep_rect' ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)] font-bold' : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30'}`}
                title="Vẽ vùng hình chữ nhật để ép giữ lại không bị lẹm/xâm lấn (Holdout Matte)"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>+ Giữ</span>
              </button>

              {customZones.length > 0 && (
                <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 text-[8px] font-mono text-white/70 bg-white/10 rounded-full">
                  {customZones.length}
                </span>
              )}
            </div>

            {/* Drawing Helper Prompt */}
            {activeMatteTool !== 'none' && (
              <div className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 bg-black/90 backdrop-blur-md border border-emerald-500/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl animate-fade-in max-w-[90%] text-center">
                <span className="text-[9px] sm:text-[10px] text-white">
                  👉 <b>Kéo thả</b> trên video để tạo vùng {activeMatteTool === 'remove_rect' ? 'Ép Xóa' : 'Ép Giữ'}
                </span>
                <button 
                  onClick={() => setActiveMatteTool('none')}
                  className="px-2 py-0.5 text-[8px] sm:text-[9px] font-mono uppercase bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors shrink-0"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Top Left BG Controls Overlay */}
            <div className="absolute top-3 sm:top-6 left-3 sm:left-6 z-20 flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#888]">BG:</span>
              <div className="flex gap-1.5 sm:gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setBgMode('transparent'); }} 
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden border ${bgMode === 'transparent' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'} transition-all`}
                  title="Transparent (Checkerboard)"
                >
                  <div className="w-full h-full" style={{ backgroundImage: 'conic-gradient(#555 0.25turn, #888 0.25turn 0.5turn, #555 0.5turn 0.75turn, #888 0.75turn)', backgroundSize: '6px 6px' }}></div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setBgMode('black'); }} 
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black border ${bgMode === 'black' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#444] opacity-50 hover:opacity-100'} transition-all`}
                  title="Solid Black"
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); setBgMode('white'); }} 
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border ${bgMode === 'white' ? 'border-[#10B981] ring-1 ring-[#10B981] scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'} transition-all`}
                  title="Solid White"
                />
                <div className="relative flex items-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setBgMode('custom'); }} 
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border ${bgMode === 'custom' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#444] opacity-50 hover:opacity-100'} transition-all`}
                    style={{ backgroundColor: customBgColor }}
                    title="Custom Color Matte"
                  />
                  <input 
                    type="color" 
                    value={customBgColor}
                    onChange={(e) => {
                      setCustomBgColor(e.target.value);
                      setBgMode('custom');
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Select Color Matte"
                  />
                </div>
              </div>
            </div>

            {/* Top Controls Overlay */}
            <div className="absolute top-3 sm:top-6 right-3 sm:right-6 z-20 flex gap-1.5 sm:gap-3">
              <button 
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[8px] sm:text-[9px] uppercase tracking-widest text-[#888] hover:text-white hover:border-white/30 transition-colors rounded-full"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden xs:inline">Original</span>
              </button>

              <label className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[8px] sm:text-[9px] uppercase tracking-widest text-[#888] hover:text-white hover:border-white/30 transition-colors rounded-full cursor-pointer">
                <Upload className="w-3 h-3" />
                <span className="hidden xs:inline">{videoQueue.length > 0 ? 'Replace' : 'Upload'}</span>
                <input type="file" accept="video/*" multiple className="hidden" onClick={(e) => { (e.target as HTMLInputElement).value = '' }} onChange={handleFileUpload} />
              </label>
            </div>

            {/* Left Vertical Video Queue Bar */}
            <VideoQueueVerticalBar
              videoQueue={videoQueue}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              setVideoQueue={setVideoQueue}
              handleFileUpload={handleFileUpload}
              isBatchExporting={isBatchExporting}
            />
            
            {/* Playback Overlay */}
            {!isPlaying && !isExporting && !isScrubbing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors pointer-events-none">
                 <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto bg-white hover:bg-gray-200 text-black p-4 rounded-full transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <Play className="w-6 h-6 ml-1" />
                 </button>
              </div>
            )}

            {/* Export Progress Overlay */}
            {(isExporting || isBatchExporting) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
                <div className="border border-[#333] p-8 w-80 text-center bg-[#0A0A0B]">
                   <h3 className="text-[10px] uppercase tracking-widest text-white mb-4">
                     {isBatchExporting ? `Batch Exporting ${exportType}` : `Exporting ${exportType}`}
                     {exportType === 'GIF' && ` (${exportFrame}/${exportTotalFrames} F)`}
                   </h3>
                   {isBatchExporting && (
                     <div className="text-[9px] text-[#888] font-mono mb-4">{batchProgressText}</div>
                   )}
                   <div className="w-full bg-[#222] h-[2px] mb-4 relative">
                     <div 
                       className="bg-white h-full transition-all duration-300 ease-out absolute top-0 left-0" 
                       style={{ width: `${Math.min(100, exportProgress)}%` }}
                     />
                   </div>
                   <p className="text-[10px] font-mono tracking-widest text-[#888]">{Math.round(exportProgress)}%</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 flex items-center gap-2 sm:gap-3 bg-black/80 px-2.5 sm:px-3 py-1 sm:py-2 border border-white/10 backdrop-blur-md rounded-md">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[8px] sm:text-[10px] font-mono tracking-tighter">
                {showOriginal || isPicking ? 'ORIGINAL' : 'PREVIEW'}
              </span>
            </div>
          </div>

          {/* Playback Controls Footer (Floating) - Responsive */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-[#0A0A0B]/95 backdrop-blur-md border border-[#333] px-3 sm:px-6 py-2 sm:py-3 transition-all z-20 w-[95%] sm:w-[90%] max-w-2xl rounded-full shadow-2xl">
             <button onClick={togglePlay} className="text-[#888] hover:text-white transition-colors flex-shrink-0 p-1">
                {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
             </button>
             
             <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                step="0.01"
                value={currentTime}
                onMouseDown={() => setIsScrubbing(true)}
                onMouseUp={() => setIsScrubbing(false)}
                onChange={(e) => {
                    const time = Number(e.target.value);
                    setCurrentTime(time);
                    if (videoRef.current) {
                       videoRef.current.currentTime = time;
                    }
                }}
                className="flex-1 h-[2px] bg-[#222] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
             />
             
             <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#666] w-16 sm:w-24 flex flex-col items-end justify-center flex-shrink-0">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-[7px] sm:text-[8px] opacity-60 hidden xs:inline">{Math.floor(currentTime * 30)} F</span>
             </span>
          </div>
        </div>
      ) : (
        <div className="z-10 flex flex-col items-center justify-center">
           <label className="flex flex-col items-center justify-center w-80 h-48 border border-[#333] cursor-pointer bg-[#0F0F11] hover:border-white transition-colors">
             <div className="flex flex-col items-center justify-center pt-5 pb-6">
               <Upload className="w-6 h-6 text-[#666] mb-4" />
               <span className="text-[10px] font-bold tracking-widest text-white uppercase">Upload Video</span>
               <span className="text-[9px] uppercase tracking-widest text-[#666] mt-2">MP4 / WEBM</span>
             </div>
             <input type="file" accept="video/*" multiple className="hidden" onClick={(e) => { (e.target as HTMLInputElement).value = '' }} onChange={handleFileUpload} />
           </label>
        </div>
      )}
    </section>
  );
};
