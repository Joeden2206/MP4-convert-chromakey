/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RGBColor, CustomMatteZone, VideoItem, ExtractionMode,
  BgMode, AspectRatioType, MatteToolType, MobileTab,
  OutputSizeMode, OutputFitMode
} from './types';
import { applyChromaKey } from './lib/chromaKey';
import { applyAiMatting, preloadAiSegmenter, AiMattingStatus } from './lib/aiMatting';
import { applyPaletteDithered } from './lib/dither';
import { applyCustomMatteZones } from './lib/vectorContour';
import { getCropDimensions } from './utils/cropUtils';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { VideoPlayerView } from './components/VideoPlayerView';
import { Sidebar } from './components/Sidebar/Sidebar';
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export default function App() {
  const [videoQueue, setVideoQueue] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('chroma');
  
  // AI Matting states
  const [aiThreshold, setAiThreshold] = useState(50);
  const [aiEdgeShift, setAiEdgeShift] = useState(-1.5);
  const [aiSmoothness, setAiSmoothness] = useState(2.0);
  const [aiFeather, setAiFeather] = useState(1.0);
  const [aiDefringe, setAiDefringe] = useState(40);
  const [aiInvert, setAiInvert] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiMattingStatus>('idle');
  const [aiError, setAiError] = useState<string | null>(null);

  // Vector Contour & Custom Zones
  const [showVectorContour, setShowVectorContour] = useState(false);
  const [vectorContourColor, setVectorContourColor] = useState('#00f0ff');
  const [vectorCurveSmoothness, setVectorCurveSmoothness] = useState(0.38); // Bézier Tangent Tension
  const [cornerThreshold, setCornerThreshold] = useState(55); // Sharp corner threshold in degrees
  const [useVectorMask, setUseVectorMask] = useState(false);
  const [customZones, setCustomZones] = useState<CustomMatteZone[]>([]);
  const [activeMatteTool, setActiveMatteTool] = useState<MatteToolType>('none');
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; y: number } | null>(null);

  // Chroma Key states
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

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Timeline and Preview
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#00ff00');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original');
  const [outputSizeMode, setOutputSizeMode] = useState<OutputSizeMode>('original');
  const [outputScale, setOutputScale] = useState(1.0);
  const [customWidth, setCustomWidth] = useState(0);
  const [customHeight, setCustomHeight] = useState(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [outputFitMode, setOutputFitMode] = useState<OutputFitMode>('contain');
  const [isDragging, setIsDragging] = useState(false);
  const [gifFps, setGifFps] = useState(12);
  const [gifFrameLimit, setGifFrameLimit] = useState(100);
  const [exportFrame, setExportFrame] = useState(0);
  const [exportTotalFrames, setExportTotalFrames] = useState(0);
  const [isGifLooping, setIsGifLooping] = useState(true);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState('');
  
  // Responsive Layout States
  const [mobileTab, setMobileTab] = useState<MobileTab>('view');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const videoSrc = videoQueue[activeIndex]?.url || null;
  const originalFileName = videoQueue[activeIndex]?.name || 'export';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Preload AI model when AI extraction mode is active
  useEffect(() => {
    if (extractionMode === 'ai') {
      preloadAiSegmenter((status, err) => {
        setAiStatus(status);
        if (err) setAiError(err);
      }).catch(err => {
        setAiStatus('error');
        setAiError(err?.message || 'Error loading AI model');
      });
    }
  }, [extractionMode]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chromaKeySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.extractionMode) setExtractionMode(parsed.extractionMode);
        if (parsed.aiThreshold !== undefined) setAiThreshold(parsed.aiThreshold);
        if (parsed.aiEdgeShift !== undefined) setAiEdgeShift(parsed.aiEdgeShift);
        if (parsed.aiSmoothness !== undefined) setAiSmoothness(parsed.aiSmoothness);
        if (parsed.aiFeather !== undefined) setAiFeather(parsed.aiFeather);
        if (parsed.aiDefringe !== undefined) setAiDefringe(parsed.aiDefringe);
        if (parsed.aiInvert !== undefined) setAiInvert(parsed.aiInvert);
        if (parsed.showVectorContour !== undefined) setShowVectorContour(parsed.showVectorContour);
        if (parsed.vectorContourColor !== undefined) setVectorContourColor(parsed.vectorContourColor);
        if (parsed.vectorCurveSmoothness !== undefined) setVectorCurveSmoothness(parsed.vectorCurveSmoothness);
        if (parsed.cornerThreshold !== undefined) setCornerThreshold(parsed.cornerThreshold);
        if (parsed.useVectorMask !== undefined) setUseVectorMask(parsed.useVectorMask);
        if (parsed.customZones !== undefined) setCustomZones(parsed.customZones);
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
        if (parsed.outputSizeMode !== undefined) setOutputSizeMode(parsed.outputSizeMode);
        if (parsed.outputScale !== undefined) setOutputScale(parsed.outputScale);
        if (parsed.customWidth !== undefined) setCustomWidth(parsed.customWidth);
        if (parsed.customHeight !== undefined) setCustomHeight(parsed.customHeight);
        if (parsed.lockAspectRatio !== undefined) setLockAspectRatio(parsed.lockAspectRatio);
        if (parsed.outputFitMode !== undefined) setOutputFitMode(parsed.outputFitMode);
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
      extractionMode, aiThreshold, aiEdgeShift, aiSmoothness, aiFeather, aiDefringe, aiInvert,
      showVectorContour, vectorContourColor, vectorCurveSmoothness, cornerThreshold, useVectorMask, customZones,
      targetColors, similarity, colorBlend, shadingTolerance, contiguous, spillSuppression,
      strokeWidth, strokeColor, edgeShift, edgeSoftness, useDithering, bgMode, customBgColor, aspectRatio,
      outputSizeMode, outputScale, customWidth, customHeight, lockAspectRatio, outputFitMode,
      gifFps, gifFrameLimit, isGifLooping
    };
    localStorage.setItem('chromaKeySettings', JSON.stringify(settings));
  }, [
    extractionMode, aiThreshold, aiEdgeShift, aiSmoothness, aiFeather, aiDefringe, aiInvert,
    showVectorContour, vectorContourColor, vectorCurveSmoothness, cornerThreshold, useVectorMask, customZones,
    targetColors, similarity, colorBlend, shadingTolerance, contiguous, spillSuppression,
    strokeWidth, strokeColor, edgeShift, edgeSoftness, useDithering, bgMode, customBgColor, aspectRatio,
    outputSizeMode, outputScale, customWidth, customHeight, lockAspectRatio, outputFitMode,
    gifFps, gifFrameLimit, isGifLooping
  ]);

  const drawFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    if (!video || !canvas || !hiddenCanvas || isExporting) return;
    if (isDrawingRef.current) return;
    if (video.readyState < 2) return;
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      isDrawingRef.current = true;
      try {
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
        
        // 3. Apply Extraction (AI Auto-Matte or Chroma Key)
        if (!isPicking && !showOriginal) {
          if (extractionMode === 'ai') {
            await applyAiMatting(hiddenCtx, hiddenCanvas, {
              threshold: aiThreshold,
              edgeShift: aiEdgeShift,
              smoothness: aiSmoothness,
              feather: aiFeather,
              defringe: aiDefringe,
              invert: aiInvert,
              strokeWidth,
              strokeColor,
              showVectorContour,
              vectorContourColor,
              vectorCurveSmoothness,
              cornerThreshold,
              useVectorMask,
              customZones,
              originalSource: video
            });
          } else {
            applyChromaKey(
              hiddenCtx,
              hiddenCanvas,
              targetColors,
              similarity,
              colorBlend,
              edgeShift,
              edgeSoftness,
              shadingTolerance,
              contiguous,
              spillSuppression,
              strokeWidth,
              strokeColor
            );
            if (customZones.length > 0) {
              applyCustomMatteZones(hiddenCtx, video, customZones, hiddenCanvas.width, hiddenCanvas.height);
            }
          }
        }

        // 4. Calculate crop dimensions & output scale
        const dims = getCropDimensions(
          video.videoWidth,
          video.videoHeight,
          aspectRatio,
          outputSizeMode,
          outputScale,
          customWidth,
          customHeight,
          outputFitMode
        );

        if (canvas.width !== Math.floor(dims.outW) || canvas.height !== Math.floor(dims.outH)) {
          canvas.width = Math.floor(dims.outW);
          canvas.height = Math.floor(dims.outH);
        }

        // 5. Draw the CROPPED & SCALED result from the hidden canvas to the visible canvas
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            hiddenCanvas,
            dims.sx, dims.sy, dims.sw, dims.sh,
            dims.dx, dims.dy, dims.dw, dims.dh
          );
        }
      } catch (err) {
        console.error('Frame render error:', err);
      } finally {
        isDrawingRef.current = false;
      }
    }
  }, [
    isExporting,
    extractionMode,
    aiThreshold,
    aiEdgeShift,
    aiSmoothness,
    aiFeather,
    aiDefringe,
    aiInvert,
    showVectorContour,
    vectorContourColor,
    vectorCurveSmoothness,
    cornerThreshold,
    useVectorMask,
    customZones,
    targetColors,
    similarity,
    colorBlend,
    edgeShift,
    edgeSoftness,
    shadingTolerance,
    contiguous,
    spillSuppression,
    strokeWidth,
    strokeColor,
    isPicking,
    showOriginal,
    aspectRatio,
    outputSizeMode,
    outputScale,
    customWidth,
    customHeight,
    outputFitMode
  ]);

  // Handle continuous playback loop
  useEffect(() => {
    let req: number;
    let active = true;
    const loop = async () => {
      if (active && isPlaying && !isExporting) {
        await drawFrame();
        if (active && isPlaying && !isExporting) {
          req = requestAnimationFrame(loop);
        }
      }
    };
    if (isPlaying) {
      req = requestAnimationFrame(loop);
    }
    return () => {
      active = false;
      if (req) cancelAnimationFrame(req);
    };
  }, [isPlaying, isExporting, drawFrame]);

  // Force draw immediately when paused and parameters change
  useEffect(() => {
    if (!isPlaying && !isExporting && videoSrc) {
      drawFrame();
    }
  }, [drawFrame, isPlaying, isExporting, videoSrc]);

  const processFiles = (files: FileList | File[]) => {
    const newVideos = Array.from(files).filter(f => f.type.startsWith('video/')).map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    }));

    if (newVideos.length === 0) return;

    setVideoQueue(prev => {
      prev.forEach(v => URL.revokeObjectURL(v.url));
      return newVideos;
    });
    setActiveIndex(0);

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
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
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
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
    
    const dims = getCropDimensions(
      videoRef.current.videoWidth,
      videoRef.current.videoHeight,
      aspectRatio,
      outputSizeMode,
      outputScale,
      customWidth,
      customHeight,
      outputFitMode
    );

    const rect = canvasRef.current.getBoundingClientRect();
    const clickCanvasX = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const clickCanvasY = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    
    // Check if click is inside the drawn content frame (dims.dx, dims.dy, dims.dw, dims.dh)
    const relX = (clickCanvasX - dims.dx) / (dims.dw || 1);
    const relY = (clickCanvasY - dims.dy) / (dims.dh || 1);
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

    const sourceX = Math.floor(dims.sx + relX * dims.sw);
    const sourceY = Math.floor(dims.sy + relY * dims.sh);

    const hiddenCanvas = hiddenCanvasRef.current;
    const hCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    if (!hCtx) return;
    
    hiddenCanvas.width = videoRef.current.videoWidth;
    hiddenCanvas.height = videoRef.current.videoHeight;
    hCtx.drawImage(videoRef.current, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    const pixel = hCtx.getImageData(sourceX, sourceY, 1, 1).data;
    const newColor: RGBColor = { r: pixel[0], g: pixel[1], b: pixel[2], x: sourceX, y: sourceY };
    
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

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPicking || activeMatteTool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setDrawingStart({ x, y });
    setDrawingCurrent({ x, y });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingStart || activeMatteTool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setDrawingCurrent({ x, y });
  };

  const handleCanvasPointerUp = () => {
    if (!drawingStart || !drawingCurrent || activeMatteTool === 'none') {
      setDrawingStart(null);
      setDrawingCurrent(null);
      return;
    }

    const minX = Math.min(drawingStart.x, drawingCurrent.x);
    const maxX = Math.max(drawingStart.x, drawingCurrent.x);
    const minY = Math.min(drawingStart.y, drawingCurrent.y);
    const maxY = Math.max(drawingStart.y, drawingCurrent.y);

    if (maxX - minX > 0.008 && maxY - minY > 0.008) {
      const newZone: CustomMatteZone = {
        id: 'zone_' + Date.now(),
        type: activeMatteTool === 'remove_rect' ? 'remove' : 'keep',
        shape: 'rect',
        points: [
          { x: minX, y: minY },
          { x: maxX, y: maxY }
        ]
      };
      setCustomZones(prev => [...prev, newZone]);
    }

    setDrawingStart(null);
    setDrawingCurrent(null);
    setActiveMatteTool('none');
  };

  const removeCustomZone = (id: string) => {
    setCustomZones(prev => prev.filter(z => z.id !== id));
  };

  const exportWebMPromise = (fileName: string): Promise<void> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve();
      
      setIsExporting(true);
      setExportProgress(0);
      setIsPlaying(false);
      video.pause();
      video.currentTime = 0;
      
      const dims = getCropDimensions(
        video.videoWidth,
        video.videoHeight,
        aspectRatio,
        outputSizeMode,
        outputScale,
        customWidth,
        customHeight,
        outputFitMode
      );
      canvas.width = Math.floor(dims.outW);
      canvas.height = Math.floor(dims.outH);
      
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
        a.download = `${fileName}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(0);
        video.currentTime = currentTime; // Restore time
        resolve();
      };
      
      mediaRecorder.start();
      video.play();
      
      const exportLoop = async () => {
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
            
            if (extractionMode === 'ai') {
              await applyAiMatting(hiddenCtx, hiddenCanvas, {
                threshold: aiThreshold,
                edgeShift: aiEdgeShift,
                smoothness: aiSmoothness,
                feather: aiFeather,
                defringe: aiDefringe,
                invert: aiInvert,
                strokeWidth,
                strokeColor,
                vectorCurveSmoothness,
                cornerThreshold,
                useVectorMask,
                customZones,
                originalSource: video
              });
            } else {
              applyChromaKey(hiddenCtx, hiddenCanvas, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor);
              if (customZones.length > 0) {
                applyCustomMatteZones(hiddenCtx, video, customZones, hiddenCanvas.width, hiddenCanvas.height);
              }
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              hiddenCanvas,
              dims.sx, dims.sy, dims.sw, dims.sh,
              dims.dx, dims.dy, dims.dw, dims.dh
            );
          }
        }
        
        setExportProgress((video.currentTime / video.duration) * 100);
        requestAnimationFrame(exportLoop);
      };
      
      exportLoop();
    });
  };

  const handleExportWebM = async () => {
    setExportType('WebM');
    await exportWebMPromise(originalFileName);
    setExportType(null);
  };

  const exportGIFPromise = async (fileName: string): Promise<void> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.duration === Infinity) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    video.pause();
    video.currentTime = 0;

    const dims = getCropDimensions(
      video.videoWidth,
      video.videoHeight,
      aspectRatio,
      outputSizeMode,
      outputScale,
      customWidth,
      customHeight,
      outputFitMode
    );
    const maxGifWidth = 800;
    const gifScale = dims.outW > maxGifWidth ? maxGifWidth / dims.outW : 1;
    canvas.width = Math.max(2, Math.floor(dims.outW * gifScale));
    canvas.height = Math.max(2, Math.floor(dims.outH * gifScale));

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
          
          if (extractionMode === 'ai') {
            await applyAiMatting(hiddenCtx, hiddenCanvas, {
              threshold: aiThreshold,
              edgeShift: aiEdgeShift,
              smoothness: aiSmoothness,
              feather: aiFeather,
              defringe: aiDefringe,
              invert: aiInvert,
              strokeWidth,
              strokeColor,
              vectorCurveSmoothness,
              cornerThreshold,
              useVectorMask,
              customZones,
              originalSource: video
            });
          } else {
            applyChromaKey(hiddenCtx, hiddenCanvas, targetColors, similarity, colorBlend, edgeShift, edgeSoftness, shadingTolerance, contiguous, spillSuppression, strokeWidth, strokeColor);
            if (customZones.length > 0) {
              applyCustomMatteZones(hiddenCtx, video, customZones, hiddenCanvas.width, hiddenCanvas.height);
            }
          }
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            hiddenCanvas,
            dims.sx, dims.sy, dims.sw, dims.sh,
            Math.floor(dims.dx * gifScale),
            Math.floor(dims.dy * gifScale),
            Math.floor(dims.dw * gifScale),
            Math.floor(dims.dh * gifScale)
          );
        }
        
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasKeyedColors = extractionMode === 'ai' || targetColors.length > 0;

        let palette: number[][];
        let index: Uint8Array;

        if (hasKeyedColors) {
          palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
          const transparentIdx = palette.findIndex(p => p[3] !== undefined && p[3] < 128);
          if (useDithering) {
            index = applyPaletteDithered(data, width, height, palette);
          } else {
            index = applyPalette(data, palette, 'rgba4444');
          }
          gif.writeFrame(index, width, height, { 
            palette, 
            transparent: transparentIdx !== -1, 
            transparentIndex: transparentIdx !== -1 ? transparentIdx : undefined,
            delay, 
            repeat: isGifLooping ? 0 : -1 
          });
        } else {
          palette = quantize(data, 256, { format: 'rgb565' });
          if (useDithering) {
            index = applyPaletteDithered(data, width, height, palette);
          } else {
            index = applyPalette(data, palette, 'rgb565');
          }
          gif.writeFrame(index, width, height, { 
            palette, 
            transparent: false, 
            delay, 
            repeat: isGifLooping ? 0 : -1 
          });
        }
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
    a.download = `${fileName}.gif`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
    setExportProgress(0);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    video.currentTime = currentTime; // Restore time
  };

  const handleExportGIF = async () => {
    setExportType('GIF');
    await exportGIFPromise(originalFileName);
    setExportType(null);
  };

  const doBatchExport = async (type: 'GIF' | 'WebM') => {
    if (videoQueue.length === 0) return;
    
    setIsBatchExporting(true);
    setExportType(type);
    
    const originalIndex = activeIndex;
    
    for (let i = 0; i < videoQueue.length; i++) {
      setBatchProgressText(`File ${i + 1} of ${videoQueue.length} (${videoQueue[i].name})`);
      
      setActiveIndex(i);
      
      // Wait for React to render and video to load the new source
      await new Promise<void>(resolve => {
        const checkLoad = () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.src === videoQueue[i].url) {
             resolve();
          } else {
             setTimeout(checkLoad, 50);
          }
        };
        setTimeout(checkLoad, 50);
      });

      // Wait a bit more for metadata sizes to propagate to canvases
      await new Promise(r => setTimeout(r, 200));
      
      if (type === 'WebM') {
        await exportWebMPromise(videoQueue[i].name);
      } else {
        await exportGIFPromise(videoQueue[i].name);
      }
    }
    
    setActiveIndex(originalIndex);
    setIsBatchExporting(false);
    setExportType(null);
    setBatchProgressText('');
  };

  const removeColor = (idx: number) => {
    setTargetColors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    if (extractionMode === 'ai') {
      setAiThreshold(50);
      setAiEdgeShift(-1.5);
      setAiSmoothness(2.0);
      setAiFeather(1.0);
      setAiDefringe(40);
      setAiInvert(false);
      setStrokeWidth(0);
      setStrokeColor('#ffffff');
    } else {
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
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <Header
        hasVideo={Boolean(videoSrc)}
        isPlaying={isPlaying}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* Main Preview Area */}
        <VideoPlayerView
          mobileTab={mobileTab}
          isDragging={isDragging}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          videoSrc={videoSrc}
          videoRef={videoRef}
          canvasRef={canvasRef}
          hiddenCanvasRef={hiddenCanvasRef}
          setDuration={setDuration}
          drawFrame={drawFrame}
          isScrubbing={isScrubbing}
          setIsScrubbing={setIsScrubbing}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          duration={duration}
          isPicking={isPicking}
          activeMatteTool={activeMatteTool}
          setActiveMatteTool={setActiveMatteTool}
          bgMode={bgMode}
          setBgMode={setBgMode}
          customBgColor={customBgColor}
          setCustomBgColor={setCustomBgColor}
          handleCanvasClick={handleCanvasClick}
          handleCanvasPointerDown={handleCanvasPointerDown}
          handleCanvasPointerMove={handleCanvasPointerMove}
          handleCanvasPointerUp={handleCanvasPointerUp}
          drawingStart={drawingStart}
          drawingCurrent={drawingCurrent}
          customZones={customZones}
          showVectorContour={showVectorContour}
          setShowVectorContour={setShowVectorContour}
          showOriginal={showOriginal}
          setShowOriginal={setShowOriginal}
          videoQueue={videoQueue}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          setVideoQueue={setVideoQueue}
          isBatchExporting={isBatchExporting}
          handleFileUpload={handleFileUpload}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          isExporting={isExporting}
          exportType={exportType}
          exportFrame={exportFrame}
          exportTotalFrames={exportTotalFrames}
          batchProgressText={batchProgressText}
          exportProgress={exportProgress}
        />

        {/* Right Sidebar Controls */}
        <Sidebar
          mobileTab={mobileTab}
          isSidebarOpen={isSidebarOpen}
          extractionMode={extractionMode}
          setExtractionMode={setExtractionMode}
          onReset={handleReset}
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
          removeColor={removeColor}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          outputSizeMode={outputSizeMode}
          setOutputSizeMode={setOutputSizeMode}
          outputScale={outputScale}
          setOutputScale={setOutputScale}
          customWidth={customWidth}
          setCustomWidth={setCustomWidth}
          customHeight={customHeight}
          setCustomHeight={setCustomHeight}
          lockAspectRatio={lockAspectRatio}
          setLockAspectRatio={setLockAspectRatio}
          outputFitMode={outputFitMode}
          setOutputFitMode={setOutputFitMode}
          videoWidth={videoRef.current?.videoWidth || 0}
          videoHeight={videoRef.current?.videoHeight || 0}
          gifFps={gifFps}
          setGifFps={setGifFps}
          gifFrameLimit={gifFrameLimit}
          setGifFrameLimit={setGifFrameLimit}
          handleExportWebM={handleExportWebM}
          handleExportGIF={handleExportGIF}
          isExporting={isExporting}
          isBatchExporting={isBatchExporting}
          useDithering={useDithering}
          setUseDithering={setUseDithering}
          isGifLooping={isGifLooping}
          setIsGifLooping={setIsGifLooping}
          videoQueue={videoQueue}
          doBatchExport={doBatchExport}
        />
      </main>

      {/* Status Footer */}
      <Footer
        hasVideo={Boolean(videoSrc)}
        isExporting={isExporting || isBatchExporting}
        isPlaying={isPlaying}
        currentTime={currentTime}
      />
    </div>
  );
}
