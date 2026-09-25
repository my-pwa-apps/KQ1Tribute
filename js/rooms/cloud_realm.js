// ============================================================
// CROWN QUEST - ACT II: ABOVE THE CLOUD
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;

    // Painted-scenery trial: the picture supplies the columns, wall, horn and
    // beanstalk; the giant, the shield on its peg and the ring's haze stay live.
    let paintedCloud = false;
    const cloudImage = new Image();
    const PAINTED_SHIELD = { x: 324, y: 196 };
    const PAINTED_GIANT = { x: 478, y: 268 };
    function configurePaintedCloud(e) {
        e.clearForegroundLayers();
        e.setDepthScaling(250, 372, 0.66, 1.06);
        e.setWalkableArea((px, py) => py > 285 && py < 372 && px > 40 && px < 600, 286);
        e.clearBarriers();
        e.addBarrier(120, 268, 140, 24);  // the drinking horn
        const layout = {
            'the Shield of Ardor': { x: PAINTED_SHIELD.x - 32, y: PAINTED_SHIELD.y - 34, w: 64, h: 66, walkToX: 232, walkToY: 300 },
            'the giant': { x: 370, y: 206, w: 230, h: 76, walkToX: 232, walkToY: 300 },
            'the drinking horn': { x: 115, y: 238, w: 150, h: 54 },
            'the columns': { x: 30, y: 0, w: 200, h: 236 },
            'the beanstalk': { x: 0, y: 270, w: 120, h: 130, walkToX: 80, walkToY: 344 }
        };
        for (const hotspot of e.rooms.cloud_realm.hotspots) {
            if (Object.hasOwn(layout, hotspot.name)) Object.assign(hotspot, layout[hotspot.name]);
        }
    }
    if (new URLSearchParams(window.location.search).get('scenery') === 'painted') {
        cloudImage.onload = () => {
            paintedCloud = true;
            if (engine.currentRoomId === 'cloud_realm') configurePaintedCloud(engine);
        };
        cloudImage.src = 'icons/cloud-realm-trial.png';
    }

    /** The ring's haze over the hall floor, shared by both rooms. */
    function drawRingHaze(ctx, w, h, eng) {
        if (!eng.getFlag('ring_worn')) return;
        ctx.fillStyle = 'rgba(220,232,244,0.22)';
        ctx.fillRect(0, 200, w, h - 200);
        for (let i = 0; i < 40; i++) {
            const mx = (i * 71 + eng.animTimer / 30) % w;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(mx, 240 + (i % 9) * 16, 22, 2);
        }
    }

    function drawPaintedCloud(ctx, w, h, eng) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cloudImage, 0, 0, w, h);
        ctx.restore();
        if (!RULES.treasureTaken(eng, 'shield_of_ardor')) {
            if (!drawPaintedItem(ctx, 'shield_of_ardor', PAINTED_SHIELD.x, PAINTED_SHIELD.y + 28, 58, 58)) {
                drawShieldOfArdor(ctx, PAINTED_SHIELD.x, PAINTED_SHIELD.y, 1.5, eng.animTimer);
            }
            eng.lightPool(ctx, PAINTED_SHIELD.x, PAINTED_SHIELD.y, 90, '255,240,190', 0.16);
        }
        eng.drawContactShadow(ctx, PAINTED_GIANT.x, PAINTED_GIANT.y, 1, { rx: 96, ry: 8, alpha: 0.22 });
        if (!drawPaintedActor(ctx, 'giant', PAINTED_GIANT.x, PAINTED_GIANT.y, { width: 220, t: eng.animTimer })) drawSleepingGiant(ctx, PAINTED_GIANT.x, PAINTED_GIANT.y, 0.88, eng.animTimer);
        drawRingHaze(ctx, w, h, eng);
    }
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
        onEnter: (e, { restoring = false } = {}) => {
            e.sound.startAmbient('wind');
            e.setDepthScaling(280, 372, 0.72, 1.06);
            e.setWalkableArea((px, py) => py > 290 && py < 372 && px > 40 && px < 600);
            // Wearing the ring is a per-visit state: it wears off when he leaves.
            if (!restoring) e.setFlag('ring_worn', false);
            if (!restoring && e.hasItem('ring_of_mist')) {
                e.showMessage('The giant fills the hall. Fennow\'s ring is in your pocket and your pocket is not where it does any good.', { window: true, priority: true });
            }
            // Near column drawn after the giant so he tucks behind a pillar
            e.addForegroundLayer(360, (ctx) => {
                const px = 470, ph = 176;
                ctx.fillStyle = '#2f3540';
                ctx.fillRect(px - 22, 250 - ph, 44, ph);
                ctx.fillStyle = '#79828f';
                ctx.fillRect(px - 19, 250 - ph, 38, ph);
                ctx.fillStyle = '#98a2b0';
                ctx.fillRect(px - 19, 250 - ph, 12, ph);
                ctx.fillStyle = '#4c5462';
                ctx.fillRect(px + 8, 250 - ph, 11, ph);
                ctx.fillStyle = '#5f6875';
                for (let f = -14; f < 16; f += 7) ctx.fillRect(px + f, 250 - ph, 1.6, ph);
                ctx.fillStyle = '#2f3540';
                ctx.fillRect(px - 27, 250 - ph - 12, 54, 13);
                ctx.fillRect(px - 26, 244, 52, 12);
                ctx.fillStyle = '#98a2b0';
                ctx.fillRect(px - 27, 250 - ph - 12, 54, 4);
                ctx.fillRect(px - 26, 244, 52, 4);
            });
            if (paintedCloud) configurePaintedCloud(e);
        },
        onUpdate: (e) => {
            if (e.dead || e.cutscene || e.sequence) return;
            // He is asleep, not deaf. Getting close without the ring ends badly.
            if (e.playerX > 240 && !e.getFlag('ring_worn')) {
                e.die('The giant\'s hand closes over you without his eyes ever opening. He turns you over once, the way a man checks a coin, and decides you are a mouse. What he does to mice is brief and beyond appeal.');
            }
        },
        draw: (ctx, w, h, eng) => {
            if (paintedCloud) { drawPaintedCloud(ctx, w, h, eng); return; }
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
            // Billowing cumulus crests along the horizon line to nest the pillars into the cloud deck
            const horizCloud = seededRandom(5151);
            for (let hx = -12; hx < w + 24; hx += 24) {
                const hr = 18 + horizCloud() * 16;
                const hy = 202 + horizCloud() * 6;
                ctx.fillStyle = '#b8cee0';
                ctx.beginPath(); ctx.ellipse(hx, hy + 3, hr, hr * 0.52, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#d8e8f8';
                ctx.beginPath(); ctx.ellipse(hx, hy, hr * 0.9, hr * 0.46, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(hx - hr * 0.2, hy - hr * 0.15, hr * 0.45, hr * 0.24, 0, 0, Math.PI * 2); ctx.fill();
            }
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
            // Stone floor band the giant is actually lying on, not hovering over
            ctx.fillStyle = '#2a3038';
            ctx.fillRect(48, 238, 544, 28);
            ctx.fillStyle = '#5c6472';
            ctx.fillRect(52, 240, 536, 22);
            stoneWall(ctx, 52, 240, 536, 22, 1919, '#8b95a4', '#6b7482', '#474f5c', '#353c47');
            ctx.fillStyle = '#98a2b0';
            ctx.fillRect(52, 240, 536, 3);
            ctx.fillStyle = 'rgba(20,24,30,0.28)';
            ctx.fillRect(52, 256, 536, 6);

            ctx.fillStyle = '#6b7482';
            [[70, 169], [206, 183], [596, 169]].forEach(([px, ph]) => {
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
            if (!RULES.treasureTaken(eng, 'shield_of_ardor')) {
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
            // A drinking horn on the hall floor, not floating through the walkway
            ctx.fillStyle = '#1d1a14';
            ctx.beginPath();
            ctx.moveTo(292, 248); ctx.quadraticCurveTo(318, 236, 338, 250);
            ctx.quadraticCurveTo(318, 254, 292, 256);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8a7a52';
            ctx.beginPath();
            ctx.moveTo(294, 249); ctx.quadraticCurveTo(318, 238, 334, 250);
            ctx.quadraticCurveTo(318, 252, 294, 254);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#b0a074';
            ctx.beginPath();
            ctx.moveTo(294, 249); ctx.quadraticCurveTo(314, 240, 328, 249);
            ctx.quadraticCurveTo(314, 250, 294, 252);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.GOLD_SHADOW;
            ctx.fillRect(290, 246, 6, 12);

            // Giant asleep on the hall floor, tucked behind the near column
            eng.drawContactShadow(ctx, 400, 266, 1, { rx: 96, ry: 8, alpha: 0.22 });
            if (!drawPaintedActor(ctx, 'giant', 400, 266, { width: 220, t: eng.animTimer })) drawSleepingGiant(ctx, 400, 266, 0.88, eng.animTimer);

            // ---- The ring's effect, if worn ----
            drawRingHaze(ctx, w, h, eng);
            eng.vignette(ctx, 0.28, '120,150,190');
        },
        hotspots: [
            {
                name: 'the giant', x: 300, y: 196, w: 230, h: 80, walkToX: 200,
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
                    if (RULES.treasureTaken(e, 'shield_of_ardor')) return;
                    if (!e.getFlag('ring_worn')) {
                        e.die('You cross the hall in the open. The giant\'s hand comes down on you like a shutter in a gale, and he never does wake up, which somehow makes it worse.');
                        return;
                    }
                    e.addToInventory('shield_of_ardor');
                    RULES.award(e, 'shield_of_ardor');
                    e.sound.scoreUp();
                    e.updateInventoryUI();
                    e.showMessage('You lift the shield off its peg. It is warm, and it is far lighter than it has any business being, and the giant snores on through the whole business without ever knowing you were in the room.');
                },
                get hidden() { return RULES.treasureTaken(engine, 'shield_of_ardor'); }
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
                onExit: (e) => e.goToRoom('troll_bridge', 500, 196)
            }
        ]
    });

    /** "Wear ring" / "use ring": only the giant's hall gives it anything to hide from. */
    engine.items.ring_of_mist.wear = (e) => {
        if (e.currentRoomId === 'cloud_realm') { wearRing(e); return; }
        e.showMessage('You slip the ring on. The edges of you go grey and uncertain, and nobody here is looking anyway. You take it off again and keep it safe for when it matters.');
    };
    engine.items.ring_of_mist.use = engine.items.ring_of_mist.wear;
});
