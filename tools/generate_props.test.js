const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { prepareProps, DRESSING } = require('./generate_props');

/* global document, Image */

for (const background of ['#ff00ff', '#ffffff', '#aa2864']) {
test(`prop preparation removes ${background} and handle holes, preserves anchors and refuses overwrite`, async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'crownquest-props-'));
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const fixture = await page.evaluate(background => {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, 200, 200);
            if (background === '#ffffff') {
                ctx.fillStyle = '#a0a09c';
                ctx.fillRect(40, 160, 130, 25);
            }
            if (background === '#aa2864') {
                ctx.fillStyle = '#50102e';
                ctx.fillRect(40, 160, 130, 25);
            }
            ctx.fillStyle = '#705035';
            ctx.fillRect(50, 30, 100, 140);
            ctx.fillStyle = background;
            ctx.fillRect(70, 40, 60, 40);
            return canvas.toDataURL('image/png').split(',')[1];
        }, background);
        for (const id of ['bread', 'pail']) {
            await fs.writeFile(path.join(directory, `${id}-source.png`), Buffer.from(fixture, 'base64'));
        }
        const metadata = await prepareProps(directory);
        assert.deepEqual(metadata.map(prop => prop.anchor), [{ x: 48, y: 46 }, { x: 48, y: 126 }]);
        const png = await fs.readFile(path.join(directory, 'pail.png'));
        const pixels = await page.evaluate(async base64 => {
            const image = new Image();
            image.src = 'data:image/png;base64,' + base64;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const alpha = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
            return { width: image.width, height: image.height, corner: alpha(0, 0),
                hole: alpha(48, 28), body: alpha(48, 100), base: alpha(48, 125), margin: alpha(48, 126) };
        }, png.toString('base64'));
        assert.deepEqual(pixels, { width: 96, height: 128, corner: 0, hole: 0, body: 255, base: 255, margin: 0 });
        assert.ok((await fs.stat(path.join(directory, 'preview.png'))).size > 0);
        await assert.rejects(prepareProps(directory), { code: 'EEXIST' });
        assert.deepEqual(await fs.readFile(path.join(directory, 'pail.png')), png);
    } finally {
        await browser.close();
        await fs.rm(directory, { recursive: true, force: true });
    }
});
}

test('prop preparation rejects an opaque non-keyed background', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'crownquest-props-invalid-'));
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const fixture = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#888888';
            ctx.fillRect(0, 0, 100, 100);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        await fs.writeFile(path.join(directory, 'bread-source.png'), Buffer.from(fixture, 'base64'));
        await assert.rejects(prepareProps(directory), /expected an isolated object/);
        await assert.rejects(fs.access(path.join(directory, 'bread.png')), { code: 'ENOENT' });
    } finally {
        await browser.close();
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test('dressing batch applies crop recipes and preserves enclosed dark cover colors', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'crownquest-dressing-'));
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const fixture = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 200; canvas.height = 200;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#aa2864'; ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#705035'; ctx.fillRect(40, 40, 120, 120);
            ctx.fillRect(90, 20, 20, 10);
            ctx.fillStyle = '#70254b'; ctx.fillRect(70, 70, 60, 60);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        for (const { id } of DRESSING) {
            await fs.writeFile(path.join(directory, id + '-source.png'), Buffer.from(fixture, 'base64'));
        }
        await fs.writeFile(path.join(directory, 'cleanup.json'), JSON.stringify({ candle: { top: 40 }, ledger: { top: 40, bottom: 160, stretch: true } }));
        const metadata = await prepareProps(directory, DRESSING);
        assert.equal(metadata.length, 4);
        assert.deepEqual(metadata.find(prop => prop.id === 'candle').bounds, { left: 40, top: 40, width: 120, height: 120 });
        const ledger = await fs.readFile(path.join(directory, 'ledger.png'));
        const pixels = await page.evaluate(async source => {
            const image = new Image();
            image.src = 'data:image/png;base64,' + source;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width; canvas.height = image.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
            return { center: Array.from(ctx.getImageData(80, 40, 1, 1).data), edge: ctx.getImageData(2, 2, 1, 1).data[3] };
        }, ledger.toString('base64'));
        assert.deepEqual(pixels, { center: [112, 37, 75, 255], edge: 255 });
    } finally {
        await browser.close();
        await fs.rm(directory, { recursive: true, force: true });
    }
});