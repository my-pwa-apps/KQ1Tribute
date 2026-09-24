// ============================================================
// CROWN QUEST - ACT II: THE VILLAGE GREEN
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    const { followingGoat, GOAT_AT, goatHotspot, alderhavenSky } = CrownQuest.shared.alderhaven;
    // ================= ROOM 6: THE VILLAGE GREEN =================
    engine.registerRoom({
        id: 'village_green',
        name: 'The Village Green',
        description: 'A green with a well on it, a cottage, a peddler\'s cart, and one extremely committed goat.',
        smell: 'Woodsmoke, bread, and goat. Mostly goat.',
        hint: (e) => {
            if (!e.hasItem('rope') && !e.getFlag('rope_tied')) return 'Hattie the peddler has a coil of rope on her cart. Talk to her.';
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
            e.setEdgeTransition('left', (eng) => eng.goToRoom('harbour_road', 580, 354));
            e.setEdgeTransition('right', (eng) => eng.goToRoom('dark_wood', 60, 354));

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
                followingGoat(e, ...GOAT_AT.village_green);
            }
            // Hattie stands in the open in front of her cart. Her feet are below
            // the wheels' ground line, so she correctly occludes them.
            e.addForegroundLayer(352, (ctx, eng2) => {
                eng2.drawContactShadow(ctx, 120, 352, 1, { rx: 21, ry: 5, alpha: 0.26 });
                drawVgaPerson(ctx, 120, 352, vgaPersonScale(eng2, 352, 0.96), Object.assign({}, CAST_HATTIE, {
                    animTimer: eng2.animTimer,
                    phase: 1.7,
                    nearArm: { side: 1, up: 0.28, lo: 0.44 },
                    farArm: { side: -1, up: -0.16, lo: 0.4 }
                }));
            });
        },
        draw: (ctx, w, h, eng) => {
            alderhavenSky(ctx, w, 150, eng, 808);
            // Everything below the drifting clouds that never moves is painted
            // once per rope state; the chimney smoke rises clear of all of it.
            const ropeOnCart = !eng.hasItem('rope') && !eng.getFlag('rope_tied');
            ctx.drawImage(eng.staticLayer(`village_green|scenery|rope_tied:${+eng.getFlag('rope_tied')}|cart_rope:${+ropeOnCart}`, (ctx, w, h) => {
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
                // Hedgerow crowns, jittered in size and height so the treeline is
                // not one row of identical lumps.
                const hedge = seededRandom(2468);
                for (let i = 0; i < 40; i++) {
                    const hx = i * 17 + (hedge() - 0.5) * 12;
                    const hr = 10 + hedge() * 8;
                    const hy = 200 + (hedge() - 0.5) * 7;
                    ctx.fillStyle = PAL.LEAF_DEEP;
                    ctx.beginPath();
                    ctx.ellipse(hx, hy + 2, hr, hr * 0.66, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = hedge() > 0.5 ? PAL.LEAF_SHADOW : PAL.LEAF_BASE;
                    ctx.beginPath();
                    ctx.ellipse(hx, hy, hr * 0.88, hr * 0.58, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = PAL.LEAF_LIT;
                    ctx.beginPath();
                    ctx.ellipse(hx - hr * 0.3, hy - hr * 0.24, hr * 0.42, hr * 0.26, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // ---- Green ----
                turfRecession(ctx, 0, 196, w, h + 4, 4242, '#a4bccd');
                grassFringe(ctx, 0, 262, w, 5151, 80);
                grassFringe(ctx, 0, 316, w, 6161, 110);
                // A trodden path curving from the road to the well, with ruts
                ctx.fillStyle = '#8a7c5e';
                ctx.beginPath();
                ctx.moveTo(0, 348); ctx.lineTo(60, 340); ctx.lineTo(280, 306); ctx.lineTo(276, 298);
                ctx.lineTo(60, 330); ctx.lineTo(0, 336);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#6f6247';
                ctx.beginPath();
                ctx.moveTo(8, 344); ctx.lineTo(24, 342); ctx.lineTo(268, 304); ctx.lineTo(258, 302);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#7a6c50';
                ctx.beginPath();
                ctx.moveTo(30, 350); ctx.lineTo(46, 348); ctx.lineTo(274, 310); ctx.lineTo(266, 308);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#9c8e6c';
                for (let i = 0; i < 18; i++) ctx.fillRect(20 + i * 14, 338 - i * 2.1, 3, 1);
                [[70, 318, 1.15, 61], [200, 328, 1.0, 62], [400, 312, 1.2, 63], [520, 334, 0.95, 64], [610, 308, 0.85, 65], [250, 360, 1.3, 66]]
                    .forEach(([cx, cy, cs, sd]) => grassClump(ctx, cx, cy, cs, sd));
                // Fence post and a watering trough so the midground is occupied
                ctx.fillStyle = '#1a1206';
                ctx.fillRect(600, 268, 9, 42);
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(601, 269, 7, 40);
                ctx.fillStyle = PAL.WOOD_LIT;
                ctx.fillRect(601, 269, 2, 40);
                ctx.fillStyle = '#1a1206';
                ctx.fillRect(586, 278, 36, 5);
                ctx.fillStyle = '#1a1206';
                ctx.fillRect(372, 328, 48, 14);
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.fillRect(374, 330, 44, 10);
                ctx.fillStyle = '#4a6a78';
                ctx.fillRect(376, 332, 40, 5);
                ctx.fillStyle = 'rgba(220,236,240,0.28)';
                ctx.fillRect(378, 332, 12, 1);
                eng.drawContactShadow(ctx, 396, 344, 1, { rx: 26, ry: 4, alpha: 0.18 });

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
                // Chimney and smoke. The stack is sunk to the thatch surface at its
                // downhill edge, so it cannot float off the slope.
                const chimBase = roofSurfaceY(98, 128, 92, 182, 160) + 6;
                ctx.fillStyle = '#3a352c';
                ctx.fillRect(138, 106, 24, chimBase - 106);
                ctx.fillStyle = '#5a5346';
                ctx.fillRect(140, 108, 20, chimBase - 110);
                ctx.fillStyle = '#847b68';
                ctx.fillRect(140, 108, 7, chimBase - 110);
                ctx.fillStyle = '#2a251e';
                ctx.fillRect(138, 106, 24, 4);
                // Thatch packed up against the stack where it passes through
                ctx.fillStyle = '#3a2c12';
                ctx.beginPath();
                ctx.moveTo(134, roofSurfaceY(98, 128, 92, 182, 134) + 2);
                ctx.lineTo(166, chimBase - 2);
                ctx.lineTo(166, chimBase + 4);
                ctx.lineTo(134, roofSurfaceY(98, 128, 92, 182, 134) + 8);
                ctx.closePath();
                ctx.fill();
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

            }), 0, 0);
            for (let i = 0; i < 5; i++) {
                const p = (eng.animTimer / 700 + i * 1.3) % 6;
                ctx.fillStyle = `rgba(210,210,214,${0.26 - p * 0.04})`;
                ctx.beginPath();
                ctx.ellipse(150 + p * 8, 104 - p * 11, 6 + p * 3.4, 4 + p * 2.4, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- Background villager, going about her day ----
            eng.drawContactShadow(ctx, 566, 288, 1, { rx: 13, ry: 3, alpha: 0.2 });
            drawVgaPerson(ctx, 566, 288, vgaPersonScale(eng, 288, 0.94), Object.assign({}, CAST_VILLAGER, {
                animTimer: eng.animTimer,
                phase: 0.4,
                nearArm: { side: 1, up: 0.1 + Math.sin(eng.animTimer / 900) * 0.16, lo: 0.3 },
                farArm: { side: -1, up: -0.1, lo: 0.36 }
            }));

            eng.vignette(ctx, 0.24, '24,26,20');
        },
        hotspots: [
            // The following goat: an actor, low in the list so props drawn over it win.
            goatHotspot(engine, ...GOAT_AT.village_green),
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
                    RULES.award(e, 'rope_tied');
                    e.updateInventoryUI();
                    e.sound.metalScrape();
                    e.showMessage('You make the rope fast to the windlass with a knot Hattie showed you twice and you got right on the third go. It hangs down into the dark and stops swinging.');
                }
            },
            {
                name: 'Hattie', x: 98, y: 298, w: 46, h: 58, walkToX: 210,
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
                talk: (e) => {
                    RULES.award(e, 'villager_greeted');
                    e.showMessage('"Morning," she says, and keeps walking. In eleven years nobody has said that to you.');
                }
            },
            {
                name: 'the road west', x: 0, y: 302, w: 40, h: 70, isExit: true, walkToX: 40, walkToY: 354,
                description: 'The road back down to the harbour and the shore.',
                onExit: (e) => e.goToRoom('harbour_road', 580, 354)
            },
            {
                name: 'the wood', x: 600, y: 302, w: 40, h: 70, isExit: true, walkToX: 600, walkToY: 354,
                description: 'A track east, into trees that stand closer together than trees ought to.',
                onExit: (e) => e.goToRoom('dark_wood', 60, 354)
            }
        ]
    });
});
