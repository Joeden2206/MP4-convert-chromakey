import { RGBColor } from '../types';

let alphaBuffer: Uint8Array | null = null;
let tempBuffer: Uint8Array | null = null;

function getBuffers(size: number) {
    if (!alphaBuffer || alphaBuffer.length < size) {
        alphaBuffer = new Uint8Array(size);
        tempBuffer = new Uint8Array(size);
    }
    return { alpha: alphaBuffer, temp: tempBuffer! };
}

let queueBuffer: Int32Array | null = null;
let visitedBuffer: Uint8Array | null = null;

function getHoleFillBuffers(size: number) {
    if (!queueBuffer || queueBuffer.length < size) {
        queueBuffer = new Int32Array(size);
        visitedBuffer = new Uint8Array(size);
    }
    return { q: queueBuffer, v: visitedBuffer! };
}

function fillHoles(data: Uint8ClampedArray, w: number, h: number, seedPositions: {x: number, y: number}[] = []) {
    const { q, v } = getHoleFillBuffers(w * h);
    v.fill(0, 0, w * h);
    
    let head = 0;
    let tail = 0;
    const threshold = 254; // Treat anything < 255 as potentially background to flood through

    // Seed custom positions
    for (const pos of seedPositions) {
        if (pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h) {
            const idx = pos.y * w + pos.x;
            if (data[idx * 4 + 3] <= threshold && v[idx] === 0) {
                v[idx] = 1;
                q[tail++] = idx;
            }
        }
    }

    // Seed borders
    for (let x = 0; x < w; x++) {
        if (data[x * 4 + 3] <= threshold) { v[x] = 1; q[tail++] = x; } else { v[x] = 1; }
        const bottomIdx = (h - 1) * w + x;
        if (data[bottomIdx * 4 + 3] <= threshold) { if (v[bottomIdx] === 0) { v[bottomIdx] = 1; q[tail++] = bottomIdx; } } else { v[bottomIdx] = 1; }
    }
    for (let y = 0; y < h; y++) {
        const leftIdx = y * w;
        if (data[leftIdx * 4 + 3] <= threshold) { if (v[leftIdx] === 0) { v[leftIdx] = 1; q[tail++] = leftIdx; } } else { v[leftIdx] = 1; }
        const rightIdx = y * w + (w - 1);
        if (data[rightIdx * 4 + 3] <= threshold) { if (v[rightIdx] === 0) { v[rightIdx] = 1; q[tail++] = rightIdx; } } else { v[rightIdx] = 1; }
    }

    // Flood fill from borders inward
    while (head < tail) {
        const idx = q[head++];
        const x = idx % w;
        const y = Math.floor(idx / w);

        if (x > 0) {
            const n = idx - 1;
            if (v[n] === 0 && data[n * 4 + 3] <= threshold) { v[n] = 1; q[tail++] = n; }
        }
        if (x < w - 1) {
            const n = idx + 1;
            if (v[n] === 0 && data[n * 4 + 3] <= threshold) { v[n] = 1; q[tail++] = n; }
        }
        if (y > 0) {
            const n = idx - w;
            if (v[n] === 0 && data[n * 4 + 3] <= threshold) { v[n] = 1; q[tail++] = n; }
        }
        if (y < h - 1) {
            const n = idx + w;
            if (v[n] === 0 && data[n * 4 + 3] <= threshold) { v[n] = 1; q[tail++] = n; }
        }
    }

    // Any pixel not visited by the border flood is completely surrounded by opaque pixels.
    // We fill these "holes" by restoring their alpha to 255.
    for (let i = 0; i < w * h; i++) {
        if (v[i] === 0) {
            data[i * 4 + 3] = 255;
        }
    }
}

// Fast moving average Box Blur on Alpha channel (Matte Softness)
function boxBlurAlpha(data: Uint8ClampedArray, w: number, h: number, radius: number) {
    if (radius < 1) return;
    const { alpha, temp } = getBuffers(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];

    // Horizontal pass
    for (let y = 0; y < h; y++) {
        let sum = 0;
        const yOffset = y * w;
        for (let x = -radius; x <= radius; x++) {
            sum += alpha[yOffset + Math.min(w - 1, Math.max(0, x))];
        }
        for (let x = 0; x < w; x++) {
            temp[yOffset + x] = Math.floor(sum / (2 * radius + 1));
            sum -= alpha[yOffset + Math.max(0, x - radius)];
            sum += alpha[yOffset + Math.min(w - 1, x + radius + 1)];
        }
    }
    // Vertical pass
    for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) {
            sum += temp[Math.min(h - 1, Math.max(0, y)) * w + x];
        }
        for (let y = 0; y < h; y++) {
            data[(y * w + x) * 4 + 3] = Math.floor(sum / (2 * radius + 1));
            sum -= temp[Math.max(0, y - radius) * w + x];
            sum += temp[Math.min(h - 1, y + radius + 1) * w + x];
        }
    }
}

// Separable Morphological Filter (Erosion = Choke, Dilation = Spread)
function applyMorphological(data: Uint8ClampedArray, w: number, h: number, radius: number, isMin: boolean) {
    if (radius < 1) return;
    const { alpha, temp } = getBuffers(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];

    // Horizontal pass
    for (let y = 0; y < h; y++) {
        const yOffset = y * w;
        for (let x = 0; x < w; x++) {
            let val = alpha[yOffset + x];
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = Math.min(w - 1, Math.max(0, x + dx));
                const a = alpha[yOffset + nx];
                if (isMin) { if (a < val) val = a; }
                else       { if (a > val) val = a; }
            }
            temp[yOffset + x] = val;
        }
    }
    // Vertical pass
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let val = temp[y * w + x];
            for (let dy = -radius; dy <= radius; dy++) {
                const ny = Math.min(h - 1, Math.max(0, y + dy));
                const a = temp[ny * w + x];
                if (isMin) { if (a < val) val = a; }
                else       { if (a > val) val = a; }
            }
            data[(y * w + x) * 4 + 3] = val;
        }
    }
}

export function applyChromaKey(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    targetColors: RGBColor[],
    similarity: number, // 0 to 100
    colorBlend: number, // 0 to 100
    edgeShift: number,  // -100 to 100 (Choke / Spread)
    edgeSoftness: number, // 0 to 100 (Blur)
    shadingTolerance: number, // 0 to 100
    contiguous: boolean = true, // Flood fill toggle
    spillSuppression: number = 0, // 0 to 100
    strokeWidth: number = 0, // 0 to 20
    strokeColor: string = '#ffffff' // hex code
) {
    if (targetColors.length === 0 || canvas.width === 0 || canvas.height === 0) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const len = data.length;
    const w = canvas.width;
    const h = canvas.height;

    // Precalculate target magnitudes for Vector Projection
    const targets = targetColors.map(c => {
        const magSq = c.r * c.r + c.g * c.g + c.b * c.b;
        return {
            ...c,
            magSq,
            mag: Math.sqrt(magSq)
        };
    });

    // Quadratic scaling gives extreme precision at low 1-10 slider values, preventing "jumpy" edges
    const thresholdScale = Math.pow(similarity / 100, 2) * 441.6;
    const smoothScale = Math.pow(colorBlend / 100, 2) * 441.6;
    const valWeight = 1.0 - (shadingTolerance / 100);

    // Primary Vector Projection Key Pass
    for (let i = 0; i < len; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let minDist = Infinity;

        for (let j = 0; j < targets.length; j++) {
            const t = targets[j];
            let colorDist = 0;
            let lumaDist = 0;

            if (t.magSq === 0) {
                colorDist = Math.sqrt(r * r + g * g + b * b);
                lumaDist = colorDist;
            } else {
                const dot = (r * t.r) + (g * t.g) + (b * t.b);
                const projScalar = Math.max(0, dot / t.magSq);

                const perpR = r - (t.r * projScalar);
                const perpG = g - (t.g * projScalar);
                const perpB = b - (t.b * projScalar);

                colorDist = Math.sqrt(perpR * perpR + perpG * perpG + perpB * perpB);

                const pixelMag = Math.sqrt(r * r + g * g + b * b);
                lumaDist = Math.abs(pixelMag - t.mag);
            }

            const dist = Math.sqrt(
                (colorDist * colorDist) +
                (lumaDist * valWeight) * (lumaDist * valWeight)
            );

            if (dist < minDist) minDist = dist;
        }

        if (minDist <= thresholdScale) {
            data[i + 3] = 0; 
        } else if (minDist < thresholdScale + smoothScale) {
            let alpha = (minDist - thresholdScale) / smoothScale;
            alpha = alpha * alpha * (3 - 2 * alpha); // Smoothstep hermite curve
            data[i + 3] = Math.floor(alpha * 255);
        } else {
            // Explicitly ensure opacity for remaining pixels
            data[i + 3] = 255; 
        }
    }

    // 1. Contiguous Keying (Hole Fill)
    if (contiguous) {
        // Find any valid positions picked by the user
        const seedPositions = targetColors
            .filter(c => c.x !== undefined && c.y !== undefined)
            .map(c => ({ x: c.x as number, y: c.y as number }));
        fillHoles(data, w, h, seedPositions);
    }

    // 2. Matte Choke (Edge Shift) via fast spatial morphological filtering
    if (edgeShift !== 0) {
        const radius = Math.floor(Math.abs(edgeShift) / 10); // scale up to 10px shift
        if (radius > 0) {
            applyMorphological(data, w, h, radius, edgeShift < 0);
        }
    }

    // 3. Matte Soften (Edge Softness) via spatial box blur
    if (edgeSoftness > 0) {
        const radius = Math.floor(edgeSoftness / 5); // scale up to 20px blur
        if (radius > 0) {
            // Dual pass approximates a true Gaussian blur while remaining extremely fast
            boxBlurAlpha(data, w, h, radius);
            boxBlurAlpha(data, w, h, radius);
        }
    }

    // 4. Spill Suppression (Color Decontamination)
    if (spillSuppression > 0 && targets.length > 0) {
        const factor = spillSuppression / 100;
        const bgR = targets[0].r;
        const bgG = targets[0].g;
        const bgB = targets[0].b;

        for (let i = 0; i < len; i += 4) {
            const alphaVal = data[i + 3];
            // Only decontaminate semi-transparent edge pixels
            if (alphaVal > 0 && alphaVal < 255) {
                const a = alphaVal / 255;
                const invA = 1.0 - a;
                
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                // Un-premultiply the background color out of the pixel
                let fgR = (r - bgR * invA) / a;
                let fgG = (g - bgG * invA) / a;
                let fgB = (b - bgB * invA) / a;

                fgR = Math.min(255, Math.max(0, fgR));
                fgG = Math.min(255, Math.max(0, fgG));
                fgB = Math.min(255, Math.max(0, fgB));

                data[i] = Math.round(r + (fgR - r) * factor);
                data[i+1] = Math.round(g + (fgG - g) * factor);
                data[i+2] = Math.round(b + (fgB - b) * factor);
            }
        }
    }

    // 5. Outline Stroke Generation
    if (strokeWidth > 0) {
        const radius = Math.floor(strokeWidth);
        const origData = new Uint8ClampedArray(data);
        
        // Dilate the alpha channel
        applyMorphological(data, w, h, radius, false);
        
        // Slightly blur the stroke for anti-aliasing
        boxBlurAlpha(data, w, h, Math.max(1, Math.floor(radius / 3)));
        
        const hex = strokeColor.replace('#', '');
        const sR = parseInt(hex.substring(0, 2), 16);
        const sG = parseInt(hex.substring(2, 4), 16);
        const sB = parseInt(hex.substring(4, 6), 16);

        // Composite stroke under the image
        for (let i = 0; i < len; i += 4) {
            const imgA = origData[i + 3] / 255;
            const strokeA = data[i + 3] / 255;
            
            if (strokeA > 0) {
                const outA = imgA + strokeA * (1.0 - imgA);
                if (outA > 0) {
                    const imgR = origData[i];
                    const imgG = origData[i + 1];
                    const imgB = origData[i + 2];

                    const outR = (imgR * imgA + sR * strokeA * (1.0 - imgA)) / outA;
                    const outG = (imgG * imgA + sG * strokeA * (1.0 - imgA)) / outA;
                    const outB = (imgB * imgA + sB * strokeA * (1.0 - imgA)) / outA;

                    data[i] = Math.min(255, outR);
                    data[i + 1] = Math.min(255, outG);
                    data[i + 2] = Math.min(255, outB);
                    data[i + 3] = Math.min(255, outA * 255);
                }
            } else {
                data[i] = origData[i];
                data[i + 1] = origData[i + 1];
                data[i + 2] = origData[i + 2];
                data[i + 3] = origData[i + 3];
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
}
