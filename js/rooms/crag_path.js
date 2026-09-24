// ============================================================
// CROWN QUEST - ACT I: SERPENT'S CRAG
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;

    let paintedCrag = false;
    const cragImage = new Image();
    function drawCragBoulder(ctx, e) {
        ctx.drawImage(e.staticLayer('crag_path|painted-boulder', (mask) => {
            mask.beginPath();
            const points = [[380, 280], [388, 229], [407, 192], [442, 182], [479, 190],
                [516, 208], [551, 218], [583, 228], [606, 264], [614, 300],
                [581, 314], [521, 320], [491, 326], [441, 326], [409, 312], [372, 302]];
            mask.moveTo(...points[0]);
            for (const point of points.slice(1)) mask.lineTo(...point);
            mask.closePath();
            mask.clip();
            mask.imageSmoothingEnabled = false;
            mask.drawImage(cragImage, 0, 0, 640, 400);
        }), 0, 0);
    }
    function configurePaintedCrag(e) {
        e.clearBarriers();
        e.setWalkableArea((px, py) => py > 164 && py < 372 && px > 24 && px < 616 &&
            (py >= 258 || px < 170 + Math.max(0, py - 170) * 1.5), 165);
        e.setDepthScaling(165, 372, 0.48, 1.1);
        e.addBarrier(390, 238, 222, 70);
        e.addForegroundLayer(304, drawCragBoulder);
        const layout = {
            'the boulder': { x: 382, y: 182, w: 232, h: 144, walkToX: 366, walkToY: 292 },
            'the house': { x: 12, y: 10, w: 171, h: 156, walkToX: 135, walkToY: 178 },
            'the sea': { x: 285, y: 140, w: 96, h: 110 },
            'the distant castle': { x: 515, y: 78, w: 70, h: 34 },
            'the skiff': { x: 550, y: 326, w: 80, h: 46, walkToX: 590, walkToY: 346 },
            'the gorse': { x: 20, y: 274, w: 74, h: 64 },
            'the path back to the house': { x: 42, y: 172, w: 112, h: 78, walkToX: 135, walkToY: 178 }
        };
        for (const hotspot of e.rooms.crag_path.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    function drawPaintedCragEncounter(ctx, w, h, progress, elapsed) {
        ctx.drawImage(cragImage, 0, 0, w, h);
        const approach = Math.max(0, Math.min(1, (progress - 0.04) / 0.48));
        const climb = Math.max(0, Math.min(1, (progress - 0.52) / 0.38));
        const groundX = 620 - approach * 300 - climb * 185;
        const groundY = 346 - climb * 168;
        if (progress < 0.92) {
            const scale = vgaPersonScale(engine, groundY, 1.5);
            const stride = Math.sin(elapsed / 260) * 0.3;
            engine.drawContactShadow(ctx, groundX, groundY, scale);
            drawVgaPerson(ctx, groundX, groundY, scale, Object.assign({}, CAST_MORVANE, {
                animTimer: elapsed,
                nearArm: { side: 1, up: 0.4 + stride, lo: 0.2 },
                farArm: { side: -1, up: -0.3 - stride, lo: 0.3 }
            }));
            if (groundY < 304) drawCragBoulder(ctx, engine);
        }
        engine.applyClassicSceneRaster(ctx);
        cutsceneCaption(ctx, w, h, progress < 0.3
            ? 'Something is coming up the path.'
            : progress < 0.62
                ? 'Morvane climbs past, close enough to touch, and does not look aside once.'
                : 'The door of the house opens, and closes, and you can breathe again.', 1);
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        cragImage.onload = () => {
            paintedCrag = true;
            if (engine.currentRoomId === 'crag_path') configurePaintedCrag(engine);
        };
        cragImage.src = 'icons/crag-trial.png';
    }

    /** A room's own hotspot, for parser verbs that answer through it. */
    const spot = (roomId, name) => engine.rooms[roomId].hotspots.find((h) => h.name === name);
    // ================= ROOM 4: THE CRAG PATH =================
    engine.registerRoom({
        id: 'crag_path',
        name: 'Serpent\'s Crag',
        description: 'The cliff path down to the cove. Grey sea on three sides and a sky the colour of a held breath.',
        smell: 'Salt, wet rock, and gorse. The first clean air of your life.',
        verbs: {
            hide: (e) => spot('crag_path', 'the boulder').use(e),
            sail: (e) => {
                const skiff = spot('crag_path', 'the skiff');
                if (e.hasItem('thimble')) skiff.useItem(e, 'thimble'); else skiff.use(e);
            }
        },
        hint: (e) => {
            if (!e.getFlag('morvane_passed')) return 'Something is coming up the path. Get behind the boulder, and do it now.';
            if (!e.hasItem('thimble')) return 'The skiff is becalmed. You need a wind, and you know exactly where to find one.';
            return 'Use the Thimble of Storms on the skiff.';
        },
        onEnter: (e, { restoring = false } = {}) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(250, 372, 0.62, 1.1);
            e.setWalkableArea((px, py) => py > 236 && py < 372 && px > 24 && px < 616);
            e.addBarrier(408, 250, 130, 60);
            e.addForegroundLayer(346, (ctx, eng) => {
                const elapsed = eng.getCounter('crag_timer');
                if (eng.getFlag('morvane_passed') || elapsed < 6000) return;
                const approach = Math.min(1, (elapsed - 6000) / 3000);
                const groundX = 600 - approach * 230;
                const scale = vgaPersonScale(eng, 346, paintedCrag ? 1.5 : 1.08);
                eng.drawContactShadow(ctx, groundX, 346, scale);
                drawVgaPerson(ctx, groundX, 346, scale, Object.assign({}, CAST_MORVANE, {
                    animTimer: eng.animTimer,
                    nearArm: { side: 1, up: 0.4, lo: 0.2 },
                    farArm: { side: -1, up: -0.3, lo: 0.3 }
                }));
            });
            if (paintedCrag) configurePaintedCrag(e);
            // The approach restarts each time Rowan steps back out onto the path,
            // so returning from the house is never an instant death.
            if (!restoring) {
                e.setFlag('crag_timer', 0);
                e.setFlag('crag_nudged', false);
            }
            if (!e.getFlag('morvane_passed') && !e.getFlag('morvane_warned')) {
                e.setFlag('morvane_warned');
                e.showMessage('The wind off the sea hits you like a door opening. Then, from somewhere below the shoulder of the path, you hear a stick strike stone. Once. Then again, closer.', { window: true, priority: true });
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
                e.runSequence([
                    1600,
                    (game) => game.die('Morvane comes round the shoulder of the path and stops. For a long moment he simply looks at you standing in the open. "Ah," he says. Nothing after that is worth writing down.')
                ]);
            }
        },
        draw: (ctx, w, h, eng) => {
            // ---- Sky and sea ----
            if (paintedCrag) {
                ctx.drawImage(cragImage, 0, 0, w, h);
                return;
            }
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
            // The stack is sunk to the thatch surface at its downhill edge, so
            // it cannot drift off the slope and float.
            const chimBase = roofSurfaceY(88, 84, 70, 124, 136) + 6;
            ctx.fillStyle = '#191622';
            ctx.fillRect(114, 58, 22, chimBase - 58);
            ctx.fillStyle = '#2a2530';
            ctx.fillRect(116, 60, 18, chimBase - 62);
            ctx.fillStyle = '#413a4e';
            ctx.fillRect(116, 60, 6, chimBase - 62);
            ctx.fillStyle = '#3a2c12';
            ctx.beginPath();
            ctx.moveTo(110, roofSurfaceY(88, 84, 70, 124, 110) + 2);
            ctx.lineTo(140, chimBase - 2);
            ctx.lineTo(140, chimBase + 4);
            ctx.lineTo(110, roofSurfaceY(88, 84, 70, 124, 110) + 8);
            ctx.closePath();
            ctx.fill();
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
                    RULES.award(e, 'morvane_passed');
                    e.playCutscene({
                        duration: 7000,
                        draw: (c, cw, ch, progress, elapsed) => paintedCrag
                            ? drawPaintedCragEncounter(c, cw, ch, progress, elapsed)
                            : cutsceneMorvanePasses(c, cw, ch, progress, elapsed),
                        onEnd: () => {
                            engine.showMessage('He goes into the house. High above, the observatory shutter opens: his evening watch, behind a locked door. The lower rooms are clear if you forgot anything. The path to the cove is open.', { window: true });
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
                name: 'the house', x: 26, y: 60, w: 124, h: 166, isExit: true, walkToX: 90,
                description: 'Morvane\'s house, squat against the wind. The path on your left leads back up to its front door.',
                onExit: (e) => e.goToRoom('study', 560, 330)
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
                get description() { return paintedCrag
                    ? 'The path on the right descends to the cove. Your fishing skiff waits out of sight on the shingle below, its sail hanging limp. There is not a breath of wind down there.'
                    : 'A fishing skiff drawn up on the shingle below, its sail hanging like wet washing. There is not a breath of wind in the cove.'; },
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
                    if (!e.hasItem('bread') || !e.hasItem('pail')) {
                        e.showMessage('One wind, one crossing. Before you leave this shore for good, fetch your bread and water pail from the scullery. A free boy will still need to eat and carry water.');
                        return;
                    }
                    e.removeFromInventory('thimble');
                    e.updateInventoryUI();
                    RULES.award(e, 'sailed');
                    e.playCutscene({
                        duration: 9000,
                        draw: (c, cw, ch, progress, elapsed) => cutsceneSailAway(c, cw, ch, progress, elapsed),
                        onEnd: () => {
                            engine.goToRoom('harbour_road', 120, 336);
                            engine.showMessage('The keel grates on shingle on the far shore. You step out onto Alderhaven with a stolen book, your old pail, and no plan whatsoever.', { window: true });
                        }
                    });
                }
            },
            {
                name: 'the gorse', x: 40, y: 250, w: 60, h: 34,
                description: 'Gorse, thrift and sea pink, all of it flattened permanently eastward by the wind.'
            },
            {
                name: 'the path back to the house', x: 0, y: 330, w: 120, h: 60, isExit: true, walkToX: 100,
                description: 'The path back up to the house.',
                onExit: (e) => e.goToRoom('study', 560, 330)
            }
        ]
    });

    // "Use thimble" on its own means the one thing a bottled storm is for.
    engine.items.thimble.use = (e) => {
        if (e.currentRoomId === 'crag_path') { engine.rooms.crag_path.verbs.sail(e); return; }
        e.showMessage('The storm in the thimble strains toward open water. Not here.');
    };
});
