const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

/* global document, Image */

async function main() {
    const source = process.argv[2];
    if (!source) throw new Error('Usage: node tools/prepare_rowan_trial.js <source-directory> [--write]');
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const names = ['ROWAN.png', 'ROWANRIGHT WALK.png', 'ROWANLEFT WALK.png', 'ROWANFRONT Walk.png', 'ROWANBACK Walk.png'];
        const images = names.map(name => fs.readFileSync(path.join(source, name)).toString('base64'));
        const result = await page.evaluate(async (sources) => {
            const atlas = document.createElement('canvas');
            atlas.width = 8 * 96;
            atlas.height = 5 * 128;
            const target = atlas.getContext('2d');
            target.imageSmoothingQuality = 'high';
            const report = [];
            for (let row = 0; row < sources.length; row++) {
                const image = new Image();
                image.src = 'data:image/png;base64,' + sources[row];
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = data.data;
                const count = canvas.width * canvas.height;
                const mask = new Uint8Array(count);
                let transparent = 0;
                for (let index = 0; index < count; index++) {
                    const offset = index * 4;
                    if (pixels[offset + 3] < 16) transparent++;
                }
                const baked = transparent < count / 10;
                for (let index = 0; index < count; index++) {
                    const offset = index * 4;
                    const low = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
                    const high = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
                    const background = baked && low > 145 && high - low < 22;
                    if (background) pixels[offset + 3] = 0;
                    mask[index] = pixels[offset + 3] > 64 ? 1 : 0;
                }
                const queue = new Int32Array(count);
                const components = [];
                for (let index = 0; index < count; index++) {
                    if (!mask[index]) continue;
                    let head = 0, tail = 1;
                    queue[0] = index;
                    mask[index] = 0;
                    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
                    while (head < tail) {
                        const pixel = queue[head++];
                        const x = pixel % canvas.width, y = Math.floor(pixel / canvas.width);
                        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                        for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < canvas.width ? pixel + 1 : -1,
                            y > 0 ? pixel - canvas.width : -1, y + 1 < canvas.height ? pixel + canvas.width : -1]) {
                            if (next >= 0 && mask[next]) { mask[next] = 0; queue[tail++] = next; }
                        }
                    }
                    if (tail > 10000) components.push({ minX, maxX, minY, maxY, area: tail });
                }
                components.sort((first, second) => first.minX - second.minX);
                const expected = row === 0 ? 4 : 8;
                if (components.length !== expected) throw new Error(`Row ${row}: expected ${expected} figures, found ${JSON.stringify(components)}`);
                ctx.putImageData(data, 0, 0);
                const sourceHeight = Math.max(...components.map(frame => frame.maxY - frame.minY + 1));
                const scale = 100 / sourceHeight;
                components.forEach((frame, column) => {
                    const width = frame.maxX - frame.minX + 1, height = frame.maxY - frame.minY + 1;
                    const beltY = Math.round(frame.minY + height * 0.46);
                    let beltLeft = canvas.width, beltRight = 0;
                    for (let x = frame.minX; x <= frame.maxX; x++) {
                        if (pixels[(beltY * canvas.width + x) * 4 + 3] > 128) {
                            beltLeft = Math.min(beltLeft, x); beltRight = Math.max(beltRight, x);
                        }
                    }
                    const pivot = (beltLeft + beltRight) / 2;
                    target.drawImage(canvas, frame.minX, frame.minY, width, height,
                        column * 96 + 48 + (frame.minX - pivot) * scale,
                        row * 128 + 116 - height * scale, width * scale, height * scale);
                });
                report.push({ row, width: canvas.width, height: canvas.height, baked, components });
            }
            return { report, png: atlas.toDataURL('image/png').split(',')[1] };
        }, images);
        console.log(JSON.stringify(result.report, null, 2));
        if (process.argv.includes('--write')) {
            fs.writeFileSync(path.join(__dirname, '../icons/rowan-atlas-trial.png'), Buffer.from(result.png, 'base64'));
        }
    } finally {
        await browser.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });