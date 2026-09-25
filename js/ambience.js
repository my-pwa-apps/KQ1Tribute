// ============================================================
// CROWN QUEST - AMBIENT LIFE
// Small deterministic motion laid over a finished scene - glints on water
// and treasure, fireflies, falling leaves, a laid fire - so a still picture
// reads as a place. Everything is a pure function of animTimer and a seed.
// ============================================================

/* eslint-disable no-unused-vars -- consumed by the room modules */

/** Light catching water or treasure: seeded specks that flash briefly and
 *  never in step. Specks are 2px blocks on even coordinates so every one
 *  survives the 320x200 raster. `rgb` is an 'r,g,b' triple; `star` draws a
 *  small cross (coins, glass) instead of a dash (ripples). */
function glints(ctx, x, y, w, h, animTimer, { seed = 1717, count = 16, rgb = '255,252,236', star = false } = {}) {
    const next = seededRandom(seed);
    for (let i = 0; i < count; i++) {
        const gx = Math.round((x + next() * w) / 2) * 2;
        const gy = Math.round((y + next() * h) / 2) * 2;
        const period = 1100 + next() * 1900;
        const offset = next() * period;
        const long = next() > 0.5;
        const p = ((animTimer + offset) % period) / period;
        if (p > 0.24) continue;
        const a = Math.sin(p / 0.24 * Math.PI);
        ctx.fillStyle = `rgba(${rgb},${(0.9 * a).toFixed(3)})`;
        if (star) {
            ctx.fillRect(gx, gy, 2, 2);
            if (a > 0.6) { ctx.fillRect(gx - 2, gy, 6, 2); ctx.fillRect(gx, gy - 2, 2, 6); }
        } else {
            ctx.fillRect(gx - (long ? 2 : 0), gy, long ? 6 : 2, 2);
        }
    }
}

/** Fireflies wandering a slow figure of eight, each blinking on its own clock. */
function fireflies(ctx, x, y, w, h, animTimer, seed = 2323, count = 8) {
    const next = seededRandom(seed);
    for (let i = 0; i < count; i++) {
        const bx = x + next() * w, by = y + next() * h;
        const ax = 8 + next() * 22, ay = 4 + next() * 10;
        const speed = 0.00022 + next() * 0.00026, ph = next() * Math.PI * 2;
        const blink = 1800 + next() * 2600, offset = next() * blink;
        const b = ((animTimer + offset) % blink) / blink;
        if (b > 0.45) continue;
        const glow = Math.sin(b / 0.45 * Math.PI);
        const fx = Math.round((bx + Math.sin(animTimer * speed + ph) * ax) / 2) * 2;
        const fy = Math.round((by + Math.sin(animTimer * speed * 1.9 + ph * 2) * ay) / 2) * 2;
        ctx.fillStyle = `rgba(190,255,110,${(0.14 * glow).toFixed(3)})`;
        ctx.fillRect(fx - 4, fy - 4, 10, 10);
        ctx.fillStyle = `rgba(210,255,130,${(0.3 * glow).toFixed(3)})`;
        ctx.fillRect(fx - 2, fy - 2, 6, 6);
        ctx.fillStyle = `rgba(236,255,170,${(0.95 * glow).toFixed(3)})`;
        ctx.fillRect(fx, fy, 2, 2);
    }
}

/** Leaves coming down through a wood, fluttering (edge-on, then flat) as
 *  they sway. */
function fallingLeaves(ctx, x, y, w, h, animTimer, seed = 3131, count = 6) {
    const next = seededRandom(seed);
    const tones = [['#c08a2c', '#7a4e16'], ['#9a6420', '#5a3610'], ['#7f8a2a', '#4a5214']];
    for (let i = 0; i < count; i++) {
        const bx = x + next() * w;
        const speed = 0.010 + next() * 0.008;
        const offset = next() * h;
        const sway = 6 + next() * 12, ph = next() * Math.PI * 2;
        const [lit, dark] = tones[Math.floor(next() * tones.length)];
        const fx = Math.round((bx + Math.sin(animTimer / 700 + ph) * sway) / 2) * 2;
        const fy = Math.round((y + (animTimer * speed + offset) % h) / 2) * 2;
        const flat = Math.sin(animTimer / 260 + ph) > 0;
        ctx.fillStyle = dark;
        if (flat) ctx.fillRect(fx + 2, fy + 2, 4, 2); else ctx.fillRect(fx, fy + 2, 2, 2);
        ctx.fillStyle = lit;
        if (flat) ctx.fillRect(fx, fy, 6, 2); else ctx.fillRect(fx, fy - 2, 2, 4);
    }
}

/** A laid fire: embers, two crossed logs, then the flames. Black underdrawing
 *  under each log so it reads against a dark hearth. */
function logFire(ctx, cx, baseY, width, animTimer, opts = {}) {
    const half = width / 2;
    const out = !!opts.doused;
    if (!out) {
        const glow = 0.5 + Math.sin(animTimer / 620) * 0.2;
        ctx.fillStyle = `rgba(226,110,40,${(glow * 0.45).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(cx, baseY, half * 1.25, half * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = out ? '#1a1614' : '#2a1108';
    ctx.beginPath(); ctx.ellipse(cx, baseY, half, half * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) {
        const flick = (Math.sin(animTimer / 220 + i * 1.9) + 1) * 0.5;
        if (out) ctx.fillStyle = i % 3 === 0 ? '#8a8480' : '#4a4440';
        else ctx.fillStyle = flick > 0.66 ? PAL.FLAME_MID : (flick > 0.33 ? PAL.EMBER : '#4a1a08');
        ctx.fillRect(cx - half * 0.85 + i * half * 1.7 / 8 - 2, baseY - 2, 4, 3);
    }
    const thick = Math.max(6, width * 0.11);
    const bark = out ? ['#2e2824', '#4a423c', '#1c1714', '#6a625a'] : ['#5a3a1e', '#7a5230', '#34200f', '#c8a070'];
    for (const [angle, len] of [[-0.2, width * 0.92], [0.24, width * 0.8]]) {
        ctx.save();
        ctx.translate(cx, baseY - thick * 0.4);
        ctx.rotate(angle);
        ctx.fillStyle = '#0e0906';
        ctx.fillRect(-len / 2 - 1, -thick / 2 - 1, len + 2, thick + 2);
        ctx.fillStyle = bark[0];
        ctx.fillRect(-len / 2, -thick / 2, len, thick);
        ctx.fillStyle = bark[1];
        ctx.fillRect(-len / 2, -thick / 2, len, thick * 0.28);
        ctx.fillStyle = bark[2];
        ctx.fillRect(-len / 2, thick * 0.22, len, thick * 0.28);
        ctx.fillStyle = bark[3];
        ctx.fillRect(len / 2 - 3, -thick / 2 + 1, 3, thick - 2);
        ctx.restore();
    }
    if (out) return;
    const n = Math.max(3, Math.round(width / 16));
    for (let i = 0; i < n; i++) {
        const fx = cx - half * 0.7 + i * half * 1.4 / (n - 1);
        flame(ctx, fx, baseY - thick * 0.6, (0.55 + Math.abs(Math.sin(i * 1.7)) * 0.5) * width / 72, animTimer + i * 530);
    }
}

