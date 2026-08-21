/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Pause, Download, Pipette, Trash2, Video, FileVideo, Crosshair, AlertCircle, Eye } from 'lucide-react';
import { RGBColor } from './types';
import { applyChromaKey } from './lib/chromaKey';
import { applyPaletteDithered } from './lib/dither';
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export default function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetColors, setTargetColors] = useState<RGBColor[]>([]);
  const [similarity, setSimilarity] = useState(40);
  const [colorBlend, setColorBlend] = useState(20);
  const [shadingTolerance, setShadingTolerance] = useState(50);
  const [contiguous, setContiguous] = useState(true);
  const [spillSuppression, setSpillSuppression] = useState(50);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [edgeShift, setEdgeShift] = useState(0);
  const [edgeSoftness, setEdgeSoftness] = useState(0);
  const [useDithering, setUseDithering] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  
  // New States for Timeline and Preview
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [bgMode, setBgMode] = useState<'transparent' | 'black' | 'white' | 'custom'>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#00ff00');
  const [aspectRatio, setAspectRatio] = useState<'original' | '1:1' | '9:16' | '16:9'>('original');
  const [isDragging, setIsDragging] = useState(false);
  const [gifFps, setGifFps] = useState(12);
  const [gifFrameLimit, setGifFrameLimit] = useState(100);
  const [exportFrame, setExportFrame] = useState(0);
  const [exportTotalFrames, setExportTotalFrames] = useState(0);
  const [isGifLooping, setIsGifLooping] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chromaKeySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.targetColors) setTargetColors(parsed.targetColors);
        if (parsed.similarity !== undefined) setSimilarity(parsed.similarity);
        if (parsed.colorBlend !== undefined) setColorBlend(parsed.colorBlend);
        if (parsed.shadingTolerance !== undefined) setShadingTolerance(parsed.shadingTolerance);
        if (parsed.contiguous !== undefined) setContiguous(parsed.contiguous);
        if (parsed.spillSuppression !== undefined) setSpillSuppression(parsed.spillSuppression);
        if (parsed.strokeWidth !== undefined) setStrokeWidth(parsed.strokeWidth);
        if (parsed.strokeColor !== undefined) setStrokeColor(parsed.strokeColor);
        if (parsed.edgeShift !== undefined) setEdgeShift(parsed.edgeShift);
        if (parsed.edgeSoftness !== undefined) setEdgeSoftness(parsed.edgeSoftness);
        if (parsed.useDithering !== undefined) setUseDithering(parsed.useDithering);
        if (parsed.bgMode !== undefined) setBgMode(parsed.bgMode);
        if (parsed.customBgColor !== undefined) setCustomBgColor(parsed.customBgColor);
        if (parsed.aspectRatio !== undefined) setAspectRatio(parsed.aspectRatio);
        if (parsed.gifFps !== undefined) setGifFps(parsed.gifFps);
        if (parsed.gifFrameLimit !== undefined) setGifFrameLimit(parsed.gifFrameLimit);
        if (parsed.isGifLooping !== undefined) setIsGifLooping(parsed.isGifLooping);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    const settings = {
      targetColors, similarity, colorBlend, shadingTolerance, contiguous, spillSuppression,
      strokeWidth, strokeColor, edgeShift, edgeSoftness, useDithering, bgMode, customBgColor, aspectRatio,
      gifFps, gifFrameLimit, isGifLooping
    };
    localStorage.setItem('chromaKeySettings', JSON.stringify(settings));
  }, [targetColors, similarity, colorBlend, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor, edgeShift, edgeSoftness, useDithering, bgMode, customBgColor, aspectRatio, gifFps, gifFrameLimit, isGifLooping]);

  const getCropDimensions = (videoWidth: number, videoHeight: number, ratio: string) => {
    let targetRatio = videoWidth / videoHeight;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '9:16') targetRatio = 9 / 16;
    else if (ratio === '16:9') targetRatio = 16 / 9;

    let cropWidth = videoWidth;
    let cropHeight = videoHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (ratio !== 'original') {
      const currentRatio = videoWidth / videoHeight;
      if (currentRatio > targetRatio) {
        // Video is wider than target, crop sides
        cropWidth = videoHeight * targetRatio;
        offsetX = (videoWidth - cropWidth) / 2;
      } else {
        // Video is taller than target, crop top/bottom
        cropHeight = videoWidth / targetRatio;
        offsetY = (videoHeight - cropHeight) / 2;
      }
    }

    return {
      sx: offsetX,
      sy: offsetY,
      sw: cropWidth,
      sh: cropHeight,
      dw: cropWidth,
      dh: cropHeight
    };
  };
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00.00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    if (!video || !canvas || !hiddenCanvas || isExporting) return;
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      // 1. Setup hidden canvas to full video size
      if (hiddenCanvas.width !== video.videoWidth || hiddenCanvas.height !== video.videoHeight) {
        hiddenCanvas.width = video.videoWidth;
        hiddenCanvas.height = video.videoHeight;
      }
      
      const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
      if (!hiddenCtx) return;

      // 2. Draw full video to hidden canvas
      hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
      
      // 3. Apply Chroma Key to the FULL uncropped image (so edge detection/contiguous fill works perfectly)
      if (!isPicking && !showOriginal) {
        applyChromaKey(hiddenCtx, hiddenCanvas, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor);
      }

      // 4. Calculate crop dimensions
      const dims = getCropDimensions(video.videoWidth, video.videoHeight, aspectRatio);
      if (canvas.width !== Math.floor(dims.dw) || canvas.height !== Math.floor(dims.dh)) {
        canvas.width = Math.floor(dims.dw);
        canvas.height = Math.floor(dims.dh);
      }

      // 5. Draw the CROPPED result from the hidden canvas to the visible canvas
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(hiddenCanvas, dims.sx, dims.sy, dims.sw, dims.sh, 0, 0, canvas.width, canvas.height);
      }
    }
  }, [isExporting, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor, isPicking, showOriginal, aspectRatio]);

  // Handle continuous playback loop
  useEffect(() => {
    let req: number;
    const loop = () => {
      if (isPlaying && !isExporting) {
        drawFrame();
        req = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) {
      req = requestAnimationFrame(loop);
    }
    return () => {
      if (req) cancelAnimationFrame(req);
    };
  }, [isPlaying, isExporting, drawFrame]);

  // Force draw immediately when paused and parameters change
  useEffect(() => {
    if (!isPlaying && !isExporting && videoSrc) {
      drawFrame();
    }
  }, [drawFrame, isPlaying, isExporting, videoSrc]);

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('video/')) return;
    
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPicking || !videoRef.current || !canvasRef.current || !hiddenCanvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    const hiddenCanvas = hiddenCanvasRef.current;
    const hCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    if (!hCtx) return;
    
    hiddenCanvas.width = videoRef.current.videoWidth;
    hiddenCanvas.height = videoRef.current.videoHeight;
    hCtx.drawImage(videoRef.current, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    const pixel = hCtx.getImageData(x, y, 1, 1).data;
    const newColor: RGBColor = { r: pixel[0], g: pixel[1], b: pixel[2], x, y };
    
    const isDuplicate = targetColors.some(c => 
      Math.abs(c.r - newColor.r) < 5 && 
      Math.abs(c.g - newColor.g) < 5 && 
      Math.abs(c.b - newColor.b) < 5 &&
      c.x === newColor.x &&
      c.y === newColor.y
    );

    if (!isDuplicate) {
      setTargetColors(prev => [...prev, newColor]);
    }
    setIsPicking(false);
  };

  const handleExportWebM = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    setIsExporting(true);
    setExportType('WebM');
    setExportProgress(0);
    setIsPlaying(false);
    video.pause();
    video.currentTime = 0;
    
    const dims = getCropDimensions(video.videoWidth, video.videoHeight, aspectRatio);
    canvas.width = Math.floor(dims.dw);
    canvas.height = Math.floor(dims.dh);
    
    const stream = canvas.captureStream(30); 
    let options = { mimeType: 'video/webm; codecs=vp8' };
    let mediaRecorder: MediaRecorder;
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
    }
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chroma-key-export.webm';
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportType(null);
      setExportProgress(0);
      video.currentTime = currentTime; // Restore time
    };
    
    mediaRecorder.start();
    video.play();
    
    const exportLoop = () => {
      if (video.currentTime >= video.duration || video.ended) {
        mediaRecorder.stop();
        video.pause();
        return;
      }
      
      const hiddenCanvas = hiddenCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && hiddenCanvas) {
        if (hiddenCanvas.width !== video.videoWidth || hiddenCanvas.height !== video.videoHeight) {
          hiddenCanvas.width = video.videoWidth;
          hiddenCanvas.height = video.videoHeight;
        }
        
        const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
        if (hiddenCtx) {
          hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
          hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
          applyChromaKey(hiddenCtx, hiddenCanvas, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(hiddenCanvas, dims.sx, dims.sy, dims.sw, dims.sh, 0, 0, canvas.width, canvas.height);
        }
      }
      
      setExportProgress((video.currentTime / video.duration) * 100);
      requestAnimationFrame(exportLoop);
    };
    
    exportLoop();
  };

  const handleExportGIF = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.duration === Infinity) return;

    setIsExporting(true);
    setExportType('GIF');
    setExportProgress(0);
    setIsPlaying(false);
    video.pause();
    video.currentTime = 0;

    const dims = getCropDimensions(video.videoWidth, video.videoHeight, aspectRatio);
    const maxGifWidth = 600;
    const scale = dims.dw > maxGifWidth ? maxGifWidth / dims.dw : 1;
    canvas.width = Math.floor(dims.dw * scale);
    canvas.height = Math.floor(dims.dh * scale);

    const gif = new GIFEncoder();
    const fps = gifFps || 12; 
    const delay = 1000 / fps;
    const maxDur = gifFrameLimit > 0 ? Math.min(video.duration, gifFrameLimit / fps) : video.duration;
    const dur = maxDur || 0;
    const totalFrames = Math.floor(dur * fps) + 1;
    
    setExportTotalFrames(totalFrames);
    setExportFrame(0);
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let frameCount = 0;
    for (let t = 0; t <= dur; t += 1/fps) {
      if (gifFrameLimit > 0 && frameCount >= gifFrameLimit) break;
      
      setExportFrame(frameCount + 1);
      video.currentTime = t;
      await new Promise(r => {
        const onSeek = () => { video.removeEventListener('seeked', onSeek); r(null); };
        video.addEventListener('seeked', onSeek);
        setTimeout(() => { video.removeEventListener('seeked', onSeek); r(null); }, 500);
      });

      const hiddenCanvas = hiddenCanvasRef.current;
      if (ctx && hiddenCanvas) {
        if (hiddenCanvas.width !== video.videoWidth || hiddenCanvas.height !== video.videoHeight) {
          hiddenCanvas.width = video.videoWidth;
          hiddenCanvas.height = video.videoHeight;
        }

        const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
        if (hiddenCtx) {
          hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
          hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
          applyChromaKey(hiddenCtx, hiddenCanvas, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(hiddenCanvas, dims.sx, dims.sy, dims.sw, dims.sh, 0, 0, canvas.width, canvas.height);
        }
        
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
        
        let index;
        if (useDithering) {
          index = applyPaletteDithered(data, width, height, palette);
        } else {
          index = applyPalette(data, palette, 'rgba4444');
        }
        
        gif.writeFrame(index, width, height, { palette, transparent: true, delay, repeat: isGifLooping ? 0 : -1 });
      }
      
      frameCount++;
      setExportProgress((frameCount / totalFrames) * 100);
    }
    
    gif.finish();
    const buffer = gif.bytes();
    const blob = new Blob([buffer], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chroma-key-export.gif';
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
    setExportType(null);
    setExportProgress(0);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    video.currentTime = currentTime; // Restore time
  };

  const removeColor = (idx: number) => {
    setTargetColors(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans flex flex-col overflow-hidden">
      <header className="h-16 border-b border-[#222] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-serif italic text-xl tracking-tight">Chroma.</span>
          <div className="h-4 w-[1px] bg-[#333]"></div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#888] font-bold">Key Extraction / Studio</span>
        </div>
        <div className="flex items-center gap-6">
          {videoSrc && (
            <span className="text-[11px] uppercase tracking-widest text-[#666]">
              {isPlaying ? 'PLAYING' : 'PAUSED'}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Main Preview Area */}
        <section 
          className="flex-1 bg-[#050505] relative flex items-center justify-center p-12 overflow-hidden"
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
                className={`relative w-full h-full border border-[#222] shadow-2xl flex items-center justify-center overflow-hidden transition-all ${isPicking ? 'cursor-crosshair ring-1 ring-white' : ''}`}
                style={
                  bgMode === 'black' ? { backgroundColor: '#000000' } :
                  bgMode === 'white' ? { backgroundColor: '#FFFFFF' } :
                  bgMode === 'custom' ? { backgroundColor: customBgColor } :
                  { backgroundImage: 'conic-gradient(#111 0.25turn, #181818 0.25turn 0.5turn, #111 0.5turn 0.75turn, #181818 0.75turn)', backgroundSize: '40px 40px' }
                }
              >
                <canvas 
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="max-w-full max-h-full object-contain"
                />

                {/* Top Left BG Controls Overlay */}
                <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                  <span className="text-[9px] uppercase tracking-widest text-[#888]">BG:</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setBgMode('transparent'); }} 
                      className={`w-4 h-4 rounded-full overflow-hidden border ${bgMode === 'transparent' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'} transition-all`}
                      title="Transparent (Checkerboard)"
                    >
                      <div className="w-full h-full" style={{ backgroundImage: 'conic-gradient(#555 0.25turn, #888 0.25turn 0.5turn, #555 0.5turn 0.75turn, #888 0.75turn)', backgroundSize: '6px 6px' }}></div>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setBgMode('black'); }} 
                      className={`w-4 h-4 rounded-full bg-black border ${bgMode === 'black' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#444] opacity-50 hover:opacity-100'} transition-all`}
                      title="Solid Black"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setBgMode('white'); }} 
                      className={`w-4 h-4 rounded-full bg-white border ${bgMode === 'white' ? 'border-[#10B981] ring-1 ring-[#10B981] scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'} transition-all`}
                      title="Solid White"
                    />
                    <div className="relative flex items-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setBgMode('custom'); }} 
                        className={`w-4 h-4 rounded-full border ${bgMode === 'custom' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#444] opacity-50 hover:opacity-100'} transition-all`}
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
                <div className="absolute top-6 right-6 z-20 flex gap-3">
                  <button 
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-widest text-[#888] hover:text-white hover:border-white/30 transition-colors rounded-full"
                  >
                    <Eye className="w-3 h-3" />
                    Hold Original
                  </button>

                  <label className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-widest text-[#888] hover:text-white hover:border-white/30 transition-colors rounded-full cursor-pointer">
                    <Upload className="w-3 h-3" />
                    New Video
                    <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                
                {/* Playback Overlay */}
                {!isPlaying && !isExporting && !isScrubbing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors pointer-events-none">
                     <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto bg-white hover:bg-gray-200 text-black p-4 rounded-full transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        <Play className="w-6 h-6 ml-1" />
                     </button>
                  </div>
                )}

                {/* Export Progress Overlay */}
                {isExporting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
                    <div className="border border-[#333] p-8 w-80 text-center bg-[#0A0A0B]">
                       <h3 className="text-[10px] uppercase tracking-widest text-white mb-4">
                         Exporting {exportType}
                         {exportType === 'GIF' && ` (${exportFrame}/${exportTotalFrames} F)`}
                       </h3>
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

                <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/80 px-3 py-2 border border-white/10 backdrop-blur-md">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] font-mono tracking-tighter">
                    {showOriginal || isPicking ? 'ORIGINAL SOURCE' : 'LIVE PREVIEW'}
                  </span>
                </div>
              </div>

              {/* Playback Controls Footer (Floating) */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0A0A0B]/90 backdrop-blur-md border border-[#333] px-6 py-3 transition-all z-20 w-[90%] max-w-2xl rounded-full shadow-2xl">
                 <button onClick={togglePlay} className="text-[#888] hover:text-white transition-colors flex-shrink-0">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
                 
                 <span className="text-[10px] font-mono tracking-widest text-[#666] w-24 flex flex-col items-end justify-center flex-shrink-0">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-[8px] opacity-60">{Math.floor(currentTime * 30)} F</span>
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
                 <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          )}
        </section>

        {/* Right Sidebar Controls */}
        <aside className="w-[320px] border-l border-[#222] bg-[#0A0A0B] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-8 border-b border-[#222]">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="font-serif italic text-2xl mb-1 text-white">Extraction</h2>
                  <p className="text-[11px] text-[#666] uppercase tracking-widest">Parameters</p>
                </div>
                <button
                  onClick={() => {
                    setTargetColors([]);
                    setSimilarity(40);
                    setColorBlend(20);
                    setShadingTolerance(50);
                    setContiguous(true);
                    setSpillSuppression(50);
                    setStrokeWidth(0);
                    setStrokeColor('#ffffff');
                    setEdgeShift(0);
                    setEdgeSoftness(0);
                  }}
                  className="text-[9px] uppercase tracking-widest text-[#666] hover:text-white transition-colors underline decoration-[#333] underline-offset-4"
                >
                  Reset
                </button>
              </div>
              
              <div className="space-y-8">
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
            </div>
          </div>

          <div className="p-8 mt-auto bg-[#0F0F11]">
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
                disabled={!videoSrc || isExporting}
                className="p-4 border border-white hover:bg-white hover:text-black flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-30 disabled:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#E0E0E0]"
              >
                <span className="text-[10px] font-bold tracking-widest">WEBM</span>
                <span className="text-[8px] opacity-60">TRANSPARENT</span>
              </button>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleExportGIF}
                  disabled={!videoSrc || isExporting}
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
            
            <p className="mt-6 text-[9px] leading-relaxed text-[#555] font-serif italic">
               Hardware acceleration enabled. Real-time extraction with live preview.
            </p>
          </div>
        </aside>
      </main>

      <footer className="h-12 border-t border-[#222] flex items-center px-8 justify-between bg-[#050505] shrink-0">
        <div className="flex gap-8">
          <span className="text-[9px] uppercase tracking-widest text-[#444]">Project: Alpha_Extract</span>
          {videoSrc && (
            <span className="text-[9px] uppercase tracking-widest text-[#444]">
              Status: {isExporting ? 'Exporting' : isPlaying ? 'Playing' : 'Ready'} | {formatTime(currentTime)}
            </span>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-24 h-1 bg-[#222] overflow-hidden">
            <div className="h-full bg-[#10B981] w-[45%]"></div>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-[#444]">Memory: Nominal</span>
        </div>
      </footer>
    </div>
  );
}

