// ============================================================
// CROWN QUEST - ACT II: ALDERHAVEN
// Rooms: harbour_road, village_green, well_bottom, dark_wood,
//        troll_bridge, cloud_realm, dragon_cave
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;

    /** The goat trails Rowan from room to room once bribed. One helper draws it
     *  in every room so it never becomes two different animals. */
    function followingGoat(e, gx, groundY, scale) {
        if (!e.getFlag('goat_follows')) return;
        e.addForegroundLayer(groundY, (ctx, eng) => {
            eng.drawContactShadow(ctx, gx, groundY, 1, { rx: 30 * scale, ry: 6 * scale, alpha: 0.26 });
            drawGoat(ctx, gx, groundY, scale, eng.playerX > gx ? 1 : -1, false, eng.animTimer);
        });
    }

    /** Shared Alderhaven daylight sky. Every exterior in the act uses it so the
     *  time of day never jumps between adjacent screens. */
    function alderhavenSky(ctx, w, horizonY, eng, seed) {
        skyBands(ctx, 0, 0, w, horizonY, ['#4a6ea8', '#7a9cc6', '#a8c2dc', '#cfdeea']);
        const next = seededRandom(seed || 606);
        for (let i = 0; i < 6; i++) {
            const cx = next() * w + Math.sin(eng.animTimer / 11000 + i) * 16;
            const cy = 20 + next() * (horizonY * 0.5);
            const cw = 30 + next() * 34;
            ctx.fillStyle = 'rgba(244,248,252,0.62)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, cw, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - cw * 0.6, cy + 5, cw * 0.5, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + cw * 0.62, cy + 4, cw * 0.44, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(178,196,216,0.5)';
            ctx.beginPath();
            ctx.ellipse(cx + 4, cy + 8, cw * 0.9, 4.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ================= ROOM 5: THE HARBOUR ROAD =================
    engine.registerRoom({
        id: 'harbour_road',
        name: 'The Harbour Road',
        description: 'A rutted road above the shingle, running inland toward smoke and rooftops.',
        smell: 'Kelp, tar, and somebody smoking fish badly.',
        hint: (e) => {
            if (!e.getFlag('has_all_three')) return 'The village is inland along the road. The shore path west leads somewhere you are not ready for yet.';
            return 'You have all three treasures. Take the shore path west, to the Amber Tower.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('sea');
            e.setDepthScaling(250, 372, 0.6, 1.08);
            e.setWalkableArea((px, py) => py > 244 && py < 372 && px > 20 && px < 620);
            e.addBarrier(58, 268, 96, 40);
            e.setEdgeTransition('right', (eng) => eng.goToRoom('village_green', 60, 336));
            e.setEdgeTransition('left', (eng) => {
                if (!eng.getFlag('has_all_three')) {
                    eng.showMessage('The shore path west runs out toward the headland and the tower nobody in Alderhaven will name. You have nothing yet that would open anything there.', { window: true });
                    eng.playerX = 60;
                    return;
                }
                eng.goToRoom('amber_tower', 580, 336);
            });
            followingGoat(e, 210, 358, 1.05);
            // Marram grass on the near dune, for the ego to walk behind.
            e.addForegroundLayer(392, (ctx) => {
                ctx.fillStyle = '#8a8168';
                ctx.beginPath();
                ctx.moveTo(-10, 372); ctx.lineTo(220, 366); ctx.lineTo(400, 380); ctx.lineTo(650, 372);
                ctx.lineTo(650, 400); ctx.lineTo(-10, 400);
                ctx.closePath(); ctx.fill();
                grassFringe(ctx, 0, 378, 640, 5566, 130, '#9ab06a', '#78904c', '#4e6030');
            });
        },
        draw: (ctx, w, h, eng) => {
            alderhavenSky(ctx, w, 148, eng, 141);
            distantRange(ctx, 152, w, 44, 3311, '#8fa4bc', 0.85);
            distantRange(ctx, 158, w, 30, 7722, '#7b91ac', 0.7);
            // Serpent's Crag out to sea, small and behind you now
            ctx.fillStyle = '#6d84a2';
            ctx.beginPath();
            ctx.moveTo(508, 158); ctx.lineTo(536, 126); ctx.lineTo(560, 140);
            ctx.lineTo(588, 122); ctx.lineTo(616, 158);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#5d7392';
            ctx.fillRect(552, 128, 8, 8);

            waterBand(ctx, 0, 158, w, 62, eng.animTimer, 1919);
            // Shingle beach and the tide line
            ctx.fillStyle = '#7d7563';
            ctx.beginPath();
            ctx.moveTo(0, 214); ctx.lineTo(200, 224); ctx.lineTo(430, 216); ctx.lineTo(640, 226);
            ctx.lineTo(640, 260); ctx.lineTo(0, 254);
            ctx.closePath(); ctx.fill();
            blendSeam(ctx, 0, 218, w, '#9aa0a4', '#7d7563');
            ctx.fillStyle = '#4f4a3e';
            const shingle = seededRandom(2727);
            for (let i = 0; i < 220; i++) {
                ctx.fillRect(shingle() * w, 216 + shingle() * 40, 2, 1);
            }

            // ---- The road ----
            ctx.fillStyle = PAL.GRASS_SHADOW;
            ctx.beginPath();
            ctx.moveTo(0, 250); ctx.lineTo(640, 256); ctx.lineTo(640, h); ctx.lineTo(0, h);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_BASE;
            ctx.fillRect(0, 256, w, 46);
            ctx.fillStyle = PAL.GRASS_LIT;
            blendSeam(ctx, 0, 258, w, PAL.GRASS_BASE, PAL.GRASS_LIT);
            ctx.fillStyle = '#8a7c5e';
            ctx.beginPath();
            ctx.moveTo(-20, 372); ctx.lineTo(190, 372); ctx.lineTo(560, 268); ctx.lineTo(470, 264);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#9c8e6c';
            ctx.beginPath();
            ctx.moveTo(20, 372); ctx.lineTo(160, 372); ctx.lineTo(540, 270); ctx.lineTo(490, 268);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#6f6247';
            ctx.beginPath();
            ctx.moveTo(70, 372); ctx.lineTo(96, 372); ctx.lineTo(516, 269); ctx.lineTo(506, 268);
            ctx.closePath(); ctx.fill();
            grassFringe(ctx, 0, 300, 640, 3838, 70);
            turfTexture(ctx, 0, 250, w, h - 250, 5252, 'rgba(120,164,88,0.15)', 'rgba(44,80,40,0.14)');

            // ---- The skiff, drawn up where you left it ----
            eng.drawContactShadow(ctx, 108, 268, 1, { rx: 52, ry: 7, alpha: 0.24 });
            drawSkiff(ctx, 108, 262, 0.72, false, eng.animTimer);

            // ---- Alderhaven town and castle inland ----
            drawCastle(ctx, 476, 250, 0.66, '#5b6478', '#79839a');
            [[364, 252, 0.5], [416, 254, 0.42], [540, 256, 0.46]].forEach(([bx, by, bs]) => {
                ctx.fillStyle = '#1a1610';
                ctx.fillRect(bx - 22 * bs, by - 40 * bs, 44 * bs, 40 * bs);
                stoneWall(ctx, bx - 20 * bs, by - 38 * bs, 40 * bs, 38 * bs, 800 + bx, '#8f8776', '#726a5b', '#4e483d', '#3b362d');
                thatchRoof(ctx, bx, by - 62 * bs, 28 * bs, by - 38 * bs, 500 + bx);
            });

            // ---- Waymarker stone ----
            ctx.fillStyle = '#1a1815';
            ctx.beginPath();
            ctx.moveTo(232, 300); ctx.lineTo(238, 246); ctx.lineTo(262, 242); ctx.lineTo(270, 300);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8d8778';
            ctx.beginPath();
            ctx.moveTo(236, 298); ctx.lineTo(241, 249); ctx.lineTo(259, 246); ctx.lineTo(266, 298);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#a9a394';
            ctx.beginPath();
            ctx.moveTo(236, 298); ctx.lineTo(241, 249); ctx.lineTo(249, 248); ctx.lineTo(247, 298);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#5c574b';
            ctx.beginPath();
            ctx.moveTo(258, 296); ctx.lineTo(259, 246); ctx.lineTo(266, 298);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#4a453b';
            ctx.fillRect(242, 262, 16, 2);
            ctx.fillRect(242, 268, 12, 2);
            ctx.fillRect(242, 276, 15, 2);
            ctx.fillStyle = '#5f7a3c';
            for (let i = 0; i < 12; i++) ctx.fillRect(234 + (i % 4) * 9, 284 + (i % 3) * 5, 3, 2);

            // ---- Headland and the tower, west ----
            ctx.fillStyle = '#4e5a68';
            ctx.beginPath();
            ctx.moveTo(0, 244); ctx.lineTo(40, 218); ctx.lineTo(96, 236); ctx.lineTo(120, 250);
            ctx.lineTo(0, 258);
            ctx.closePath(); ctx.fill();
            drawAmberTower(ctx, 40, 224, 0.2, eng.getFlag('sockets_lit') || 0, eng.animTimer);

            drawGull(ctx, 300, 76, 1.3, eng.animTimer, 0.4);
            drawGull(ctx, 372, 60, 1, eng.animTimer, 2.1);
            drawGull(ctx, 148, 96, 1.1, eng.animTimer, 3.5);
            eng.vignette(ctx, 0.26, '20,24,34');
        },
        hotspots: [
            {
                name: 'the skiff', x: 60, y: 232, w: 100, h: 44,
                description: 'The skiff, hauled above the tide line. Its sail is a rag again, and the thimble is empty.',
                use: (e) => e.showMessage('There is no wind left in the thimble, and there was never going to be a second one.')
            },
            {
                name: 'the waymarker', x: 230, y: 240, w: 44, h: 62, walkToX: 288,
                description: 'A leaning waymarker with three lines cut into it. The letters are worn to dents, and you could not read them if they were fresh.'
            },
            {
                name: 'the sea', x: 0, y: 158, w: 640, h: 56,
                description: 'The channel, and beyond it a grey lump of rock with a house on it. You lived there this morning.'
            },
            {
                name: 'the town', x: 340, y: 200, w: 240, h: 60,
                description: 'Alderhaven: a scatter of thatch under a castle that has clearly seen better centuries.'
            },
            {
                name: 'the tower', x: 8, y: 178, w: 68, h: 66,
                description: 'Out on the western headland, a slim tower the colour of old honey. Nobody has mentioned it, and you have not asked.'
            },
            {
                name: 'the shore path west', x: 0, y: 260, w: 42, h: 112, isExit: true, walkToX: 40,
                description: 'A thin path along the cliff top, running west toward the headland.',
                onExit: (e) => {
                    if (!e.getFlag('has_all_three')) {
                        e.showMessage('You start along the path and stop. Whatever is out there, you would arrive at it empty-handed.');
                        e.playerX = 78;
                        return;
                    }
                    e.goToRoom('amber_tower', 580, 336);
                }
            },
            {
                name: 'the road inland', x: 598, y: 260, w: 42, h: 112, isExit: true, walkToX: 600,
                description: 'The road runs inland toward the village.',
                onExit: (e) => e.goToRoom('village_green', 60, 336)
            }
        ]
    });

    // ================= ROOM 6: THE VILLAGE GREEN =================
    engine.registerRoom({
        id: 'village_green',
        name: 'The Village Green',
        description: 'A green with a well on it, a cottage, a peddler\'s cart, and one extremely committed goat.',
        smell: 'Woodsmoke, bread, and goat. Mostly goat.',
        hint: (e) => {
            if (!e.hasItem('rope')) return 'Hattie the peddler has a coil of rope on her cart. Talk to her.';
            if (!e.getFlag('rope_tied')) return 'Tie the rope to the well\'s windlass, then climb down.';
            if (!e.getFlag('goat_follows') && e.hasItem('bread')) return 'The goat is tethered by a frayed rope and is extremely interested in that crust.';
            return 'The wood lies east. The well goes down. The road back to the shore is west.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('village');
            e.setDepthScaling(258, 372, 0.62, 1.08);
            e.setWalkableArea((px, py) => py > 250 && py < 372 && px > 20 && px < 620);
            e.addBarrier(252, 296, 140, 48);
            e.addBarrier(24, 268, 150, 52);
            e.setEdgeTransition('left', (eng) => eng.goToRoom('harbour_road', 580, 336));
            e.setEdgeTransition('right', (eng) => eng.goToRoom('dark_wood', 60, 340));

            if (!e.getFlag('goat_follows')) {
                e.addForegroundLayer(346, (ctx, eng2) => {
                    eng2.drawContactShadow(ctx, 486, 346, 1, { rx: 40, ry: 7, alpha: 0.26 });
                    drawGoat(ctx, 486, 346, 1.28, -1, false, eng2.animTimer);
                    // The tether it has been chewing on since Tuesday
                    ctx.strokeStyle = '#8d7b58';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(462, 320); ctx.lineTo(536, 336);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    ctx.fillStyle = '#241708';
                    ctx.fillRect(534, 330, 6, 18);
                });
            } else {
                followingGoat(e, 200, 356, 1.2);
            }
            // Hattie stands beside her cart, y-sorted so Rowan can pass in front.
            e.addForegroundLayer(324, (ctx, eng2) => {
                eng2.drawContactShadow(ctx, 96, 324, 1, { rx: 21, ry: 5, alpha: 0.26 });
                drawVgaPerson(ctx, 96, 324, vgaPersonScale(eng2, 324, 0.96), Object.assign({}, CAST_HATTIE, {
                    nearArm: { side: 1, up: 0.28, lo: 0.44 },
                    farArm: { side: -1, up: -0.16, lo: 0.4 }
                }));
            });
        },
        draw: (ctx, w, h, eng) => {
            alderhavenSky(ctx, w, 150, eng, 808);
            distantRange(ctx, 156, w, 40, 4141, '#93a7bd', 0.8);
            // Treeline behind the green: a dark hedge mass with crowns over it
            ctx.fillStyle = PAL.LEAF_DEEP;
            ctx.fillRect(0, 168, w, 42);
            for (let i = 0; i < 9; i++) {
                drawTree(ctx, -10 + i * 78, 210, 0.62 + (i % 3) * 0.1, 300 + i * 17);
            }
            ctx.fillStyle = 'rgba(120,150,124,0.22)';
            ctx.fillRect(0, 130, w, 82);
            ctx.fillStyle = PAL.LEAF_DEEP;
            ctx.fillRect(0, 200, w, 12);
            ctx.fillStyle = PAL.LEAF_SHADOW;
            for (let i = 0; i < 40; i++) {
                ctx.beginPath();
                ctx.ellipse(i * 17, 200, 13, 8, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- Green ----
            ctx.fillStyle = PAL.GRASS_SHADOW;
            ctx.fillRect(0, 196, w, 60);
            ctx.fillStyle = PAL.GRASS_BASE;
            ctx.fillRect(0, 244, w, 60);
            blendSeam(ctx, 0, 244, w, PAL.GRASS_SHADOW, PAL.GRASS_BASE);
            ctx.fillStyle = PAL.GRASS_LIT;
            ctx.fillRect(0, 300, w, h - 300);
            blendSeam(ctx, 0, 300, w, PAL.GRASS_BASE, PAL.GRASS_LIT);
            grassFringe(ctx, 0, 262, w, 5151, 80);
            grassFringe(ctx, 0, 316, w, 6161, 110);
            turfTexture(ctx, 0, 212, w, h - 212, 4242, 'rgba(126,172,92,0.17)', 'rgba(44,84,42,0.15)', '#e8e0a0');
            // A trodden path curving from the road to the well
            ctx.fillStyle = '#8a7c5e';
            ctx.beginPath();
            ctx.moveTo(0, 348); ctx.lineTo(60, 340); ctx.lineTo(280, 306); ctx.lineTo(276, 298);
            ctx.lineTo(60, 330); ctx.lineTo(0, 336);
            ctx.closePath(); ctx.fill();

            // ---- Cottage on the left ----
            ctx.fillStyle = '#151109';
            ctx.fillRect(20, 176, 156, 96);
            stoneWall(ctx, 24, 180, 148, 90, 9191, '#a39a84', '#847b68', '#5a5346', '#443f35');
            thatchRoof(ctx, 98, 128, 92, 182, 1234);
            ctx.fillStyle = '#0e0b07';
            ctx.fillRect(80, 218, 36, 54);
            woodPlanks(ctx, 82, 220, 32, 52, true, 1616);
            ctx.fillStyle = '#3a352c';
            ctx.beginPath(); ctx.arc(110, 246, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0e0b07';
            ctx.fillRect(38, 202, 26, 24);
            ctx.fillRect(130, 202, 26, 24);
            ctx.fillStyle = '#c6ae72';
            ctx.fillRect(40, 204, 22, 20);
            ctx.fillRect(132, 204, 22, 20);
            ctx.fillStyle = '#0e0b07';
            ctx.fillRect(50, 204, 2, 20);
            ctx.fillRect(142, 204, 2, 20);
            ctx.fillRect(40, 213, 22, 2);
            ctx.fillRect(132, 213, 22, 2);
            // Chimney and smoke
            ctx.fillStyle = '#5a5346';
            ctx.fillRect(140, 108, 20, 32);
            ctx.fillStyle = '#847b68';
            ctx.fillRect(140, 108, 7, 32);
            for (let i = 0; i < 5; i++) {
                const p = (eng.animTimer / 700 + i * 1.3) % 6;
                ctx.fillStyle = `rgba(210,210,214,${0.26 - p * 0.04})`;
                ctx.beginPath();
                ctx.ellipse(150 + p * 8, 104 - p * 11, 6 + p * 3.4, 4 + p * 2.4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // A bench and a stack of firewood
            ctx.fillStyle = '#1a1206';
            ctx.fillRect(186, 262, 62, 8);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(188, 263, 58, 5);
            ctx.fillStyle = '#1a1206';
            ctx.fillRect(192, 268, 7, 18);
            ctx.fillRect(236, 268, 7, 18);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 6; c++) {
                    const lx = 196 + c * 11, ly = 258 - r * 10;
                    ctx.fillStyle = '#241708';
                    ctx.beginPath(); ctx.arc(lx, ly, 5.2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = (r + c) % 2 ? '#7a5c34' : '#8a6a3c';
                    ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#3a2a14';
                    ctx.fillRect(lx - 3, ly - 1, 6, 1);
                }
            }

            // ---- The well, centre ----
            eng.drawContactShadow(ctx, 320, 342, 1, { rx: 78, ry: 12, alpha: 0.3 });
            drawWell(ctx, 320, 342, 1.35, eng.getFlag('rope_tied'), 4711);
            if (eng.getFlag('rope_tied')) {
                ctx.strokeStyle = '#b9a274';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(320, 266); ctx.lineTo(320, 310);
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            // ---- Hattie's cart, left of centre ----
            ctx.fillStyle = '#160f06';
            ctx.fillRect(58, 268, 132, 40);
            woodPlanks(ctx, 62, 272, 124, 34, false, 2424);
            ctx.fillStyle = '#160f06';
            ctx.fillRect(58, 262, 132, 8);
            ctx.fillStyle = '#8a4a2a';
            ctx.fillRect(60, 263, 128, 5);
            // Cartwheels: hub, spokes, rim
            [92, 164].forEach((wx) => {
                ctx.fillStyle = '#160f06';
                ctx.beginPath(); ctx.arc(wx, 312, 22, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.beginPath(); ctx.arc(wx, 312, 19, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#160f06';
                ctx.beginPath(); ctx.arc(wx, 312, 15, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = PAL.WOOD_LIT;
                ctx.lineWidth = 2.4;
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                    ctx.beginPath();
                    ctx.moveTo(wx, 312);
                    ctx.lineTo(wx + Math.cos(a) * 17, 312 + Math.sin(a) * 17);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                ctx.fillStyle = '#3a352c';
                ctx.beginPath(); ctx.arc(wx, 312, 5, 0, Math.PI * 2); ctx.fill();
            });
            // Awning, and the stock on the cart bed
            ctx.fillStyle = '#160f06';
            ctx.beginPath();
            ctx.moveTo(52, 232); ctx.lineTo(196, 226); ctx.lineTo(196, 236); ctx.lineTo(52, 242);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#a8442e';
            for (let i = 0; i < 8; i++) {
                ctx.fillStyle = i % 2 ? '#a8442e' : '#d8cdb0';
                ctx.beginPath();
                ctx.moveTo(54 + i * 18, 233 - i * 0.7);
                ctx.lineTo(72 + i * 18, 232 - i * 0.7);
                ctx.lineTo(72 + i * 18, 241 - i * 0.7);
                ctx.lineTo(54 + i * 18, 242 - i * 0.7);
                ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = '#160f06';
            ctx.fillRect(56, 232, 6, 40);
            ctx.fillRect(188, 226, 6, 42);
            // Pots, cloth bolts, and the coil of rope
            ctx.fillStyle = '#5a3f2a';
            ctx.fillRect(70, 246, 18, 18);
            ctx.fillStyle = '#7a5a3a';
            ctx.fillRect(70, 246, 6, 18);
            ctx.fillStyle = '#33455e';
            ctx.fillRect(96, 250, 22, 14);
            ctx.fillStyle = '#48607c';
            ctx.fillRect(96, 250, 22, 4);
            ctx.fillStyle = '#3c5540';
            ctx.fillRect(124, 248, 20, 16);
            if (!eng.hasItem('rope') && !eng.getFlag('rope_tied')) {
                ctx.strokeStyle = '#2a2114';
                ctx.lineWidth = 6;
                ctx.beginPath(); ctx.arc(164, 254, 11, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = '#b9a274';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(164, 254, 11, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 1;
            }

            // ---- Background villager, going about her day ----
            eng.drawContactShadow(ctx, 566, 288, 1, { rx: 13, ry: 3, alpha: 0.2 });
            drawVgaPerson(ctx, 566, 288, vgaPersonScale(eng, 288, 0.94), Object.assign({}, CAST_VILLAGER, {
                nearArm: { side: 1, up: 0.1 + Math.sin(eng.animTimer / 900) * 0.16, lo: 0.3 },
                farArm: { side: -1, up: -0.1, lo: 0.36 }
            }));

            eng.vignette(ctx, 0.24, '24,26,20');
        },
        hotspots: [
            {
                name: 'the well', x: 250, y: 240, w: 142, h: 106, walkToX: 400,
                description: 'A stone well with a windlass over it. The bucket is long gone and the rope with it.',
                look: (e) => {
                    e.showMessage(e.getFlag('rope_tied')
                        ? 'Your rope runs over the windlass and down into the dark. It is a long way down and the rope is exactly long enough, which is the sort of luck you distrust.'
                        : 'A stone well. Cold air comes up it, and a long way down there is a sound of water. There is no rope on the windlass.');
                },
                use: (e) => {
                    if (!e.getFlag('rope_tied')) {
                        e.showMessage(e.hasItem('rope')
                            ? 'You would need to tie the rope to the windlass first.'
                            : 'You lean in and look down. Twenty feet of nothing, then water. Without a rope this is simply a hole you would fall into once.');
                        return;
                    }
                    e.goToRoom('well_bottom', 320, 330);
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'rope') { e.showMessage('That is not going to get you down a well.'); return; }
                    if (e.getFlag('rope_tied')) { e.showMessage('The rope is already tied on.'); return; }
                    e.removeFromInventory('rope');
                    e.setFlag('rope_tied');
                    e.addScore(5);
                    e.updateInventoryUI();
                    e.sound.metalScrape();
                    e.showMessage('You make the rope fast to the windlass with a knot Hattie showed you twice and you got right on the third go. It hangs down into the dark and stops swinging.');
                }
            },
            {
                name: 'Hattie', x: 72, y: 256, w: 52, h: 72, walkToX: 148,
                description: 'A broad, weather-beaten peddler with a cart, an opinion about everything, and both hands permanently on her hips.',
                talk: (e) => e.startDialog('hattie'),
                get: (e) => e.showMessage('Hattie looks at you the way she would look at a pickpocket, which is fair.')
            },
            {
                name: 'the cart', x: 52, y: 226, w: 144, h: 100,
                description: 'A peddler\'s cart under a striped awning: pots, cloth, twine, and a coil of good hemp rope.',
                get: (e) => e.showMessage('Hattie is standing right there. Ask her.')
            },
            {
                name: 'the coil of rope', x: 150, y: 240, w: 30, h: 30, walkToX: 190,
                description: 'Twenty feet of good hemp rope, coiled on the cart bed.',
                get: (e) => e.showMessage('Not while Hattie is watching it, which she is, with interest. Ask her for it.'),
                get hidden() { return engine.hasItem('rope') || engine.getFlag('rope_tied'); }
            },
            {
                name: 'the goat', x: 448, y: 296, w: 78, h: 52, walkToX: 424,
                description: 'A grey goat on a frayed tether, chewing. It has the horns of an animal with a plan and the eyes of an animal without one.',
                talk: (e) => e.showMessage('"Maa," says the goat, and continues chewing the tether it has nearly finished chewing.'),
                get: (e) => {
                    e.showMessage(e.hasItem('bread')
                        ? 'It will not come for nothing. It might come for bread.'
                        : 'You untie the tether. The goat considers freedom, decides against it, and goes back to chewing.');
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'bread') { e.showMessage('The goat sniffs it, and is unmoved. The goat has standards, but only one.'); return; }
                    RULES.leadGoat(e);
                    e.showMessage('You hold out the crust. The goat takes it, the tether, and a considered decision to follow you anywhere at all, in roughly that order.');
                },
                get hidden() { return engine.getFlag('goat_follows'); }
            },
            {
                name: 'the cottage', x: 20, y: 128, w: 156, h: 144,
                description: 'A thatched cottage with the shutters open and bread on somebody\'s table. It is the most ordinary building you have ever seen and you find you have stopped to look at it.'
            },
            {
                name: 'the villager', x: 552, y: 258, w: 30, h: 34,
                description: 'A woman carrying washing, who has already decided you are somebody else\'s problem.',
                talk: (e) => e.showMessage('"Morning," she says, and keeps walking. In eleven years nobody has said that to you.')
            },
            {
                name: 'the road west', x: 0, y: 302, w: 40, h: 70, isExit: true, walkToX: 40,
                description: 'The road back down to the harbour and the shore.',
                onExit: (e) => e.goToRoom('harbour_road', 580, 336)
            },
            {
                name: 'the wood', x: 600, y: 302, w: 40, h: 70, isExit: true, walkToX: 600,
                description: 'A track east, into trees that stand closer together than trees ought to.',
                onExit: (e) => e.goToRoom('dark_wood', 60, 340)
            }
        ]
    });

    // ================= ROOM 7: THE BOTTOM OF THE WELL =================
    engine.registerRoom({
        id: 'well_bottom',
        name: 'The Bottom of the Well',
        description: 'A flooded chamber at the foot of the well shaft. Somebody down here has been expecting company.',
        smell: 'Cold water, wet limestone, and pipe smoke, which makes no sense at all.',
        hint: (e) => {
            if (!e.hasItem('parchment') && !e.getFlag('gnome_named')) return 'He will only give up the chest for his name. The name is written somewhere in the dark wood, backwards.';
            if (!e.getFlag('gnome_named')) return 'You have the parchment. Read it, then talk to him and say the name.';
            if (!e.getFlag('pail_full')) return 'Fill your pail here. Water is going to matter later.';
            return 'The rope goes back up.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('cave_drip');
            e.setDepthScaling(280, 372, 0.78, 1.06);
            e.setWalkableArea((px, py) => py > 288 && py < 372 && px > 60 && px < 580);
            e.addBarrier(420, 300, 130, 44);
            // Mendharbe sits on his chest, y-sorted with the ego.
            e.addForegroundLayer(344, (ctx, eng) => {
                eng.drawContactShadow(ctx, 468, 344, 1, { rx: 20, ry: 4, alpha: 0.3 });
                if (!eng.getFlag('gnome_named')) {
                    drawChestOfCormac(ctx, 468, 328, 0.9);
                }
                drawVgaPerson(ctx, 468, eng.getFlag('gnome_named') ? 344 : 312,
                    vgaPersonScale(eng, 344, 0.62),
                    Object.assign({}, CAST_GNOME, {
                        nearArm: { side: 1, up: 0.5, lo: 0.9 },
                        farArm: { side: -1, up: -0.2, lo: 0.5 }
                    }));
            });
        },
        draw: (ctx, w, h, eng) => {
            ctx.fillStyle = '#07090c';
            ctx.fillRect(0, 0, w, h);
            rockFace(ctx, 0, 0, w, 300, 7373, '#4a5560', '#333d47', '#1e262e');
            // The shaft overhead, and the disc of daylight at the top of it
            ctx.fillStyle = '#0a0d11';
            ctx.beginPath();
            ctx.moveTo(212, 0); ctx.lineTo(428, 0); ctx.lineTo(380, 150); ctx.lineTo(260, 150);
            ctx.closePath(); ctx.fill();
            stoneWall(ctx, 236, 0, 168, 120, 8484, '#4e5a66', '#39434e', '#232b33', '#1a2027');
            ctx.fillStyle = '#cfe0ee';
            ctx.beginPath(); ctx.ellipse(320, 12, 46, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f2f7fb';
            ctx.beginPath(); ctx.ellipse(320, 11, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
            lightShaft(ctx, 320, 16, 76, 320, 330, 190, 0.13);
            dustMotes(ctx, 240, 20, 160, 300, eng.animTimer, 1212);
            // The rope, hanging exactly as far as it needs to
            ctx.strokeStyle = '#2a2114';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(320, 6); ctx.lineTo(322, 300); ctx.stroke();
            ctx.strokeStyle = '#b9a274';
            ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(320, 6); ctx.lineTo(322, 300); ctx.stroke();
            ctx.lineWidth = 1;

            // ---- Floor and standing water ----
            ctx.fillStyle = '#232b33';
            ctx.fillRect(0, 296, w, h - 296);
            blendSeam(ctx, 0, 296 + 8, w, '#333d47', '#232b33');
            ctx.fillStyle = '#1a2027';
            ctx.fillRect(0, 352, w, h - 352);
            // A shallow pool: dark, with three hard specular dashes and nothing else
            ctx.fillStyle = PAL.WATER_DEEP;
            ctx.beginPath();
            ctx.ellipse(200, 348, 128, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.WATER_SHADOW;
            ctx.beginPath();
            ctx.ellipse(200, 346, 120, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ditherRect(ctx, 96, 330, 208, 18, PAL.WATER_SHADOW, PAL.WATER_BASE, 2);
            const rip = Math.sin(eng.animTimer / 700) * 5;
            ctx.fillStyle = PAL.WATER_LIT;
            ctx.fillRect(150 + rip, 338, 22, 1);
            ctx.fillRect(228 - rip, 348, 16, 1);
            ctx.fillRect(186 + rip * 0.5, 356, 12, 1);
            // Reflected daylight disc, broken up
            ctx.fillStyle = 'rgba(207,224,238,0.18)';
            for (let i = 0; i < 7; i++) {
                ctx.fillRect(280 + Math.sin(eng.animTimer / 400 + i) * 6, 328 + i * 5, 40 - i * 4, 2);
            }
            // Drips, on a slow deterministic cycle
            for (let i = 0; i < 3; i++) {
                const dy = ((eng.animTimer / 3 + i * 900) % 900) / 900;
                ctx.fillStyle = 'rgba(180,215,235,0.7)';
                ctx.fillRect(180 + i * 130, 150 + dy * 190, 1, 5);
            }

            // ---- His hearth: a fire that should not be down here ----
            ctx.fillStyle = '#141110';
            ctx.beginPath(); ctx.ellipse(560, 340, 40, 13, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3a352c';
            for (let i = 0; i < 9; i++) {
                const a = i / 9 * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(560 + Math.cos(a) * 32, 340 + Math.sin(a) * 10, 7, 5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#241708';
            ctx.fillRect(544, 328, 34, 7);
            ctx.fillRect(552, 322, 20, 6);
            flame(ctx, 560, 326, 0.72, eng.animTimer);
            flame(ctx, 550, 328, 0.5, eng.animTimer + 500);
            eng.lightPool(ctx, 560, 320, 170, '255,160,70', 0.18);

            // ---- Old coins and a child's shoe in the silt ----
            ctx.fillStyle = PAL.GOLD_SHADOW;
            [[128, 366], [146, 372], [112, 374], [162, 368]].forEach(([cx2, cy2]) => {
                ctx.beginPath(); ctx.ellipse(cx2, cy2, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = PAL.GOLD_BASE;
            ctx.beginPath(); ctx.ellipse(146, 371, 2.2, 1.2, 0, 0, Math.PI * 2); ctx.fill();

            eng.vignette(ctx, 0.6, '4,8,12');
        },
        hotspots: [
            {
                name: 'Mendharbe', x: 440, y: 260, w: 60, h: 90, walkToX: 400,
                description: 'A gnome the height of a milking stool, with a beard he is sitting on and a pipe he has not lit. He is sitting on a small gold-bound chest and smiling at you.',
                talk: (e) => e.startDialog('gnome'),
                get: (e) => e.showMessage('He watches your hand come toward him with enormous, unhurried interest. You take the hand back.')
            },
            {
                name: 'the chest', x: 440, y: 306, w: 58, h: 40, walkToX: 400,
                description: 'A small oak chest bound in gold, with a gnome sitting on it. It is one of the three treasures of Alderhaven, and it is being used as a stool.',
                get: (e) => e.showMessage('He is sitting on it. He does not look like a gnome who is about to stand up for you.'),
                get hidden() { return engine.getFlag('gnome_named'); }
            },
            {
                name: 'the pool', x: 84, y: 324, w: 236, h: 52, walkToX: 260,
                description: 'A shallow pool of very cold, very clear water at the foot of the shaft.',
                use: (e) => {
                    if (!e.hasItem('pail')) { e.showMessage('You cup a handful and drink. It is the best water you have ever tasted and you cannot carry any of it.'); return; }
                    if (e.getFlag('pail_full')) { e.showMessage('The pail is already full and your boots already know it.'); return; }
                    RULES.setPailWater(e, true);
                    e.sound.splash();
                    e.showMessage('You sink the pail. It comes up brim full and immediately begins conspiring against your boots.');
                },
                useItem: (e, itemId) => {
                    if (itemId !== 'pail') { e.showMessage('Dropping that in the water would achieve nothing but a splash.'); return; }
                    if (e.getFlag('pail_full')) { e.showMessage('The pail is already full.'); return; }
                    RULES.setPailWater(e, true);
                    e.sound.splash();
                    e.showMessage('You sink the pail and haul it up brim full. Cold enough to make your wrists ache.');
                }
            },
            {
                name: 'the little fire', x: 528, y: 310, w: 66, h: 42,
                description: 'A driftwood fire burning cheerfully twenty feet under a village green. You decide not to think about the smoke.',
                get: (e) => e.showMessage('"That," says the gnome, without turning round, "is mine."')
            },
            {
                name: 'the coins', x: 100, y: 358, w: 76, h: 24,
                description: 'Wish-coins in the silt, green with age. Some of them are older than the village.',
                get: (e) => e.showMessage('You leave them. Somebody wished on every one of those, and today you understand why.')
            },
            {
                name: 'the rope', x: 296, y: 60, w: 50, h: 260, isExit: true, walkToX: 320,
                description: 'Your rope, hanging down the shaft, with daylight a long way above it.',
                onExit: (e) => e.goToRoom('village_green', 372, 348)
            }
        ]
    });

    // ================= ROOM 8: THE DARK WOOD =================
    engine.registerRoom({
        id: 'dark_wood',
        name: 'The Dark Wood',
        description: 'Old trees standing much too close together, and very little light getting through them.',
        smell: 'Leaf mould, fungus, and cold green shade.',
        hint: (e) => {
            if (!e.hasItem('parchment')) return 'Something pale is nailed to the big oak. Look at it.';
            if (!e.getFlag('hare_freed')) return 'There is a hare caught in a snare by the roots. Free it.';
            if (!e.getFlag('has_ring')) return 'Talk to Fennow. He noticed what you did.';
            return 'The cave mouth is north. The bridge is east.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('forest');
            e.setDepthScaling(268, 372, 0.66, 1.08);
            e.setWalkableArea((px, py) => py > 262 && py < 372 && px > 20 && px < 620);
            e.addBarrier(180, 300, 76, 48);
            e.setEdgeTransition('left', (eng) => eng.goToRoom('village_green', 580, 340));
            e.setEdgeTransition('right', (eng) => eng.goToRoom('troll_bridge', 60, 336));
            followingGoat(e, 150, 358, 1.15);

            // Foreground trunks: the single strongest depth cue in a wood.
            e.addForegroundLayer(400, (ctx) => {
                ctx.fillStyle = '#0d0f0a';
                ctx.fillRect(-6, 0, 46, 400);
                ctx.fillStyle = '#241a10';
                ctx.fillRect(2, 0, 32, 400);
                ctx.fillStyle = '#3b2c1a';
                ctx.fillRect(2, 0, 11, 400);
                ctx.fillStyle = '#0d0f0a';
                for (let y = 20; y < 400; y += 34) ctx.fillRect(4, y, 28, 3);
                ctx.fillStyle = '#0d0f0a';
                ctx.fillRect(602, 0, 46, 400);
                ctx.fillStyle = '#1d160d';
                ctx.fillRect(606, 0, 34, 400);
                ctx.fillStyle = '#33261a';
                ctx.fillRect(606, 0, 10, 400);
            });
            if (e.getFlag('has_ring')) return;
            // Fennow only shows himself after the hare is loose.
            e.addForegroundLayer(322, (ctx, eng) => {
                if (!eng.getFlag('hare_freed')) return;
                eng.drawContactShadow(ctx, 452, 322, 1, { rx: 17, ry: 4, alpha: 0.24 });
                drawVgaPerson(ctx, 452, 322, vgaPersonScale(eng, 322, 0.92), Object.assign({}, CAST_FENNOW, {
                    nearArm: { side: 1, up: 0.2, lo: 0.6 },
                    farArm: { side: -1, up: -0.24, lo: 0.44 }
                }));
            });
        },
        draw: (ctx, w, h, eng) => {
            // Canopy, tree ranks, floor and litter never change between frames,
            // so they are painted once into a cached layer and blitted after.
            ctx.drawImage(eng.staticLayer('dark_wood|scenery', (ctx, w, h) => {
            // A wood is closed in at the top: canopy, not sky, fills the frame.
            ctx.fillStyle = '#0f1a10';
            ctx.fillRect(0, 0, w, h);
            skyBands(ctx, 0, 40, w, 130, ['#6f8f7a', '#89a682', '#9cb583', '#7c9560']);
            // Receding ranks of trees. Each rank is hazed only over its own
            // depth slice — a full-width tint over the whole frame flattens
            // everything, including the sky, into one wash of green.
            const ranks = [
                { y: 196, scale: 0.44, count: 7, haze: 'rgba(126,158,128,0.5)' },
                { y: 218, scale: 0.62, count: 6, haze: 'rgba(96,128,102,0.34)' },
                { y: 242, scale: 0.82, count: 5, haze: 'rgba(64,92,70,0.18)' },
                { y: 268, scale: 1.0, count: 4, haze: null }
            ];
            ranks.forEach((rank, ri) => {
                for (let i = 0; i < rank.count; i++) {
                    drawTree(ctx, 40 + i * (w / rank.count) + (ri % 2 ? 54 : 0), rank.y, rank.scale, 900 + ri * 71 + i * 13);
                }
                if (!rank.haze) return;
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, w, rank.y + 14);
                ctx.clip();
                ctx.fillStyle = rank.haze;
                ctx.fillRect(0, 0, w, rank.y + 14);
                ctx.restore();
            });
            // Overhead canopy: the roof of the wood, closing the top of frame.
            ctx.fillStyle = '#122414';
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 44);
            for (let cx = w; cx > -40; cx -= 46) {
                ctx.quadraticCurveTo(cx - 23, 74 + (cx % 3) * 8, cx - 46, 46);
            }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.LEAF_SHADOW;
            for (let cx = -20; cx < w + 40; cx += 34) {
                ctx.beginPath();
                ctx.ellipse(cx, 40 + (cx % 5) * 5, 26, 15, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = PAL.LEAF_DEEP;
            for (let cx = -10; cx < w + 40; cx += 41) {
                ctx.beginPath();
                ctx.ellipse(cx, 26 + (cx % 4) * 6, 30, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Forest floor
            ctx.fillStyle = '#2c3a20';
            ctx.fillRect(0, 254, w, h - 254);
            ctx.fillStyle = '#3a4a28';
            ctx.fillRect(0, 290, w, h - 290);
            blendSeam(ctx, 0, 290, w, '#2c3a20', '#3a4a28');
            ctx.fillStyle = '#48562f';
            ctx.fillRect(0, 340, w, h - 340);
            blendSeam(ctx, 0, 340, w, '#3a4a28', '#48562f');
            // Leaf litter
            const litter = seededRandom(4949);
            for (let i = 0; i < 240; i++) {
                const lx = litter() * w, ly = 262 + litter() * 130;
                const tone = litter();
                ctx.fillStyle = tone > 0.72 ? '#7a5c28' : (tone > 0.42 ? '#5a4820' : '#3d3418');
                ctx.fillRect(lx, ly, 3, 2);
            }
            grassFringe(ctx, 0, 300, w, 3131, 90, '#7a9a4c', '#56763a', '#334a22');
            turfTexture(ctx, 0, 258, w, h - 258, 8585, 'rgba(96,132,66,0.15)', 'rgba(30,54,26,0.17)');
            }), 0, 0);

            // ---- Shafts of light through the canopy ----
            [140, 336, 520].forEach((sx, i) => {
                lightShaft(ctx, sx, 18, 22, sx + 46, 372, 74, 0.11 + i * 0.01, 'rgba(226,255,196,1)');
            });
            dustMotes(ctx, 320, 80, 90, 260, eng.animTimer, 7171);

            // ---- The great oak, with the parchment nailed to it ----
            drawTree(ctx, 216, 344, 1.9, 5, false);
            // ---- The parchment on the oak ----
            if (!eng.hasItem('parchment')) {
                ctx.fillStyle = '#2a2214';
                ctx.fillRect(198, 288, 34, 30);
                ctx.fillStyle = '#d6c69a';
                ctx.fillRect(199, 289, 32, 28);
                ctx.fillStyle = '#b8a67a';
                ctx.fillRect(221, 289, 10, 28);
                ctx.fillStyle = '#3a2a14';
                ctx.beginPath(); ctx.arc(214, 292, 1.6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(60,44,20,0.6)';
                for (let i = 0; i < 5; i++) ctx.fillRect(202, 298 + i * 4, 24, 1);
            }

            // ---- The snare in the roots ----
            if (!eng.getFlag('hare_freed')) {
                eng.drawContactShadow(ctx, 400, 350, 1, { rx: 15, ry: 3, alpha: 0.24 });
                drawHare(ctx, 400, 350, 1.25, false, eng.animTimer);
            } else if (!eng.getFlag('has_ring')) {
                drawHare(ctx, 512, 344, 1.05, true, eng.animTimer);
            }

            // ---- The cave mouth, back left ----
            ctx.fillStyle = '#0c1008';
            ctx.beginPath();
            ctx.moveTo(72, 262); ctx.lineTo(78, 190);
            ctx.quadraticCurveTo(120, 154, 164, 194);
            ctx.lineTo(170, 262);
            ctx.closePath(); ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(72, 262); ctx.lineTo(78, 190);
            ctx.quadraticCurveTo(120, 154, 164, 194);
            ctx.lineTo(170, 262);
            ctx.closePath();
            ctx.clip();
            rockFace(ctx, 60, 150, 120, 120, 6262, '#5d6650', '#414a38', '#252c1e');
            ctx.fillStyle = '#05070a';
            ctx.beginPath();
            ctx.moveTo(92, 262); ctx.lineTo(96, 206);
            ctx.quadraticCurveTo(122, 180, 148, 208);
            ctx.lineTo(152, 262);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            // A faint red breath from inside
            const glow = 0.1 + Math.sin(eng.animTimer / 1100) * 0.05;
            ctx.fillStyle = `rgba(200,70,30,${glow})`;
            ctx.beginPath();
            ctx.ellipse(122, 246, 34, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            // Ivy over the mouth
            ctx.fillStyle = PAL.LEAF_SHADOW;
            for (let i = 0; i < 22; i++) {
                const ix = 74 + i * 4.4;
                ctx.fillRect(ix, 186 + Math.sin(i) * 8, 4, 12 + (i % 4) * 5);
            }
            ctx.fillStyle = PAL.LEAF_BASE;
            for (let i = 0; i < 14; i++) {
                ctx.fillRect(78 + i * 6.8, 190 + Math.cos(i) * 6, 4, 5);
            }

            drawToadstools(ctx, 300, 366, 1.2, 606);
            drawToadstools(ctx, 556, 348, 0.9, 707);
            drawBush(ctx, 520, 300, 0.9, 808);
            drawBush(ctx, 92, 322, 1.1, 909);
            eng.vignette(ctx, 0.52, '6,12,6');
        },
        hotspots: [
            {
                name: 'the great oak', x: 168, y: 200, w: 106, h: 148,
                description: 'An oak with a trunk like a wall, and something pale nailed to it at head height.'
            },
            {
                name: 'the parchment', x: 192, y: 282, w: 46, h: 42, walkToX: 272,
                description: 'A scrap of parchment nailed to the oak, weathered nearly blank.',
                look: (e) => {
                    if (e.hasItem('parchment')) { e.showMessage('You have it already. It still says EBRAHDNEM, and it still refuses to mean anything.'); return; }
                    e.sound.pickup();
                    e.addToInventory('parchment');
                    e.showMessage('You work the nail out. The parchment is weathered nearly blank, but one word survives, written backwards in a spidery hand: EBRAHDNEM. Somebody wanted this remembered and did not want it read.');
                },
                get: (e) => {
                    e.showMessage('You take it down. See what it says first.');
                },
                get hidden() { return engine.hasItem('parchment'); }
            },
            {
                name: 'the hare', x: 372, y: 322, w: 60, h: 40, walkToX: 350,
                description: 'A hare with a brass snare drawn tight round one hind leg. It has stopped struggling, which is worse.',
                get: (e) => {
                    if (e.getFlag('hare_freed')) { e.showMessage('It is loose. It has not gone far.'); return; }
                    e.setFlag('hare_freed');
                    e.addScore(10);
                    e.sound.pickup();
                    e.showMessage('You work the wire loose. The hare does not bolt. It sits, and looks at you, and washes its ear, and from somewhere behind you a voice says, quite pleasantly, "That snare cost somebody a day."');
                },
                use: (e) => {
                    const hs = e.rooms['dark_wood'].hotspots.find((x) => x.name === 'the hare');
                    hs.get(e);
                },
                talk: (e) => e.showMessage('You tell the hare it will be all right. It is not convinced, and neither are you.'),
                get hidden() { return engine.getFlag('hare_freed'); }
            },
            {
                name: 'Fennow', x: 434, y: 268, w: 40, h: 58, walkToX: 410,
                description: 'A slight figure in green who was certainly not standing there a moment ago, and whose ears come to a definite point.',
                talk: (e) => e.startDialog('fennow'),
                get: (e) => e.showMessage('He steps out of the way without appearing to move.'),
                get hidden() { return !engine.getFlag('hare_freed') || engine.getFlag('has_ring'); }
            },
            {
                name: 'the toadstools', x: 272, y: 350, w: 60, h: 26,
                description: 'A ring of red toadstools. Hattie would have opinions about standing inside it.',
                get: (e) => e.showMessage('You have eaten some strange things in Morvane\'s scullery. You draw the line here.')
            },
            {
                name: 'the cave mouth', x: 72, y: 154, w: 100, h: 108, isExit: true, walkToX: 132,
                description: 'A black opening in the rock, taller than the trees around it. Warm air comes out of it, which in a wood this cold is deeply wrong.',
                onExit: (e) => e.goToRoom('dragon_cave', 560, 340)
            },
            {
                name: 'the track west', x: 0, y: 300, w: 40, h: 72, isExit: true, walkToX: 44,
                description: 'The track back to the village green.',
                onExit: (e) => e.goToRoom('village_green', 580, 340)
            },
            {
                name: 'the track east', x: 600, y: 300, w: 40, h: 72, isExit: true, walkToX: 596,
                description: 'The track east, toward the sound of water.',
                onExit: (e) => e.goToRoom('troll_bridge', 60, 336)
            }
        ]
    });

    // ================= ROOM 9: THE TROLL BRIDGE =================
    engine.registerRoom({
        id: 'troll_bridge',
        name: 'The Bridge',
        description: 'A rope bridge over a gorge, and something standing in the middle of it that is not going to move.',
        smell: 'River spray, wet rope, and a troll. Chiefly a troll.',
        hint: (e) => {
            if (!e.getFlag('troll_routed')) return 'You cannot buy him off and you cannot fight him. But the goat on the village green has horns and no sense of proportion.';
            return 'The beanstalk on the far bank goes up into the cloud.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(272, 372, 0.68, 1.08);
            e.setWalkableArea((px, py) => py > 292 && py < 372 && px > 20 && px < 300);
            e.setEdgeTransition('left', (eng) => eng.goToRoom('dark_wood', 580, 340));
            if (e.getFlag('troll_routed')) {
                e.setWalkableArea((px, py) => py > 292 && py < 372 && px > 20 && px < 620);
                e.setEdgeTransition('right', (eng) => eng.goToRoom('cloud_realm', 90, 344));
            }
            followingGoat(e, 120, 360, 1.15);
        },
        draw: (ctx, w, h, eng) => {
            alderhavenSky(ctx, w, 130, eng, 313);
            distantRange(ctx, 140, w, 56, 2121, '#8a9db4', 0.9);
            distantRange(ctx, 150, w, 40, 5252, '#75899f', 0.75);
            // Wooded far side of the gorge
            ctx.fillStyle = PAL.LEAF_DEEP;
            ctx.fillRect(0, 150, w, 40);
            for (let i = 0; i < 14; i++) drawPine(ctx, 20 + i * 48, 196, 0.4, i);

            // ---- The gorge ----
            ctx.fillStyle = '#131a1e';
            ctx.fillRect(0, 186, w, h - 186);
            rockFace(ctx, 0, 186, w, 160, 3636, '#5d6a72', '#3f4a52', '#232b31');
            // Far-side and near-side cliff tops
            ctx.fillStyle = '#2d3a22';
            ctx.beginPath();
            ctx.moveTo(0, 196); ctx.lineTo(180, 190); ctx.lineTo(300, 204); ctx.lineTo(640, 194);
            ctx.lineTo(640, 214); ctx.lineTo(0, 220);
            ctx.closePath(); ctx.fill();
            // The river far below, catching the sky
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 250, w, 60);
            ctx.clip();
            waterBand(ctx, 0, 258, w, 46, eng.animTimer, 999);
            ctx.fillStyle = 'rgba(20,26,32,0.42)';
            ctx.fillRect(0, 250, w, 60);
            ctx.restore();
            ctx.fillStyle = '#f0f4f6';
            for (let i = 0; i < 30; i++) {
                const fx = (i * 37 + Math.sin(eng.animTimer / 500 + i) * 4) % w;
                ctx.fillRect(fx, 264 + (i % 5) * 7, 4, 1);
            }

            // ---- Near and far banks ----
            ctx.fillStyle = '#1b2413';
            ctx.beginPath();
            ctx.moveTo(0, 300); ctx.lineTo(300, 296); ctx.lineTo(300, h); ctx.lineTo(0, h);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_BASE;
            ctx.beginPath();
            ctx.moveTo(0, 304); ctx.lineTo(298, 300); ctx.lineTo(298, h); ctx.lineTo(0, h);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_LIT;
            ctx.fillRect(0, 340, 296, h - 340);
            blendSeam(ctx, 0, 340, 296, PAL.GRASS_BASE, PAL.GRASS_LIT);
            ctx.fillStyle = '#1b2413';
            ctx.beginPath();
            ctx.moveTo(340, 296); ctx.lineTo(640, 302); ctx.lineTo(640, h); ctx.lineTo(340, h);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_BASE;
            ctx.beginPath();
            ctx.moveTo(344, 300); ctx.lineTo(640, 306); ctx.lineTo(640, h); ctx.lineTo(344, h);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GRASS_LIT;
            ctx.fillRect(344, 344, w - 344, h - 344);
            grassFringe(ctx, 0, 312, 296, 1414, 70);
            grassFringe(ctx, 344, 316, 296, 2525, 70);
            turfTexture(ctx, 0, 300, 300, h - 300, 6363, 'rgba(120,164,88,0.15)', 'rgba(44,80,40,0.14)');
            turfTexture(ctx, 344, 302, w - 344, h - 302, 7474, 'rgba(120,164,88,0.15)', 'rgba(44,80,40,0.14)');

            // ---- The bridge ----
            ctx.fillStyle = '#1a1206';
            ctx.fillRect(276, 286, 20, 60);
            ctx.fillRect(346, 288, 20, 60);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(278, 288, 15, 56);
            ctx.fillRect(348, 290, 15, 56);
            ctx.fillStyle = PAL.WOOD_LIT;
            ctx.fillRect(278, 288, 5, 56);
            ctx.fillRect(348, 290, 5, 56);
            drawRopeBridge(ctx, 288, 300, 356, 302, 16, 4321);

            // ---- The troll, or the space where he was ----
            if (!eng.getFlag('troll_routed')) {
                eng.drawContactShadow(ctx, 322, 322, 1, { rx: 54, ry: 8, alpha: 0.3 });
                drawTroll(ctx, 322, 322, 1.2, eng.animTimer, false);
            } else {
                // His club, dropped where he stopped standing.
                ctx.fillStyle = '#1a1206';
                ctx.save();
                ctx.translate(300, 336);
                ctx.rotate(0.4);
                ctx.fillRect(-26, -5, 52, 10);
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(-25, -4, 50, 8);
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.fillRect(-25, -4, 50, 3);
                ctx.fillStyle = '#1a1206';
                ctx.beginPath(); ctx.arc(24, 0, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.beginPath(); ctx.arc(24, 0, 9, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // ---- The beanstalk on the far bank ----
            if (eng.getFlag('troll_routed')) {
                ctx.fillStyle = '#16240f';
                ctx.beginPath();
                ctx.moveTo(506, 344);
                ctx.quadraticCurveTo(534, 200, 508, 0);
                ctx.lineTo(548, 0);
                ctx.quadraticCurveTo(568, 200, 546, 344);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#2f6b2c';
                ctx.beginPath();
                ctx.moveTo(512, 344);
                ctx.quadraticCurveTo(538, 200, 512, 0);
                ctx.lineTo(544, 0);
                ctx.quadraticCurveTo(564, 200, 542, 344);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#47913c';
                ctx.beginPath();
                ctx.moveTo(514, 344);
                ctx.quadraticCurveTo(538, 200, 514, 0);
                ctx.lineTo(524, 0);
                ctx.quadraticCurveTo(548, 200, 526, 344);
                ctx.closePath(); ctx.fill();
                // Leaves and coiling tendrils
                for (let i = 0; i < 12; i++) {
                    const ly = 20 + i * 28;
                    const lx = 512 + Math.sin(i * 0.8) * 22 + 16;
                    const side = i % 2 ? 1 : -1;
                    ctx.fillStyle = '#16240f';
                    ctx.beginPath();
                    ctx.ellipse(lx + side * 26, ly, 26, 11, side * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = i % 3 ? PAL.LEAF_BASE : PAL.LEAF_LIT;
                    ctx.beginPath();
                    ctx.ellipse(lx + side * 26, ly - 1, 23, 9, side * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = PAL.LEAF_SHADOW;
                    ctx.fillRect(lx + side * 12, ly - 1, side * 26, 1.4);
                }
                ctx.fillStyle = '#e8eef2';
                ctx.beginPath();
                ctx.ellipse(528, 12, 70, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            drawGull(ctx, 120, 70, 1, eng.animTimer, 1.1);
            eng.vignette(ctx, 0.3, '18,24,28');
        },
        hotspots: [
            {
                name: 'Grumbold', x: 286, y: 250, w: 72, h: 76, walkToX: 262,
                description: 'A troll the shape of a boulder that has learned to resent things. He is standing in the exact middle of the bridge, which is clearly the whole of his career.',
                talk: (e) => e.startDialog('troll'),
                get: (e) => e.showMessage('You would need a bigger everything.'),
                use: (e) => e.showMessage('You push. He does not notice. You stop pushing before he does.'),
                useItem: (e, itemId) => {
                    if (itemId === 'bread') { e.showMessage('"That," says Grumbold, inspecting the crust, "is not a toll. That is an insult with crumbs on it."'); return; }
                    e.showMessage('He looks at it, then at you, and shifts his weight in a way that ends the conversation.');
                },
                get hidden() { return engine.getFlag('troll_routed'); }
            },
            {
                name: 'the bridge', x: 276, y: 286, w: 96, h: 60, walkToX: 262,
                description: 'Planks and rope over a very long drop. It sags in the middle, mostly under Grumbold.',
                walk: (e) => {
                    if (e.getFlag('troll_routed')) { e.showMessage('The bridge is yours. It still sways more than you would like.'); return; }
                    e.die('You step onto the bridge. Grumbold picks you up by the back of your tunic with the air of a man doing a job he has done nine hundred times, and drops you into the gorge. The last thing you hear is the river, and it is not sympathetic.');
                },
                use: (e) => {
                    if (e.getFlag('troll_routed')) { e.showMessage('Nothing left to do here but cross it.'); return; }
                    e.showMessage('There is a troll standing on it.');
                }
            },
            {
                name: 'the gorge', x: 0, y: 240, w: 640, h: 56,
                description: 'A long way down, and then a river with opinions about rocks.'
            },
            {
                name: 'the beanstalk', x: 496, y: 0, w: 76, h: 348, isExit: true, walkToX: 500,
                description: 'A beanstalk as thick as a cottage, going up through the cloud layer and not coming back down.',
                onExit: (e) => e.goToRoom('cloud_realm', 90, 344),
                get hidden() { return !engine.getFlag('troll_routed'); }
            },
            {
                name: 'the track west', x: 0, y: 300, w: 40, h: 72, isExit: true, walkToX: 44,
                description: 'The track back into the wood.',
                onExit: (e) => e.goToRoom('dark_wood', 580, 340)
            }
        ]
    });

    // ================= ROOM 10: THE CLOUD REALM =================
    /** Put the ring on. Reachable from every hotspot in the hall, because a
     *  player holding the answer must never be able to fail by aiming it at
     *  the wrong object. */
    function wearRing(e) {
        if (!e.hasItem('ring_of_mist')) { e.showMessage('You have nothing that would hide you.'); return; }
        if (e.getFlag('ring_worn')) { e.showMessage('The ring is already on your finger, and you are already extremely difficult to look at.'); return; }
        e.setFlag('ring_worn');
        e.sound.magicChime();
        e.showMessage('You put the ring on. Nothing happens to you that you can feel. But the light stops landing on you properly, and your own hands have gone the colour of the air.');
    }

    engine.registerRoom({
        id: 'cloud_realm',
        name: 'Above the Cloud',
        description: 'A floor of cloud that holds your weight, a hall with no roof, and a giant asleep in the middle of it.',
        smell: 'Cold, clean, and very high. And underneath it, mutton.',
        hint: (e) => {
            if (!e.hasItem('ring_of_mist')) return 'Do not go near him. Go back and find something that makes a person no more visible than weather.';
            if (!e.getFlag('ring_worn')) return 'Put the ring on before you go a step further. Then take the shield.';
            return 'The beanstalk goes back down.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(280, 372, 0.72, 1.06);
            e.setWalkableArea((px, py) => py > 290 && py < 372 && px > 40 && px < 600);
            // Wearing the ring is a per-visit state: it wears off when he leaves.
            e.setFlag('ring_worn', false);
            if (e.hasItem('ring_of_mist')) {
                e.showMessage('The giant fills the hall. Fennow\'s ring is in your pocket and your pocket is not where it does any good.', { window: true });
            }
            e.addForegroundLayer(348, (ctx, eng) => {
                drawSleepingGiant(ctx, 356, 348, 1.1, eng.animTimer);
            });
        },
        onUpdate: (e) => {
            if (e.dead || e.cutscene || e.sequence) return;
            // He is asleep, not deaf. Getting close without the ring ends badly.
            if (e.playerX > 240 && !e.getFlag('ring_worn')) {
                e.die('The giant\'s hand closes over you without his eyes ever opening. He turns you over once, the way a man checks a coin, and decides you are a mouse. What he does to mice is brief and beyond appeal.');
            }
        },
        draw: (ctx, w, h, eng) => {
            // ---- Sky above the weather ----
            skyBands(ctx, 0, 0, w, 200, ['#1e3a72', '#3a63a4', '#6f9ad0', '#a8cbe8']);
            starField(ctx, w, 90, 1717, 40, 1);
            // A sun that is far too close
            ctx.fillStyle = 'rgba(255,244,200,0.18)';
            ctx.beginPath(); ctx.arc(556, 62, 62, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff6cc';
            ctx.beginPath(); ctx.arc(556, 62, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(550, 56, 18, 0, Math.PI * 2); ctx.fill();

            // ---- Cloud floor: banked, dithered, no smooth fills ----
            ctx.fillStyle = '#c6d6e6';
            ctx.fillRect(0, 200, w, h - 200);
            blendSeam(ctx, 0, 206, w, '#a8cbe8', '#c6d6e6');
            ctx.fillStyle = '#dae6f0';
            ctx.fillRect(0, 248, w, h - 248);
            blendSeam(ctx, 0, 242 + 8, w, '#c6d6e6', '#dae6f0');
            ctx.fillStyle = '#eef4fa';
            ctx.fillRect(0, 312, w, h - 312);
            blendSeam(ctx, 0, 304 + 8, w, '#dae6f0', '#eef4fa');
            // Cloud heaps, three tones each
            const cl = seededRandom(2626);
            for (let i = 0; i < 22; i++) {
                const cx2 = cl() * w, cy2 = 210 + cl() * 150, r = 16 + cl() * 34;
                ctx.fillStyle = '#b6c8dc';
                ctx.beginPath(); ctx.ellipse(cx2, cy2 + 4, r, r * 0.44, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#dce8f2';
                ctx.beginPath(); ctx.ellipse(cx2, cy2, r * 0.92, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath(); ctx.ellipse(cx2 - r * 0.24, cy2 - r * 0.14, r * 0.45, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            }

            // ---- The roofless hall ----
            ctx.fillStyle = '#6b7482';
            [70, 206, 470, 596].forEach((px, i) => {
                const ph = 190 - Math.abs(i - 1.5) * 14;
                ctx.fillStyle = '#2f3540';
                ctx.fillRect(px - 22, 250 - ph, 44, ph);
                ctx.fillStyle = '#79828f';
                ctx.fillRect(px - 19, 250 - ph, 38, ph);
                ctx.fillStyle = '#98a2b0';
                ctx.fillRect(px - 19, 250 - ph, 12, ph);
                ctx.fillStyle = '#4c5462';
                ctx.fillRect(px + 8, 250 - ph, 11, ph);
                // Fluting
                ctx.fillStyle = '#5f6875';
                for (let f = -14; f < 16; f += 7) ctx.fillRect(px + f, 250 - ph, 1.6, ph);
                // Capital and base
                ctx.fillStyle = '#2f3540';
                ctx.fillRect(px - 27, 250 - ph - 12, 54, 13);
                ctx.fillRect(px - 26, 244, 52, 12);
                ctx.fillStyle = '#98a2b0';
                ctx.fillRect(px - 27, 250 - ph - 12, 54, 4);
                ctx.fillRect(px - 26, 244, 52, 4);
            });
            // The shield hangs on the back wall between the middle columns
            ctx.fillStyle = '#2f3540';
            ctx.fillRect(232, 96, 216, 150);
            ctx.fillStyle = '#5c6472';
            ctx.fillRect(236, 100, 208, 142);
            stoneWall(ctx, 236, 100, 208, 142, 1818, '#8b95a4', '#6b7482', '#474f5c', '#353c47');
            if (!eng.hasItem('shield_of_ardor')) {
                ctx.fillStyle = '#2b2f36';
                ctx.fillRect(334, 128, 6, 14);
                drawShieldOfArdor(ctx, 340, 168, 1.5, eng.animTimer);
                eng.lightPool(ctx, 340, 168, 90, '255,240,190', 0.16);
            } else {
                ctx.fillStyle = '#2b2f36';
                ctx.fillRect(334, 128, 6, 14);
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.arc(340, 168, 27, 0, Math.PI * 2); ctx.fill();
            }
            // A drinking horn and a mutton bone, giant-sized
            ctx.fillStyle = '#1d1a14';
            ctx.beginPath();
            ctx.moveTo(112, 300); ctx.quadraticCurveTo(180, 268, 208, 296);
            ctx.quadraticCurveTo(176, 302, 112, 314);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8a7a52';
            ctx.beginPath();
            ctx.moveTo(116, 302); ctx.quadraticCurveTo(180, 272, 204, 296);
            ctx.quadraticCurveTo(176, 300, 116, 311);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#b0a074';
            ctx.beginPath();
            ctx.moveTo(116, 302); ctx.quadraticCurveTo(174, 276, 196, 293);
            ctx.quadraticCurveTo(170, 294, 116, 306);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GOLD_SHADOW;
            ctx.fillRect(112, 296, 10, 20);

            // ---- The ring's effect, if worn ----
            if (eng.getFlag('ring_worn')) {
                ctx.fillStyle = 'rgba(220,232,244,0.22)';
                ctx.fillRect(0, 200, w, h - 200);
                for (let i = 0; i < 40; i++) {
                    const mx = (i * 71 + eng.animTimer / 30) % w;
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect(mx, 240 + (i % 9) * 16, 22, 2);
                }
            }
            eng.vignette(ctx, 0.28, '120,150,190');
        },
        hotspots: [
            {
                name: 'the giant', x: 200, y: 240, w: 320, h: 110, walkToX: 200,
                description: 'A sleeping giant the length of a barn, in a leather apron, snoring in a slow way that moves the cloud.',
                talk: (e) => e.showMessage('You say nothing at all, very carefully.'),
                get: (e) => e.showMessage('No.'),
                use: (e) => e.showMessage('No.'),
                useItem: (e, itemId) => {
                    if (itemId === 'ring_of_mist') { wearRing(e); return; }
                    e.showMessage('Waving anything at a sleeping giant is a decision, and not a good one.');
                }
            },
            {
                name: 'the Shield of Ardor', x: 306, y: 136, w: 68, h: 68, walkToX: 232,
                description: 'A round shield of white metal on the wall, warm even from here. One of the three treasures of Alderhaven, hung up like a dinner plate.',
                useItem: (e, itemId) => {
                    if (itemId === 'ring_of_mist') { wearRing(e); return; }
                    e.showMessage('That does nothing for the shield, or for your chances.');
                },
                get: (e) => {
                    if (!e.getFlag('ring_worn')) {
                        e.die('You cross the hall in the open. The giant\'s hand comes down on you like a shutter in a gale, and he never does wake up, which somehow makes it worse.');
                        return;
                    }
                    e.addToInventory('shield_of_ardor');
                    e.addScore(25);
                    e.sound.scoreUp();
                    e.updateInventoryUI();
                    e.showMessage('You lift the shield off its peg. It is warm, and it is far lighter than it has any business being, and the giant snores on through the whole business without ever knowing you were in the room.');
                },
                get hidden() { return engine.hasItem('shield_of_ardor'); }
            },
            {
                name: 'the ring of mist', x: 40, y: 250, w: 160, h: 120, walkToX: 110,
                description: 'The grey band Fennow gave you, still difficult to look at directly.',
                use: (e) => wearRing(e),
                get: (e) => wearRing(e),
                useItem: (e) => wearRing(e),
                get hidden() { return !engine.hasItem('ring_of_mist') || engine.getFlag('ring_worn'); }
            },
            {
                name: 'the drinking horn', x: 108, y: 268, w: 104, h: 50,
                description: 'A drinking horn you could bathe in, banded in gold, with about a barrel of something still in the bottom of it.',
                get: (e) => e.showMessage('You could not lift the empty end of it.'),
                useItem: (e, itemId) => {
                    if (itemId === 'ring_of_mist') { wearRing(e); return; }
                    e.showMessage('The horn is not interested.');
                }
            },
            {
                name: 'the columns', x: 40, y: 60, w: 180, h: 190,
                description: 'Columns of grey stone holding up nothing whatsoever. Whatever roof they had is somewhere below the cloud.',
                useItem: (e, itemId) => {
                    if (itemId === 'ring_of_mist') { wearRing(e); return; }
                    e.showMessage('The columns remain columns.');
                }
            },
            {
                name: 'the beanstalk', x: 40, y: 300, w: 60, h: 72, isExit: true, walkToX: 76,
                description: 'The top of the beanstalk, curling over the cloud edge. Going down is going to be worse than coming up.',
                onExit: (e) => e.goToRoom('troll_bridge', 500, 344)
            }
        ]
    });

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
                drawDragon(ctx, 310, 346, 1.45, eng.animTimer, eng.getFlag('dragon_doused'));
            });
        },
        onUpdate: (e) => {
            if (e.dead || e.cutscene || e.sequence || e.getFlag('dragon_doused')) return;
            if (e.playerX < 380) {
                e.die('The dragon opens one eye, which is the size of your head, and then its mouth, which is not. There is a brief noise like a forge door and then there is no more Rowan at all.');
            }
        },
        draw: (ctx, w, h, eng) => {
            const doused = eng.getFlag('dragon_doused');
            const lit = doused ? '#4a4650' : '#7a5c4c';
            const base = doused ? '#332f3c' : '#523a30';
            const shade = doused ? '#1d1b26' : '#2e1f1a';
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
            if (doused) {
                ctx.fillStyle = '#1a1614';
                ctx.beginPath(); ctx.ellipse(216, 344, 58, 16, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2d2724';
                for (let i = 0; i < 20; i++) {
                    const a = i * 1.3;
                    ctx.fillRect(216 + Math.cos(a) * (10 + i * 2), 340 + Math.sin(a) * (4 + i * 0.5), 5, 3);
                }
                // Steam, rising in slow deterministic puffs
                for (let i = 0; i < 6; i++) {
                    const p = (eng.animTimer / 500 + i * 1.1) % 6;
                    ctx.fillStyle = `rgba(226,232,238,${0.3 - p * 0.045})`;
                    ctx.beginPath();
                    ctx.ellipse(170 + i * 20, 336 - p * 22, 9 + p * 5, 6 + p * 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
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

            // ---- The hoard ----
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
            if (!eng.hasItem('mirror_of_ianthe')) {
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
            mouth(6, '#2f4a28');
            mouth(12, '#6f8a5c');
            mouth(20, '#a8c48a');
            // Daylight spilling back onto the cave floor
            lightShaft(ctx, 596, 268, 40, 574, 372, 92, 0.16, 'rgba(200,240,170,1)');

            eng.vignette(ctx, doused ? 0.6 : 0.42, doused ? '6,6,12' : '40,8,4');
        },
        hotspots: [
            {
                name: 'the dragon', x: 180, y: 240, w: 260, h: 110, walkToX: 420,
                description: 'A dragon curled round a fire pit like a cat round a hearth. It is the size of the cottage on the green and it is breathing very slowly.',
                talk: (e) => e.showMessage('"Hello," you say. The dragon does not open its eyes. "Mm," it says, and the temperature in the cave goes up.'),
                get: (e) => e.showMessage('You are not taking a dragon anywhere.'),
                use: (e) => e.showMessage('You would have to be closer, and being closer is the entire problem.')
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
                    e.addScore(25);
                    e.runSequence([
                        'You throw the whole pail from as far back as you can and still hit anything.',
                        (eng) => { eng.sound.splash(); eng.shake(7); },
                        500,
                        (eng) => { eng.sound.dragonRoar(); },
                        'The fire goes out with a noise like a slammed door, and the cave goes dark, and something enormous comes off the floor very fast indeed.',
                        700,
                        'The dragon backs against the far wall with its wings clamped flat, staring at the steaming pit, absolutely appalled. It has kept that fire alight for four hundred years and a scullery boy has just ended it with a bucket.',
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
                    if (!e.getFlag('dragon_doused')) {
                        e.die('You go for the mirror. You get four steps. The dragon does not even need to stand up.');
                        return;
                    }
                    e.addToInventory('mirror_of_ianthe');
                    e.addScore(25);
                    e.sound.scoreUp();
                    e.updateInventoryUI();
                    e.showMessage('You lift the mirror out of the coins. In the glass you see yourself a heartbeat later than you move, and behind your shoulder, for just that heartbeat, a tower the colour of old honey.');
                },
                get hidden() { return engine.hasItem('mirror_of_ianthe'); }
            },
            {
                name: 'the way out', x: 566, y: 222, w: 62, h: 150, isExit: true, walkToX: 578,
                description: 'Green daylight, and the wood beyond it.',
                onExit: (e) => e.goToRoom('dark_wood', 132, 300)
            }
        ]
    });
});
