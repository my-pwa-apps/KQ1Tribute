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
        ctx.drawImage(atlas, frame * 96, row * 128, 96, 128,
            -48 * ratio, -116 * ratio, 96 * ratio, 128 * ratio);
        ctx.restore();
        return true;
    };
    draw.ready = new Promise(resolve => {
        atlas.onload = () => { ready = true; resolve(true); };
        atlas.onerror = () => resolve(false);
        atlas.src = 'icons/rowan-atlas-trial.png';
    });
    return draw;
}

// ========== PAINTED CAST TRIAL ==========

/** ChatGPT-painted cast sprites (tools/art-prompts/characters), loaded only
 *  with the painted actor trial. Each falls back to its procedural drawing
 *  independently if its image is missing. */
const PAINTED_ACTOR_SPRITES = (() => {
    const sprites = Object.create(null);
    const options = new URLSearchParams(window.location.search);
    const style = options.get('actors') || (options.get('scenery') === 'painted' ? 'painted' : 'procedural');
    if (style === 'painted') {
        for (const id of ['morvane', 'hattie', 'fennow', 'elowen', 'villager', 'gnome', 'corvus', 'goat', 'hare',
            'grumbold', 'giant', 'dragon']) {
            const image = new Image();
            // The prepared canvas pads the figure; size and anchor it by its opaque pixels.
            image.onload = () => {
                const probe = document.createElement('canvas');
                probe.width = image.naturalWidth;
                probe.height = image.naturalHeight;
                const pctx = probe.getContext('2d');
                pctx.drawImage(image, 0, 0);
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
                if (right >= 0) image.figure = { left, right, top, bottom };
            };
            image.src = `icons/${id}-trial.png`;
            sprites[id] = image;
        }
    }
    return sprites;
})();

/** The painted hero's standing height on a ground line, so painted cast can be
 *  sized relative to him the way vgaPersonScale sizes the procedural cast. */
function paintedEgoHeight(engineRef, groundY) {
    return engineRef.playerSpriteScale(groundY) * 37.8 * 1.5;
}

/** A painted cast member standing on (x, groundY), sized as a fraction of the
 *  painted hero on the same ground line. Returns false if not available. */
function drawCastMember(ctx, id, engineRef, x, groundY, heightFactor, facing = 1) {
    return drawPaintedActor(ctx, id, x, groundY, { height: paintedEgoHeight(engineRef, groundY) * heightFactor }, facing);
}

/** Draw a painted cast sprite standing on (x, groundY). `size` is either
 *  { height } or { width } in pixels; `facing` -1 mirrors it. Returns false
 *  when the sprite is unavailable so the caller can draw the procedural one. */
function drawPaintedActor(ctx, id, x, groundY, size, facing = 1) {
    if (!Object.hasOwn(PAINTED_ACTOR_SPRITES, id)) return false;
    const image = PAINTED_ACTOR_SPRITES[id];
    const fig = image.figure;
    if (!image.complete || !image.naturalWidth || !fig) return false;
    const figW = fig.right - fig.left + 1, figH = fig.bottom - fig.top + 1;
    const scale = size.width ? size.width / figW : size.height / figH;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, groundY);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(image, fig.left, fig.top, figW, figH, -figW * scale / 2, -figH * scale, figW * scale, figH * scale);
    ctx.restore();
    return true;
}
