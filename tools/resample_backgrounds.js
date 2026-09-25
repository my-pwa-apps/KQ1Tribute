// Resample painted room backgrounds to the game's 320x200 scene raster.
//
//   node tools/resample_backgrounds.js <image> [<image> ...]
//
// The engine rasterises every room at 320x200 with nearest-neighbour sampling,
// so a 1586-pixel painting drawn straight in keeps one source pixel in about
// twenty-five and its fine detail turns to speckle. Averaging the picture down
// once, in halving steps with smoothing, keeps its tones instead. Each file is
// rewritten in place at 320x200; keep the generated source in art-drafts/.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('@playwright/test');

/* global document, Image */

const TARGET = { width: 320, height: 200 };

async function resample(files) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const results = [];
        for (const file of files) {
            const bytes = await fs.readFile(file);
            const type = path.extname(file).toLowerCase() === '.jpg' ? 'jpeg' : 'png';
            const out = await page.evaluate(async ({ source, target }) => {
                const image = new Image();
                image.src = source;
                await image.decode();
                let canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);
                // Halve until the next step would pass the target, then finish.
                while (canvas.width / 2 >= target.width) {
                    const next = document.createElement('canvas');
                    next.width = Math.round(canvas.width / 2);
                    next.height = Math.round(canvas.height / 2);
                    const ctx = next.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(canvas, 0, 0, next.width, next.height);
                    canvas = next;
                }
                const final = document.createElement('canvas');
                final.width = target.width;
                final.height = target.height;
                const ctx = final.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(canvas, 0, 0, target.width, target.height);
                return { png: final.toDataURL('image/png'), from: [image.naturalWidth, image.naturalHeight] };
            }, { source: `data:image/${type};base64,${bytes.toString('base64')}`, target: TARGET });
            if (out.from[0] === TARGET.width && out.from[1] === TARGET.height) {
                results.push({ file, skipped: 'already 320x200' });
                continue;
            }
            const png = Buffer.from(out.png.split(',')[1], 'base64');
            await fs.writeFile(file, png);
            results.push({ file, from: out.from.join('x'), bytes: png.length });
        }
        return results;
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    const files = process.argv.slice(2);
    if (!files.length) {
        console.error('Usage: node tools/resample_backgrounds.js <image> [<image> ...]');
        process.exitCode = 1;
    } else {
        resample(files)
            .then(results => console.log(JSON.stringify(results, null, 2)))
            .catch(error => { console.error(error.message); process.exitCode = 1; });
    }
}

module.exports = { resample, TARGET };
