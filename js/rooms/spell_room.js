// ============================================================
// CROWN QUEST - ACT I: THE HIDDEN ROOM
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;

    let paintedHiddenRoom = false;
    const hiddenRoomImage = new Image();
    function configurePaintedHiddenRoom(e) {
        e.clearBarriers();
        e.addBarrier(58, 286, 128, 42);
        e.addBarrier(462, 240, 92, 62);
        const layout = {
            'the alcove': { x: 256, y: 88, w: 128, h: 144 },
            'the shelves': { x: 20, y: 50, w: 152, h: 128 },
            'the lectern': { x: 462, y: 171, w: 96, h: 132, walkToX: 442, walkToY: 330 },
            'the stair up': { x: 560, y: 34, w: 74, h: 270, walkToX: 584, walkToY: 330 }
        };
        for (const hotspot of e.rooms.spell_room.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        hiddenRoomImage.onload = () => {
            paintedHiddenRoom = true;
            if (engine.currentRoomId === 'spell_room') configurePaintedHiddenRoom(engine);
        };
        hiddenRoomImage.src = 'icons/hidden-room-trial.png';
    }

    /** A room's own hotspot, for parser verbs that answer through it. */
    const spot = (roomId, name) => engine.rooms[roomId].hotspots.find((h) => h.name === name);
    // ================= ROOM 3: THE SPELL ROOM =================
    engine.registerRoom({
        id: 'spell_room',
        name: 'The Hidden Room',
        get description() { return engine.getFlag('morvane_passed')
            ? 'The hidden chamber is still empty. Morvane is occupied far above in the observatory; down here even his footsteps cannot reach you.'
            : 'A low chamber cut into the crag, lit by nothing you can identify. A chalk circle is drawn on the floor.'; },
        smell: 'Cold stone, iron filings, and a sharp green smell like a storm that has not happened yet.',
        // The page says to speak the word over the circle; SAY and CAST both do.
        verbs: {
            say: (e) => spot('spell_room', 'the chalk circle').use(e),
            cast: (e) => spot('spell_room', 'the chalk circle').use(e)
        },
        hint: (e) => {
            if (!e.hasItem('spellbook')) return 'The iron chest is locked, and you found a brass key under the hourglass upstairs.';
            if (!e.getFlag('read_spell')) return 'Read the spellbook. It only has one page it will let you see.';
            if (!e.hasItem('thimble')) return 'The spell wants a feather of a black bird and a pinch of sea salt, laid in the chalk circle. Then say the words.';
            return e.getFlag('morvane_passed')
                ? 'You have what you came for. Leave while Morvane is occupied in the observatory.'
                : 'You have what you came for. Morvane will be back, and you should not be here when he is.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('tower');
            e.setDepthScaling(288, 372, 0.8, 1.08);
            e.setWalkableArea((px, py) => py > 292 && py < 372 && px > 40 && px < 600);
            e.addBarrier(58, 286, 128, 42);
            e.addBarrier(462, 276, 130, 48);
            if (paintedHiddenRoom) configurePaintedHiddenRoom(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedHiddenRoom) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(hiddenRoomImage, 0, 0, w, h);
                ctx.restore();
            } else {
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
            ctx.drawImage(eng.staticLayer('spell_room|walls', (ctx, w) => {
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
            }), 0, 0);
            }
            ctx.save();
            if (paintedHiddenRoom) ctx.translate(0, -34);
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
            ctx.restore();

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
                if (!drawPaintedItem(ctx, 'spellbook', 0, 12, 34, 40)) {
                ctx.fillStyle = '#3a1f2a';
                ctx.fillRect(-17, -12, 34, 24);
                ctx.fillStyle = '#552d3c';
                ctx.fillRect(-17, -12, 11, 24);
                ctx.fillStyle = '#d8cdae';
                ctx.fillRect(12, -10, 5, 20);
                }
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
            if (!paintedHiddenRoom) {
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
            }

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
            eng.vignette(ctx, paintedHiddenRoom ? 0.18 : 0.66, '6,4,12');
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
                    RULES.award(e, 'spellbook');
                    e.showMessage('You lift the book out. It is colder than the chest was, and it settles into your hands as though it had been waiting for smaller ones.');
                },
                get hidden() { return !engine.getFlag('chest_open') || engine.hasItem('spellbook'); }
            },
            {
                name: 'the lectern', x: 464, y: 246, w: 92, h: 88, walkToX: 440,
                description: 'A reading stand worn smooth at the edges. Whatever usually lies here has been taken away.',
                use: (e) => RULES.readTheSpell(e),
                useItem: (e, itemId) => {
                    if (itemId === 'spellbook') { RULES.readTheSpell(e); return; }
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
                    RULES.award(e, 'thimble');
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
});
