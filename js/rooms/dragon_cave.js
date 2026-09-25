// ============================================================
// CROWN QUEST - ACT II: THE DRAGON'S CAVE
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    /** The fire pit's state: embers and flames, or wet coals and steam. Its
     *  ring of stones is part of the scenery and drawn beneath this. */
    function drawFirePit(ctx, w, h, eng, doused, painted) {
        if (doused) {
            if (painted) {
                logFire(ctx, 216, 346, 112, eng.animTimer, { doused: true });
            } else {
                ctx.fillStyle = '#1a1614';
                ctx.beginPath(); ctx.ellipse(216, 344, 58, 16, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2d2724';
                for (let i = 0; i < 20; i++) {
                    const a = i * 1.3;
                    ctx.fillRect(216 + Math.cos(a) * (10 + i * 2), 340 + Math.sin(a) * (4 + i * 0.5), 5, 3);
                }
            }
            // Steam, rising in slow deterministic puffs
            for (let i = 0; i < 6; i++) {
                const p = (eng.animTimer / 500 + i * 1.1) % 6;
                ctx.fillStyle = `rgba(226,232,238,${0.3 - p * 0.045})`;
                ctx.beginPath();
                ctx.ellipse(170 + i * 20, 336 - p * 22, 9 + p * 5, 6 + p * 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (painted) {
            logFire(ctx, 216, 346, 112, eng.animTimer);
            eng.lightPool(ctx, 216, 316, 340, '255,140,50', 0.28);
            ctx.fillStyle = 'rgba(220,90,30,0.08)';
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#4a1a08';
            ctx.beginPath(); ctx.ellipse(216, 344, 62, 17, 0, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 14; i++) {
                flame(ctx, 162 + i * 8, 344, 0.9 + Math.abs(Math.sin(i * 1.7)) * 1.1, eng.animTimer + i * 240);
            }
            eng.lightPool(ctx, 216, 316, 340, '255,140,50', 0.28);
            ctx.fillStyle = 'rgba(220,90,30,0.08)';
            ctx.fillRect(0, 0, w, h);
        }
    }

    // Painted-scenery trial: a neutral-lit cave, with the fire (and the light
    // it throws), the dragon and the mirror still drawn live over it.
    let paintedCave = false;
    const caveImage = new Image();
    const PAINTED_MIRROR = { x: 470, y: 298 };
    function configurePaintedCave(e) {
        e.setDepthScaling(256, 372, 0.7, 1.06);
        e.setWalkableArea((px, py) => py > 262 && py < 372 && px > 60 && px < 606 && !(px < 170 && py > 300), 263);
        const layout = {
            'the hoard': { x: 330, y: 252, w: 270, h: 78, walkToX: 470, walkToY: 330 },
            'the Mirror of Ianthe': { x: PAINTED_MIRROR.x - 25, y: PAINTED_MIRROR.y - 28, w: 50, h: 56, walkToX: 470, walkToY: 330 },
            'the way out': { x: 575, y: 150, w: 65, h: 190, walkToX: 598, walkToY: 300 }
        };
        for (const hotspot of e.rooms.dragon_cave.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        caveImage.onload = () => {
            paintedCave = true;
            if (engine.currentRoomId === 'dragon_cave') configurePaintedCave(engine);
        };
        caveImage.src = 'icons/dragon-cave-trial.png';
    }
    function drawPaintedCave(ctx, w, h, eng) {
        const doused = eng.getFlag('dragon_doused');
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(caveImage, 0, 0, w, h);
        ctx.restore();
        // With the fire out, only the daylight at the mouth lights the lair.
        if (doused) {
            ctx.fillStyle = 'rgba(8,8,18,0.34)';
            ctx.fillRect(0, 0, w, h);
        }
        ctx.fillStyle = '#100c0a';
        ctx.beginPath(); ctx.ellipse(216, 344, 70, 20, 0, 0, Math.PI * 2); ctx.fill();
        // A ring of fieldstones: black underdrawing, then three tones each.
        const stoneRand = seededRandom(3411);
        const lit = doused ? ['#5a524a', '#3a342e', '#24201c'] : ['#8a6a50', '#5a4636', '#34281e'];
        for (let i = 0; i < 18; i++) {
            const a = i / 18 * Math.PI * 2;
            const sx = 216 + Math.cos(a) * 66, sy = 344 + Math.sin(a) * 19;
            const rx = 9 + stoneRand() * 4, ry = 5 + stoneRand() * 2;
            ctx.fillStyle = '#0a0806';
            ctx.beginPath(); ctx.ellipse(sx, sy + 1, rx + 2, ry + 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lit[2];
            ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lit[1];
            ctx.beginPath(); ctx.ellipse(sx - 1, sy - 1, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lit[0];
            ctx.beginPath(); ctx.ellipse(sx - rx * 0.3, sy - ry * 0.4, rx * 0.4, ry * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        }
        drawFirePit(ctx, w, h, eng, doused, true);
        glints(ctx, 410, 258, 130, 40, eng.animTimer, { seed: 5959, count: doused ? 6 : 12, rgb: '255,236,150', star: true });
        if (!RULES.treasureTaken(eng, 'mirror_of_ianthe')) {
            if (!drawPaintedItem(ctx, 'mirror_of_ianthe', PAINTED_MIRROR.x, PAINTED_MIRROR.y + 20, 28, 40)) {
                drawMirrorOfIanthe(ctx, PAINTED_MIRROR.x, PAINTED_MIRROR.y, 0.95, eng.animTimer);
            }
            if (doused) eng.lightPool(ctx, PAINTED_MIRROR.x, PAINTED_MIRROR.y, 74, '190,220,255', 0.2);
        }
        if (doused) dustMotes(ctx, 560, 200, 80, 140, eng.animTimer, 2424);
    }

    // ================= ROOM 11: THE DRAGON'S CAVE =================
    engine.registerRoom({
        id: 'dragon_cave',
        name: 'The Dragon\'s Cave',
        description: 'A cave with a fire pit in it, and something lying round the fire pit that is not a dog.',
        smell: 'Hot stone, sulphur, and the specific smell of a very large animal that lives indoors.',
        hint: (e) => {
            if (!e.getFlag('dragon_doused')) return 'You will not fight it and you will not sneak past it. But its fire is the only thing lighting this cave, and you own a pail.';
            if (!e.hasItem('mirror_of_ianthe')) return 'Take the mirror from the hoard.';
            return 'The way out is east.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('cave_drip');
            e.setDepthScaling(286, 372, 0.74, 1.06);
            e.setWalkableArea((px, py) => py > 296 && py < 372 && px > 40 && px < 600);
            if (!e.getFlag('dragon_roared')) {
                e.setFlag('dragon_roared');
                e.sound.dragonRoar();
            }
            e.addForegroundLayer(342, (ctx, eng) => {
                eng.drawContactShadow(ctx, 310, 346, 1, { rx: 120, ry: 15, alpha: 0.34 });
                if (!drawPaintedActor(ctx, 'dragon', 310, 346, { width: 300, t: eng.animTimer, still: eng.getFlag('dragon_doused') })) drawDragon(ctx, 310, 346, 1.45, eng.animTimer, eng.getFlag('dragon_doused'));
            });
            if (paintedCave) configurePaintedCave(e);
        },
        onUpdate: (e) => {
            if (e.dead || e.cutscene || e.sequence || e.getFlag('dragon_doused')) return;
            if (e.playerX < 380) {
                e.die('The dragon opens one eye, which is the size of your head, and then its mouth, which is not. There is a brief noise like a forge door and then there is no more Rowan at all.');
            }
        },
        draw: (ctx, w, h, eng) => {
            if (paintedCave) { drawPaintedCave(ctx, w, h, eng); return; }
            const doused = eng.getFlag('dragon_doused');
            const lit = doused ? '#4a4650' : '#7a5c4c';
            const base = doused ? '#332f3c' : '#523a30';
            const shade = doused ? '#1d1b26' : '#2e1f1a';
            ctx.drawImage(eng.staticLayer(`dragon_cave|cave|doused:${+doused}`, (ctx, w, h) => {
                ctx.fillStyle = '#08060a';
                ctx.fillRect(0, 0, w, h);
                // The cave recedes: a bright near mouth, then successively smaller
                // and darker chambers behind it. A flat wall has no depth at all.
                rockFace(ctx, 0, 0, w, 320, 5959, lit, base, shade);
                // A single throat receding into the hill. Concentric outlines on one
                // plane read as rings painted on a wall; one opening that darkens
                // steadily inward reads as distance.
                for (let i = 7; i >= 0; i--) {
                    const f = i / 7;
                    const cw = 360 - f * 280;
                    const ch = 220 - f * 150;
                    const cx0 = 320 - cw / 2;
                    const cy0 = 296 - ch;
                    ctx.fillStyle = `rgba(8,5,4,${0.30 + f * 0.09})`;
                    ctx.beginPath();
                    ctx.moveTo(cx0, 296);
                    ctx.quadraticCurveTo(cx0, cy0, 320, cy0);
                    ctx.quadraticCurveTo(cx0 + cw, cy0, cx0 + cw, 296);
                    ctx.closePath();
                    ctx.fill();
                }
                // Depth haze: the top of the chamber falls away into the dark, which
                // also stops the rock texture competing with the dragon.
                ctx.fillStyle = 'rgba(10,6,6,0.4)';
                ctx.fillRect(0, 0, w, 120);
                blendSeam(ctx, 0, 122, w, 'rgba(10,6,6,0.4)', 'rgba(10,6,6,0)');
                // Roof: stalactites hanging in three depth tiers
                const st = seededRandom(1010);
                for (let tier = 0; tier < 3; tier++) {
                    const tf = 1 - tier * 0.3;
                    for (let i = 0; i < 14; i++) {
                        const sx = st() * w;
                        const sh = (22 + st() * 62) * tf;
                        const sw = (10 + st() * 14) * tf;
                        const top = tier * 16;
                        ctx.fillStyle = '#12100f';
                        ctx.beginPath();
                        ctx.moveTo(sx - sw / 2, top); ctx.lineTo(sx + sw / 2, top); ctx.lineTo(sx, top + sh);
                        ctx.closePath(); ctx.fill();
                        ctx.fillStyle = tier ? shade : (doused ? '#3d3946' : '#5c4237');
                        ctx.beginPath();
                        ctx.moveTo(sx - sw / 2 + 1.4, top); ctx.lineTo(sx + sw / 2 - 1.4, top); ctx.lineTo(sx, top + sh - 6);
                        ctx.closePath(); ctx.fill();
                        if (tier) continue;
                        ctx.fillStyle = doused ? '#565064' : '#7e5d4d';
                        ctx.beginPath();
                        ctx.moveTo(sx - sw / 2 + 1.4, top); ctx.lineTo(sx - sw / 6, top); ctx.lineTo(sx - 1, top + sh - 12);
                        ctx.closePath(); ctx.fill();
                    }
                }
                // Floor
                ctx.fillStyle = '#241d1a';
                ctx.fillRect(0, 296, w, h - 296);
                blendSeam(ctx, 0, 302, w, '#332823', '#241d1a');
                ctx.fillStyle = '#2c2320';
                ctx.fillRect(0, 340, w, h - 340);
                blendSeam(ctx, 0, 342, w, '#241d1a', '#2c2320');
                // Rubble along the wall foot, tying floor and wall together
                const rb = seededRandom(4141);
                for (let i = 0; i < 46; i++) {
                    const rx = rb() * w;
                    const rr = 3 + rb() * 7;
                    ctx.fillStyle = '#151110';
                    ctx.beginPath(); ctx.ellipse(rx, 298 + rb() * 10, rr, rr * 0.6, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = base;
                    ctx.beginPath(); ctx.ellipse(rx - 1, 297 + rb() * 8, rr * 0.8, rr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
                }

                // ---- The fire pit ----
                ctx.fillStyle = '#100c0a';
                ctx.beginPath(); ctx.ellipse(216, 344, 74, 22, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#3a3129';
                for (let i = 0; i < 14; i++) {
                    const a = i / 14 * Math.PI * 2;
                    ctx.beginPath();
                    ctx.ellipse(216 + Math.cos(a) * 64, 344 + Math.sin(a) * 19, 9, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }), 0, 0);
            drawFirePit(ctx, w, h, eng, doused);

            // ---- The hoard ----
            ctx.drawImage(eng.staticLayer('dragon_cave|hoard', (ctx) => {
                const hoard = seededRandom(3232);
                ctx.fillStyle = '#2a2008';
                ctx.beginPath();
                ctx.ellipse(470, 348, 118, 30, 0, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 200; i++) {
                    const a = hoard() * Math.PI * 2;
                    const r = hoard();
                    const gx = 470 + Math.cos(a) * r * 112;
                    const gy = 348 + Math.sin(a) * r * 26 - (1 - r) * 14;
                    const tone = hoard();
                    ctx.fillStyle = tone > 0.72 ? PAL.GOLD_LIT : (tone > 0.34 ? PAL.GOLD_BASE : PAL.GOLD_SHADOW);
                    ctx.beginPath();
                    ctx.ellipse(gx, gy, 3.4, 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                // A crown, a helm and a chalice sitting proud of the coins
                ctx.fillStyle = PAL.GOLD_SHADOW;
                ctx.fillRect(412, 326, 26, 12);
                ctx.fillStyle = PAL.GOLD_BASE;
                ctx.fillRect(412, 328, 26, 8);
                [412, 419, 426, 433].forEach((cx2) => {
                    ctx.beginPath();
                    ctx.moveTo(cx2, 328); ctx.lineTo(cx2 + 5, 328); ctx.lineTo(cx2 + 2.5, 320);
                    ctx.closePath(); ctx.fill();
                });
                ctx.fillStyle = PAL.SILVER_SHADOW;
                ctx.beginPath(); ctx.ellipse(534, 330, 17, 13, 0, Math.PI, 0); ctx.fill();
                ctx.fillStyle = PAL.SILVER_BASE;
                ctx.beginPath(); ctx.ellipse(532, 330, 14, 10, 0, Math.PI, 0); ctx.fill();
                ctx.fillStyle = PAL.SILVER_LIT;
                ctx.beginPath(); ctx.ellipse(528, 327, 6, 4, 0, Math.PI, 0); ctx.fill();
            }), 0, 0);
            if (!RULES.treasureTaken(eng, 'mirror_of_ianthe')) {
                drawMirrorOfIanthe(ctx, 480, 314, 0.95, eng.animTimer);
                if (doused) eng.lightPool(ctx, 480, 314, 74, '190,220,255', 0.2);
            }

            // ---- Cave mouth, east: a ragged opening full of green daylight ----
            const mouth = (inset, fill) => {
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.moveTo(560 + inset, 372);
                ctx.lineTo(566 + inset, 300 + inset);
                ctx.lineTo(580 + inset * 0.5, 268 + inset);
                ctx.lineTo(598, 250 + inset);
                ctx.lineTo(616 - inset * 0.5, 266 + inset);
                ctx.lineTo(628 - inset, 302 + inset);
                ctx.lineTo(632 - inset, 372);
                ctx.closePath();
                ctx.fill();
            };
            mouth(0, '#0a0d08');
            mouth(5, '#1a2416');
            // Seen from inside a dark cave, an opening is blown-out daylight, not
            // a saturated green shape: pale and desaturated, with the only dark
            // things being tree silhouettes against it.
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(570, 372);
            ctx.lineTo(575, 308); ctx.lineTo(586, 276); ctx.lineTo(598, 260);
            ctx.lineTo(612, 274); ctx.lineTo(621, 308); ctx.lineTo(624, 372);
            ctx.closePath();
            ctx.clip();
            skyBands(ctx, 560, 254, 80, 60, ['#f4f8ee', '#e6eddc', '#d2e0bc']);
            ctx.fillStyle = '#c2d3a6';
            ctx.fillRect(560, 314, 80, 62);
            blendSeam(ctx, 560, 316, 80, '#d2e0bc', '#c2d3a6');
            // Trees outside, in silhouette against the glare
            const outside = seededRandom(3141);
            [578, 592, 609].forEach((tx, i) => {
                ctx.fillStyle = 'rgba(26,36,20,0.82)';
                ctx.fillRect(tx, 258, 3 + i, 118);
                for (let k = 0; k < 5; k++) {
                    const by = 268 + k * 17 + outside() * 8;
                    const br = 7 + outside() * 8;
                    ctx.beginPath();
                    ctx.ellipse(tx + (k % 2 ? br * 0.5 : -br * 0.5), by, br, br * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.fillStyle = 'rgba(22,30,16,0.7)';
            ctx.fillRect(560, 352, 80, 24);
            // Glare bloom at the centre of the opening
            ctx.fillStyle = 'rgba(255,255,246,0.4)';
            ctx.beginPath();
            ctx.ellipse(598, 300, 26, 42, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Ragged rock rim, thick and near-black, so the hole is cut in stone
            const teeth = seededRandom(2718);
            for (let i = 0; i < 11; i++) {
                const t = i / 10;
                const px = i % 2 ? 570 + t * 6 + teeth() * 4 : 626 - t * 8 - teeth() * 4;
                const py = 264 + t * 104 + teeth() * 6;
                const pr = 3 + teeth() * 5;
                ctx.fillStyle = '#0a0d08';
                ctx.beginPath();
                ctx.moveTo(px, py - pr);
                ctx.lineTo(px + (i % 2 ? pr * 1.8 : -pr * 1.8), py);
                ctx.lineTo(px, py + pr);
                ctx.closePath();
                ctx.fill();
            }
            // Daylight spilling back onto the cave floor
            lightShaft(ctx, 596, 268, 40, 574, 372, 92, 0.16, 'rgba(200,240,170,1)');

            if (doused) {
                dustMotes(ctx, 524, 252, 116, 120, eng.animTimer, 2424);
            }

            eng.vignette(ctx, doused ? 0.6 : 0.42, doused ? '6,6,12' : '40,8,4');
        },
        hotspots: [
            {
                name: 'the dragon', x: 180, y: 240, w: 260, h: 110, walkToX: 420,
                description: 'A dragon curled round a fire pit like a cat round a hearth. It is the size of the cottage on the green and it is breathing very slowly.',
                talk: (e) => e.showMessage('"Hello," you say. The dragon does not open its eyes. "Mm," it says, and the temperature in the cave goes up.'),
                get: (e) => e.showMessage('You are not taking a dragon anywhere.'),
                use: (e) => e.showMessage('You would have to be closer, and being closer is the entire problem.'),
                // Water thrown at the dragon lands on the fire it is curled around.
                useItem: (e, itemId) => {
                    if (itemId === 'pail') { engine.rooms.dragon_cave.hotspots.find((h) => h.name === 'the fire pit').useItem(e, itemId); return; }
                    e.showMessage('The dragon opens one eye at it, decides it is not food, and closes the eye again. You are lucky it did not decide the same about you.');
                }
            },
            {
                name: 'the fire pit', x: 146, y: 320, w: 142, h: 48, walkToX: 420,
                description: 'A pit of coals the dragon has clearly kept burning for a very long time. It is the only light in the cave.',
                look: (e) => {
                    e.showMessage(e.getFlag('dragon_doused')
                        ? 'A pit of wet black coals, steaming resentfully.'
                        : 'A pit of coals the dragon has kept burning for longer than Alderhaven has had a castle. It is the only light in here, and the dragon is wrapped around it like a cat.');
                },
                use: (e) => {
                    if (e.getFlag('dragon_doused')) { e.showMessage('It is out. It is going to stay out.'); return; }
                    e.showMessage('You would have to get close, and something with a great many teeth is lying against it.');
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'pail') { e.showMessage('That will not put out a fire that size.'); return; }
                    if (!e.getFlag('pail_full')) { e.showMessage('The pail is empty. There is water at the bottom of the well.'); return; }
                    if (e.getFlag('dragon_doused')) { e.showMessage('The fire is already out.'); return; }
                    e.setFlag('dragon_doused');
                    RULES.setPailWater(e, false);
                    RULES.award(e, 'dragon_doused');
                    e.runSequence([
                        'You throw the whole pail from as far back as you can and still hit anything.',
                        (eng) => { eng.sound.splash(); eng.shake(7); },
                        500,
                        (eng) => { eng.sound.dragonRoar(); },
                        'The fire goes out with a noise like a slammed door, and the cave goes dark, and something enormous comes off the floor very fast indeed.',
                        700,
                        'The dragon comes half off the floor and then sinks back down beside the steaming pit, wings drooping, head low on its paws, staring at the wet coals, absolutely appalled. It has kept that fire alight for four hundred years and a scullery boy has just ended it with a bucket.',
                        400,
                        'It does not attack. It is far too busy being upset.'
                    ], { skippable: true });
                }
            },
            {
                name: 'the hoard', x: 356, y: 306, w: 232, h: 62, walkToX: 470,
                description: 'Coins, a crown, a helm, a chalice, and one hand mirror in a gold frame that is worth more than all the rest of it together.',
                get: (e) => e.showMessage('You take nothing you did not come for. Partly out of honour, and mostly because of the dragon.')
            },
            {
                name: 'the Mirror of Ianthe', x: 456, y: 288, w: 50, h: 56, walkToX: 470,
                description: 'A hand mirror in a gold frame, lying on a drift of coins as though it had been dropped there. The third treasure of Alderhaven.',
                get: (e) => {
                    if (RULES.treasureTaken(e, 'mirror_of_ianthe')) return;
                    if (!e.getFlag('dragon_doused')) {
                        e.die('You go for the mirror. You get four steps. The dragon does not even need to stand up.');
                        return;
                    }
                    e.addToInventory('mirror_of_ianthe');
                    RULES.award(e, 'mirror_of_ianthe');
                    e.sound.scoreUp();
                    e.updateInventoryUI();
                    e.showMessage('You lift the mirror out of the coins. In the glass you see yourself a heartbeat later than you move, and behind your shoulder, for just that heartbeat, a tower the colour of old honey.');
                },
                get hidden() { return RULES.treasureTaken(engine, 'mirror_of_ianthe'); }
            },
            {
                name: 'the way out', x: 566, y: 222, w: 62, h: 150, isExit: true, walkToX: 578,
                description: 'Green daylight, and the wood beyond it.',
                onExit: (e) => e.goToRoom('dark_wood', 132, 300)
            }
        ]
    });
});
