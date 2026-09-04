// ============================================================
// CROWN QUEST - ACT I: MORVANE'S HOUSE ON SERPENT'S CRAG
// Rooms: scullery, study, spell_room, crag_path
// ============================================================

CrownQuest.defineRooms((engine) => {
    // ---------- Shared shell for the three interior rooms ----------
    // All three sit inside the same building, so they share a vanishing point
    // and a stone vocabulary. Only the dressing changes.
    const F = perspectiveFrame(640, 150, 490, 52, 258, 300);

    const HOUSE_TONE = {
        void: '#0a0806',
        ceiling: '#1b1409',
        back: '#5b5040',
        backShade: '#463d30',
        leftWall: '#4c4334',
        rightWall: '#3b3428',
        floor: '#332c22',
        floorBands: [['#433a2c', 258, 26], ['#3c3427', 284, 32], ['#332c22', 316, 38], ['#2a251d', 354, 46]]
    };

    /** Ceiling beams racing back toward the vanishing point. Shared by every
     *  room in the house so the roof structure stays continuous. */
    function ceilingBeams(ctx, w) {
        [[60, 205], [220, 275], [420, 345], [580, 415]].forEach(([nx, fx]) => {
            ctx.fillStyle = '#0d0a06';
            ctx.beginPath();
            ctx.moveTo(nx - 11, 0); ctx.lineTo(nx + 11, 0);
            ctx.lineTo(fx + 4, F.BW_T); ctx.lineTo(fx - 4, F.BW_T);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.beginPath();
            ctx.moveTo(nx - 9, 0); ctx.lineTo(nx + 9, 0);
            ctx.lineTo(fx + 3, F.BW_T); ctx.lineTo(fx - 3, F.BW_T);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.beginPath();
            ctx.moveTo(nx - 9, 0); ctx.lineTo(nx - 4, 0);
            ctx.lineTo(fx - 1.5, F.BW_T); ctx.lineTo(fx - 3, F.BW_T);
            ctx.closePath(); ctx.fill();
        });
        void w;
    }

    /** Stone dressing on both side walls, drawn through the perspective frame
     *  so courses converge instead of running flat. */
    function houseWalls(ctx, w) {
        drawPerspectiveSurface(ctx, 150, 120, {
            tl: { x: 0, y: 0 }, tr: { x: F.BW_L, y: F.BW_T },
            bl: { x: 0, y: F.EDGE }, br: { x: F.BW_L, y: F.BW_B }
        }, (s) => stoneWall(s, 0, 0, 150, 120, 1201, '#7a6b52', '#5e5240', '#43392c', '#312a20'));
        drawPerspectiveSurface(ctx, 150, 120, {
            tl: { x: w, y: 0 }, tr: { x: F.BW_R, y: F.BW_T },
            bl: { x: w, y: F.EDGE }, br: { x: F.BW_R, y: F.BW_B }
        }, (s) => stoneWall(s, 0, 0, 150, 120, 3307, '#63563f', '#4a4132', '#352e23', '#272119'));
        stoneWall(ctx, F.BW_L, F.BW_T, F.BW_R - F.BW_L, F.BW_B - F.BW_T, 5501,
            '#7f7057', '#5f5341', '#443a2d', '#322b21');
    }

    /** Worn flagstones. Courses widen toward the viewer, which is what makes
     *  the floor recede without drawing a single grid line. */
    function flagstones(ctx, w, h) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, F.EDGE); ctx.lineTo(F.BW_L, F.BW_B); ctx.lineTo(F.BW_R, F.BW_B);
        ctx.lineTo(w, F.EDGE); ctx.lineTo(w, h); ctx.lineTo(0, h);
        ctx.closePath();
        ctx.clip();
        const next = seededRandom(8080);
        let y = F.BW_B;
        let row = 0;
        let depth = 7;
        while (y < h + 20) {
            const stoneW = depth * 4.4;
            let x = -stoneW * (row % 2 ? 0.5 : 0);
            while (x < w + stoneW) {
                const tone = next();
                ctx.fillStyle = tone > 0.7 ? '#403a2f' : (tone > 0.32 ? '#37322a' : '#2d2922');
                ctx.fillRect(x + 1, y + 1, stoneW - 2, depth - 2);
                ctx.fillStyle = '#4a4438';
                ctx.fillRect(x + 1, y + 1, stoneW - 2, 1);
                ctx.fillStyle = '#1d1a15';
                ctx.fillRect(x + 1, y + depth - 2, stoneW - 2, 1);
                x += stoneW;
            }
            y += depth;
            depth *= 1.24;
            row++;
        }
        ctx.restore();
    }

    // ================= ROOM 1: THE SCULLERY =================
    engine.registerRoom({
        id: 'scullery',
        name: 'The Scullery',
        description: 'Morvane\'s scullery. Cold stone, a banked fire, and eleven years of your life spent scrubbing it.',
        smell: 'Wet ash, onion skins, and lye. It smells like every morning you can remember.',
        hint: (e) => {
            if (!e.hasItem('bread')) return 'The larder shelf holds the last of the black bread. Take it — a hard crust has uses.';
            if (!e.hasItem('sea_salt')) return 'There is a crock of coarse sea salt on the larder shelf. Take a pinch.';
            if (!e.hasItem('pail')) return 'Your pail is stood on the hearthstone, to the left of the fire. You will want it.';
            return 'Morvane is out. The stair behind you goes up to his study, and you have never once been allowed in it.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('hearth');
            e.setDepthScaling(266, 372, 0.72, 1.12);
            // The great table and the hearth are solid.
            e.addBarrier(56, 292, 168, 40);
            e.addBarrier(432, 276, 150, 46);
            e.setEdgeTransition('right', (eng) => eng.goToRoom('study', 96, 330));

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
        },
        draw: (ctx, w, h, eng) => {
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

            // ---- Larder shelves on the left wall, in perspective ----
            // One source of truth for the shelf heights: the planks and
            // everything standing on them are both derived from SHELF_F.
            const SHELF_F = [0.28, 0.44];
            const shelfTop = (x, tier) => F.lBand(x, SHELF_F[tier]);
            const shelfTone = (fill) => { ctx.fillStyle = fill; ctx.fill(); };
            SHELF_F.forEach((f, i) => {
                F.trap(ctx, 22, 138, f, f + 0.055, F.lBand);
                shelfTone(i ? PAL.WOOD_SHADOW : PAL.WOOD_BASE);
                F.trap(ctx, 22, 138, f, f + 0.018, F.lBand);
                shelfTone(PAL.WOOD_LIT);
            });
            // Crocks, a hanging onion rope and the bread.
            // The shelf top face slopes toward the vanishing point, so an object
            // must be measured at its OWN centre x and have its base placed on
            // that y. Measuring at some other x is how things end up hovering.
            /** Ellipse of contact shadow, tilted to follow the shelf's slope. */
            const shelfShadow = (cx, tier, rx) => {
                const y = shelfTop(cx, tier);
                const slope = Math.atan2(shelfTop(cx + 20, tier) - shelfTop(cx - 20, tier), 40);
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
                shelfShadow(cx, 0, 13);
                ctx.fillStyle = '#0f0c08';
                ctx.fillRect(cx - 11, base - 21, 22, 21);
                ctx.fillStyle = '#6a5a48';
                ctx.fillRect(cx - 9, base - 19, 18, 19);
                ctx.fillStyle = '#8a7a64';
                ctx.fillRect(cx - 9, base - 19, 6, 19);
                ctx.fillStyle = '#c9bfa4';
                ctx.fillRect(cx - 11, base - 24, 22, 4);
                if (!eng.hasItem('sea_salt')) {
                    ctx.fillStyle = '#e8e0cc';
                    ctx.fillRect(cx - 5, base - 27, 10, 4);
                }
            }
            // Fat jar, upper shelf
            {
                const cx = 91, base = shelfTop(cx, 0);
                shelfShadow(cx, 0, 15);
                ctx.fillStyle = '#0f0c08';
                ctx.fillRect(cx - 13, base - 18, 26, 18);
                ctx.fillStyle = '#4a4438';
                ctx.fillRect(cx - 11, base - 16, 22, 16);
                ctx.fillStyle = '#655d4c';
                ctx.fillRect(cx - 11, base - 16, 7, 16);
            }
            // The black bread, lower shelf
            if (!eng.hasItem('bread')) {
                const cx = 112, base = shelfTop(cx, 1);
                shelfShadow(cx, 1, 15);
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
            // Onion rope hanging from a ceiling hook
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
            [0.3, 0.46].forEach((f) => {
                F.trap(ctx, 502, 620, f, f + 0.05, F.rBand);
                ctx.fillStyle = PAL.WOOD_SHADOW; ctx.fill();
                F.trap(ctx, 502, 620, f, f + 0.016, F.rBand);
                ctx.fillStyle = PAL.WOOD_LIT; ctx.fill();
            });
            [[540, 0.3], [578, 0.3]].forEach(([px, f], i) => {
                const py = F.rBand(px, f) - 4;
                ctx.fillStyle = '#191512';
                ctx.beginPath();
                ctx.ellipse(px, py - 12, 13 - i * 2, 12 - i * 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8a5a28';
                ctx.beginPath();
                ctx.ellipse(px, py - 13, 11 - i * 2, 10 - i * 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#c98a3c';
                ctx.beginPath();
                ctx.ellipse(px - 3, py - 16, 5 - i, 3.4 - i * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            // The pail, stood on the hearthstone where he left it. Drawn from the
            // shared inventory art so it is unmistakably the same object, and on
            // the floor rather than far up a side wall where it read as a smudge.
            if (!eng.hasItem('pail')) {
                eng.drawContactShadow(ctx, 250, 300, 1, { rx: 26, ry: 6, alpha: 0.34 });
                ctx.save();
                ctx.translate(250, 282);
                ctx.scale(1.55, 1.55);
                ITEM_ART.pail(ctx, 0, 0, eng.animTimer);
                ctx.restore();
            }

            // ---- The great scrubbing table, near left ----
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
            // Jambs, so the opening is cut into a wall rather than painted on it
            ctx.fillStyle = '#1a150e';
            ctx.fillRect(398, 132, 6, 126);
            ctx.fillRect(484, 132, 6, 126);
            ctx.fillStyle = '#6b5c45';
            ctx.fillRect(398, 132, 2, 126);

            // ---- Light from the high window, and its motes ----
            lightShaft(ctx, 210, 40, 30, 268, 330, 84, 0.13);
            dustMotes(ctx, 190, 40, 120, 290, eng.animTimer, 991);
            eng.vignette(ctx, 0.44, '10,7,4');
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
                    e.addScore(3);
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
                    e.addScore(2);
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
                    e.addScore(2);
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
                name: 'the stair up', x: 398, y: 132, w: 92, h: 126, isExit: true, walkToX: 430,
                description: 'Worn steps curving up into the dark, toward the study. You have been forbidden that stair since you could walk.',
                onExit: (e) => e.goToRoom('study', 96, 330)
            }
        ]
    });

    // ================= ROOM 2: MORVANE'S STUDY =================
    engine.registerRoom({
        id: 'study',
        name: 'Morvane\'s Study',
        description: 'The sorcerer\'s study. A desk, an hourglass, a raven, and a great deal of silence.',
        smell: 'Old vellum, cold candle wax, and something underneath that you would rather not name.',
        hint: (e) => {
            if (!e.getFlag('found_key')) return 'The hourglass on the desk sits oddly high on one side. Look under it.';
            if (!e.getFlag('stair_revealed')) return 'That tapestry is the only thing in this house Morvane never lets you clean. Look behind it.';
            if (!e.hasItem('raven_feather')) return 'Corvus moults. There is a feather on the perch, and he will let you have it if you ask.';
            return 'The stair behind the tapestry goes down. The front door goes out. Neither is going to make Morvane happier.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('tower');
            e.setDepthScaling(266, 372, 0.72, 1.12);
            e.addBarrier(238, 268, 172, 46);
            e.addBarrier(38, 250, 92, 60);
            e.setEdgeTransition('left', (eng) => eng.goToRoom('scullery', 470, 330));
            e.setEdgeTransition('right', (eng) => eng.goToRoom('crag_path', 90, 322));

            // Corvus perches at the ego's depth so Rowan can pass behind him.
            e.addForegroundLayer(300, (ctx, eng) => {
                ctx.fillStyle = '#0d0a06';
                ctx.fillRect(96, 214, 12, 96);
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(98, 216, 8, 94);
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.fillRect(98, 216, 3, 94);
                ctx.fillStyle = '#0d0a06';
                ctx.fillRect(74, 210, 56, 9);
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.fillRect(76, 212, 52, 5);
                if (!eng.hasItem('raven_feather')) {
                    ctx.save();
                    ctx.translate(126, 216);
                    ctx.rotate(0.9);
                    ctx.fillStyle = '#101020';
                    ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, 8, 1, 18);
                    ctx.quadraticCurveTo(-4, 8, 0, 0);
                    ctx.closePath(); ctx.fill();
                    ctx.restore();
                }
                drawRaven(ctx, 102, 210, 1.5, false, eng.animTimer);
            });
        },
        draw: (ctx, w, h, eng) => {
            ctx.drawImage(eng.staticLayer('study|shell', (ctx, w, h) => {
                interiorShell(ctx, w, h, F, Object.assign({}, HOUSE_TONE, {
                    ceiling: '#120e14', leftWall: '#3a3340', rightWall: '#2f2936',
                    back: '#463e50', backShade: '#352e3d', floor: '#2a2530',
                    floorBands: [['#38323f', 258, 26], ['#312b3a', 284, 32], ['#2a2532', 316, 38], ['#231f2a', 354, 46]]
                }));
            }), 0, 0);
            drawPerspectiveSurface(ctx, 150, 120, {
                tl: { x: 0, y: 0 }, tr: { x: F.BW_L, y: F.BW_T },
                bl: { x: 0, y: F.EDGE }, br: { x: F.BW_L, y: F.BW_B }
            }, (s) => stoneWall(s, 0, 0, 150, 120, 1201, '#585067', '#463e50', '#332d3c', '#252030'));
            drawPerspectiveSurface(ctx, 150, 120, {
                tl: { x: w, y: 0 }, tr: { x: F.BW_R, y: F.BW_T },
                bl: { x: w, y: F.EDGE }, br: { x: F.BW_R, y: F.BW_B }
            }, (s) => stoneWall(s, 0, 0, 150, 120, 3307, '#4b4359', '#3a3345', '#2a2532', '#1f1b28'));
            stoneWall(ctx, F.BW_L, F.BW_T, F.BW_R - F.BW_L, F.BW_B - F.BW_T, 5501,
                '#5c5470', '#4a4258', '#342e40', '#262130');
            flagstones(ctx, w, h);
            ceilingBeams(ctx, w);

            // ---- Bookcase filling the back wall ----
            ctx.fillStyle = '#120c08';
            ctx.fillRect(300, 64, 186, 194);
            woodPlanks(ctx, 304, 68, 178, 186, true, 611);
            for (let shelf = 0; shelf < 5; shelf++) {
                const sy = 96 + shelf * 34;
                ctx.fillStyle = '#0d0a06';
                ctx.fillRect(306, sy, 174, 6);
                ctx.fillStyle = PAL.WOOD_LIT;
                ctx.fillRect(306, sy, 174, 1.6);
                // Books: three tones, leaning, uneven heights
                const next = seededRandom(400 + shelf * 97);
                let bx = 310;
                while (bx < 474) {
                    const bw2 = 5 + Math.floor(next() * 7);
                    const bh2 = 18 + Math.floor(next() * 10);
                    const tone = next();
                    ctx.fillStyle = tone > 0.72 ? '#6a3a2c' : (tone > 0.46 ? '#33455e' : (tone > 0.22 ? '#3c5540' : '#5a4a2c'));
                    ctx.fillRect(bx, sy - bh2, bw2, bh2);
                    ctx.fillStyle = 'rgba(0,0,0,0.45)';
                    ctx.fillRect(bx + bw2 - 1, sy - bh2, 1, bh2);
                    ctx.fillStyle = PAL.GOLD_SHADOW;
                    if (next() > 0.6) ctx.fillRect(bx + 1, sy - bh2 + 5, bw2 - 2, 1);
                    bx += bw2 + 1;
                }
            }

            // ---- The tapestry on the left wall ----
            const tf1 = 0.1, tf2 = 0.74;
            F.trap(ctx, 20, 132, tf1 - 0.03, tf2 + 0.02, F.lBand);
            ctx.fillStyle = '#100a14'; ctx.fill();
            if (eng.getFlag('stair_revealed')) {
                // Hauled aside: the doorway behind it, and the tapestry bunched.
                F.trap(ctx, 20, 92, tf1, tf2, F.lBand);
                ctx.fillStyle = '#07060a'; ctx.fill();
                F.trap(ctx, 28, 86, tf1 + 0.06, tf2 - 0.04, F.lBand);
                ctx.fillStyle = '#120d18'; ctx.fill();
                for (let i = 0; i < 4; i++) {
                    F.trap(ctx, 30 + i * 14, 40 + i * 14, tf1 + 0.08 + i * 0.02, tf2 - 0.06, F.lBand);
                    ctx.fillStyle = i % 2 ? '#241426' : '#170e1a'; ctx.fill();
                }
                F.trap(ctx, 92, 132, tf1, tf2, F.lBand);
                ctx.fillStyle = '#4a2038'; ctx.fill();
                F.trap(ctx, 92, 108, tf1, tf2, F.lBand);
                ctx.fillStyle = '#63304c'; ctx.fill();
            } else {
                F.trap(ctx, 20, 132, tf1, tf2, F.lBand);
                ctx.fillStyle = '#4a2038'; ctx.fill();
                // Woven scene: a stag, a tower, a moon — all in three tones.
                drawPerspectiveSurface(ctx, 120, 110, {
                    tl: { x: 20, y: F.lBand(20, tf1) }, tr: { x: 132, y: F.lBand(132, tf1) },
                    bl: { x: 20, y: F.lBand(20, tf2) }, br: { x: 132, y: F.lBand(132, tf2) }
                }, (s) => {
                    s.fillStyle = '#4a2038'; s.fillRect(0, 0, 120, 110);
                    s.fillStyle = '#33162a'; s.fillRect(0, 0, 120, 110);
                    s.fillStyle = '#5c2a44';
                    for (let yy = 0; yy < 110; yy += 3) s.fillRect(0, yy, 120, 1);
                    s.fillStyle = '#2a4a3a';
                    s.fillRect(6, 78, 108, 26);
                    s.fillStyle = '#3d6a4e';
                    for (let xx = 8; xx < 112; xx += 6) s.fillRect(xx, 76, 2, 6);
                    s.fillStyle = '#d8c48a';
                    s.beginPath(); s.arc(92, 22, 9, 0, Math.PI * 2); s.fill();
                    s.fillStyle = '#8a7a52';
                    s.fillRect(20, 30, 16, 52);
                    s.beginPath(); s.moveTo(18, 30); s.lineTo(38, 30); s.lineTo(28, 12); s.closePath(); s.fill();
                    s.fillStyle = '#c9b078';
                    s.fillRect(56, 56, 6, 22);
                    s.fillRect(50, 50, 20, 8);
                    s.beginPath(); s.moveTo(52, 50); s.lineTo(48, 38); s.lineTo(54, 48); s.closePath(); s.fill();
                    s.beginPath(); s.moveTo(66, 50); s.lineTo(72, 38); s.lineTo(68, 48); s.closePath(); s.fill();
                    s.fillStyle = '#7a5a34';
                    s.fillRect(0, 0, 120, 4); s.fillRect(0, 106, 120, 4);
                });
            }

            // ---- The desk, near right, with the hourglass ----
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(232, 262, 184, 14);
            woodPlanks(ctx, 236, 264, 176, 11, false, 909);
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(246, 274, 16, 48);
            ctx.fillRect(388, 274, 16, 48);
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.fillRect(248, 276, 12, 46);
            ctx.fillRect(390, 276, 12, 46);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(248, 276, 4, 46);
            ctx.fillRect(390, 276, 4, 46);
            // Open ledger, quill and inkpot
            ctx.fillStyle = '#0f0d08';
            ctx.fillRect(258, 250, 62, 14);
            ctx.fillStyle = '#cfc3a2';
            ctx.fillRect(259, 251, 29, 12);
            ctx.fillStyle = '#b8ac8a';
            ctx.fillRect(290, 251, 29, 12);
            ctx.fillStyle = '#4a3a28';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(262, 253 + i * 2, 22, 1);
                ctx.fillRect(293, 253 + i * 2, 22, 1);
            }
            ctx.fillStyle = '#1a1418';
            ctx.fillRect(330, 252, 12, 12);
            ctx.fillStyle = '#3a2f38';
            ctx.fillRect(331, 253, 10, 4);
            ctx.save();
            ctx.translate(344, 252);
            ctx.rotate(-0.7);
            ctx.fillStyle = '#e8e2d0';
            ctx.fillRect(-1, -22, 2.4, 24);
            ctx.fillStyle = '#c4bda6';
            ctx.beginPath();
            ctx.moveTo(0, -22); ctx.quadraticCurveTo(6, -12, 1, -2);
            ctx.quadraticCurveTo(-4, -12, 0, -22);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            // Hourglass: brass frame, two glass bulbs, one thin falling stream
            const hx = 372, hy = 262;
            ctx.fillStyle = '#3a2a08';
            ctx.fillRect(hx - 13, hy - 3, 26, 4);
            ctx.fillRect(hx - 13, hy - 42, 26, 4);
            ctx.fillStyle = PAL.GOLD_BASE;
            ctx.fillRect(hx - 12, hy - 2, 24, 2.4);
            ctx.fillRect(hx - 12, hy - 41, 24, 2.4);
            ctx.fillStyle = PAL.GOLD_SHADOW;
            ctx.fillRect(hx - 11, hy - 39, 3, 37);
            ctx.fillRect(hx + 8, hy - 39, 3, 37);
            ctx.fillStyle = 'rgba(190,210,225,0.42)';
            ctx.beginPath();
            ctx.moveTo(hx - 8, hy - 38); ctx.lineTo(hx + 8, hy - 38);
            ctx.lineTo(hx + 1, hy - 21); ctx.lineTo(hx - 1, hy - 21);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(hx - 8, hy - 3); ctx.lineTo(hx + 8, hy - 3);
            ctx.lineTo(hx + 1, hy - 20); ctx.lineTo(hx - 1, hy - 20);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#c9a45a';
            ctx.beginPath();
            ctx.moveTo(hx - 6, hy - 4); ctx.lineTo(hx + 6, hy - 4);
            ctx.lineTo(hx + 1, hy - 15); ctx.lineTo(hx - 1, hy - 15);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e0c079';
            ctx.fillRect(hx - 0.6, hy - 21, 1.2, 17);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(hx - 6, hy - 35, 1.6, 8);
            if (eng.getFlag('found_key')) {
                ctx.fillStyle = '#2a2020';
                ctx.fillRect(hx - 12, hy + 1, 24, 2);
            }

            // ---- Candle on the desk, and the front door on the right wall ----
            ctx.fillStyle = '#3a352c';
            ctx.fillRect(276, 236, 10, 4);
            ctx.fillStyle = '#e8e0c8';
            ctx.fillRect(278, 216, 6, 22);
            ctx.fillStyle = '#c4bca4';
            ctx.fillRect(282, 216, 2, 22);
            flame(ctx, 281, 216, 0.42, eng.animTimer);
            eng.lightPool(ctx, 281, 212, 108, '255,200,120', 0.14);

            const df1 = 0.06, df2 = 0.86;
            F.trap(ctx, 512, 606, df1 - 0.04, df2 + 0.03, F.rBand);
            ctx.fillStyle = '#08070a'; ctx.fill();
            F.trap(ctx, 518, 600, df1, df2, F.rBand);
            ctx.fillStyle = PAL.WOOD_SHADOW; ctx.fill();
            F.trap(ctx, 518, 600, df1, df1 + 0.09, F.rBand);
            ctx.fillStyle = PAL.WOOD_BASE; ctx.fill();
            F.trap(ctx, 518, 600, df2 - 0.09, df2, F.rBand);
            ctx.fillStyle = PAL.WOOD_BASE; ctx.fill();
            ctx.fillStyle = '#2b2620';
            [0.24, 0.62].forEach((f) => {
                F.trap(ctx, 518, 600, f, f + 0.05, F.rBand);
                ctx.fill();
            });
            ctx.fillStyle = PAL.GOLD_SHADOW;
            ctx.beginPath();
            ctx.arc(556, F.rBand(556, 0.5), 6, 0, Math.PI * 2);
            ctx.fill();
            // Daylight leaking round the door: the only warm colour on this side
            ctx.fillStyle = 'rgba(255,236,190,0.30)';
            F.trap(ctx, 596, 604, df1, df2, F.rBand);
            ctx.fill();

            eng.vignette(ctx, 0.58, '8,5,14');
        },
        hotspots: [
            {
                name: 'the bookcase', x: 300, y: 64, w: 186, h: 194,
                description: 'Shelf upon shelf of Morvane\'s books. You cannot read a word of any of them, which he has always found extremely funny.',
                get: (e) => e.showMessage('You touch one spine. It is unpleasantly warm, and you decide against the rest.'),
                use: (e) => e.showMessage('You tug at a few volumes. They are all quite firmly not for you.')
            },
            {
                name: 'the desk', x: 232, y: 250, w: 184, h: 72,
                description: 'A heavy oak desk, its top scored with burn marks in patterns you have never dared study closely.',
                use: (e) => e.showMessage('You run a hand over the scorched oak. The marks are not random. That is the worst part.')
            },
            {
                name: 'the ledger', x: 256, y: 246, w: 66, h: 20,
                description: 'An open ledger in a cramped hand. One line, near the bottom, is a list of years — and the last of them is this one.',
                get: (e) => e.showMessage('You are not taking anything of his that he would notice by nightfall.')
            },
            {
                name: 'the hourglass', x: 356, y: 218, w: 34, h: 48, walkToX: 348,
                description: 'A brass hourglass. It sits crooked, as though something small were wedged beneath one foot.',
                look: (e) => {
                    if (e.getFlag('found_key')) {
                        e.showMessage('The hourglass sits level now that you have taken what was under it.');
                        return;
                    }
                    e.setFlag('found_key');
                    e.addToInventory('brass_key');
                    e.addScore(5);
                    e.sound.pickup();
                    e.showMessage('You tilt the hourglass. Beneath one brass foot, worn smooth by years of being sat on, lies a small brass key. Morvane hid it in the one place in this house nobody is allowed to dust.');
                },
                use: (e) => e.showMessage('You turn the hourglass over. The sand starts again, exactly as unhurried as before.')
            },
            {
                name: 'the candle', x: 272, y: 210, w: 20, h: 32,
                description: 'A tallow candle burning steadily, though nobody has been up here since dawn.',
                get: (e) => e.showMessage('The flame leans toward your fingers with more interest than a flame should show. You leave it.')
            },
            // The tapestry and the stair behind it cover the same stretch of
            // left wall as the perch. Hotspots are checked last-to-first, so
            // Corvus and his feather are listed after them or the hanging
            // swallows every click aimed at the bird standing in front of it.
            {
                name: 'the tapestry', x: 22, y: 76, w: 116, h: 176, walkToX: 168,
                description: 'A great faded hanging of a stag before a tower. It is the only thing in this house you have never been told to clean.',
                look: (e) => {
                    if (e.getFlag('stair_revealed')) {
                        e.showMessage('The tapestry hangs bunched against the wall. Behind it, the stair goes down into the rock.');
                        return;
                    }
                    e.setFlag('stair_revealed');
                    e.addScore(5);
                    e.sound.metalScrape();
                    e.showMessage('You take hold of the tapestry and haul it aside. Behind it the stone is not stone at all, but a low doorway, and a stair going down into the crag. Eleven years. It has been eleven years, and it was behind the one thing he never let you touch.');
                },
                use: (e) => e.showMessage('You give the hanging a tug. Dust comes off it in a grey breath.')
            },
            {
                name: 'the hidden stair', x: 24, y: 96, w: 76, h: 156, isExit: true, walkToX: 150,
                description: 'A narrow stair cut into the rock, going down. Cold air comes up it.',
                onExit: (e) => e.goToRoom('spell_room', 320, 344),
                get hidden() { return !engine.getFlag('stair_revealed'); }
            },
            {
                name: 'Corvus', x: 74, y: 176, w: 60, h: 56, walkToX: 160,
                description: 'A raven the size of a cat, on a perch he has never once been tied to. He has watched you scrub floors for eleven years without offering to help.',
                talk: (e) => e.startDialog('corvus'),
                get: (e) => e.showMessage('Corvus regards your outstretched hands, then your face, then your hands again. You withdraw them.')
            },
            {
                name: 'the feather', x: 118, y: 200, w: 24, h: 26, walkToX: 168,
                description: 'A long black feather lying on the perch where Corvus dropped it.',
                get: (e) => {
                    e.sound.pickup();
                    e.addToInventory('raven_feather');
                    e.addScore(3);
                    e.showMessage('You take the feather. Corvus watches you do it and says, distinctly, "Mm." You have never been so unnerved by a bird.');
                },
                get hidden() { return engine.hasItem('raven_feather'); }
            },
            {
                name: 'the front door', x: 512, y: 60, w: 96, h: 200, isExit: true, walkToX: 540,
                description: 'The front door, banded in iron. Daylight shows in a bright seam all round it.',
                onExit: (e) => e.goToRoom('crag_path', 90, 322)
            },
            {
                name: 'the stair down', x: 0, y: 260, w: 40, h: 110, isExit: true, walkToX: 60,
                description: 'The way back down to the scullery, and to everything you have ever been allowed to do.',
                onExit: (e) => e.goToRoom('scullery', 470, 330)
            }
        ]
    });

    /** Reading the one legible page. Reached from the lectern's `use` handler
     *  and from dropping the book on it, so both routes tell the same story. */
    function readTheSpell(e) {
        if (!e.hasItem('spellbook')) { e.showMessage('You have nothing to put on it.'); return; }
        if (e.getFlag('read_spell')) { e.showMessage('You have read the one page it will show you. Twice, now.'); return; }
        e.setFlag('read_spell');
        e.showTextWindow('You lay the book on the lectern. Most of it will not let your eyes rest on it at all. One page will: STORM IN A THIMBLE. Take a feather of a black bird and a pinch of salt from the sea. Lay them in a circle of chalk and say over them the word that follows. Keep the storm close, and spend it once.', { maxWidth: 420 });
    }

    // ================= ROOM 3: THE SPELL ROOM =================
    engine.registerRoom({
        id: 'spell_room',
        name: 'The Hidden Room',
        description: 'A low chamber cut into the crag, lit by nothing you can identify. A chalk circle is drawn on the floor.',
        smell: 'Cold stone, iron filings, and a sharp green smell like a storm that has not happened yet.',
        hint: (e) => {
            if (!e.hasItem('spellbook')) return 'The iron chest is locked, and you found a brass key under the hourglass upstairs.';
            if (!e.getFlag('read_spell')) return 'Read the spellbook. It only has one page it will let you see.';
            if (!e.hasItem('thimble')) return 'The spell wants a feather of a black bird and a pinch of sea salt, laid in the chalk circle. Then say the words.';
            return 'You have what you came for. Morvane will be back, and you should not be here when he is.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('tower');
            e.setDepthScaling(288, 372, 0.8, 1.08);
            e.addBarrier(58, 286, 128, 42);
            e.addBarrier(462, 276, 130, 48);
        },
        draw: (ctx, w, h, eng) => {
            const G = perspectiveFrame(640, 160, 480, 90, 250, 292);
            ctx.drawImage(eng.staticLayer('spell_room|shell', (ctx, w, h) => {
                interiorShell(ctx, w, h, G, {
                    void: '#050409',
                    ceiling: '#0c0a12',
                    back: '#2b2636', backShade: '#1f1b2a',
                    leftWall: '#252031', rightWall: '#1d1928',
                    floor: '#211d2b',
                    floorBands: [['#2a2536', 250, 26], ['#252031', 276, 32], ['#201c2a', 308, 38], ['#1a1723', 346, 50]]
                });
            }), 0, 0);
            drawPerspectiveSurface(ctx, 150, 110, {
                tl: { x: 0, y: 0 }, tr: { x: G.BW_L, y: G.BW_T },
                bl: { x: 0, y: G.EDGE }, br: { x: G.BW_L, y: G.BW_B }
            }, (s) => rockFace(s, 0, 0, 150, 110, 2211, '#3b3448', '#2a2536', '#1a1723'));
            drawPerspectiveSurface(ctx, 150, 110, {
                tl: { x: w, y: 0 }, tr: { x: G.BW_R, y: G.BW_T },
                bl: { x: w, y: G.EDGE }, br: { x: G.BW_R, y: G.BW_B }
            }, (s) => rockFace(s, 0, 0, 150, 110, 6611, '#332d40', '#242030', '#16131e'));
            rockFace(ctx, G.BW_L, G.BW_T, G.BW_R - G.BW_L, G.BW_B - G.BW_T, 4411, '#3d3650', '#2c2739', '#1c1826');

            // ---- Reagent shelves, both walls ----
            [[G.lBand, 24, 148, 1], [G.rBand, 494, 618, -1]].forEach(([band, x1, x2, dir]) => {
                [0.22, 0.42].forEach((f) => {
                    G.trap(ctx, x1, x2, f, f + 0.05, band);
                    ctx.fillStyle = '#1d1710'; ctx.fill();
                    G.trap(ctx, x1, x2, f, f + 0.015, band);
                    ctx.fillStyle = '#3f3222'; ctx.fill();
                });
                const next = seededRandom(dir > 0 ? 771 : 991);
                for (let i = 0; i < 7; i++) {
                    const jx = x1 + 12 + i * ((x2 - x1 - 24) / 7);
                    const shelfF = i % 2 ? 0.42 : 0.22;
                    const jy = band(jx, shelfF);
                    const jh = 12 + next() * 9;
                    const tone = next();
                    ctx.fillStyle = '#0c0a10';
                    ctx.fillRect(jx - 6, jy - jh - 1, 12, jh + 2);
                    ctx.fillStyle = tone > 0.66 ? '#3f6a4a' : (tone > 0.33 ? '#5a3f6a' : '#6a5a3a');
                    ctx.fillRect(jx - 5, jy - jh, 10, jh);
                    ctx.fillStyle = 'rgba(255,255,255,0.22)';
                    ctx.fillRect(jx - 5, jy - jh, 3, jh);
                    ctx.fillStyle = '#241c14';
                    ctx.fillRect(jx - 4, jy - jh - 3, 8, 3);
                }
            });

            // ---- Back-wall alcove holding a skull and a stoppered jar ----
            ctx.fillStyle = '#0a0810';
            ctx.beginPath();
            ctx.moveTo(276, 250); ctx.lineTo(276, 168);
            ctx.quadraticCurveTo(320, 138, 364, 168);
            ctx.lineTo(364, 250);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#171320';
            ctx.beginPath();
            ctx.moveTo(282, 250); ctx.lineTo(282, 172);
            ctx.quadraticCurveTo(320, 146, 358, 172);
            ctx.lineTo(358, 250);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#1d1710';
            ctx.fillRect(280, 210, 80, 5);
            ctx.fillStyle = '#cfc6ae';
            ctx.beginPath(); ctx.ellipse(304, 200, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e8e0c8';
            ctx.beginPath(); ctx.ellipse(301, 196, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a1614';
            ctx.fillRect(299, 199, 4, 4);
            ctx.fillRect(306, 199, 4, 4);
            ctx.fillStyle = '#cfc6ae';
            ctx.fillRect(299, 206, 12, 5);
            ctx.fillStyle = '#1a1614';
            ctx.fillRect(302, 206, 1.4, 5);
            ctx.fillRect(306, 206, 1.4, 5);
            ctx.fillStyle = '#0c0a10';
            ctx.fillRect(330, 182, 20, 28);
            ctx.fillStyle = '#3f6a4a';
            ctx.fillRect(331, 184, 18, 25);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(331, 184, 5, 25);
            const bob = Math.sin(eng.animTimer / 700) * 2;
            ctx.fillStyle = '#9de8a0';
            ctx.beginPath(); ctx.ellipse(340, 196 + bob, 5, 4, 0, 0, Math.PI * 2); ctx.fill();

            // ---- The iron chest, near left ----
            const opened = eng.getFlag('chest_open');
            ctx.fillStyle = '#08070a';
            ctx.fillRect(52, 282, 138, 52);
            ctx.fillStyle = '#2e2a26';
            ctx.fillRect(56, 286, 130, 46);
            ctx.fillStyle = '#3f3a34';
            ctx.fillRect(56, 286, 130, 8);
            ctx.fillStyle = '#1a1714';
            ctx.fillRect(56, 322, 130, 10);
            ctx.fillStyle = '#4a453e';
            [70, 104, 138, 170].forEach((bx) => ctx.fillRect(bx, 286, 6, 46));
            ctx.fillStyle = '#6a6459';
            [70, 104, 138, 170].forEach((bx) => ctx.fillRect(bx, 286, 2, 46));
            if (opened) {
                // Lid hinged back against the wall, still attached at the rear,
                // with the dark interior of the chest showing under it.
                ctx.fillStyle = '#08070a';
                ctx.beginPath();
                ctx.moveTo(56, 286); ctx.lineTo(186, 286); ctx.lineTo(176, 250); ctx.lineTo(66, 250);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#3f3a34';
                ctx.beginPath();
                ctx.moveTo(60, 284); ctx.lineTo(182, 284); ctx.lineTo(173, 253); ctx.lineTo(69, 253);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#5c564c';
                ctx.beginPath();
                ctx.moveTo(60, 284); ctx.lineTo(182, 284); ctx.lineTo(180, 279); ctx.lineTo(62, 279);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#0a0810';
                ctx.beginPath();
                ctx.ellipse(121, 290, 62, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#241d16';
                ctx.beginPath();
                ctx.ellipse(121, 291, 57, 7, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#08070a';
                ctx.fillRect(52, 270, 138, 18);
                ctx.fillStyle = '#3f3a34';
                ctx.fillRect(56, 272, 130, 14);
                ctx.fillStyle = '#5c564c';
                ctx.fillRect(56, 272, 130, 4);
                ctx.fillStyle = '#1a1714';
                ctx.fillRect(110, 280, 22, 22);
                ctx.fillStyle = PAL.GOLD_SHADOW;
                ctx.fillRect(112, 282, 18, 18);
                ctx.fillStyle = '#0a0808';
                ctx.fillRect(119, 288, 4, 8);
            }
            if (!eng.hasItem('spellbook') && opened) {
                ctx.save();
                ctx.translate(120, 284);
                ctx.scale(0.62, 0.62);
                ctx.fillStyle = '#3a1f2a';
                ctx.fillRect(-17, -12, 34, 24);
                ctx.fillStyle = '#552d3c';
                ctx.fillRect(-17, -12, 11, 24);
                ctx.fillStyle = '#d8cdae';
                ctx.fillRect(12, -10, 5, 20);
                ctx.restore();
            }

            // ---- The chalk circle ----
            const hasFeather = eng.getFlag('circle_feather');
            const hasSalt = eng.getFlag('circle_salt');
            drawChalkCircle(ctx, 320, 344, 76, 30, hasFeather && hasSalt, eng.animTimer);
            if (hasFeather) {
                ctx.save();
                ctx.translate(300, 344);
                ctx.rotate(1.35);
                ctx.fillStyle = '#101020';
                ctx.beginPath();
                ctx.moveTo(0, -16); ctx.quadraticCurveTo(7, -2, 2, 14);
                ctx.quadraticCurveTo(-6, -2, 0, -16);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#33334a';
                ctx.beginPath();
                ctx.moveTo(0, -15); ctx.quadraticCurveTo(-4, -2, 1, 11);
                ctx.quadraticCurveTo(-1, -2, 0, -15);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            if (hasSalt) {
                ctx.fillStyle = '#e8e2cc';
                ctx.beginPath();
                ctx.ellipse(342, 348, 11, 4.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#b8b09a';
                ctx.beginPath();
                ctx.ellipse(345, 350, 6, 2.4, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- The lectern, near right ----
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(500, 268, 20, 62);
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.fillRect(502, 270, 16, 60);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(502, 270, 5, 60);
            ctx.fillStyle = '#0d0a06';
            ctx.beginPath();
            ctx.moveTo(468, 268); ctx.lineTo(552, 268); ctx.lineTo(556, 250); ctx.lineTo(464, 250);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.beginPath();
            ctx.moveTo(470, 266); ctx.lineTo(550, 266); ctx.lineTo(553, 252); ctx.lineTo(467, 252);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_LIT;
            ctx.beginPath();
            ctx.moveTo(470, 266); ctx.lineTo(492, 266); ctx.lineTo(490, 252); ctx.lineTo(467, 252);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(486, 326, 48, 8);

            // ---- The light with no source ----
            const pulse = 0.12 + Math.sin(eng.animTimer / 900) * 0.045;
            eng.lightPool(ctx, 320, 200, 260, '150,110,235', pulse);
            eng.lightPool(ctx, 320, 344, 160, '120,90,200', 0.10);
            for (let i = 0; i < 12; i++) {
                const a = eng.animTimer / 1600 + i * 0.52;
                const rr = 90 + Math.sin(eng.animTimer / 900 + i) * 26;
                ctx.fillStyle = `rgba(185,140,255,${0.20 + (i % 3) * 0.08})`;
                ctx.fillRect(320 + Math.cos(a) * rr, 190 + Math.sin(a * 1.3) * 42, 2, 2);
            }
            eng.vignette(ctx, 0.66, '6,4,12');
        },
        hotspots: [
            {
                name: 'the iron chest', x: 52, y: 246, w: 140, h: 90, walkToX: 200,
                description: 'A squat iron chest with a brass lock plate.',
                look: (e) => {
                    if (e.getFlag('chest_open')) {
                        e.showMessage(e.hasItem('spellbook')
                            ? 'The chest stands open and empty. It looks smaller now.'
                            : 'The chest stands open. A thin book lies inside it, bound in something that was once an animal.');
                    } else {
                        e.showMessage('A squat iron chest, banded and locked. The lock is small and brass, and you are holding a small brass key, and your hands have gone unsteady.');
                    }
                },
                use: (e) => {
                    if (e.getFlag('chest_open')) { e.showMessage('It is already open.'); return; }
                    e.showMessage(e.hasItem('brass_key')
                        ? 'It is locked. You will have to use the brass key on it.'
                        : 'Locked. The keyhole is small and brass and shaped for a key you do not have.');
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'brass_key') { e.showMessage('That is not going to open an iron chest.'); return; }
                    if (e.getFlag('chest_open')) { e.showMessage('The chest is already open.'); return; }
                    e.setFlag('chest_open');
                    e.sound.doorOpen();
                    e.showMessage('The key turns with a click you feel in your teeth. Inside, on a bed of black cloth, lies a thin book.');
                }
            },
            {
                name: 'the spellbook', x: 96, y: 264, w: 52, h: 34, walkToX: 200,
                description: 'A thin book bound in something that was once an animal.',
                get: (e) => {
                    e.sound.pickup();
                    e.addToInventory('spellbook');
                    e.addScore(10);
                    e.showMessage('You lift the book out. It is colder than the chest was, and it settles into your hands as though it had been waiting for smaller ones.');
                },
                get hidden() { return !engine.getFlag('chest_open') || engine.hasItem('spellbook'); }
            },
            {
                name: 'the lectern', x: 464, y: 246, w: 92, h: 88, walkToX: 440,
                description: 'A reading stand worn smooth at the edges. Whatever usually lies here has been taken away.',
                use: (e) => readTheSpell(e),
                useItem: (e, itemId) => {
                    if (itemId === 'spellbook') { readTheSpell(e); return; }
                    e.showMessage('The lectern is for books.');
                }
            },
            {
                name: 'the chalk circle', x: 240, y: 316, w: 160, h: 60, walkToX: 320,
                description: 'A circle of chalk on the flagstones, ringed with small hard marks.',
                look: (e) => {
                    const f = e.getFlag('circle_feather'), s = e.getFlag('circle_salt');
                    if (f && s) { e.showMessage('A feather and a scatter of salt lie inside the chalk, and the air over them has gone thick and unwilling. It wants a word.'); return; }
                    if (f) { e.showMessage('The raven feather lies inside the chalk. The circle wants salt as well.'); return; }
                    if (s) { e.showMessage('The salt lies inside the chalk. The circle wants a feather as well.'); return; }
                    e.showMessage('A circle of chalk, drawn freehand and perfectly round, ringed with small hard marks. The flagstones inside it are noticeably clean.');
                },
                useItem: (e, itemId) => {
                    if (!e.getFlag('read_spell')) {
                        e.showMessage('You have no idea what the circle is for. Not yet.');
                        return;
                    }
                    if (itemId === 'raven_feather') {
                        if (e.getFlag('circle_feather')) { e.showMessage('The feather is already there.'); return; }
                        e.removeFromInventory('raven_feather');
                        e.setFlag('circle_feather');
                        e.updateInventoryUI();
                        e.sound.blip();
                        e.showMessage('You lay the feather inside the chalk. It settles very slowly, as though the air had thickened under it.');
                        return;
                    }
                    if (itemId === 'sea_salt') {
                        if (e.getFlag('circle_salt')) { e.showMessage('The salt is already there.'); return; }
                        e.removeFromInventory('sea_salt');
                        e.setFlag('circle_salt');
                        e.updateInventoryUI();
                        e.sound.blip();
                        e.showMessage('You shake out the pinch of sea salt. Each grain lands and stays exactly where it fell.');
                        return;
                    }
                    e.showMessage('The circle wants a feather of a black bird and a pinch of salt from the sea. Not that.');
                },
                use: (e) => {
                    if (!e.getFlag('read_spell')) { e.showMessage('It is a circle drawn on a floor. You step around it.'); return; }
                    if (e.hasItem('thimble')) { e.showMessage('The circle is spent. So, mercifully, is your nerve.'); return; }
                    if (!e.getFlag('circle_feather') || !e.getFlag('circle_salt')) {
                        e.showMessage('The circle is not ready. It wants a feather of a black bird and a pinch of salt from the sea.');
                        return;
                    }
                    e.addScore(20);
                    e.runSequence([
                        'You say the word on the page. Your voice does not sound like your voice.',
                        (eng) => { eng.sound.castSpell(); eng.shake(6); },
                        600,
                        'The feather stands up on its point. The salt lifts. Something very small and very angry comes into the room and cannot find the door.',
                        (eng) => { eng.sound.magicChime(); },
                        400,
                        'It goes into the pewter thimble on the lectern with a sound like a slammed shutter, and the room is quiet, and your ears are ringing.',
                        (eng) => {
                            eng.addToInventory('thimble');
                            eng.updateInventoryUI();
                        },
                        'You are holding a storm. You are eleven years a scullery boy and you are holding a storm.'
                    ], { skippable: true });
                }
            },
            {
                name: 'the alcove', x: 276, y: 146, w: 88, h: 104,
                description: 'A niche in the rock holding a small yellow skull and a jar with something pale turning slowly inside it.',
                get: (e) => e.showMessage('You would rather not. You would very much rather not.')
            },
            {
                name: 'the shelves', x: 24, y: 112, w: 128, h: 84,
                description: 'Jars of powders and cuttings, each labelled in a hand you cannot read. One of them is moving.',
                get: (e) => e.showMessage('Whatever is in the third jar notices your hand approaching and presses against the glass. You reconsider.')
            },
            {
                name: 'the stair up', x: 552, y: 40, w: 88, h: 180, isExit: true, walkToX: 520,
                description: 'The stair back up to the study.',
                onExit: (e) => e.goToRoom('study', 120, 330)
            }
        ]
    });

    // ================= ROOM 4: THE CRAG PATH =================
    engine.registerRoom({
        id: 'crag_path',
        name: 'Serpent\'s Crag',
        description: 'The cliff path down to the cove. Grey sea on three sides and a sky the colour of a held breath.',
        smell: 'Salt, wet rock, and gorse. The first clean air of your life.',
        hint: (e) => {
            if (!e.getFlag('morvane_passed')) return 'Something is coming up the path. Get behind the boulder, and do it now.';
            if (!e.hasItem('thimble')) return 'The skiff is becalmed. You need a wind, and you know exactly where to find one.';
            return 'Use the Thimble of Storms on the skiff.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(250, 372, 0.62, 1.1);
            e.setWalkableArea((px, py) => py > 236 && py < 372 && px > 24 && px < 616);
            e.addBarrier(408, 250, 130, 60);
            // The approach restarts each time Rowan steps back out onto the path,
            // so returning from the house is never an instant death.
            e.setFlag('crag_timer', 0);
            e.setFlag('crag_nudged', false);
            if (!e.getFlag('morvane_passed') && !e.getFlag('morvane_warned')) {
                e.setFlag('morvane_warned');
                e.showMessage('The wind off the sea hits you like a door opening. Then, from somewhere below the shoulder of the path, you hear a stick strike stone. Once. Then again, closer.', { window: true });
            }
        },
        onUpdate: (e, dt) => {
            if (e.getFlag('morvane_passed') || e.dead || e.cutscene || e.sequence) return;
            const t = e.getCounter('crag_timer') + dt;
            e.setFlag('crag_timer', t);
            if (t > 3000 && !e.getFlag('crag_nudged')) {
                e.setFlag('crag_nudged');
                e.showMessage('The stick strikes stone again. It is very close now, and it is coming up.', { window: true });
            }
            if (t > 9000) {
                e.die('Morvane comes round the shoulder of the path and stops. For a long moment he simply looks at you standing in the open with his book under your arm. "Ah," he says. Nothing after that is worth writing down.');
            }
        },
        draw: (ctx, w, h, eng) => {
            // ---- Sky and sea ----
            skyBands(ctx, 0, 0, w, 150, ['#3a4f80', '#5f7fae', '#8fa9c8', '#b9c9d8']);
            for (let i = 0; i < 5; i++) {
                const cx = 60 + i * 148 + Math.sin(eng.animTimer / 9000 + i) * 20;
                const cy = 34 + (i % 3) * 22;
                ctx.fillStyle = 'rgba(230,236,244,0.5)';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 44, 11, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - 26, cy + 5, 26, 8, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + 30, cy + 4, 22, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(150,170,196,0.4)';
                ctx.beginPath();
                ctx.ellipse(cx + 4, cy + 8, 40, 5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Distant mainland: hazed almost to the sky colour
            distantRange(ctx, 150, w, 30, 4242, '#8296b4', 0.7);
            distantRange(ctx, 154, w, 20, 8181, '#748aa8', 0.6);
            drawCastle(ctx, 470, 152, 0.42, '#6b7e9c', '#8496b0');
            waterBand(ctx, 0, 154, w, 96, eng.animTimer, 3141);

            // ---- The crag itself ----
            ctx.fillStyle = '#191b18';
            ctx.beginPath();
            ctx.moveTo(0, 214);
            ctx.lineTo(120, 200);
            ctx.lineTo(250, 226);
            ctx.lineTo(392, 208);
            ctx.lineTo(520, 232);
            ctx.lineTo(640, 216);
            ctx.lineTo(640, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 218);
            ctx.lineTo(120, 204);
            ctx.lineTo(250, 230);
            ctx.lineTo(392, 212);
            ctx.lineTo(520, 236);
            ctx.lineTo(640, 220);
            ctx.lineTo(640, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.clip();
            rockFace(ctx, 0, 200, w, h - 200, 5150, '#8e8878', '#6a6558', '#433f36');
            // Turf cap and a worn path of pale gravel
            ctx.fillStyle = PAL.GRASS_SHADOW;
            ctx.beginPath();
            ctx.moveTo(0, 218); ctx.lineTo(120, 204); ctx.lineTo(250, 230); ctx.lineTo(392, 212);
            ctx.lineTo(520, 236); ctx.lineTo(640, 220); ctx.lineTo(640, 250); ctx.lineTo(0, 246);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_BASE;
            ctx.beginPath();
            ctx.moveTo(0, 218); ctx.lineTo(120, 204); ctx.lineTo(250, 230); ctx.lineTo(392, 212);
            ctx.lineTo(520, 236); ctx.lineTo(640, 220); ctx.lineTo(640, 234); ctx.lineTo(0, 232);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8a8168';
            ctx.beginPath();
            ctx.moveTo(70, 372); ctx.lineTo(200, 372); ctx.lineTo(360, 262); ctx.lineTo(316, 258);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#a39a7e';
            ctx.beginPath();
            ctx.moveTo(96, 372); ctx.lineTo(180, 372); ctx.lineTo(348, 264); ctx.lineTo(326, 262);
            ctx.closePath(); ctx.fill();
            blendSeam(ctx, 60, 306, 320, '#8a8168', '#6a6558');
            ctx.restore();
            grassFringe(ctx, 0, 234, w, 1717, 90, '#7aa055', '#568038', '#33581f');

            // ---- The house behind, on the high ground ----
            ctx.fillStyle = '#1a1620';
            ctx.fillRect(30, 118, 116, 106);
            stoneWall(ctx, 34, 122, 108, 100, 3131, '#5c5467', '#463f52', '#322c3e', '#241f2c');
            thatchRoof(ctx, 88, 84, 70, 124, 707);
            ctx.fillStyle = '#0c0a10';
            ctx.fillRect(72, 176, 32, 48);
            woodPlanks(ctx, 74, 178, 28, 46, true, 202);
            ctx.fillStyle = '#0c0a10';
            ctx.fillRect(44, 140, 20, 24);
            ctx.fillStyle = '#f6d98a';
            ctx.fillRect(46, 142, 16, 20);
            ctx.fillStyle = '#0c0a10';
            ctx.fillRect(53, 142, 2, 20);
            ctx.fillStyle = '#2a2530';
            ctx.fillRect(116, 60, 18, 34);
            ctx.fillStyle = '#413a4e';
            ctx.fillRect(116, 60, 6, 34);
            // Chimney smoke leaning hard downwind
            for (let i = 0; i < 5; i++) {
                const p = (eng.animTimer / 420 + i * 1.4) % 6;
                ctx.fillStyle = `rgba(200,200,210,${0.24 - p * 0.035})`;
                ctx.beginPath();
                ctx.ellipse(126 + p * 15, 56 - p * 5, 6 + p * 3, 4 + p * 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- The boulder to hide behind ----
            ctx.fillStyle = '#17150f';
            ctx.beginPath();
            ctx.moveTo(408, 316); ctx.lineTo(414, 268); ctx.lineTo(452, 246);
            ctx.lineTo(512, 254); ctx.lineTo(538, 292); ctx.lineTo(528, 318);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#6a6558';
            ctx.beginPath();
            ctx.moveTo(412, 314); ctx.lineTo(418, 270); ctx.lineTo(453, 250);
            ctx.lineTo(508, 258); ctx.lineTo(532, 292); ctx.lineTo(524, 314);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8e8878';
            ctx.beginPath();
            ctx.moveTo(418, 288); ctx.lineTo(420, 272); ctx.lineTo(453, 252);
            ctx.lineTo(492, 258); ctx.lineTo(470, 284);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#433f36';
            ctx.beginPath();
            ctx.moveTo(470, 286); ctx.lineTo(508, 260); ctx.lineTo(532, 292);
            ctx.lineTo(524, 314); ctx.lineTo(486, 312);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#3f5a2c';
            for (let i = 0; i < 9; i++) {
                const a = i * 0.7;
                ctx.fillRect(424 + Math.cos(a) * 46 + 46, 256 + Math.sin(a) * 8, 5, 3);
            }
            eng.drawContactShadow(ctx, 470, 318, 1, { rx: 62, ry: 8, alpha: 0.3 });

            // ---- Gorse and thrift on the cliff edge ----
            drawBush(ctx, 62, 268, 0.8, 141);
            drawBush(ctx, 214, 256, 0.6, 242);
            drawBush(ctx, 596, 276, 0.9, 343);
            ctx.fillStyle = '#c97a9c';
            [[70, 258], [58, 262], [220, 248], [590, 264], [604, 268]].forEach(([fx, fy]) => {
                ctx.fillRect(fx, fy, 3, 3);
            });

            // ---- The cove below, right foreground ----
            ctx.save();
            ctx.beginPath();
            ctx.rect(300, 300, 340, 100);
            ctx.clip();
            waterBand(ctx, 300, 330, 340, 70, eng.animTimer, 828);
            ctx.fillStyle = '#8a8168';
            ctx.beginPath();
            ctx.moveTo(300, 340); ctx.lineTo(470, 322); ctx.lineTo(640, 348); ctx.lineTo(640, 400); ctx.lineTo(300, 400);
            ctx.closePath(); ctx.fill();
            ctx.restore();

            // Gulls
            drawGull(ctx, 210, 92, 1.3, eng.animTimer, 0);
            drawGull(ctx, 268, 74, 1, eng.animTimer, 1.4);
            drawGull(ctx, 500, 106, 1.1, eng.animTimer, 2.7);
        },
        hotspots: [
            {
                name: 'the boulder', x: 406, y: 244, w: 136, h: 76, walkToX: 396,
                description: 'A house-sized boulder with a hollow behind it. Nobody coming up the path would see anything hiding there.',
                use: (e) => {
                    if (e.getFlag('morvane_passed')) { e.showMessage('You have already used it once today. Once was enough.'); return; }
                    e.setFlag('morvane_passed');
                    e.addScore(10);
                    e.playCutscene({
                        duration: 7000,
                        draw: (c, cw, ch, progress, elapsed) => cutsceneMorvanePasses(c, cw, ch, progress, elapsed),
                        onEnd: () => {
                            engine.showMessage('He goes into the house. The door closes. You are still alive, which you had not counted on, and the path to the cove is open.', { window: true });
                        }
                    });
                },
                look: (e) => {
                    e.showMessage(e.getFlag('morvane_passed')
                        ? 'A house-sized boulder. You have never been so glad of a rock.'
                        : 'A house-sized boulder with a hollow behind it. Nobody coming up the path would see anything hiding there.');
                }
            },
            {
                name: 'the house', x: 26, y: 60, w: 124, h: 166,
                description: 'Morvane\'s house, squat against the wind. From out here you can see how small it is.',
                walk: (e) => e.showMessage('You are not going back in there.')
            },
            {
                name: 'the sea', x: 0, y: 154, w: 640, h: 60,
                description: 'Grey water to the horizon, and somewhere on the far side of it, a coastline you have only heard about in a raven\'s vocabulary.',
                get: (e) => e.showMessage('The sea declines.')
            },
            {
                name: 'the distant castle', x: 430, y: 118, w: 84, h: 40,
                description: 'A castle on the far shore, small as a knucklebone. Corvus called it Alderhaven, and then would not say another word about it.'
            },
            {
                name: 'the skiff', x: 470, y: 330, w: 140, h: 60, walkToX: 520,
                description: 'A fishing skiff drawn up on the shingle below, its sail hanging like wet washing. There is not a breath of wind in the cove.',
                get: (e) => e.showMessage('It is a boat. You cannot put a boat in your pocket.'),
                use: (e) => {
                    if (!e.getFlag('morvane_passed')) { e.showMessage('Not while there is something coming up the path.'); return; }
                    e.showMessage(e.hasItem('thimble')
                        ? 'The sail hangs dead. You are carrying a wind in a thimble. Use it on the skiff.'
                        : 'You could push the skiff out, and then sit in it, in a flat calm, in full view of the house. You need a wind.');
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'thimble') { e.showMessage('That will not move a boat.'); return; }
                    if (!e.getFlag('morvane_passed')) { e.showMessage('Not while there is something coming up the path.'); return; }
                    e.removeFromInventory('thimble');
                    e.updateInventoryUI();
                    e.addScore(15);
                    e.playCutscene({
                        duration: 9000,
                        draw: (c, cw, ch, progress, elapsed) => cutsceneSailAway(c, cw, ch, progress, elapsed),
                        onEnd: () => {
                            engine.goToRoom('harbour_road', 120, 336);
                            engine.showMessage('The keel grates on shingle on the far shore. You step out onto Alderhaven with a stolen book, an empty thimble, and no plan whatsoever.', { window: true });
                        }
                    });
                }
            },
            {
                name: 'the gorse', x: 40, y: 250, w: 60, h: 34,
                description: 'Gorse, thrift and sea pink, all of it flattened permanently eastward by the wind.'
            },
            {
                name: 'the path down', x: 0, y: 330, w: 120, h: 60, isExit: true, walkToX: 100,
                description: 'The path back up to the house.',
                onExit: (e) => e.goToRoom('study', 560, 330)
            }
        ]
    });
});
