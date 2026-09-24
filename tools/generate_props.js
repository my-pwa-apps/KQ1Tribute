const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { generateBackground } = require('./generate_background');

/* global document, Image */

const PROPS = [
    { id: 'bread', width: 96, height: 48, sceneWidth: 30, sceneHeight: 15 },
    { id: 'pail', width: 96, height: 128, sceneWidth: 54, sceneHeight: 72 }
];

const DRESSING = [
    { id: 'crock', width: 96, height: 112, sceneWidth: 26, sceneHeight: 28 },
    { id: 'candle', width: 128, height: 128, sceneWidth: 30, sceneHeight: 30 },
    { id: 'ledger', width: 160, height: 80, sceneWidth: 62, sceneHeight: 26 },
    { id: 'spellbook', width: 96, height: 128, sceneWidth: 26, sceneHeight: 32 }
];

// Batches written for the ChatGPT browser workflow: their prompts live in
// tools/art-prompts/<batch>/<id>.txt. Scene sizes are the procedural art's
// on-screen size, for the preview sheet only.
const ITEMS = [
    { id: 'sea_salt', width: 96, height: 80, sceneWidth: 20, sceneHeight: 16 },
    { id: 'brass_key', width: 128, height: 64, sceneWidth: 24, sceneHeight: 12 },
    { id: 'raven_feather', width: 128, height: 64, sceneWidth: 36, sceneHeight: 14 },
    { id: 'thimble', width: 80, height: 96, sceneWidth: 16, sceneHeight: 20 },
    { id: 'rope', width: 112, height: 96, sceneWidth: 30, sceneHeight: 26 },
    { id: 'parchment', width: 96, height: 112, sceneWidth: 22, sceneHeight: 24 },
    { id: 'ring_of_mist', width: 96, height: 96, sceneWidth: 14, sceneHeight: 14 },
    { id: 'chest_of_cormac', width: 128, height: 112, sceneWidth: 36, sceneHeight: 30 },
    { id: 'shield_of_ardor', width: 128, height: 128, sceneWidth: 44, sceneHeight: 44 },
    { id: 'mirror_of_ianthe', width: 96, height: 128, sceneWidth: 26, sceneHeight: 34 }
].map(prop => ({ ...prop, batch: 'items' }));

const CHARACTERS = [
    { id: 'morvane', width: 96, height: 192, sceneWidth: 40, sceneHeight: 84 },
    { id: 'hattie', width: 96, height: 160, sceneWidth: 40, sceneHeight: 70 },
    { id: 'fennow', width: 80, height: 176, sceneWidth: 32, sceneHeight: 72 },
    { id: 'elowen', width: 80, height: 176, sceneWidth: 32, sceneHeight: 72 },
    { id: 'villager', width: 80, height: 160, sceneWidth: 30, sceneHeight: 60 },
    { id: 'gnome', width: 96, height: 112, sceneWidth: 34, sceneHeight: 40 },
    { id: 'corvus', width: 96, height: 96, sceneWidth: 30, sceneHeight: 30 },
    { id: 'goat', width: 160, height: 112, sceneWidth: 70, sceneHeight: 50 },
    { id: 'hare', width: 112, height: 80, sceneWidth: 34, sceneHeight: 22 },
    { id: 'grumbold', width: 160, height: 176, sceneWidth: 70, sceneHeight: 78 },
    { id: 'giant', width: 280, height: 112, sceneWidth: 230, sceneHeight: 80 },
    { id: 'dragon', width: 280, height: 160, sceneWidth: 260, sceneHeight: 110 }
].map(prop => ({ ...prop, batch: 'characters' }));

const BATCHES = { '--dressing': DRESSING, '--items': ITEMS, '--characters': CHARACTERS };

async function prepareProps(directory, props = PROPS) {
    let cleanup = {};
    try { cleanup = JSON.parse(await fs.readFile(path.join(directory, 'cleanup.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const prepared = [];
        for (const prop of props) {
            let source;
            for (const extension of ['png', 'jpg']) {
                try {
                    const bytes = await fs.readFile(path.join(directory, `${prop.id}-source.${extension}`));
                    source = `data:image/${extension === 'jpg' ? 'jpeg' : 'png'};base64,${bytes.toString('base64')}`;
                    break;
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                }
            }
            if (!source) throw new Error(`Missing ${prop.id}-source.png or .jpg in the draft directory.`);
            const recipe = Object.hasOwn(cleanup, prop.id) ? cleanup[prop.id] : {};
            const result = await page.evaluate(async ({ source, prop, recipe }) => {
                const image = new Image();
                image.src = source;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const cropTop = recipe.top ?? 0, cropBottom = recipe.bottom ?? canvas.height;
                if (!Number.isInteger(cropTop) || !Number.isInteger(cropBottom)
                    || cropTop < 0 || cropBottom > canvas.height || cropTop >= cropBottom) {
                    throw new Error(`${prop.id}: invalid cleanup crop.`);
                }
                const whiteBackground = [0, canvas.width - 1, (canvas.height - 1) * canvas.width,
                    canvas.width * canvas.height - 1].every(pixel => {
                    const offset = pixel * 4;
                    return Math.min(...data.data.slice(offset, offset + 3)) > 235;
                });
                const whiteMask = new Uint8Array(canvas.width * canvas.height);
                const corner = data.data.slice(0, 3);
                const magentaBackground = corner[0] - corner[1] > 35 && corner[2] - corner[1] > 20;
                if (whiteBackground || magentaBackground) {
                    const queue = new Int32Array(whiteMask.length);
                    let head = 0, tail = 0;
                    for (let pixel = 0; pixel < whiteMask.length; pixel++) {
                        const offset = pixel * 4;
                        const low = Math.min(...data.data.slice(offset, offset + 3));
                        const high = Math.max(...data.data.slice(offset, offset + 3));
                        const red = data.data[offset], green = data.data[offset + 1], blue = data.data[offset + 2];
                        const candidate = whiteBackground ? low > 145 && high - low < 28
                            : red - green > 35 && blue - green > 20;
                        const edge = pixel < canvas.width || pixel >= whiteMask.length - canvas.width
                            || pixel % canvas.width === 0 || pixel % canvas.width === canvas.width - 1;
                        const seed = whiteBackground ? low > 235
                            : edge || Math.abs(red - corner[0]) + Math.abs(green - corner[1]) + Math.abs(blue - corner[2]) < 40;
                        if (candidate) {
                            whiteMask[pixel] = seed ? 2 : 1;
                            if (whiteMask[pixel] === 2) queue[tail++] = pixel;
                        }
                    }
                    while (head < tail) {
                        const pixel = queue[head++];
                        const column = pixel % canvas.width;
                        for (const next of [column > 0 ? pixel - 1 : -1,
                            column + 1 < canvas.width ? pixel + 1 : -1,
                            pixel >= canvas.width ? pixel - canvas.width : -1,
                            pixel + canvas.width < whiteMask.length ? pixel + canvas.width : -1]) {
                            if (next >= 0 && whiteMask[next] === 1) {
                                whiteMask[next] = 2;
                                queue[tail++] = next;
                            }
                        }
                    }
                }
                let removed = 0;
                let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
                for (let pixel = 0; pixel < data.data.length / 4; pixel++) {
                    const offset = pixel * 4;
                    const red = data.data[offset], green = data.data[offset + 1], blue = data.data[offset + 2];
                    const keyed = red > 100 && blue > 100 && Math.min(red, blue) - green > 65;
                    const row = Math.floor(pixel / canvas.width);
                    if (keyed || whiteMask[pixel] === 2 || data.data[offset + 3] < 32 || row < cropTop || row >= cropBottom) {
                        data.data[offset] = data.data[offset + 1] = data.data[offset + 2] = data.data[offset + 3] = 0;
                        removed++;
                        continue;
                    }
                    const column = pixel % canvas.width;
                    left = Math.min(left, column); right = Math.max(right, column);
                    top = Math.min(top, row); bottom = Math.max(bottom, row);
                }
                if (right < left) throw new Error(`${prop.id}: no object remains after background removal.`);
                if (removed < canvas.width * canvas.height * 0.1
                    || left === 0 || top === 0 || right === canvas.width - 1 || bottom === canvas.height - 1) {
                    throw new Error(`${prop.id}: expected an isolated object with transparent, magenta or white margins; inspect the source.`);
                }
                ctx.putImageData(data, 0, 0);
                const sprite = document.createElement('canvas');
                sprite.width = prop.width;
                sprite.height = prop.height;
                const target = sprite.getContext('2d');
                target.imageSmoothingEnabled = false;
                const width = right - left + 1, height = bottom - top + 1;
                const scale = Math.min((prop.width - 4) / width, (prop.height - 4) / height);
                const drawWidth = recipe.stretch ? prop.width - 4 : Math.max(1, Math.round(width * scale));
                const drawHeight = recipe.stretch ? prop.height - 4 : Math.max(1, Math.round(height * scale));
                target.drawImage(canvas, left, top, width, height,
                    Math.floor((prop.width - drawWidth) / 2), prop.height - 2 - drawHeight, drawWidth, drawHeight);
                return { png: sprite.toDataURL('image/png'), bounds: { left, top, width, height },
                        anchor: { x: prop.width / 2, y: prop.height - 2 }, cleanup: recipe };
                    }, { source, prop, recipe });
            prepared.push({ ...prop, ...result });
        }
        const proof = await page.evaluate(async (props) => {
            const canvas = document.createElement('canvas');
            canvas.width = props.length * 320;
            canvas.height = 360;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#24282b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;
            for (let index = 0; index < props.length; index++) {
                const prop = props[index];
                const image = new Image();
                image.src = prop.png;
                await image.decode();
                const left = index * 320;
                ctx.fillStyle = '#bcc7c3';
                ctx.fillRect(left + 16, 40, 288, 150);
                ctx.drawImage(image, left + 30, 180 - prop.height);
                ctx.drawImage(image, left + 190, 180 - prop.sceneHeight, prop.sceneWidth, prop.sceneHeight);
                ctx.drawImage(image, left + 190, 300 - prop.sceneHeight, prop.sceneWidth, prop.sceneHeight);
                ctx.font = '16px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(prop.id, left + 16, 24);
                ctx.fillText('sprite / scene-size previews', left + 16, 336);
            }
            return canvas.toDataURL('image/png');
        }, prepared);
        const files = prepared.map(prop => [prop.id + '.png', prop.png]);
        files.push(['preview.png', proof]);
        for (const [name, dataUrl] of files) {
            await fs.writeFile(path.join(directory, name), Buffer.from(dataUrl.split(',')[1], 'base64'), { flag: 'wx' });
        }
        const metadata = prepared.map(({ png: _png, ...prop }) => prop);
        await fs.writeFile(path.join(directory, 'props.json'), JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
        return metadata;
    } finally {
        await browser.close();
    }
}

async function main() {
    const [directory, ...args] = process.argv.slice(2);
    const only = args.find(option => option.startsWith('--only='));
    const options = args.filter(option => option !== only);
    const batchFlags = options.filter(option => Object.hasOwn(BATCHES, option));
    if (!directory || options.some(option => !['--generate', '--prepare-only', ...Object.keys(BATCHES)].includes(option))
        || new Set(options).size !== options.length || batchFlags.length > 1
        || (options.includes('--generate') && options.includes('--prepare-only'))) {
        throw new Error('Usage: node tools/generate_props.js <new-draft-directory> [--generate|--prepare-only] [--dressing|--items|--characters] [--only=id,id]');
    }
    const mode = options.find(option => !Object.hasOwn(BATCHES, option));
    let props = batchFlags.length ? BATCHES[batchFlags[0]] : PROPS;
    if (only) {
        const ids = only.slice('--only='.length).split(',').filter(Boolean);
        const unknown = ids.filter(id => !props.some(prop => prop.id === id));
        if (!ids.length || unknown.length) throw new Error(`Unknown prop id for this batch: ${unknown.join(', ') || '(none given)'}`);
        props = props.filter(prop => ids.includes(prop.id));
    }
    if (mode === '--prepare-only') {
        console.log(JSON.stringify(await prepareProps(directory, props), null, 2));
        return;
    }
    if (mode === '--generate') {
        if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID || '')
            || !process.env.CLOUDFLARE_API_TOKEN || /\s/.test(process.env.CLOUDFLARE_API_TOKEN)) {
            throw new Error('Configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in this terminal first.');
        }
        await fs.mkdir(path.dirname(path.resolve(directory)), { recursive: true });
        await fs.mkdir(directory);
    }
    for (const prop of props) {
        const result = await generateBackground({
            promptPath: path.join(__dirname, 'art-prompts', ...(prop.batch ? [prop.batch] : []), prop.id + '.txt'),
            outputBase: path.join(directory, prop.id + '-source'),
            generate: mode === '--generate'
        });
        console.log(JSON.stringify({ prop: prop.id, ...result }, null, 2));
    }
    if (mode === '--generate') console.log(JSON.stringify(await prepareProps(directory, props), null, 2));
}

if (require.main === module) {
    main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { prepareProps, DRESSING, ITEMS, CHARACTERS };