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
    ctx.fillStyle = '#0e1424';
    ctx.fillRect(0, 216, w, h - 216);
    ditherRect(ctx, 0, 216, w, 30, '#1c2338', '#0e1424', 2);
    ditherRect(ctx, 0, 246, w, 40, '#0e1424', '#080d18', 2);
    // Moon road and one lit path from the tower
    for (let i = 0; i < 30; i++) {
        const f = i / 30;
        ctx.fillStyle = `rgba(200,212,236,${0.36 - f * 0.28})`;
        ctx.fillRect(moonX - f * 30 + Math.sin(t / 500 + i) * 6, 220 + i * 5.6, 10 + f * 40, 2);
        ctx.fillStyle = `rgba(255,214,150,${0.26 - f * 0.2})`;
        ctx.fillRect(556 - f * 24 + Math.cos(t / 620 + i) * 5, 222 + i * 5.2, 8 + f * 30, 2);
    }

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
    ctx.fillStyle = '#0b0d14';
    for (let i = 0; i < 5; i++) drawPine(ctx, 40 + i * 150, 352, 0.5, i);
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
    // Dusk headland, matching the room it interrupts
    skyBands(ctx, 0, 0, w, 170, ['#2a2f60', '#5c4b84', '#a86a70', '#e0a06a']);
    waterBand(ctx, 0, 170, w, 90, elapsed, 4646);
    ctx.fillStyle = 'rgba(255,190,120,0.16)';
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
    drawAmberTower(ctx, 470, 336, 0.9, 3, elapsed);

    const strike1 = beat(progress, 0.10, 0.26);
    const shatter = beat(progress, 0.26, 0.40);
    const strike2 = beat(progress, 0.50, 0.66);
    const undone = beat(progress, 0.66, 0.94);

    // Morvane, left, arm up
    const mArm = 0.2 + strike1 * 1.1 + strike2 * 0.4;
    if (undone < 1) {
        ctx.save();
        if (undone > 0) {
            ctx.globalAlpha = 1 - undone;
            ctx.translate(0, undone * 6);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(142, 350, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
        drawVgaPerson(ctx, 142, 350, 2.5, Object.assign({}, CAST_MORVANE, {
            nearArm: { side: 1, up: -mArm, lo: -0.3 },
            farArm: { side: -1, up: 0.2, lo: 0.4 }
        }));
        ctx.restore();
    }

    // Rowan, right of centre, shield or mirror raised
    const rowanArm = (strike1 > 0 && shatter < 1) ? 0.9 : (strike2 > 0 ? 1.0 : 0.2);
    if (window.engine) {
        window.engine.drawContactShadow(ctx, 330, 352, 1, { rx: 24, ry: 5, alpha: 0.3 });
        window.engine.drawEgoFront(ctx, 330, 352, 2.1, { armAngle: rowanArm });
    }
    if (shatter < 1) {
        drawShieldOfArdor(ctx, 292, 316, 1.1 + shatter * 0.1, elapsed);
        if (shatter > 0) {
            // Cracks opening across it before it goes
            ctx.strokeStyle = '#2a1c14';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const a = i * 1.05;
                ctx.beginPath();
                ctx.moveTo(292, 316);
                ctx.lineTo(292 + Math.cos(a) * 20 * shatter, 316 + Math.sin(a) * 20 * shatter);
                ctx.stroke();
            }
            ctx.lineWidth = 1;
        }
    } else {
        // Fragments falling
        for (let i = 0; i < 9; i++) {
            const f = (progress - 0.40) * 3 + i * 0.06;
            if (f < 0 || f > 1) continue;
            ctx.fillStyle = i % 2 ? PAL.SILVER_BASE : PAL.SILVER_SHADOW;
            ctx.fillRect(292 + (i - 4) * 9 * f, 316 + f * f * 46, 5, 4);
        }
    }
    if (strike2 > 0) {
        drawMirrorOfIanthe(ctx, 296, 306, 1.0, elapsed);
    }

    // The bolt
    if ((strike1 > 0 && strike1 < 1) || (strike2 > 0 && strike2 < 1)) {
        const outbound = strike1 > 0 && strike1 < 1;
        const f = outbound ? strike1 : strike2;
        const x0 = outbound ? 168 : 168;
        const x1 = outbound ? 168 + f * 120 : 296 - f * 130;
        ctx.strokeStyle = PAL.ARCANE_BRIGHT;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(outbound ? x0 : 296, 308);
        for (let i = 1; i <= 6; i++) {
            const t2 = i / 6;
            const bx = (outbound ? x0 : 296) + ((outbound ? x1 : x1) - (outbound ? x0 : 296)) * t2;
            ctx.lineTo(bx, 308 + Math.sin(t2 * 9 + elapsed / 40) * 9);
        }
        ctx.stroke();
        ctx.strokeStyle = '#f0e2ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        if (window.engine) window.engine.lightPool(ctx, x1, 308, 120, '185,140,255', 0.3);
    }

    // Morvane coming apart
    if (undone > 0) {
        const next = seededRandom(3939);
        for (let i = 0; i < 90; i++) {
            const a = next() * Math.PI * 2;
            const r = next() * 70 * undone;
            ctx.fillStyle = `rgba(185,140,255,${(1 - undone) * 0.8})`;
            ctx.fillRect(142 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.9 - undone * 40, 2, 2);
        }
        if (window.engine) window.engine.lightPool(ctx, 142, 300, 200 * undone, '185,140,255', 0.3 * (1 - undone));
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

    // Dais
    ctx.fillStyle = '#221d17';
    ctx.fillRect(210, 244, 220, 12);
    ctx.fillStyle = '#4a4234';
    ctx.fillRect(212, 246, 216, 8);
    ctx.fillStyle = '#6a6050';
    ctx.fillRect(212, 246, 216, 2);
    ctx.fillStyle = '#8c2f2a';
    ctx.fillRect(250, 254, 140, 96);
    ctx.fillStyle = '#a8443a';
    ctx.fillRect(250, 254, 140, 4);
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(250, 254, 3, 96);
    ctx.fillRect(387, 254, 3, 96);

    // The court, in two ranks either side, all from the shared cel
    const crowd = [
        [116, 348, 2.2, CAST_HATTIE], [168, 342, 2.05, CAST_VILLAGER],
        [500, 348, 2.2, CAST_VILLAGER], [552, 342, 2.05, CAST_HATTIE],
        [90, 322, 1.65, CAST_VILLAGER], [566, 322, 1.65, CAST_FENNOW]
    ];
    crowd.forEach(([cx, cy, cs, pal], i) => {
        if (window.engine) window.engine.drawContactShadow(ctx, cx, cy, 1, { rx: 7 * cs, ry: 2 * cs, alpha: 0.24 });
        drawVgaPerson(ctx, cx, cy, cs, Object.assign({}, pal, {
            nearArm: { side: 1, up: 0.2 + Math.sin(elapsed / 700 + i) * 0.14, lo: 0.4 },
            farArm: { side: -1, up: -0.2, lo: 0.4 }
        }));
    });

    // Elowen sets the crown; Rowan kneels, then stands.
    const kneel = 1 - beat(progress, 0.55, 0.75);
    const crownY = 250 + beat(progress, 0.2, 0.5) * 34;
    if (window.engine) {
        window.engine.drawContactShadow(ctx, 320, 350, 1, { rx: 26, ry: 5, alpha: 0.3 });
        ctx.save();
        ctx.translate(320, 350);
        ctx.scale(1, 1 - kneel * 0.22);
        window.engine.drawEgoFront(ctx, 0, 0, 2.1, { armAngle: kneel > 0.5 ? 0 : 0.4 });
        ctx.restore();
    }
    drawVgaPerson(ctx, 250, 350, 2.25, Object.assign({}, CAST_ELOWEN, {
        nearArm: { side: 1, up: -0.9, lo: -0.5 },
        farArm: { side: -1, up: 0.2, lo: 0.4 }
    }));
    // The crown itself, descending
    ctx.fillStyle = PAL.GOLD_SHADOW;
    ctx.fillRect(304, crownY, 32, 12);
    ctx.fillStyle = PAL.GOLD_BASE;
    ctx.fillRect(304, crownY + 2, 32, 8);
    [304, 312, 320, 328].forEach((cx) => {
        ctx.beginPath();
        ctx.moveTo(cx, crownY + 2); ctx.lineTo(cx + 6, crownY + 2); ctx.lineTo(cx + 3, crownY - 8);
        ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = PAL.GOLD_LIT;
    ctx.fillRect(304, crownY + 2, 32, 2);
    ctx.fillStyle = '#c23a26';
    ctx.fillRect(316, crownY + 4, 5, 4);
    if (window.engine) window.engine.lightPool(ctx, 320, crownY, 90, '255,230,160', 0.22);

    // The goat, in the great hall, unremovable
    if (progress > 0.4) {
        drawGoat(ctx, 430, 356, 0.72, -1, false, elapsed);
    }

    let caption = 'They bring you into the great hall in a borrowed cloak, and nobody laughs.';
    if (progress > 0.22) caption = 'Elowen of the Amber Tower lifts the crown of Alderhaven.';
    if (progress > 0.5) caption = 'It is heavier than a pail of water, which you did not expect.';
    if (progress > 0.72) caption = 'From the sorcerer\'s scullery to the throne of Alderhaven. Nobody sees this coming. Including you.';
    cutsceneCaption(ctx, w, h, caption, 1);
}

/** The opening: eleven years of scrubbing, in four beats. */
function cutsceneOpening(ctx, w, h, progress, elapsed) {
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, w, h);
    const phase = Math.min(3, Math.floor(progress * 4));
    const local = (progress * 4) % 1;

    if (phase === 0) {
        // The crag from the sea, at night, with one lit window
        skyBands(ctx, 0, 0, w, 200, ['#080a1a', '#12183a', '#1e2a52', '#2f3f68']);
        starField(ctx, w, 150, 909, 90, 1);
        ctx.fillStyle = '#0d1020';
        ctx.beginPath();
        ctx.moveTo(180, 260); ctx.lineTo(240, 120); ctx.lineTo(330, 96);
        ctx.lineTo(420, 140); ctx.lineTo(470, 260);
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
        ctx.fillStyle = 'rgba(10,12,26,0.5)';
        ctx.fillRect(0, 258, w, h - 258);
    } else if (phase === 1) {
        // A scullery floor, a brush, and a very small pair of hands
        ctx.fillStyle = '#2c2820';
        ctx.fillRect(0, 0, w, h);
        const next = seededRandom(303);
        for (let y = 0; y < h; y += 46) {
            for (let x = -20; x < w; x += 62) {
                const tone = next();
                ctx.fillStyle = tone > 0.66 ? '#403a2f' : (tone > 0.3 ? '#37322a' : '#2d2922');
                ctx.fillRect(x + 2, y + 2, 58, 42);
                ctx.fillStyle = '#4a4438';
                ctx.fillRect(x + 2, y + 2, 58, 2);
                ctx.fillStyle = '#1d1a15';
                ctx.fillRect(x + 2, y + 42, 58, 2);
            }
        }
        const scrub = Math.sin(elapsed / 180) * 40;
        ctx.fillStyle = 'rgba(190,200,205,0.16)';
        ctx.beginPath();
        ctx.ellipse(320 + scrub, 250, 96, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#241708';
        ctx.fillRect(276 + scrub, 232, 84, 22);
        ctx.fillStyle = PAL.WOOD_BASE;
        ctx.fillRect(278 + scrub, 234, 80, 14);
        ctx.fillStyle = '#8a7a54';
        for (let i = 0; i < 26; i++) ctx.fillRect(280 + scrub + i * 3, 248, 2, 12);
        ctx.fillStyle = PAL.PLAYER.skin;
        ctx.fillRect(292 + scrub, 208, 24, 28);
        ctx.fillRect(322 + scrub, 212, 24, 26);
        ctx.fillStyle = PAL.PLAYER.skinDeep;
        ctx.fillRect(292 + scrub, 230, 24, 6);
        ctx.fillStyle = PAL.PLAYER.tunic;
        ctx.fillRect(286 + scrub, 180, 36, 32);
        ctx.fillRect(320 + scrub, 184, 36, 32);
        window.engine && window.engine.vignette(ctx, 0.7, '6,5,10');
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
