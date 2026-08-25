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
