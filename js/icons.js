// ============================================================
// CROWN QUEST - INVENTORY AND PORTRAIT ICONS
// ------------------------------------------------------------
// Two lookup tables handed to the engine by js/game.js:
//   ITEM_ART[id](ctx, cx, cy, animTimer)      - 56px inventory close-up
//   PORTRAIT_ART[id](ctx, cx, cy, face)       - 56px speaker portrait
// The treasures reuse the shared helpers from js/art.js, and every portrait
// is built from one bust helper driven by the js/actors.js cast palettes, so
// a character can never look like two different people.
// ============================================================

/* eslint-disable no-unused-vars -- consumed by js/game.js */

// ========== SPEAKER PORTRAITS ==========

/** Head-and-shoulders bust on the same colour definitions as the walking cel.
 *  `o` accepts the CAST_* palettes plus portrait-only extras. */
function portraitBust(ctx, cx, cy, o, face) {
    const s = 1;
    const blink = face && face.blinking;
    const talking = face && face.mouthOpen;

    ctx.fillStyle = o.backdrop || '#1a1408';
    ctx.fillRect(cx - 28, cy - 28, 56, 56);
    // A soft vignette behind the head lifts the bust off the panel.
    ctx.fillStyle = o.backdropHi || 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 6, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders
    ctx.fillStyle = o.edge;
    ctx.fillRect(cx - 22, cy + 9, 44, 20);
    ctx.fillStyle = o.robe || o.coat;
    ctx.fillRect(cx - 20, cy + 11, 40, 18);
    ctx.fillStyle = o.coatHi;
    ctx.fillRect(cx - 20, cy + 11, 13, 18);
    ctx.fillStyle = o.coatLo;
    ctx.fillRect(cx + 12, cy + 11, 8, 18);
    ctx.fillStyle = o.collar;
    ctx.fillRect(cx - 11, cy + 9, 22, 4);

    const hh = o.portraitHeadScale || 1;
    ctx.save();
    ctx.translate(cx, cy + 10);
    ctx.scale(hh, hh);
    // Neck and skull
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(-5, -8, 10, 9);
    ctx.fillStyle = o.edge;
    ctx.beginPath();
    ctx.moveTo(-9, -34);
    ctx.lineTo(9, -34);
    ctx.lineTo(13, -30);
    ctx.lineTo(13, -11);
    ctx.lineTo(9, -5);
    ctx.lineTo(5, -2);
    ctx.lineTo(-5, -2);
    ctx.lineTo(-9, -5);
    ctx.lineTo(-13, -11);
    ctx.lineTo(-13, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.skin;
    ctx.beginPath();
    ctx.moveTo(-8, -32);
    ctx.lineTo(8, -32);
    ctx.lineTo(11, -29);
    ctx.lineTo(11, -11);
    ctx.lineTo(7, -6);
    ctx.lineTo(4, -4);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-11, -11);
    ctx.lineTo(-11, -29);
    ctx.closePath();
    ctx.fill();
    // Ears and broad planes keep the tiny face dimensional without smoothing it.
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(-13, -23, 3, 9);
    ctx.fillRect(10, -23, 3, 9);
    ctx.fillStyle = o.skinHi;
    ctx.fillRect(-9, -29, 7, 12);
    ctx.fillRect(-7, -16, 4, 3);
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(7, -28, 4, 15);
    ctx.fillRect(5, -11, 5, 4);
    ctx.fillRect(-7, -7, 14, 2);
    // Brows
    ctx.fillStyle = o.hairLo;
    ctx.fillRect(-9, -23, 6, 2);
    ctx.fillRect(3, -23, 6, 2);
    // Eyes
    if (blink) {
        ctx.fillStyle = o.hairLo;
        ctx.fillRect(-9, -19, 6, 1);
        ctx.fillRect(3, -19, 6, 1);
        ctx.fillStyle = o.skinLo;
        ctx.fillRect(-8, -18, 5, 1);
        ctx.fillRect(3, -18, 5, 1);
    } else {
        ctx.fillStyle = '#F2F0E2';
        ctx.fillRect(-9, -20, 6, 3);
        ctx.fillRect(3, -20, 6, 3);
        ctx.fillStyle = o.eye;
        ctx.fillRect(-7, -20, 3, 3);
        ctx.fillRect(4, -20, 3, 3);
        ctx.fillStyle = '#120e0a';
        ctx.fillRect(-6, -19, 2, 2);
        ctx.fillRect(5, -19, 2, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7, -20, 1, 1);
        ctx.fillRect(4, -20, 1, 1);
        ctx.fillStyle = o.hairLo;
        ctx.fillRect(-9, -21, 6, 1);
        ctx.fillRect(3, -21, 6, 1);
    }
    // Nose
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(0, -18, 2, 7);
    ctx.fillRect(-1, -12, 5, 2);
    ctx.fillRect(-2, -11, 2, 1);
    ctx.fillStyle = o.skinHi;
    ctx.fillRect(-1, -17, 1, 5);
    // Mouth
    ctx.fillStyle = talking ? '#3a1a14' : o.mouth;
    if (talking) {
        ctx.fillRect(-4, -8, 8, 4);
        ctx.fillStyle = '#f0e4cc';
        ctx.fillRect(-3, -8, 6, 1);
        ctx.fillStyle = o.mouth;
        ctx.fillRect(-3, -4, 6, 1);
    } else {
        ctx.fillRect(-4, -8, 8, 1);
        ctx.fillRect(-3, -7, 6, 1);
        ctx.fillStyle = o.skinHi;
        ctx.fillRect(-2, -6, 4, 1);
    }
    // Beard
    if (o.beard) {
        const beardTip = 2 + o.beard * 2;
        ctx.fillStyle = o.hairLo;
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, -12);
        ctx.lineTo(11, -1);
        ctx.lineTo(7, 6);
        ctx.lineTo(3, beardTip - 2);
        ctx.lineTo(0, beardTip);
        ctx.lineTo(-3, beardTip - 2);
        ctx.lineTo(-7, 6);
        ctx.lineTo(-11, -1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.hair;
        ctx.beginPath();
        ctx.moveTo(-10, -11);
        ctx.lineTo(10, -11);
        ctx.lineTo(9, -1);
        ctx.lineTo(5, 6);
        ctx.lineTo(2, beardTip - 2);
        ctx.lineTo(0, beardTip - 1);
        ctx.lineTo(-2, beardTip - 2);
        ctx.lineTo(-5, 6);
        ctx.lineTo(-9, -1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-8, -9, 4, 10);
        ctx.fillRect(-5, 1, 3, 7);
        ctx.fillRect(-2, 8, 2, Math.max(2, beardTip - 10));
        ctx.fillStyle = o.hairLo;
        ctx.fillRect(1, 0, 2, beardTip - 5);
        ctx.fillStyle = talking ? '#3a1a14' : o.mouth;
        ctx.fillRect(-3, -7, 6, talking ? 3 : 1);
        if (talking) {
            ctx.fillStyle = '#f0e4cc';
            ctx.fillRect(-2, -7, 4, 1);
        }
    }
    // Hair
    ctx.fillStyle = o.hair;
    if (o.hairStyle === 'bald') {
        ctx.fillRect(-13, -26, 3, 10);
        ctx.fillRect(10, -26, 3, 10);
    } else if (o.hairStyle === 'long') {
        ctx.fillRect(-13, -35, 26, 11);
        ctx.fillRect(-16, -30, 4, 34);
        ctx.fillRect(12, -30, 4, 34);
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-8, -34, 11, 3);
    } else {
        ctx.fillRect(-13, -35, 26, 9);
        ctx.fillRect(-14, -29, 3, 9);
        ctx.fillRect(11, -29, 3, 9);
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-7, -34, 11, 3);
    }
    if (o.hood) {
        ctx.fillStyle = o.edge;
        ctx.beginPath(); ctx.arc(0, -24, 21, Math.PI, 0); ctx.fill();
        ctx.fillRect(-21, -24, 42, 18);
        ctx.fillStyle = o.hood;
        ctx.beginPath(); ctx.arc(0, -25, 18, Math.PI, 0); ctx.fill();
        ctx.fillRect(-18, -25, 36, 16);
        ctx.fillStyle = o.hoodHi;
        ctx.beginPath(); ctx.arc(-6, -26, 10, Math.PI, Math.PI * 1.62); ctx.fill();
        // The face stays in shadow inside the cowl; only the eyes carry.
        ctx.fillStyle = 'rgba(0,0,0,0.66)';
        ctx.fillRect(-12, -26, 24, 17);
        if (!blink) {
            ctx.fillStyle = o.hoodEye || o.eye;
            ctx.fillRect(-8, -20, 5, 3);
            ctx.fillRect(3, -20, 5, 3);
            ctx.fillStyle = 'rgba(185,140,255,0.35)';
            ctx.fillRect(-10, -22, 9, 7);
            ctx.fillRect(1, -22, 9, 7);
        }
    }
    if (o.hat) {
        ctx.fillStyle = o.edge;
        ctx.beginPath();
        ctx.moveTo(-30, -30); ctx.lineTo(30, -30); ctx.lineTo(6, -66);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = o.hat;
        ctx.beginPath();
        ctx.moveTo(-28, -32); ctx.lineTo(28, -32); ctx.lineTo(6, -63);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = o.hatHi || o.coatHi;
        ctx.beginPath();
        ctx.moveTo(-26, -32); ctx.lineTo(-14, -32); ctx.lineTo(3, -60);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = o.hatBand || o.belt;
        ctx.fillRect(-24, -37, 48, 5);
    }
    if (o.circlet) {
        ctx.fillStyle = o.circlet;
        ctx.fillRect(-13, -29, 26, 4);
        ctx.fillRect(-3, -34, 6, 6);
    }
    ctx.restore();
}

const PORTRAIT_ART = {
    morvane: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_MORVANE, {
        backdrop: '#150c22', backdropHi: 'rgba(122,79,208,0.16)', portraitHeadScale: 1.02
    }), face),
    hattie: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_HATTIE, {
        backdrop: '#20180c', backdropHi: 'rgba(255,220,150,0.09)'
    }), face),
    fennow: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_FENNOW, {
        backdrop: '#0f1a10', backdropHi: 'rgba(120,220,150,0.08)', portraitHeadScale: 0.96
    }), face),
    gnome: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_GNOME, {
        backdrop: '#171018', backdropHi: 'rgba(200,170,255,0.06)', portraitHeadScale: 1.12
    }), face),
    elowen: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_ELOWEN, {
        backdrop: '#141a26', backdropHi: 'rgba(200,220,255,0.10)'
    }), face),
    villager: (ctx, cx, cy, face) => portraitBust(ctx, cx, cy, Object.assign({}, CAST_VILLAGER, {
        backdrop: '#181a18'
    }), face),

    /** Corvus is not a person, so he gets the raven cel rather than a bust. */
    corvus: (ctx, cx, cy, face) => {
        ctx.fillStyle = '#141018';
        ctx.fillRect(cx - 28, cy - 28, 56, 56);
        ctx.fillStyle = 'rgba(180,180,220,0.05)';
        ctx.beginPath(); ctx.ellipse(cx, cy - 2, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
        drawRaven(ctx, cx + 8, cy + 22, 2.1, face && face.mouthOpen, face ? face.t : 0);
    },

    /** Grumbold, cropped to the head so the tusks fill the frame. */
    troll: (ctx, cx, cy, face) => {
        ctx.fillStyle = '#101609';
        ctx.fillRect(cx - 28, cy - 28, 56, 56);
        ctx.save();
        ctx.translate(cx - 2, cy + 42);
        ctx.scale(0.72, 0.72);
        drawTroll(ctx, 0, 0, 1.05, face ? face.t : 0, true);
        ctx.restore();
    },

    /** The giant, snoring, seen close. */
    giant: (ctx, cx, cy, face) => {
        ctx.fillStyle = '#1a1c26';
        ctx.fillRect(cx - 28, cy - 28, 56, 56);
        ctx.save();
        ctx.translate(cx + 58, cy + 48);
        drawSleepingGiant(ctx, 0, 0, 1, face ? face.t : 0);
        ctx.restore();
    }
};

// ========== INVENTORY CLOSE-UPS ==========

const PAINTED_ITEM_SPRITES = (() => {
    const sprites = Object.create(null);
    const options = new URLSearchParams(window.location.search);
    const style = options.get('props') || (options.get('scenery') === 'painted' ? 'painted' : 'procedural');
    if (style === 'painted') {
        for (const id of ['bread', 'pail', 'crock', 'candle', 'ledger', 'spellbook']) {
            const image = new Image();
            image.src = `icons/${id}-trial.png`;
            sprites[id] = image;
        }
    }
    return sprites;
})();

function drawPaintedItem(ctx, id, cx, base, width, height) {
    if (!Object.hasOwn(PAINTED_ITEM_SPRITES, id)) return false;
    const image = PAINTED_ITEM_SPRITES[id];
    if (!image.complete || !image.naturalWidth) return false;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, cx - image.naturalWidth * scale / 2,
        base - (image.naturalHeight - 2) * scale, image.naturalWidth * scale, image.naturalHeight * scale);
    ctx.restore();
    return true;
}

const ITEM_ART = {
    bread: (ctx, cx, cy) => {
        if (drawPaintedItem(ctx, 'bread', cx, cy + 13, 48, 28)) return;
        ctx.fillStyle = '#2a1a0c';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 20, 13, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b4522';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 1, 18, 11, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a5c30';
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy - 4, 11, 5, -0.12, 0, Math.PI * 2);
        ctx.fill();
        // Torn face showing the crumb
        ctx.fillStyle = '#d8c093';
        ctx.beginPath();
        ctx.moveTo(cx + 8, cy - 8);
        ctx.lineTo(cx + 19, cy - 3);
        ctx.lineTo(cx + 17, cy + 8);
        ctx.lineTo(cx + 7, cy + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b39c70';
        [[10, -3], [14, 1], [10, 3], [15, -6]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 2, 2));
        ctx.fillStyle = '#3a230f';
        ctx.fillRect(cx - 12, cy - 6, 9, 1);
        ctx.fillRect(cx - 9, cy + 2, 8, 1);
    },

    pail: (ctx, cx, cy, t) => {
        const painted = drawPaintedItem(ctx, 'pail', cx, cy + 17, 38, 44);
        if (!painted) {
        ctx.fillStyle = '#100b06';
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 12);
        ctx.lineTo(cx + 16, cy - 12);
        ctx.lineTo(cx + 12, cy + 17);
        ctx.lineTo(cx - 12, cy + 17);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.WOOD_SHADOW;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 10);
        ctx.lineTo(cx + 14, cy - 10);
        ctx.lineTo(cx + 10.5, cy + 15);
        ctx.lineTo(cx - 10.5, cy + 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.WOOD_BASE;
        ctx.fillRect(cx - 13, cy - 10, 8, 25);
        ctx.fillStyle = PAL.WOOD_LIT;
        ctx.fillRect(cx - 13, cy - 10, 3, 25);
        ctx.fillStyle = '#241708';
        for (let i = -6; i < 14; i += 6) ctx.fillRect(cx + i, cy - 10, 1, 25);
        // Iron hoops
        ctx.fillStyle = '#3a352c';
        ctx.fillRect(cx - 14, cy - 5, 28, 3);
        ctx.fillRect(cx - 12, cy + 8, 24, 3);
        ctx.fillStyle = '#6a6355';
        ctx.fillRect(cx - 14, cy - 5, 28, 1);
        // Handle
        ctx.strokeStyle = '#3a352c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 15, Math.PI, 0);
        ctx.stroke();
        ctx.lineWidth = 1;
        }
        // Water, if it is carrying any
        if (window.engine && window.engine.getFlag('pail_full')) {
            const ripple = Math.sin((t || 0) / 300) * 1.2;
            const waterWidth = painted ? 10 : 13;
            ctx.fillStyle = PAL.WATER_SHADOW;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 8 + ripple, waterWidth, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.WATER_BASE;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 9 + ripple, waterWidth - 1, 3.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.WATER_LIT;
            ctx.fillRect(cx - 7, cy - 10 + ripple, 6, 1);
        }
    },

    sea_salt: (ctx, cx, cy) => {
        // A twist of cloth holding a heap of coarse grey crystals.
        ctx.fillStyle = '#2a2418';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, 18, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b8ab88';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 16, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8f8468';
        ctx.beginPath();
        ctx.ellipse(cx + 5, cy + 8, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a2418';
        ctx.fillRect(cx - 5, cy - 16, 10, 8);
        ctx.fillStyle = '#d8cdb0';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 2);
        ctx.lineTo(cx - 4, cy - 15);
        ctx.lineTo(cx + 4, cy - 15);
        ctx.lineTo(cx + 12, cy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#efe6cc';
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy - 3);
        ctx.lineTo(cx - 4, cy - 14);
        ctx.lineTo(cx - 1, cy - 14);
        ctx.lineTo(cx - 4, cy - 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9a9078';
        ctx.fillRect(cx - 8, cy - 6, 16, 2);
        // Loose grains
        ctx.fillStyle = '#f4f0e2';
        [[-13, 12], [-8, 14], [10, 13], [14, 10], [2, 15]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 2, 2));
    },

    brass_key: (ctx, cx, cy) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#3a2a08';
        ctx.beginPath(); ctx.arc(0, -13, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-3, -6, 6, 26);
        ctx.fillRect(-3, 12, 12, 4);
        ctx.fillRect(-3, 18, 9, 4);
        ctx.fillStyle = PAL.GOLD_BASE;
        ctx.beginPath(); ctx.arc(0, -13, 8.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a08';
        ctx.beginPath(); ctx.arc(0, -13, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.GOLD_BASE;
        ctx.fillRect(-2.2, -6, 4.4, 25);
        ctx.fillRect(-2.2, 12, 10, 3);
        ctx.fillRect(-2.2, 17.5, 7, 3);
        ctx.fillStyle = PAL.GOLD_LIT;
        ctx.fillRect(-2.2, -6, 1.6, 25);
        ctx.beginPath(); ctx.arc(-2.6, -16, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.GOLD_SHADOW;
        ctx.fillRect(1, -6, 1.2, 25);
        ctx.restore();
    },

    raven_feather: (ctx, cx, cy) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(0.42);
        ctx.fillStyle = '#05050a';
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.quadraticCurveTo(11, -4, 3, 22);
        ctx.quadraticCurveTo(-9, -2, 0, -24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1c1c2a';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.quadraticCurveTo(9, -4, 2.5, 19);
        ctx.quadraticCurveTo(-2, -2, 0, -22);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#33334a';
        ctx.beginPath();
        ctx.moveTo(0, -21);
        ctx.quadraticCurveTo(-7, -3, 1.5, 16);
        ctx.quadraticCurveTo(-1, -2, 0, -21);
        ctx.closePath();
        ctx.fill();
        // Barbs, and the faint green sheen the description mentions
        ctx.strokeStyle = '#0a0a12';
        ctx.lineWidth = 1;
        for (let i = -19; i < 16; i += 3) {
            ctx.beginPath();
            ctx.moveTo(0.5, i);
            ctx.lineTo(6, i + 4);
            ctx.moveTo(0.5, i);
            ctx.lineTo(-5, i + 4);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(127,227,106,0.18)';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.quadraticCurveTo(8, -6, 2, 12);
        ctx.quadraticCurveTo(-1, -4, 0, -20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c9c2a8';
        ctx.fillRect(-0.8, 14, 1.6, 12);
        ctx.restore();
    },

    spellbook: (ctx, cx, cy, t) => {
        if (!drawPaintedItem(ctx, 'spellbook', cx, cy + 22, 38, 48)) {
        ctx.fillStyle = '#0d0810';
        ctx.fillRect(cx - 19, cy - 22, 38, 44);
        ctx.fillStyle = '#3a1f2a';
        ctx.fillRect(cx - 17, cy - 20, 34, 40);
        ctx.fillStyle = '#552d3c';
        ctx.fillRect(cx - 17, cy - 20, 11, 40);
        ctx.fillStyle = '#241218';
        ctx.fillRect(cx + 11, cy - 20, 6, 40);
        // Page edges
        ctx.fillStyle = '#d8cdae';
        ctx.fillRect(cx + 14, cy - 18, 5, 36);
        ctx.fillStyle = '#a89c80';
        for (let i = -16; i < 18; i += 3) ctx.fillRect(cx + 14, cy + i, 5, 1);
        // Corner bosses and clasp
        ctx.fillStyle = PAL.GOLD_SHADOW;
        [[-15, -18], [-15, 14], [7, -18], [7, 14]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 6, 5));
        ctx.fillStyle = PAL.GOLD_BASE;
        [[-15, -18], [-15, 14], [7, -18], [7, 14]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 4, 3));
        ctx.fillStyle = PAL.GOLD_SHADOW;
        ctx.fillRect(cx + 8, cy - 5, 11, 10);
        ctx.fillStyle = PAL.GOLD_LIT;
        ctx.fillRect(cx + 8, cy - 5, 11, 2);
        }
        // A sigil on the cover that will not hold still
        const pulse = 0.45 + Math.sin((t || 0) / 300) * 0.3;
        ctx.strokeStyle = `rgba(185,140,255,${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 2, 8, 0, Math.PI * 2);
        ctx.moveTo(cx - 5, cy - 11);
        ctx.lineTo(cx - 5, cy + 7);
        ctx.moveTo(cx - 13, cy - 2);
        ctx.lineTo(cx + 3, cy - 2);
        ctx.stroke();
        ctx.lineWidth = 1;
    },

    thimble: (ctx, cx, cy, t) => {
        ctx.fillStyle = '#101018';
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy + 16);
        ctx.lineTo(cx + 13, cy + 16);
        ctx.lineTo(cx + 10, cy - 10);
        ctx.quadraticCurveTo(cx, cy - 20, cx - 10, cy - 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.SILVER_SHADOW;
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy + 14);
        ctx.lineTo(cx + 11, cy + 14);
        ctx.lineTo(cx + 8.5, cy - 9);
        ctx.quadraticCurveTo(cx, cy - 18, cx - 8.5, cy - 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.SILVER_BASE;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 14);
        ctx.lineTo(cx - 2, cy + 14);
        ctx.lineTo(cx - 2, cy - 16);
        ctx.quadraticCurveTo(cx - 7, cy - 15, cx - 8.5, cy - 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.SILVER_LIT;
        ctx.fillRect(cx - 8, cy - 8, 3, 20);
        // Dimples
        ctx.fillStyle = '#7a838f';
        for (let r = -6; r < 12; r += 5) {
            for (let c = -6; c < 8; c += 5) ctx.fillRect(cx + c, cy + r, 2, 2);
        }
        // The very small, very angry storm inside
        const spin = (t || 0) / 90;
        for (let i = 0; i < 7; i++) {
            const a = spin + i * 0.9;
            const rr = 3 + (i % 3) * 2.6;
            ctx.fillStyle = i % 2 ? '#bfe6ff' : '#7fb7e8';
            ctx.fillRect(cx + Math.cos(a) * rr, cy - 13 + Math.sin(a) * rr * 0.45, 2, 2);
        }
        ctx.fillStyle = 'rgba(191,230,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 13, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    rope: (ctx, cx, cy) => {
        ctx.strokeStyle = '#2a2114';
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 1, cy + 2, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#b9a274';
        ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 1, cy + 2, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#8d7b58';
        ctx.lineWidth = 1;
        // Twist marks read as fibre rather than as a smooth tube
        for (let a = 0; a < Math.PI * 2; a += 0.24) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
            ctx.lineTo(cx + Math.cos(a + 0.2) * 19, cy + Math.sin(a + 0.2) * 19);
            ctx.stroke();
        }
        ctx.strokeStyle = '#d8c9a0';
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 8);
        ctx.lineTo(cx + 24, cy - 16);
        ctx.stroke();
    },

    parchment: (ctx, cx, cy) => {
        ctx.fillStyle = '#2a2214';
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 16);
        ctx.lineTo(cx + 19, cy - 18);
        ctx.lineTo(cx + 21, cy + 16);
        ctx.lineTo(cx - 18, cy + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d6c69a';
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 14);
        ctx.lineTo(cx + 17, cy - 16);
        ctx.lineTo(cx + 19, cy + 14);
        ctx.lineTo(cx - 16, cy + 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b8a67a';
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy - 15);
        ctx.lineTo(cx + 17, cy - 16);
        ctx.lineTo(cx + 19, cy + 14);
        ctx.lineTo(cx + 9, cy + 15);
        ctx.closePath();
        ctx.fill();
        // Foxing and the nail hole it hung from
        ctx.fillStyle = 'rgba(120,90,50,0.35)';
        [[-12, -9, 5], [8, 6, 4], [-4, 10, 3]].forEach(([dx, dy, r]) => {
            ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#3a2a14';
        ctx.beginPath(); ctx.arc(cx - 1, cy - 12, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1c0c';
        ctx.font = 'bold 9px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('EBRAHDNEM', cx, cy + 3);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(90,70,40,0.4)';
        for (let i = -10; i < 12; i += 5) ctx.fillRect(cx - 14, cy + i, 26, 1);
    },

    ring_of_mist: (ctx, cx, cy, t) => {
        const haze = 0.2 + Math.sin((t || 0) / 420) * 0.1;
        ctx.fillStyle = `rgba(200,210,225,${haze})`;
        ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a3f48';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(cx, cy, 13, 14, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#8e97a4';
        ctx.lineWidth = 5.5;
        ctx.beginPath(); ctx.ellipse(cx, cy, 13, 14, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#c4ccd8';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx - 1, cy - 1, 13, 14, 0, Math.PI * 0.85, Math.PI * 1.5); ctx.stroke();
        ctx.lineWidth = 1;
        // The band is hard to look at: a drifting band of fog crosses it.
        ctx.fillStyle = `rgba(225,232,240,${0.28 + haze})`;
        const drift = ((t || 0) / 40) % 60 - 30;
        ctx.fillRect(cx - 24, cy + drift * 0.3, 48, 4);
    },

    chest_of_cormac: (ctx, cx, cy) => drawChestOfCormac(ctx, cx, cy + 2, 1.15),
    shield_of_ardor: (ctx, cx, cy, t) => drawShieldOfArdor(ctx, cx, cy, 1.25, t),
    mirror_of_ianthe: (ctx, cx, cy, t) => drawMirrorOfIanthe(ctx, cx, cy - 4, 1.1, t)
};
