// Prepare a ChatGPT sprite sheet for the painted cast trial.
//
//   node tools/prepare_sheet.js <draft-directory> <id> [<id> ...]
//
// Reads <id>-sheet-source.png (or .jpg), splits it into its frames, removes
// the flat magenta background, and writes <id>-sheet.png: one row of equal
// cells in which every frame's feet sit on the same bottom-centre point, so
// changing frame never makes the figure jump. A preview sheet shows the
// frames side by side over light and dark grounds. Existing outputs are never
// overwritten. Inspect the preview before installing a sheet as
// icons/<id>-sheet-trial.png: image models do not keep a character perfectly
// consistent between frames.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('@playwright/test');

/* global document, Image */

// Source layout (columns x rows) and the height of frame 0 in the output.
const SHEETS = {
    goat: { cols: 4, rows: 1, height: 112 }, hattie: { cols: 4, rows: 1, height: 160 },
    corvus: { cols: 4, rows: 1, height: 96 }, fennow: { cols: 4, rows: 1, height: 176 },
    villager: { cols: 4, rows: 1, height: 160 }, gnome: { cols: 4, rows: 1, height: 112 },
    grumbold: { cols: 4, rows: 1, height: 176 }, hare: { cols: 4, rows: 1, height: 80 },
    morvane: { cols: 4, rows: 1, height: 192 }, elowen: { cols: 4, rows: 1, height: 176 },
    giant: { cols: 2, rows: 2, height: 112 }, dragon: { cols: 2, rows: 2, height: 160 }
};

async function readSource(directory, id) {
    for (const extension of ['png', 'jpg']) {
        try {
            const bytes = await fs.readFile(path.join(directory, `${id}-sheet-source.${extension}`));
            return `data:image/${extension === 'jpg' ? 'jpeg' : 'png'};base64,${bytes.toString('base64')}`;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    throw new Error(`Missing ${id}-sheet-source.png or .jpg in ${directory}`);
}

async function prepareSheets(directory, ids) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const results = [];
        for (const id of ids) {
            if (!Object.hasOwn(SHEETS, id)) throw new Error(`Unknown sheet id: ${id}`);
            const spec = SHEETS[id];
            const source = await readSource(directory, id);
            const result = await page.evaluate(async ({ source, spec }) => {
                const image = new Image();
                image.src = source;
                await image.decode();
                const W = image.naturalWidth, H = image.naturalHeight;
                const whole = document.createElement('canvas');
                whole.width = W;
                whole.height = H;
                const wctx = whole.getContext('2d');
                wctx.drawImage(image, 0, 0);
                const all = wctx.getImageData(0, 0, W, H).data;
                const keyAt = (d, i) => {
                    const r = d[i], g = d[i + 1], b = d[i + 2];
                    return r > 110 && b > 110 && Math.min(r, b) - g > 60 && Math.abs(r - b) < 110;
                };
                // The model rarely spaces frames exactly on the grid, so split
                // at the emptiest line near each nominal boundary instead.
                const cuts = (count, length, span, occupied) => {
                    const edges = [0];
                    for (let k = 1; k < count; k++) {
                        const nominal = Math.round(k * length / count);
                        const reach = Math.round(length / count * 0.2);
                        let best = nominal, bestScore = Infinity;
                        for (let v = nominal - reach; v <= nominal + reach; v++) {
                            let score = 0;
                            for (let u = 0; u < span; u++) if (occupied(v, u)) score++;
                            score = score * 1000 + Math.abs(v - nominal);
                            if (score < bestScore) { bestScore = score; best = v; }
                        }
                        edges.push(best);
                    }
                    edges.push(length);
                    return edges;
                };
                const xs = cuts(spec.cols, W, H, (x, y) => !keyAt(all, (y * W + x) * 4));
                const ys = cuts(spec.rows, H, W, (y, x) => !keyAt(all, (y * W + x) * 4));
                const frames = [];
                for (let row = 0; row < spec.rows; row++) {
                    for (let col = 0; col < spec.cols; col++) {
                        const cellW = xs[col + 1] - xs[col];
                        const cellH = ys[row + 1] - ys[row];
                        const canvas = document.createElement('canvas');
                        canvas.width = cellW;
                        canvas.height = cellH;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(image, xs[col], ys[row], cellW, cellH, 0, 0, cellW, cellH);
                        const data = ctx.getImageData(0, 0, cellW, cellH);
                        const px = data.data;
                        // Magenta and its shaded or anti-aliased fringes.
                        const isKey = (i) => keyAt(px, i);
                        const isPure = (i) => px[i] > 200 && px[i + 2] > 200 && px[i + 1] < 90;
                        // Flood the background from the cell border so enclosed
                        // dark detail is never keyed, then drop any stray pure key.
                        const bg = new Uint8Array(cellW * cellH);
                        const queue = new Int32Array(cellW * cellH * 4 + cellW * 4 + cellH * 4);
                        let head = 0, tail = 0;
                        for (let x = 0; x < cellW; x++) { queue[tail++] = x; queue[tail++] = (cellH - 1) * cellW + x; }
                        for (let y = 0; y < cellH; y++) { queue[tail++] = y * cellW; queue[tail++] = y * cellW + cellW - 1; }
                        // Enclosed holes (between a leg and a tail) are seeded from
                        // their pure-magenta core so their fringes are keyed too.
                        const seeds = [];
                        for (let p = 0; p < cellW * cellH; p++) if (isPure(p * 4)) seeds.push(p);
                        for (;;) {
                            if (head >= tail) {
                                if (!seeds.length) break;
                                head = tail = 0;
                                queue[tail++] = seeds.pop();
                            }
                            const p = queue[head++];
                            if (bg[p] || !isKey(p * 4)) continue;
                            bg[p] = 1;
                            const x = p % cellW, y = (p - x) / cellW;
                            if (x > 0) queue[tail++] = p - 1;
                            if (x < cellW - 1) queue[tail++] = p + 1;
                            if (y > 0) queue[tail++] = p - cellW;
                            if (y < cellH - 1) queue[tail++] = p + cellW;
                            if (tail > queue.length - 4) break;
                        }
                        let left = cellW, right = -1, top = cellH, bottom = -1;
                        for (let p = 0; p < bg.length; p++) {
                            const i = p * 4;
                            if (bg[p] || isPure(i)) { px[i + 3] = 0; continue; }
                            const x = p % cellW, y = (p - x) / cellW;
                            if (x < left) left = x;
                            if (x > right) right = x;
                            if (y < top) top = y;
                            if (y > bottom) bottom = y;
                        }
                        // Despill: an edge pixel still tinted by the key is outline
                        // mixed with magenta; neutralise it to a dark edge.
                        for (let p = 0; p < bg.length; p++) {
                            const i = p * 4;
                            if (!px[i + 3] || Math.min(px[i], px[i + 2]) - px[i + 1] <= 25) continue;
                            const x = p % cellW, y = (p - x) / cellW;
                            let edge = false;
                            for (let dy = -1; dy <= 1 && !edge; dy++) {
                                for (let dx = -1; dx <= 1 && !edge; dx++) {
                                    const nx = x + dx, ny = y + dy;
                                    edge = nx < 0 || ny < 0 || nx >= cellW || ny >= cellH || !px[(ny * cellW + nx) * 4 + 3];
                                }
                            }
                            if (!edge) continue;
                            const v = Math.round(px[i + 1] * 0.8 + 10);
                            px[i] = px[i + 1] = px[i + 2] = v;
                        }
                        ctx.putImageData(data, 0, 0);
                        if (right < 0) throw new Error('A frame is empty after keying');
                        // Feet: mean column of the lowest 8% of the figure.
                        const footTop = bottom - Math.max(2, Math.round((bottom - top) * 0.08));
                        let sum = 0, count = 0;
                        for (let y = footTop; y <= bottom; y++) {
                            for (let x = left; x <= right; x++) {
                                if (px[(y * cellW + x) * 4 + 3]) { sum += x; count++; }
                            }
                        }
                        frames.push({ canvas, left, right, top, bottom, anchorX: count ? sum / count : (left + right) / 2 });
                    }
                }
                const scale = spec.height / (frames[0].bottom - frames[0].top + 1);
                const halfW = Math.max(...frames.map(f => Math.max(f.anchorX - f.left, f.right - f.anchorX))) * scale;
                const outW = Math.ceil(halfW * 2) + 8;
                const outH = Math.ceil(Math.max(...frames.map(f => f.bottom - f.top + 1)) * scale) + 6;
                const sheet = document.createElement('canvas');
                sheet.width = outW * frames.length;
                sheet.height = outH;
                const out = sheet.getContext('2d');
                out.imageSmoothingEnabled = true;
                out.imageSmoothingQuality = 'high';
                frames.forEach((f, index) => {
                    const dx = index * outW + outW / 2 - f.anchorX * scale;
                    const dy = outH - 2 - (f.bottom + 1) * scale;
                    out.drawImage(f.canvas, dx, dy, f.canvas.width * scale, f.canvas.height * scale);
                });
                // Smoothing softens the silhouette; snap alpha back to hard pixels.
                const pixels = out.getImageData(0, 0, sheet.width, sheet.height);
                for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] < 110 ? 0 : 255;
                out.putImageData(pixels, 0, 0);
                const preview = document.createElement('canvas');
                preview.width = sheet.width;
                preview.height = sheet.height * 2 + 12;
                const pv = preview.getContext('2d');
                pv.fillStyle = '#c2c9c4'; pv.fillRect(0, 0, preview.width, sheet.height);
                pv.fillStyle = '#202326'; pv.fillRect(0, sheet.height + 12, preview.width, sheet.height);
                pv.drawImage(sheet, 0, 0);
                pv.drawImage(sheet, 0, sheet.height + 12);
                pv.strokeStyle = '#ff3b3b';
                for (let i = 0; i < frames.length; i++) {
                    pv.beginPath(); pv.moveTo(i * outW + outW / 2, 0); pv.lineTo(i * outW + outW / 2, preview.height); pv.stroke();
                }
                return { png: sheet.toDataURL('image/png'), preview: preview.toDataURL('image/png'),
                    frames: frames.length, cellWidth: outW, cellHeight: outH };
            }, { source, spec });
            await fs.writeFile(path.join(directory, `${id}-sheet.png`), Buffer.from(result.png.split(',')[1], 'base64'), { flag: 'wx' });
            await fs.writeFile(path.join(directory, `${id}-sheet-preview.png`), Buffer.from(result.preview.split(',')[1], 'base64'), { flag: 'wx' });
            results.push({ id, frames: result.frames, cellWidth: result.cellWidth, cellHeight: result.cellHeight });
        }
        return results;
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    const [directory, ...ids] = process.argv.slice(2);
    if (!directory || !ids.length) {
        console.error('Usage: node tools/prepare_sheet.js <draft-directory> <id> [<id> ...]');
        process.exitCode = 1;
    } else {
        prepareSheets(directory, ids)
            .then(results => console.log(JSON.stringify(results, null, 2)))
            .catch(error => { console.error(error.message); process.exitCode = 1; });
    }
}

module.exports = { prepareSheets, SHEETS };
