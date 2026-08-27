import { AspectRatioType, CropDimensions } from '../types';

export function getCropDimensions(videoWidth: number, videoHeight: number, ratio: AspectRatioType): CropDimensions {
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
}
