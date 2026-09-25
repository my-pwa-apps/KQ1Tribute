// ============================================================
// CROWN QUEST - ACT II: THE HARBOUR ROAD
// ============================================================

CrownQuest.defineRooms((engine) => {
    const { followingGoat, GOAT_AT, goatHotspot, alderhavenSky } = CrownQuest.shared.alderhaven;

    // Painted-scenery trial: a ChatGPT background with the skiff, the distant
    // tower and the gulls still drawn live over it, and the hotspots, floor and
    // obstacles moved to where the picture put them.
    let paintedHarbour = false;
    const harbourImage = new Image();
    const PAINTED_SKIFF = { x: 160, y: 236, scale: 0.6 };
    const PAINTED_TOWER = { x: 66, y: 142, scale: 0.1 };
    function configurePaintedHarbour(e) {
        e.clearForegroundLayers();
        e.clearBarriers();
        e.setDepthScaling(200, 372, 0.5, 1.08);
        // The turf below the beach, plus the road where it climbs out to the right.
        e.setWalkableArea((px, py) => py < 372 && px > 20 && px < 620 &&
            (py > 250 || (px > 520 && py > 250 - (px - 520) * 0.5)), 205);
        e.addBarrier(30, 250, 70, 40);   // the rocks on the left
        e.addBarrier(450, 282, 32, 18);  // the sawn stump
        followingGoat(e, ...GOAT_AT.harbour_road);
        const layout = {
            'the skiff': { x: 110, y: 205, w: 100, h: 42, walkToX: 170, walkToY: 262 },
            'the waymarker': { x: 246, y: 212, w: 42, h: 50, walkToX: 300, walkToY: 272 },
            'the sea': { x: 0, y: 140, w: 640, h: 50 },
            'the town': { x: 480, y: 100, w: 160, h: 70 },
            'the tower': { x: 46, y: 108, w: 40, h: 38 },
            'the shore path west': { x: 0, y: 250, w: 42, h: 90, walkToX: 40, walkToY: 300 },
            'the road inland': { x: 596, y: 196, w: 44, h: 80, walkToX: 600, walkToY: 222 }
        };
        for (const hotspot of e.rooms.harbour_road.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        harbourImage.onload = () => {
            paintedHarbour = true;
            if (engine.currentRoomId === 'harbour_road') configurePaintedHarbour(engine);
        };
        harbourImage.src = 'icons/harbour-road-trial.png';
    }
    function drawPaintedHarbour(ctx, w, h, eng) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(harbourImage, 0, 0, w, h);
        ctx.restore();
        eng.drawContactShadow(ctx, PAINTED_SKIFF.x,         PAINTED_SKIFF.y - 2, 1, { rx: 44, ry: 5, alpha: 0.22 });
                if (!drawPaintedItem(ctx, 'skiff', PAINTED_SKIFF.x, PAINTED_SKIFF.y, 68, 40)) {
            drawSkiff(ctx, PAINTED_SKIFF.x, PAINTED_SKIFF.y, PAINTED_SKIFF.scale, false, eng.animTimer);
        }
        drawAmberTower(ctx, PAINTED_TOWER.x, PAINTED_TOWER.y, PAINTED_TOWER.scale, eng.getFlag('sockets_lit') || 0, eng.animTimer);
        glints(ctx, 0, 148, 500, 38, eng.animTimer, { seed: 3737, count: 24 });
        drawGull(ctx, 300, 76, 1.3, eng.animTimer, 0.4);
        drawGull(ctx, 372, 60, 1, eng.animTimer, 2.1);
        gullFlight(ctx, -40, 700, 110, 0.9, eng.animTimer, 29000, 0.55);
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
            e.setEdgeTransition('right', (eng) => eng.goToRoom('village_green', 60, 354));
            e.setEdgeTransition('left', (eng) => {
                if (!eng.getFlag('has_all_three')) {
                    eng.showMessage('The shore path west runs out toward the headland and the tower nobody in Alderhaven will name. You have nothing yet that would open anything there.', { window: true });
                    eng.playerX = 60;
                    return;
                }
                eng.goToRoom('amber_tower', 580, 336);
            });
            followingGoat(e, ...GOAT_AT.harbour_road);
            // Marram grass on the near dune, for the ego to walk behind.
            e.addForegroundLayer(392, (ctx) => {
                ctx.fillStyle = '#8a8168';
                ctx.beginPath();
                ctx.moveTo(-10, 372); ctx.lineTo(220, 366); ctx.lineTo(400, 380); ctx.lineTo(650, 372);
                ctx.lineTo(650, 400); ctx.lineTo(-10, 400);
                ctx.closePath(); ctx.fill();
                grassFringe(ctx, 0, 378, 640, 5566, 130, '#9ab06a', '#78904c', '#4e6030');
            });
            if (paintedHarbour) configurePaintedHarbour(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedHarbour) { drawPaintedHarbour(ctx, w, h, eng); return; }
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
            ctx.drawImage(eng.staticLayer('harbour_road|shore', (ctx, w, h) => {
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
                turfRecession(ctx, 0, 248, w, h + 4, 5252, '#a9bccb');
                blendSeam(ctx, 0, 252, w, '#7d7563', PAL.GRASS_SHADOW);
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
                // Wheel ruts, a puddle, and clumps so the lawn is not a sandwich
                ctx.fillStyle = '#6a5c42';
                ctx.beginPath();
                ctx.moveTo(80, 370); ctx.lineTo(108, 370); ctx.lineTo(528, 272); ctx.lineTo(512, 270);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#5a4e38';
                ctx.beginPath();
                ctx.moveTo(128, 370); ctx.lineTo(150, 370); ctx.lineTo(548, 273); ctx.lineTo(536, 271);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#3a4a3c';
                ctx.beginPath();
                ctx.ellipse(176, 352, 22, 6, 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6a8894';
                ctx.beginPath();
                ctx.ellipse(176, 351, 16, 4, 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(220,236,240,0.35)';
                ctx.fillRect(168, 349, 8, 1);
                [[210, 318, 1.1, 41], [390, 292, 0.85, 42], [470, 308, 1.0, 43], [88, 336, 1.2, 44], [560, 348, 0.9, 45]]
                    .forEach(([cx, cy, cs, sd]) => grassClump(ctx, cx, cy, cs, sd));
                // Occupied midground: a leaning post and a sawn stump
                ctx.fillStyle = '#1a1206';
                ctx.fillRect(304, 286, 8, 36);
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(305, 287, 6, 34);
                ctx.fillStyle = PAL.WOOD_LIT;
                ctx.fillRect(305, 287, 2, 34);
                ctx.fillStyle = '#1a1206';
                ctx.beginPath(); ctx.ellipse(418, 302, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.beginPath(); ctx.ellipse(418, 300, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = PAL.WOOD_LIT;
                ctx.beginPath(); ctx.ellipse(416, 298, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#3a2a14';
                ctx.beginPath(); ctx.ellipse(418, 300, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
                eng.drawContactShadow(ctx, 418, 306, 1, { rx: 16, ry: 4, alpha: 0.22 });

            }), 0, 0);
            // ---- The skiff, drawn up where you left it ----
            eng.drawContactShadow(ctx, 108, 268, 1, { rx: 52, ry: 7, alpha: 0.24 });
            drawSkiff(ctx, 108, 262, 0.72, false, eng.animTimer);

            ctx.drawImage(eng.staticLayer('harbour_road|inland', (ctx) => {
                // ---- Alderhaven town and castle inland ----
                drawCastle(ctx, 476, 250, 0.66, '#5b6478', '#79839a');
                [[364, 252, 0.5], [416, 254, 0.42], [540, 256, 0.46]].forEach(([bx, by, bs]) => {
                    ctx.fillStyle = '#1a1610';
                    ctx.fillRect(bx - 22 * bs, by - 40 * bs, 44 * bs, 40 * bs);
                    stoneWall(ctx, bx - 20 * bs, by - 38 * bs, 40 * bs, 38 * bs, 800 + bx, '#8f8776', '#726a5b', '#4e483d', '#3b362d');
                    thatchRoof(ctx, bx, by - 62 * bs, 28 * bs, by - 38 * bs, 500 + bx);
                });

                // ---- Waymarker stone ----
                eng.drawContactShadow(ctx, 252, 302, 1, { rx: 24, ry: 5, alpha: 0.26 });
                ctx.save();
                ctx.translate(252, 300);
                ctx.rotate(-0.06);
                ctx.translate(-252, -300);
                ctx.fillStyle = '#1a1815';
                ctx.beginPath();
                ctx.moveTo(232, 300); ctx.lineTo(236, 254); ctx.quadraticCurveTo(250, 240, 264, 252);
                ctx.lineTo(270, 300);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#8d8778';
                ctx.beginPath();
                ctx.moveTo(236, 298); ctx.lineTo(239, 256); ctx.quadraticCurveTo(250, 244, 261, 255);
                ctx.lineTo(266, 298);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#a9a394';
                ctx.beginPath();
                ctx.moveTo(236, 298); ctx.lineTo(239, 256); ctx.quadraticCurveTo(245, 247, 250, 246);
                ctx.lineTo(248, 298);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#5c574b';
                ctx.beginPath();
                ctx.moveTo(258, 296); ctx.lineTo(259, 250); ctx.lineTo(266, 298);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#4a453b';
                ctx.fillRect(242, 264, 15, 2);
                ctx.fillRect(242, 270, 11, 2);
                ctx.fillRect(242, 278, 14, 2);
                ctx.fillStyle = '#5f7a3c';
                for (let i = 0; i < 12; i++) ctx.fillRect(234 + (i % 4) * 9, 284 + (i % 3) * 5, 3, 2);
                ctx.restore();

                // ---- Headland and the tower, west ----
                ctx.fillStyle = '#4e5a68';
                ctx.beginPath();
                ctx.moveTo(0, 244); ctx.lineTo(40, 218); ctx.lineTo(96, 236); ctx.lineTo(120, 250);
                ctx.lineTo(0, 258);
                ctx.closePath(); ctx.fill();
            }), 0, 0);
            drawAmberTower(ctx, 40, 224, 0.2, eng.getFlag('sockets_lit') || 0, eng.animTimer);

            drawGull(ctx, 300, 76, 1.3, eng.animTimer, 0.4);
            drawGull(ctx, 372, 60, 1, eng.animTimer, 2.1);
            drawGull(ctx, 148, 96, 1.1, eng.animTimer, 3.5);
            eng.vignette(ctx, 0.26, '20,24,34');
        },
        hotspots: [
            // The following goat: an actor, low in the list so props drawn over it win.
            goatHotspot(engine, ...GOAT_AT.harbour_road),
            {
                name: 'the skiff', x: 60, y: 232, w: 100, h: 44,
                description: 'The skiff, hauled above the tide line. Its sail is a rag again, and the thimble is empty.',
                use: (e) => e.showMessage('There is no wind left in the thimble, and there was never going to be a second one.')
            },
            {
                name: 'the waymarker', x: 230, y: 240, w: 44, h: 62, walkToX: 288,
                description: 'A leaning waymarker with three lines cut into it. You know ordinary letters from flour sacks, but these are worn past reading.'
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
                name: 'the road inland', x: 598, y: 260, w: 42, h: 112, isExit: true, walkToX: 600, walkToY: 354,
                description: 'The road runs inland toward the village.',
                onExit: (e) => e.goToRoom('village_green', 60, 354)
            }
        ]
    });
});
