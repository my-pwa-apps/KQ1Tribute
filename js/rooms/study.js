// ============================================================
// CROWN QUEST - ACT I: MORVANE'S STUDY
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    const { F, HOUSE_TONE, ceilingBeams, flagstones } = CrownQuest.shared.house;
    const DESK_TOP = 262;

    let paintedStudy = false;
    const studyImage = new Image();
    function configurePaintedStudy(e) {
        e.clearBarriers();
        e.addBarrier(232, 238, 236, 76);
        e.addBarrier(142, 276, 40, 38);
        e.addBarrier(0, 280, 74, 76);
        e.addSurface('desk', 256, 440, 228);
        const layout = {
            'the bookcase': { x: 282, y: 50, w: 200, h: 200 },
            'the desk': { x: 232, y: 208, w: 236, h: 104 },
            'the ledger': { x: 280, y: 212, w: 66, h: 20 },
            'the hourglass': { x: 380, y: 184, w: 34, h: 48 },
            'the candle': { x: 258, y: 194, w: 22, h: 36 },
            'the tapestry': { x: 46, y: 80, w: 72, h: 192, walkToX: 118 },
            'the hidden stair': { x: 50, y: 90, w: 48, h: 176, walkToX: 118, walkToY: 318 },
            'Corvus': { x: 134, y: 176, w: 60, h: 56, walkToX: 202 },
            'the feather': { x: 178, y: 200, w: 24, h: 26, walkToX: 202 },
            'the front door': { x: 550, y: 44, w: 64, h: 248, walkToX: 560, walkToY: 326 },
            'the stair down': { x: 0, y: 304, w: 74, h: 86, walkToX: 84, walkToY: 346 }
        };
        for (const hotspot of e.rooms.study.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        studyImage.onload = () => {
            paintedStudy = true;
            if (engine.currentRoomId === 'study') configurePaintedStudy(engine);
        };
        studyImage.src = 'icons/study-trial.png';
    }

    function featherCollected(e) {
        return RULES.featherCollected(e);
    }

    /** The key under the hourglass: looking, lifting or tipping it all find it. */
    function findKey(e) {
        if (e.getFlag('found_key')) {
            e.showMessage('The hourglass sits level now that you have taken what was under it.');
            return;
        }
        e.setFlag('found_key');
        e.addToInventory('brass_key');
        RULES.award(e, 'brass_key');
        e.sound.pickup();
        e.showMessage('You tilt the hourglass. Beneath one brass foot, worn smooth by years of being sat on, lies a small brass key. Morvane hid it in the one place in this house nobody is allowed to dust.');
    }
    // ================= ROOM 2: MORVANE'S STUDY =================
    engine.registerRoom({
        id: 'study',
        name: 'Morvane\'s Study',
        get description() { return engine.getFlag('morvane_passed')
            ? 'The study is empty except for Corvus. Above the ceiling, Morvane turns the great glass in his locked observatory. The hidden stair and front door are clear.'
            : 'The sorcerer\'s study. A desk, an hourglass, a raven, and a great deal of silence.'; },
        smell: 'Old vellum, cold candle wax, and something underneath that you would rather not name.',
        hint: (e) => {
            if (!e.getFlag('found_key')) return 'The hourglass on the desk sits oddly high on one side. Look under it.';
            if (!e.getFlag('stair_revealed')) return 'That tapestry is the only thing in this house Morvane never lets you clean. Look behind it.';
            if (!featherCollected(e)) return 'Corvus moults. There is a feather on the perch, and he will let you have it if you ask.';
            return 'The stair behind the tapestry goes down. The front door goes out. Neither is going to make Morvane happier.';
        },
        onEnter: (e) => {
            e.sound.startAmbient('tower');
            e.setDepthScaling(266, 372, 0.72, 1.12);
            e.setWalkableArea((px, py) => py > 270 && py < 372 && px > 40 && px < 600);
            e.addSurface('desk', 232, 416, DESK_TOP);
            e.addBarrier(238, 268, 172, 46);
            e.addBarrier(38, 250, 92, 60);
            // Exits are the stair down, the front door and the hidden stair.
            // All three are drawn, so no edge transition duplicates them.

            // Corvus perches at the ego's depth so Rowan can pass behind him.
            e.addForegroundLayer(300, (ctx, eng) => {
                ctx.save();
                if (paintedStudy) ctx.translate(60, 0);
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
                if (!featherCollected(eng)) {
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
                ctx.restore();
            });
            if (paintedStudy) configurePaintedStudy(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedStudy) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(studyImage, 0, 0, w, h);
                ctx.restore();
            } else {
            ctx.drawImage(eng.staticLayer('study|shell', (ctx, w, h) => {
                interiorShell(ctx, w, h, F, Object.assign({}, HOUSE_TONE, {
                    ceiling: '#120e14', leftWall: '#3a3340', rightWall: '#2f2936',
                    back: '#463e50', backShade: '#352e3d', floor: '#2a2530',
                    floorBands: [['#38323f', 258, 26], ['#312b3a', 284, 32], ['#2a2532', 316, 38], ['#231f2a', 354, 46]]
                }));
            }), 0, 0);
            ctx.drawImage(eng.staticLayer('study|walls', (ctx, w, h) => {
                drawPerspectiveSurface(ctx, 100, 80, {
                    tl: { x: 0, y: 0 }, tr: { x: F.BW_L, y: F.BW_T },
                    bl: { x: 0, y: F.EDGE }, br: { x: F.BW_L, y: F.BW_B }
                }, (s) => stoneWall(s, 0, 0, 100, 80, 1201, '#585067', '#463e50', '#332d3c', '#252030'));
                drawPerspectiveSurface(ctx, 100, 80, {
                    tl: { x: w, y: 0 }, tr: { x: F.BW_R, y: F.BW_T },
                    bl: { x: w, y: F.EDGE }, br: { x: F.BW_R, y: F.BW_B }
                }, (s) => stoneWall(s, 0, 0, 100, 80, 3307, '#4b4359', '#3a3345', '#2a2532', '#1f1b28'));
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
            }), 0, 0);
            }

            // ---- The tapestry on the left wall ----
            const tf1 = 0.1, tf2 = 0.74;
            const tapestryBand = paintedStudy
                ? (x, fraction) => 85 + 0.13 * (x - 20) + (fraction - tf1) / (tf2 - tf1) * (185 - 0.2 * (x - 20))
                : F.lBand;
            ctx.save();
            if (paintedStudy) { ctx.translate(36, 0); ctx.scale(0.6, 1); }
            if (!paintedStudy || !eng.getFlag('stair_revealed')) {
            F.trap(ctx, 20, 132, tf1 - 0.03, tf2 + 0.02, tapestryBand);
            ctx.fillStyle = '#100a14'; ctx.fill();
            }
            if (eng.getFlag('stair_revealed')) {
                // Hauled aside: the doorway behind it, and the tapestry bunched.
                if (!paintedStudy) {
                F.trap(ctx, 20, 92, tf1, tf2, F.lBand);
                ctx.fillStyle = '#07060a'; ctx.fill();
                F.trap(ctx, 28, 86, tf1 + 0.06, tf2 - 0.04, F.lBand);
                ctx.fillStyle = '#120d18'; ctx.fill();
                for (let i = 0; i < 4; i++) {
                    F.trap(ctx, 30 + i * 14, 40 + i * 14, tf1 + 0.08 + i * 0.02, tf2 - 0.06, F.lBand);
                    ctx.fillStyle = i % 2 ? '#241426' : '#170e1a'; ctx.fill();
                }
                }
                F.trap(ctx, 92, 132, tf1, tf2, tapestryBand);
                ctx.fillStyle = '#4a2038'; ctx.fill();
                F.trap(ctx, 92, 108, tf1, tf2, tapestryBand);
                ctx.fillStyle = '#63304c'; ctx.fill();
            } else {
                F.trap(ctx, 20, 132, tf1, tf2, tapestryBand);
                ctx.fillStyle = '#4a2038'; ctx.fill();
                // Woven scene: a stag, a tower, a moon — all in three tones.
                drawPerspectiveSurface(ctx, 120, 110, {
                    tl: { x: 20, y: tapestryBand(20, tf1) }, tr: { x: 132, y: tapestryBand(132, tf1) },
                    bl: { x: 20, y: tapestryBand(20, tf2) }, br: { x: 132, y: tapestryBand(132, tf2) }
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
            ctx.restore();

            // ---- The desk, near right, with the hourglass ----
            if (!paintedStudy) {
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(232, DESK_TOP, 184, 14);
            woodPlanks(ctx, 236, DESK_TOP + 2, 176, 11, false, 909);
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(246, 274, 16, 48);
            ctx.fillRect(388, 274, 16, 48);
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.fillRect(248, 276, 12, 46);
            ctx.fillRect(390, 276, 12, 46);
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.fillRect(248, 276, 4, 46);
            ctx.fillRect(390, 276, 4, 46);
            }
            // Open ledger, quill and inkpot
            ctx.save();
            if (paintedStudy) ctx.translate(24, -34);
            ctx.save();
            ctx.translate(0, 264);
            ctx.scale(1, 0.55);
            const paintedLedger = drawPaintedItem(ctx, 'ledger', 289, 0, 64, 30);
            ctx.restore();
            if (!paintedLedger) {
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
            ctx.restore();
            // Hourglass: brass frame, two glass bulbs, one thin falling stream
            const hx = paintedStudy ? 396 : 372, hy = eng.standOn('desk', hx);
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
            // Dish base on the desk surface, stick built up from the dish.
            const candleX = paintedStudy ? 268 : 244, deskTop = eng.standOn('desk', candleX);
            if (!drawPaintedItem(ctx, 'candle', candleX, deskTop, 30, 30)) {
            ctx.fillStyle = '#0d0a06';
            ctx.fillRect(candleX - 7, deskTop - 2, 14, 3);
            ctx.fillStyle = '#3a352c';
            ctx.fillRect(candleX - 6, deskTop - 5, 12, 5);
            ctx.fillStyle = '#565045';
            ctx.fillRect(candleX - 6, deskTop - 5, 12, 1.6);
            ctx.fillStyle = '#e8e0c8';
            ctx.fillRect(candleX - 3, deskTop - 27, 6, 22);
            ctx.fillStyle = '#c4bca4';
            ctx.fillRect(candleX + 1, deskTop - 27, 2, 22);
            }
            flame(ctx, candleX, deskTop - 27, 0.42, eng.animTimer);
            eng.lightPool(ctx, candleX, deskTop - 31, 108, '255,200,120', 0.14);

            // rBand(x, 1) IS the wall/floor junction, so the leaf and its
            // surround both run to 1: anything short leaves the door hovering.
            if (!paintedStudy) {
            const df1 = 0.06, df2 = 1;
            F.trap(ctx, 512, 606, df1 - 0.04, df2, F.rBand);
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
            // Worn stone threshold the door closes onto
            F.trap(ctx, 508, 610, 0.985, 1.055, F.rBand);
            ctx.fillStyle = '#2a2620'; ctx.fill();
            F.trap(ctx, 508, 610, 0.985, 1.012, F.rBand);
            ctx.fillStyle = '#4e483d'; ctx.fill();
            ctx.fillStyle = PAL.GOLD_SHADOW;
            ctx.beginPath();
            ctx.arc(556, F.rBand(556, 0.5), 6, 0, Math.PI * 2);
            ctx.fill();
            // Daylight leaking round the door: the only warm colour on this side
            ctx.fillStyle = 'rgba(255,236,190,0.30)';
            F.trap(ctx, 596, 604, df1, df2, F.rBand);
            ctx.fill();

            eng.vignette(ctx, 0.58, '8,5,14');
            }
        },
        hotspots: [
            {
                name: 'the bookcase', x: 300, y: 64, w: 186, h: 194,
                description: 'Shelf upon shelf of Morvane\'s books. You taught yourself ordinary letters from flour sacks, slowly. These curling magical alphabets are another matter, which he has always found extremely funny.',
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
                look: (e) => {
                    RULES.award(e, 'ledger_read');
                    e.showMessage('An open ledger in a cramped hand. You make out the ordinary letters slowly. One line near the bottom is a list of years, one for every winter since the wreck, and the last of them is this one. Beside it he has written a single word: WEAKENING.');
                },
                get: (e) => e.showMessage('You are not taking anything of his that he would notice by nightfall.')
            },
            {
                name: 'the hourglass', x: 356, y: 218, w: 34, h: 48, walkToX: 348,
                description: 'A brass hourglass. It sits crooked, as though something small were wedged beneath one foot.',
                look: (e) => findKey(e),
                get: (e) => findKey(e),
                use: (e) => {
                    if (!e.getFlag('found_key')) { findKey(e); return; }
                    e.showMessage('You turn the hourglass over. The sand starts again, exactly as unhurried as before.');
                }
            },
            {
                name: 'the candle', x: 234, y: 228, w: 22, h: 36,
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
                    RULES.award(e, 'stair_revealed');
                    e.sound.metalScrape();
                    e.showMessage('You take hold of the tapestry and haul it aside. Behind it the stone is not stone at all, but a low doorway, and a stair going down into the crag. Eleven years. It has been eleven years, and it was behind the one thing he never let you touch.');
                },
                use: (e) => e.rooms.study.hotspots.find(hotspot => hotspot.name === 'the tapestry').look(e)
            },
            {
                name: 'the hidden stair', x: 24, y: 96, w: 76, h: 156, isExit: true, walkToX: 150, walkToY: 318,
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
                    if (!RULES.takeFeather(e)) return;
                    e.showMessage('You take the feather. Corvus watches you do it and says, distinctly, "Mm." You have never been so unnerved by a bird.');
                },
                get hidden() { return featherCollected(engine); }
            },
            {
                name: 'the front door', x: 508, y: 42, w: 100, h: 252, isExit: true, walkToX: 540,
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
});
