// ============================================================
// CROWN QUEST - PAINTED ACTOR TRIALS
// The supplied Rowan sprite atlas and the ChatGPT-painted cast, loaded only
// with ?actors=painted or ?scenery=painted. Every drawing helper returns
// false when its image is unavailable so the procedural cel is drawn instead.
// ============================================================

/* eslint-disable no-unused-vars -- consumed by js/game.js and the room modules */

function createRowanSpriteTrial() {
    const atlas = new Image();
    let ready = false;
    const draw = (ctx, engineRef) => {
        if (!ready) return false;
        const scale = engineRef.playerSpriteScale(Math.round(engineRef.playerY));
        const ratio = 37.8 * scale * 1.5 / 100;
        const walking = engineRef.playerWalking;
        const left = engineRef.playerFacing === 'left';
        const phase = (engineRef.playerFrame + Math.min(engineRef.playerFrameTimer / 110, 0.999)) / 6;
        const frame = walking ? Math.floor(phase * 8) % 8
            : engineRef.playerFacing === 'toward' ? 0
                : engineRef.playerFacing === 'away' ? 2 : left ? 3 : 1;
        const row = !walking ? 0 : engineRef.playerFacing === 'toward' ? 3
            : engineRef.playerFacing === 'away' ? 4 : left ? 2 : 1;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(engineRef.playerX), Math.round(engineRef.playerY) + 12 * scale);
        ctx.drawImage(rasterSprite(atlas, frame * 96, row * 128, 96, 128, 96 * ratio, 128 * ratio),
            -48 * ratio, -116 * ratio, 96 * ratio, 128 * ratio);
        ctx.restore();
        return true;
    };
    // Also waits for the painted cast, so a first frame never mixes painted
    // and procedural actors.
    draw.ready = Promise.all([new Promise(resolve => {
        atlas.onload = () => { ready = true; resolve(true); };
        atlas.onerror = () => resolve(false);
        atlas.src = 'icons/rowan-atlas-trial.png';
    }), PAINTED_CAST_READY]).then(([loaded]) => loaded);
    return draw;
}

// ========== PAINTED CAST TRIAL ==========

/** Idle animation for the painted cast. Each sheet is a row of equal cells
 *  prepared by tools/prepare_sheet.js, every frame anchored at the same
 *  bottom-centre point so a frame change never makes the figure jump.
 *  `beats` is the loop: [frame, milliseconds] pairs, holding the neutral
 *  frame most of the time the way Sierra idles did. */
const PAINTED_SHEETS = {
    goat: { frames: 4, beats: [[0, 420], [1, 260], [0, 300], [1, 260], [0, 900], [2, 360], [0, 700], [3, 900]] },
    hattie: { frames: 4, beats: [[0, 2400], [1, 700], [0, 900], [2, 1100], [3, 500], [0, 1600]] },
    corvus: { frames: 4, beats: [[0, 1800], [1, 900], [0, 600], [2, 300], [0, 1400], [3, 500]] },
    fennow: { frames: 4, beats: [[0, 1400], [1, 500], [2, 900], [1, 500], [0, 1200], [3, 700]] },
    villager: { frames: 4, beats: [[0, 2200], [2, 1500], [0, 1800], [2, 900]] },
    gnome: { frames: 4, beats: [[0, 2000], [1, 700], [2, 900], [3, 600], [0, 2400]] },
    grumbold: { frames: 4, beats: [[0, 1300], [1, 350], [0, 350], [1, 350], [0, 900], [2, 800], [3, 400]] },
    hare: { frames: 4, beats: [[0, 900], [1, 180], [0, 500], [1, 180], [0, 1200], [2, 400], [3, 300]] },
    morvane: { frames: 4, beats: [[0, 900], [1, 700], [2, 700], [3, 900], [2, 500], [3, 900]] },
    elowen: { frames: 4, beats: [[0, 2600], [1, 1200], [0, 900], [2, 1600], [3, 700]] },
    giant: { frames: 4, beats: [[0, 900], [1, 800], [2, 1200], [3, 900]] },
    dragon: { frames: 4, beats: [[0, 1200], [1, 1000], [2, 1400], [1, 700], [0, 800], [3, 900]] }
};

/** Painted sprites are authored several times larger than they appear, and the
 *  scene is rasterised at 320x200 with nearest-neighbour sampling, so drawing
 *  them straight in keeps a scatter of their pixels and speckles. Average each
 *  one down once to half its on-screen size (the raster's resolution), keep
 *  its silhouette hard, and cache it; drawing that at 2x lands exactly on the
 *  raster grid. */
const RASTER_SPRITE_CACHE = new Map();
function rasterSprite(image, sx, sy, sw, sh, dw, dh) {
    const w = Math.max(1, Math.round(dw / 2)), h = Math.max(1, Math.round(dh / 2));
    const key = `${image.src}|${sx},${sy},${sw},${sh}|${w}x${h}`;
    let canvas = RASTER_SPRITE_CACHE.get(key);
    if (!canvas) {
        let step = document.createElement('canvas');
        step.width = sw; step.height = sh;
        step.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        while (step.width / 2 >= w * 1.5) {
            const next = document.createElement('canvas');
            next.width = Math.round(step.width / 2); next.height = Math.round(step.height / 2);
            const nctx = next.getContext('2d');
            nctx.imageSmoothingQuality = 'high';
            nctx.drawImage(step, 0, 0, next.width, next.height);
            step = next;
        }
        canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const cctx = canvas.getContext('2d');
        cctx.imageSmoothingQuality = 'high';
        cctx.drawImage(step, 0, 0, w, h);
        const pixels = cctx.getImageData(0, 0, w, h);
        for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] < 110 ? 0 : 255;
        cctx.putImageData(pixels, 0, 0);
        canvas.dataset.source = image.src;
        // Sizes change with depth; keep the cache bounded.
        if (RASTER_SPRITE_CACHE.size > 160) RASTER_SPRITE_CACHE.delete(RASTER_SPRITE_CACHE.keys().next().value);
        RASTER_SPRITE_CACHE.set(key, canvas);
    }
    return canvas;
}

/** Opaque bounding box of a region of an image, in that image's pixels. */
function opaqueBounds(image, x0, y0, w, h) {
    const probe = document.createElement('canvas');
    probe.width = Math.round(w);
    probe.height = Math.round(h);
    const pctx = probe.getContext('2d');
    pctx.drawImage(image, x0, y0, w, h, 0, 0, probe.width, probe.height);
    const { data } = pctx.getImageData(0, 0, probe.width, probe.height);
    let left = probe.width, right = -1, top = probe.height, bottom = -1;
    for (let y = 0; y < probe.height; y++) {
        for (let x = 0; x < probe.width; x++) {
            if (data[(y * probe.width + x) * 4 + 3] < 16) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
        }
    }
    return right >= 0 ? { left, right, top, bottom } : null;
}

/** Which sheet frame an actor shows at time t. `phase` staggers the cast so
 *  two idlers in one room never move in step. */
function paintedFrame(id, t, phase) {
    const spec = PAINTED_SHEETS[id];
    const total = spec.beats.reduce((sum, [, ms]) => sum + ms, 0);
    let clock = ((t + phase * 997) % total + total) % total;
    for (const [frame, ms] of spec.beats) {
        if (clock < ms) return frame;
        clock -= ms;
    }
    return 0;
}

/** ChatGPT-painted cast sprites (tools/art-prompts/characters), loaded only
 *  with the painted actor trial. Each falls back to its procedural drawing
 *  independently if its image is missing. */
const PAINTED_CAST_LOADS = [];
const PAINTED_ACTOR_SPRITES = (() => {
    const sprites = Object.create(null);
    const settle = (image) => PAINTED_CAST_LOADS.push(new Promise(resolve => {
        image.addEventListener('load', resolve);
        image.addEventListener('error', resolve);
    }));
    const options = new URLSearchParams(window.location.search);
    const style = options.get('actors') || (options.get('scenery') === 'painted' ? 'painted' : 'procedural');
    if (style === 'painted') {
        for (const id of ['morvane', 'hattie', 'fennow', 'elowen', 'villager', 'gnome', 'corvus', 'goat', 'hare',
            'grumbold', 'giant', 'dragon', 'hare_free']) {
            const image = new Image();
            image.onload = () => { image.figure = opaqueBounds(image, 0, 0, image.naturalWidth, image.naturalHeight); };
            settle(image);
            image.src = `icons/${id}-trial.png`;
            sprites[id] = image;
            if (Object.hasOwn(PAINTED_SHEETS, id)) {
                const sheet = new Image();
                sheet.onload = () => {
                    const spec = PAINTED_SHEETS[id];
                    sheet.cellW = sheet.naturalWidth / spec.frames;
                    sheet.cellH = sheet.naturalHeight;
                    // Frame 0 sets the scale, so every frame shares one size.
                    sheet.figure = opaqueBounds(sheet, 0, 0, sheet.cellW, sheet.cellH);
                };
                settle(sheet);
                sheet.src = `icons/${id}-sheet-trial.png`;
                image.sheet = sheet;
            }
        }
    }
    return sprites;
})();
const PAINTED_CAST_READY = Promise.all(PAINTED_CAST_LOADS);

/** The painted hero's standing height on a ground line, so painted cast can be
 *  sized relative to him the way vgaPersonScale sizes the procedural cast. */
function paintedEgoHeight(engineRef, groundY) {
    return engineRef.playerSpriteScale(groundY) * 37.8 * 1.5;
}

/** A painted cast member standing on (x, groundY), sized as a fraction of the
 *  painted hero on the same ground line. Returns false if not available. */
function drawCastMember(ctx, id, engineRef, x, groundY, heightFactor, facing = 1) {
    return drawPaintedActor(ctx, id, x, groundY,
        { height: paintedEgoHeight(engineRef, groundY) * heightFactor, t: engineRef.animTimer, phase: x }, facing);
}

/** Draw a painted cast sprite standing on (x, groundY). `size` is either
 *  { height } or { width } in pixels; `facing` -1 mirrors it. Returns false
 *  when the sprite is unavailable so the caller can draw the procedural one. */
function drawPaintedActor(ctx, id, x, groundY, size, facing = 1) {
    if (!Object.hasOwn(PAINTED_ACTOR_SPRITES, id)) return false;
    const image = PAINTED_ACTOR_SPRITES[id];
    const t = size.t || 0;
    const phase = size.phase || 0;
    // Everyone breathes: a one-pixel rise and fall from the feet, never in step.
    const breath = 1 + Math.sin(t / 820 + phase * 0.37) * (size.still ? 0 : 0.009);
    const sheet = image.sheet;
    if (sheet && sheet.complete && sheet.naturalWidth && sheet.figure && !size.still) {
        const fig = sheet.figure;
        const figW = fig.right - fig.left + 1, figH = fig.bottom - fig.top + 1;
        const scale = size.width ? size.width / figW : size.height / figH;
        const frame = paintedFrame(id, t, phase);
        const cellW = sheet.cellW, cellH = sheet.cellH;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(x, groundY);
        if (facing < 0) ctx.scale(-1, 1);
        ctx.scale(1, breath);
        // Cells share one anchor: horizontal centre, figure bottom of frame 0.
        const dw = cellW * scale, dh = cellH * scale;
        ctx.drawImage(rasterSprite(sheet, frame * cellW, 0, cellW, cellH, dw, dh),
            -dw / 2, -(fig.bottom + 1) * scale, dw, dh);
        ctx.restore();
        return true;
    }
    const fig = image.figure;
    if (!image.complete || !image.naturalWidth || !fig) return false;
    const figW = fig.right - fig.left + 1, figH = fig.bottom - fig.top + 1;
    const scale = size.width ? size.width / figW : size.height / figH;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, groundY);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.scale(1, breath);
    ctx.drawImage(rasterSprite(image, fig.left, fig.top, figW, figH, figW * scale, figH * scale),
        -figW * scale / 2, -figH * scale, figW * scale, figH * scale);
    ctx.restore();
    return true;
}
