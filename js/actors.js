// ============================================================
// CROWN QUEST - ACTORS
// ------------------------------------------------------------
// Every person other than the ego is drawn from one parametrised cel
// (drawVgaPerson) built on the SAME measurement frame as Rowan, so no
// scene ever ends up with a 4-head mascot standing beside a 6-head hero.
// Creatures each get one shared helper for the same reason.
// ============================================================

/* eslint-disable no-unused-vars -- helpers are consumed by room modules in other files */

// The ego cel spans 37.8 units sole-to-crown; drawVgaPerson spans 35.4. Keeping
// the ratio in one constant is what stops NPCs drifting out of scale with Rowan.
const VGA_PERSON_TO_EGO = 37.8 / 35.4;

/** Sprite scale that puts a drawVgaPerson figure at the same on-screen height
 *  as the ego standing on the same ground line. `heightFactor` adjusts for
 *  characters who are genuinely shorter or taller (a gnome, a giant). */
function vgaPersonScale(engineRef, groundY, heightFactor) {
    return engineRef.playerSpriteScale(groundY) * VGA_PERSON_TO_EGO * (heightFactor == null ? 1 : heightFactor);
}

// ========== SHARED HUMAN CEL ==========

/** One arm as two hinged segments, so poses actually bend at the elbow.
 *  `sign` is +1 for the character's left side of screen, -1 for the right;
 *  canvas rotate(+angle) swings a hanging limb toward -x, so check reaching
 *  poses against a screenshot rather than against intuition. */
function drawVgaArm(ctx, sx, sy, s, sign, upperAngle, foreAngle, c) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sign * upperAngle);
    ctx.fillStyle = c.edge;
    ctx.fillRect(-1.5 * s, -0.9 * s, 3 * s, 7.6 * s);
    ctx.fillStyle = c.sleeve;
    ctx.fillRect(-1.1 * s, -0.5 * s, 2.2 * s, 6.9 * s);
    ctx.fillStyle = c.sleeveLo;
    ctx.fillRect(sign > 0 ? -1.1 * s : 0.3 * s, -0.5 * s, 0.8 * s, 6.9 * s);
    ctx.translate(0, 6.2 * s);
    ctx.rotate(sign * foreAngle);
    ctx.fillStyle = c.edge;
    ctx.fillRect(-1.4 * s, -0.7 * s, 2.8 * s, 8 * s);
    ctx.fillStyle = c.sleeve;
    ctx.fillRect(-1 * s, -0.3 * s, 2 * s, 5.4 * s);
    ctx.fillStyle = c.sleeveLo;
    ctx.fillRect(sign > 0 ? -1 * s : 0.2 * s, -0.3 * s, 0.8 * s, 5.4 * s);
    ctx.fillStyle = c.skin;
    ctx.fillRect(-1.2 * s, 5 * s, 2.4 * s, 2.3 * s);
    ctx.fillStyle = c.skinLo;
    ctx.fillRect(-1.2 * s, 6.7 * s, 2.4 * s, 0.6 * s);
    ctx.restore();
}

/** Shared human cel on the ego's SCI/VGA measurements: ~5.5 heads tall, dark
 *  outline columns, small eyes. `y` is the ground line under the feet.
 *
 *  SCALE: this cel spans 35.4 units from sole to crown, while the ego cel in
 *  the engine spans 37.8. A person standing beside Rowan therefore needs
 *  roughly `engine.playerSpriteScale(y) * 1.07` — call vgaPersonScale() rather
 *  than guessing, because eyeballing it is how a cast ends up looking like
 *  children standing next to the hero.
 *
 *  Options: robe (floor-length gown instead of legs), hood, hat, headScale,
 *  beard, stoop (rounded back), plus the two arm poses. */
function drawVgaPerson(ctx, x, y, s, o) {
    const b = y - 12 * s;
    const hs = o.headScale || 1;
    const stoop = o.stoop || 0;
    const c = { edge: o.edge, sleeve: o.coat, sleeveLo: o.coatLo, skin: o.skin, skinLo: o.skinLo };

    if (o.robe) {
        // Floor-length robe: a flared trapezoid with vertical fold shadows.
        ctx.fillStyle = o.edge;
        ctx.beginPath();
        ctx.moveTo(x - 5 * s, b - 3.4 * s);
        ctx.lineTo(x + 5 * s, b - 3.4 * s);
        ctx.lineTo(x + 9.5 * s, b + 12 * s);
        ctx.lineTo(x - 9.5 * s, b + 12 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.robe;
        ctx.beginPath();
        ctx.moveTo(x - 4.4 * s, b - 3 * s);
        ctx.lineTo(x + 4.4 * s, b - 3 * s);
        ctx.lineTo(x + 8.6 * s, b + 11.2 * s);
        ctx.lineTo(x - 8.6 * s, b + 11.2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.robeHi || o.coatHi;
        ctx.beginPath();
        ctx.moveTo(x - 3.8 * s, b - 3 * s);
        ctx.lineTo(x - 1.2 * s, b - 3 * s);
        ctx.lineTo(x - 3 * s, b + 11.2 * s);
        ctx.lineTo(x - 7.6 * s, b + 11.2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.robeLo || o.coatLo;
        [1.2, 4].forEach((fx) => {
            ctx.beginPath();
            ctx.moveTo(x + fx * s, b - 3 * s);
            ctx.lineTo(x + (fx + 0.9) * s, b - 3 * s);
            ctx.lineTo(x + (fx + 2.6) * s, b + 11.2 * s);
            ctx.lineTo(x + (fx + 1) * s, b + 11.2 * s);
            ctx.closePath();
            ctx.fill();
        });
        ctx.fillStyle = o.edge;
        ctx.fillRect(x - 9.5 * s, b + 11.2 * s, 19 * s, 0.9 * s);
    } else {
        // Trousers and boots
        ctx.fillStyle = o.edge;
        ctx.fillRect(x - 4 * s, b - 3.4 * s, 8 * s, 12.8 * s);
        ctx.fillStyle = o.trousers;
        ctx.fillRect(x - 3.6 * s, b - 3 * s, 3.2 * s, 12 * s);
        ctx.fillRect(x + 0.4 * s, b - 3 * s, 3.2 * s, 12 * s);
        ctx.fillStyle = o.trousersHi;
        ctx.fillRect(x - 3.3 * s, b - 2 * s, 1 * s, 10 * s);
        ctx.fillRect(x + 0.7 * s, b - 2 * s, 1 * s, 10 * s);
        ctx.fillStyle = o.edge;
        ctx.fillRect(x - 0.6 * s, b - 3 * s, 1.2 * s, 12 * s);
        ctx.fillStyle = o.boot;
        ctx.fillRect(x - 4.3 * s, b + 8 * s, 4.1 * s, 4 * s);
        ctx.fillRect(x + 0.2 * s, b + 8 * s, 4.1 * s, 4 * s);
        ctx.fillStyle = o.edge;
        ctx.fillRect(x - 4.5 * s, b + 11.2 * s, 4.5 * s, 0.8 * s);
        ctx.fillRect(x + 0.2 * s, b + 11.2 * s, 4.5 * s, 0.8 * s);
        ctx.fillStyle = o.bootHi;
        ctx.fillRect(x - 3.9 * s, b + 8.2 * s, 2 * s, 0.7 * s);
        ctx.fillRect(x + 0.6 * s, b + 8.2 * s, 2 * s, 0.7 * s);
    }

    // The far arm goes down before the torso so the shoulder line stays clean.
    if (o.farArm) drawVgaArm(ctx, x + o.farArm.side * 3.4 * s, b - 15.2 * s + stoop * s, s, o.farArm.side, o.farArm.up, o.farArm.lo, c);
    // Torso
    ctx.fillStyle = o.edge;
    ctx.fillRect(x - 4.4 * s, b - 16.6 * s + stoop * s, 8.8 * s, 13.8 * s - stoop * s);
    ctx.fillStyle = o.coat;
    ctx.fillRect(x - 4 * s, b - 16 * s + stoop * s, 8 * s, 13 * s - stoop * s);
    ctx.fillStyle = o.coatHi;
    ctx.fillRect(x - 3.4 * s, b - 15.4 * s + stoop * s, 2.8 * s, 11.6 * s - stoop * s);
    ctx.fillStyle = o.coatLo;
    ctx.fillRect(x + 2.2 * s, b - 15.8 * s + stoop * s, 1.8 * s, 12.6 * s - stoop * s);
    ctx.fillStyle = o.edge;
    ctx.fillRect(x - 4 * s, b - 16 * s + stoop * s, 0.8 * s, 13 * s - stoop * s);
    ctx.fillRect(x + 3.2 * s, b - 16 * s + stoop * s, 0.8 * s, 13 * s - stoop * s);
    if (o.chestStripe) {
        ctx.fillStyle = o.chestStripe;
        ctx.fillRect(x - 1.4 * s, b - 16 * s + stoop * s, 2.8 * s, 13 * s - stoop * s);
    }
    if (o.apron) {
        ctx.fillStyle = o.apron;
        ctx.fillRect(x - 3 * s, b - 10 * s + stoop * s, 6 * s, 10 * s);
        ctx.fillStyle = o.apronLo || o.edge;
        ctx.fillRect(x - 3 * s, b - 0.6 * s, 6 * s, 0.8 * s);
    }
    ctx.fillStyle = o.collar;
    ctx.fillRect(x - 2.8 * s, b - 16.4 * s + stoop * s, 5.6 * s, 1.3 * s);
    if (!o.robe) {
        ctx.fillStyle = o.belt;
        ctx.fillRect(x - 4 * s, b - 4.6 * s, 8 * s, 1.8 * s);
        ctx.fillStyle = o.buckle;
        ctx.fillRect(x - 1.2 * s, b - 4.4 * s, 2.4 * s, 1.5 * s);
    } else if (o.sash) {
        ctx.fillStyle = o.sash;
        ctx.fillRect(x - 4.2 * s, b - 5 * s, 8.4 * s, 2.2 * s);
    }
    if (o.patch) {
        ctx.fillStyle = o.patch;
        ctx.fillRect(x + 1.4 * s, b - 13.6 * s + stoop * s, 1.9 * s, 1.9 * s);
    }

    // Head is scaled about the neck so a child or a gnome keeps a larger skull.
    ctx.save();
    ctx.translate(x, b - 16.4 * s + stoop * s);
    ctx.scale(hs, hs);
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(-1.3 * s, -1.4 * s, 2.6 * s, 2 * s);
    ctx.fillStyle = o.edge;
    ctx.fillRect(-3 * s, -7 * s, 6 * s, 6.2 * s);
    ctx.fillStyle = o.skin;
    ctx.fillRect(-2.6 * s, -6.6 * s, 5.2 * s, 5.6 * s);
    ctx.fillStyle = o.skinHi;
    ctx.fillRect(-2.1 * s, -6.2 * s, 2.1 * s, 2.2 * s);
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(1.7 * s, -6.2 * s, 0.9 * s, 4.8 * s);
    ctx.fillStyle = o.hairLo;
    ctx.fillRect(-2.2 * s, -5 * s, 1.5 * s, 0.5 * s);
    ctx.fillRect(0.7 * s, -5 * s, 1.5 * s, 0.5 * s);
    ctx.fillStyle = '#F2F0E2';
    ctx.fillRect(-2.1 * s, -4.3 * s, 1.5 * s, 1.2 * s);
    ctx.fillRect(0.6 * s, -4.3 * s, 1.5 * s, 1.2 * s);
    ctx.fillStyle = o.eye;
    ctx.fillRect(-1.6 * s, -4.2 * s, 0.8 * s, 1.1 * s);
    ctx.fillRect(0.9 * s, -4.2 * s, 0.8 * s, 1.1 * s);
    ctx.fillStyle = '#2A2018';
    ctx.fillRect(-2.1 * s, -4.4 * s, 1.5 * s, 0.3 * s);
    ctx.fillRect(0.6 * s, -4.4 * s, 1.5 * s, 0.3 * s);
    ctx.fillStyle = o.skinLo;
    ctx.fillRect(-0.4 * s, -3.5 * s, 0.9 * s, 1.4 * s);
    ctx.fillStyle = o.mouth;
    ctx.fillRect(-1.3 * s, -1.9 * s, 2.6 * s, 0.6 * s);
    ctx.fillRect(-1.7 * s, -2.3 * s, 0.6 * s, 0.5 * s);
    ctx.fillRect(1.1 * s, -2.3 * s, 0.6 * s, 0.5 * s);
    if (o.tear) {
        ctx.fillStyle = '#9de8ff';
        ctx.fillRect(1.9 * s, -3.6 * s, 0.6 * s, 1.8 * s);
    }
    if (o.smudge) {
        ctx.fillStyle = 'rgba(60,40,20,0.55)';
        ctx.fillRect(1 * s, -2.6 * s, 1.5 * s, 0.9 * s);
    }
    if (o.beard) {
        ctx.fillStyle = o.hairLo;
        ctx.fillRect(-2.9 * s, -3.2 * s, 5.8 * s, o.beard * s);
        ctx.fillStyle = o.hair;
        ctx.fillRect(-2.5 * s, -3 * s, 5 * s, (o.beard - 0.6) * s);
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-2.1 * s, -2.8 * s, 1.4 * s, (o.beard - 1.4) * s);
        ctx.fillStyle = o.mouth;
        ctx.fillRect(-1.1 * s, -2 * s, 2.2 * s, 0.6 * s);
    }
    // Hair last so it overlaps the skull edge
    ctx.fillStyle = o.hair;
    if (o.hairStyle === 'long') {
        ctx.fillRect(-3 * s, -7.4 * s, 6 * s, 2.6 * s);
        ctx.fillRect(-3.5 * s, -6.4 * s, 1.2 * s, 8 * s);
        ctx.fillRect(2.3 * s, -6.4 * s, 1.2 * s, 8 * s);
        ctx.fillStyle = o.hairLo;
        ctx.fillRect(-3.5 * s, -3 * s, 1.2 * s, 4.4 * s);
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-1.6 * s, -7.2 * s, 2.6 * s, 0.7 * s);
    } else if (o.hairStyle === 'bald') {
        ctx.fillRect(-3.1 * s, -5.6 * s, 0.9 * s, 2.4 * s);
        ctx.fillRect(2.2 * s, -5.6 * s, 0.9 * s, 2.4 * s);
    } else if (o.hairStyle === 'bangs') {
        ctx.fillRect(-2.7 * s, -6.9 * s, 5.4 * s, 1.9 * s);
        ctx.fillRect(-3 * s, -6 * s, 0.9 * s, 2.6 * s);
        ctx.fillRect(2.1 * s, -6 * s, 0.9 * s, 2.6 * s);
    } else {
        ctx.fillRect(-3 * s, -7.4 * s, 6 * s, 2.2 * s);
        ctx.fillRect(-3.1 * s, -6.4 * s, 0.9 * s, 2.2 * s);
        ctx.fillRect(2.2 * s, -6.4 * s, 0.9 * s, 2.2 * s);
        ctx.fillStyle = o.hairHi;
        ctx.fillRect(-1.6 * s, -7.2 * s, 2.6 * s, 0.7 * s);
    }
    if (o.hood) {
        // A deep hood: the cowl arc, then the face left in shadow inside it.
        ctx.fillStyle = o.edge;
        ctx.beginPath(); ctx.arc(0, -5.4 * s, 4.6 * s, Math.PI, 0); ctx.fill();
        ctx.fillRect(-4.6 * s, -5.4 * s, 9.2 * s, 3.4 * s);
        ctx.fillStyle = o.hood;
        ctx.beginPath(); ctx.arc(0, -5.6 * s, 4.1 * s, Math.PI, 0); ctx.fill();
        ctx.fillRect(-4.1 * s, -5.6 * s, 8.2 * s, 3 * s);
        ctx.fillStyle = o.hoodHi || o.coatHi;
        ctx.beginPath(); ctx.arc(-1.2 * s, -5.8 * s, 2.6 * s, Math.PI, Math.PI * 1.6); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillRect(-2.9 * s, -6.2 * s, 5.8 * s, 3.6 * s);
        if (o.hoodEye) {
            ctx.fillStyle = o.hoodEye;
            ctx.fillRect(-1.7 * s, -4.4 * s, 1.1 * s, 0.9 * s);
            ctx.fillRect(0.6 * s, -4.4 * s, 1.1 * s, 0.9 * s);
        }
    }
    if (o.hat) {
        // Wide-brimmed conical hat (sorcerers, peddlers).
        ctx.fillStyle = o.edge;
        ctx.beginPath();
        ctx.moveTo(-7.4 * s, -6.4 * s);
        ctx.lineTo(7.4 * s, -6.4 * s);
        ctx.lineTo(1.2 * s, -18 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.hat;
        ctx.beginPath();
        ctx.moveTo(-6.8 * s, -6.8 * s);
        ctx.lineTo(6.8 * s, -6.8 * s);
        ctx.lineTo(1.2 * s, -17.2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.hatHi || o.coatHi;
        ctx.beginPath();
        ctx.moveTo(-6.4 * s, -6.8 * s);
        ctx.lineTo(-3.4 * s, -6.8 * s);
        ctx.lineTo(0.6 * s, -16.4 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = o.edge;
        ctx.fillRect(-7.4 * s, -7.2 * s, 14.8 * s, 1.4 * s);
        ctx.fillStyle = o.hatBand || o.belt;
        ctx.fillRect(-5.6 * s, -8.4 * s, 11.2 * s, 1.4 * s);
    }
    if (o.circlet) {
        ctx.fillStyle = o.circlet;
        ctx.fillRect(-3.2 * s, -6.6 * s, 6.4 * s, 1 * s);
        ctx.fillRect(-0.7 * s, -8 * s, 1.4 * s, 1.6 * s);
    }
    ctx.restore();
    if (o.nearArm) drawVgaArm(ctx, x + o.nearArm.side * 3.4 * s, b - 15.2 * s + stoop * s, s, o.nearArm.side, o.nearArm.up, o.nearArm.lo, c);
}

// ========== CAST PALETTES ==========
// Each character is defined exactly once. Rooms and cutscenes both read these,
// so a character can never drift between the scene and their own set piece.

/** Morvane the sorcerer: tall, hooded, arcane purple with a bone-white hand. */
const CAST_MORVANE = {
    edge: '#0a0710', skin: '#c8b9a8', skinHi: '#e0d4c4', skinLo: '#8e8073',
    hair: '#2b2733', hairHi: '#4b4557', hairLo: '#16141c',
    coat: '#3b2560', coatHi: '#5a3a8c', coatLo: '#231338',
    robe: '#3b2560', robeHi: '#553483', robeLo: '#1e1030',
    collar: '#7a4fd0', sash: '#1b1026', belt: '#1b1026', buckle: '#b98cff',
    trousers: '#241638', trousersHi: '#332049', boot: '#120c1a', bootHi: '#2e2340',
    hood: '#2c1a4a', hoodHi: '#4a2d78', hoodEye: '#b98cff',
    eye: '#b98cff', mouth: '#5d3a3a', hairStyle: 'long'
};

/** Hattie the peddler: broad, cheerful, layered in road-worn wool. */
const CAST_HATTIE = {
    edge: '#0b0a08', skin: '#d9a274', skinHi: '#f0c093', skinLo: '#9a6a44',
    hair: '#8c8378', hairHi: '#b3aba0', hairLo: '#565049',
    coat: '#8a4a2a', coatHi: '#ab6a42', coatLo: '#5a2c16',
    trousers: '#3f4a2c', trousersHi: '#55613b', boot: '#241a10', bootHi: '#4a3826',
    collar: '#c2a878', belt: '#2a1d10', buckle: '#d9a441',
    apron: '#b8a882', apronLo: '#8a7c5c', patch: '#3f7431',
    eye: '#5a4630', mouth: '#8a4030', hairStyle: 'bangs'
};

/** Fennow the elf: slight, green-clad, watchful. */
const CAST_FENNOW = {
    edge: '#08100a', skin: '#e2c9a4', skinHi: '#f6e2c2', skinLo: '#a68e6c',
    hair: '#c8b06a', hairHi: '#e6d296', hairLo: '#8a7440',
    coat: '#2f6b3c', coatHi: '#468c52', coatLo: '#1b4425',
    trousers: '#3c4a2a', trousersHi: '#4f6038', boot: '#241d10', bootHi: '#463a22',
    collar: '#7ab06a', belt: '#2a2412', buckle: '#c8b06a', patch: '#d9a441',
    eye: '#3f8a6e', mouth: '#8a5040', hairStyle: 'long', headScale: 0.94
};

/** Mendharbe the gnome: small body, oversized head, enormous beard. */
const CAST_GNOME = {
    edge: '#0a0806', skin: '#d8a878', skinHi: '#f2c79a', skinLo: '#9a7048',
    hair: '#d8d2c4', hairHi: '#f2eee2', hairLo: '#9c968a',
    coat: '#6a3a5c', coatHi: '#8c5279', coatLo: '#41213a',
    trousers: '#3a2c46', trousersHi: '#4c3a5c', boot: '#1a1410', bootHi: '#3a2e22',
    collar: '#9c6a8c', belt: '#241a14', buckle: '#d9a441',
    eye: '#3a6a8a', mouth: '#8a4030', hairStyle: 'bald',
    beard: 6.5, headScale: 1.3
};

/** Elowen of the Amber Tower: pale, still, gold-circleted. */
const CAST_ELOWEN = {
    edge: '#0b0910', skin: '#f0d0b0', skinHi: '#fce6cc', skinLo: '#b3947a',
    hair: '#7a4a22', hairHi: '#a86e38', hairLo: '#4a2a10',
    coat: '#6a7fa8', coatHi: '#8ea1c6', coatLo: '#42527a',
    robe: '#6a7fa8', robeHi: '#93a6ca', robeLo: '#3d4c73',
    collar: '#c5d2e8', sash: '#d9a441', belt: '#d9a441', buckle: '#ffe28a',
    trousers: '#42527a', trousersHi: '#556293', boot: '#1a1826', bootHi: '#3a3750',
    circlet: '#ffe28a',
    eye: '#4a7a8a', mouth: '#a05a50', hairStyle: 'long'
};

/** A village woman at the green — background life, same cel, own colours. */
const CAST_VILLAGER = {
    edge: '#0a0908', skin: '#c0855c', skinHi: '#dda87c', skinLo: '#8d5735',
    hair: '#5b4b45', hairHi: '#8a7a72', hairLo: '#332723',
    coat: '#4a5a6e', coatHi: '#63788f', coatLo: '#2c3644',
    trousers: '#3a3020', trousersHi: '#4c4029', boot: '#1d160e', bootHi: '#3a2f1e',
    collar: '#8fa2b6', belt: '#241c12', buckle: '#a08050',
    apron: '#c2b492', apronLo: '#8f8468',
    eye: '#4a5a3a', mouth: '#8a4030', hairStyle: 'bangs'
};

// ========== CREATURES ==========
// One helper per creature, used by every room and cutscene that shows it.

/** Corvus the raven, perched or with wings spread. */
function drawRaven(ctx, x, y, s, wingsUp, animTimer) {
    const bob = Math.sin((animTimer || 0) / 640) * 0.6 * s;
    ctx.save();
    ctx.translate(x, y + bob);
    // Silhouette
    ctx.fillStyle = '#05050a';
    ctx.beginPath();
    ctx.ellipse(0, -6 * s, 7.5 * s, 6 * s, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath();
    ctx.ellipse(-0.6 * s, -6.6 * s, 6.4 * s, 5 * s, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#33334a';
    ctx.beginPath();
    ctx.ellipse(-2.2 * s, -8 * s, 3.2 * s, 2.2 * s, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.fillStyle = '#05050a';
    ctx.beginPath();
    ctx.moveTo(5 * s, -5 * s);
    ctx.lineTo(14 * s, -1.5 * s);
    ctx.lineTo(13 * s, -4.5 * s);
    ctx.closePath();
    ctx.fill();
    // Wing
    ctx.fillStyle = '#0d0d18';
    ctx.beginPath();
    if (wingsUp) {
        ctx.moveTo(-1 * s, -8 * s);
        ctx.lineTo(-8 * s, -20 * s);
        ctx.lineTo(3 * s, -16 * s);
        ctx.lineTo(5 * s, -7 * s);
    } else {
        ctx.moveTo(-2 * s, -8 * s);
        ctx.lineTo(6 * s, -8 * s);
        ctx.lineTo(9 * s, -3 * s);
        ctx.lineTo(-1 * s, -4 * s);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#262636';
    ctx.fillRect(wingsUp ? -5 * s : 1 * s, wingsUp ? -16 * s : -7 * s, 4 * s, 1.4 * s);
    // Head, beak and one very knowing eye
    ctx.fillStyle = '#05050a';
    ctx.beginPath();
    ctx.arc(-7 * s, -11 * s, 3.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath();
    ctx.arc(-7.4 * s, -11.4 * s, 2.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4a2a';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -11.4 * s);
    ctx.lineTo(-16 * s, -10 * s);
    ctx.lineTo(-10 * s, -9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a8a4a';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -11.4 * s);
    ctx.lineTo(-16 * s, -10 * s);
    ctx.lineTo(-12 * s, -10.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e8b0';
    ctx.fillRect(-8.8 * s, -12.4 * s, 1.8 * s, 1.6 * s);
    ctx.fillStyle = '#0a0a08';
    ctx.fillRect(-8.2 * s, -12 * s, 0.9 * s, 1.1 * s);
    // Feet
    ctx.strokeStyle = '#6a6244';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.moveTo(-2 * s, -1 * s); ctx.lineTo(-2 * s, 1 * s);
    ctx.moveTo(2 * s, -1 * s); ctx.lineTo(2 * s, 1 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
}

/** The village goat. `facing` is +1 (right) or -1 (left). */
function drawGoat(ctx, x, groundY, s, facing, charging, animTimer) {
    const d = facing || 1;
    const trot = charging ? Math.sin((animTimer || 0) / 70) * 2.2 * s : 0;
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(d, 1);
    // Silhouette
    ctx.fillStyle = '#100d09';
    ctx.beginPath();
    ctx.ellipse(0, -18 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#1a1610';
    ctx.fillRect(-12 * s, -18 * s, 4.2 * s, 18 * s);
    ctx.fillRect(9 * s, -18 * s, 4.2 * s, 18 * s);
    ctx.fillStyle = '#6a6152';
    ctx.fillRect(-11.4 * s, -18 * s, 3 * s, 15 * s);
    ctx.fillRect(9.6 * s, -18 * s, 3 * s, 15 * s);
    ctx.fillStyle = '#1a1610';
    ctx.fillRect(-12 * s, -3 * s, 4.2 * s, 3 * s);
    ctx.fillRect(9 * s, -3 * s, 4.2 * s, 3 * s);
    ctx.fillStyle = '#2a251c';
    ctx.fillRect(-6 * s + trot, -18 * s, 4 * s, 18 * s);
    ctx.fillRect(3 * s - trot, -18 * s, 4 * s, 18 * s);
    // Body
    ctx.fillStyle = '#8d8574';
    ctx.beginPath();
    ctx.ellipse(-0.5 * s, -19 * s, 16.5 * s, 9.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b0a893';
    ctx.beginPath();
    ctx.ellipse(-3 * s, -22 * s, 11 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d5648';
    ctx.beginPath();
    ctx.ellipse(2 * s, -14.5 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shaggy underside
    ctx.fillStyle = '#4a443a';
    for (let i = -12; i < 14; i += 4) ctx.fillRect(i * s, -13 * s, 2.4 * s, 3 + Math.abs(i % 3) * s);
    // Tail
    ctx.fillStyle = '#100d09';
    ctx.fillRect(15 * s, -26 * s, 3.4 * s, 6 * s);
    ctx.fillStyle = '#b0a893';
    ctx.fillRect(15.4 * s, -25.6 * s, 2.4 * s, 5 * s);
    // Neck and head
    ctx.fillStyle = '#100d09';
    ctx.beginPath();
    ctx.moveTo(-13 * s, -24 * s);
    ctx.lineTo(-22 * s, -34 * s);
    ctx.lineTo(-14 * s, -35 * s);
    ctx.lineTo(-8 * s, -22 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8d8574';
    ctx.beginPath();
    ctx.moveTo(-13 * s, -25 * s);
    ctx.lineTo(-20.5 * s, -33.5 * s);
    ctx.lineTo(-14.5 * s, -34 * s);
    ctx.lineTo(-9 * s, -23 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#100d09';
    ctx.beginPath();
    ctx.ellipse(-22 * s, -35 * s, 8.5 * s, 5.6 * s, -0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a49b87';
    ctx.beginPath();
    ctx.ellipse(-22 * s, -35.6 * s, 7.4 * s, 4.6 * s, -0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cec5ae';
    ctx.beginPath();
    ctx.ellipse(-23 * s, -37 * s, 4.4 * s, 2.2 * s, -0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a352c';
    ctx.beginPath();
    ctx.ellipse(-28.5 * s, -33.4 * s, 2.6 * s, 2 * s, -0.24, 0, Math.PI * 2);
    ctx.fill();
    // Horns — the whole reason this animal matters
    ctx.strokeStyle = '#100d09';
    ctx.lineWidth = Math.max(2, 4.4 * s);
    ctx.beginPath();
    ctx.moveTo(-19 * s, -39 * s);
    ctx.quadraticCurveTo(-11 * s, -47 * s, -4 * s, -41 * s);
    ctx.moveTo(-22 * s, -39.6 * s);
    ctx.quadraticCurveTo(-15 * s, -49 * s, -7 * s, -44 * s);
    ctx.stroke();
    ctx.strokeStyle = '#cbbf9d';
    ctx.lineWidth = Math.max(1, 2.6 * s);
    ctx.beginPath();
    ctx.moveTo(-19 * s, -39 * s);
    ctx.quadraticCurveTo(-11 * s, -47 * s, -4 * s, -41 * s);
    ctx.moveTo(-22 * s, -39.6 * s);
    ctx.quadraticCurveTo(-15 * s, -49 * s, -7 * s, -44 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Ear and a supremely unimpressed eye
    ctx.fillStyle = '#6a6152';
    ctx.beginPath();
    ctx.ellipse(-15 * s, -37 * s, 4.4 * s, 2 * s, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e8c0';
    ctx.fillRect(-25 * s, -37 * s, 3 * s, 2 * s);
    ctx.fillStyle = '#100d09';
    ctx.fillRect(-24.4 * s, -36.4 * s, 1.8 * s, 0.9 * s);
    ctx.restore();
}

/** Grumbold the bridge troll: squat, wide, and largely jaw. */
function drawTroll(ctx, x, groundY, s, animTimer, angry) {
    const breathe = Math.sin((animTimer || 0) / 520) * 1.2 * s;
    ctx.save();
    ctx.translate(x, groundY);
    // Silhouette
    ctx.fillStyle = '#0c1008';
    ctx.beginPath();
    ctx.ellipse(0, -30 * s, 30 * s, 30 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#2c3a20';
    ctx.fillRect(-19 * s, -22 * s, 15 * s, 22 * s);
    ctx.fillRect(5 * s, -22 * s, 15 * s, 22 * s);
    ctx.fillStyle = '#3d5029';
    ctx.fillRect(-18 * s, -22 * s, 6 * s, 20 * s);
    ctx.fillRect(6 * s, -22 * s, 6 * s, 20 * s);
    ctx.fillStyle = '#0c1008';
    ctx.fillRect(-22 * s, -4 * s, 20 * s, 4 * s);
    ctx.fillRect(3 * s, -4 * s, 20 * s, 4 * s);
    ctx.fillStyle = '#c8bb8a';
    [-20, -15, -10, 5, 10, 15].forEach((tx) => ctx.fillRect(tx * s, -4.6 * s, 3 * s, 2.2 * s));
    // Belly
    ctx.fillStyle = '#3d5029';
    ctx.beginPath();
    ctx.ellipse(0, -32 * s + breathe, 27 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f6635';
    ctx.beginPath();
    ctx.ellipse(-7 * s, -38 * s + breathe, 16 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#243019';
    ctx.beginPath();
    ctx.ellipse(9 * s, -26 * s + breathe, 15 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Loincloth: one saturated accent on a green mass
    ctx.fillStyle = '#0c1008';
    ctx.fillRect(-16 * s, -24 * s, 32 * s, 12 * s);
    ctx.fillStyle = '#8a4a1f';
    ctx.fillRect(-15 * s, -23 * s, 30 * s, 10 * s);
    ctx.fillStyle = '#ab6a3a';
    ctx.fillRect(-15 * s, -23 * s, 30 * s, 2.4 * s);
    // Arms
    ctx.fillStyle = '#0c1008';
    ctx.fillRect(-36 * s, -46 * s, 13 * s, 34 * s);
    ctx.fillRect(23 * s, -46 * s, 13 * s, 34 * s);
    ctx.fillStyle = '#3d5029';
    ctx.fillRect(-35 * s, -45 * s, 11 * s, 32 * s);
    ctx.fillRect(24 * s, -45 * s, 11 * s, 32 * s);
    ctx.fillStyle = '#4f6635';
    ctx.fillRect(-35 * s, -45 * s, 4 * s, 32 * s);
    ctx.fillRect(24 * s, -45 * s, 4 * s, 32 * s);
    ctx.fillStyle = '#2c3a20';
    ctx.fillRect(-37 * s, -14 * s, 15 * s, 8 * s);
    ctx.fillRect(22 * s, -14 * s, 15 * s, 8 * s);
    // Head, sunk between the shoulders
    ctx.fillStyle = '#0c1008';
    ctx.beginPath();
    ctx.ellipse(0, -58 * s + breathe, 20 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f6635';
    ctx.beginPath();
    ctx.ellipse(-1 * s, -59 * s + breathe, 18 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#617d42';
    ctx.beginPath();
    ctx.ellipse(-6 * s, -64 * s + breathe, 9 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jaw and tusks
    ctx.fillStyle = '#243019';
    ctx.beginPath();
    ctx.ellipse(0, -51 * s + breathe, 15 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#12180c';
    ctx.fillRect(-11 * s, -53 * s + breathe, 22 * s, 4 * s);
    ctx.fillStyle = '#e2d9ae';
    ctx.beginPath();
    ctx.moveTo(-9 * s, -50 * s + breathe);
    ctx.lineTo(-6 * s, -50 * s + breathe);
    ctx.lineTo(-7.5 * s, -58 * s + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6 * s, -50 * s + breathe);
    ctx.lineTo(9 * s, -50 * s + breathe);
    ctx.lineTo(7.5 * s, -58 * s + breathe);
    ctx.closePath();
    ctx.fill();
    // Nose and small, furious eyes
    ctx.fillStyle = '#5f7b40';
    ctx.beginPath();
    ctx.ellipse(0, -57 * s + breathe, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#243019';
    ctx.fillRect(-2.6 * s, -56 * s + breathe, 1.6 * s, 1.6 * s);
    ctx.fillRect(1 * s, -56 * s + breathe, 1.6 * s, 1.6 * s);
    ctx.fillStyle = '#f2e8c0';
    ctx.fillRect(-10 * s, -64 * s + breathe, 5 * s, 3.4 * s);
    ctx.fillRect(5 * s, -64 * s + breathe, 5 * s, 3.4 * s);
    ctx.fillStyle = angry ? '#c2381f' : '#3a2a10';
    ctx.fillRect(-8.6 * s, -63.4 * s + breathe, 2.6 * s, 2.6 * s);
    ctx.fillRect(6.4 * s, -63.4 * s + breathe, 2.6 * s, 2.6 * s);
    ctx.fillStyle = '#12180c';
    ctx.fillRect(-11 * s, -65.6 * s + breathe, 6 * s, 1.6 * s);
    ctx.fillRect(5 * s, -65.6 * s + breathe, 6 * s, 1.6 * s);
    // Ears
    ctx.fillStyle = '#3d5029';
    ctx.beginPath();
    ctx.moveTo(-17 * s, -62 * s + breathe);
    ctx.lineTo(-27 * s, -70 * s + breathe);
    ctx.lineTo(-16 * s, -55 * s + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16 * s, -62 * s + breathe);
    ctx.lineTo(26 * s, -70 * s + breathe);
    ctx.lineTo(15 * s, -55 * s + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/** The cloud-realm giant, asleep. Drawn lying down, head to the left. */
function drawSleepingGiant(ctx, x, groundY, s, animTimer) {
    const breathe = Math.sin((animTimer || 0) / 900) * 3 * s;
    ctx.save();
    ctx.translate(x, groundY);
    // Silhouette of the whole reclining mass
    ctx.fillStyle = '#12100c';
    ctx.beginPath();
    ctx.ellipse(0, -34 * s, 118 * s, 36 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs, stretched away to the right
    ctx.fillStyle = '#4a3d2c';
    ctx.fillRect(30 * s, -40 * s, 84 * s, 30 * s);
    ctx.fillStyle = '#5d4d38';
    ctx.fillRect(30 * s, -40 * s, 84 * s, 10 * s);
    ctx.fillStyle = '#332a1e';
    ctx.fillRect(30 * s, -16 * s, 84 * s, 6 * s);
    ctx.fillStyle = '#12100c';
    ctx.fillRect(104 * s, -52 * s, 22 * s, 42 * s);
    ctx.fillStyle = '#241a10';
    ctx.fillRect(106 * s, -50 * s, 18 * s, 38 * s);
    ctx.fillStyle = '#4a3826';
    ctx.fillRect(106 * s, -50 * s, 6 * s, 38 * s);
    // Torso, rising and falling
    ctx.fillStyle = '#12100c';
    ctx.beginPath();
    ctx.ellipse(-14 * s, -46 * s - breathe, 52 * s, 30 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d7a52';
    ctx.beginPath();
    ctx.ellipse(-14 * s, -47 * s - breathe, 49 * s, 27 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a89364';
    ctx.beginPath();
    ctx.ellipse(-22 * s, -58 * s - breathe, 30 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f5133';
    ctx.beginPath();
    ctx.ellipse(-4 * s, -34 * s - breathe * 0.5, 34 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belt of a smith's apron, the one saturated accent
    ctx.fillStyle = '#0f0a06';
    ctx.fillRect(14 * s, -66 * s, 16 * s, 50 * s);
    ctx.fillStyle = '#8a3f1c';
    ctx.fillRect(15 * s, -64 * s, 14 * s, 47 * s);
    ctx.fillStyle = '#b3603a';
    ctx.fillRect(15 * s, -64 * s, 4 * s, 47 * s);
    // Arm flung across the body
    ctx.fillStyle = '#12100c';
    ctx.fillRect(-46 * s, -50 * s - breathe, 60 * s, 18 * s);
    ctx.fillStyle = '#8d7a52';
    ctx.fillRect(-45 * s, -49 * s - breathe, 58 * s, 15 * s);
    ctx.fillStyle = '#a89364';
    ctx.fillRect(-45 * s, -49 * s - breathe, 58 * s, 4 * s);
    ctx.fillStyle = '#7a6845';
    ctx.beginPath();
    ctx.ellipse(-48 * s, -40 * s - breathe, 12 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#12100c';
    ctx.beginPath();
    ctx.ellipse(-76 * s, -50 * s, 30 * s, 26 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9c885c';
    ctx.beginPath();
    ctx.ellipse(-76 * s, -51 * s, 27 * s, 23 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b39a68';
    ctx.beginPath();
    ctx.ellipse(-82 * s, -58 * s, 15 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beard and hair, a matted grey mass
    ctx.fillStyle = '#3d3830';
    ctx.beginPath();
    ctx.ellipse(-64 * s, -40 * s, 22 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a635a';
    ctx.beginPath();
    ctx.ellipse(-66 * s, -42 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d3830';
    ctx.beginPath();
    ctx.ellipse(-92 * s, -62 * s, 18 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a635a';
    ctx.beginPath();
    ctx.ellipse(-94 * s, -64 * s, 13 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Closed eye and open, snoring mouth
    ctx.fillStyle = '#3d3830';
    ctx.fillRect(-84 * s, -54 * s, 12 * s, 2.4 * s);
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath();
    ctx.ellipse(-72 * s, -43 * s, 7 * s, 4 * s + breathe * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Snore puff
    const puff = Math.floor((animTimer || 0) / 500) % 4;
    ctx.fillStyle = `rgba(235,235,245,${0.34 - puff * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(-70 * s + puff * 7 * s, -46 * s - puff * 8 * s, (5 + puff * 3) * s, (3.4 + puff * 2) * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** The cave dragon. Coiled around its fire, or recoiling from a drenching. */
function drawDragon(ctx, x, groundY, s, animTimer, doused) {
    const breathe = Math.sin((animTimer || 0) / 620) * 2 * s;
    ctx.save();
    ctx.translate(x, groundY);
    if (doused) {
        // Backed off, head raised, wings clamped: same beast, humiliated.
        ctx.translate(28 * s, 0);
        ctx.scale(0.92, 0.92);
    }
    const body = doused ? '#4a3550' : '#5a2a2a';
    const bodyHi = doused ? '#6c4f72' : '#8a4034';
    const bodyLo = doused ? '#2c1d34' : '#331414';
    const belly = doused ? '#8a7a5a' : '#c29a4a';

    // Tail curling away to the right
    ctx.fillStyle = '#0d0708';
    ctx.beginPath();
    ctx.moveTo(20 * s, -26 * s);
    ctx.quadraticCurveTo(96 * s, -34 * s, 118 * s, -6 * s);
    ctx.quadraticCurveTo(90 * s, -20 * s, 20 * s, -12 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(22 * s, -25 * s);
    ctx.quadraticCurveTo(94 * s, -32 * s, 114 * s, -8 * s);
    ctx.quadraticCurveTo(88 * s, -19 * s, 22 * s, -14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bodyHi;
    ctx.beginPath();
    ctx.moveTo(24 * s, -25 * s);
    ctx.quadraticCurveTo(88 * s, -31 * s, 110 * s, -10 * s);
    ctx.quadraticCurveTo(86 * s, -25 * s, 24 * s, -21 * s);
    ctx.closePath();
    ctx.fill();

    // Body mass
    ctx.fillStyle = '#0d0708';
    ctx.beginPath();
    ctx.ellipse(0, -34 * s - breathe, 46 * s, 28 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -35 * s - breathe, 43 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyHi;
    ctx.beginPath();
    ctx.ellipse(-10 * s, -46 * s - breathe, 26 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyLo;
    ctx.beginPath();
    ctx.ellipse(12 * s, -26 * s - breathe, 30 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly plates
    ctx.fillStyle = belly;
    for (let i = -26; i < 30; i += 9) {
        ctx.fillRect(i * s, -20 * s - breathe * 0.5, 7 * s, 4.4 * s);
    }
    // Legs and claws
    ctx.fillStyle = '#0d0708';
    ctx.fillRect(-34 * s, -22 * s, 16 * s, 22 * s);
    ctx.fillRect(6 * s, -20 * s, 15 * s, 20 * s);
    ctx.fillStyle = body;
    ctx.fillRect(-33 * s, -21 * s, 14 * s, 20 * s);
    ctx.fillRect(7 * s, -19 * s, 13 * s, 18 * s);
    ctx.fillStyle = bodyHi;
    ctx.fillRect(-33 * s, -21 * s, 5 * s, 20 * s);
    ctx.fillRect(7 * s, -19 * s, 5 * s, 18 * s);
    ctx.fillStyle = '#e8dcb0';
    [-33, -28, -23, 8, 13, 18].forEach((cx2) => {
        ctx.beginPath();
        ctx.moveTo(cx2 * s, -1 * s);
        ctx.lineTo((cx2 + 4) * s, -1 * s);
        ctx.lineTo((cx2 + 2) * s, 3 * s);
        ctx.closePath();
        ctx.fill();
    });
    // Wing, folded high on the back
    ctx.fillStyle = '#0d0708';
    ctx.beginPath();
    ctx.moveTo(-4 * s, -52 * s - breathe);
    ctx.lineTo(34 * s, -92 * s - breathe);
    ctx.lineTo(46 * s, -60 * s - breathe);
    ctx.lineTo(20 * s, -46 * s - breathe);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = doused ? '#3a2a44' : '#4a2020';
    ctx.beginPath();
    ctx.moveTo(-2 * s, -52 * s - breathe);
    ctx.lineTo(32 * s, -88 * s - breathe);
    ctx.lineTo(42 * s, -60 * s - breathe);
    ctx.lineTo(19 * s, -47 * s - breathe);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = bodyHi;
    ctx.lineWidth = Math.max(1, 2 * s);
    [[32, -88], [40, -70], [42, -60]].forEach(([wx, wy]) => {
        ctx.beginPath();
        ctx.moveTo(-1 * s, -52 * s - breathe);
        ctx.lineTo(wx * s, wy * s - breathe);
        ctx.stroke();
    });
    ctx.lineWidth = 1;
    // Spine ridge
    ctx.fillStyle = '#e8dcb0';
    for (let i = -30; i < 24; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i * s, -56 * s - breathe);
        ctx.lineTo((i + 7) * s, -56 * s - breathe);
        ctx.lineTo((i + 3.5) * s, -66 * s - breathe);
        ctx.closePath();
        ctx.fill();
    }
    // Neck and head
    const headY = doused ? -104 : -84;
    ctx.fillStyle = '#0d0708';
    ctx.beginPath();
    ctx.moveTo(-30 * s, -48 * s - breathe);
    ctx.quadraticCurveTo(-64 * s, (headY + 26) * s, -70 * s, headY * s);
    ctx.lineTo(-52 * s, (headY + 4) * s);
    ctx.quadraticCurveTo(-48 * s, (headY + 30) * s, -18 * s, -42 * s - breathe);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-29 * s, -49 * s - breathe);
    ctx.quadraticCurveTo(-61 * s, (headY + 26) * s, -67 * s, (headY + 1) * s);
    ctx.lineTo(-53 * s, (headY + 5) * s);
    ctx.quadraticCurveTo(-49 * s, (headY + 29) * s, -20 * s, -43 * s - breathe);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bodyHi;
    ctx.beginPath();
    ctx.moveTo(-29 * s, -49 * s - breathe);
    ctx.quadraticCurveTo(-60 * s, (headY + 26) * s, -66 * s, (headY + 2) * s);
    ctx.lineTo(-60 * s, (headY + 4) * s);
    ctx.quadraticCurveTo(-54 * s, (headY + 28) * s, -27 * s, -48 * s - breathe);
    ctx.closePath();
    ctx.fill();
    // Skull
    ctx.fillStyle = '#0d0708';
    ctx.beginPath();
    ctx.ellipse(-72 * s, headY * s, 22 * s, 13 * s, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-72 * s, (headY - 1) * s, 20 * s, 11 * s, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyHi;
    ctx.beginPath();
    ctx.ellipse(-76 * s, (headY - 5) * s, 12 * s, 5 * s, -0.16, 0, Math.PI * 2);
    ctx.fill();
    // Snout and jaw
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-86 * s, (headY - 4) * s);
    ctx.lineTo(-104 * s, (headY + 1) * s);
    ctx.lineTo(-102 * s, (headY + 7) * s);
    ctx.lineTo(-84 * s, (headY + 7) * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bodyLo;
    ctx.fillRect(-102 * s, (headY + 5) * s, 20 * s, 3 * s);
    ctx.fillStyle = '#e8dcb0';
    [-99, -94, -89].forEach((tx) => {
        ctx.beginPath();
        ctx.moveTo(tx * s, (headY + 7) * s);
        ctx.lineTo((tx + 3) * s, (headY + 7) * s);
        ctx.lineTo((tx + 1.5) * s, (headY + 12) * s);
        ctx.closePath();
        ctx.fill();
    });
    // Horns
    ctx.fillStyle = '#d8cca0';
    ctx.beginPath();
    ctx.moveTo(-64 * s, (headY - 8) * s);
    ctx.lineTo(-58 * s, (headY - 6) * s);
    ctx.lineTo(-42 * s, (headY - 26) * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a2966e';
    ctx.beginPath();
    ctx.moveTo(-68 * s, (headY - 6) * s);
    ctx.lineTo(-64 * s, (headY - 4) * s);
    ctx.lineTo(-50 * s, (headY - 20) * s);
    ctx.closePath();
    ctx.fill();
    // The eye: a hard slit that reads at any size
    ctx.fillStyle = doused ? '#c8d8f0' : '#ffdc55';
    ctx.beginPath();
    ctx.ellipse(-81 * s, (headY - 3) * s, 5.2 * s, 3.6 * s, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120808';
    ctx.fillRect(-82 * s, (headY - 6) * s, 1.8 * s, 6 * s);
    ctx.fillStyle = '#0d0708';
    ctx.fillRect(-86 * s, (headY - 8) * s, 10 * s, 2 * s);
    // Nostril smoke, or steam if it has just been soaked
    const puff = Math.floor((animTimer || 0) / 380) % 4;
    ctx.fillStyle = doused
        ? `rgba(230,235,240,${0.4 - puff * 0.09})`
        : `rgba(60,50,44,${0.34 - puff * 0.08})`;
    ctx.beginPath();
    ctx.ellipse((-104 - puff * 5) * s, (headY + 1 - puff * 6) * s, (4 + puff * 3) * s, (3 + puff * 2) * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** The snared hare in the dark wood: small, wide-eyed, and worth saving. */
function drawHare(ctx, x, groundY, s, freed, animTimer) {
    const twitch = Math.sin((animTimer || 0) / 220) * 0.8 * s;
    ctx.save();
    ctx.translate(x, groundY);
    ctx.fillStyle = '#100c08';
    ctx.beginPath();
    ctx.ellipse(0, -8 * s, 12 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6f4a';
    ctx.beginPath();
    ctx.ellipse(0, -9 * s, 10.4 * s, 6.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a98c62';
    ctx.beginPath();
    ctx.ellipse(-3 * s, -11 * s, 6 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4930';
    ctx.beginPath();
    ctx.ellipse(3 * s, -6 * s, 7 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head and the ears that make it a hare
    ctx.fillStyle = '#100c08';
    ctx.beginPath();
    ctx.ellipse(-10 * s, -14 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6f4a';
    ctx.beginPath();
    ctx.ellipse(-10 * s, -14.6 * s, 5 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#100c08';
    [[-12, -0.35], [-8, 0.1]].forEach(([ex, rot]) => {
        ctx.save();
        ctx.translate(ex * s, -17 * s);
        ctx.rotate(rot + (freed ? 0 : twitch * 0.06));
        ctx.fillRect(-1.8 * s, -13 * s, 3.6 * s, 13 * s);
        ctx.fillStyle = '#a98c62';
        ctx.fillRect(-1.2 * s, -12 * s, 2.4 * s, 11 * s);
        ctx.fillStyle = '#c9799a';
        ctx.fillRect(-0.6 * s, -10 * s, 1.2 * s, 7 * s);
        ctx.restore();
        ctx.fillStyle = '#100c08';
    });
    ctx.fillStyle = '#f2e8d0';
    ctx.fillRect(-13 * s, -15.4 * s, 2.4 * s, 2 * s);
    ctx.fillStyle = '#241408';
    ctx.fillRect(-12.6 * s, -15 * s, 1.4 * s, 1.4 * s);
    ctx.fillStyle = '#f0f0ea';
    ctx.beginPath();
    ctx.ellipse(9 * s, -10 * s, 3.4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!freed) {
        // The snare: a brass wire drawn tight round one hind leg.
        ctx.strokeStyle = '#b9a26a';
        ctx.lineWidth = Math.max(1, 1.4 * s);
        ctx.beginPath();
        ctx.arc(5 * s, -3 * s, 4 * s, 0, Math.PI * 2);
        ctx.moveTo(9 * s, -3 * s);
        ctx.lineTo(26 * s, -9 * s);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = '#241708';
        ctx.fillRect(25 * s, -13 * s, 3.4 * s, 13 * s);
    }
    ctx.restore();
}

/** A gull, for the shore and the crag. Two-cel flap, no sprite sheet. */
function drawGull(ctx, x, y, s, animTimer, phase) {
    const flap = Math.sin((animTimer || 0) / 300 + (phase || 0));
    ctx.fillStyle = '#f0f0ea';
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y + flap * 4 * s);
    ctx.quadraticCurveTo(x - 3 * s, y - 2 * s, x, y);
    ctx.quadraticCurveTo(x + 3 * s, y - 2 * s, x + 8 * s, y + flap * 4 * s);
    ctx.quadraticCurveTo(x + 3 * s, y + 1.4 * s, x, y + 1.6 * s);
    ctx.quadraticCurveTo(x - 3 * s, y + 1.4 * s, x - 8 * s, y + flap * 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a8a92';
    ctx.fillRect(x - 1 * s, y, 2 * s, 1.4 * s);
}
