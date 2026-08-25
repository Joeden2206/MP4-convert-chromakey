import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import { CustomMatteZone, extractMaskContour, renderVectorContourOverlay, applyCustomMatteZones, Point } from './vectorContour';

let segmenterInstance: ImageSegmenter | null = null;
let initPromise: Promise<ImageSegmenter> | null = null;

// Offscreen reusable canvases to prevent GC pressure
let lowResMaskCanvas: HTMLCanvasElement | null = null;
let lowResMaskCtx: CanvasRenderingContext2D | null = null;

let fullMaskCanvas: HTMLCanvasElement | null = null;
let fullMaskCtx: CanvasRenderingContext2D | null = null;

export type AiMattingStatus = 'idle' | 'loading' | 'ready' | 'error';

let currentStatus: AiMattingStatus = 'idle';
let loadError: string | null = null;

export function getAiMattingStatus(): { status: AiMattingStatus; error: string | null } {
  return { status: currentStatus, error: loadError };
}

export async function preloadAiSegmenter(onStatusChange?: (status: AiMattingStatus, err?: string) => void): Promise<ImageSegmenter> {
  if (segmenterInstance) {
    if (onStatusChange) onStatusChange('ready');
    return segmenterInstance;
  }
  if (initPromise) {
    if (onStatusChange) onStatusChange('loading');
    const seg = await initPromise;
    if (onStatusChange) onStatusChange('ready');
    return seg;
  }

  currentStatus = 'loading';
  if (onStatusChange) onStatusChange('loading');
  loadError = null;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      try {
        // First attempt: GPU acceleration (WebGL / WebGPU delegate)
        segmenterInstance = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      } catch (gpuErr) {
        console.warn('MediaPipe GPU delegate init failed, falling back to WebAssembly CPU:', gpuErr);
        // Fallback: CPU WebAssembly
        segmenterInstance = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      }

      currentStatus = 'ready';
      if (onStatusChange) onStatusChange('ready');
      return segmenterInstance;
    } catch (err: any) {
      currentStatus = 'error';
      loadError = err?.message || 'Failed to initialize AI matting model';
      if (onStatusChange) onStatusChange('error', loadError || undefined);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export interface AiMattingOptions {
  threshold?: number;   // 10 to 90 (Subject confidence, default 50)
  edgeShift?: number;   // -10 to +10 px (Choke inward to eat dark outline / expand, default -2)
  smoothness?: number;  // 0 to 10 px (Anti-aliasing to remove spikes/gai, default 2)
  feather?: number;     // 0 to 10 px (Soft edge blur, default 1)
  defringe?: number;    // 0 to 100% (Remove dark/black halo along edge, default 40)
  invert?: boolean;     // Invert mask (default false)
  strokeWidth?: number; // Outline stroke width in px (default 0)
  strokeColor?: string; // Outline stroke color in hex (default #ffffff)
  showVectorContour?: boolean; // Render interactive neon vector contour overlay
  vectorContourColor?: string; // Color of vector contour (e.g. #00f0ff or #10b981)
  customZones?: CustomMatteZone[]; // Custom exclusion / inclusion regions (Garbage Matte / Holdout Matte)
  originalSource?: HTMLVideoElement | HTMLCanvasElement; // For restoring holdout zones
}

/**
 * Fast 2-pass separable box blur on Alpha channel
 */
function fastBlurAlpha(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  if (radius <= 0) return;
  const r = Math.min(Math.floor(radius), 20);
  if (r <= 0) return;

  const temp = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 3; i < temp.length; i++, j += 4) {
    temp[i] = data[j];
  }

  const blurH = new Uint8ClampedArray(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    let count = 0;

    for (let x = -r; x <= r; x++) {
      if (x >= 0 && x < w) {
        sum += temp[rowOffset + x];
        count++;
      }
    }

    for (let x = 0; x < w; x++) {
      blurH[rowOffset + x] = Math.round(sum / count);

      const removeX = x - r;
      const addX = x + r + 1;

      if (removeX >= 0) {
        sum -= temp[rowOffset + removeX];
        count--;
      }
      if (addX < w) {
        sum += temp[rowOffset + addX];
        count++;
      }
    }
  }

  // Vertical pass directly into data
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;

    for (let y = -r; y <= r; y++) {
      if (y >= 0 && y < h) {
        sum += blurH[y * w + x];
        count++;
      }
    }

    for (let y = 0; y < h; y++) {
      data[(y * w + x) * 4 + 3] = Math.round(sum / count);

      const removeY = y - r;
      const addY = y + r + 1;

      if (removeY >= 0) {
        sum -= blurH[removeY * w + x];
        count--;
      }
      if (addY < h) {
        sum += blurH[addY * w + x];
        count++;
      }
    }
  }
}

/**
 * Morphological Erosion (Choke < 0) or Dilation (Choke > 0) on alpha channel
 */
function applyAlphaErosionDilation(data: Uint8ClampedArray, w: number, h: number, radius: number, isDilation: boolean) {
  if (radius <= 0) return;
  const r = Math.min(Math.floor(radius), 15);
  const temp = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 3; i < temp.length; i++, j += 4) {
    temp[i] = data[j];
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let target = isDilation ? 0 : 255;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const val = temp[ny * w + nx];
          if (isDilation) {
            if (val > target) target = val;
          } else {
            if (val < target) target = val;
          }
        }
      }
      data[(y * w + x) * 4 + 3] = target;
    }
  }
}

/**
 * Color Defringe / Decontamination:
 * Prevents dark/black outline artifacts by clamping border RGB values or
 * brightening dark-fringed semi-transparent pixels near the edge.
 */
function applyDefringe(
  pixelData: Uint8ClampedArray,
  w: number,
  h: number,
  defringeStrength: number
) {
  if (defringeStrength <= 0) return;
  const factor = Math.min(100, Math.max(0, defringeStrength)) / 100;
  const len = pixelData.length;

  for (let i = 0; i < len; i += 4) {
    const alpha = pixelData[i + 3];
    // Target edge transition pixels with alpha between 5 and 245
    if (alpha > 5 && alpha < 245) {
      const aNorm = alpha / 255;
      // If edge pixel has darkened RGB due to dark background bleed,
      // un-premultiply / boost color luminance towards clean subject tone
      const boost = 1.0 + (1.0 - aNorm) * factor * 0.8;

      pixelData[i] = Math.min(255, Math.round(pixelData[i] * boost));
      pixelData[i + 1] = Math.min(255, Math.round(pixelData[i + 1] * boost));
      pixelData[i + 2] = Math.min(255, Math.round(pixelData[i + 2] * boost));
    }
  }
}

/**
 * Applies AI-based segmentation and background removal directly to a canvas.
 * Preserves foreground subject and cleanly cuts out background with anti-aliasing & choke.
 */
export async function applyAiMatting(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  options: AiMattingOptions = {}
): Promise<void> {
  const {
    threshold = 50,
    edgeShift = -1.5,
    smoothness = 2.0,
    feather = 1.0,
    defringe = 40,
    invert = false,
    strokeWidth = 0,
    strokeColor = '#ffffff',
    showVectorContour = false,
    vectorContourColor = '#00f0ff',
    customZones = [],
    originalSource,
  } = options;

  const segmenter = await preloadAiSegmenter();
  const result = segmenter.segment(canvas);

  if (!result || !result.confidenceMasks || result.confidenceMasks.length === 0) {
    return;
  }

  const confidenceMask = result.confidenceMasks[0];
  const maskWidth = confidenceMask.width;
  const maskHeight = confidenceMask.height;
  const maskFloats = confidenceMask.getAsFloat32Array();

  // 1. Initialize low-resolution mask canvas
  if (!lowResMaskCanvas) {
    lowResMaskCanvas = document.createElement('canvas');
    lowResMaskCtx = lowResMaskCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (lowResMaskCanvas.width !== maskWidth || lowResMaskCanvas.height !== maskHeight) {
    lowResMaskCanvas.width = maskWidth;
    lowResMaskCanvas.height = maskHeight;
  }

  if (!lowResMaskCtx) return;

  const maskImageData = lowResMaskCtx.createImageData(maskWidth, maskHeight);
  const maskData = maskImageData.data;

  // Smooth S-curve mapping for confidence values
  // Shift center with threshold & choke
  const centerCutoff = Math.max(0.05, Math.min(0.95, threshold / 100 - edgeShift * 0.02));
  const span = Math.max(0.04, 0.08 + smoothness * 0.02);

  for (let i = 0; i < maskFloats.length; i++) {
    const rawVal = maskFloats[i];
    // Hermite Smoothstep transition
    const t = Math.max(0, Math.min(1, (rawVal - (centerCutoff - span)) / (2 * span)));
    let alpha = Math.round((t * t * (3 - 2 * t)) * 255);

    if (invert) {
      alpha = 255 - alpha;
    }

    const idx = i * 4;
    maskData[idx] = 255;
    maskData[idx + 1] = 255;
    maskData[idx + 2] = 255;
    maskData[idx + 3] = alpha;
  }

  lowResMaskCtx.putImageData(maskImageData, 0, 0);

  // 2. High-Resolution Full Size Mask Upscaling with Anti-Aliasing
  if (!fullMaskCanvas) {
    fullMaskCanvas = document.createElement('canvas');
    fullMaskCtx = fullMaskCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (fullMaskCanvas.width !== canvas.width || fullMaskCanvas.height !== canvas.height) {
    fullMaskCanvas.width = canvas.width;
    fullMaskCanvas.height = canvas.height;
  }

  if (!fullMaskCtx) return;

  fullMaskCtx.clearRect(0, 0, fullMaskCanvas.width, fullMaskCanvas.height);
  fullMaskCtx.imageSmoothingEnabled = true;
  fullMaskCtx.imageSmoothingQuality = 'high';
  fullMaskCtx.drawImage(lowResMaskCanvas, 0, 0, fullMaskCanvas.width, fullMaskCanvas.height);

  // 3. Post-process Full Mask (Choke & Smoothness Anti-Aliasing)
  const fullMaskImageData = fullMaskCtx.getImageData(0, 0, fullMaskCanvas.width, fullMaskCanvas.height);
  const fullData = fullMaskImageData.data;
  const w = fullMaskCanvas.width;
  const h = fullMaskCanvas.height;

  // Apply erosion (Choke inward to eat away dark outlines) if edgeShift < 0
  if (edgeShift < 0) {
    const chokeRadius = Math.abs(edgeShift);
    applyAlphaErosionDilation(fullData, w, h, chokeRadius, false);
  } else if (edgeShift > 0) {
    applyAlphaErosionDilation(fullData, w, h, edgeShift, true);
  }

  // Anti-Aliasing Gaussian/Box blur on mask to eliminate jagged spikes ("gai")
  const totalBlur = Math.max(0, smoothness + feather);
  if (totalBlur > 0) {
    fastBlurAlpha(fullData, w, h, totalBlur);
  }

  fullMaskCtx.putImageData(fullMaskImageData, 0, 0);

  // 4. Composite Mask onto canvas using destination-in
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(fullMaskCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 5. Apply Defringe / Decontaminate to eliminate black borders & halos
  if (defringe > 0) {
    const finalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyDefringe(finalImgData.data, canvas.width, canvas.height, defringe);
    ctx.putImageData(finalImgData, 0, 0);
  }

  // 6. Optional Stroke / Outline
  if (strokeWidth > 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imgData.data;
    const len = pixelData.length;
    const radius = Math.floor(strokeWidth);
    const origData = new Uint8ClampedArray(pixelData);

    applyAlphaErosionDilation(pixelData, w, h, radius, true);
    fastBlurAlpha(pixelData, w, h, Math.max(1, Math.floor(radius / 3)));

    const hex = strokeColor.replace('#', '');
    const sR = parseInt(hex.substring(0, 2), 16) || 255;
    const sG = parseInt(hex.substring(2, 4), 16) || 255;
    const sB = parseInt(hex.substring(4, 6), 16) || 255;

    for (let i = 0; i < len; i += 4) {
      const imgA = origData[i + 3] / 255;
      const strokeA = pixelData[i + 3] / 255;

      if (strokeA > 0) {
        const outA = imgA + strokeA * (1.0 - imgA);
        if (outA > 0) {
          const imgR = origData[i];
          const imgG = origData[i + 1];
          const imgB = origData[i + 2];

          const outR = (imgR * imgA + sR * strokeA * (1.0 - imgA)) / outA;
          const outG = (imgG * imgA + sG * strokeA * (1.0 - imgA)) / outA;
          const outB = (imgB * imgA + sB * strokeA * (1.0 - imgA)) / outA;

          pixelData[i] = Math.min(255, outR);
          pixelData[i + 1] = Math.min(255, outG);
          pixelData[i + 2] = Math.min(255, outB);
          pixelData[i + 3] = Math.min(255, outA * 255);
        }
      } else {
        pixelData[i] = origData[i];
        pixelData[i + 1] = origData[i + 1];
        pixelData[i + 2] = origData[i + 2];
        pixelData[i + 3] = origData[i + 3];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // 7. Apply Custom Matte Zones (Garbage Matte & Holdout Regions)
  if (customZones && customZones.length > 0) {
    applyCustomMatteZones(ctx, originalSource || canvas, customZones, canvas.width, canvas.height);
  }

  // 8. Vector Contour Overlay (Real-time GPU Vector Line Rendering)
  if (showVectorContour && fullMaskCtx) {
    const maskImg = fullMaskCtx.getImageData(0, 0, fullMaskCanvas.width, fullMaskCanvas.height);
    const contours = extractMaskContour(maskImg.data, fullMaskCanvas.width, fullMaskCanvas.height, 128, 4);
    renderVectorContourOverlay(ctx, contours, vectorContourColor, 2);
  }

  // Free memory
  try {
    confidenceMask.close();
  } catch {
    // Ignore close if not supported
  }
}
