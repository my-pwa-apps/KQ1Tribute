// ============================================================
// CROWN QUEST - CUTSCENES AND TITLE ART
// ------------------------------------------------------------
// Set-piece animations. Every figure and vehicle here is drawn by the
// same shared helper the rooms use, so the cast can never drift between
// gameplay and its own set pieces.
//   cutscene*(ctx, w, h, progress, elapsed)
// ============================================================

/* eslint-disable no-unused-vars -- consumed by js/game.js and the room modules */

/** Letterboxed caption bar used by every cutscene, so they all read as one film. */
function cutsceneCaption(ctx, w, h, text, alpha) {
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha === undefined ? 1 : alpha));
    ctx.fillStyle = 'rgba(8,6,12,0.82)';
    ctx.fillRect(0, h - 54, w, 40);
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(0, h - 54, w, 1);
    ctx.fillRect(0, h - 15, w, 1);
    ctx.font = sceneFont(13);
    ctx.fillStyle = '#f2e8cc';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h - 29);
    ctx.textAlign = 'left';
    ctx.restore();
}

/** Cross-fade helper: returns 0..1 for a beat that starts at `from` and ends
 *  at `to` in normalised cutscene progress. */
function beat(progress, from, to) {
    if (progress <= from) return 0;
    if (progress >= to) return 1;
    return (progress - from) / (to - from);
}

// ========== TITLE SCREEN BACKDROP ==========

/** Alderhaven at dusk, seen from the water: the whole game in one frame. */
function drawTitleBackdrop(ctx, w, h, eng, t) {
    skyBands(ctx, 0, 0, w, 210, ['#141a3c', '#2f2a5e', '#6a3f6a', '#b8635a', '#e09a5e']);
    starField(ctx, w, 110, 1717, 70, 1);
    // Moon, banded rather than gradient-shaded
    const moonX = 132, moonY = 66;
    ctx.fillStyle = 'rgba(230,236,248,0.10)';
    ctx.beginPath(); ctx.arc(moonX, moonY, 34, 0, Math.PI * 2); ctx.fill();
    ['#8f96ac', '#b9c0d2', '#dee3ee'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(moonX - i * 2, moonY - i * 2, 22 - i * 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(120,128,150,0.5)';
    [[126, 60, 5], [138, 72, 3], [130, 76, 2]].forEach(([mx, my, mr]) => {
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    });
    // Cloud bars catching the last of the light
    for (let i = 0; i < 5; i++) {
        const cy = 96 + i * 22;
        const drift = Math.sin(t / 14000 + i) * 24;
        ctx.fillStyle = i % 2 ? 'rgba(52,40,74,0.72)' : 'rgba(76,52,86,0.62)';
        ctx.beginPath();
        ctx.ellipse(180 + i * 120 + drift, cy, 110 - i * 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(226,150,110,0.42)';
        ctx.beginPath();
        ctx.ellipse(180 + i * 120 + drift, cy - 3.4, 92 - i * 10, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ridgeline, castle, tower
    distantRange(ctx, 216, w, 46, 3131, '#2c2a44', 0.9);
    drawCastle(ctx, 236, 218, 0.9, '#26243a', '#3c3a56');
    ctx.fillStyle = '#1d1b2c';
    ctx.beginPath();
    ctx.moveTo(470, 220); ctx.lineTo(506, 190); ctx.lineTo(560, 202); ctx.lineTo(612, 186);
    ctx.lineTo(640, 220);
    ctx.closePath(); ctx.fill();
    drawAmberTower(ctx, 556, 200, 0.42, 3, t);

    // The channel
    ctx.fillStyle = '#1c2338';
    ctx.fillRect(0, 216, w, 30);
    ctx.fillStyle = '#0e1424';
    ctx.fillRect(0, 246, w, 40);
    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 286, w, h - 286);
    blendSeam(ctx, 0, 246, w, '#1c2338', '#0e1424');
    blendSeam(ctx, 0, 286, w, '#0e1424', '#080d18');
    // Moon road and one lit path from the tower
    lightReflection(ctx, moonX, 220, 340, 26, 74, '200,212,236', 9134, t);
    lightReflection(ctx, 556, 222, 336, 26, 57, '255,214,150', 4471, t);

    // The skiff crossing, small and alone
    const sail = (t % 26000) / 26000;
    const sx = 640 - sail * 760;
    drawSkiff(ctx, sx, 300 + Math.sin(sail * Math.PI * 3) * 5, 0.72, true, t);

    // Near shore, in silhouette
    ctx.fillStyle = '#080a10';
    ctx.beginPath();
    ctx.moveTo(0, 348); ctx.lineTo(140, 336); ctx.lineTo(380, 350); ctx.lineTo(640, 338);
    ctx.lineTo(640, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    grassFringe(ctx, 0, 344, w, 2121, 100, '#1a2216', '#121a10', '#0b1009');
    const nightPine = { deep: '#05060b', base: '#0b0e16', shadow: '#070a11', lit: '#111726', trunk: '#04050a' };
    for (let i = 0; i < 5; i++) drawPine(ctx, 40 + i * 150, 352, 0.5, i, nightPine);
}

// ========== ACT I ==========

/** Morvane comes up the crag path while Rowan hides behind the boulder.
 *  Shot from behind the boulder, so we see what Rowan sees. */
function cutsceneMorvanePasses(ctx, w, h, progress, elapsed) {
    skyBands(ctx, 0, 0, w, 150, ['#3a4f80', '#5f7fae', '#8fa9c8', '#b9c9d8']);
    distantRange(ctx, 150, w, 30, 4242, '#8296b4', 0.7);
    waterBand(ctx, 0, 154, w, 70, elapsed, 3141);
    // Cliff and path
    ctx.fillStyle = '#191b18';
    ctx.beginPath();
    ctx.moveTo(0, 210); ctx.lineTo(260, 200); ctx.lineTo(640, 216); ctx.lineTo(640, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 214); ctx.lineTo(260, 204); ctx.lineTo(640, 220); ctx.lineTo(640, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.clip();
    rockFace(ctx, 0, 200, w, h - 200, 5150, '#8e8878', '#6a6558', '#433f36');
    ctx.fillStyle = PAL.GRASS_BASE;
    ctx.fillRect(0, 214, w, 22);
    ctx.fillStyle = '#8a8168';
    ctx.beginPath();
    ctx.moveTo(60, h); ctx.lineTo(230, h); ctx.lineTo(410, 240); ctx.lineTo(350, 238);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    grassFringe(ctx, 0, 232, w, 1717, 80, '#7aa055', '#568038', '#33581f');

    // Morvane climbing, small at first, then close
    const walk = beat(progress, 0.05, 0.72);
    const mx = 470 - walk * 210;
    const my = 250 + walk * 82;
    const ms = 1.0 + walk * 0.9;
    const stride = Math.sin(elapsed / 260) * 0.32;
    if (walk > 0 && progress < 0.86) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(mx, my, 22 * ms, 5 * ms, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawVgaPerson(ctx, mx, my, ms * 1.5, Object.assign({}, CAST_MORVANE, {
            nearArm: { side: 1, up: 0.4 + stride, lo: 0.2 },
            farArm: { side: -1, up: -0.3 - stride, lo: 0.3 }
        }));
        // The staff, striking stone on the beat
        ctx.strokeStyle = '#241a10';
        ctx.lineWidth = Math.max(1, 2.4 * ms);
        ctx.beginPath();
        ctx.moveTo(mx + 7 * ms, my - 42 * ms);
        ctx.lineTo(mx + 11 * ms + stride * 8, my);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = PAL.ARCANE_BRIGHT;
        ctx.beginPath();
        ctx.arc(mx + 7 * ms, my - 44 * ms, 3.4 * ms, 0, Math.PI * 2);
        ctx.fill();
    }

    // The boulder we are hiding behind, hard in the foreground
    ctx.fillStyle = '#0f0e0a';
    ctx.beginPath();
    ctx.moveTo(-20, h); ctx.lineTo(-10, 190); ctx.lineTo(120, 150);
    ctx.lineTo(210, 236); ctx.lineTo(196, h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4b473e';
    ctx.beginPath();
    ctx.moveTo(-14, h); ctx.lineTo(-6, 196); ctx.lineTo(116, 158);
    ctx.lineTo(200, 240); ctx.lineTo(188, h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a6558';
    ctx.beginPath();
    ctx.moveTo(-14, 300); ctx.lineTo(-6, 196); ctx.lineTo(116, 158); ctx.lineTo(92, 250);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2822';
    ctx.beginPath();
    ctx.moveTo(92, 252); ctx.lineTo(118, 160); ctx.lineTo(200, 240); ctx.lineTo(188, h); ctx.lineTo(110, h);
    ctx.closePath(); ctx.fill();
    // Rowan's cap and one eye over the top of it
    if (progress < 0.9) {
        const peek = progress > 0.3 && progress < 0.62 ? 6 : 0;
        ctx.save();
        ctx.translate(150, 214 - peek);
        ctx.scale(0.9, 0.9);
        ctx.fillStyle = PAL.PLAYER.hair;
        ctx.fillRect(-14, 0, 28, 14);
        ctx.fillStyle = PAL.PLAYER.capLo;
        ctx.fillRect(-17, -8, 34, 10);
        ctx.fillStyle = PAL.PLAYER.cap;
        ctx.fillRect(-14, -18, 28, 12);
        ctx.fillRect(-17, -9, 34, 8);
        ctx.fillStyle = PAL.PLAYER.capHi;
        ctx.fillRect(-12, -17, 10, 8);
        ctx.fillStyle = PAL.PLAYER.feather;
        ctx.fillRect(12, -34, 4, 20);
        ctx.fillStyle = PAL.PLAYER.skin;
        ctx.fillRect(-11, 2, 22, 6);
        ctx.fillStyle = PAL.PLAYER.eyeWhite;
        ctx.fillRect(-8, 3, 7, 5);
        ctx.fillRect(2, 3, 7, 5);
        ctx.fillStyle = PAL.PLAYER.iris;
        ctx.fillRect(-6, 3, 4, 5);
        ctx.fillRect(4, 3, 4, 5);
        ctx.restore();
    }

    // The house door closing at the end
    if (progress > 0.78) {
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.7, (progress - 0.78) * 3) + ')';
        ctx.fillRect(0, 0, w, h);
    }
    const caption = progress < 0.3
        ? 'Something is coming up the path.'
        : (progress < 0.62
            ? 'Morvane climbs past, close enough to touch, and does not look aside once.'
            : 'The door of the house opens, and closes, and you can breathe again.');
    cutsceneCaption(ctx, w, h, caption, 1);
}

/** The crossing to Alderhaven. */
function cutsceneSailAway(ctx, w, h, progress, elapsed) {
    skyBands(ctx, 0, 0, w, 190, ['#2f4f8c', '#4f7bb0', '#8fb0d0', '#c3d8e8']);
    // Weather building astern: the thimble was not a gentle spell
    const stormX = 640 - progress * 300;
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(60,64,90,${0.5 - i * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(stormX + i * 40, 44 + i * 20, 110 - i * 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (progress > 0.3 && Math.floor(elapsed / 900) % 5 === 0 && elapsed % 900 < 90) {
        ctx.strokeStyle = '#f2f0d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stormX + 30, 60); ctx.lineTo(stormX + 12, 108);
        ctx.lineTo(stormX + 30, 104); ctx.lineTo(stormX + 6, 160);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
    // The crag receding astern, Alderhaven growing ahead
    const away = beat(progress, 0, 1);
    ctx.fillStyle = '#5d7392';
    const cragS = 1 - away * 0.6;
    ctx.beginPath();
    ctx.moveTo(520 + away * 100, 190);
    ctx.lineTo(548 + away * 100, 190 - 54 * cragS);
    ctx.lineTo(576 + away * 100, 190 - 30 * cragS);
    ctx.lineTo(608 + away * 100, 190);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4b5f7c';
    ctx.fillRect(546 + away * 100, 190 - 58 * cragS, 10 * cragS, 10 * cragS);

    const near = away;
    distantRange(ctx, 192, w, 20 + near * 34, 3311, '#7f95b0', 0.85);
    drawCastle(ctx, 200 - near * 20, 192, 0.3 + near * 0.5, '#5b6478', '#79839a');
    for (let i = 0; i < 4; i++) {
        const bx = 300 + i * 70;
        const bs = (0.2 + near * 0.34);
        ctx.fillStyle = '#1a1610';
        ctx.fillRect(bx - 20 * bs, 192 - 38 * bs, 40 * bs, 38 * bs);
        stoneWall(ctx, bx - 19 * bs, 192 - 37 * bs, 38 * bs, 37 * bs, 700 + bx, '#8f8776', '#726a5b', '#4e483d', '#3b362d');
        thatchRoof(ctx, bx, 192 - 58 * bs, 26 * bs, 192 - 37 * bs, 400 + bx);
    }

    waterBand(ctx, 0, 192, w, h - 192, elapsed, 5757);
    // Bow wave and wake
    const bob = Math.sin(elapsed / 480) * 5;
    drawSkiff(ctx, 300, 322 + bob, 1.5, true, elapsed);
    ctx.fillStyle = 'rgba(232,244,250,0.7)';
    for (let i = 0; i < 16; i++) {
        const f = i / 16;
        ctx.fillRect(240 - f * 30 + Math.sin(elapsed / 200 + i) * 4, 328 + bob + i * 3, 30 + f * 60, 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(354, 318 + bob, 22, 3);
    ctx.fillRect(348, 324 + bob, 30, 2);

    drawGull(ctx, 140, 90, 1.2, elapsed, 0.5);
    drawGull(ctx, 196, 66, 1, elapsed, 2.2);

    const caption = progress < 0.34
        ? 'The wind comes out of the thimble all at once, and the sail fills like a struck drum.'
        : (progress < 0.7
            ? 'Serpent\'s Crag falls astern. You have never in your life been more than a mile from that rock.'
            : 'Ahead, thatch and a castle, and a coastline that has never once heard of you.');
    cutsceneCaption(ctx, w, h, caption, 1);
}

// ========== ACT III ==========

/** The confrontation at the tower door. Morvane strikes; the shield takes it
 *  and breaks; the mirror gives the second stroke back to him. */
function cutsceneMorvaneDuel(ctx, w, h, progress, elapsed) {
    // Dusk headland. The tower stays a distant silhouette so it is not wallpaper
    // behind two people standing in a line.
    const strike1 = beat(progress, 0.10, 0.26);
    const shatter = beat(progress, 0.26, 0.40);
    const strike2 = beat(progress, 0.50, 0.66);
    const undone = beat(progress, 0.66, 0.94);
    const boltLive = (strike1 > 0 && strike1 < 1) || (strike2 > 0 && strike2 < 1);
    const flash = boltLive ? 0.55 : (shatter > 0 && shatter < 1 ? 0.22 : undone * 0.18);

    skyBands(ctx, 0, 0, w, 170, ['#1a1848', '#3a2a68', '#7a4868', '#c07a58']);
    if (flash > 0) {
        ctx.fillStyle = `rgba(185,140,255,${0.16 * flash})`;
        ctx.fillRect(0, 0, w, 170);
    }
    waterBand(ctx, 0, 170, w, 90, elapsed, 4646);
    ctx.fillStyle = flash > 0 ? `rgba(160,110,220,${0.14 * flash})` : 'rgba(255,190,120,0.12)';
    ctx.fillRect(0, 170, w, 90);
    ctx.fillStyle = '#14151c';
    ctx.beginPath();
    ctx.moveTo(0, 268); ctx.lineTo(330, 262); ctx.lineTo(640, 266); ctx.lineTo(640, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 272); ctx.lineTo(330, 266); ctx.lineTo(640, 270); ctx.lineTo(640, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.clip();
    rockFace(ctx, 0, 250, w, h - 250, 7878, '#7d6a5c', '#584c42', '#332d28');
    ctx.fillStyle = '#576330';
    ctx.fillRect(0, 272, w, 26);
    ctx.fillStyle = '#3f4a24';
    ctx.fillRect(0, 292, w, h - 292);
    ctx.restore();
    // Tower far right, small, so the fight owns the frame
    drawAmberTower(ctx, 572, 268, 0.38, 3, elapsed);
    ctx.fillStyle = 'rgba(20,16,28,0.28)';
    ctx.fillRect(540, 200, 100, 80);

    // Morvane, larger, filling the left third
    const mArm = 0.35 + strike1 * 1.25 + strike2 * 0.5;
    if (undone < 1) {
        ctx.save();
        if (undone > 0) {
            ctx.globalAlpha = 1 - undone;
            ctx.translate(0, undone * 6);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.beginPath(); ctx.ellipse(118, 358, 36, 8, 0, 0, Math.PI * 2); ctx.fill();
        drawVgaPerson(ctx, 118, 358, 3.15, Object.assign({}, CAST_MORVANE, {
            hood: CAST_MORVANE.hood,
            nearArm: { side: 1, up: -mArm, lo: -0.55 },
            farArm: { side: -1, up: 0.35, lo: 0.5 }
        }));
        // A face inside the hood. Without it he is a purple bell with a glove.
        ctx.fillStyle = '#0d0a14';
        ctx.beginPath();
        ctx.ellipse(118, 262, 13, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6d5f78';
        ctx.beginPath();
        ctx.ellipse(119, 264, 9.5, 12.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b7d95';
        ctx.beginPath();
        ctx.ellipse(115, 260, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a2233';
        ctx.fillRect(111, 261, 15, 3);
        ctx.fillStyle = flash > 0 ? '#ffd9a0' : '#c8503a';
        ctx.fillRect(113, 259, 4, 3);
        ctx.fillRect(121, 259, 4, 3);
        ctx.fillStyle = '#1a1420';
        ctx.fillRect(114, 271, 10, 2);
        ctx.restore();
    }

    // Rowan, closer to camera, shield or mirror raised
    const rowanArm = (strike1 > 0 && shatter < 1) ? 1.05 : (strike2 > 0 ? 1.15 : 0.25);
    if (window.engine) {
        window.engine.drawContactShadow(ctx, 368, 360, 1, { rx: 30, ry: 6, alpha: 0.32 });
        window.engine.drawEgoFront(ctx, 368, 360, 2.35, { armAngle: rowanArm });
    }
    if (shatter < 1) {
        drawShieldOfArdor(ctx, 318, 318, 1.35 + shatter * 0.15, elapsed);
        if (shatter > 0) {
            ctx.strokeStyle = '#2a1c14';
            ctx.lineWidth = 2.4;
            for (let i = 0; i < 6; i++) {
                const a = i * 1.05;
                ctx.beginPath();
                ctx.moveTo(318, 318);
                ctx.lineTo(318 + Math.cos(a) * 26 * shatter, 318 + Math.sin(a) * 26 * shatter);
                ctx.stroke();
            }
            ctx.lineWidth = 1;
        }
    } else {
        for (let i = 0; i < 9; i++) {
            const f = (progress - 0.40) * 3 + i * 0.06;
            if (f < 0 || f > 1) continue;
            ctx.fillStyle = i % 2 ? PAL.SILVER_BASE : PAL.SILVER_SHADOW;
            ctx.fillRect(318 + (i - 4) * 11 * f, 318 + f * f * 52, 6, 4);
        }
    }
    if (strike2 > 0) {
        drawMirrorOfIanthe(ctx, 324, 308, 1.15, elapsed);
    }

    // The bolt, thick and forked, lighting the ground under it
    if (boltLive) {
        const outbound = strike1 > 0 && strike1 < 1;
        const f = outbound ? strike1 : strike2;
        const x0 = 168;
        const y0 = 268;
        const x1 = outbound ? 168 + f * 150 : 324 - f * 156;
        const y1 = outbound ? 268 + f * 42 : 308;
        ctx.strokeStyle = PAL.ARCANE_BRIGHT;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(outbound ? x0 : 324, outbound ? y0 : 308);
        for (let i = 1; i <= 7; i++) {
            const t2 = i / 7;
            const bx = (outbound ? x0 : 324) + (x1 - (outbound ? x0 : 324)) * t2;
            const by = (outbound ? y0 : 308) + (y1 - (outbound ? y0 : 308)) * t2;
            ctx.lineTo(bx + Math.sin(t2 * 11 + elapsed / 30) * 12, by + Math.sin(t2 * 9 + elapsed / 40) * 8);
        }
        ctx.stroke();
        ctx.strokeStyle = '#f0e2ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
        // Forks
        ctx.strokeStyle = '#d8b8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
        ctx.lineTo((x0 + x1) / 2 + 18, (y0 + y1) / 2 + 22);
        ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
        ctx.lineTo((x0 + x1) / 2 - 10, (y0 + y1) / 2 + 16);
        ctx.stroke();
        ctx.lineWidth = 1;
        if (window.engine) {
            window.engine.lightPool(ctx, x1, y1, 160, '185,140,255', 0.42);
            window.engine.lightPool(ctx, 240, 300, 220, '185,140,255', 0.18);
        }
        ctx.fillStyle = 'rgba(185,140,255,0.12)';
        ctx.fillRect(0, 250, w, h - 250);
    }

    // Morvane coming apart
    if (undone > 0) {
        const next = seededRandom(3939);
        for (let i = 0; i < 120; i++) {
            const a = next() * Math.PI * 2;
            const r = next() * 90 * undone;
            ctx.fillStyle = `rgba(185,140,255,${(1 - undone) * 0.85})`;
            ctx.fillRect(118 + Math.cos(a) * r, 290 + Math.sin(a) * r * 0.9 - undone * 48, 3, 3);
        }
        if (window.engine) window.engine.lightPool(ctx, 118, 290, 240 * undone, '185,140,255', 0.36 * (1 - undone));
    }

    let caption = '"Stand aside," says Morvane, "and I will make it quick."';
    if (progress > 0.10) caption = 'You do not stand aside. You bring up the Shield of Ardor.';
    if (progress > 0.30) caption = 'The shield takes the whole of it, and holds, and then breaks — but it holds first.';
    if (progress > 0.46) caption = 'He gathers himself for a second. You have nothing left but a mirror.';
    if (progress > 0.60) caption = 'The Mirror of Ianthe shows him a moment later than he is. He meets his own stroke coming back.';
    if (progress > 0.72) caption = 'Morvane the sorcerer is unmade by the only thing he never learned to expect.';
    cutsceneCaption(ctx, w, h, caption, 1);
}

/** The coronation in the great hall. */
function cutsceneCoronation(ctx, w, h, progress, elapsed) {
    // Great hall interior, built on the same perspective vocabulary as the rooms
    const F = perspectiveFrame(640, 170, 470, 40, 250, 296);
    interiorShell(ctx, w, h, F, {
        void: '#0b0906',
        ceiling: '#1a140e',
        back: '#5b5346', backShade: '#453f35',
        leftWall: '#4a4438', rightWall: '#3c372d',
        floor: '#332e26',
        floorBands: [['#433d33', 250, 26], ['#3c372d', 276, 32], ['#332e26', 308, 38], ['#2b2721', 346, 50]]
    });
    drawPerspectiveSurface(ctx, 150, 120, {
        tl: { x: 0, y: 0 }, tr: { x: F.BW_L, y: F.BW_T },
        bl: { x: 0, y: F.EDGE }, br: { x: F.BW_L, y: F.BW_B }
    }, (s) => stoneWall(s, 0, 0, 150, 120, 1201, '#7c7362', '#5f5748', '#443e34', '#332e27'));
    drawPerspectiveSurface(ctx, 150, 120, {
        tl: { x: w, y: 0 }, tr: { x: F.BW_R, y: F.BW_T },
        bl: { x: w, y: F.EDGE }, br: { x: F.BW_R, y: F.BW_B }
    }, (s) => stoneWall(s, 0, 0, 150, 120, 3307, '#6c6454', '#524b3e', '#3a352c', '#2b2721'));
    stoneWall(ctx, F.BW_L, F.BW_T, F.BW_R - F.BW_L, F.BW_B - F.BW_T, 5501, '#877e6a', '#68604f', '#4a4438', '#383229');

    // Banners down both walls
    [[30, 120, F.lBand], [514, 606, F.rBand]].forEach(([x1, x2, band], side) => {
        F.trap(ctx, x1, x2, 0.05, 0.62, band);
        ctx.fillStyle = side ? '#3a2038' : '#42243f'; ctx.fill();
        F.trap(ctx, x1, x2, 0.05, 0.2, band);
        ctx.fillStyle = side ? '#4e2b4a' : '#583154'; ctx.fill();
        F.trap(ctx, x1 + (x2 - x1) * 0.36, x1 + (x2 - x1) * 0.62, 0.12, 0.5, band);
        ctx.fillStyle = PAL.GOLD_SHADOW; ctx.fill();
    });
    // Great window behind the dais, full of the same dusk
    ctx.fillStyle = '#100c08';
    ctx.fillRect(268, 60, 104, 120);
    ctx.fillStyle = '#e0a06a';
    ctx.fillRect(272, 64, 96, 112);
    ctx.fillStyle = '#a86a70';
    ctx.fillRect(272, 64, 96, 42);
    ctx.fillStyle = '#5c4b84';
    ctx.fillRect(272, 64, 96, 18);
    ctx.fillStyle = '#100c08';
    for (let i = 0; i <= 4; i++) ctx.fillRect(272 + i * 24, 64, 3, 112);
    for (let i = 0; i <= 3; i++) ctx.fillRect(272, 64 + i * 37, 96, 3);
    lightShaft(ctx, 320, 176, 100, 320, 372, 260, 0.14, 'rgba(255,214,150,1)');

    // Torches
    wallTorch(ctx, 96, F.lBand(96, 0.3), 1.1, elapsed, window.engine);
    wallTorch(ctx, 546, F.rBand(546, 0.3), 1.1, elapsed, window.engine);

    // Dais in three receding steps so it has depth
    [[168, 236, 304, 18, '#3a342c'], [196, 250, 248, 16, '#4a4234'], [224, 262, 192, 14, '#5a5040']].forEach(([dx, dy, dw, dh, col]) => {
        ctx.fillStyle = '#221d17';
        ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);
        ctx.fillStyle = col;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = '#6a6050';
        ctx.fillRect(dx, dy, dw, 3);
        ctx.fillStyle = '#2a241c';
        ctx.fillRect(dx, dy + dh - 3, dw, 3);
    });
    // Runner up the three treads, widening as it descends, so the carpet does
    // not stop dead at the bottom step.
    [[236, 18, 104], [250, 16, 120], [262, 14, 136]].forEach(([ry, rh, rw]) => {
        ctx.fillStyle = '#5b1b18';
        ctx.fillRect(320 - rw / 2 - 2, ry, rw + 4, rh);
        ctx.fillStyle = '#8c2f2a';
        ctx.fillRect(320 - rw / 2, ry, rw, rh);
        ctx.fillStyle = PAL.GOLD_SHADOW;
        ctx.fillRect(320 - rw / 2, ry, 3, rh);
        ctx.fillRect(320 + rw / 2 - 3, ry, 3, rh);
        ctx.fillStyle = '#a8443a';
        ctx.fillRect(320 - rw / 2, ry, rw, 2);
    });

    // Carpet running from the dais lip out past the bottom of frame. Its edges,
    // borders and cross-weave all come off the same two lines, so the gold
    // splays with the cloth instead of standing up as two vertical bars.
    const CT = 276, CB = 404;
    const carpetT = (y) => (y - CT) / (CB - CT);
    const carpetL = (y) => 250 - 64 * carpetT(y);
    const carpetR = (y) => 390 + 64 * carpetT(y);
    ctx.fillStyle = '#6d211d';
    ctx.beginPath();
    ctx.moveTo(carpetL(CT) - 3, CT); ctx.lineTo(carpetR(CT) + 3, CT);
    ctx.lineTo(carpetR(CB) + 3, CB); ctx.lineTo(carpetL(CB) - 3, CB);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8c2f2a';
    ctx.beginPath();
    ctx.moveTo(carpetL(CT), CT); ctx.lineTo(carpetR(CT), CT);
    ctx.lineTo(carpetR(CB), CB); ctx.lineTo(carpetL(CB), CB);
    ctx.closePath(); ctx.fill();
    // Weave bands, spaced wider as they come toward the viewer
    for (let i = 1; i < 7; i++) {
        const y = CT + (CB - CT) * Math.pow(i / 7, 1.7);
        const th = 1.4 + carpetT(y) * 2.6;
        ctx.fillStyle = 'rgba(168,68,58,0.55)';
        ctx.fillRect(carpetL(y), y, carpetR(y) - carpetL(y), th);
    }
    // Gold borders: trapezoids following each edge, widening with depth
    [-1, 1].forEach((side) => {
        const edge = side < 0 ? carpetL : carpetR;
        const bw = (y) => (4 + carpetT(y) * 5) * -side;
        ctx.fillStyle = PAL.GOLD_SHADOW;
        ctx.beginPath();
        ctx.moveTo(edge(CT), CT);
        ctx.lineTo(edge(CT) + bw(CT), CT);
        ctx.lineTo(edge(CB) + bw(CB), CB);
        ctx.lineTo(edge(CB), CB);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = PAL.GOLD_BASE;
        ctx.beginPath();
        ctx.moveTo(edge(CT) + bw(CT) * 0.25, CT);
        ctx.lineTo(edge(CT) + bw(CT) * 0.75, CT);
        ctx.lineTo(edge(CB) + bw(CB) * 0.75, CB);
        ctx.lineTo(edge(CB) + bw(CB) * 0.25, CB);
        ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = '#a8443a';
    ctx.fillRect(carpetL(CT), CT, carpetR(CT) - carpetL(CT), 5);

    // The court in overlapping ranks, far first, denser on the left
    const crowd = [
        [64, 306, 1.35, CAST_VILLAGER], [548, 308, 1.4, CAST_FENNOW],
        [108, 328, 1.8, CAST_VILLAGER], [500, 330, 1.7, CAST_VILLAGER],
        [84, 354, 2.2, CAST_HATTIE], [152, 348, 2.0, CAST_VILLAGER],
        [536, 358, 2.2, CAST_HATTIE]
    ];
    crowd.forEach(([cx, cy, cs, pal], i) => {
        if (window.engine) window.engine.drawContactShadow(ctx, cx, cy, 1, { rx: 7 * cs, ry: 2 * cs, alpha: 0.24 });
        drawVgaPerson(ctx, cx, cy, cs, Object.assign({}, pal, {
            animTimer: elapsed,
            phase: i * 1.31,
            nearArm: { side: 1, up: 0.2 + Math.sin(elapsed / 700 + i) * 0.14, lo: 0.4 },
            farArm: { side: -1, up: -0.2, lo: 0.4 }
        }));
    });
    // Heralds at the foot of the dais, sounding the fanfare outward
    [[196, 344, 2.05, -1, 0.4], [472, 346, 2.08, 1, 2.2]].forEach(([hx, hy, hs, face, ph]) => {
        if (window.engine) window.engine.drawContactShadow(ctx, hx, hy, 1, { rx: 7 * hs, ry: 2 * hs, alpha: 0.26 });
        drawTrumpeter(ctx, hx, hy, hs, face, elapsed, ph);
    });

    // Elowen sets the crown; Rowan kneels, then stands.
    const kneel = 1 - beat(progress, 0.55, 0.75);
    const seated = beat(progress, 0.2, 0.5);
    // drawEgoFront origin is the belt line; seat the circlet on the brim
    // (y - 24.2*s), not above the feather and not over the face.
    const rowanGround = 328;
    const rowanScale = 2.05;
    const squash = 1 - kneel * 0.22;
    const brimY = rowanGround - 24.2 * rowanScale * squash;
    const crownY = 188 + seated * (brimY - 188);
    if (window.engine) {
        window.engine.drawContactShadow(ctx, 320, rowanGround, 1, { rx: 26, ry: 5, alpha: 0.3 });
        ctx.save();
        ctx.translate(320, rowanGround);
        ctx.scale(1, 1 - kneel * 0.22);
        window.engine.drawEgoFront(ctx, 0, 0, rowanScale, { armAngle: kneel > 0.5 ? 0 : 0.4 });
        ctx.restore();
    }
    drawVgaPerson(ctx, 246, 336, 2.2, Object.assign({}, CAST_ELOWEN, {
        animTimer: elapsed,
        phase: 3.3,
        nearArm: { side: 1, up: -0.95, lo: -0.55 },
        farArm: { side: -1, up: 0.15, lo: 0.4 }
    }));
    // A circlet the width of the cap, not a gold hat
    const bandW = 16;
    const bandX = 320 - bandW / 2;
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(bandX, crownY, bandW, 5);
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.fillRect(bandX, crownY + 1, bandW, 3);
    [bandX, bandX + 4, bandX + 8, bandX + 12].forEach((cx) => {
        ctx.beginPath();
        ctx.moveTo(cx, crownY + 1); ctx.lineTo(cx + 4, crownY + 1); ctx.lineTo(cx + 2, crownY - 4);
        ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(bandX, crownY + 1, bandW, 1);
    ctx.fillStyle = '#c23a26';
    ctx.fillRect(318, crownY + 2, 3, 2);
    if (window.engine) window.engine.lightPool(ctx, 320, crownY, 50, '255,230,160', 0.16);

    // The goat, in the great hall, unremovable
    if (progress > 0.4) {
        drawGoat(ctx, 412, 360, 0.78, -1, false, elapsed);
    }

    let caption = 'They bring you into the great hall in a borrowed cloak, and nobody laughs.';
    if (progress > 0.22) caption = 'Your mother, Queen Elowen, lifts the crown your father has laid down.';
    if (progress > 0.5) caption = 'It is heavier than a pail of water, which you did not expect.';
    if (progress > 0.72) caption = 'From the sorcerer\'s scullery to the throne. This time, the choice is yours.';
    cutsceneCaption(ctx, w, h, caption, 1);
}

function drawScrubbingRowan(ctx, eng, brushX, elapsed) {
    const hipX = 320, hipY = 328;
    const lean = 0.95 + Math.sin(elapsed / 280) * 0.035;
    const cosine = Math.cos(lean), sine = Math.sin(lean);
    const palette = PAL.PLAYER;
    eng.drawContactShadow(ctx, hipX + 4, 344, 1, { rx: 48, ry: 7, alpha: 0.34 });
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(lean);
    eng.drawEgoFront(ctx, 0, 0, 3.6, {
        drawLegs: (cel) => {
            cel.save();
            cel.rotate(-lean);
            cel.lineJoin = 'round';
            for (const offset of [-7, 7]) {
                for (const [colour, width] of [[palette.bootDeep, 15], [palette.hose, 11], [palette.hoseHi, 3]]) {
                    cel.strokeStyle = colour;
                    cel.lineWidth = width;
                    cel.beginPath();
                    cel.moveTo(offset, -4);
                    cel.lineTo(offset + 14, 10);
                    cel.lineTo(offset - 23, 10);
                    cel.stroke();
                }
                cel.fillStyle = palette.bootDeep;
                cel.fillRect(offset - 35, 0, 15, 17);
                cel.fillStyle = palette.boot;
                cel.fillRect(offset - 33, 2, 11, 13);
                cel.fillStyle = palette.bootHi;
                cel.fillRect(offset - 32, 3, 3, 10);
            }
            cel.restore();
        },
        drawArms: (cel, centerX, centerY, scale) => {
            const colours = { edge: palette.tunicOutline, sleeve: '#DDDDDD', sleeveLo: '#AAAAAA',
                skin: palette.skin, skinLo: palette.skinDeep };
            for (const [side, gripOffset] of [[-1, -24], [1, 12]]) {
                const shoulderX = centerX + side * 4.8 * scale;
                const shoulderY = centerY - 14.6 * scale;
                const worldX = brushX + gripOffset - hipX;
                const worldY = 323 - hipY;
                const targetX = worldX * cosine + worldY * sine;
                const targetY = -worldX * sine + worldY * cosine;
                const deltaX = targetX - shoulderX, deltaY = targetY - shoulderY;
                const upper = 6.2 * scale, lower = 6.15 * scale;
                const distance = Math.hypot(deltaX, deltaY);
                const bend = Math.acos(Math.max(-1, Math.min(1,
                    (distance * distance + upper * upper - lower * lower) / (2 * distance * upper))));
                const upperAngle = Math.atan2(-deltaX, deltaY) - bend;
                const elbowX = shoulderX - Math.sin(upperAngle) * upper;
                const elbowY = shoulderY + Math.cos(upperAngle) * upper;
                const foreAngle = Math.atan2(-(targetX - elbowX), targetY - elbowY) - upperAngle;
                drawVgaArm(cel, shoulderX, shoulderY, scale, 1, upperAngle, foreAngle, colours);
            }
        }
    });
    ctx.restore();
}

/** The opening: eleven years of scrubbing, in four beats. */
function cutsceneOpening(ctx, w, h, progress, elapsed) {
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, w, h);
    const phase = Math.min(3, Math.floor(progress * 4));
    const local = (progress * 4) % 1;

    if (phase === 0) {
        // The crag from the sea, at night, with one lit window
        skyBands(ctx, 0, 0, w, 258, ['#080a1a', '#12183a', '#1e2a52', '#2f3f68']);
        starField(ctx, w, 150, 909, 90, 1);
        ctx.fillStyle = '#0d1020';
        ctx.beginPath();
        ctx.moveTo(180, 262); ctx.lineTo(240, 120); ctx.lineTo(330, 96);
        ctx.lineTo(420, 140); ctx.lineTo(470, 262);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#161a2c';
        ctx.fillRect(288, 96, 70, 54);
        ctx.fillStyle = '#0d1020';
        ctx.beginPath();
        ctx.moveTo(280, 96); ctx.lineTo(366, 96); ctx.lineTo(322, 62);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f6d98a';
        ctx.fillRect(302, 112, 16, 14);
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(309, 112, 2, 14);
        waterBand(ctx, 0, 258, w, h - 258, elapsed, 111);
        // Night knocks the sea right down; the day palette reads far too bright.
        ctx.fillStyle = 'rgba(8,10,24,0.68)';
        ctx.fillRect(0, 258, w, h - 258);
        blendSeam(ctx, 0, 258, w, '#2f3f68', '#111a2e');
        // The one warm reflection under the lit window
        lightReflection(ctx, 310, 260, 340, 12, 26, '246,217,138', 5512, elapsed);
    } else if (phase === 1) {
        // Wide on the scullery: the boy, the brush, the floor. A hands-and-brush
        // close-up was tried first and read as a pair of legs.
        ctx.fillStyle = '#191309';
        ctx.fillRect(0, 0, w, h);
        stoneWall(ctx, 0, 0, w, 132, 1201, '#5e5240', '#473c2d', '#332a20', '#241d15');
        ctx.fillStyle = 'rgba(8,6,3,0.68)';
        ctx.fillRect(0, 0, w, 132);
        // Skirting course and the shadow the wall throws across the flagstones
        ctx.fillStyle = '#0d0904';
        ctx.fillRect(0, 126, w, 10);
        ctx.fillStyle = 'rgba(8,6,3,0.5)';
        ctx.fillRect(0, 136, w, 26);
        // Flagstones, courses widening fast so the floor separates from the wall
        const next = seededRandom(303);
        let fy = 136;
        let depth = 11;
        let row = 0;
        while (fy < h + 40) {
            const stoneW = depth * 3.6;
            let fx = -stoneW * (row % 2 ? 0.5 : 0.15);
            while (fx < w + stoneW) {
                const tone = next();
                // Near courses are warmer and lighter, so the floor separates
                // from the wall instead of continuing its brickwork.
                const band = row > 4 ? 2 : (row > 2 ? 1 : 0);
                ctx.fillStyle = tone > 0.68
                    ? ['#514734', '#6a5f47', '#867a5c'][band]
                    : (tone > 0.32
                        ? ['#463d2d', '#5b523d', '#736950'][band]
                        : ['#3a3226', '#4c4433', '#605844'][band]);
                ctx.fillRect(fx + 2, fy + 2, stoneW - 4, depth - 3);
                ctx.fillStyle = band === 2 ? '#9a8d6d' : '#6d6350';
                ctx.fillRect(fx + 2, fy + 2, stoneW - 4, 1.5 + band);
                ctx.fillStyle = '#241f18';
                ctx.fillRect(fx + 2, fy + depth - 3, stoneW - 4, 1.5 + band);
                fx += stoneW;
            }
            fy += depth;
            depth *= 1.3;
            row++;
        }
        const scrub = Math.sin(elapsed / 280) * 12;
        // The wet arc already scrubbed, with suds along its edge
        ctx.fillStyle = 'rgba(150,180,190,0.16)';
        ctx.beginPath();
        ctx.ellipse(380, 322, 190, 52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(232,242,246,0.5)';
        for (let i = 0; i < 34; i++) {
            const a = next() * Math.PI * 2;
            const rr = 0.84 + next() * 0.2;
            ctx.fillRect(380 + Math.cos(a) * 190 * rr, 322 + Math.sin(a) * 52 * rr, 2, 2);
        }
        // His pail, from the shared inventory art so it is the same object
        ctx.save();
        ctx.translate(150, 280);
        ctx.scale(3.4, 3.4);
        ITEM_ART.pail(ctx, 0, 0, 0);
        ctx.restore();
        const bx = 380 + scrub;
        ctx.fillStyle = '#140d05';
        ctx.fillRect(bx - 38, 318, 76, 22);
        ctx.fillStyle = PAL.WOOD_SHADOW;
        ctx.fillRect(bx - 35, 321, 70, 15);
        ctx.fillStyle = PAL.WOOD_BASE;
        ctx.fillRect(bx - 35, 321, 70, 6);
        ctx.fillStyle = PAL.WOOD_LIT;
        ctx.fillRect(bx - 31, 322, 48, 2);
        ctx.fillStyle = '#140d05';
        ctx.fillRect(bx - 38, 336, 76, 4);
        for (let i = 0; i < 24; i++) {
            ctx.fillStyle = i % 3 ? '#9c8a5e' : '#7b6c47';
            ctx.fillRect(bx - 34 + i * 2.9, 340, 2, 10);
        }
        if (window.engine) drawScrubbingRowan(ctx, window.engine, bx, elapsed);
        window.engine && window.engine.vignette(ctx, 0.6, '6,5,10');
    } else if (phase === 2) {
        // Morvane's silhouette in a doorway, seen from the floor
        ctx.fillStyle = '#141018';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f6d98a';
        ctx.beginPath();
        ctx.moveTo(230, h); ctx.lineTo(240, 90);
        ctx.quadraticCurveTo(320, 46, 400, 90);
        ctx.lineTo(410, h);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,150,0.2)';
        ctx.fillRect(180, 90, 280, h - 90);
        ctx.save();
        ctx.translate(320, h - 10);
        ctx.scale(2.6, 2.6);
        ctx.globalAlpha = 1;
        drawVgaPerson(ctx, 0, 0, 5.6, Object.assign({}, CAST_MORVANE, {
            edge: '#0a0710', robe: '#100a18', robeHi: '#160f22', robeLo: '#080510',
            coat: '#100a18', coatHi: '#160f22', coatLo: '#080510',
            collar: '#160f22', skin: '#1a1424', skinHi: '#211a2e', skinLo: '#120d1a',
            hair: '#0a0710', hairHi: '#120c1a', hairLo: '#050308',
            hood: '#0c0714', hoodHi: '#140d1e', hoodEye: '#b98cff', mouth: '#0a0710',
            nearArm: { side: 1, up: 0.2, lo: 0.3 },
            farArm: { side: -1, up: -0.15, lo: 0.3 }
        }));
        ctx.restore();
    } else {
        // Eleven years later: the same floor, bigger hands, and the door closing
        ctx.fillStyle = '#1a1610';
        ctx.fillRect(0, 0, w, h);
        skyBands(ctx, 0, 0, w, 120, ['#3a4f80', '#5f7fae', '#8fa9c8', '#b9c9d8']);
        ctx.fillStyle = '#191b18';
        ctx.fillRect(0, 118, w, h - 118);
        rockFace(ctx, 0, 118, w, h - 118, 5150, '#8e8878', '#6a6558', '#433f36');
        ctx.fillStyle = PAL.GRASS_BASE;
        ctx.fillRect(0, 122, w, 20);
        const away = local;
        ctx.fillStyle = '#151109';
        ctx.fillRect(220, 60, 200, 180);
        stoneWall(ctx, 224, 64, 192, 172, 3131, '#5c5467', '#463f52', '#322c3e', '#241f2c');
        thatchRoof(ctx, 320, 10, 124, 66, 707);
        ctx.fillStyle = '#0c0a10';
        ctx.fillRect(292, 150, 56, 90);
        ctx.fillStyle = '#f6d98a';
        ctx.fillRect(294, 152, 52 * (1 - away), 86);
        if (window.engine) {
            window.engine.drawContactShadow(ctx, 320, 340, 1, { rx: 32, ry: 6, alpha: 0.3 });
            window.engine.drawEgoFront(ctx, 320, 340, 2.4, { armAngle: 0 });
        }
        window.engine && window.engine.vignette(ctx, 0.4, '10,10,16');
    }

    const captions = [
        'Eleven years ago, a sorcerer took a child off a wrecked ship and did not give it back.',
        'You do not remember the ship. You remember the floor. You have scrubbed it every day since.',
        'His name is Morvane, and he has never once told you yours.',
        'Today the house is empty, and the front door is not locked, and you are going to find out what happens.'
    ];
    cutsceneCaption(ctx, w, h, captions[phase], 1);
}
