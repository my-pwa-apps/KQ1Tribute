// ============================================================
// CROWN QUEST - SHARED ART: PRIMITIVES, LANDSCAPE, ARCHITECTURE
// ------------------------------------------------------------
// Procedural drawing helpers shared by every room and cutscene.
// Declared at script scope so room modules can call them directly,
// matching how GameEngine and SoundEngine are already exposed.
//
// Creatures and people live in js/actors.js, inventory and portrait
// icons in js/icons.js, and set-piece animations in js/cutscenes.js.
// ============================================================

/* eslint-disable no-unused-vars -- helpers are consumed by room modules in other files */

// ========== DRAWING PRIMITIVES ==========

const ditherPatternCache = new Map();
const perspectiveSurfaceCanvas = document.createElement('canvas');

function getDitherPattern(ctx, c1, c2, ps) {
    const key = `${c1}|${c2}|${ps}`;
    const cached = ditherPatternCache.get(key);
    if (cached) return cached;

    const tile = document.createElement('canvas');
    tile.width = ps * 2;
    tile.height = ps * 2;
    const tctx = tile.getContext('2d');
    tctx.fillStyle = c1;
    tctx.fillRect(0, 0, tile.width, tile.height);
    tctx.fillStyle = c2;
    tctx.fillRect(0, 0, ps, ps);
    tctx.fillRect(ps, ps, ps, ps);
    const pattern = ctx.createPattern(tile, 'repeat');
    ditherPatternCache.set(key, pattern);
    return pattern;
}

/** Checkerboard mix of two colours — the only legal way to blend in this game.
 *  EGA had no gradients, and a smooth fill reads instantly as modern. */
function ditherRect(ctx, x, y, w, h, c1, c2, patternSize) {
    const ps = patternSize || 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = getDitherPattern(ctx, c1, c2, ps);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

/** Paint a small logical surface, then map it into a wall trapezoid one
 *  pixel column at a time. Canvas affine transforms can only shear text;
 *  this also compresses glyphs toward the vanishing edge. */
function drawPerspectiveSurface(ctx, sourceWidth, sourceHeight, quad, paint) {
    perspectiveSurfaceCanvas.width = sourceWidth;
    perspectiveSurfaceCanvas.height = sourceHeight;
    const source = perspectiveSurfaceCanvas.getContext('2d');
    source.imageSmoothingEnabled = false;
    source.clearRect(0, 0, sourceWidth, sourceHeight);
    paint(source);

    const leftHeight = quad.bl.y - quad.tl.y;
    const rightHeight = quad.br.y - quad.tr.y;
    const compression = Math.max(-0.4, Math.min(0.4,
        (leftHeight - rightHeight) / Math.max(leftHeight, rightHeight)));
    const mapU = (u) => u + compression * u * (1 - u);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let sx = 0; sx < sourceWidth; sx++) {
        const u0 = mapU(sx / sourceWidth);
        const u1 = mapU((sx + 1) / sourceWidth);
        const x0 = quad.tl.x + (quad.tr.x - quad.tl.x) * u0;
        const x1 = quad.tl.x + (quad.tr.x - quad.tl.x) * u1;
        const topY = quad.tl.y + (quad.tr.y - quad.tl.y) * u0;
        const bottomY = quad.bl.y + (quad.br.y - quad.bl.y) * u0;
        ctx.drawImage(perspectiveSurfaceCanvas, sx, 0, 1, sourceHeight,
            x0, topY, Math.max(1, x1 - x0 + 0.35), bottomY - topY);
    }
    ctx.restore();
}

function sceneFont(size, weight) {
    const responsiveSize = window.innerWidth <= 480 ? Math.max(size, 12) : size;
    return `${weight ? weight + ' ' : ''}${responsiveSize}px "Courier New"`;
}

/** Deterministic per-scene noise. Rooms must look the same on every frame and
 *  in every screenshot, so scattered detail is seeded, never Math.random(). */
function seededRandom(seed) {
    let r = seed || 1;
    return () => { r = (r * 16807) % 2147483647; return (r & 0xFFFF) / 0xFFFF; };
}

/** A band of sky rendered as hard dithered steps between ramp colours.
 *  The dither strip is deliberately thin: a wide checkerboard over a large
 *  area stops reading as a blend and starts reading as stripes. */
/** Mix two hex colours. Used to expand a short sky ramp into many small steps,
 *  because a dithered seam between two very different colours reads as a
 *  checkerboard stripe rather than as a blend. */
function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => {
        const va = (pa >> sh) & 255, vb = (pb >> sh) & 255;
        return Math.round(va + (vb - va) * t);
    };
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** A band of sky rendered as many hard steps with thin dithered seams. */
function skyBands(ctx, x, y, w, h, ramp) {
    // Expand the ramp so neighbouring steps are close enough that the dither
    // reads as a blend instead of as texture.
    const perSegment = 4;
    const steps = [];
    for (let i = 0; i < ramp.length - 1; i++) {
        for (let k = 0; k < perSegment; k++) steps.push(mixHex(ramp[i], ramp[i + 1], k / perSegment));
    }
    steps.push(ramp[ramp.length - 1]);
    const bandH = h / steps.length;
    for (let i = 0; i < steps.length; i++) {
        ctx.fillStyle = steps[i];
        ctx.fillRect(x, y + i * bandH, w, bandH + 1);
    }
    for (let i = 0; i < steps.length - 1; i++) {
        blendSeam(ctx, x, y + (i + 1) * bandH, w, steps[i], steps[i + 1]);
    }
}

/** Soften the join between two large flat areas without the checkerboard
 *  becoming visible as a stripe: two thin passes, opposite phase. */
function blendSeam(ctx, x, y, w, above, below) {
    ditherRect(ctx, x, y - 3, w, 3, above, below, 2);
    ditherRect(ctx, x, y, w, 2, below, above, 2);
}


function starField(ctx, w, h, seed, count, yFraction) {
    const next = seededRandom(seed || 54321);
    const maxY = h * (yFraction || 1);
    for (let i = 0; i < (count || 90); i++) {
        const x = next() * w, y = next() * maxY;
        const b = 150 + Math.floor(next() * 105);
        ctx.fillStyle = `rgb(${b},${b},${b + 15})`;
        ctx.fillRect(x, y, next() > 0.85 ? 2 : 1, 1);
    }
}

/** Aerial perspective: a ridge of hills whose peaks and valleys walk across
 *  the screen. Draw the furthest ridge first, in the haziest colour, so
 *  nearer ones overlap it. */
function distantRange(ctx, baseY, w, height, seed, color, jag) {
    const next = seededRandom(seed);
    const roughness = jag || 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-30, baseY + 60);
    ctx.lineTo(-30, baseY - height * 0.4 * roughness);
    // Alternate peak and saddle so the silhouette reads as hills rather than
    // as a row of spikes: every peak is followed by a lower shoulder.
    let x = -30;
    let peak = true;
    while (x < w + 40) {
        const step = 26 + next() * 44;
        x += step;
        const y = peak
            ? baseY - height * (0.62 + next() * 0.38) * roughness
            : baseY - height * (0.18 + next() * 0.26) * roughness;
        // A shoulder before the summit keeps the slopes from being straight.
        ctx.lineTo(x - step * 0.45, baseY - height * (peak ? 0.4 : 0.34) * roughness);
        ctx.lineTo(x, y);
        peak = !peak;
    }
    ctx.lineTo(w + 40, baseY + 60);
    ctx.closePath();
    ctx.fill();
}

// ========== MASONRY, TIMBER, THATCH ==========

/** Coursed rubble masonry with mortar joints and three tones per stone. */
function stoneWall(ctx, x, y, w, h, seed, lit, base, shadow, mortar) {
    lit = lit || PAL.STONE_LIT;
    base = base || PAL.STONE_BASE;
    shadow = shadow || PAL.STONE_SHADOW;
    mortar = mortar || PAL.MORTAR;
    const next = seededRandom(seed || 1337);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = mortar;
    ctx.fillRect(x, y, w, h);
    const courseH = 11;
    for (let row = 0, cy = y; cy < y + h; row++, cy += courseH) {
        let cx = x - (row % 2 ? 13 : 0);
        while (cx < x + w) {
            const bw = 20 + Math.floor(next() * 16);
            const tone = next();
            ctx.fillStyle = tone > 0.72 ? lit : (tone > 0.28 ? base : shadow);
            ctx.fillRect(cx + 1, cy + 1, bw - 2, courseH - 2);
            // Every stone gets a lit top edge and a dark underside: without
            // these the wall reads as a flat grey grid.
            ctx.fillStyle = lit;
            ctx.fillRect(cx + 1, cy + 1, bw - 2, 1);
            ctx.fillStyle = shadow;
            ctx.fillRect(cx + 1, cy + courseH - 3, bw - 2, 2);
            cx += bw;
        }
    }
    ctx.restore();
}

/** Vertical or horizontal plank run with visible grain and iron nails. */
function woodPlanks(ctx, x, y, w, h, vertical, seed) {
    const next = seededRandom(seed || 99);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = PAL.WOOD_DEEP;
    ctx.fillRect(x, y, w, h);
    const span = vertical ? w : h;
    const plank = 14;
    for (let p = 0; p < span; p += plank) {
        const tone = next();
        const body = tone > 0.66 ? PAL.WOOD_LIT : (tone > 0.3 ? PAL.WOOD_BASE : PAL.WOOD_SHADOW);
        if (vertical) {
            ctx.fillStyle = body;
            ctx.fillRect(x + p, y, plank - 1, h);
            ctx.fillStyle = PAL.WOOD_LIT;
            ctx.fillRect(x + p, y, 1, h);
            ctx.fillStyle = PAL.WOOD_DEEP;
            ctx.fillRect(x + p + plank - 2, y, 1, h);
            for (let g = y + 6; g < y + h; g += 17 + next() * 12) {
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(x + p + 2 + next() * 6, g, 1, 5 + next() * 6);
            }
        } else {
            ctx.fillStyle = body;
            ctx.fillRect(x, y + p, w, plank - 1);
            ctx.fillStyle = PAL.WOOD_LIT;
            ctx.fillRect(x, y + p, w, 1);
            ctx.fillStyle = PAL.WOOD_DEEP;
            ctx.fillRect(x, y + p + plank - 2, w, 1);
            for (let g = x + 8; g < x + w; g += 21 + next() * 14) {
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(g, y + p + 2 + next() * 5, 5 + next() * 6, 1);
            }
        }
    }
    ctx.restore();
}

/** Layered thatch, drawn as overlapping combed courses. */
function thatchRoof(ctx, apexX, apexY, halfW, baseY, seed) {
    const next = seededRandom(seed || 512);
    const courses = 7;
    for (let i = courses; i >= 1; i--) {
        const f = i / courses;
        const y = apexY + (baseY - apexY) * f;
        const hw = halfW * f;
        const tone = i % 2 ? '#8a6f38' : '#755c2c';
        ctx.fillStyle = i === courses ? '#3a2c12' : tone;
        ctx.beginPath();
        ctx.moveTo(apexX - hw - 4, y + 7);
        ctx.lineTo(apexX + hw + 4, y + 7);
        ctx.lineTo(apexX + hw * 0.86, y - 4);
        ctx.lineTo(apexX - hw * 0.86, y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a3873f';
        for (let sx = apexX - hw; sx < apexX + hw; sx += 6) {
            if (next() > 0.55) ctx.fillRect(sx, y - 2, 2, 6);
        }
    }
    ctx.fillStyle = '#241a0a';
    ctx.fillRect(apexX - halfW - 6, baseY + 5, halfW * 2 + 12, 3);
}

// ========== SIERRA PSEUDO-3D INTERIOR SHELL ==========

/** Build the trapezoid edge functions for a Sierra interior. Every interior
 *  room derives its walls, doors and wall-mounted props from these, so the
 *  vanishing point can never drift between rooms.
 *  Returns { lTop, lBot, rTop, rBot, lBand, rBand, trap } in canvas space. */
function perspectiveFrame(w, backLeft, backRight, backTop, backBottom, edgeY) {
    const lTop = (x) => x * (backTop / backLeft);
    const lBot = (x) => edgeY - x * ((edgeY - backBottom) / backLeft);
    const rTop = (x) => (w - x) * (backTop / (w - backRight));
    const rBot = (x) => edgeY - (w - x) * ((edgeY - backBottom) / (w - backRight));
    const lBand = (x, f) => lTop(x) + (lBot(x) - lTop(x)) * f;
    const rBand = (x, f) => rTop(x) + (rBot(x) - rTop(x)) * f;
    return {
        BW_L: backLeft, BW_R: backRight, BW_T: backTop, BW_B: backBottom, EDGE: edgeY,
        lTop, lBot, rTop, rBot, lBand, rBand,
        /** Trace a perspective-correct quad on one wall between two x positions
         *  and two vertical fractions of the wall's height. */
        trap(ctx, x1, x2, f1, f2, band) {
            ctx.beginPath();
            ctx.moveTo(x1, band(x1, f1)); ctx.lineTo(x2, band(x2, f1));
            ctx.lineTo(x2, band(x2, f2)); ctx.lineTo(x1, band(x1, f2));
            ctx.closePath();
        }
    };
}

/** Paint the ceiling wedge, back wall, two side walls and the floor of an
 *  interior. Rooms then dress the surfaces; nobody re-derives the geometry. */
function interiorShell(ctx, w, h, F, tone) {
    const t = tone;
    ctx.fillStyle = t.void || '#0a0810';
    ctx.fillRect(0, 0, w, h);
    // Ceiling wedge
    ctx.fillStyle = t.ceiling;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(F.BW_L, F.BW_T); ctx.lineTo(F.BW_R, F.BW_T); ctx.lineTo(w, 0);
    ctx.closePath(); ctx.fill();
    // Back wall
    ctx.fillStyle = t.back;
    ctx.fillRect(F.BW_L, F.BW_T, F.BW_R - F.BW_L, F.BW_B - F.BW_T);
    ditherRect(ctx, F.BW_L, F.BW_T, F.BW_R - F.BW_L, 24, t.backShade || t.back, t.back, 4);
    // Side walls — the left catches the light, the right falls away
    ctx.fillStyle = t.leftWall;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(F.BW_L, F.BW_T); ctx.lineTo(F.BW_L, F.BW_B); ctx.lineTo(0, F.EDGE);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = t.rightWall;
    ctx.beginPath();
    ctx.moveTo(w, 0); ctx.lineTo(F.BW_R, F.BW_T); ctx.lineTo(F.BW_R, F.BW_B); ctx.lineTo(w, F.EDGE);
    ctx.closePath(); ctx.fill();
    // Floor, then tonal bands. Deliberately no perspective grid lines: depth
    // comes from the wall convergence, the banding and the cast shadows.
    ctx.fillStyle = t.floor;
    ctx.beginPath();
    ctx.moveTo(0, F.EDGE); ctx.lineTo(F.BW_L, F.BW_B); ctx.lineTo(F.BW_R, F.BW_B); ctx.lineTo(w, F.EDGE);
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, F.EDGE); ctx.lineTo(F.BW_L, F.BW_B); ctx.lineTo(F.BW_R, F.BW_B); ctx.lineTo(w, F.EDGE);
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.clip();
    const bands = t.floorBands || [];
    bands.forEach(([color, bandY, bandH]) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, bandY, w, bandH);
    });
    for (let i = 0; i < bands.length - 1; i++) {
        ditherRect(ctx, 0, bands[i + 1][1] - 6, w, 8, bands[i][0], bands[i + 1][0], 4);
    }
    ctx.restore();
}

// ========== LIGHT AND ATMOSPHERE ==========

/** Guttering torch or candle flame. Deterministic per-frame from animTimer so
 *  screenshots stay stable at a fixed timer value. */
function flame(ctx, cx, baseY, scale, animTimer, cool) {
    const s = scale;
    const flick = Math.sin(animTimer / 90) * 0.5 + Math.sin(animTimer / 37) * 0.5;
    const hgt = (11 + flick * 2.2) * s;
    const core = cool ? '#bfe6ff' : PAL.FLAME_CORE;
    const mid = cool ? '#5aa8e0' : PAL.FLAME_MID;
    const edge = cool ? '#2d5f96' : PAL.FLAME_EDGE;
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - hgt);
    ctx.lineTo(cx + 4.2 * s, baseY - hgt * 0.42);
    ctx.lineTo(cx + 2.6 * s, baseY);
    ctx.lineTo(cx - 2.6 * s, baseY);
    ctx.lineTo(cx - 4.2 * s, baseY - hgt * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(cx + flick * 0.6 * s, baseY - hgt * 0.78);
    ctx.lineTo(cx + 2.6 * s, baseY - hgt * 0.3);
    ctx.lineTo(cx + 1.6 * s, baseY - 1 * s);
    ctx.lineTo(cx - 1.6 * s, baseY - 1 * s);
    ctx.lineTo(cx - 2.6 * s, baseY - hgt * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = core;
    ctx.fillRect(cx - 0.9 * s, baseY - hgt * 0.52, 1.8 * s, hgt * 0.36);
}

/** Wall torch in an iron bracket, complete with the pool of light it throws. */
function wallTorch(ctx, x, y, scale, animTimer, eng) {
    const s = scale;
    ctx.fillStyle = PAL.OUTLINE;
    ctx.fillRect(x - 2.6 * s, y - 1 * s, 5.2 * s, 13 * s);
    ctx.fillStyle = PAL.WOOD_SHADOW;
    ctx.fillRect(x - 1.8 * s, y, 3.6 * s, 12 * s);
    ctx.fillStyle = PAL.WOOD_LIT;
    ctx.fillRect(x - 1.8 * s, y, 1.2 * s, 12 * s);
    // Iron bracket
    ctx.fillStyle = '#26221f';
    ctx.fillRect(x - 4 * s, y + 3 * s, 8 * s, 2.4 * s);
    ctx.fillStyle = '#4a443d';
    ctx.fillRect(x - 4 * s, y + 3 * s, 8 * s, 0.9 * s);
    flame(ctx, x, y, s, animTimer);
    if (eng) eng.lightPool(ctx, x, y - 4 * s, 62 * s, '255,180,90', 0.16);
}

/** Soft shaft of daylight falling through a window or doorway. Drawn as a
 *  stack of narrowing slices rather than one flat quad, so the beam fades at
 *  its edges instead of reading as a coloured cardboard cut-out. */
function lightShaft(ctx, topX, topY, topW, botX, botY, botW, alpha, color) {
    const slices = 5;
    ctx.save();
    for (let i = slices; i >= 1; i--) {
        const f = i / slices;
        ctx.globalAlpha = alpha * (0.34 / slices) * (slices - i + 1.4);
        ctx.fillStyle = color || 'rgba(255,240,190,1)';
        ctx.beginPath();
        ctx.moveTo(topX - topW * f / 2, topY);
        ctx.lineTo(topX + topW * f / 2, topY);
        ctx.lineTo(botX + botW * f / 2, botY);
        ctx.lineTo(botX - botW * f / 2, botY);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

/** Drifting motes in a light shaft — cheap, and they sell an interior. */
function dustMotes(ctx, x, y, w, h, animTimer, seed) {
    const next = seededRandom(seed || 4242);
    for (let i = 0; i < 26; i++) {
        const bx = x + next() * w;
        const drift = (animTimer / 40 + next() * 400) % (h + 20);
        const by = y + h - drift;
        if (by < y) continue;
        ctx.fillStyle = `rgba(255,244,206,${0.10 + next() * 0.18})`;
        ctx.fillRect(bx, by, 1, 1);
    }
}

// ========== VEGETATION ==========

/** Broadleaf tree. Black underdrawing first, then the lit canopy on top —
 *  without the silhouette pass the crown dissolves into the background.
 *  The crown is deliberately wide and low: a small ball on a tall stick is
 *  the single most common way procedural trees end up reading as lollipops. */
function drawTree(ctx, x, groundY, scale, seed, autumn) {
    const s = scale;
    const next = seededRandom(seed || 7);
    const trunkH = 40 * s;
    const crownY = groundY - trunkH - 26 * s;
    const halfTrunk = 13 * s;
    const lit = autumn ? '#b47a2a' : PAL.LEAF_LIT;
    const base = autumn ? '#8c5518' : PAL.LEAF_BASE;
    const shade = autumn ? '#5d3410' : PAL.LEAF_SHADOW;

    // Trunk and boughs, drawn before the crown so the canopy sits on them
    ctx.fillStyle = '#1d1208';
    ctx.beginPath();
    ctx.moveTo(x - halfTrunk, groundY);
    ctx.lineTo(x - halfTrunk * 0.52, groundY - trunkH);
    ctx.lineTo(x + halfTrunk * 0.52, groundY - trunkH);
    ctx.lineTo(x + halfTrunk, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_SHADOW;
    ctx.beginPath();
    ctx.moveTo(x - halfTrunk * 0.85, groundY);
    ctx.lineTo(x - halfTrunk * 0.42, groundY - trunkH);
    ctx.lineTo(x + halfTrunk * 0.42, groundY - trunkH);
    ctx.lineTo(x + halfTrunk * 0.85, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_BASE;
    ctx.beginPath();
    ctx.moveTo(x - halfTrunk * 0.85, groundY);
    ctx.lineTo(x - halfTrunk * 0.42, groundY - trunkH);
    ctx.lineTo(x - halfTrunk * 0.12, groundY - trunkH);
    ctx.lineTo(x - halfTrunk * 0.4, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d1208';
    for (let b = 0; b < 4; b++) {
        ctx.fillRect(x - halfTrunk * 0.7, groundY - trunkH + 6 * s + b * 8 * s, halfTrunk * 1.4, 1.4 * s);
    }
    ctx.strokeStyle = '#1d1208';
    ctx.lineWidth = Math.max(1, 3.4 * s);
    [[-1.5, 0.5], [1.5, 0.6], [-0.7, 1.1], [0.8, 1.15]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, groundY - trunkH + 5 * s);
        ctx.quadraticCurveTo(x + dx * 12 * s, crownY + 14 * s, x + dx * 26 * s, crownY + (1 - dy) * 14 * s);
        ctx.stroke();
    });
    ctx.lineWidth = 1;

    // Silhouette: one wide, low mass rather than a ball
    ctx.fillStyle = PAL.LEAF_DEEP;
    const blobs = [
        [0, 0, 40, 27], [-32, 7, 26, 19], [33, 6, 27, 20],
        [-17, -14, 26, 18], [18, -13, 25, 17], [0, 16, 34, 16]
    ];
    blobs.forEach(([dx, dy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x + dx * s, crownY + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    // Body, then the lit crest toward the upper left, then the shaded belly
    const paint = (list, color) => {
        ctx.fillStyle = color;
        list.forEach(([dx, dy, rx, ry]) => {
            ctx.beginPath();
            ctx.ellipse(x + dx * s, crownY + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    };
    paint([[0, -1, 37, 24], [-30, 6, 23, 17], [31, 5, 24, 18], [-16, -14, 23, 16], [17, -13, 22, 15]], base);
    paint([[-14, -16, 19, 12], [10, -15, 16, 10], [-30, -1, 14, 10], [1, -22, 13, 8]], lit);
    paint([[6, 15, 26, 12], [-20, 15, 20, 10], [30, 12, 15, 9]], shade);
    // Broken edge so the canopy stops reading as stacked ellipses
    for (let i = 0; i < 60; i++) {
        const a = next() * Math.PI * 2;
        const rr = (30 + next() * 16) * s;
        ctx.fillStyle = next() > 0.55 ? lit : (next() > 0.4 ? base : shade);
        ctx.fillRect(x + Math.cos(a) * rr, crownY + Math.sin(a) * rr * 0.66, 2.4 * s, 2.4 * s);
    }
}

/** Dark conifer, for the deep wood and mountain ground. `tones` overrides the
 *  foliage ramp so the same cel can be used as a night silhouette. */
function drawPine(ctx, x, groundY, scale, seed, tones) {
    const s = scale;
    const t = tones || {};
    const deep = t.deep || PAL.LEAF_DEEP;
    const base = t.base || PAL.LEAF_BASE;
    const shadow = t.shadow || PAL.LEAF_SHADOW;
    const lit = t.lit || PAL.LEAF_LIT;
    const h = 76 * s;
    ctx.fillStyle = t.trunk || '#1b1206';
    ctx.fillRect(x - 3 * s, groundY - 16 * s, 6 * s, 16 * s);
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
        const f = i / (tiers - 1);
        const y = groundY - 12 * s - f * h;
        const hw = (26 - f * 19) * s;
        ctx.fillStyle = deep;
        ctx.beginPath();
        ctx.moveTo(x, y - 15 * s);
        ctx.lineTo(x + hw, y + 3 * s);
        ctx.lineTo(x - hw, y + 3 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = i % 2 ? shadow : base;
        ctx.beginPath();
        ctx.moveTo(x, y - 13 * s);
        ctx.lineTo(x + hw * 0.86, y + 1.5 * s);
        ctx.lineTo(x - hw * 0.86, y + 1.5 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = lit;
        ctx.beginPath();
        ctx.moveTo(x - 1 * s, y - 12 * s);
        ctx.lineTo(x - hw * 0.5, y + 0.5 * s);
        ctx.lineTo(x - hw * 0.78, y + 0.5 * s);
        ctx.closePath();
        ctx.fill();
    }
    void seed;
}

/** Tufts of grass along a ground line. */
function grassFringe(ctx, x, y, w, seed, density, lit, base, shade) {
    const next = seededRandom(seed || 3003);
    lit = lit || PAL.GRASS_LIT; base = base || PAL.GRASS_BASE; shade = shade || PAL.GRASS_SHADOW;
    const n = density || 40;
    for (let i = 0; i < n; i++) {
        const gx = x + next() * w;
        const gh = 3 + next() * 6;
        const tone = next();
        ctx.fillStyle = tone > 0.7 ? lit : (tone > 0.3 ? base : shade);
        ctx.fillRect(gx, y - gh, 1, gh);
        if (next() > 0.6) ctx.fillRect(gx + 1, y - gh * 0.6, 1, gh * 0.6);
    }
}

/** Break up a large flat expanse of turf with mown patches, clover and the
 *  odd flower. Without this a meadow reads as a sheet of coloured paper. */
function turfTexture(ctx, x, y, w, h, seed, lit, shade, flower) {
    const next = seededRandom(seed || 7373);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // Broad tonal patches first, so the field has large-scale variation.
    // Irregular outlines, low alpha: crisp ellipses read as spilt paint.
    for (let i = 0; i < 30; i++) {
        const px = x + next() * w;
        const py = y + next() * h;
        const pr = 26 + next() * 54;
        ctx.fillStyle = next() > 0.5
            ? (lit || 'rgba(122,168,88,0.16)')
            : (shade || 'rgba(46,86,44,0.14)');
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 7) {
            const rr = pr * (0.7 + next() * 0.5);
            const vx = px + Math.cos(a) * rr;
            const vy = py + Math.sin(a) * rr * 0.3;
            if (a === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();
    }
    // Then blades, dense near the viewer and sparse toward the horizon.
    for (let i = 0; i < 420; i++) {
        const f = next();
        const px = x + next() * w;
        const py = y + f * f * h;
        const gh = 1 + f * 4;
        ctx.fillStyle = next() > 0.55
            ? (lit || 'rgba(122,168,88,0.5)')
            : (shade || 'rgba(46,86,44,0.42)');
        ctx.fillRect(px, py, 1, gh);
    }
    if (flower) {
        for (let i = 0; i < 34; i++) {
            const f = next();
            ctx.fillStyle = flower;
            ctx.fillRect(x + next() * w, y + f * f * h, 2, 2);
        }
    }
    ctx.restore();
}

/** Low bush or bramble clump. */
function drawBush(ctx, x, groundY, scale, seed) {
    const s = scale;
    const next = seededRandom(seed || 88);
    ctx.fillStyle = PAL.LEAF_DEEP;
    ctx.beginPath();
    ctx.ellipse(x, groundY - 8 * s, 17 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    [[-6, -2, 10, 7, PAL.LEAF_BASE], [6, -3, 9, 7, PAL.LEAF_BASE],
    [-3, -8, 8, 6, PAL.LEAF_LIT], [7, 2, 8, 5, PAL.LEAF_SHADOW]].forEach(([dx, dy, rx, ry, c]) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x + dx * s, groundY - 8 * s + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    for (let i = 0; i < 14; i++) {
        const a = next() * Math.PI * 2;
        ctx.fillStyle = next() > 0.5 ? PAL.LEAF_LIT : PAL.LEAF_SHADOW;
        ctx.fillRect(x + Math.cos(a) * 15 * s, groundY - 8 * s + Math.sin(a) * 9 * s, 2 * s, 2 * s);
    }
}

/** Mushroom ring, toadstool clump — deep wood dressing. */
function drawToadstools(ctx, x, groundY, scale, seed) {
    const s = scale;
    const next = seededRandom(seed || 606);
    for (let i = 0; i < 5; i++) {
        const mx = x + (next() - 0.5) * 30 * s;
        const my = groundY - next() * 5 * s;
        const r = (3 + next() * 2) * s;
        ctx.fillStyle = '#1a0d0d';
        ctx.fillRect(mx - 1.2 * s, my - 5 * s, 2.4 * s, 5 * s);
        ctx.fillStyle = '#e0d3b8';
        ctx.fillRect(mx - 1 * s, my - 5 * s, 2 * s, 5 * s);
        ctx.fillStyle = '#7a1f18';
        ctx.beginPath();
        ctx.ellipse(mx, my - 5 * s, r, r * 0.66, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#c23a26';
        ctx.beginPath();
        ctx.ellipse(mx - r * 0.25, my - 5.6 * s, r * 0.62, r * 0.42, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f0e6cf';
        ctx.fillRect(mx - r * 0.5, my - 6.4 * s, 1.2 * s, 1.2 * s);
    }
}

// ========== WATER AND STONE ==========

/** Sea or river band with dithered depth and a few hard specular dashes. */
function waterBand(ctx, x, y, w, h, animTimer, seed) {
    const next = seededRandom(seed || 21);
    ctx.fillStyle = PAL.WATER_DEEP;
    ctx.fillRect(x, y, w, h);
    ditherRect(ctx, x, y, w, h * 0.42, PAL.WATER_SHADOW, PAL.WATER_BASE, 2);
    ditherRect(ctx, x, y + h * 0.42, w, h * 0.34, PAL.WATER_BASE, PAL.WATER_SHADOW, 2);
    // Specular dashes drift sideways; the row spacing widens toward the viewer.
    for (let i = 0; i < 70; i++) {
        const f = next();
        const ly = y + f * f * h;
        const drift = (animTimer / (26 + f * 40) + next() * 900) % (w + 60) - 30;
        ctx.fillStyle = next() > 0.62 ? '#c7ecf6' : PAL.WATER_LIT;
        ctx.fillRect(x + drift, ly, 3 + f * 9, 1);
    }
}

/** A path of reflected light on water, running toward the viewer from a source
 *  at `cx`. Each row is a few broken dashes across a widening span.
 *
 *  Do NOT draw this as one bar per row with a per-row `sin(t + i)` offset: a
 *  full radian of phase per row turns the path into a zigzag ladder, and an
 *  unbroken bar fills in as a solid wedge. Both mistakes have been made here. */
function lightReflection(ctx, cx, topY, bottomY, rows, nearSpread, tint, seed, animTimer) {
    const next = seededRandom(seed || 9134);
    const step = (bottomY - topY) / rows;
    for (let i = 0; i < rows; i++) {
        const f = i / rows;
        const spread = nearSpread * (0.2 + f * 0.8);
        const shimmer = Math.sin((animTimer || 0) / 900 + i * 0.34) * 3;
        const dashes = 2 + Math.floor(next() * 3);
        for (let d = 0; d < dashes; d++) {
            const dx = (next() - 0.5) * spread * 2;
            const dw = 3 + next() * (5 + f * 9);
            const fade = 1 - Math.min(1, Math.abs(dx) / (spread * 1.15));
            ctx.fillStyle = `rgba(${tint},${(0.42 - f * 0.26) * fade})`;
            ctx.fillRect(cx + dx + shimmer, topY + i * step, dw, 1.6);
        }
    }
}

/** Rough rock for cliffs and cave walls. Built as a dense tessellation of
 *  faceted slabs on a jittered grid: scattering loose polygons over a flat
 *  fill reads as confetti, not as stone. */
function rockFace(ctx, x, y, w, h, seed, lit, base, shadow) {
    lit = lit || '#8d8272'; base = base || '#645a4d'; shadow = shadow || '#3d372e';
    const next = seededRandom(seed || 909);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y, w, h);
    const cell = 34;
    const cols = Math.ceil(w / cell) + 2;
    const rows = Math.ceil(h / cell) + 2;
    for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
            // Offset alternate rows so the slabs never line up into a grid.
            const fx = x + c * cell + (r % 2 ? cell * 0.5 : 0) + (next() - 0.5) * 9;
            const fy = y + r * cell + (next() - 0.5) * 9;
            const fw = cell * (0.95 + next() * 0.55);
            const fh = cell * (0.85 + next() * 0.5);
            const tone = next();
            const body = tone > 0.7 ? lit : (tone > 0.3 ? base : shadow);
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(fx, fy + fh * (next() * 0.16));
            ctx.lineTo(fx + fw * (0.55 + next() * 0.3), fy - fh * next() * 0.12);
            ctx.lineTo(fx + fw, fy + fh * (0.3 + next() * 0.25));
            ctx.lineTo(fx + fw * (0.7 + next() * 0.25), fy + fh);
            ctx.lineTo(fx + fw * next() * 0.3, fy + fh * (0.75 + next() * 0.25));
            ctx.closePath();
            ctx.fill();
            // Lit upper-left edge and dark underside: without these the facets
            // have no direction and the wall goes flat.
            ctx.strokeStyle = tone > 0.5 ? lit : base;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx, fy + fh * 0.1);
            ctx.lineTo(fx + fw * 0.6, fy);
            ctx.stroke();
            ctx.strokeStyle = '#00000055';
            ctx.beginPath();
            ctx.moveTo(fx + fw * 0.75, fy + fh);
            ctx.lineTo(fx + fw, fy + fh * 0.4);
            ctx.stroke();
        }
    }
    // Cracks running across the facets tie the slabs into one mass.
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
        let cx = x + next() * w;
        let cy = y + next() * h;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) {
            cx += (next() - 0.3) * 26;
            cy += (next() * 0.9 + 0.2) * 22;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// ========== ARCHITECTURE AND PROPS ==========

/** Distant castle on a ridge, drawn at whatever scale the scene needs. */
function drawCastle(ctx, x, baseY, scale, tone, litTone) {
    const s = scale;
    const body = tone || '#4d5566';
    const lit = litTone || '#6b7386';
    const block = (bx, bw, bh) => {
        ctx.fillStyle = body;
        ctx.fillRect(x + bx * s, baseY - bh * s, bw * s, bh * s);
        ctx.fillStyle = lit;
        ctx.fillRect(x + bx * s, baseY - bh * s, bw * s * 0.4, bh * s);
        ctx.fillStyle = body;
        for (let c = 0; c < bw; c += 6) {
            ctx.fillRect(x + (bx + c) * s, baseY - (bh + 4) * s, 3 * s, 4 * s);
        }
    };
    block(-34, 16, 40);
    block(-14, 28, 30);
    block(16, 18, 46);
    // Conical roofs give the skyline its fairy-tale reading.
    [[-26, 40], [25, 46]].forEach(([tx, th]) => {
        ctx.fillStyle = '#3b2b4a';
        ctx.beginPath();
        ctx.moveTo(x + tx * s, baseY - (th + 6) * s);
        ctx.lineTo(x + (tx + 11) * s, baseY - (th + 6) * s);
        ctx.lineTo(x + (tx + 5.5) * s, baseY - (th + 22) * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#584170';
        ctx.beginPath();
        ctx.moveTo(x + tx * s, baseY - (th + 6) * s);
        ctx.lineTo(x + (tx + 4) * s, baseY - (th + 6) * s);
        ctx.lineTo(x + (tx + 5.5) * s, baseY - (th + 22) * s);
        ctx.closePath();
        ctx.fill();
    });
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(x - 8 * s, baseY - 20 * s, 3 * s, 4 * s);
    ctx.fillRect(x + 20 * s, baseY - 30 * s, 3 * s, 4 * s);
}

/** The village well: a shared prop, drawn identically wherever it appears. */
function drawWell(ctx, cx, groundY, scale, ropeDown, seed) {
    const s = scale;
    ctx.fillStyle = PAL.OUTLINE;
    ctx.beginPath();
    ctx.ellipse(cx, groundY, 34 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    stoneWall(ctx, cx - 31 * s, groundY - 26 * s, 62 * s, 28 * s, seed || 4711);
    ctx.strokeStyle = PAL.OUTLINE;
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.strokeRect(cx - 31 * s, groundY - 26 * s, 62 * s, 28 * s);
    // Coping stones and the black mouth
    ctx.fillStyle = PAL.STONE_LIT;
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 26 * s, 33 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.STONE_SHADOW;
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 25 * s, 26 * s, 6.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#07070a';
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 25 * s, 23 * s, 5.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Posts, beam and windlass
    ctx.fillStyle = PAL.WOOD_DEEP;
    ctx.fillRect(cx - 30 * s, groundY - 66 * s, 7 * s, 42 * s);
    ctx.fillRect(cx + 23 * s, groundY - 66 * s, 7 * s, 42 * s);
    ctx.fillStyle = PAL.WOOD_BASE;
    ctx.fillRect(cx - 29 * s, groundY - 65 * s, 4 * s, 40 * s);
    ctx.fillRect(cx + 24 * s, groundY - 65 * s, 4 * s, 40 * s);
    ctx.fillStyle = PAL.WOOD_DEEP;
    ctx.beginPath();
    ctx.moveTo(cx - 36 * s, groundY - 66 * s);
    ctx.lineTo(cx, groundY - 82 * s);
    ctx.lineTo(cx + 36 * s, groundY - 66 * s);
    ctx.lineTo(cx + 30 * s, groundY - 66 * s);
    ctx.lineTo(cx, groundY - 77 * s);
    ctx.lineTo(cx - 30 * s, groundY - 66 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a3129';
    ctx.fillRect(cx - 24 * s, groundY - 60 * s, 48 * s, 7 * s);
    ctx.fillStyle = '#5d5247';
    ctx.fillRect(cx - 24 * s, groundY - 60 * s, 48 * s, 2 * s);
    ctx.fillStyle = PAL.WOOD_LIT;
    ctx.fillRect(cx + 24 * s, groundY - 59 * s, 8 * s, 3 * s);
    // Rope, and the pail either hanging or lowered out of sight
    ctx.strokeStyle = '#c2ac7e';
    ctx.lineWidth = Math.max(1, 1.6 * s);
    ctx.beginPath();
    ctx.moveTo(cx, groundY - 56 * s);
    ctx.lineTo(cx, ropeDown ? groundY - 24 * s : groundY - 42 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (!ropeDown) {
        ctx.fillStyle = PAL.WOOD_DEEP;
        ctx.fillRect(cx - 8 * s, groundY - 42 * s, 16 * s, 13 * s);
        ctx.fillStyle = PAL.WOOD_BASE;
        ctx.fillRect(cx - 7 * s, groundY - 41 * s, 14 * s, 11 * s);
        ctx.fillStyle = '#3a3129';
        ctx.fillRect(cx - 7 * s, groundY - 38 * s, 14 * s, 2 * s);
    }
}

/** Plank-and-rope bridge over a gorge, seen from the near bank. */
function drawRopeBridge(ctx, x0, y0, x1, y1, sag, seed) {
    const next = seededRandom(seed || 77);
    const at = (t) => ({
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag
    });
    // Deck
    for (let t = 0; t <= 1.0001; t += 0.035) {
        const p = at(t);
        const wdt = 26 - Math.abs(0.5 - t) * 8;
        ctx.fillStyle = '#1c1207';
        ctx.fillRect(p.x - wdt / 2, p.y, wdt, 7);
        ctx.fillStyle = next() > 0.5 ? PAL.WOOD_BASE : PAL.WOOD_SHADOW;
        ctx.fillRect(p.x - wdt / 2 + 1, p.y + 1, wdt - 2, 4);
        ctx.fillStyle = PAL.WOOD_LIT;
        ctx.fillRect(p.x - wdt / 2 + 1, p.y + 1, wdt - 2, 1);
    }
    // Hand ropes
    ctx.strokeStyle = '#2a2114';
    ctx.lineWidth = 4;
    for (const off of [-16, 16]) {
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.05) {
            const p = at(t);
            const rise = 20 - Math.sin(Math.PI * t) * 6;
            if (t === 0) ctx.moveTo(p.x + off, p.y - rise);
            else ctx.lineTo(p.x + off, p.y - rise);
        }
        ctx.stroke();
    }
    ctx.strokeStyle = '#b9a274';
    ctx.lineWidth = 2;
    for (const off of [-16, 16]) {
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.05) {
            const p = at(t);
            const rise = 21 - Math.sin(Math.PI * t) * 6;
            if (t === 0) ctx.moveTo(p.x + off, p.y - rise);
            else ctx.lineTo(p.x + off, p.y - rise);
        }
        ctx.stroke();
    }
    // Vertical stays
    ctx.strokeStyle = '#8d7b58';
    ctx.lineWidth = 1;
    for (let t = 0.06; t < 1; t += 0.12) {
        const p = at(t);
        const rise = 21 - Math.sin(Math.PI * t) * 6;
        ctx.beginPath();
        ctx.moveTo(p.x - 16, p.y - rise); ctx.lineTo(p.x - 13, p.y);
        ctx.moveTo(p.x + 16, p.y - rise); ctx.lineTo(p.x + 13, p.y);
        ctx.stroke();
    }
}

/** The fishing skiff on the cove shingle, and later under sail. */
function drawSkiff(ctx, cx, waterY, scale, sailFull, animTimer) {
    const s = scale;
    const heel = sailFull ? Math.sin((animTimer || 0) / 700) * 0.05 : 0;
    ctx.save();
    ctx.translate(cx, waterY);
    ctx.rotate(heel);
    // Hull silhouette first
    ctx.fillStyle = '#0e0a06';
    ctx.beginPath();
    ctx.moveTo(-40 * s, -12 * s);
    ctx.lineTo(40 * s, -12 * s);
    ctx.lineTo(30 * s, 8 * s);
    ctx.lineTo(-30 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_SHADOW;
    ctx.beginPath();
    ctx.moveTo(-37 * s, -10 * s);
    ctx.lineTo(37 * s, -10 * s);
    ctx.lineTo(28 * s, 6 * s);
    ctx.lineTo(-28 * s, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_BASE;
    ctx.fillRect(-36 * s, -9 * s, 72 * s, 5 * s);
    ctx.fillStyle = PAL.WOOD_LIT;
    ctx.fillRect(-36 * s, -10 * s, 72 * s, 2 * s);
    // Strakes and the one saturated accent: a weathered red sheer stripe.
    ctx.fillStyle = '#8c3520';
    ctx.fillRect(-35 * s, -5 * s, 70 * s, 2.4 * s);
    ctx.fillStyle = '#241708';
    for (let i = -30; i < 32; i += 10) ctx.fillRect(i * s, -9 * s, 1.6 * s, 14 * s);
    // Mast and sail
    ctx.fillStyle = '#241708';
    ctx.fillRect(-2 * s, -66 * s, 4 * s, 57 * s);
    ctx.fillStyle = PAL.WOOD_BASE;
    ctx.fillRect(-1.4 * s, -66 * s, 1.6 * s, 57 * s);
    if (sailFull) {
        const belly = 16 * s;
        ctx.fillStyle = '#0f0d0a';
        ctx.beginPath();
        ctx.moveTo(0, -64 * s);
        ctx.quadraticCurveTo(belly + 6 * s, -38 * s, 2 * s, -14 * s);
        ctx.lineTo(0, -64 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ddd3b6';
        ctx.beginPath();
        ctx.moveTo(0, -63 * s);
        ctx.quadraticCurveTo(belly, -38 * s, 1 * s, -15 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b3a888';
        ctx.beginPath();
        ctx.moveTo(0, -63 * s);
        ctx.quadraticCurveTo(belly * 0.55, -40 * s, 1 * s, -15 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2ead2';
        ctx.beginPath();
        ctx.moveTo(0, -62 * s);
        ctx.quadraticCurveTo(belly * 0.9, -40 * s, 3 * s, -30 * s);
        ctx.lineTo(0, -62 * s);
        ctx.closePath();
        ctx.fill();
    } else {
        // Furled: the sail bundled along the boom.
        ctx.fillStyle = '#0f0d0a';
        ctx.fillRect(-22 * s, -20 * s, 44 * s, 7 * s);
        ctx.fillStyle = '#b3a888';
        ctx.fillRect(-21 * s, -19 * s, 42 * s, 5 * s);
        ctx.fillStyle = '#8b8168';
        for (let i = -18; i < 20; i += 7) ctx.fillRect(i * s, -19 * s, 1.6 * s, 5 * s);
    }
    ctx.restore();
}

/** The Amber Tower: a slender spire with three sockets over its door. */
function drawAmberTower(ctx, cx, baseY, scale, litSockets, animTimer) {
    const s = scale;
    const h = 268 * s;
    ctx.fillStyle = '#100c14';
    ctx.beginPath();
    ctx.moveTo(cx - 40 * s, baseY);
    ctx.lineTo(cx - 25 * s, baseY - h);
    ctx.lineTo(cx + 25 * s, baseY - h);
    ctx.lineTo(cx + 40 * s, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 37 * s, baseY);
    ctx.lineTo(cx - 23 * s, baseY - h + 4 * s);
    ctx.lineTo(cx + 23 * s, baseY - h + 4 * s);
    ctx.lineTo(cx + 37 * s, baseY);
    ctx.closePath();
    ctx.clip();
    stoneWall(ctx, cx - 40 * s, baseY - h, 80 * s, h, 8123, '#c9a45a', '#a07f3c', '#6b5222', '#3f2f14');
    ctx.restore();
    // Lit face down the left side, to keep the cylinder reading as round
    ctx.fillStyle = 'rgba(255, 226, 138, 0.14)';
    ctx.beginPath();
    ctx.moveTo(cx - 37 * s, baseY);
    ctx.lineTo(cx - 23 * s, baseY - h + 4 * s);
    ctx.lineTo(cx - 6 * s, baseY - h + 4 * s);
    ctx.lineTo(cx - 12 * s, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 12, 30, 0.30)';
    ctx.beginPath();
    ctx.moveTo(cx + 15 * s, baseY);
    ctx.lineTo(cx + 10 * s, baseY - h + 4 * s);
    ctx.lineTo(cx + 23 * s, baseY - h + 4 * s);
    ctx.lineTo(cx + 37 * s, baseY);
    ctx.closePath();
    ctx.fill();
    // A corbelled parapet under the cap
    ctx.fillStyle = '#100c14';
    ctx.fillRect(cx - 32 * s, baseY - h - 2 * s, 64 * s, 12 * s);
    ctx.fillStyle = '#a07f3c';
    ctx.fillRect(cx - 30 * s, baseY - h, 60 * s, 9 * s);
    ctx.fillStyle = '#c9a45a';
    ctx.fillRect(cx - 30 * s, baseY - h, 60 * s, 3 * s);
    // Conical cap
    ctx.fillStyle = '#2a1c34';
    ctx.beginPath();
    ctx.moveTo(cx - 33 * s, baseY - h - 2 * s);
    ctx.lineTo(cx + 33 * s, baseY - h - 2 * s);
    ctx.lineTo(cx, baseY - h - 58 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#453058';
    ctx.beginPath();
    ctx.moveTo(cx - 33 * s, baseY - h - 2 * s);
    ctx.lineTo(cx - 6 * s, baseY - h - 2 * s);
    ctx.lineTo(cx, baseY - h - 58 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(cx - 1.4 * s, baseY - h - 70 * s, 2.8 * s, 13 * s);
    // Arrow slits down the shaft
    ctx.fillStyle = '#0a0710';
    [0.52, 0.36].forEach((f) => {
        ctx.fillRect(cx - 3 * s, baseY - h * f, 6 * s, 16 * s);
    });
    // The high window Elowen stands at
    ctx.fillStyle = '#0a0710';
    ctx.fillRect(cx - 11 * s, baseY - h * 0.76, 22 * s, 30 * s);
    ctx.fillStyle = '#f6d98a';
    ctx.fillRect(cx - 8 * s, baseY - h * 0.76 + 3 * s, 16 * s, 24 * s);
    ctx.fillStyle = '#0a0710';
    for (let b = -5; b <= 5; b += 5) ctx.fillRect(cx + b * s, baseY - h * 0.76 + 3 * s, 1.6 * s, 24 * s);
    // Door
    ctx.fillStyle = '#100a08';
    ctx.beginPath();
    ctx.moveTo(cx - 19 * s, baseY);
    ctx.lineTo(cx - 19 * s, baseY - 34 * s);
    ctx.quadraticCurveTo(cx, baseY - 56 * s, cx + 19 * s, baseY - 34 * s);
    ctx.lineTo(cx + 19 * s, baseY);
    ctx.closePath();
    ctx.fill();
    woodPlanks(ctx, cx - 16 * s, baseY - 40 * s, 32 * s, 40 * s, true, 55);
    ctx.fillStyle = '#2b2620';
    ctx.fillRect(cx - 16 * s, baseY - 30 * s, 32 * s, 3 * s);
    ctx.fillRect(cx - 16 * s, baseY - 12 * s, 32 * s, 3 * s);
    // Three sockets over the lintel
    const socket = (i, filled) => {
        const sx = cx + (i - 1) * 21 * s;
        const sy = baseY - 66 * s;
        ctx.fillStyle = '#221808';
        ctx.beginPath(); ctx.arc(sx, sy, 9 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = filled ? PAL.GOLD_LIT : '#3d2f14';
        ctx.beginPath(); ctx.arc(sx, sy, 6.5 * s, 0, Math.PI * 2); ctx.fill();
        if (filled) {
            const pulse = 0.4 + Math.sin((animTimer || 0) / 260 + i) * 0.25;
            ctx.fillStyle = `rgba(255,240,180,${pulse})`;
            ctx.beginPath(); ctx.arc(sx, sy, 10 * s, 0, Math.PI * 2); ctx.fill();
        }
    };
    for (let i = 0; i < 3; i++) socket(i, (litSockets || 0) > i);
}

/** Chalk circle on a flagstone floor, used by the spell room. */
function drawChalkCircle(ctx, cx, cy, rx, ry, glow, animTimer) {
    ctx.save();
    ctx.strokeStyle = '#d8d2c0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 7, ry - 4, 0, 0, Math.PI * 2); ctx.stroke();
    // Sigils around the rim, drawn as short chalk strokes rather than glyphs
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = cx + Math.cos(a) * (rx - 3.5);
        const y = cy + Math.sin(a) * (ry - 2);
        ctx.strokeStyle = '#c5bda8';
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + Math.cos(a) * 4, y + 3);
        ctx.stroke();
    }
    if (glow) {
        const pulse = 0.22 + Math.sin((animTimer || 0) / 200) * 0.16;
        ctx.fillStyle = `rgba(185,140,255,${pulse})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ========== THE THREE TREASURES ==========
// Each is drawn by exactly one helper, used by the room that holds it, the
// inventory close-up and the Amber Tower door. They must never drift.

function drawChestOfCormac(ctx, cx, cy, s) {
    ctx.fillStyle = '#0f0a05';
    ctx.fillRect(cx - 21 * s, cy - 17 * s, 42 * s, 32 * s);
    woodPlanks(ctx, cx - 19 * s, cy - 6 * s, 38 * s, 19 * s, false, 31);
    ctx.fillStyle = '#0f0a05';
    ctx.beginPath();
    ctx.moveTo(cx - 19 * s, cy - 6 * s);
    ctx.quadraticCurveTo(cx, cy - 24 * s, cx + 19 * s, cy - 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_BASE;
    ctx.beginPath();
    ctx.moveTo(cx - 17 * s, cy - 6 * s);
    ctx.quadraticCurveTo(cx, cy - 21 * s, cx + 17 * s, cy - 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.WOOD_LIT;
    ctx.beginPath();
    ctx.moveTo(cx - 17 * s, cy - 6 * s);
    ctx.quadraticCurveTo(cx - 8 * s, cy - 19 * s, cx - 1 * s, cy - 20 * s);
    ctx.lineTo(cx - 5 * s, cy - 6 * s);
    ctx.closePath();
    ctx.fill();
    // Gold banding and the lock plate
    ctx.fillStyle = PAL.GOLD_SHADOW;
    [-11, 0, 11].forEach((bx) => {
        ctx.fillRect(cx + bx * s - 2 * s, cy - 6 * s, 4 * s, 19 * s);
    });
    ctx.fillStyle = PAL.GOLD_BASE;
    [-11, 0, 11].forEach((bx) => {
        ctx.fillRect(cx + bx * s - 2 * s, cy - 6 * s, 1.6 * s, 19 * s);
    });
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(cx - 19 * s, cy - 7.5 * s, 38 * s, 3.4 * s);
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(cx - 19 * s, cy - 7.5 * s, 38 * s, 1.2 * s);
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.fillRect(cx - 5 * s, cy - 4 * s, 10 * s, 9 * s);
    ctx.fillStyle = '#2a1f08';
    ctx.fillRect(cx - 1.4 * s, cy - 1 * s, 2.8 * s, 4 * s);
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(cx - 5 * s, cy - 4 * s, 10 * s, 1.2 * s);
}

function drawShieldOfArdor(ctx, cx, cy, s, animTimer) {
    ctx.fillStyle = '#0c0d12';
    ctx.beginPath(); ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.SILVER_SHADOW;
    ctx.beginPath(); ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.SILVER_BASE;
    ctx.beginPath(); ctx.arc(cx - 1.5 * s, cy - 1.5 * s, 16 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.SILVER_LIT;
    ctx.beginPath(); ctx.arc(cx - 4 * s, cy - 5 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
    // Rim, boss and a sunburst device
    ctx.strokeStyle = PAL.GOLD_BASE;
    ctx.lineWidth = Math.max(1, 2.4 * s);
    ctx.beginPath(); ctx.arc(cx, cy, 17 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = PAL.GOLD_SHADOW;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillRect(6 * s, -1.2 * s, 9 * s, 2.4 * s);
        ctx.restore();
    }
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.beginPath(); ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.beginPath(); ctx.arc(cx - 1.6 * s, cy - 1.6 * s, 3.2 * s, 0, Math.PI * 2); ctx.fill();
    // The shield is warm: one travelling specular bar sells the metal.
    const sweep = ((animTimer || 0) / 24) % 80 - 40;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 17 * s, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(cx + sweep * s * 0.5 - 2 * s, cy - 20 * s, 3 * s, 40 * s);
    ctx.restore();
}

function drawMirrorOfIanthe(ctx, cx, cy, s, animTimer) {
    ctx.fillStyle = '#100c04';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 15 * s, 19 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 4 * s, cy + 12 * s, 8 * s, 16 * s);
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 13.4 * s, 17.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.beginPath(); ctx.ellipse(cx - 1 * s, cy - 5 * s, 12 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.beginPath(); ctx.ellipse(cx - 3 * s, cy - 9 * s, 6 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Glass: dark inset, cool tone, exactly one white specular
    ctx.fillStyle = '#1a2230';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 9.4 * s, 13 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a6c8c';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 8.4 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
    const drift = Math.sin((animTimer || 0) / 480) * 2.4;
    ctx.fillStyle = '#9fc4e4';
    ctx.beginPath(); ctx.ellipse(cx - 2 * s + drift * s * 0.2, cy - 7 * s, 4.4 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 4.6 * s, cy - 11 * s, 2 * s, 5.4 * s);
    // Handle
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(cx - 3 * s, cy + 12 * s, 6 * s, 15 * s);
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.fillRect(cx - 3 * s, cy + 12 * s, 2.2 * s, 15 * s);
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(cx - 3.4 * s, cy + 25 * s, 6.8 * s, 2.6 * s);
}
