// ============================================================
// CROWN QUEST - ACT II: THE BRIDGE
// ============================================================

CrownQuest.defineRooms((engine) => {
    const { followingGoat, GOAT_AT, goatHotspot, alderhavenSky, FAR_LIP, NEAR_LIP, SPAN, spanX, spanHalf, bridgeCrossing } = CrownQuest.shared.alderhaven;

    // Painted-scenery trial. The picture's gorge sits a little higher and its
    // span a little longer than the procedural one, so the live actors (troll,
    // goat charge, beanstalk) are drawn through one uniform map from the
    // procedural span onto the painted one, and the floor uses painted numbers.
    let paintedBridge = false;
    const bridgeImage = new Image();
    const MAP = { scale: 1.127, cx: 327, dy: -72.2 };
    const mapX = (x) => MAP.cx + (x - MAP.cx) * MAP.scale;
    const PAINTED_SPAN = { nearX: mapX(SPAN.nearX), nearY: 320, farX: mapX(SPAN.farX), farY: 160 };
    const paintedSpanX = (t) => PAINTED_SPAN.nearX + (PAINTED_SPAN.farX - PAINTED_SPAN.nearX) * t;
    const PAINTED_FAR_BANK_Y = 158;
    const PAINTED_BEANSTALK_X = Math.round(mapX(527));
    function paintedCrossing(e) {
        return e.playerY > 168
            ? [{ walk: [null, 330] }, { walk: [Math.round(PAINTED_SPAN.nearX), 330] }, { walk: [Math.round(PAINTED_SPAN.farX), PAINTED_FAR_BANK_Y] }]
            : [{ walk: [null, PAINTED_FAR_BANK_Y] }, { walk: [Math.round(PAINTED_SPAN.farX), PAINTED_FAR_BANK_Y] }, { walk: [Math.round(PAINTED_SPAN.nearX), 330] }];
    }
    const crossing = (e) => (paintedBridge ? paintedCrossing(e) : bridgeCrossing(e));
    const onFarBank = (e) => e.playerY < (paintedBridge ? 168 : 204);

    function configurePaintedBridge(e) {
        e.setDepthScaling(150, 392, 0.4, 1.1);
        e.setWalkableArea((px, py) => {
            if (py > 318 && py < 392 && px > 20 && px < 620) return true;
            if (!e.getFlag('troll_routed')) return false;
            if (py > 150 && py < 168 && px > 30 && px < 610) return true;
            if (py >= 168 && py <= 322) {
                const t = (PAINTED_SPAN.nearY - py) / (PAINTED_SPAN.nearY - PAINTED_SPAN.farY);
                return Math.abs(px - paintedSpanX(t)) < spanHalf(t) * MAP.scale + 3;
            }
            return false;
        }, 151);
        e.setEdgeTransition('left', (eng) => {
            if (eng.playerY > 318) eng.goToRoom('dark_wood', 580, 354);
        });
        // Coming down the beanstalk lands on the procedural far bank; move to the painted one.
        if (e.playerY > 180 && e.playerY < 210) {
            e.playerX = PAINTED_BEANSTALK_X;
            e.playerY = PAINTED_FAR_BANK_Y;
        }
        const layout = {
            'the gorge': { x: 0, y: 165, w: 640, h: 150 },
            'the bridge': { x: 285, y: 160, w: 90, h: 165, walkToX: 333, walkToY: 330 },
            'Grumbold': { x: 300, y: 214, w: 60, h: 52, walkToX: 333, walkToY: 330 },
            'the beanstalk': {
                x: PAINTED_BEANSTALK_X - 34, y: 0, w: 70, h: 158, walkToX: PAINTED_BEANSTALK_X, walkToY: PAINTED_FAR_BANK_Y
            },
            'the track west': { x: 0, y: 300, w: 40, h: 80, walkToX: 30, walkToY: 340 }
        };
        for (const hotspot of e.rooms.troll_bridge.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        bridgeImage.onload = () => {
            paintedBridge = true;
            if (engine.currentRoomId === 'troll_bridge') configurePaintedBridge(engine);
        };
        bridgeImage.src = 'icons/troll-bridge-trial.png';
    }
    function drawPaintedBridge(ctx, w, h, eng) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bridgeImage, 0, 0, w, h);
        ctx.restore();
        ctx.save();
        ctx.transform(MAP.scale, 0, 0, MAP.scale, MAP.cx - MAP.cx * MAP.scale, MAP.dy);
        drawBridgeActors(ctx, w, eng);
        ctx.restore();
        glints(ctx, 92, 286, 172, 16, eng.animTimer, { seed: 5151, count: 12, rgb: '235,248,255' });
        glints(ctx, 396, 286, 160, 16, eng.animTimer, { seed: 5252, count: 11, rgb: '235,248,255' });
        drawGull(ctx, 120, 60, 1, eng.animTimer, 1.1);
        gullFlight(ctx, 700, -40, 84, 0.7, eng.animTimer, 39000, 0.4);
    }
    /** Everything on the bridge that moves or changes: Grumbold, the goat's
     *  charge, his club, and the beanstalk once the way is clear. Drawn in the
     *  procedural room's coordinates; the painted room maps them onto its span. */
    function drawBridgeActors(ctx, w, eng) {
        // ---- The troll, or the space where he was ----
        if (eng.sequence && eng.bridgeEncounter) {
            const elapsed = Math.max(0, eng.animTimer - eng.bridgeEncounter.startedAt);
            const charge = Math.min(1, elapsed / 1100);
            const fall = Math.max(0, Math.min(1, (elapsed - 1100) / 1000));
            const retreat = Math.max(0, Math.min(1, (elapsed - 2100) / 1100));
            const hitX = spanX(0.36);
            const hitY = bridgeDeckY(SPAN, 0.36, 10);
            if (fall < 1) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, w, NEAR_LIP - 8);
                ctx.clip();
                ctx.translate(hitX + fall * 115, hitY - Math.sin(fall * Math.PI) * 95 + fall * (FAR_LIP + 83 - hitY));
                ctx.rotate(fall * 2.4);
                if (!drawPaintedActor(ctx, 'grumbold', 0, 0, { height: 64 * (1 - fall * 0.6), still: true })) drawTroll(ctx, 0, 0, 0.8 * (1 - fall * 0.6), eng.animTimer, true);
                ctx.restore();
            }
            const travel = charge * (1 - retreat);
            const approach = Math.min(1, travel / 0.65);
            const deck = Math.max(0, (travel - 0.65) / 0.35);
            const goatX = 120 + (332 - 120) * approach + (hitX - 332) * deck;
            const goatY = 366 - approach * 12 + (hitY + 18 - 354) * deck;
            const goatScale = 1.1 - deck * 0.3;
            eng.drawContactShadow(ctx, goatX, goatY, 1, { rx: 22 * goatScale, ry: 4, alpha: 0.26 });
            // A painted goat has one pose, so give the charge a gallop's bounce.
            const bounce = travel > 0 && travel < 1 ? Math.abs(Math.sin(elapsed / 85)) * 3 * goatScale : 0;
            if (!drawPaintedActor(ctx, 'goat', goatX, goatY - bounce, { height: 34 * goatScale, still: true }, retreat > 0 ? -1 : 1)) {
                drawGoat(ctx, goatX, goatY, goatScale, retreat > 0 ? 1 : -1, true, eng.animTimer);
            }
            if (elapsed >= 2100 && elapsed < 2700) {
                const splash = (elapsed - 2100) / 600;
                ctx.fillStyle = '#c8e4ec';
                for (let drop = 0; drop < 9; drop++) {
                    const offset = drop - 4;
                    ctx.fillRect(hitX + 115 + offset * (3 + splash * 6), FAR_LIP + 83 - Math.sin(splash * Math.PI) * (24 - Math.abs(offset) * 3), 3, 3);
                }
            }
        } else if (!eng.getFlag('troll_routed')) {
            const tt = 0.36;
            const ty = bridgeDeckY(SPAN, tt, 10);
            eng.drawContactShadow(ctx, spanX(tt), ty, 1, { rx: 26, ry: 4, alpha: 0.36 });
            if (!drawPaintedActor(ctx, 'grumbold', spanX(tt), ty, { height: 64, t: eng.animTimer, phase: 3 })) drawTroll(ctx, spanX(tt), ty, 0.8, eng.animTimer, false);
        } else {
            // His club, dropped on the near bank where he stopped standing.
            ctx.save();
            ctx.translate(196, 358);
            ctx.rotate(0.4);
            if (!drawPaintedItem(ctx, 'club', 0, 8, 62, 24)) {
                ctx.fillStyle = '#1a1206';
                ctx.fillRect(-26, -5, 52, 10);
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.fillRect(-25, -4, 50, 8);
                ctx.fillStyle = PAL.WOOD_BASE;
                ctx.fillRect(-25, -4, 50, 3);
                ctx.fillStyle = '#1a1206';
                ctx.beginPath(); ctx.arc(24, 0, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = PAL.WOOD_SHADOW;
                ctx.beginPath(); ctx.arc(24, 0, 9, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
        drawRoutedBeanstalk(ctx, eng);
    }

    /** The beanstalk on the far bank, once the way is clear. The painted one
     *  sways a little from its roots. */
    function drawRoutedBeanstalk(ctx, eng) {
        if (eng.getFlag('troll_routed')) {
            ctx.save();
            ctx.translate(530, 206);
            ctx.transform(1, 0, Math.sin(eng.animTimer / 1700) * 0.025, 1, 0, 0);
            const painted = drawPaintedItem(ctx, 'beanstalk', 0, 0, 150, 214);
            ctx.restore();
            if (painted) return;
            ctx.fillStyle = '#16240f';
            ctx.beginPath();
            ctx.moveTo(506, 202);
            ctx.quadraticCurveTo(534, 120, 508, 0);
            ctx.lineTo(548, 0);
            ctx.quadraticCurveTo(568, 120, 546, 202);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#2f6b2c';
            ctx.beginPath();
            ctx.moveTo(512, 202);
            ctx.quadraticCurveTo(538, 120, 512, 0);
            ctx.lineTo(544, 0);
            ctx.quadraticCurveTo(564, 120, 542, 202);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#47913c';
            ctx.beginPath();
            ctx.moveTo(514, 202);
            ctx.quadraticCurveTo(538, 120, 514, 0);
            ctx.lineTo(524, 0);
            ctx.quadraticCurveTo(548, 120, 526, 202);
            ctx.closePath(); ctx.fill();
            // Leaves and coiling tendrils
            for (let i = 0; i < 9; i++) {
                const ly = 14 + i * 21;
                const lx = 512 + Math.sin(i * 0.8) * 22 + 16;
                const side = i % 2 ? 1 : -1;
                ctx.fillStyle = '#16240f';
                ctx.beginPath();
                ctx.ellipse(lx + side * 24, ly, 24, 10, side * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = i % 3 ? PAL.LEAF_BASE : PAL.LEAF_LIT;
                ctx.beginPath();
                ctx.ellipse(lx + side * 24, ly - 1, 21, 8, side * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = PAL.LEAF_SHADOW;
                ctx.fillRect(lx + side * 11, ly - 1, side * 24, 1.4);
            }
            ctx.fillStyle = '#e8eef2';
            ctx.beginPath();
            ctx.ellipse(528, 10, 66, 16, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ================= ROOM 9: THE TROLL BRIDGE =================
    engine.registerRoom({
        id: 'troll_bridge',
        name: 'The Bridge',
        get description() { return engine.getFlag('troll_routed')
            ? 'A rope bridge over a gorge, now clear. On the far bank a beanstalk climbs into the cloud; from the river comes a distant complaint.'
            : 'A rope bridge over a gorge, and something standing in the middle of it that is not going to move.'; },
        get smell() { return engine.getFlag('troll_routed') ? 'River spray and wet rope. A considerable improvement.' : 'River spray, wet rope, and a troll. Chiefly a troll.'; },
        hint: (e) => {
            if (!e.getFlag('troll_routed')) return 'You cannot buy him off and you cannot fight him. But the goat on the village green has horns and no sense of proportion.';
            return 'The beanstalk on the far bank goes up into the cloud.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(190, 392, 0.45, 1.1);
            // Two separate banks. The only join is the span, so the walkable
            // area is built from the same numbers the deck is drawn from.
            e.setWalkableArea((px, py) => {
                if (py > 334 && py < 392 && px > 20 && px < 620) return true;
                if (!e.getFlag('troll_routed')) return false;
                if (py > 186 && py < 204 && px > 30 && px < 610) return true;
                if (py >= 204 && py <= 344) {
                    const t = (SPAN.nearY - py) / (SPAN.nearY - SPAN.farY);
                    return Math.abs(px - spanX(t)) < spanHalf(t) + 3;
                }
                return false;
            }, 188);
            e.setEdgeTransition('left', (eng) => {
                if (eng.playerY > 334) eng.goToRoom('dark_wood', 580, 354);
            });
            followingGoat(e, ...GOAT_AT.troll_bridge);
            if (paintedBridge) configurePaintedBridge(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedBridge) { drawPaintedBridge(ctx, w, h, eng); return; }
            alderhavenSky(ctx, w, 116, eng, 313);
            ctx.drawImage(eng.staticLayer('troll_bridge|far', (ctx, w) => {
                distantRange(ctx, 126, w, 52, 2121, '#8a9db4', 0.9);
                distantRange(ctx, 138, w, 36, 5252, '#75899f', 0.75);

                // ---- Far bank: hazed woodland above turf that runs to the far lip ----
                ctx.fillStyle = '#6f8768';
                ctx.fillRect(0, 152, w, 30);
                for (let i = 0; i < 17; i++) {
                    drawPine(ctx, 6 + i * 40 + (i % 3) * 11, 180 + (i % 4) * 4, 0.3, 900 + i * 37,
                        { deep: '#33482f', base: '#4a6540', shadow: '#3b5335', lit: '#5d7a4c' });
                }
                turfRecession(ctx, 0, 182, w, FAR_LIP + 4, 6363, '#9db4c6');

                // ---- The gorge, running across the screen ----
                // The far wall faces the camera, which is the whole reason this
                // reads as a hole instead of a dark shape lying on the grass.
                ctx.fillStyle = '#05070a';
                ctx.fillRect(0, FAR_LIP, w, NEAR_LIP - FAR_LIP + 4);
                rockFace(ctx, -4, FAR_LIP, w + 8, 74, 4747, '#8b98a6', '#5b6773', '#2b333c');
                // Light falls off down the face, and the base is in full shadow.
                for (let i = 0; i < 12; i++) {
                    ctx.fillStyle = `rgba(6,9,13,${(0.05 + i * 0.07).toFixed(3)})`;
                    ctx.fillRect(0, FAR_LIP + 10 + i * 5, w, 6);
                }
                ctx.fillStyle = '#05070a';
                ctx.fillRect(0, FAR_LIP + 72, w, NEAR_LIP - FAR_LIP);
                // Buttresses breaking the face, so it is not one flat sheet
                [70, 196, 402, 548].forEach((bx, i) => {
                    ctx.fillStyle = 'rgba(9,12,17,0.5)';
                    ctx.beginPath();
                    ctx.moveTo(bx - 26, FAR_LIP); ctx.lineTo(bx + 26, FAR_LIP);
                    ctx.lineTo(bx + 14 + i, FAR_LIP + 76); ctx.lineTo(bx - 18, FAR_LIP + 76);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(150,166,182,0.16)';
                    ctx.fillRect(bx - 26, FAR_LIP + 2, 4, 58);
                });
            }), 0, 0);
            // The river, a long way down and mostly in shadow
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, FAR_LIP + 76, w, 16);
            ctx.clip();
            waterBand(ctx, 0, FAR_LIP + 74, w, 20, eng.animTimer, 999);
            ctx.fillStyle = 'rgba(8,12,18,0.72)';
            ctx.fillRect(0, FAR_LIP + 74, w, 20);
            ctx.restore();
            ctx.fillStyle = '#9fb4c2';
            for (let i = 0; i < 24; i++) {
                const fx = (i * 29 + Math.sin(eng.animTimer / 520 + i) * 3) % w;
                ctx.fillRect(fx, FAR_LIP + 79 + (i % 4) * 3, 3, 1);
            }
            ctx.fillStyle = 'rgba(5,7,10,0.88)';
            ctx.fillRect(0, FAR_LIP + 92, w, NEAR_LIP - FAR_LIP - 88);

            ctx.drawImage(eng.staticLayer('troll_bridge|near', (ctx, w, h) => {
                // ---- Far lip: turf overhanging the drop ----
                const lipJitter = seededRandom(8181);
                for (let x = 0; x < w; x += 2) {
                    const y = FAR_LIP + Math.round(Math.sin(x / 47) * 2 + Math.sin(x / 17.3) * 1.6 + (lipJitter() - 0.5) * 3);
                    ctx.fillStyle = '#4a3a24';
                    ctx.fillRect(x, y, 2, 5);
                    ctx.fillStyle = '#14100a';
                    ctx.fillRect(x, y + 4, 2, 3);
                    ctx.fillStyle = PAL.GRASS_SHADOW;
                    ctx.fillRect(x, y - 3, 2, 3);
                    if (lipJitter() > 0.4) {
                        ctx.fillStyle = PAL.GRASS_LIT;
                        ctx.fillRect(x, y - 3, 2, 1);
                    }
                }

                // ---- The span, running away from the viewer ----
                drawRecedingBridge(ctx, SPAN, 10, 4321);

                // ---- Near lip: overhanging turf, then the near bank ----
                turfRecession(ctx, 0, NEAR_LIP - 2, w, h + 4, 7474, '#a8bccc');
                const nearJitter = seededRandom(9292);
                for (let x = 0; x < w; x += 2) {
                    const y = NEAR_LIP + Math.round(Math.sin(x / 39 + 1.4) * 3 + Math.sin(x / 13.7) * 2 + (nearJitter() - 0.5) * 4);
                    ctx.fillStyle = '#0d0b07';
                    ctx.fillRect(x, y - 8, 2, 8);
                    ctx.fillStyle = '#4a3a24';
                    ctx.fillRect(x, y - 4, 2, 4);
                    ctx.fillStyle = PAL.GRASS_SHADOW;
                    ctx.fillRect(x, y - 8, 2, 4);
                    if (nearJitter() > 0.35) {
                        ctx.fillStyle = PAL.GRASS_LIT;
                        ctx.fillRect(x, y - 8, 2, 2);
                    }
                }
                for (let i = 0; i < 16; i++) {
                    grassClump(ctx, 12 + i * 41, NEAR_LIP + 3 + (i % 3), 0.55, 310 + i);
                }

            }), 0, 0);
            drawBridgeActors(ctx, w, eng);

            drawGull(ctx, 120, 70, 1, eng.animTimer, 1.1);
            eng.vignette(ctx, 0.3, '18,24,28');
        },
        hotspots: [
            // The gorge is listed first on purpose: hotspots resolve last-to-first,
            // so the bridge and Grumbold win any click inside the cut.
            {
                name: 'the gorge', x: 0, y: 206, w: 640, h: 124,
                description: 'A long way down, and then a river with opinions about rocks.'
            },
            // The following goat: an actor, low in the list so props drawn over it win.
            goatHotspot(engine, ...GOAT_AT.troll_bridge),
            {
                name: 'the bridge', x: 288, y: 204, w: 96, h: 150, walkToX: 332,
                get description() { return engine.getFlag('troll_routed')
                    ? 'Planks and rope over a very long drop. Without Grumbold it sags rather less. The way across is clear.'
                    : 'Planks and rope over a very long drop. It sags in the middle, mostly under Grumbold.'; },
                walk: (e) => {
                    if (e.getFlag('troll_routed')) { e.runSequence(crossing(e)); return; }
                    e.die('You step onto the bridge. Grumbold picks you up by the back of your tunic with the air of a man doing a job he has done nine hundred times, and drops you into the gorge. The last thing you hear is the river, and it is not sympathetic.');
                },
                use: (e) => {
                    if (e.getFlag('troll_routed')) { e.runSequence(crossing(e)); return; }
                    e.showMessage('There is a troll standing on it.');
                }
            },
            {
                name: 'Grumbold', x: 300, y: 258, w: 56, h: 56, walkToX: 332,
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
                name: 'the beanstalk', x: 496, y: 0, w: 76, h: 206, isExit: true, walkToX: 500, walkToY: 196,
                description: 'A beanstalk as thick as a cottage, going up through the cloud layer and not coming back down.',
                walk: (e) => e.runSequence([
                    ...(onFarBank(e) ? [] : crossing(e)),
                    { walk: paintedBridge ? [PAINTED_BEANSTALK_X, PAINTED_FAR_BANK_Y] : [500, 196] },
                    (game) => game.goToRoom('cloud_realm', 90, 344)
                ]),
                onExit: (e) => e.goToRoom('cloud_realm', 90, 344),
                get hidden() { return !engine.getFlag('troll_routed'); }
            },
            {
                name: 'the track west', x: 0, y: 300, w: 40, h: 72, isExit: true, walkToX: 44, walkToY: 354,
                description: 'The track back into the wood.',
                onExit: (e) => e.goToRoom('dark_wood', 580, 354)
            }
        ]
    });
});
