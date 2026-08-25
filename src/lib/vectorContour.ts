export interface Point {
  x: number;
  y: number;
}

export interface CustomMatteZone {
  id: string;
  type: 'remove' | 'keep'; // 'remove' (Garbage Matte - force delete), 'keep' (Holdout Matte - force keep)
  shape: 'rect' | 'polygon';
  points: Point[]; // normalized (0..1) relative to video dimensions
}

/**
 * Ramer-Douglas-Peucker (RDP) algorithm to simplify contour points
 */
export function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    let dist = 0;
    if (lenSq === 0) {
      const px = pt.x - start.x;
      const py = pt.y - start.y;
      dist = Math.sqrt(px * px + py * py);
    } else {
      const t = Math.max(0, Math.min(1, ((pt.x - start.x) * dx + (pt.y - start.y) * dy) / lenSq));
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      const ex = pt.x - projX;
      const ey = pt.y - projY;
      dist = Math.sqrt(ex * ex + ey * ey);
    }

    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, index + 1), epsilon);
    const right = simplifyPoints(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

/**
 * Fast Marching Squares boundary contour tracer on 8-bit Alpha or Mask
 */
export function extractMaskContour(
  maskData: Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
  threshold: number = 128,
  step: number = 2
): Point[][] {
  const contours: Point[][] = [];
  const visited = new Uint8Array(Math.ceil(width / step) * Math.ceil(height / step));
  const gridW = Math.ceil(width / step);
  const gridH = Math.ceil(height / step);

  const getVal = (gx: number, gy: number): number => {
    const px = Math.min(width - 1, gx * step);
    const py = Math.min(height - 1, gy * step);
    if (maskData instanceof Float32Array) {
      return maskData[py * width + px] * 255;
    } else {
      // RGBA or single channel
      const idx = (py * width + px) * 4 + 3;
      return maskData[idx] !== undefined ? maskData[idx] : maskData[py * width + px];
    }
  };

  // Sample grid boundaries
  for (let gy = 0; gy < gridH - 1; gy += 2) {
    for (let gx = 0; gx < gridW - 1; gx += 2) {
      const v = getVal(gx, gy);
      const isForeground = v >= threshold;

      if (isForeground && !visited[gy * gridW + gx]) {
        // Trace boundary loop
        const loop: Point[] = [];
        let cx = gx;
        let cy = gy;
        let dir = 0; // 0: Right, 1: Down, 2: Left, 3: Up
        const dirs = [
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: -1 },
        ];

        let stepsCount = 0;
        const maxSteps = gridW * gridH;

        while (stepsCount < maxSteps) {
          visited[cy * gridW + cx] = 1;
          loop.push({ x: cx * step, y: cy * step });

          // Check neighboring 8-directions to follow contour edge
          let nextFound = false;
          for (let d = 0; d < 4; d++) {
            const nextDir = (dir + 3 + d) % 4; // Turn left first
            const nx = cx + dirs[nextDir].dx;
            const ny = cy + dirs[nextDir].dy;

            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              const nv = getVal(nx, ny);
              if (nv >= threshold) {
                cx = nx;
                cy = ny;
                dir = nextDir;
                nextFound = true;
                break;
              }
            }
          }

          if (!nextFound || (cx === gx && cy === gy && loop.length > 5)) {
            break;
          }
          stepsCount++;
        }

        if (loop.length > 10) {
          // Simplify with RDP for ultra-clean vector curve
          const simplified = simplifyPoints(loop, 2.5);
          contours.push(simplified);
        }
      }
    }
  }

  return contours;
}

/**
 * Draws Smooth Bézier curve through point list
 */
export function drawSmoothContour(ctx: CanvasRenderingContext2D, points: Point[], closed: boolean = true) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  if (closed) {
    ctx.closePath();
  }
}

/**
 * Renders Glowing Vector Outline Overlay
 */
export function renderVectorContourOverlay(
  ctx: CanvasRenderingContext2D,
  contours: Point[][],
  color: string = '#00f0ff',
  lineWidth: number = 2
) {
  if (!contours || contours.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  for (const contour of contours) {
    drawSmoothContour(ctx, contour, true);
    ctx.stroke();
  }

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
    // Clip region and draw original video back into canvas
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
