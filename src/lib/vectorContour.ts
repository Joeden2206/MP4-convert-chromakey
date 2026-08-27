export interface Point {
  x: number;
  y: number;
}

export interface BezierSegment {
  p0: Point;
  cp1: Point;
  cp2: Point;
  p1: Point;
}

export interface VectorContourPath {
  points: Point[];
  isCorner: boolean[];
  segments: BezierSegment[];
  closed: boolean;
}

export interface CustomMatteZone {
  id: string;
  type: 'remove' | 'keep'; // 'remove' (Garbage Matte - force delete), 'keep' (Holdout Matte - force keep)
  shape: 'rect' | 'polygon';
  points: Point[]; // normalized (0..1) relative to video dimensions
}

/**
 * Subpixel Marching Squares with Bilinear / Isoline Interpolation
 * Extracts smooth continuous boundary contours without integer pixel staircases.
 */
export function extractMaskContourSubpixel(
  maskData: Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
  threshold: number = 128,
  step: number = 4
): Point[][] {
  const contours: Point[][] = [];
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);

  const getSample = (x: number, y: number): number => {
    const px = Math.max(0, Math.min(width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(height - 1, Math.round(y)));
    if (maskData instanceof Float32Array) {
      return maskData[py * width + px] * 255;
    } else {
      const idx = (py * width + px) * 4 + 3;
      return maskData[idx] !== undefined ? maskData[idx] : maskData[py * width + px];
    }
  };

  // 2D grid sample values
  const grid = new Float32Array((cols + 1) * (rows + 1));
  for (let r = 0; r <= rows; r++) {
    const y = Math.min(height - 1, r * step);
    const rOffset = r * (cols + 1);
    for (let c = 0; c <= cols; c++) {
      const x = Math.min(width - 1, c * step);
      grid[rOffset + c] = getSample(x, y);
    }
  }

  // Horizontal edges & vertical edges flags to trace loops
  // Edge lookup: cell has top (0), right (1), bottom (2), left (3)
  const visitedCells = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellIdx = r * cols + c;
      if (visitedCells[cellIdx]) continue;

      const idx0 = r * (cols + 1) + c;         // top-left
      const idx1 = idx0 + 1;                   // top-right
      const idx2 = (r + 1) * (cols + 1) + c + 1; // bottom-right
      const idx3 = (r + 1) * (cols + 1) + c;     // bottom-left

      const v0 = grid[idx0];
      const v1 = grid[idx1];
      const v2 = grid[idx2];
      const v3 = grid[idx3];

      const b0 = v0 >= threshold ? 1 : 0;
      const b1 = v1 >= threshold ? 1 : 0;
      const b2 = v2 >= threshold ? 1 : 0;
      const b3 = v3 >= threshold ? 1 : 0;

      const caseVal = (b0 << 3) | (b1 << 2) | (b2 << 1) | b3;

      // 0 = completely outside, 15 = completely inside
      if (caseVal === 0 || caseVal === 15) continue;

      // Trace the continuous isoline loop from this cell
      const loop: Point[] = [];
      let currR = r;
      let currC = c;
      let steps = 0;
      const maxSteps = cols * rows * 2;

      while (steps < maxSteps) {
        const curIdx = currR * cols + currC;
        visitedCells[curIdx] = 1;

        const cX = currC * step;
        const cY = currR * step;

        const i0 = currR * (cols + 1) + currC;
        const i1 = i0 + 1;
        const i2 = (currR + 1) * (cols + 1) + currC + 1;
        const i3 = (currR + 1) * (cols + 1) + currC;

        const val0 = grid[i0];
        const val1 = grid[i1];
        const val2 = grid[i2];
        const val3 = grid[i3];

        // Subpixel interpolation helper on edge
        const interp = (va: number, vb: number) => {
          const diff = vb - va;
          if (Math.abs(diff) < 0.001) return 0.5;
          return Math.max(0.05, Math.min(0.95, (threshold - va) / diff));
        };

        const topPt: Point = { x: cX + step * interp(val0, val1), y: cY };
        const rightPt: Point = { x: cX + step, y: cY + step * interp(val1, val2) };
        const bottomPt: Point = { x: cX + step * interp(val3, val2), y: cY + step };
        const leftPt: Point = { x: cX, y: cY + step * interp(val0, val3) };

        const cVal = ((val0 >= threshold ? 1 : 0) << 3) |
                     ((val1 >= threshold ? 1 : 0) << 2) |
                     ((val2 >= threshold ? 1 : 0) << 1) |
                     (val3 >= threshold ? 1 : 0);

        let nextR = currR;
        let nextC = currC;
        let pOut: Point | null = null;

        // Marching squares standard routing with subpixel precision
        switch (cVal) {
          case 1: case 14: // bottom-left
            pOut = bottomPt; loop.push(leftPt); nextR++; break;
          case 2: case 13: // bottom-right
            pOut = rightPt; loop.push(bottomPt); nextC++; break;
          case 3: case 12: // bottom half
            pOut = rightPt; loop.push(leftPt); nextC++; break;
          case 4: case 11: // top-right
            pOut = topPt; loop.push(rightPt); nextR--; break;
          case 5: // diagonal saddle
            pOut = topPt; loop.push(leftPt); nextR--; break;
          case 6: case 9: // right half
            pOut = bottomPt; loop.push(topPt); nextR++; break;
          case 7: case 8: // top-left
            pOut = leftPt; loop.push(topPt); nextC--; break;
          case 10: // diagonal saddle
            pOut = rightPt; loop.push(topPt); nextC++; break;
          default:
            pOut = null;
        }

        if (pOut) {
          loop.push(pOut);
        }

        if (nextR < 0 || nextR >= rows || nextC < 0 || nextC >= cols) break;
        if (nextR === r && nextC === c && loop.length > 8) break;

        currR = nextR;
        currC = nextC;
        steps++;
      }

      if (loop.length > 12) {
        // Filter duplicate close points
        const cleanLoop: Point[] = [loop[0]];
        for (let i = 1; i < loop.length; i++) {
          const prev = cleanLoop[cleanLoop.length - 1];
          const dist = Math.hypot(loop[i].x - prev.x, loop[i].y - prev.y);
          if (dist > 1.5) {
            cleanLoop.push(loop[i]);
          }
        }
        if (cleanLoop.length > 8) {
          contours.push(cleanLoop);
        }
      }
    }
  }

  return contours;
}

/**
 * Image Trace Vectorization:
 * Converts raw subpixel contours into smooth Cubic Bézier Spline Curves
 * with Corner Detection and Collinear Tangent Handles (Đòn gánh Bézier).
 */
export function fitBezierSplines(
  points: Point[],
  cornerAngleDeg: number = 55,
  smoothTension: number = 0.35
): VectorContourPath {
  const n = points.length;
  if (n < 3) {
    return {
      points,
      isCorner: points.map(() => true),
      segments: [],
      closed: true,
    };
  }

  // 1. Corner Point Detection
  // Computes the exterior deviation angle at each vertex
  const isCorner = new Array(n).fill(false);
  const cornerThresholdCos = Math.cos((cornerAngleDeg * Math.PI) / 180);

  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n];
    const pCurr = points[i];
    const pNext = points[(i + 1) % n];

    const v1x = pCurr.x - pPrev.x;
    const v1y = pCurr.y - pPrev.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 > 0.001 && len2 > 0.001) {
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      // dot represents cos(turn angle). If dot < cornerThresholdCos, it's a sharp corner!
      if (dot < cornerThresholdCos) {
        isCorner[i] = true;
      }
    }
  }

  // 2. Generate Tangent Vectors (Đòn gánh tiếp tuyến)
  const tangents: Point[] = new Array(n);
  for (let i = 0; i < n; i++) {
    if (isCorner[i]) {
      // Corner: no smooth continuous tangent handle across the corner
      tangents[i] = { x: 0, y: 0 };
    } else {
      // Smooth vertex: tangent is parallel to chord (p[i-1] -> p[i+1])
      const pPrev = points[(i - 1 + n) % n];
      const pNext = points[(i + 1) % n];
      const tx = pNext.x - pPrev.x;
      const ty = pNext.y - pPrev.y;
      const tLen = Math.hypot(tx, ty);
      if (tLen > 0.001) {
        tangents[i] = { x: tx / tLen, y: ty / tLen };
      } else {
        tangents[i] = { x: 0, y: 0 };
      }
    }
  }

  // 3. Construct Cubic Bézier Segments (C1 & C2 control points)
  const segments: BezierSegment[] = [];
  const tension = Math.max(0.05, Math.min(0.65, smoothTension));

  for (let i = 0; i < n; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    const chordX = p1.x - p0.x;
    const chordY = p1.y - p0.y;
    const chordLen = Math.hypot(chordX, chordY);

    let cp1: Point;
    let cp2: Point;

    const t0 = tangents[i];
    const t1 = tangents[(i + 1) % n];

    // Outgoing Handle from P0
    if (!isCorner[i] && (t0.x !== 0 || t0.y !== 0)) {
      const handleLen = chordLen * tension;
      cp1 = {
        x: p0.x + t0.x * handleLen,
        y: p0.y + t0.y * handleLen,
      };
    } else {
      cp1 = {
        x: p0.x + chordX / 3,
        y: p0.y + chordY / 3,
      };
    }

    // Incoming Handle to P1
    if (!isCorner[(i + 1) % n] && (t1.x !== 0 || t1.y !== 0)) {
      const handleLen = chordLen * tension;
      cp2 = {
        x: p1.x - t1.x * handleLen,
        y: p1.y - t1.y * handleLen,
      };
    } else {
      cp2 = {
        x: p1.x - chordX / 3,
        y: p1.y - chordY / 3,
      };
    }

    segments.push({ p0, cp1, cp2, p1 });
  }

  return {
    points,
    isCorner,
    segments,
    closed: true,
  };
}

/**
 * Draws Cubic Bézier Vector Path onto Canvas Context
 */
export function traceVectorPath(ctx: CanvasRenderingContext2D, vectorPath: VectorContourPath) {
  if (!vectorPath.segments || vectorPath.segments.length === 0) return;

  const firstSeg = vectorPath.segments[0];
  ctx.moveTo(firstSeg.p0.x, firstSeg.p0.y);

  for (const seg of vectorPath.segments) {
    ctx.bezierCurveTo(
      seg.cp1.x,
      seg.cp1.y,
      seg.cp2.x,
      seg.cp2.y,
      seg.p1.x,
      seg.p1.y
    );
  }

  if (vectorPath.closed) {
    ctx.closePath();
  }
}

/**
 * High-Quality Vector Contour Glow Overlay
 * Renders glowing vector Bézier curves with handles and corner joints.
 */
export function renderVectorSplineOverlay(
  ctx: CanvasRenderingContext2D,
  vectorPaths: VectorContourPath[],
  color: string = '#00f0ff',
  lineWidth: number = 2.5
) {
  if (!vectorPaths || vectorPaths.length === 0) return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Glow shadow pass
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  for (const vp of vectorPaths) {
    traceVectorPath(ctx, vp);
  }
  ctx.stroke();

  // Core bright neon pass
  ctx.shadowBlur = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, lineWidth * 0.4);
  ctx.stroke();

  ctx.restore();
}

/**
 * Applies Custom Exclusion / Inclusion Zones (Garbage Matte & Keep Zones)
 */
export function applyCustomMatteZones(
  ctx: CanvasRenderingContext2D,
  origVideo: HTMLVideoElement | HTMLCanvasElement,
  zones: CustomMatteZone[],
  width: number,
  height: number
) {
  if (!zones || zones.length === 0) return;

  // 1. Process REMOVE zones (Garbage Matte - Force Cut/Clear unwanted background artifacts)
  const removeZones = zones.filter((z) => z.type === 'remove');
  if (removeZones.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';

    for (const zone of removeZones) {
      if (zone.points.length === 0) continue;
      ctx.beginPath();
      if (zone.shape === 'rect' && zone.points.length >= 2) {
        const x1 = zone.points[0].x * width;
        const y1 = zone.points[0].y * height;
        const x2 = zone.points[1].x * width;
        const y2 = zone.points[1].y * height;
        ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else {
        ctx.moveTo(zone.points[0].x * width, zone.points[0].y * height);
        for (let i = 1; i < zone.points.length; i++) {
          ctx.lineTo(zone.points[i].x * width, zone.points[i].y * height);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Process KEEP zones (Holdout Matte - Force Restore Subject pixels from original source)
  const keepZones = zones.filter((z) => z.type === 'keep');
  if (keepZones.length > 0) {
    ctx.save();
    for (const zone of keepZones) {
      if (zone.points.length === 0) continue;
      ctx.save();
      ctx.beginPath();
      if (zone.shape === 'rect' && zone.points.length >= 2) {
        const x1 = zone.points[0].x * width;
        const y1 = zone.points[0].y * height;
        const x2 = zone.points[1].x * width;
        const y2 = zone.points[1].y * height;
        ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else {
        ctx.moveTo(zone.points[0].x * width, zone.points[0].y * height);
        for (let i = 1; i < zone.points.length; i++) {
          ctx.lineTo(zone.points[i].x * width, zone.points[i].y * height);
        }
        ctx.closePath();
      }
      ctx.clip();
      ctx.drawImage(origVideo, 0, 0, width, height);
      ctx.restore();
    }
    ctx.restore();
  }
}
