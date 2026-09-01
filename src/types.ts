export interface RGBColor {
  r: number;
  g: number;
  b: number;
  x?: number;
  y?: number;
}

export interface CustomMatteZone {
  id: string;
  type: 'remove' | 'keep'; // 'remove' = garbage matte, 'keep' = holdout / preserve
  shape: 'rect' | 'polygon';
  points: { x: number; y: number }[]; // normalized 0..1 coordinates
}

export interface VideoItem {
  file: File;
  url: string;
  name: string;
}

export type ExtractionMode = 'chroma' | 'ai';
export type BgMode = 'transparent' | 'black' | 'white' | 'custom';
export type AspectRatioType = 'original' | '1:1' | '9:16' | '16:9';
export type MatteToolType = 'none' | 'remove_rect' | 'keep_rect';
export type MobileTab = 'view' | 'tune' | 'export';

export type OutputSizeMode = 'original' | 'scale' | 'custom' | 'preset';
export type OutputFitMode = 'contain' | 'cover' | 'stretch';

export interface CropDimensions {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
  outW: number;
  outH: number;
  dx: number;
  dy: number;
}
