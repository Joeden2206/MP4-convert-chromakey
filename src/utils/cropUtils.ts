import { AspectRatioType, CropDimensions, OutputSizeMode, OutputFitMode } from '../types';

export function getCropDimensions(
  videoWidth: number,
  videoHeight: number,
  ratio: AspectRatioType,
  outputSizeMode: OutputSizeMode = 'original',
  outputScale: number = 1.0,
  customWidth: number = 0,
  customHeight: number = 0,
  fitMode: OutputFitMode = 'contain'
): CropDimensions {
  if (!videoWidth || !videoHeight) {
    return {
      sx: 0, sy: 0, sw: 1920, sh: 1080,
      dw: 1920, dh: 1080,
      outW: 1920, outH: 1080,
      dx: 0, dy: 0
    };
  }

  // 1. Calculate Source Crop based on Aspect Ratio Preset
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

  // 2. Determine Output Canvas Dimensions (outW, outH)
  let outW = Math.round(cropWidth);
  let outH = Math.round(cropHeight);

  if (outputSizeMode === 'scale') {
    const scaleFactor = Math.max(0.1, Math.min(4.0, outputScale || 1.0));
    outW = Math.max(16, Math.round(cropWidth * scaleFactor));
    outH = Math.max(16, Math.round(cropHeight * scaleFactor));
  } else if ((outputSizeMode === 'custom' || outputSizeMode === 'preset') && customWidth > 0 && customHeight > 0) {
    outW = Math.max(16, Math.round(customWidth));
    outH = Math.max(16, Math.round(customHeight));
  }

  // Ensure even dimensions for standard video codec encoders (H.264/VP8/VP9)
  if (outW % 2 !== 0) outW += 1;
  if (outH % 2 !== 0) outH += 1;

  // 3. Determine Draw Destination Dimensions and Offset (dx, dy, dw, dh) inside (outW, outH)
  let dx = 0;
  let dy = 0;
  let dw = outW;
  let dh = outH;

  if (fitMode === 'stretch') {
    dx = 0;
    dy = 0;
    dw = outW;
    dh = outH;
  } else if (fitMode === 'cover') {
    const scale = Math.max(outW / cropWidth, outH / cropHeight);
    dw = Math.round(cropWidth * scale);
    dh = Math.round(cropHeight * scale);
    dx = Math.round((outW - dw) / 2);
    dy = Math.round((outH - dh) / 2);
  } else {
    // Default 'contain' - keep whole cropped area centered without distortion
    const scale = Math.min(outW / cropWidth, outH / cropHeight);
    dw = Math.round(cropWidth * scale);
    dh = Math.round(cropHeight * scale);
    dx = Math.round((outW - dw) / 2);
    dy = Math.round((outH - dh) / 2);
  }

  return {
    sx: offsetX,
    sy: offsetY,
    sw: cropWidth,
    sh: cropHeight,
    dw,
    dh,
    outW,
    outH,
    dx,
    dy
  };
}
