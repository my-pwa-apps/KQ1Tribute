// ============================================================
// CROWN QUEST - ACT II: THE DARK WOOD
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    const { followingGoat, GOAT_AT, goatHotspot } = CrownQuest.shared.alderhaven;
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
            e.setEdgeTransition('left', (eng) => eng.goToRoom('village_green', 580, 354));
            e.setEdgeTransition('right', (eng) => eng.goToRoom('troll_bridge', 60, 354));
            followingGoat(e, ...GOAT_AT.dark_wood);

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
            // Fennow only shows himself after the hare is loose.
            e.addForegroundLayer(322, (ctx, eng) => {
                if (!eng.getFlag('hare_freed')) return;
                eng.drawContactShadow(ctx, 452, 322, 1, { rx: 17, ry: 4, alpha: 0.24 });
                drawVgaPerson(ctx, 452, 322, vgaPersonScale(eng, 322, 0.92), Object.assign({}, CAST_FENNOW, {
                    animTimer: eng.animTimer,
                    phase: 2.9,
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
            // Gnarly branch silhouettes and twig breaks cutting across the sky openings
            ctx.fillStyle = '#0d0f0a';
            const brGen = seededRandom(7722);
            for (let bx = 16; bx < w + 20; bx += 46) {
                const reach = 22 + brGen() * 26;
                const by = 40 + (bx % 3) * 6;
                ctx.beginPath();
                ctx.moveTo(bx - 3, by);
                ctx.lineTo(bx + 3, by);
                ctx.lineTo(bx + 7, by + reach);
                ctx.lineTo(bx + 3, by + reach);
                ctx.closePath();
                ctx.fill();
                // Forked twig
                ctx.beginPath();
                ctx.moveTo(bx + 4, by + reach * 0.45);
                ctx.lineTo(bx - 7, by + reach * 0.8);
                ctx.lineTo(bx - 5, by + reach * 0.8 + 2);
                ctx.closePath();
                ctx.fill();
                // Small leaf clusters breaking the silhouette
                for (let li = 0; li < 4; li++) {
                    ctx.fillRect(bx + 3 + li * 2 - (li % 2 ? 3 : 0), by + reach - 2 + (li % 3) * 2, 4, 3);
                }
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
            // The following goat: an actor, low in the list so props drawn over it win.
            goatHotspot(engine, ...GOAT_AT.dark_wood),
            {
                name: 'the great oak', x: 168, y: 200, w: 106, h: 148,
                get description() { return engine.hasItem('parchment')
                    ? 'An oak with a trunk like a wall. A small nail hole marks where you found the parchment.'
                    : 'An oak with a trunk like a wall, and something pale nailed to it at head height.'; }
            },
            {
                name: 'the parchment', x: 192, y: 282, w: 46, h: 42, walkToX: 272,
                description: 'A scrap of parchment nailed to the oak, weathered nearly blank.',
                look: (e) => {
                    if (e.hasItem('parchment')) { e.showMessage('You have it already. It still says EBRAHDNEM, and it still refuses to mean anything.'); return; }
                    e.sound.pickup();
                    e.addToInventory('parchment');
                    e.showMessage('You work the nail out. You learned ordinary letters from flour sacks; slowly, you make these out: EBRAHDNEM. Written backwards, in a spidery hand. Somebody wanted this remembered and did not want it read.');
                },
                get: (e) => e.rooms.dark_wood.hotspots.find(hotspot => hotspot.name === 'the parchment').look(e),
                get hidden() { return engine.hasItem('parchment'); }
            },
            {
                name: 'the hare', x: 372, y: 322, w: 60, h: 40, walkToX: 350,
                description: 'A hare with a brass snare drawn tight round one hind leg. It has stopped struggling, which is worse.',
                get: (e) => {
                    if (e.getFlag('hare_freed')) { e.showMessage('It is loose. It has not gone far.'); return; }
                    e.setFlag('hare_freed');
                    RULES.award(e, 'hare_freed');
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
                get description() { return engine.getFlag('has_ring')
                    ? 'Fennow waits beneath the oak, turning a leaf between his fingers. He seems in no hurry to leave you to your mistakes.'
                    : 'A slight figure in green who was certainly not standing there a moment ago, and whose ears come to a definite point.'; },
                talk: (e) => e.startDialog('fennow'),
                get: (e) => e.showMessage('He steps out of the way without appearing to move.'),
                get hidden() { return !engine.getFlag('hare_freed'); }
            },
            {
                name: 'the toadstools', x: 272, y: 350, w: 60, h: 26,
                description: 'A ring of red toadstools. Hattie would have opinions about standing inside it.',
                get: (e) => e.showMessage('You have eaten some strange things in Morvane\'s scullery. You draw the line here.')
            },
            {
                name: 'the cave mouth', x: 72, y: 154, w: 100, h: 108, isExit: true, walkToX: 132, walkToY: 300,
                description: 'A black opening in the rock, taller than the trees around it. Warm air comes out of it, which in a wood this cold is deeply wrong.',
                walk: (e) => e.runSequence([
                    { walk: [null, 354] },
                    { walk: [132, 354] },
                    { walk: [132, 300] },
                    (game) => game.goToRoom('dragon_cave', 560, 340)
                ]),
                onExit: (e) => e.goToRoom('dragon_cave', 560, 340)
            },
            {
                name: 'the track west', x: 0, y: 300, w: 40, h: 72, isExit: true, walkToX: 44, walkToY: 354,
                description: 'The track back to the village green.',
                onExit: (e) => e.goToRoom('village_green', 580, 354)
            },
            {
                name: 'the track east', x: 600, y: 300, w: 40, h: 72, isExit: true, walkToX: 596, walkToY: 354,
                description: 'The track east, toward the sound of water.',
                onExit: (e) => e.goToRoom('troll_bridge', 60, 354)
            }
        ]
    });
});
