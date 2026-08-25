export function applyPaletteDithered(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    palette: number[][]
): Uint8Array {
    const length = width * height;
    const index = new Uint8Array(length);
    
    // Float32Array to accumulate errors
    const errData = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        errData[i] = data[i];
    }

    // Cache to speed up nearest color lookup
    // rgb565 gives 65536 colors, which is a good cache size
    const cacheArr = new Int32Array(65536).fill(-1);
    
    // Find transparent color index in palette if any
    let transparentIndex = -1;
    for (let p = 0; p < palette.length; p++) {
        if (palette[p][3] !== undefined && palette[p][3] < 128) {
            transparentIndex = p;
            break;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            // Clamp accumulated values
            const r = Math.max(0, Math.min(255, errData[i]));
            const g = Math.max(0, Math.min(255, errData[i+1]));
            const b = Math.max(0, Math.min(255, errData[i+2]));
            const a = Math.max(0, Math.min(255, errData[i+3]));
            
            let minIndex = 0;
            
            // Treat as transparent if alpha < 128
            if (a < 128 && transparentIndex !== -1) {
                minIndex = transparentIndex;
            } else {
                // Cache key based on rgb565
                const key = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
                minIndex = cacheArr[key];
                
                if (minIndex === -1) {
                    let minDist = Infinity;
                    for (let p = 0; p < palette.length; p++) {
                        // Skip transparent palette entries for opaque pixels
                        if (palette[p][3] < 128) continue;
                        
                        const pr = palette[p][0];
                        const pg = palette[p][1];
                        const pb = palette[p][2];
                        
                        const dr = r - pr;
                        const dg = g - pg;
                        const db = b - pb;
                        const dist = dr*dr + dg*dg + db*db;
                        if (dist < minDist) {
                            minDist = dist;
                            minIndex = p;
                        }
                    }
                    // If no opaque color found, fallback to 0
                    if (minIndex === -1) minIndex = 0;
                    cacheArr[key] = minIndex;
                }
            }
            
            index[y * width + x] = minIndex;
            
            // Calculate error
            const pColor = palette[minIndex];
            const errR = r - pColor[0];
            const errG = g - pColor[1];
            const errB = b - pColor[2];
            
            // Error diffusion (Floyd-Steinberg)
            // We only diffuse RGB, not Alpha since Alpha is 1-bit
            if (a >= 128) {
                if (x + 1 < width) {
                    const idx = i + 4;
                    errData[idx] += errR * 7/16;
                    errData[idx+1] += errG * 7/16;
                    errData[idx+2] += errB * 7/16;
                }
                if (y + 1 < height) {
                    if (x - 1 >= 0) {
                        const idx = i + width * 4 - 4;
                        errData[idx] += errR * 3/16;
                        errData[idx+1] += errG * 3/16;
                        errData[idx+2] += errB * 3/16;
                    }
                    const idx = i + width * 4;
                    errData[idx] += errR * 5/16;
                    errData[idx+1] += errG * 5/16;
                    errData[idx+2] += errB * 5/16;
                    
                    if (x + 1 < width) {
                        const idx2 = i + width * 4 + 4;
                        errData[idx2] += errR * 1/16;
                        errData[idx2+1] += errG * 1/16;
                        errData[idx2+2] += errB * 1/16;
                    }
                }
            }
        }
    }
    
    return index;
}
