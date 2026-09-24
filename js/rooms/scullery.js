// ============================================================
// CROWN QUEST - ACT I: THE SCULLERY
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    const { F, HOUSE_TONE, ceilingBeams, houseWalls, flagstones } = CrownQuest.shared.house;
    // Heights of the surfaces props stand on. onEnter registers them and draw()
    // paints from the same numbers, so a prop cannot drift off its own shelf.
    const SHELF_F = [0.28, 0.44];
    const RACK_F = [0.3, 0.46];

    let paintedScullery = false;
    const sculleryImage = new Image();
    function configureSculleryPail(e) {
        e.addBarrier(236, 276, 28, 30, eng => !eng.hasItem('pail'));
        e.addForegroundLayer(286, (ctx, eng) => {
            if (eng.hasItem('pail')) return;
            const groundY = 306, scale = 1.55;
            eng.drawContactShadow(ctx, 250, groundY, 1, { rx: 26, ry: 6, alpha: 0.34 });
            ctx.save();
            ctx.translate(250, groundY - 17 * scale);
            ctx.scale(scale, scale);
            ITEM_ART.pail(ctx, 0, 0, eng.animTimer);
            ctx.restore();
        });
    }
    function configurePaintedScullery(e) {
        e.clearForegroundLayers();
        e.clearBarriers();
        e.setWalkableArea((px, py) => py > 236 && py < 372 && px > 34 && px < 596, 237);
        e.setDepthScaling(236, 372, 0.72, 1.12);
        e.addBarrier(0, 278, 214, 52);
        configureSculleryPail(e);
        e.addForegroundLayer(330, (ctx, eng) => {
            ctx.drawImage(eng.staticLayer('scullery|painted-table', (tableCtx) => {
                const surfaces = [
                    [[14, 254], [100, 220], [212, 220], [212, 236], [174, 270], [14, 270]],
                    [[26, 268], [50, 268], [50, 320], [42, 324], [26, 324]],
                    [[148, 268], [174, 268], [174, 324], [168, 328], [148, 328]],
                    [[196, 248], [208, 240], [208, 292], [196, 296]],
                    [[86, 270], [94, 270], [94, 294], [86, 294]],
                    [[48, 294], [80, 276], [86, 280], [50, 304]],
                    [[94, 278], [150, 278], [150, 288], [94, 288]],
                    [[172, 296], [196, 278], [196, 288], [172, 308]]
                ];
                tableCtx.save();
                tableCtx.beginPath();
                for (const points of surfaces) {
                    tableCtx.moveTo(...points[0]);
                    for (const point of points.slice(1)) tableCtx.lineTo(...point);
                    tableCtx.closePath();
                }
                tableCtx.clip();
                tableCtx.imageSmoothingEnabled = false;
                tableCtx.drawImage(sculleryImage, 0, 0, 640, 400);
                tableCtx.translate(-12, -31);
                eng.lightPool(tableCtx, 322, 240, 210, '255,150,60', 0.20);
                tableCtx.restore();
            }), 0, 0);
        });
        e.addSurface('larder_upper', 22, 160, () => 74);
        e.addSurface('larder_lower', 22, 160, () => 149);
        const layout = {
            'the hearth': { x: 224, y: 126, w: 174, h: 105, walkToX: 320, walkToY: 258 },
            'the pot': { x: 286, y: 177, w: 48, h: 36, walkToX: 320, walkToY: 258 },
            'the crock of salt': { x: 30, y: 44, w: 42, h: 34, walkToX: 230, walkToY: 340 },
            'the black bread': { x: 40, y: 128, w: 42, h: 25, walkToX: 230, walkToY: 340 },
            'the copper pans': { x: 540, y: 86, w: 84, h: 73 },
            'the scrubbing table': { x: 10, y: 218, w: 204, h: 112 },
            'the stair up': { x: 408, y: 56, w: 85, h: 171, walkToX: 450, walkToY: 250 }
        };
        for (const hotspot of e.rooms.scullery.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        sculleryImage.onload = () => {
            paintedScullery = true;
            if (engine.currentRoomId === 'scullery') configurePaintedScullery(engine);
        };
        sculleryImage.src = 'icons/scullery-trial.png';
    }
    // ================= ROOM 1: THE SCULLERY =================
    engine.registerRoom({
        id: 'scullery',
        name: 'The Scullery',
        get description() { return engine.getFlag('morvane_passed')
            ? 'The scullery is empty. Far overhead, a shutter clicks in Morvane\'s locked observatory. Keep quiet; he still thinks you are working.'
            : 'Morvane\'s scullery. Cold stone, a banked fire, and eleven years of your life spent scrubbing it.'; },
        smell: 'Wet ash, onion skins, and lye. It smells like every morning you can remember.',
        hint: (e) => {
            if (!e.hasItem('bread')) return 'The larder shelf holds the last of the black bread. Take it — a hard crust has uses.';
            if (!e.hasItem('sea_salt') && !e.getFlag('circle_salt')) return 'There is a crock of coarse sea salt on the larder shelf. Take a pinch.';
            if (!e.hasItem('pail')) return 'Your pail is stood on the hearthstone, to the left of the fire. You will want it.';
            return e.getFlag('morvane_passed')
                ? 'Morvane is shut in the upper observatory. The lower rooms are clear, but do not linger. The stair leads to the study.'
                : 'Morvane is out. The stair behind you goes up to his study, and you have never once been allowed in it.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('hearth');
            e.setDepthScaling(266, 372, 0.72, 1.12);
            e.setWalkableArea((px, py) => py > 270 && py < 372 && px > 34 && px < 596);
            e.addSurface('larder_upper', 22, 138, (x) => F.lBand(x, SHELF_F[0]));
            e.addSurface('larder_lower', 22, 138, (x) => F.lBand(x, SHELF_F[1]));
            e.addSurface('copper_rack', 502, 620, (x) => F.rBand(x, RACK_F[0]));
            // The great table and the hearth are solid.
            e.addBarrier(56, 292, 168, 40);
            e.addBarrier(432, 276, 150, 46);
            // No edge transition: the stair is the only way out, and it is drawn.
            // Walking into a blank wall must not teleport you upstairs.

            // A trestle bench across the near floor gives the ego something to
            // walk behind, which is what sells the depth of the room.
            e.addForegroundLayer(388, (ctx) => {
                ctx.fillStyle = '#0d0a06';
                ctx.fillRect(-10, 356, 250, 26);
                woodPlanks(ctx, -8, 360, 246, 18, false, 141);
                ctx.fillStyle = '#0d0a06';
                ctx.fillRect(28, 372, 16, 24);
                ctx.fillRect(184, 372, 16, 24);
            });
            if (paintedScullery) configurePaintedScullery(e);
            else configureSculleryPail(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedScullery) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(sculleryImage, 0, 0, w, h);
                ctx.restore();
            }
            if (!paintedScullery) {
            // Shell, walls, floor and beams are fixed geometry and seeded
            // texture: paint them once, then blit. The fire below is animated
            // and stays outside the cached layer.
            ctx.drawImage(eng.staticLayer('scullery|shell', (ctx, w, h) => {
                interiorShell(ctx, w, h, F, HOUSE_TONE);
                houseWalls(ctx, w);
                flagstones(ctx, w, h);
                ceilingBeams(ctx, w);
            }), 0, 0);

            // ---- Hearth on the back wall, banked low ----
            ctx.fillStyle = '#191410';
            ctx.fillRect(258, 150, 128, 108);
            stoneWall(ctx, 250, 138, 144, 24, 662, '#6a6150', '#544c3d', '#3a342a', '#2a251e');
            ctx.fillStyle = '#0a0806';
            ctx.beginPath();
            ctx.moveTo(272, 258);
            ctx.lineTo(272, 196);
            ctx.quadraticCurveTo(322, 158, 372, 196);
            ctx.lineTo(372, 258);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#1c1512';
            ctx.beginPath();
            ctx.moveTo(278, 258);
            ctx.lineTo(278, 198);
            ctx.quadraticCurveTo(322, 164, 366, 198);
            ctx.lineTo(366, 258);
            ctx.closePath();
            ctx.fill();
            // Embers and the pot on its chain
            }
            ctx.save();
            if (paintedScullery) ctx.translate(-12, -31);
            const glow = 0.5 + Math.sin(eng.animTimer / 620) * 0.2;
            ctx.fillStyle = `rgba(226,110,40,${glow * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(322, 250, 44, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a1c0c';
            ctx.fillRect(286, 242, 72, 14);
            for (let i = 0; i < 11; i++) {
                const ex = 290 + i * 6;
                const flick = (Math.sin(eng.animTimer / 220 + i) + 1) * 0.5;
                ctx.fillStyle = flick > 0.6 ? PAL.FLAME_MID : (flick > 0.3 ? PAL.EMBER : '#2a1108');
                ctx.fillRect(ex, 244, 5, 8);
            }
            // Three flames of different heights read as a fire; one reads as a candle.
            flame(ctx, 300, 244, 0.7, eng.animTimer + 1400);
            flame(ctx, 316, 244, 1.05, eng.animTimer);
            flame(ctx, 332, 245, 0.82, eng.animTimer + 700);
            flame(ctx, 345, 246, 0.55, eng.animTimer + 2100);
            ctx.strokeStyle = '#2a251e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(322, 176); ctx.lineTo(322, 212);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = '#100e0c';
            ctx.beginPath();
            ctx.ellipse(322, 226, 22, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2e2a26';
            ctx.beginPath();
            ctx.ellipse(322, 225, 19, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a453e';
            ctx.beginPath();
            ctx.ellipse(316, 220, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            eng.lightPool(ctx, 322, 240, 210, '255,150,60', 0.20);
            ctx.restore();

            // ---- Larder shelves on the left wall, in perspective ----
            // The planks and everything standing on them come off SHELF_F, which
            // onEnter also registered as the 'larder_*' surfaces.
            const shelfTop = (x, tier) => eng.standOn(tier ? 'larder_lower' : 'larder_upper', x);
            const shelfTone = (fill) => { ctx.fillStyle = fill; ctx.fill(); };
            if (!paintedScullery) SHELF_F.forEach((f, i) => {
                F.trap(ctx, 22, 138, f, f + 0.055, F.lBand);
                shelfTone(i ? PAL.WOOD_SHADOW : PAL.WOOD_BASE);
                F.trap(ctx, 22, 138, f, f + 0.018, F.lBand);
                shelfTone(PAL.WOOD_LIT);
            });
            // Crocks, a hanging onion rope and the bread.
            // The shelf top face slopes toward the vanishing point, so an object
            // must be measured at its OWN centre x and have its base placed on
            // that y. Measuring at some other x is how things end up hovering.
            /** Ellipse of contact shadow on a shelf, tilted to follow the plank's
             *  slope. Measure at the object's OWN x, on the wall it stands on. */
            const shelfShadow = (cx, band, f, rx) => {
                const y = paintedScullery ? shelfTop(cx, f === SHELF_F[1] ? 1 : 0) : band(cx, f);
                const slope = paintedScullery ? 0 : Math.atan2(band(cx + 20, f) - band(cx - 20, f), 40);
                ctx.save();
                ctx.translate(cx, y);
                ctx.rotate(slope);
                ctx.fillStyle = 'rgba(12,8,4,0.5)';
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, 2.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            // Salt crock, upper shelf
            {
                const cx = 51, base = shelfTop(cx, 0);
                shelfShadow(cx, F.lBand, SHELF_F[0], 13);
                const paintedCrock = drawPaintedItem(ctx, 'crock', cx, base, 28, 28);
                if (!paintedCrock) {
                ctx.fillStyle = '#0f0c08';
                ctx.fillRect(cx - 11, base - 21, 22, 21);
                ctx.fillStyle = '#6a5a48';
                ctx.fillRect(cx - 9, base - 19, 18, 19);
                ctx.fillStyle = '#8a7a64';
                ctx.fillRect(cx - 9, base - 19, 6, 19);
                ctx.fillStyle = '#c9bfa4';
                ctx.fillRect(cx - 11, base - 24, 22, 4);
                }
                if (!eng.hasItem('sea_salt')) {
                    ctx.fillStyle = '#e8e0cc';
                    if (paintedCrock) {
                        ctx.beginPath();
                        ctx.ellipse(cx, base - 25, 4.5, 1.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    } else ctx.fillRect(cx - 5, base - 27, 10, 4);
                }
            }
            // Fat jar, upper shelf
            if (!paintedScullery) {
                const cx = 91, base = shelfTop(cx, 0);
                shelfShadow(cx, F.lBand, SHELF_F[0], 15);
                ctx.fillStyle = '#0f0c08';
                ctx.fillRect(cx - 13, base - 18, 26, 18);
                ctx.fillStyle = '#4a4438';
                ctx.fillRect(cx - 11, base - 16, 22, 16);
                ctx.fillStyle = '#655d4c';
                ctx.fillRect(cx - 11, base - 16, 7, 16);
            }
            // The black bread, lower shelf
            if (!eng.hasItem('bread')) {
                const cx = paintedScullery ? 60 : 112, base = shelfTop(cx, 1);
                shelfShadow(cx, F.lBand, SHELF_F[1], 15);
                if (!drawPaintedItem(ctx, 'bread', cx, base, 36, 18)) {
                ctx.fillStyle = '#2a1a0c';
                ctx.beginPath();
                ctx.ellipse(cx, base - 8, 15, 8, -0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6b4522';
                ctx.beginPath();
                ctx.ellipse(cx, base - 9, 13, 6.4, -0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8a5c30';
                ctx.beginPath();
                ctx.ellipse(cx - 3, base - 11, 8, 3, -0.1, 0, Math.PI * 2);
                ctx.fill();
                }
            }
            // Onion rope hanging from a ceiling hook
            if (!paintedScullery) {
            ctx.strokeStyle = '#7a6a44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(148, 24); ctx.lineTo(150, 92);
            ctx.stroke();
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const oy = 44 + i * 11;
                ctx.fillStyle = '#5a4a22';
                ctx.beginPath();
                ctx.ellipse(149 + (i % 2 ? 4 : -4), oy, 8, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#a8925a';
                ctx.beginPath();
                ctx.ellipse(147 + (i % 2 ? 4 : -4), oy - 2, 4.4, 3.4, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- Right wall: a rack of copper ----
            RACK_F.forEach((f) => {
                F.trap(ctx, 502, 620, f, f + 0.05, F.rBand);
                ctx.fillStyle = PAL.WOOD_SHADOW; ctx.fill();
                F.trap(ctx, 502, 620, f, f + 0.016, F.rBand);
                ctx.fillStyle = PAL.WOOD_LIT; ctx.fill();
            });
            [[540, RACK_F[0]], [578, RACK_F[0]]].forEach(([px, f], i) => {
                // Base on the plank at this pan's own x, then build upward: an
                // ellipse centred above the plank leaves the pan hovering.
                const base = eng.standOn('copper_rack', px);
                const rx = 13 - i * 2, ry = 12 - i * 2;
                shelfShadow(px, F.rBand, f, rx);
                ctx.fillStyle = '#191512';
                ctx.beginPath();
                ctx.ellipse(px, base - ry, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8a5a28';
                ctx.beginPath();
                ctx.ellipse(px, base - ry - 1, rx - 2, ry - 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#c98a3c';
                ctx.beginPath();
                ctx.ellipse(px - 3, base - ry - 4, 5 - i, 3.4 - i * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            }
            // ---- The great scrubbing table, near left ----
            if (!paintedScullery) {
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(48, 286, 184, 12);
            woodPlanks(ctx, 52, 288, 176, 10, false, 77);
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(62, 296, 14, 44);
            ctx.fillRect(202, 296, 14, 44);
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.fillRect(64, 298, 10, 42);
            ctx.fillRect(204, 298, 10, 42);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(64, 298, 4, 42);
            ctx.fillRect(204, 298, 4, 42);
            // The scrubbing brush he will not miss
            ctx.fillStyle = '#241708';
            ctx.fillRect(150, 278, 30, 9);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(151, 279, 28, 5);
            ctx.fillStyle = '#8a7a54';
            for (let i = 0; i < 13; i++) ctx.fillRect(152 + i * 2, 284, 1, 4);

            // ---- The stair up to the study, right of the hearth ----
            // Treads recede toward the vanishing point and each gets a lit nose
            // and a dark riser, so the opening reads as a stair and not a hole.
            ctx.fillStyle = '#08070a';
            ctx.fillRect(402, 132, 84, 126);
            ctx.fillStyle = '#241d14';
            ctx.fillRect(406, 136, 76, 122);
            for (let i = 0; i < 7; i++) {
                const inset = i * 4.4;
                const ty = 250 - i * 15;
                ctx.fillStyle = i % 2 ? '#4a4031' : '#413829';
                ctx.fillRect(408 + inset, ty, 72 - inset * 2, 9);
                ctx.fillStyle = '#63563f';
                ctx.fillRect(408 + inset, ty, 72 - inset * 2, 2);
                ctx.fillStyle = '#171208';
                ctx.fillRect(408 + inset, ty + 8, 72 - inset * 2, 6);
            }
            ctx.fillStyle = '#0e0c14';
            ctx.fillRect(432, 136, 28, 26);
            // Warm light spilling down from the study above
            lightShaft(ctx, 446, 138, 22, 446, 262, 66, 0.11, 'rgba(255,214,150,1)');
            // Timber casing last, so it frames the opening: posts, a head beam
            // and a worn sill, rather than a black line painted round a hole.
            const doorTimber = (tx, ty2, tw, th, vertical, seed) => {
                ctx.fillStyle = '#150e05';
                ctx.fillRect(tx - 2, ty2 - 2, tw + 4, th + 4);
                woodPlanks(ctx, tx, ty2, tw, th, vertical, seed);
                ctx.fillStyle = PAL.WOOD_LIT;
                if (vertical) ctx.fillRect(tx, ty2, 2.5, th); else ctx.fillRect(tx, ty2, tw, 2.5);
                ctx.fillStyle = PAL.WOOD_DEEP;
                if (vertical) ctx.fillRect(tx + tw - 2.5, ty2, 2.5, th); else ctx.fillRect(tx, ty2 + th - 2.5, tw, 2.5);
            };
            doorTimber(392, 134, 14, 126, true, 811);
            doorTimber(482, 134, 14, 126, true, 823);
            doorTimber(388, 116, 112, 20, false, 837);
            doorTimber(396, 256, 96, 8, false, 849);
            // Iron straps over the head beam, and pegs in the posts
            [404, 440, 476].forEach((sx) => {
                ctx.fillStyle = '#241f19';
                ctx.fillRect(sx, 116, 5, 20);
                ctx.fillStyle = '#4a443a';
                ctx.fillRect(sx, 116, 1.6, 20);
            });
            ctx.fillStyle = '#2e2114';
            [396, 486].forEach((sx) => {
                ctx.fillRect(sx, 168, 4, 4);
                ctx.fillRect(sx, 228, 4, 4);
            });
            ctx.fillStyle = '#8a7a5c';
            [396, 486].forEach((sx) => {
                ctx.fillRect(sx, 168, 1.6, 1.6);
                ctx.fillRect(sx, 228, 1.6, 1.6);
            });

            // ---- Light from the high window, and its motes ----
            lightShaft(ctx, 210, 40, 30, 268, 330, 84, 0.13);
            dustMotes(ctx, 190, 40, 120, 290, eng.animTimer, 991);
            eng.vignette(ctx, 0.44, '10,7,4');
            }
        },
        hotspots: [
            {
                name: 'the hearth', x: 262, y: 150, w: 122, h: 110,
                description: 'A cooking fire banked down to embers, with the great pot swinging over it. You have kept this fire alive since you were seven.',
                use: (e) => e.showMessage('You poke the embers into a sulky orange. They are as enthusiastic about the morning as you are.'),
                get: (e) => e.showMessage('The fire declines to come with you.')
            },
            {
                name: 'the pot', x: 298, y: 208, w: 48, h: 36,
                description: 'Yesterday\'s barley broth, wearing a grey skin. Morvane eats it without appearing to notice it exists.',
                use: (e) => e.showMessage('You give the broth a stir out of eleven years of habit. It gives back nothing.')
            },
            {
                name: 'the larder shelf', x: 24, y: 58, w: 128, h: 122,
                description: 'Two plank shelves of crocks and jars. Salt, dripping, a crock of goose fat, and the end of the black bread.',
                get: (e) => e.showMessage('You will have to take things from the shelf one at a time.')
            },
            {
                // The shelves are perspective bands on the left wall, so these
                // rects follow lBand rather than sitting at a flat y.
                name: 'the crock of salt', x: 32, y: 60, w: 40, h: 38, walkToX: 150,
                description: 'A stone crock of coarse grey sea salt, panned from the crag\'s own tide pools.',
                get: (e) => {
                    if (e.hasItem('sea_salt')) { e.showMessage('You have salt enough for whatever you are planning.'); return; }
                    e.sound.pickup();
                    e.addToInventory('sea_salt');
                    if (!e.getFlag('circle_salt')) RULES.award(e, 'sea_salt');
                    e.showMessage('You twist a pinch of coarse sea salt into a scrap of cloth and pocket it. Morvane counts many things. He has never once counted the salt.');
                },
                get hidden() { return engine.hasItem('sea_salt'); }
            },
            {
                name: 'the black bread', x: 92, y: 114, w: 46, h: 34, walkToX: 168,
                description: 'The heel of a black loaf, gone hard as a roof slate. Even Morvane gave up on it.',
                get: (e) => {
                    e.sound.pickup();
                    e.addToInventory('bread');
                    RULES.award(e, 'bread');
                    e.showMessage('You pocket the crust. It is inedible, which in your experience only broadens its uses.');
                },
                get hidden() { return engine.hasItem('bread'); }
            },
            {
                name: 'the pail', x: 220, y: 250, w: 62, h: 56, walkToX: 292,
                description: 'Your pail, stood on the hearthstone. You could pick it out of a thousand pails.',
                get: (e) => {
                    e.sound.pickup();
                    e.addToInventory('pail');
                    RULES.award(e, 'pail');
                    e.showMessage('You pick up the pail. It has stood in that spot so long the flagstone under it is a different colour.');
                },
                get hidden() { return engine.hasItem('pail'); }
            },
            {
                name: 'the copper pans', x: 516, y: 118, w: 92, h: 54,
                description: 'Copper pans, scoured to a shine you are unreasonably proud of.',
                get: (e) => e.showMessage('He counts the pans. He counts them twice on Thursdays.')
            },
            {
                name: 'the scrubbing table', x: 48, y: 278, w: 184, h: 62,
                description: 'Scrubbed so often the oak has gone pale and soft. There is a groove worn where your hands go.',
                use: (e) => e.showMessage('You could scrub it again. You have scrubbed it every day of your remembered life, and today the house is empty.')
            },
            {
                name: 'the stair up', x: 388, y: 116, w: 112, h: 148, isExit: true, walkToX: 430, walkToY: 336,
                description: 'Worn steps curving up into the dark, toward the study. You have been forbidden that stair since you could walk.',
                onExit: (e) => e.goToRoom('study', 96, 330)
            }
        ]
    });
});
