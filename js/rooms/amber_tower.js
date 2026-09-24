// ============================================================
// CROWN QUEST - ACT III: THE AMBER TOWER
// ============================================================

CrownQuest.defineRooms((engine) => {
    const RULES = CrownQuestContent.rules;
    const TREASURES = [
        { id: 'chest_of_cormac', label: 'the Chest of Cormac' },
        { id: 'shield_of_ardor', label: 'the Shield of Ardor' },
        { id: 'mirror_of_ianthe', label: 'the Mirror of Ianthe' }
    ];

    /** Set a treasure into its socket over the tower door. The three sockets
     *  fill left to right regardless of the order they are offered in. */
    function setTreasure(e, itemId) {
        const entry = TREASURES.find((t) => t.id === itemId);
        if (!entry) {
            e.showMessage('The sockets are cut for the three treasures of Alderhaven. That is not one of them.');
            return;
        }
        if (e.getFlag('socket_' + itemId)) { e.showMessage('That one is already set.'); return; }
        e.removeFromInventory(itemId);
        e.setFlag('socket_' + itemId);
        e.setFlag('sockets_lit', (e.getCounter('sockets_lit') || 0) + 1);
        e.updateInventoryUI();
        e.sound.magicChime();
        const lit = e.getCounter('sockets_lit');
        if (lit < 3) {
            e.showMessage(`You set ${entry.label} into its socket. It settles as though the stone had been cut around it, and begins, very faintly, to shine.`);
            return;
        }
        e.setFlag('door_opened');
        RULES.award(e, 'door_opened');
        beginTheEnd(e);
    }

    /** The whole of the endgame, played as one blocking sequence so the beats
     *  land in order and a player who skips still ends up crowned. */
    function beginTheEnd(e) {
        e.runSequence([
            'The third treasure goes home. All three sockets take light at once, and the door of the Amber Tower opens inward onto a stair that has been waiting a long time.',
            'The chest remains in the stone, feeding gold light into the tower. The other two sockets open like hands. You take back the shield and mirror; their work is not finished.',
            (eng) => { eng.addToInventory('shield_of_ardor'); eng.addToInventory('mirror_of_ianthe'); },
            (eng) => { eng.sound.doorOpen(); eng.shake(5); },
            600,
            (eng) => { eng.sound.sorcererMotif(); },
            '"Eleven years," says a voice behind you, "and you never once dusted the tapestry properly."',
            'Morvane comes up the shore path without hurrying. He is not angry. That is the part that frightens you.',
            700,
            '"I broke your mother\'s ship and scattered the treasures," he says. "But the tower sheltered her. Only her heir could open its ward, bringing all three freely. Not at my command. Not knowing what he was."',
            '"So I hid you, and waited for the ward to weaken. Eleven years. Then you escaped, and did what I could not order you to do. I followed the storm across the water."',
            '"A useful boy," he says. "Stand aside. This time the tower will not save your mother."',
            (eng) => { eng.sound.castSpell(); eng.shake(9); },
            'He raises one white hand and the air goes hard.'
        ], {
            skippable: true,
            onEnd: () => {
                e.playCutscene({
                    duration: 15000,
                    draw: (ctx, w, h, progress, elapsed) => cutsceneMorvaneDuel(ctx, w, h, progress, elapsed),
                    onEnd: () => {
                        RULES.award(e, 'duel');
                        e.removeFromInventory('shield_of_ardor');
                        e.setFlag('elowen_freed');
                        e.runSequence([
                            'The shield lies in bright pieces. Its light runs into the open doorway and joins the chest\'s gold. The ward has spent itself protecting its heir; the curse, not the kingdom, is what breaks.',
                            'The woman comes down the stair. "Rowan," she says, and you know before she touches your face that this is the name somebody used before you were called Boy.',
                            '"I am Elowen. Your mother." She holds you. For a while there is no kingdom, no sorcerer, and nothing you have to do.',
                            'She tells you of the wreck: she was carried ashore beneath the tower, while Morvane took you from the rocks. The ward saved her life but sealed her inside, beyond his reach and beyond rescue.',
                            '"Your father is Aldric. He thought us both drowned. You were six when the ship went down. You are seventeen now, and I have missed every one of those mornings."',
                            'At the castle, Aldric rises from his sickbed to meet you both. His illness is real, but so is his joy. He names you before his council: Rowan, his son and heir.',
                            'Weeks pass. The chest\'s gold repairs roofs and fills granaries. The mirror and the shield\'s fragments are laid in the royal treasury. Their ward is finished; the work of rebuilding belongs to people.',
                            (eng) => { eng.removeFromInventory('mirror_of_ianthe'); eng.updateInventoryUI(); },
                            'Aldric does not die. He lays down the burden of rule, with the council as witness. You accept it. Elowen, queen and mother, will set the crown upon your head.'
                        ], { onEnd: () => e.playCutscene({
                            duration: 12000,
                            draw: (ctx, w, h, progress, elapsed) => cutsceneCoronation(ctx, w, h, progress, elapsed),
                            onEnd: () => e.victory('Alderhaven has its royal family back, a new king, and a goat in the great hall that nobody has been able to remove.')
                        }) });
                    }
                });
            }
        });
    }

    engine.registerRoom({
        id: 'amber_tower',
        name: 'The Amber Tower',
        description: 'A tower of honey-coloured stone on the headland, with three empty sockets cut above its door.',
        smell: 'Sea wind, warm stone, and something underneath it like a struck bell.',
        hint: (e) => {
            const left = TREASURES.filter((t) => !e.getFlag('socket_' + t.id));
            if (!left.length) return 'The door is open. What happens next is not up to you.';
            return `Set ${left.map((t) => t.label).join(', ')} into the sockets above the door.`;
        },
        onEnter: (e) => {
            e.sound.startAmbient('sea');
            e.setDepthScaling(280, 372, 0.7, 1.06);
            e.setWalkableArea((px, py) => py > 300 && py < 372 && px > 30 && px < 610);
            e.setEdgeTransition('right', (eng) => {
                if (eng.getFlag('door_opened')) return;
                eng.goToRoom('harbour_road', 78, 336);
            });
            // Elowen at the high window: visible from the first moment, so the
            // player knows what the tower is for before anything explains it.
            e.addForegroundLayer(120, (ctx, eng) => {
                if (eng.getFlag('elowen_freed')) return;
                // The window sits at baseY - h*0.76 in drawAmberTower; keeping
                // this derived rather than guessed is what keeps her in it.
                const wy = 336 - 268 * 0.76;
                ctx.save();
                ctx.beginPath();
                ctx.rect(308, wy + 3, 24, 24);
                ctx.clip();
                drawVgaPerson(ctx, 320, wy + 46, 0.82, Object.assign({}, CAST_ELOWEN, {
                    animTimer: eng.animTimer,
                    phase: 4.1,
                    nearArm: { side: 1, up: 0.6 + Math.sin(eng.animTimer / 1400) * 0.1, lo: 1.1 },
                    farArm: { side: -1, up: -0.5, lo: 1.0 }
                }));
                ctx.restore();
            });
            e.addForegroundLayer(344, (ctx, eng) => {
                if (!eng.getFlag('elowen_freed')) return;
                eng.drawContactShadow(ctx, 350, 344, 1, { rx: 18, ry: 4, alpha: 0.3 });
                drawVgaPerson(ctx, 350, 344, vgaPersonScale(eng, 344, 1), Object.assign({}, CAST_ELOWEN, {
                    animTimer: eng.animTimer,
                    nearArm: { side: 1, up: -0.3, lo: -0.5 },
                    farArm: { side: -1, up: 0.1, lo: 0.3 }
                }));
            });
        },
        draw: (ctx, w, h, eng) => {
            // ---- A sky that has already started to turn ----
            skyBands(ctx, 0, 0, w, 170, ['#2a2f60', '#5c4b84', '#a86a70', '#e0a06a']);
            const sun = 0.5 + Math.sin(eng.animTimer / 2600) * 0.06;
            ctx.fillStyle = `rgba(255,214,150,${0.16 * sun})`;
            ctx.beginPath(); ctx.arc(92, 158, 78, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd08a';
            ctx.beginPath(); ctx.arc(92, 158, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe9bc';
            ctx.beginPath(); ctx.arc(88, 152, 17, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 4; i++) {
                const cy = 42 + i * 26;
                ctx.fillStyle = i % 2 ? 'rgba(70,50,86,0.7)' : 'rgba(120,78,96,0.6)';
                ctx.beginPath();
                ctx.ellipse(160 + i * 130 + Math.sin(eng.animTimer / 12000 + i) * 22, cy, 92 - i * 8, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = i % 2 ? 'rgba(214,150,120,0.5)' : 'rgba(240,180,130,0.45)';
                ctx.beginPath();
                ctx.ellipse(160 + i * 130 + Math.sin(eng.animTimer / 12000 + i) * 22, cy - 3, 76 - i * 8, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- Sea on three sides, taking the sunset ----
            waterBand(ctx, 0, 170, w, 90, eng.animTimer, 4646);
            // The water reads warm near the sun and cold at the far edges, in
            // hard bands rather than a wash, so it still recedes.
            ['rgba(228,150,102,0.34)', 'rgba(198,122,104,0.26)', 'rgba(150,96,110,0.2)']
                .forEach((tint, i) => {
                    ctx.fillStyle = tint;
                    ctx.fillRect(0, 170 + i * 30, w, 30);
                });
            blendSeam(ctx, 0, 170, w, '#d09a72', '#4a6f86');
            // The sun's road on the water: hard dashes, widening toward the viewer
            for (let i = 0; i < 26; i++) {
                const f = i / 26;
                ctx.fillStyle = `rgba(255,226,170,${0.5 - f * 0.34})`;
                ctx.fillRect(92 - f * 26 + Math.sin(eng.animTimer / 400 + i) * 5, 174 + i * 3.2, 8 + f * 34, 2);
            }

            // ---- The headland ----
            ctx.fillStyle = '#14151c';
            ctx.beginPath();
            ctx.moveTo(0, 268); ctx.lineTo(120, 254); ctx.lineTo(330, 262);
            ctx.lineTo(520, 250); ctx.lineTo(640, 266); ctx.lineTo(640, h); ctx.lineTo(0, h);
            ctx.closePath(); ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 272); ctx.lineTo(120, 258); ctx.lineTo(330, 266);
            ctx.lineTo(520, 254); ctx.lineTo(640, 270); ctx.lineTo(640, h); ctx.lineTo(0, h);
            ctx.closePath();
            ctx.clip();
            // Bare rock only in a band at the cliff edge; turf over everything
            // else, or the headland reads as a heap of rubble.
            rockFace(ctx, 0, 250, w, 46, 7878, '#7d6a5c', '#584c42', '#332d28');
            ctx.fillStyle = '#3f4a24';
            ctx.fillRect(0, 276, w, h - 276);
            ctx.fillStyle = '#4c5a2b';
            ctx.fillRect(0, 300, w, h - 300);
            blendSeam(ctx, 0, 300, w, '#3f4a24', '#4c5a2b');
            ctx.fillStyle = '#576330';
            ctx.fillRect(0, 336, w, h - 336);
            blendSeam(ctx, 0, 336, w, '#4c5a2b', '#576330');
            // A few outcrops pushing up through the turf
            const out = seededRandom(2929);
            for (let i = 0; i < 9; i++) {
                const ox = out() * w, oy = 300 + out() * 70, orr = 14 + out() * 22;
                ctx.fillStyle = '#231f1c';
                ctx.beginPath(); ctx.ellipse(ox, oy, orr, orr * 0.34, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#584c42';
                ctx.beginPath(); ctx.ellipse(ox, oy - 2, orr * 0.9, orr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#7d6a5c';
                ctx.beginPath(); ctx.ellipse(ox - orr * 0.2, oy - 4, orr * 0.5, orr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            grassFringe(ctx, 0, 292, w, 8989, 120, '#8a9a52', '#66763a', '#414e24');
            turfTexture(ctx, 0, 274, w, h - 274, 9696, 'rgba(140,158,84,0.15)', 'rgba(46,58,28,0.15)');
            // Warm low light raking the turf from the left
            ctx.fillStyle = 'rgba(255,190,120,0.10)';
            ctx.fillRect(0, 268, w, h - 268);

            // ---- The tower ----
            eng.drawContactShadow(ctx, 320, 336, 1, { rx: 92, ry: 12, alpha: 0.34 });
            drawAmberTower(ctx, 320, 336, 1, eng.getCounter('sockets_lit'), eng.animTimer);
            if (eng.getFlag('door_opened')) {
                ctx.fillStyle = '#f6e2a8';
                ctx.beginPath();
                ctx.moveTo(303, 336); ctx.lineTo(303, 296);
                ctx.quadraticCurveTo(320, 280, 337, 296);
                ctx.lineTo(337, 336);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#2a1c10';
                ctx.beginPath();
                ctx.moveTo(309, 336); ctx.lineTo(309, 300);
                ctx.quadraticCurveTo(320, 288, 331, 300);
                ctx.lineTo(331, 336);
                ctx.closePath(); ctx.fill();
                eng.lightPool(ctx, 320, 312, 130, '255,230,160', 0.24);
            }
            eng.lightPool(ctx, 320, 268, 200, '255,210,140', 0.10);

            // ---- Standing stones, older than the tower ----
            [[128, 330, 1.1], [176, 322, 0.8], [498, 328, 1], [548, 320, 0.72]].forEach(([sx, sy, ss]) => {
                ctx.fillStyle = '#17161a';
                ctx.beginPath();
                ctx.moveTo(sx - 13 * ss, sy); ctx.lineTo(sx - 9 * ss, sy - 54 * ss);
                ctx.lineTo(sx + 8 * ss, sy - 58 * ss); ctx.lineTo(sx + 13 * ss, sy);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#6e6a62';
                ctx.beginPath();
                ctx.moveTo(sx - 11 * ss, sy - 1); ctx.lineTo(sx - 7.5 * ss, sy - 52 * ss);
                ctx.lineTo(sx + 6.5 * ss, sy - 55 * ss); ctx.lineTo(sx + 11 * ss, sy - 1);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#9a948a';
                ctx.beginPath();
                ctx.moveTo(sx - 11 * ss, sy - 1); ctx.lineTo(sx - 7.5 * ss, sy - 52 * ss);
                ctx.lineTo(sx - 1 * ss, sy - 53 * ss); ctx.lineTo(sx - 3 * ss, sy - 1);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#40382f';
                ctx.beginPath();
                ctx.moveTo(sx + 4 * ss, sy - 1); ctx.lineTo(sx + 6.5 * ss, sy - 55 * ss);
                ctx.lineTo(sx + 11 * ss, sy - 1);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#7c8a52';
                for (let i = 0; i < 5; i++) ctx.fillRect(sx - 9 * ss + i * 4 * ss, sy - 48 * ss + (i % 3) * 9 * ss, 3 * ss, 2 * ss);
                eng.drawContactShadow(ctx, sx, sy, 1, { rx: 18 * ss, ry: 4 * ss, alpha: 0.24 });
            });

            drawGull(ctx, 220, 92, 1.1, eng.animTimer, 0.9);
            drawGull(ctx, 452, 76, 0.9, eng.animTimer, 2.6);
            eng.vignette(ctx, 0.38, '30,20,34');
        },
        hotspots: [
            {
                name: 'the sockets', x: 274, y: 258, w: 96, h: 34, walkToX: 320,
                description: 'Three round sockets cut into the stone over the door, each about the size of a treasure of Alderhaven.',
                look: (e) => {
                    const lit = e.getCounter('sockets_lit');
                    if (lit === 0) { e.showMessage('Three empty sockets over the door, cut into the stone as though the stone had grown around them. They are exactly the size of three things you are carrying.'); return; }
                    if (lit < 3) { e.showMessage(`${lit} of the three sockets is lit. The others are cold and patient.`.replace('1 of', 'One of').replace('2 of', 'Two of')); return; }
                    e.showMessage('All three sockets burn steady gold.');
                },
                use: (e) => {
                    const held = TREASURES.filter((t) => e.hasItem(t.id));
                    if (!held.length) { e.showMessage('You have nothing left to set.'); return; }
                    setTreasure(e, held[0].id);
                },
                useItem: (e, itemId) => setTreasure(e, itemId)
            },
            {
                name: 'the tower door', x: 296, y: 292, w: 48, h: 48, walkToX: 320,
                description: 'A door of black oak banded in gold. There is no handle on it, and there never was.',
                use: (e) => {
                    if (e.getFlag('door_opened')) { e.showMessage('It stands open. So does everything after it.'); return; }
                    e.showMessage('You push. It does not move, and you would be disappointed in it if it had.');
                },
                useItem: (e, itemId) => setTreasure(e, itemId)
            },
            {
                name: 'the high window', x: 302, y: 128, w: 36, h: 40,
                description: 'A barred window near the top of the tower. There is somebody behind the bars, and she has been watching you since you came over the rise.',
                talk: (e) => e.showMessage('You call up. She puts one hand flat against the bars, and does not call back, and you understand that she cannot.'),
                look: (e) => e.showMessage('A woman in blue stands at the barred window with one hand against the stone. She is very still, in the particular way of somebody who has learned that moving does not help.')
            },
            {
                name: 'the standing stones', x: 100, y: 268, w: 110, h: 68,
                description: 'Four leaning stones, lichened over, standing here since long before the tower. They face it. All four of them face it.'
            },
            {
                name: 'the sea', x: 0, y: 170, w: 640, h: 82,
                description: 'The sun is going down into the channel, and the light on the water is coming from underneath.'
            },
            {
                name: 'the shore path east', x: 596, y: 300, w: 44, h: 72, isExit: true, walkToX: 594,
                description: 'The path back along the cliff toward the harbour road.',
                onExit: (e) => {
                    if (e.getFlag('door_opened')) { e.showMessage('Not now. Not with the door open.'); return; }
                    e.goToRoom('harbour_road', 78, 336);
                }
            }
        ]
    });
});
