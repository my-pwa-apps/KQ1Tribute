// ============================================================
// CROWN QUEST - ACT II: THE BOTTOM OF THE WELL
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;

    // Painted-scenery trial: the picture supplies the shaft, rope and pool;
    // the gnome, his chest and his fire are still drawn live.
    let paintedWell = false;
    // The painted hero is half as tall again as the procedural cel; the cast
    // standing beside him in painted rooms scales with him.
    const paintedCast = () => paintedWell && !!engine.game.drawPlayerSprite;
    const wellImage = new Image();
    /** The painted pool and the rocks in front of it are not floor. */
    const inPaintedPool = (px, py) => ((px - 165) / 138) ** 2 + ((py - 310) / 58) ** 2 < 1 || (px < 160 && py > 335);
    function configurePaintedWell(e) {
        e.setDepthScaling(270, 372, 0.74, 1.06);
        e.setWalkableArea((px, py) => py > 270 && py < 372 && px > 60 && px < 600 && !inPaintedPool(px, py), 271);
        const layout = {
            'the pool': { x: 30, y: 255, w: 270, h: 110, walkToX: 310, walkToY: 326 },
            'the coins': { x: 130, y: 315, w: 90, h: 40, walkToX: 310, walkToY: 326 },
            'the rope': { x: 300, y: 0, w: 50, h: 310, walkToX: 336, walkToY: 312 }
        };
        for (const hotspot of e.rooms.well_bottom.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        wellImage.onload = () => {
            paintedWell = true;
            if (engine.currentRoomId === 'well_bottom') configurePaintedWell(engine);
        };
        wellImage.src = 'icons/well-bottom-trial.png';
    }

    /** Mendharbe's hearth, shared by the procedural and painted rooms. */
    function drawGnomeHearth(ctx, eng) {
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
    }

    /** The name bargain. The name has to be spoken; the menu never supplies it. */
    function sayToGnome(e, text) {
        const said = text.toLowerCase().replace(/[^a-z]/g, '');
        if (e.getFlag('gnome_named')) {
            e.showMessage('"Once was enough," says Mendharbe, pleased all over again. "A name wears thin if you keep saying it."');
            return;
        }
        if (said.includes('mendharbe')) {
            e.showMessage('The gnome goes very quiet. Then he stands up off the chest, brushes it down, and bows so low his beard touches the water. "Thirty years," he says. "And it was the vanity that did it. It always is."', { window: true });
            RULES.nameTheGnome(e);
            return;
        }
        if (said.includes('ebrahdnem')) {
            e.showMessage('"Ebrahdnem," the gnome repeats, delighted. "That is certainly what it says. Now think how a very vain man might write his name, if he wanted it remembered and not read."', { window: true });
            return;
        }
        if (said.includes('rumpel')) {
            e.showMessage('He laughs so hard he nearly falls off the treasure of a kingdom. "No. Everyone tries that one."', { window: true });
            return;
        }
        const guesses = [
            '"No," says the gnome, with enormous satisfaction. "But do keep going. It is the best company I have had in years."',
            '"Not even close. That is a name for a goat."',
            'The gnome writes your guess on the wall with a burnt stick, under a great many others, and draws a line through it.'
        ];
        e.showMessage(guesses[said.length % guesses.length], { window: true });
    }

    /** "Fill pail" names no source; the only water worth carrying is the well's. */
    engine.items.pail.fill = (e) => {
        if (e.currentRoomId === 'well_bottom') { engine.rooms.well_bottom.hotspots.find((h) => h.name === 'the pool').useItem(e, 'pail'); return; }
        e.showMessage(e.getFlag('pail_full') ? 'The pail is already full.' : 'There is no water here worth carrying.');
    };
    // ================= ROOM 7: THE BOTTOM OF THE WELL =================
    engine.registerRoom({
        id: 'well_bottom',
        name: 'The Bottom of the Well',
        description: 'A flooded chamber at the foot of the well shaft. Somebody down here has been expecting company.',
        smell: 'Cold water, wet limestone, and pipe smoke, which makes no sense at all.',
        hint: (e) => {
            if (!e.hasItem('parchment') && !e.getFlag('gnome_named')) return 'He will only give up the chest for his name. The name is written somewhere in the dark wood, backwards.';
            if (!e.getFlag('gnome_named')) return 'Read the parchment the way a vain man would have written it: backwards. Then say his name aloud to him.';
            if (!e.getFlag('pail_full') && !e.getFlag('dragon_doused')) return 'Fill your pail here. Water is going to matter later.';
            return 'The rope goes back up.';
        },
        verbs: {
            say: (e, text) => sayToGnome(e, text)
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
                    if (!paintedWell || !drawPaintedItem(ctx, 'chest_of_cormac', 468, 344, 50, 40)) drawChestOfCormac(ctx, 468, 328, 0.9);
                }
                if (drawCastMember(ctx, 'gnome', eng, 468, eng.getFlag('gnome_named') ? 344 : 310, 0.5)) return;
                drawVgaPerson(ctx, 468, eng.getFlag('gnome_named') ? 344 : (paintedCast() ? 318 : 312),
                    vgaPersonScale(eng, 344, paintedCast() ? 0.86 : 0.62),
                    Object.assign({}, CAST_GNOME, {
                        animTimer: eng.animTimer,
                        phase: 3.5,
                        nearArm: { side: 1, up: 0.5, lo: 0.9 },
                        farArm: { side: -1, up: -0.2, lo: 0.5 }
                    }));
            });
            if (paintedWell) configurePaintedWell(e);
        },
        draw: (ctx, w, h, eng) => {
            if (paintedWell) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(wellImage, 0, 0, w, h);
                ctx.restore();
                dustMotes(ctx, 250, 20, 150, 240, eng.animTimer, 1313);
                glints(ctx, 40, 268, 210, 50, eng.animTimer, { seed: 1414, count: 12, rgb: '205,240,255' });
                drawGnomeHearth(ctx, eng);
                return;
            }
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
            drawGnomeHearth(ctx, eng);

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
                get name() { return engine.getFlag('gnome_named') ? 'Mendharbe' : 'the gnome'; },
                x: 440, y: 260, w: 60, h: 90, walkToX: 400,
                get description() { return engine.getFlag('gnome_named')
                    ? 'Mendharbe stands beside his hearth, sorting coins for the move he is finally considering. The chest is no longer his seat.'
                    : 'A gnome the height of a milking stool, with a beard he is sitting on and a pipe he has not lit. He is sitting on a small gold-bound chest and smiling at you.'; },
                talk: (e) => e.startDialog('gnome', e.getFlag('gnome_named') ? 'after_bargain' : 'greeting'),
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
});
