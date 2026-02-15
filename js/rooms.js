/* ======================================================
   King's Quest: The Darkened Mirror — Room Definitions
   Procedurally generated environments with interactive hotspots
   ====================================================== */

function registerAllRooms(engine) {

    // ============================================================
    // ROOM 1: THRONE ROOM — Starting location
    // ============================================================
    engine.registerRoom({
        id: 'throneRoom',
        name: 'Castle Daventry — Throne Room',
        walkBounds: { minX: 20, maxX: 300, minY: 110, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Stone floor
            ctx.fillStyle = '#555566';
            ctx.fillRect(0, 100, 320, 70);
            // Floor tile pattern
            ctx.strokeStyle = '#4a4a5a';
            ctx.lineWidth = 0.5;
            for (let tx = 0; tx < 320; tx += 20) {
                for (let ty = 100; ty < 170; ty += 15) {
                    ctx.strokeRect(tx + ((Math.floor(ty / 15) % 2) * 10), ty, 20, 15);
                }
            }
            // Back wall
            drawStoneWall(ctx, 0, 8, 320, 92, '#888899');
            // Red carpet
            ctx.fillStyle = '#880022';
            ctx.fillRect(130, 100, 60, 70);
            ctx.fillStyle = '#AA0033';
            ctx.fillRect(135, 100, 50, 70);
            // Carpet pattern
            ctx.fillStyle = '#CC9900';
            ctx.fillRect(140, 100, 2, 70);
            ctx.fillRect(178, 100, 2, 70);

            // Throne (center back)
            ctx.fillStyle = '#663300';
            ctx.fillRect(145, 60, 30, 45);
            ctx.fillStyle = '#881100';
            ctx.fillRect(148, 65, 24, 35);
            ctx.fillStyle = '#AA2200';
            ctx.fillRect(150, 68, 20, 10); // cushion
            // Throne top ornament
            ctx.fillStyle = EGA.GOLD;
            ctx.fillRect(155, 55, 10, 8);
            ctx.fillRect(158, 50, 4, 5);

            // Magic Mirror (left wall)
            ctx.fillStyle = EGA.GOLD;
            ctx.fillRect(38, 25, 44, 55);
            ctx.fillStyle = '#333344'; // dark, inactive mirror surface
            if (state.flags.mirrorRestored) {
                // Restored! Shimmering surface
                const shimmer = Math.sin(frame * 0.05) * 30 + 100;
                ctx.fillStyle = `rgb(${80 + shimmer * 0.3}, ${100 + shimmer * 0.5}, ${180 + shimmer * 0.3})`;
            }
            ctx.fillRect(42, 29, 36, 47);
            // Mirror frame details
            ctx.fillStyle = EGA.GOLD;
            ctx.fillRect(42, 27, 36, 2);
            ctx.fillRect(42, 74, 36, 2);

            // Table with bread (right side)
            ctx.fillStyle = '#664422';
            ctx.fillRect(230, 85, 50, 5);
            ctx.fillRect(235, 90, 5, 15);
            ctx.fillRect(270, 90, 5, 15);
            if (!state.flags.hasBread) {
                // Bread on table
                ctx.fillStyle = '#CC9944';
                ctx.fillRect(248, 78, 12, 7);
                ctx.fillStyle = '#BB8833';
                ctx.fillRect(248, 78, 12, 3);
            }

            // Torches
            drawTorch(ctx, 20, 40, frame);
            drawTorch(ctx, 300, 40, frame);
            drawTorch(ctx, 120, 35, frame);
            drawTorch(ctx, 200, 35, frame);

            // Tapestry (right wall)
            ctx.fillStyle = '#660033';
            ctx.fillRect(260, 20, 30, 50);
            ctx.fillStyle = EGA.GOLD;
            // Simple lion emblem
            ctx.fillRect(270, 30, 10, 10);
            ctx.fillRect(268, 42, 14, 3);

            // Door (right side exit)
            drawDoor(ctx, 295, 75, 20, 30);

            // Merlin NPC (left of throne)
            if (!state.flags.talkedToMerlin || true) {
                drawNPC(ctx, 110, 130, 'merlin', frame);
            }
        },

        getHotspots(state) {
            const spots = [];

            // Magic Mirror
            spots.push({
                id: 'mirror', name: 'Magic Mirror',
                parserNouns: [20],
                x: 38, y: 25, w: 44, h: 55,
                walkTo: { x: 65, y: 120 },
                actions: {
                    Look: state.flags.mirrorRestored
                        ? "The Magic Mirror shimmers with renewed light. You can see distant lands reflected in its surface. Daventry is saved!"
                        : "The famed Magic Mirror of Daventry hangs on the wall, but its surface is dark and lifeless. Where once it showed visions of the future, now it shows only shadow.",
                    Get: "The Mirror is taller than you and bolted to the wall with ancient magic. You'd need a very large satchel and absolutely no common sense.",
                    Use: function (engine) {
                        if (engine.hasItem('sapphire') && engine.hasItem('ruby') && engine.hasItem('emerald')) {
                            engine.removeItem('sapphire');
                            engine.removeItem('ruby');
                            engine.removeItem('emerald');
                            engine.setFlag('mirrorRestored');
                            engine.addScore(16);
                            audio.sfxMagic();
                            engine.showText("You place the three gems into the Mirror's frame. The Ruby of Courage... the Sapphire of Wisdom... the Emerald of Compassion. The Mirror blazes with brilliant light! Daventry is saved!");
                            setTimeout(() => engine.showVictory(), 4000);
                            return null;
                        }
                        return "The Mirror needs three enchanted gems to be restored: the Ruby of Courage, the Sapphire of Wisdom, and the Emerald of Compassion.";
                    },
                    Talk: "You whisper to the Mirror. It doesn't whisper back. Mirrors are notoriously poor conversationalists."
                },
                useCombos: {
                    'sapphire_mirror': function (engine) {
                        return "You need all THREE gems to restore the Mirror: the Ruby, the Sapphire, and the Emerald. Select 'Use' on the Mirror when you have them all.";
                    },
                    'ruby_mirror': function (engine) {
                        return "You need all THREE gems to restore the Mirror. Patience, brave adventurer!";
                    },
                    'emerald_mirror': function (engine) {
                        return "You need all THREE gems. You're almost there!";
                    }
                }
            });

            // Throne
            spots.push({
                id: 'throne', name: 'Throne',
                parserNouns: [21],
                x: 145, y: 55, w: 30, h: 50,
                walkTo: { x: 160, y: 120 },
                actions: {
                    Look: "King Graham's ornate throne. The velvet cushion still bears the imprint of royal posterity... er, posterior. You briefly sit in it and decree \"More nap time for all!\" to an empty room.",
                    Get: "You attempt to lift the throne. It weighs approximately one throne. You put it back down.",
                    Use: "You sit on the throne and wave regally at no one in particular. A nearby moth is unimpressed.",
                    Talk: "\"Hear ye, hear ye!\" you announce to absolutely nobody. Your voice echoes impressively, though."
                }
            });

            // Bread
            if (!state.flags.hasBread) {
                spots.push({
                    id: 'bread', name: 'Bread',
                    parserNouns: [22],
                    x: 245, y: 75, w: 18, h: 15,
                    walkTo: { x: 255, y: 115 },
                    actions: {
                        Look: "A crusty loaf of bread sits on the table. It's still warm and smells heavenly. The royal baker clearly hasn't heard about the crisis.",
                        Get: function (engine) {
                            engine.addItem('bread', 'Bread', 'A warm, crusty loaf of bread');
                            engine.setFlag('hasBread');
                            engine.addScore(2);
                            return "You take the bread. It's still warm! Your stomach growls expectantly, but something tells you this bread might be needed for nobler purposes. Or at least hungrier ones.";
                        },
                        Use: "You could eat it, but adventure wisdom says: never eat what you might need to give to a bridge troll.",
                        Talk: "You have a brief but meaningful conversation with the bread. It's a good listener."
                    }
                });
            }

            // Table
            spots.push({
                id: 'table', name: 'Dining Table',
                parserNouns: [24],
                x: 228, y: 82, w: 55, h: 25,
                walkTo: { x: 255, y: 120 },
                actions: {
                    Look: state.flags.hasBread
                        ? "A sturdy oak dining table. The bread is gone. You feel a pang of guilt for taking it, followed by a pang of hunger."
                        : "A sturdy oak dining table with a fresh loaf of bread on it. The King may be away, but the kitchen staff carry on. Professionals, they are.",
                    Get: "The table is far too heavy to carry, and you're not sure what you'd do with it anyway. Table-based adventuring is still centuries away.",
                    Talk: "You consider talking to the table, but decide you should maintain at least a shred of dignity."
                }
            });

            // Tapestry
            spots.push({
                id: 'tapestry', name: 'Royal Tapestry',
                parserNouns: [26],
                x: 258, y: 18, w: 35, h: 55,
                walkTo: { x: 270, y: 115 },
                actions: {
                    Look: "A fine tapestry depicting the Royal Crest of Daventry — a golden lion on a crimson field. Below it reads: \"Fortis et Fidelis\". You think that means \"Strong and Faithful\". Or possibly \"Fort is Smelly\". Your Latin is rusty.",
                    Get: "You tug on the tapestry. It's firmly attached and also about 400 years old. The Conservation Guild would have your head.",
                    Talk: "The lion in the tapestry seems to stare at you judgmentally. You stare back. The lion wins."
                }
            });

            // Merlin
            spots.push({
                id: 'merlin', name: 'Wizard Crispin',
                parserNouns: [30],
                x: 97, y: 98, w: 26, h: 35,
                walkTo: { x: 130, y: 130 },
                actions: {
                    Look: "An elderly wizard in a long blue robe and pointy hat. His name is Crispin — and he's very quick to tell you he's NOT Merlin. \"Do I LOOK like a Merlin?\" he says. Honestly, yes.",
                    Get: "You consider picking up the wizard. He gives you a look that strongly discourages this plan.",
                    Talk: function (engine) {
                        if (!engine.hasFlag('talkedToMerlin')) {
                            engine.setFlag('talkedToMerlin');
                            engine.addScore(3);
                            return "Crispin adjusts his glasses. \"Cedric! Thank the stars! The Magic Mirror has gone dark! Its power is sustained by three Enchanted Gems hidden in the realm. Someone — or something — has disturbed them. You must find the Ruby of Courage, the Sapphire of Wisdom, and the Emerald of Compassion before nightfall! The kingdom depends on you!\" He pauses. \"Also, don't die. Paperwork is dreadful.\"";
                        }
                        const hints = [
                            "\"The gems are scattered across the land. Seek them in places of power — a cavern of crystals, a dragon's hoard, and an enchanted lake.\"",
                            "\"Be brave, young Cedric, but also be clever. Not everything can be solved with a sword. Mostly because you don't have one.\"",
                            "\"I'd come with you, but my knees... you understand. Also, someone needs to guard the throne. From... dust.\"",
                            "\"Have you tried talking to everyone you meet? Even the strange ones. ESPECIALLY the strange ones.\""
                        ];
                        return hints[Math.floor(Math.random() * hints.length)];
                    },
                    Use: "You wave your hands mystically at Crispin. He blinks. \"That's not how magic works, child.\""
                }
            });

            // Door/Exit
            spots.push({
                id: 'exitDoor', name: 'Door to Courtyard',
                parserNouns: [23],
                x: 293, y: 72, w: 24, h: 35,
                walkTo: { x: 300, y: 130 },
                actions: {
                    Look: "A heavy oak door leading to the castle courtyard. Fresh air beckons!",
                    Get: "Doors are not typically a collectible item. Even in adventure games.",
                    Talk: "\"Knock knock.\" The door doesn't answer. Rude."
                }
            });

            return spots;
        },

        exits: [
            {
                x: 295, y: 70, w: 25, h: 100,
                room: 'courtyard', enterX: 25, enterY: 140, enterDir: 'right',
                playerWalkX: 310, playerWalkY: 140
            }
        ],

        onEnter(engine) {
            if (!engine.hasFlag('firstEntry')) {
                engine.setFlag('firstEntry');
                engine.showText("You are Cedric, a young page at Castle Daventry. This morning, something terrible has happened — the Magic Mirror has gone dark. Perhaps you should talk to the wizard Crispin.");
            }
        }
    });

    // ============================================================
    // ROOM 2: CASTLE COURTYARD
    // ============================================================
    engine.registerRoom({
        id: 'courtyard',
        name: 'Castle Daventry — Courtyard',
        walkBounds: { minX: 15, maxX: 305, minY: 100, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Sky
            drawSky(ctx, '#4466AA', '#7799CC');
            drawCloud(ctx, 60 + (frame * 0.05) % 320, 25, seed + 1);
            drawCloud(ctx, 200 + (frame * 0.03) % 320, 35, seed + 2);

            // Distant mountains
            drawMountainRange(ctx, seed + 100, 70, '#556677', '#DDDDEE');

            // Castle walls
            drawCastleWall(ctx, 0, 55, 35, 115);
            drawCastleWall(ctx, 285, 55, 35, 115);

            // Castle tower (left)
            drawStoneWall(ctx, 0, 20, 30, 150, '#999999');
            ctx.fillStyle = '#777788';
            // Tower top
            ctx.beginPath();
            ctx.moveTo(0, 20);
            ctx.lineTo(15, 8);
            ctx.lineTo(30, 20);
            ctx.fill();

            // Door back to throne room (left wall)
            drawDoor(ctx, 5, 105, 18, 28, '#553311');

            // Cobblestone ground
            ctx.fillStyle = '#887766';
            ctx.fillRect(0, 95, 320, 75);
            // Cobblestone pattern
            const rng = mulberry32(seed + 50);
            ctx.fillStyle = '#776655';
            for (let i = 0; i < 60; i++) {
                const cx = rng() * 320;
                const cy = 98 + rng() * 65;
                ctx.beginPath();
                ctx.arc(cx, cy, 2 + rng() * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Well (center)
            ctx.fillStyle = '#777777';
            ctx.fillRect(140, 90, 40, 20);
            ctx.fillStyle = '#666666';
            ctx.fillRect(142, 88, 36, 4);
            // Well roof
            ctx.fillStyle = '#664422';
            ctx.fillRect(135, 68, 4, 22);
            ctx.fillRect(181, 68, 4, 22);
            ctx.fillStyle = '#553311';
            ctx.beginPath();
            ctx.moveTo(130, 70);
            ctx.lineTo(160, 55);
            ctx.lineTo(190, 70);
            ctx.fill();
            // Rope & bucket
            ctx.strokeStyle = '#AA8855';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(160, 58);
            ctx.lineTo(160, 75 + (state.flags.usedWell ? 10 : 0));
            ctx.stroke();
            if (!state.flags.usedWell) {
                ctx.fillStyle = '#887766';
                ctx.fillRect(157, 73, 7, 5);
            }

            // Gate (south exit)
            ctx.fillStyle = '#554433';
            ctx.fillRect(130, 155, 60, 15);
            ctx.fillStyle = '#443322';
            ctx.fillRect(132, 155, 56, 2);
            // Portcullis pattern
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            for (let gx = 136; gx < 188; gx += 6) {
                ctx.beginPath();
                ctx.moveTo(gx, 155);
                ctx.lineTo(gx, 170);
                ctx.stroke();
            }

            // Notice board (right side)
            ctx.fillStyle = '#664422';
            ctx.fillRect(240, 80, 30, 25);
            ctx.fillStyle = '#DDCC99';
            ctx.fillRect(243, 83, 24, 18);
            // Text on notice
            ctx.fillStyle = '#333';
            ctx.font = '3px monospace';
            ctx.fillText('QUEST', 246, 89);
            ctx.fillText('BOARD', 246, 93);

            // Guard NPC (near gate)
            drawNPC(ctx, 110, 155, 'guard', frame);

            // Garden arch (right wall gap)
            ctx.fillStyle = '#228822';
            ctx.fillRect(285, 90, 5, 5);
            ctx.fillRect(290, 85, 5, 10);
            ctx.fillStyle = '#33AA33';
            ctx.beginPath();
            ctx.arc(295, 90, 8, 0, Math.PI * 2);
            ctx.fill();
        },

        getHotspots(state) {
            const spots = [];

            // Well
            spots.push({
                id: 'well', name: 'Stone Well',
                parserNouns: [33],
                x: 135, y: 55, w: 50, h: 55,
                walkTo: { x: 160, y: 120 },
                actions: {
                    Look: "An old stone well in the center of the courtyard. You peer down into the darkness and see something glinting at the bottom. Could be treasure. Could be a discarded fork. Only one way to find out!",
                    Get: "You tug on the well. Wells, as a rule, are not portable. This one is no exception.",
                    Use: function (engine) {
                        if (engine.hasFlag('usedWell')) {
                            return "You've already retrieved everything useful from the well. It's just water down there now. Regular, boring, non-quest-related water.";
                        }
                        engine.setFlag('usedWell');
                        engine.addItem('key', 'Old Key', 'A tarnished brass key from the well');
                        engine.addScore(5);
                        return "You lower the bucket into the well. After much splashing and several undignified sounds, you pull it back up. Inside, along with some water and a confused frog, you find a tarnished brass key! The frog hops away, clearly uninterested in your quest.";
                    },
                    Talk: "You shout \"HELLO!\" into the well. \"Hello... hello... hello...\" your echo replies. It doesn't have anything useful to add to the conversation."
                }
            });

            // Guard
            spots.push({
                id: 'guard', name: 'Castle Guard',
                parserNouns: [29],
                x: 97, y: 123, w: 26, h: 35,
                walkTo: { x: 130, y: 150 },
                actions: {
                    Look: "A castle guard standing at attention near the gate. He's been standing so long that a small bird has built a nest in his helmet. He doesn't seem to mind. Or notice.",
                    Get: "You consider picking up the guard. His armor alone weighs more than your future.",
                    Talk: function (engine) {
                        if (engine.hasFlag('hasLantern')) {
                            const responses = [
                                "\"Still alive, eh? Good for you. Most pages don't make it past the bridge.\"",
                                "\"I'd help you, but someone's got to guard this gate. From... things. There are things.\"",
                                "\"My cousin tried adventuring once. He's a toad now. Nice lily pad, though.\""
                            ];
                            return responses[Math.floor(Math.random() * responses.length)];
                        }
                        if (engine.hasFlag('talkedToMerlin')) {
                            engine.addItem('lantern', 'Lantern', 'A brass lantern with a steady flame');
                            engine.setFlag('hasLantern');
                            engine.addScore(3);
                            return "\"A quest, you say? To save the Magic Mirror? Well, you'll need this.\" The guard hands you a brass lantern. \"Dark places ahead. And take my advice — if something looks like it wants to eat you, it probably does.\"";
                        }
                        return "\"Move along, page. Nothing to see here.\" The guard yawns. \"Unless you're on official business?\" You should probably talk to the wizard first.";
                    },
                    Use: "The guard gives you a look that could curdle milk. \"Don't. Just... don't.\""
                }
            });

            // Notice board
            spots.push({
                id: 'noticeboard', name: 'Notice Board',
                parserNouns: [36],
                x: 238, y: 78, w: 35, h: 30,
                walkTo: { x: 250, y: 120 },
                actions: {
                    Look: "The notice board reads: \"QUEST AVAILABLE: Save the kingdom. Requirements: Bravery, intelligence, or at minimum, stubbornness. Compensation: Glory and a modest pension. Apply within.\" Below that: \"LOST: One cat. Answers to 'Mr. Whiskers'. Does not actually answer to anything. Is a cat.\" And a curious note pinned at the bottom: \"For Sale: Ye Olde Map Shoppe. Cities, forests, rivers — all on paper! No houses, trees, or water included.\"",
                    Get: "The notices are pinned quite firmly. Also, stealing official postings is a misdemeanor in Daventry.",
                    Talk: "You read the notices aloud in your best town crier voice. A pigeon on the wall seems mildly entertained."
                }
            });

            // Back door to throne room
            spots.push({
                id: 'throneRoomDoor', name: 'Throne Room Door',
                parserNouns: [23],
                x: 3, y: 100, w: 22, h: 32,
                walkTo: { x: 25, y: 135 },
                actions: {
                    Look: "The heavy oak door leading back to the throne room."
                }
            });

            return spots;
        },

        exits: [
            {   // West: back to throne room
                x: 0, y: 90, w: 20, h: 80,
                room: 'throneRoom', enterX: 290, enterY: 140, enterDir: 'left',
                playerWalkX: 10, playerWalkY: 140
            },
            {   // North: to garden
                x: 280, y: 80, w: 40, h: 40,
                room: 'garden', enterX: 25, enterY: 140, enterDir: 'right',
                playerWalkX: 300, playerWalkY: 110
            },
            {   // South: to forest path
                x: 125, y: 155, w: 70, h: 15,
                room: 'forestPath', enterX: 160, enterY: 110, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162
            }
        ]
    });

    // ============================================================
    // ROOM 3: CASTLE GARDEN
    // ============================================================
    engine.registerRoom({
        id: 'garden',
        name: 'Castle Garden',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Sky
            drawSky(ctx, '#5577BB', '#99BBEE');
            drawCloud(ctx, 80, 22, seed + 10);
            drawCloud(ctx, 230, 30, seed + 11);

            // Hedgerow (back)
            ctx.fillStyle = '#116611';
            ctx.fillRect(0, 55, 320, 35);
            ctx.fillStyle = '#228822';
            for (let hx = 0; hx < 320; hx += 12) {
                ctx.beginPath();
                ctx.arc(hx + 6, 55, 8, Math.PI, 0);
                ctx.fill();
            }

            // Green lawn
            ctx.fillStyle = '#33AA33';
            ctx.fillRect(0, 88, 320, 82);
            // Grass detail
            const rng = mulberry32(seed + 20);
            ctx.fillStyle = '#44BB44';
            for (let i = 0; i < 40; i++) {
                const gx = rng() * 320;
                const gy = 90 + rng() * 70;
                ctx.fillRect(gx, gy, 1, 2);
            }

            // Stone path
            ctx.fillStyle = '#998877';
            ctx.fillRect(0, 130, 40, 15);
            for (let px = 0; px < 45; px += 8) {
                ctx.fillStyle = '#887766';
                ctx.fillRect(px, 130, 6, 6);
                ctx.fillRect(px + 3, 138, 6, 5);
            }

            // Fountain (center)
            ctx.fillStyle = '#999999';
            ctx.fillRect(140, 95, 40, 25);
            ctx.fillStyle = '#AAAAAA';
            ctx.fillRect(145, 90, 30, 5);
            // Water in fountain
            ctx.fillStyle = '#4488CC';
            ctx.fillRect(148, 93, 24, 4);
            // Water spray
            if (frame % 4 < 2) {
                ctx.fillStyle = '#88CCFF';
                ctx.fillRect(159, 85, 2, 8);
                ctx.fillRect(157, 83, 6, 2);
            }

            // Rose bushes (left)
            ctx.fillStyle = '#005500';
            ctx.fillRect(50, 90, 30, 20);
            ctx.beginPath();
            ctx.arc(55, 88, 8, 0, Math.PI * 2);
            ctx.arc(65, 86, 10, 0, Math.PI * 2);
            ctx.arc(75, 89, 7, 0, Math.PI * 2);
            ctx.fill();
            // Red roses
            ctx.fillStyle = '#DD2222';
            const roseRng = mulberry32(seed + 25);
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(50 + roseRng() * 28, 82 + roseRng() * 12, 3, 3);
            }

            // Flower bed (right)
            const flowerColors = ['#FF4444', '#FFFF44', '#FF88FF', '#4444FF', '#FF8844'];
            for (let i = 0; i < 15; i++) {
                const frng = mulberry32(seed + 30 + i);
                const fx = 220 + frng() * 80;
                const fy = 90 + frng() * 35;
                drawFlower(ctx, fx, fy, flowerColors[i % flowerColors.length], seed + 30 + i);
            }

            // Mouse hole in wall (left side)
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(45, 108, 4, Math.PI, 0);
            ctx.fill();

            // Cheese near mouse hole
            if (!state.flags.hasCheese) {
                ctx.fillStyle = EGA.YELLOW;
                ctx.fillRect(50, 103, 6, 5);
                ctx.fillStyle = '#CCAA00';
                ctx.fillRect(51, 104, 1, 1);
                ctx.fillRect(53, 105, 1, 1);
            }

            // Butterfly (animated)
            const bx = 200 + Math.sin(frame * 0.03) * 30;
            const by = 75 + Math.cos(frame * 0.04) * 10;
            ctx.fillStyle = '#FF88FF';
            ctx.fillRect(bx - 2, by, 2, 2);
            ctx.fillRect(bx + 1, by, 2, 2);
            ctx.fillStyle = '#CC66CC';
            ctx.fillRect(bx, by, 1, 3);

            // Exit marker (left)
            ctx.fillStyle = '#228822';
            ctx.beginPath();
            ctx.arc(8, 135, 10, 0, Math.PI * 2);
            ctx.fill();
        },

        getHotspots(state) {
            const spots = [];

            // Cheese
            if (!state.flags.hasCheese) {
                spots.push({
                    id: 'cheese', name: 'Cheese',
                    parserNouns: [51],
                    x: 48, y: 100, w: 12, h: 12,
                    walkTo: { x: 55, y: 120 },
                    actions: {
                        Look: "A wedge of yellow cheese sits by a mouse hole. The mouse is nowhere to be seen, probably watching you from the shadows with tiny, suspicious eyes.",
                        Get: function (engine) {
                            engine.addItem('cheese', 'Cheese', 'A wedge of fragrant yellow cheese');
                            engine.setFlag('hasCheese');
                            engine.addScore(3);
                            return "You grab the cheese. From deep inside the mouse hole, you hear a tiny, indignant squeak. \"Sorry, little fellow,\" you mutter. \"Kingdom to save and all that.\"";
                        },
                        Talk: "\"I know you're in there,\" you say to the mouse hole. A pair of tiny eyes blinks at you, then disappears.",
                        Use: "You could eat it, but it smells like it's been aging since King Edward's reign. Strong enough to ward off evil. Or appetite."
                    }
                });
            }

            // Fountain
            spots.push({
                id: 'fountain', name: 'Stone Fountain',
                parserNouns: [33],
                x: 138, y: 88, w: 45, h: 35,
                walkTo: { x: 160, y: 130 },
                actions: {
                    Look: "An elegant stone fountain decorated with carved fish. The water sprays cheerfully upward, blissfully unaware of the kingdom's peril. There's a coin at the bottom. You resist the urge to make a wish — you'd rather solve problems the old-fashioned way. With cheese and bread.",
                    Get: "You can't take a fountain. Well, you could try, but the homeowners' association would have words.",
                    Use: "You splash some water on your face. Refreshing! You feel 3% more heroic.",
                    Talk: "You make a wish. Nothing visible happens, but somewhere a fairy sneezes."
                }
            });

            // Rose bushes
            spots.push({
                id: 'roses', name: 'Rose Bushes',
                parserNouns: [32],
                x: 48, y: 78, w: 35, h: 32,
                walkTo: { x: 65, y: 120 },
                actions: {
                    Look: "Beautiful red roses, tended with obvious care. Each bloom is perfect. You briefly consider a career change to gardening. The benefits aren't great, but the work environment is lovely.",
                    Get: function (engine) {
                        return "You reach for a rose and immediately get pricked by a thorn. \"Ouch!\" You decide roses are better admired from a safe distance. Like from another kingdom.";
                    },
                    Talk: "\"You're all so beautiful,\" you whisper to the roses. A nearby gardener gives you a funny look."
                }
            });

            // Flowers
            spots.push({
                id: 'flowers', name: 'Flower Bed',
                parserNouns: [32],
                x: 218, y: 85, w: 85, h: 45,
                walkTo: { x: 250, y: 135 },
                actions: {
                    Look: "A dazzling array of flowers in every color imaginable. Daisies, tulips, bluebells — it's like a rainbow had a yard sale. The bees are having the time of their lives.",
                    Get: "Picking the royal flowers is punishable by a stern lecture from the head gardener. You've heard his lectures. You'd rather face the dragon.",
                    Talk: "You lean down and whisper encouragement to the flowers. You could swear a daisy nodded at you."
                }
            });

            // Butterfly
            spots.push({
                id: 'butterfly', name: 'Butterfly',
                parserNouns: [],
                x: 180, y: 65, w: 50, h: 25,
                walkTo: { x: 200, y: 120 },
                actions: {
                    Look: "A delicate pink butterfly flutters about without a care in the world. You envy its simple life. No quests, no dark mirrors, just flowers and sunshine.",
                    Get: "You lunge for the butterfly. It dodges effortlessly. You land in the flowers. The butterfly seems amused.",
                    Talk: "\"Any advice for a questing page?\" you ask the butterfly. It lands on your nose briefly, then flies away. You choose to interpret this as a blessing."
                }
            });

            return spots;
        },

        exits: [
            {   // West: back to courtyard
                x: 0, y: 100, w: 15, h: 70,
                room: 'courtyard', enterX: 290, enterY: 120, enterDir: 'left',
                playerWalkX: 10, playerWalkY: 140
            }
        ]
    });

    // ============================================================
    // ROOM 4: FOREST PATH
    // ============================================================
    engine.registerRoom({
        id: 'forestPath',
        name: 'Forest Path',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Sky through canopy
            drawSky(ctx, '#335522', '#557744');

            // Tree canopy (dark)
            ctx.fillStyle = '#224411';
            ctx.fillRect(0, 8, 320, 50);

            // Dappled light
            const rng = mulberry32(seed + 40);
            ctx.fillStyle = '#668844';
            for (let i = 0; i < 20; i++) {
                const lx = rng() * 320;
                const ly = 10 + rng() * 45;
                ctx.beginPath();
                ctx.arc(lx, ly, 3 + rng() * 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Forest floor
            ctx.fillStyle = '#553311';
            ctx.fillRect(0, 88, 320, 82);
            // Leaf litter
            ctx.fillStyle = '#664422';
            for (let i = 0; i < 30; i++) {
                const lx = rng() * 320;
                const ly = 90 + rng() * 70;
                ctx.fillRect(lx, ly, 2 + rng() * 3, 1);
            }

            // Dirt path
            ctx.fillStyle = '#887755';
            ctx.fillRect(130, 88, 60, 82);
            ctx.fillStyle = '#776644';
            ctx.fillRect(135, 88, 50, 82);

            // Trees (left side)
            drawTree(ctx, 30, 95, seed + 41, 1.3);
            drawTree(ctx, 80, 100, seed + 42, 1.1);
            drawPineTree(ctx, 110, 93, seed + 43, 1.2);

            // Trees (right side)
            drawTree(ctx, 250, 98, seed + 44, 1.2);
            drawPineTree(ctx, 210, 92, seed + 45, 1.0);
            drawTree(ctx, 290, 95, seed + 46, 1.4);

            // Mushrooms (near path)
            if (!state.flags.hasMushroom) {
                ctx.fillStyle = '#DD3333';
                ctx.fillRect(195, 130, 6, 4);
                ctx.fillStyle = '#AA2222';
                ctx.beginPath();
                ctx.arc(198, 130, 5, Math.PI, 0);
                ctx.fill();
                // White dots on mushroom
                ctx.fillStyle = EGA.WHITE;
                ctx.fillRect(196, 127, 1, 1);
                ctx.fillRect(199, 128, 1, 1);
            }

            // Squirrel on tree
            ctx.fillStyle = '#884422';
            ctx.fillRect(78, 75, 4, 3);
            ctx.fillRect(76, 78, 3, 5);
            ctx.fillStyle = '#AA6633';
            ctx.fillRect(82, 73, 2, 5); // tail

            // Bird in canopy
            const birdX = 150 + Math.sin(frame * 0.02) * 5;
            ctx.fillStyle = '#334422';
            ctx.fillRect(birdX, 30, 3, 2);
            ctx.fillRect(birdX - 2, 31, 2, 1);
            ctx.fillRect(birdX + 3, 31, 2, 1);

            // Path going north (back)
            ctx.fillStyle = '#776644';
            ctx.fillRect(150, 8, 20, 80);

            // Fallen log
            ctx.fillStyle = '#554422';
            ctx.fillRect(20, 145, 40, 5);
            ctx.fillStyle = '#665533';
            ctx.fillRect(20, 143, 5, 4);
        },

        getHotspots(state) {
            const spots = [];

            // Mushroom
            if (!state.flags.hasMushroom) {
                spots.push({
                    id: 'mushroom', name: 'Red Mushroom',
                    parserNouns: [38],
                    x: 192, y: 122, w: 14, h: 16,
                    walkTo: { x: 198, y: 145 },
                    actions: {
                        Look: "A bright red mushroom with white spots grows beside the path. It's either magical, poisonous, or both. In Daventry, these things tend to overlap significantly.",
                        Get: function (engine) {
                            engine.addItem('mushroom', 'Mushroom', 'A bright red mushroom with white spots');
                            engine.setFlag('hasMushroom');
                            engine.addScore(2);
                            return "You carefully pick the mushroom, making sure not to lick your fingers afterward. Your adventure training is paying off!";
                        },
                        Use: function (engine) {
                            engine.showDeath("You pop the mushroom into your mouth. It tastes surprisingly good! Then everything goes purple. Then plaid. Then nowhere at all. Perhaps eating random forest mushrooms wasn't your brightest idea.");
                            return null;
                        },
                        Talk: "You address the mushroom formally. \"Greetings, fungus.\" It does not reply. Fungi are even worse conversationalists than mirrors."
                    }
                });
            }

            // Squirrel
            spots.push({
                id: 'squirrel', name: 'Squirrel',
                parserNouns: [],
                x: 74, y: 72, w: 12, h: 12,
                walkTo: { x: 80, y: 110 },
                actions: {
                    Look: "A plump squirrel sits on a branch, clutching an acorn like it's the crown jewels. Given the state of Daventry's actual crown jewels, this squirrel might be the richer of the two of you.",
                    Get: "The squirrel takes one look at your approaching hand and scurries up the tree so fast it practically teleports. You respect its self-preservation instincts.",
                    Talk: "\"Any tips for a traveling adventurer?\" The squirrel chatters rapidly, then throws an acorn at your head. You take this as 'no'.",
                    Use: "What would you even do with a squirrel? This isn't that kind of game."
                }
            });

            // Fallen log
            spots.push({
                id: 'log', name: 'Fallen Log',
                parserNouns: [],
                x: 18, y: 140, w: 45, h: 10,
                walkTo: { x: 40, y: 155 },
                actions: {
                    Look: "An old fallen log, slowly returning to the forest floor. Various beetles have set up a thriving community inside. It's essentially a tiny beetle city. Beetleburg, if you will.",
                    Get: "It's far too heavy, and disturbing the beetles' housing market would be unconscionable.",
                    Use: "You sit on the log for a moment. It's nice. Sometimes an adventurer needs a little rest. The beetles don't seem to mind.",
                    Talk: "\"Hello, beetles,\" you say. A small beetle waves an antenna at you. Or it might just be eating. Hard to tell."
                }
            });

            // Trees
            spots.push({
                id: 'trees', name: 'Forest Trees',
                parserNouns: [31, 54],
                x: 0, y: 8, w: 120, h: 80,
                walkTo: { x: 60, y: 110 },
                actions: {
                    Look: "Ancient trees tower overhead, their branches intertwined in a thick canopy. Shafts of golden light filter through gaps in the leaves. It would be quite peaceful if you weren't on a desperate quest to save the kingdom.",
                    Get: "You attempt to uproot a tree. The tree is uncooperative. As trees tend to be.",
                    Talk: "\"I don't suppose any of you are enchanted?\" you ask the trees. They rustle slightly in the breeze, which you generously interpret as 'no'."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to courtyard
                x: 130, y: 8, w: 60, h: 20,
                room: 'courtyard', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // South: to river/bridge
                x: 130, y: 155, w: 60, h: 15,
                room: 'riverBridge', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162
            }
        ]
    });

    // ============================================================
    // ROOM 5: RIVER BRIDGE
    // ============================================================
    engine.registerRoom({
        id: 'riverBridge',
        name: 'River Crossing',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Sky
            drawSky(ctx, '#5577BB', '#88AADD');

            // Trees in background
            drawTree(ctx, 20, 75, seed + 50, 0.8);
            drawTree(ctx, 290, 72, seed + 51, 0.9);
            drawPineTree(ctx, 60, 70, seed + 52, 0.7);
            drawPineTree(ctx, 260, 68, seed + 53, 0.8);

            // River banks
            ctx.fillStyle = EGA.GRASS;
            ctx.fillRect(0, 88, 320, 20);
            ctx.fillStyle = '#44AA44';
            ctx.fillRect(0, 145, 320, 25);

            // River
            drawWater(ctx, 0, 108, 320, 37, frame);

            // Bridge
            if (state.flags.trollPaid) {
                // Bridge is clear
                ctx.fillStyle = '#664422';
                ctx.fillRect(140, 105, 40, 45);
                // Planks
                ctx.strokeStyle = '#553311';
                ctx.lineWidth = 0.5;
                for (let p = 107; p < 150; p += 4) {
                    ctx.beginPath();
                    ctx.moveTo(140, p);
                    ctx.lineTo(180, p);
                    ctx.stroke();
                }
                // Rails
                ctx.fillStyle = '#553311';
                ctx.fillRect(138, 105, 3, 45);
                ctx.fillRect(179, 105, 3, 45);
            } else {
                // Bridge with troll
                ctx.fillStyle = '#664422';
                ctx.fillRect(140, 105, 40, 45);
                ctx.strokeStyle = '#553311';
                ctx.lineWidth = 0.5;
                for (let p = 107; p < 150; p += 4) {
                    ctx.beginPath();
                    ctx.moveTo(140, p);
                    ctx.lineTo(180, p);
                    ctx.stroke();
                }
                ctx.fillStyle = '#553311';
                ctx.fillRect(138, 105, 3, 45);
                ctx.fillRect(179, 105, 3, 45);

                // Troll on bridge
                drawNPC(ctx, 160, 133, 'troll', frame);
            }

            // Fish jumping
            if (frame % 120 < 10) {
                const fishX = 80 + (seed % 100);
                const fishY = 115 - (frame % 120) * 1.5;
                ctx.fillStyle = '#AABBCC';
                ctx.fillRect(fishX, fishY, 5, 2);
                ctx.fillRect(fishX + 5, fishY - 1, 2, 4);
            }

            // Rocks in river
            ctx.fillStyle = '#777766';
            ctx.fillRect(50, 120, 8, 5);
            ctx.fillRect(250, 125, 6, 4);

            // Reeds
            ctx.fillStyle = '#558833';
            for (let r = 0; r < 5; r++) {
                ctx.fillRect(10 + r * 7, 105 - r * 2, 1, 10 + r);
            }
            for (let r = 0; r < 4; r++) {
                ctx.fillRect(280 + r * 8, 103 - r, 1, 8 + r);
            }

            // Ground detail
            const rng = mulberry32(seed + 55);
            ctx.fillStyle = '#44BB44';
            for (let i = 0; i < 15; i++) {
                ctx.fillRect(rng() * 320, 90 + rng() * 15, 1, 2);
            }
            for (let i = 0; i < 15; i++) {
                ctx.fillRect(rng() * 320, 148 + rng() * 15, 1, 2);
            }
        },

        getHotspots(state) {
            const spots = [];

            // Troll
            if (!state.flags.trollPaid) {
                spots.push({
                    id: 'troll', name: 'Bridge Troll',
                    parserNouns: [35],
                    x: 145, y: 100, w: 30, h: 40,
                    walkTo: { x: 135, y: 115 },
                    actions: {
                        Look: "A large, green troll stands on the bridge, blocking your path. He has a club, bad posture, and what appears to be a \"World's Best Troll\" mug. He looks irritable. Which is to say, he looks like a troll.",
                        Get: "You're brave, but you're not THAT brave. Or that foolish. Actually, in adventure games those are often the same thing.",
                        Talk: function (engine) {
                            if (engine.hasItem('bread')) {
                                return "\"TOLL!\" bellows the troll. \"Wait, I mean... TROLL! No, that's me. I mean TOLL. This is a toll bridge. You can't cross without paying!\" He eyes your bread hungrily. Maybe you could USE the bread on him?";
                            }
                            return "\"NOBODY CROSSES MY BRIDGE!\" the troll roars. His breath could strip paint. \"Unless,\" he adds more quietly, \"you've got something tasty. Troll work makes a troll hungry.\" He pats his belly meaningfully.";
                        },
                        Use: function (engine) {
                            if (engine.hasItem('bread')) {
                                engine.removeItem('bread');
                                engine.setFlag('trollPaid');
                                engine.addScore(7);
                                return "You offer the bread to the troll. His eyes light up. \"Ooh! Fresh bread! A GENTLEMAN!\" He snatches it, takes an enormous bite, and steps aside with a sweeping bow. \"You may pass!\"";
                            }
                            engine.showDeath("You attempt to push past the troll. He clubs you into the river with the casual efficiency of someone who's done this many, many times. \"NEXT!\" he calls out cheerfully.");
                            return null;
                        }
                    },
                    useCombos: {
                        'bread_troll': function (engine) {
                            engine.removeItem('bread');
                            engine.setFlag('trollPaid');
                            engine.addScore(7);
                            return "You offer the bread to the troll. His eyes light up like a child on Christmas morning — if that child were seven feet tall and green. \"Ooh! Fresh bread! A GENTLEMAN!\" He snatches it, takes an enormous bite, and steps aside with a sweeping bow. \"You may pass, kind sir. Bridge's all yours. Five stars on TrollAdvisor, if you please!\"";
                        }
                    }
                });
            }

            // River
            spots.push({
                id: 'river', name: 'Rushing River',
                parserNouns: [33],
                x: 0, y: 108, w: 140, h: 37,
                walkTo: { x: 70, y: 108 },
                actions: {
                    Look: "The river rushes past with enthusiasm and absolutely no regard for your personal safety. The water looks cold, deep, and thoroughly inhospitable. Fish jump occasionally, showing off.",
                    Talk: "\"Any fish willing to provide quest guidance?\" The river babbles on. It's always babbling. Never actually says anything useful.",
                    Use: function (engine) {
                        engine.showDeath("In a moment of supreme confidence, you leap into the rushing river. Your swimming instructor at the Royal Academy would be proud of your form. Unfortunately, she never taught you how to swim. That was next week's lesson.");
                        return null;
                    },
                    Get: "You scoop up some water. It immediately runs between your fingers because that's what water does. You'd think a questing page would know this."
                }
            });

            // Bridge
            if (state.flags.trollPaid) {
                spots.push({
                    id: 'bridge', name: 'Wooden Bridge',
                    parserNouns: [34],
                    x: 138, y: 103, w: 45, h: 50,
                    walkTo: { x: 160, y: 130 },
                    actions: {
                        Look: "The bridge stretches across the river. With the troll gone, it seems much more inviting. There are still some suspicious crumbs where the troll was standing.",
                        Get: "It's a bridge. Bridges are infrastructure, not inventory.",
                        Talk: "The bridge creaks reassuringly. Or perhaps ominously. Hard to tell with bridges."
                    }
                });
            }

            // Fish
            spots.push({
                id: 'fish', name: 'Jumping Fish',
                parserNouns: [],
                x: 75, y: 110, w: 20, h: 15,
                walkTo: { x: 80, y: 108 },
                actions: {
                    Look: "A silvery fish leaps from the water in a graceful arc, then splashes back in. It's having a much better day than you are.",
                    Get: "You'd need a rod, a line, and considerably more patience than you currently possess.",
                    Talk: "\"Hello, fish!\" Splash. That's fish for 'hello' back. Probably."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to forest
                x: 130, y: 8, w: 60, h: 20,
                room: 'forestPath', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // South: to dark forest (must cross bridge)
                x: 130, y: 155, w: 60, h: 15,
                room: 'darkForest', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162,
                blocked(engine) {
                    if (!engine.hasFlag('trollPaid')) {
                        engine.showText("The troll blocks your way! \"NO PASS! NO TOLL, NO PASS!\" Perhaps you should offer him something...");
                        return true;
                    }
                    return false;
                }
            }
        ]
    });

    // ============================================================
    // ROOM 6: DARK FOREST
    // ============================================================
    engine.registerRoom({
        id: 'darkForest',
        name: 'Dark Forest',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Dark sky barely visible
            ctx.fillStyle = '#112211';
            ctx.fillRect(0, 8, 320, 162);

            // Dense tree canopy
            ctx.fillStyle = '#0a1a0a';
            ctx.fillRect(0, 8, 320, 40);

            // Dark ground
            ctx.fillStyle = '#332211';
            ctx.fillRect(0, 90, 320, 80);

            // Fog/mist
            ctx.fillStyle = 'rgba(100, 120, 100, 0.15)';
            for (let f = 0; f < 8; f++) {
                const fx = (f * 50 + frame * 0.2) % 350 - 30;
                ctx.beginPath();
                ctx.arc(fx, 100 + f * 8, 20 + f * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Trees (very dark, gnarled)
            const drawGnarledTree = (x, y, s) => {
                const trng = mulberry32(s);
                ctx.fillStyle = '#221100';
                ctx.fillRect(x - 3, y - 25, 6, 25);
                // Branches
                ctx.strokeStyle = '#221100';
                ctx.lineWidth = 2;
                for (let b = 0; b < 4; b++) {
                    ctx.beginPath();
                    ctx.moveTo(x, y - 15 - b * 3);
                    ctx.lineTo(x + (trng() - 0.5) * 30, y - 25 - trng() * 15);
                    ctx.stroke();
                }
                ctx.lineWidth = 0.5;
                // Sparse leaves
                ctx.fillStyle = '#113311';
                for (let l = 0; l < 5; l++) {
                    ctx.beginPath();
                    ctx.arc(x + (trng() - 0.5) * 25, y - 30 + trng() * 10, 4 + trng() * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            drawGnarledTree(25, 100, seed + 60);
            drawGnarledTree(80, 95, seed + 61);
            drawGnarledTree(250, 98, seed + 62);
            drawGnarledTree(300, 100, seed + 63);

            // Path
            ctx.fillStyle = '#443322';
            ctx.fillRect(130, 88, 60, 82);

            // Witch's hut visible (east)
            ctx.fillStyle = '#332211';
            ctx.fillRect(280, 70, 30, 25);
            ctx.fillStyle = '#221100';
            ctx.beginPath();
            ctx.moveTo(275, 72);
            ctx.lineTo(295, 55);
            ctx.lineTo(315, 72);
            ctx.fill();
            // Light in window
            ctx.fillStyle = frame % 60 < 30 ? '#FFAA33' : '#FF8811';
            ctx.fillRect(288, 78, 6, 5);

            // Owl in tree
            ctx.fillStyle = '#665544';
            ctx.fillRect(76, 62, 5, 5);
            ctx.fillStyle = EGA.YELLOW;
            ctx.fillRect(77, 63, 1, 1);
            ctx.fillRect(79, 63, 1, 1);

            // Swamp warning (north-west)
            ctx.fillStyle = '#334411';
            ctx.fillRect(0, 85, 50, 10);
            // Bubbles
            if (frame % 40 < 5) {
                ctx.fillStyle = '#668833';
                ctx.beginPath();
                ctx.arc(20, 87, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        },

        getHotspots(state) {
            const spots = [];

            // Owl
            spots.push({
                id: 'owl', name: 'Wise Owl',
                parserNouns: [],
                x: 73, y: 58, w: 12, h: 12,
                walkTo: { x: 80, y: 110 },
                actions: {
                    Look: "A large owl perches in a gnarled tree, watching you with luminous yellow eyes. It has the expression of someone who's seen everything and been impressed by very little.",
                    Get: "The owl fixes you with a withering stare that says, quite clearly, 'Don't even think about it.'",
                    Talk: function () {
                        const hints = [
                            "\"Hoo!\" says the owl. \"The witch trades potions for rare ingredients. She's particularly fond of mushrooms and cheese.\" The owl blinks. \"Also, don't go into the swamp. That's free advice.\"",
                            "\"Hoo hoo!\" The owl ruffles its feathers. \"The crystal cavern is dark as pitch. Only a fool would enter without a light source. You're not a fool, are you?\" It tilts its head skeptically.",
                            "\"Hoo!\" says the owl sagely. \"The dragon at the mountain top is fierce but not invincible. A sleeping potion might level the playing field. Or at least the consciousness field.\"",
                        ];
                        return hints[Math.floor(Math.random() * hints.length)];
                    },
                    Use: "You're not sure what you'd use on an owl, and the owl seems equally confused."
                }
            });

            // Witch's hut (visible)
            spots.push({
                id: 'witchHutEntrance', name: "Distant Cottage",
                parserNouns: [],
                x: 275, y: 55, w: 40, h: 45,
                walkTo: { x: 280, y: 110 },
                actions: {
                    Look: "A crooked cottage sits among the trees to the east, smoke curling from its chimney. A faint light glimmers in the window. It looks cozy, in a 'might turn you into a toad' kind of way."
                }
            });

            // Swamp
            spots.push({
                id: 'swamp', name: 'Murky Swamp',
                parserNouns: [33],
                x: 0, y: 82, w: 55, h: 15,
                walkTo: { x: 30, y: 100 },
                actions: {
                    Look: "A bubbling swamp stretches to the northwest. A weathered sign reads: \"NO TRESPASSING. SURVIVORS WILL BE PROSECUTED.\" Wait — survivors?",
                    Get: "You scoop up some swamp muck. It smells terrible and you immediately regret this decision.",
                    Use: function (engine) {
                        engine.showDeath("You wade into the swamp, ignoring the sign, the smell, and every instinct evolution gave you. The swamp doesn't care about your quest. Bubble, bubble, glub.");
                        return null;
                    },
                    Talk: "\"Hello? Anyone in there?\" A bubble rises to the surface and pops. You decide that counts as a 'stay away'."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to bridge
                x: 130, y: 8, w: 60, h: 20,
                room: 'riverBridge', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // East: to witch's hut
                x: 295, y: 60, w: 25, h: 100,
                room: 'witchHut', enterX: 25, enterY: 140, enterDir: 'right',
                playerWalkX: 305, playerWalkY: 120
            },
            {   // South: to crystal cavern
                x: 130, y: 155, w: 60, h: 15,
                room: 'crystalCavern', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162
            }
        ]
    });

    // ============================================================
    // ROOM 7: WITCH'S HUT
    // ============================================================
    engine.registerRoom({
        id: 'witchHut',
        name: "Witch's Cottage",
        walkBounds: { minX: 15, maxX: 305, minY: 100, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Interior walls  
            ctx.fillStyle = '#443322';
            ctx.fillRect(0, 8, 320, 162);

            // Wooden floor
            ctx.fillStyle = '#554433';
            ctx.fillRect(0, 100, 320, 70);
            ctx.strokeStyle = '#443322';
            ctx.lineWidth = 0.5;
            for (let fy = 100; fy < 170; fy += 8) {
                ctx.beginPath();
                ctx.moveTo(0, fy);
                ctx.lineTo(320, fy);
                ctx.stroke();
            }

            // Shelves (back wall)
            ctx.fillStyle = '#5a4a3a';
            ctx.fillRect(80, 20, 160, 5);
            ctx.fillRect(80, 45, 160, 5);
            ctx.fillRect(80, 70, 160, 5);

            // Bottles on shelves (procedural)
            const bottleColors = ['#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF', '#33FFFF'];
            const rng = mulberry32(seed + 70);
            for (let shelf = 0; shelf < 3; shelf++) {
                const sy = 10 + shelf * 25;
                for (let b = 0; b < 5; b++) {
                    const bx = 85 + b * 30 + rng() * 15;
                    const bh = 5 + rng() * 8;
                    ctx.fillStyle = bottleColors[Math.floor(rng() * bottleColors.length)];
                    ctx.fillRect(bx, sy + (15 - bh), 4, bh);
                    ctx.fillStyle = '#8B7355';
                    ctx.fillRect(bx + 1, sy + (15 - bh) - 2, 2, 2); // cork
                }
            }

            // Cauldron (center)
            ctx.fillStyle = '#222222';
            ctx.fillRect(140, 82, 40, 20);
            ctx.beginPath();
            ctx.arc(160, 82, 20, Math.PI, 0);
            ctx.fill();
            // Bubbling
            ctx.fillStyle = '#44AA44';
            ctx.fillRect(145, 80, 30, 3);
            // Bubbles
            if (frame % 15 < 5) {
                ctx.beginPath();
                ctx.arc(150 + (frame % 30), 78, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Fire under cauldron
            ctx.fillStyle = EGA.LRED;
            ctx.fillRect(145, 100, 6, 4);
            ctx.fillStyle = EGA.YELLOW;
            ctx.fillRect(155, 99, 4, 5);
            ctx.fillStyle = '#FF8800';
            ctx.fillRect(165, 100, 5, 4);

            // Cabinet (right side)
            ctx.fillStyle = '#664433';
            ctx.fillRect(260, 40, 40, 50);
            ctx.strokeStyle = '#553322';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(262, 42, 17, 46);
            ctx.strokeRect(281, 42, 17, 46);
            // Keyhole
            if (!state.flags.cabinetUnlocked) {
                ctx.fillStyle = EGA.GOLD;
                ctx.fillRect(277, 60, 2, 3);
            }

            // Broom in corner
            ctx.fillStyle = EGA.BROWN;
            ctx.fillRect(30, 30, 2, 65);
            ctx.fillStyle = '#886644';
            ctx.fillRect(26, 88, 10, 8);

            // Cat on shelf
            ctx.fillStyle = '#222222';
            ctx.fillRect(85, 38, 7, 5);
            ctx.fillRect(88, 36, 3, 2); // head
            ctx.fillStyle = EGA.YELLOW;
            ctx.fillRect(89, 37, 1, 1); // eye
            // tail
            ctx.fillRect(82, 39, 4, 1);

            // Witch NPC
            drawNPC(ctx, 200, 135, 'witch', frame);

            // Door (left wall exit)
            drawDoor(ctx, 3, 80, 16, 25, '#553322');

            // Cobwebs in corners
            ctx.strokeStyle = '#666655';
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(20, 8);
            ctx.lineTo(0, 28);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(320, 8);
            ctx.lineTo(300, 8);
            ctx.lineTo(320, 28);
            ctx.stroke();
        },

        getHotspots(state) {
            const spots = [];

            // Witch
            spots.push({
                id: 'witch', name: 'The Witch',
                parserNouns: [39],
                x: 185, y: 100, w: 30, h: 40,
                walkTo: { x: 175, y: 135 },
                actions: {
                    Look: "A witch of indeterminate age (asking would be unwise). She has green skin, a pointed hat, and a nose that could open letters. Despite appearances, she seems more eccentric than evil. Her apron says \"Hex the Cook\".",
                    Get: "You value your current non-amphibian form too much to attempt this.",
                    Talk: function (engine) {
                        if (engine.hasFlag('gotPotion')) {
                            const lines = [
                                "\"Still here? The potion works, trust me. I've put dozens of dragons to sleep. Hundreds, even!\" She pauses. \"Okay, mostly just the one dragon. But it worked!\"",
                                "\"Off you go! Adventures don't complete themselves, you know. Though wouldn't it be nice if they did?\"",
                                "\"Oh, you're back. Don't touch anything. Especially the purple bottle. ESPECIALLY the purple bottle.\""
                            ];
                            return lines[Math.floor(Math.random() * lines.length)];
                        }
                        if (engine.hasItem('cheese') && engine.hasItem('mushroom')) {
                            return "The witch's eyes light up. \"Ooh! Is that a red-spotted mushroom? And aged cheese? Those are EXACTLY what I need for my Sleeping Potion! Trade me those ingredients and I'll give you the potion. Use them on me, dearie!\"";
                        }
                        return "\"Well well, a visitor! How delightful!\" The witch cackles. \"I'm Hagatha. No relation to THAT Hagatha. Different witch entirely.\" She stirs her cauldron. \"I'm brewing a Sleeping Potion — powerful enough to knock out a dragon! But I'm missing ingredients. I need a RED mushroom and some AGED cheese. Bring me those and the potion is yours, dearie!\"";
                    },
                    Use: function (engine) {
                        if (engine.hasItem('cheese') && engine.hasItem('mushroom')) {
                            engine.removeItem('cheese');
                            engine.removeItem('mushroom');
                            engine.addItem('potion', 'Sleeping Potion', 'A bubbling green sleeping potion');
                            engine.setFlag('gotPotion');
                            engine.addScore(10);
                            audio.sfxMagic();
                            return "\"Ooh, perfect!\" Hagatha snatches the cheese and mushroom. She tosses them into the cauldron, adds a pinch of something unidentifiable, and mutters an incantation. Green sparks fly! She fills a bottle with the result. \"One Sleeping Potion! Use it on the dragon. Don't drink it yourself. DON'T.\"";
                        }
                        engine.showDeath("You try to push the witch into her own cauldron. She spins around with surprising agility. \"Rude!\" A flash of green light, and you're now a newt. You try to feel brave, but it's hard when you're two inches long. You don't get better.");
                        return null;
                    }
                },
                useCombos: {
                    'cheese_witch': function (engine) {
                        if (engine.hasItem('mushroom')) {
                            engine.removeItem('cheese');
                            engine.removeItem('mushroom');
                            engine.addItem('potion', 'Sleeping Potion', 'A bubbling green sleeping potion');
                            engine.setFlag('gotPotion');
                            engine.addScore(10);
                            audio.sfxMagic();
                            return "\"Ooh, perfect!\" Hagatha snatches the cheese and mushroom from your hands. She tosses them into the cauldron with a flourish, adds a pinch of something unidentifiable, and mutters an incantation. The cauldron erupts in green sparks! She ladles the result into a small bottle. \"Here you are, dearie. One Sleeping Potion! Use it on the dragon's food. Don't drink it yourself. I mean it. DON'T.\"";
                        }
                        return "\"Cheese! Lovely! But I also need a RED mushroom, dearie. Can't make a potion with just cheese. Well, I COULD, but nobody would like the result.\"";
                    },
                    'mushroom_witch': function (engine) {
                        if (engine.hasItem('cheese')) {
                            engine.removeItem('cheese');
                            engine.removeItem('mushroom');
                            engine.addItem('potion', 'Sleeping Potion', 'A bubbling green sleeping potion');
                            engine.setFlag('gotPotion');
                            engine.addScore(10);
                            audio.sfxMagic();
                            return "\"The mushroom! And you have cheese too! Perfect!\" Hagatha gleefully tosses both ingredients into the cauldron. Green sparks fly! She fills a bottle with the resulting potion. \"There you go, dearie — one Sleeping Potion! Strong enough for a dragon. Don't ask how I know.\"";
                        }
                        return "\"A mushroom! Wonderful! But I also need some aged CHEESE. The stinkier the better, actually.\"";
                    }
                }
            });

            // Shelves / Books
            spots.push({
                id: 'shelves', name: 'Potion Shelves',
                parserNouns: [41, 63],
                x: 78, y: 10, w: 165, h: 65,
                walkTo: { x: 160, y: 115 },
                actions: {
                    Look: "Shelves lined with bottles in every color: bubbling purple, shimmering gold, suspicious puce. The labels include \"Potion of Invisibility (Probably)\", \"Essence of Quite Nice Smelling\", and \"DO NOT OPEN (I Mean It This Time)\". There's also a book titled \"Curses for Dummies\" next to \"Fifty Shades of Hex\" and \"The Cartographer's Riddle Book: Things With Cities But No Houses\". Curious.",
                    Get: function (engine) {
                        engine.showDeath("You reach for a random bottle. It slips. It shatters. The resulting cloud of purple smoke transforms you into a particularly confused-looking hamster. Hagatha picks you up and puts you in a cage. \"I needed a new one of those,\" she says.");
                        return null;
                    },
                    Talk: "You read the bottle labels aloud. \"Potion of Mild Inconvenience\"... \"Tincture of Regret\"... \"Wednesday's Soup\"... wait, that last one might actually just be soup."
                }
            });

            // Cabinet
            spots.push({
                id: 'cabinet', name: 'Wooden Cabinet',
                parserNouns: [],
                x: 258, y: 38, w: 45, h: 55,
                walkTo: { x: 260, y: 120 },
                actions: {
                    Look: state.flags.cabinetUnlocked
                        ? "The cabinet is open. Inside are mostly cobwebs and a recipe for \"Dragon's Bane Tea\" (1 cup chamomile, 3 eyes of newt, a dash of cinnamon)."
                        : "A sturdy wooden cabinet with a brass keyhole. It's locked tight. Whatever's inside, the witch wants it to stay there. Or someone else wanted it kept from HER.",
                    Get: "The cabinet is bolted to the wall. Interior decorating was more permanent in the old days.",
                    Use: function (engine) {
                        if (engine.hasFlag('cabinetUnlocked')) {
                            return "The cabinet is already open. There's nothing else useful inside. Unless you want the recipe for Dragon's Bane Tea.";
                        }
                        if (engine.hasItem('key')) {
                            engine.removeItem('key');
                            engine.setFlag('cabinetUnlocked');
                            engine.addItem('crystal_shard', 'Crystal Shard', 'A glowing shard that points toward magic');
                            engine.addScore(5);
                            return "The old key fits the lock! The cabinet creaks open, revealing a glowing crystal shard inside. It pulses with magical energy and seems to point southward. This must be a finder's shard — it can guide you to the enchanted gems! You take it carefully.";
                        }
                        return "The cabinet is locked. You need a key.";
                    },
                    Talk: "\"Open sesame!\" Nothing happens. \"Abracadabra?\" Still nothing. Verbal lockpicking is not your forte."
                },
                useCombos: {
                    'key_cabinet': function (engine) {
                        engine.removeItem('key');
                        engine.setFlag('cabinetUnlocked');
                        engine.addItem('crystal_shard', 'Crystal Shard', 'A glowing shard that points toward magic');
                        engine.addScore(5);
                        return "You insert the key and turn. Click! The cabinet swings open. Inside, a crystal shard pulses with blue-white light. It must be a finder's shard! As you pocket it, it seems to tug gently southward. Toward the caverns, perhaps?";
                    }
                }
            });

            // Cauldron
            spots.push({
                id: 'cauldron', name: 'Bubbling Cauldron',
                parserNouns: [40],
                x: 135, y: 75, w: 50, h: 30,
                walkTo: { x: 160, y: 115 },
                actions: {
                    Look: "A large iron cauldron bubbles with something green and viscous. It smells like a forest floor after rain. Mixed with old socks. And ambition.",
                    Get: "It's boiling hot, full of mysterious liquid, and about as portable as a small horse. No.",
                    Use: function (engine) {
                        engine.showDeath("You lean over and take a sip from the cauldron. It tastes surprisingly like chicken soup for exactly 0.3 seconds. Then everything goes wobbly. Very, very wobbly. And then very, very gone.");
                        return null;
                    },
                    Talk: "\"Bubble, bubble...\" you begin. Hagatha glares at you. \"If you finish that rhyme, I'm turning you into something with more legs and fewer opinions.\""
                }
            });

            // Broom
            spots.push({
                id: 'broom', name: 'Broomstick',
                parserNouns: [],
                x: 25, y: 28, w: 12, h: 70,
                walkTo: { x: 35, y: 115 },
                actions: {
                    Look: "A classic witch's broom, leaning in the corner. It's seen better days. There's a bumper sticker on the handle: \"My other ride is also a broom.\"",
                    Get: "You reach for the broom. Hagatha hisses. \"Touch my broom and you'll be scrubbing floors with your FACE.\" You withdraw your hand quickly.",
                    Talk: "\"Nice broom,\" you say awkwardly. The broom does not acknowledge the compliment."
                }
            });

            return spots;
        },

        exits: [
            {   // West: back to dark forest
                x: 0, y: 70, w: 15, h: 100,
                room: 'darkForest', enterX: 290, enterY: 130, enterDir: 'left',
                playerWalkX: 10, playerWalkY: 130
            }
        ]
    });

    // ============================================================
    // ROOM 8: CRYSTAL CAVERN
    // ============================================================
    engine.registerRoom({
        id: 'crystalCavern',
        name: 'Crystal Cavern',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            const hasLight = state.flags.hasLantern || state.flags.cavernLit;

            // Dark cave background
            ctx.fillStyle = hasLight ? '#1a1a2e' : '#050508';
            ctx.fillRect(0, 8, 320, 162);

            if (!hasLight) {
                // Pitch black with tiny hints
                ctx.fillStyle = EGA.WHITE;
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText("It's too dark to see!", 160, 100);
                ctx.fillText("You need a light source.", 160, 115);
                ctx.textAlign = 'left';
                return;
            }

            // Cave ceiling (stalactites)
            ctx.fillStyle = '#333344';
            ctx.fillRect(0, 8, 320, 30);
            const rng = mulberry32(seed + 80);
            for (let s = 0; s < 15; s++) {
                const sx = rng() * 320;
                const sh = 10 + rng() * 20;
                ctx.fillStyle = '#333344';
                ctx.beginPath();
                ctx.moveTo(sx - 3, 8);
                ctx.lineTo(sx, 8 + sh);
                ctx.lineTo(sx + 3, 8);
                ctx.fill();
            }

            // Cave floor
            ctx.fillStyle = '#222233';
            ctx.fillRect(0, 100, 320, 70);
            // Stalagmites
            for (let s = 0; s < 8; s++) {
                const sx = rng() * 320;
                const sh = 5 + rng() * 12;
                ctx.fillStyle = '#2a2a3a';
                ctx.beginPath();
                ctx.moveTo(sx - 3, 170);
                ctx.lineTo(sx, 170 - sh);
                ctx.lineTo(sx + 3, 170);
                ctx.fill();
            }

            // Glowing crystals (procedural)
            const crystalColors = ['#FF4444', '#44FF44', '#4444FF', '#FF44FF', '#44FFFF', '#FFFF44'];
            for (let c = 0; c < 12; c++) {
                const cx = rng() * 300 + 10;
                const cy = 40 + rng() * 80;
                const ch = 8 + rng() * 15;
                const cw = 3 + rng() * 4;
                const color = crystalColors[Math.floor(rng() * crystalColors.length)];
                const glow = Math.sin(frame * 0.05 + c) * 0.3 + 0.7;
                ctx.globalAlpha = glow;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(cx - cw / 2, cy);
                ctx.lineTo(cx, cy - ch);
                ctx.lineTo(cx + cw / 2, cy);
                ctx.closePath();
                ctx.fill();
                // Glow effect
                ctx.globalAlpha = glow * 0.2;
                ctx.beginPath();
                ctx.arc(cx, cy - ch / 2, ch / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // Sapphire pedestal (if not taken)
            if (!state.flags.hasSapphire) {
                ctx.fillStyle = '#555566';
                ctx.fillRect(155, 100, 10, 20);
                ctx.fillRect(150, 98, 20, 4);
                // Sapphire gem
                ctx.fillStyle = '#2266FF';
                const sGlow = Math.sin(frame * 0.08) * 0.2 + 0.8;
                ctx.globalAlpha = sGlow;
                ctx.beginPath();
                ctx.moveTo(160, 86);
                ctx.lineTo(166, 92);
                ctx.lineTo(163, 98);
                ctx.lineTo(157, 98);
                ctx.lineTo(154, 92);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = sGlow * 0.3;
                ctx.beginPath();
                ctx.arc(160, 92, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Underground pool
            ctx.fillStyle = '#1a1a44';
            ctx.fillRect(20, 140, 60, 25);
            drawWater(ctx, 20, 140, 60, 25, frame);

            // Bats
            if (frame % 200 < 20) {
                const batX = (frame * 2) % 320;
                ctx.fillStyle = '#333';
                ctx.fillRect(batX - 3, 20, 2, 1);
                ctx.fillRect(batX, 19, 1, 2);
                ctx.fillRect(batX + 2, 20, 2, 1);
            }

            // Lantern glow (circle of light around player area)
            const grad = ctx.createRadialGradient(160, 130, 20, 160, 130, 100);
            grad.addColorStop(0, 'rgba(255, 200, 100, 0.08)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 8, 320, 162);
        },

        getHotspots(state) {
            const spots = [];

            if (!state.flags.hasLantern && !state.flags.cavernLit) {
                // Dark cave - limited interaction
                spots.push({
                    id: 'darkness', name: 'Darkness',
                    parserNouns: [44],
                    x: 0, y: 8, w: 320, h: 162,
                    walkTo: { x: 160, y: 130 },
                    actions: {
                        Look: "You can't see a thing! It's darker than a moonless night in a coal mine. You need some kind of light source.",
                        Use: function (engine) {
                            if (engine.hasItem('lantern')) {
                                engine.setFlag('cavernLit');
                                return "You raise the lantern high. Its warm light fills the cavern, revealing a breathtaking sight! Crystals of every color line the walls, ceiling, and floor, refracting the lamplight into a thousand dancing rainbows. On a stone pedestal in the center, a magnificent blue gem gleams brightly.";
                            }
                            return "Use what? You can't see anything!";
                        }
                    },
                    useCombos: {
                        'lantern_darkness': function (engine) {
                            engine.setFlag('cavernLit');
                            audio.sfxMagic();
                            return "You raise the lantern. Light floods the cavern! Crystals of every imaginable color burst to life around you, sending rainbow sparkles dancing across every surface. It's spectacularly beautiful. On a stone pedestal ahead, a sapphire gem pulses with an inner blue light.";
                        }
                    }
                });
                return spots;
            }

            // Sapphire on pedestal
            if (!state.flags.hasSapphire) {
                spots.push({
                    id: 'sapphire', name: 'Glowing Sapphire',
                    parserNouns: [47],
                    x: 148, y: 82, w: 25, h: 40,
                    walkTo: { x: 160, y: 120 },
                    actions: {
                        Look: "A magnificent sapphire rests on a stone pedestal, pulsing with deep blue light. This must be the Sapphire of Wisdom! It practically radiates intelligence. Unlike some recent decisions you've made.",
                        Get: function (engine) {
                            engine.addItem('sapphire', 'Sapphire', 'The Sapphire of Wisdom — glowing blue gem');
                            engine.setFlag('hasSapphire');
                            engine.addScore(12);
                            audio.sfxMagic();
                            return "You carefully lift the Sapphire of Wisdom from its pedestal. It feels warm in your hands and seems to hum with ancient power. One gem down, two to go! For a moment, you feel slightly wiser. You resist the urge to do anything foolish to test this theory.";
                        },
                        Talk: "\"Sapphire of Wisdom, grant me your knowledge!\" The gem glows slightly brighter. You now know that the mitochondria is the powerhouse of the cell. Useful? Debatable."
                    }
                });
            }

            // Crystals
            spots.push({
                id: 'crystals', name: 'Cave Crystals',
                parserNouns: [42],
                x: 0, y: 30, w: 320, h: 65,
                walkTo: { x: 100, y: 120 },
                actions: {
                    Look: "Crystals of every color grow from the cave walls like frozen rainbows. Red, green, blue, purple — it's like being inside a stained glass window. Nature really outdid herself here.",
                    Get: function (engine) {
                        engine.showDeath("You grab a random crystal and yank it free. The cave rumbles. The crystals begin to crack. Geology wasn't on your curriculum, was it? The ceiling comes down in a shower of colorful, very heavy, very final debris.");
                        return null;
                    },
                    Talk: "You whisper to the crystals. They chime softly in response, creating an ethereal melody. It's hauntingly beautiful. You briefly consider canceling the quest and becoming a cave musician."
                }
            });

            // Underground pool
            spots.push({
                id: 'pool', name: 'Underground Pool',
                parserNouns: [33],
                x: 18, y: 138, w: 64, h: 27,
                walkTo: { x: 55, y: 138 },
                actions: {
                    Look: "A still underground pool reflects the crystal light like a mirror of stars. The water is so clear you can see blind cave fish swimming lazily below. They seem to have a better work-life balance than you.",
                    Get: "You scoop some water. It's crystal clear and tastes like minerals and centuries. Not bad, actually.",
                    Talk: "You ask the pool for advice. Your reflection stares back at you with the expression of someone who really should be focusing on the quest."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to dark forest
                x: 130, y: 8, w: 60, h: 20,
                room: 'darkForest', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // South: to mountain pass
                x: 130, y: 155, w: 60, h: 15,
                room: 'mountainPass', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162
            }
        ],

        onEnter(engine) {
            if (!engine.hasFlag('cavernLit') && engine.hasItem('lantern')) {
                // Auto-light with lantern
                engine.setFlag('cavernLit');
                engine.showText("Your lantern illuminates the cavern, revealing a breathtaking display of glowing crystals! The light refracts through the formations, painting the walls in every color.");
            } else if (!engine.hasFlag('cavernLit') && !engine.hasItem('lantern')) {
                engine.showText("It's pitch black in here! You can barely see your hand in front of your face. You need a light source to explore this cave.");
            }
        }
    });

    // ============================================================
    // ROOM 9: MOUNTAIN PASS
    // ============================================================
    engine.registerRoom({
        id: 'mountainPass',
        name: 'Mountain Pass',
        walkBounds: { minX: 25, maxX: 295, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Sky
            drawSky(ctx, '#335588', '#6699CC');
            drawCloud(ctx, 50, 18, seed + 90);
            drawCloud(ctx, 250, 25, seed + 91);

            // Distant mountain peaks
            ctx.fillStyle = '#667788';
            ctx.beginPath();
            ctx.moveTo(0, 60);
            ctx.lineTo(50, 25);
            ctx.lineTo(100, 50);
            ctx.lineTo(160, 15);
            ctx.lineTo(220, 45);
            ctx.lineTo(280, 20);
            ctx.lineTo(320, 55);
            ctx.lineTo(320, 60);
            ctx.fill();
            // Snow caps
            ctx.fillStyle = '#DDEEFF';
            ctx.beginPath();
            ctx.moveTo(45, 28);
            ctx.lineTo(50, 25);
            ctx.lineTo(55, 28);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(155, 18);
            ctx.lineTo(160, 15);
            ctx.lineTo(165, 18);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(275, 23);
            ctx.lineTo(280, 20);
            ctx.lineTo(285, 23);
            ctx.fill();

            // Rocky ground
            ctx.fillStyle = '#776655';
            ctx.fillRect(0, 88, 320, 82);
            ctx.fillStyle = '#887766';
            // Rocks
            const rng = mulberry32(seed + 92);
            for (let i = 0; i < 15; i++) {
                const rx = rng() * 320;
                const ry = 90 + rng() * 70;
                const rs = 3 + rng() * 6;
                ctx.fillStyle = rng() > 0.5 ? '#666655' : '#887766';
                ctx.beginPath();
                ctx.arc(rx, ry, rs, 0, Math.PI * 2);
                ctx.fill();
            }

            // Mountain path (winding)
            ctx.fillStyle = '#665544';
            ctx.beginPath();
            ctx.moveTo(130, 88);
            ctx.lineTo(140, 170);
            ctx.lineTo(200, 170);
            ctx.lineTo(190, 88);
            ctx.fill();

            // Cliff edge (left)
            ctx.fillStyle = '#554433';
            ctx.fillRect(0, 88, 25, 82);
            // Drop-off indication
            ctx.strokeStyle = '#443322';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(25, 88);
            ctx.lineTo(25, 170);
            ctx.stroke();
            ctx.setLineDash([]);

            // Warning sign
            ctx.fillStyle = '#664422';
            ctx.fillRect(40, 100, 2, 20);
            ctx.fillStyle = EGA.YELLOW;
            ctx.fillRect(32, 95, 18, 10);
            ctx.fillStyle = EGA.BLACK;
            ctx.font = '4px monospace';
            ctx.fillText('DANGER', 33, 101);

            // Eagle soaring
            const eagleX = 200 + Math.sin(frame * 0.015) * 60;
            const eagleY = 30 + Math.cos(frame * 0.02) * 10;
            ctx.fillStyle = '#332211';
            ctx.fillRect(eagleX, eagleY, 3, 2);
            ctx.fillRect(eagleX - 5, eagleY + 1, 5, 1);
            ctx.fillRect(eagleX + 3, eagleY + 1, 5, 1);

            // Small alpine flowers
            for (let i = 0; i < 6; i++) {
                drawFlower(ctx, 220 + rng() * 80, 92 + rng() * 30, '#FFAAFF', seed + 95 + i);
            }

            // Rocky outcrop right
            ctx.fillStyle = '#666655';
            ctx.fillRect(290, 85, 30, 85);
            ctx.fillStyle = '#777766';
            ctx.fillRect(285, 70, 35, 20);
        },

        getHotspots(state) {
            const spots = [];

            // Cliff edge
            spots.push({
                id: 'cliff', name: 'Cliff Edge',
                parserNouns: [53],
                x: 0, y: 88, w: 28, h: 82,
                walkTo: { x: 30, y: 130 },
                actions: {
                    Look: "A sheer cliff drops away to the left. Far below, you can see the tiny dots of trees. That's a very long way down. A VERY long way. Your knees feel wobbly just looking.",
                    Get: "Get what? Vertigo? You've already got plenty of that.",
                    Use: function (engine) {
                        engine.showDeath("You step confidently toward the cliff edge. The view on the way down is breathtaking — emphasis on the 'taking breath' part. You have approximately four seconds to appreciate the spectacular panorama of Daventry before the ground introduces itself quite forcefully.");
                        return null;
                    },
                    Talk: "\"I'm not afraid of heights!\" you declare bravely to the void. The void does not respond. The void doesn't need to."
                }
            });

            // Eagle
            spots.push({
                id: 'eagle', name: 'Soaring Eagle',
                parserNouns: [],
                x: 150, y: 15, w: 120, h: 30,
                walkTo: { x: 200, y: 110 },
                actions: {
                    Look: "A majestic eagle circles overhead, riding the mountain thermals with effortless grace. You briefly wish you could fly. Then you remember that time you fell off a step-ladder. Walking is fine.",
                    Get: "The eagle is approximately 200 feet above you. Even if you could reach it, it would have strong opinions about being grabbed.",
                    Talk: "\"Oh great eagle, share your wisdom!\" you call out. The eagle lets out a piercing cry that roughly translates to \"Get your own thermals!\" Or possibly just \"Screech!\" Your Aquiline is rusty."
                }
            });

            // Warning sign
            spots.push({
                id: 'sign', name: 'Warning Sign',
                parserNouns: [36],
                x: 30, y: 90, w: 25, h: 35,
                walkTo: { x: 50, y: 120 },
                actions: {
                    Look: "A yellow warning sign reads \"DANGER\". Below in smaller text: \"Cliff, Dragon, General Peril. Management accepts no liability for questing-related incidents.\"",
                    Get: "The sign is hammered firmly into the rock. Someone clearly wanted it to stay put. Wise of them.",
                    Talk: "\"Thanks for the warning,\" you say to the sign. It says \"DANGER\" back. Consistently on-message."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to crystal cavern
                x: 130, y: 8, w: 60, h: 20,
                room: 'crystalCavern', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // South: to dragon's lair
                x: 130, y: 155, w: 60, h: 15,
                room: 'dragonLair', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162
            }
        ]
    });

    // ============================================================
    // ROOM 10: DRAGON'S LAIR
    // ============================================================
    engine.registerRoom({
        id: 'dragonLair',
        name: "Dragon's Lair",
        walkBounds: { minX: 15, maxX: 305, minY: 100, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Dark cavern
            ctx.fillStyle = '#1a1210';
            ctx.fillRect(0, 8, 320, 162);

            // Cave walls
            ctx.fillStyle = '#2a2018';
            const rng = mulberry32(seed + 100);
            for (let i = 0; i < 20; i++) {
                const rx = rng() * 320;
                const ry = 10 + rng() * 50;
                const rr = 10 + rng() * 20;
                ctx.beginPath();
                ctx.arc(rx, ry, rr, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cave floor
            ctx.fillStyle = '#2a2018';
            ctx.fillRect(0, 100, 320, 70);

            // Treasure pile (gold coins, gems)
            ctx.fillStyle = EGA.GOLD;
            for (let i = 0; i < 40; i++) {
                const tx = 150 + rng() * 100;
                const ty = 90 + rng() * 30;
                ctx.fillRect(tx, ty, 3, 2);
            }
            ctx.fillStyle = '#CCAA00';
            for (let i = 0; i < 20; i++) {
                const tx = 160 + rng() * 80;
                const ty = 85 + rng() * 35;
                ctx.beginPath();
                ctx.arc(tx, ty, 1 + rng() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Scattered gems in pile
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(200, 95, 4, 3);
            ctx.fillStyle = '#44FF44';
            ctx.fillRect(220, 92, 3, 4);
            ctx.fillStyle = '#4488FF';
            ctx.fillRect(180, 98, 3, 3);

            // Ruby (visible in pile)
            if (!state.flags.hasRuby) {
                const rGlow = Math.sin(frame * 0.08) * 0.2 + 0.8;
                ctx.globalAlpha = rGlow;
                ctx.fillStyle = '#FF2222';
                ctx.beginPath();
                ctx.moveTo(210, 85);
                ctx.lineTo(215, 90);
                ctx.lineTo(213, 96);
                ctx.lineTo(207, 96);
                ctx.lineTo(205, 90);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = rGlow * 0.3;
                ctx.beginPath();
                ctx.arc(210, 92, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Dragon
            if (!state.flags.dragonAsleep) {
                // Awake dragon - eyes open, occasional fire
                drawNPC(ctx, 180, 85, 'dragon', frame);
                // Fire breath particles
                if (frame % 80 < 10) {
                    for (let f = 0; f < 5; f++) {
                        ctx.fillStyle = f % 2 === 0 ? EGA.YELLOW : '#FF6600';
                        ctx.fillRect(200 + f * 5, 68 + Math.sin(f) * 3, 3, 2);
                    }
                }
            } else {
                // Sleeping dragon - eyes closed, Z's
                drawNPC(ctx, 180, 85, 'dragon', 0);
                // ZZZ
                ctx.fillStyle = EGA.WHITE;
                ctx.font = '7px monospace';
                const zOffset = Math.sin(frame * 0.03) * 3;
                ctx.fillText('Z', 200, 55 + zOffset);
                ctx.fillText('z', 210, 48 + zOffset);
                ctx.fillText('z', 218, 42 + zOffset);
            }

            // Bones on floor (Sierra humor)
            ctx.fillStyle = '#DDDDBB';
            ctx.fillRect(50, 140, 10, 2);
            ctx.fillRect(55, 138, 2, 6);
            ctx.fillRect(80, 150, 8, 1);
            // Skeleton with sign
            ctx.fillRect(30, 130, 4, 8);
            ctx.fillRect(28, 130, 8, 2);
            ctx.fillRect(30, 138, 4, 2); // skull
            ctx.fillStyle = '#AA8866';
            ctx.fillRect(38, 125, 15, 10);
            ctx.fillStyle = EGA.WHITE;
            ctx.font = '3px monospace';
            ctx.fillText('I should', 39, 130);
            ctx.fillText('have used', 39, 134);

            // Lava glow in back
            ctx.fillStyle = '#441100';
            ctx.fillRect(0, 60, 50, 30);
            const lavaGlow = Math.sin(frame * 0.04) * 0.15 + 0.3;
            ctx.fillStyle = `rgba(255, 60, 0, ${lavaGlow})`;
            ctx.fillRect(5, 65, 40, 20);
        },

        getHotspots(state) {
            const spots = [];

            // Dragon
            if (!state.flags.dragonAsleep) {
                spots.push({
                    id: 'dragon', name: 'Fearsome Dragon',
                    parserNouns: [45],
                    x: 155, y: 55, w: 60, h: 40,
                    walkTo: { x: 130, y: 120 },
                    actions: {
                        Look: "An enormous red dragon lounges atop a mountain of gold. Its scales gleam like polished rubies, its claws could shred steel, and its breath... well, let's just say it could really use a mint. The Ruby of Courage glows among its treasure hoard.",
                        Get: function (engine) {
                            engine.showDeath("You reach out to pet the dragon. How brave! How noble! How incredibly, magnificently, spectacularly foolish. The dragon opens one eye, yawns, and incinerates you with the casualness of someone lighting a birthday candle. \"Oh, a snack,\" it mumbles, and goes back to sleep.");
                            return null;
                        },
                        Talk: function (engine) {
                            engine.showDeath("\"Excuse me, Mr. Dragon?\" you begin politely. The dragon opens both eyes. \"A talking appetizer,\" it says with interest. \"How novel.\" This conversation ends poorly for you. Very, very poorly.");
                            return null;
                        },
                        Use: function (engine) {
                            if (engine.hasItem('potion')) {
                                engine.removeItem('potion');
                                engine.setFlag('dragonAsleep');
                                engine.addScore(8);
                                audio.sfxDragon();
                                return "You carefully uncork the Sleeping Potion and pour it near the dragon's snout. The dragon sniffs... its eyelids droop... and with a thunderous snore that shakes loose several stalactites, the beast falls into a deep sleep!";
                            }
                            engine.showDeath("You attempt to use force against the dragon. This is like using a strongly worded letter against a volcano. Effective duration: approximately 0.001 seconds.");
                            return null;
                        }
                    },
                    useCombos: {
                        'potion_dragon': function (engine) {
                            engine.removeItem('potion');
                            engine.setFlag('dragonAsleep');
                            engine.addScore(8);
                            audio.sfxDragon();
                            return "You carefully uncork the Sleeping Potion and pour it into a golden bowl near the dragon's head. The dragon sniffs... its eyelids droop... its massive body relaxes... and with a thunderous snore that shakes loose several stalactites, the beast falls into a deep sleep! You're pretty sure the potion was meant for the food, not the air, but hey — it worked!";
                        }
                    }
                });
            } else {
                spots.push({
                    id: 'dragon', name: 'Sleeping Dragon',
                    parserNouns: [45],
                    x: 155, y: 55, w: 60, h: 40,
                    walkTo: { x: 130, y: 120 },
                    actions: {
                        Look: "The dragon snores peacefully, occasionally puffing a small ring of smoke. It looks almost cute. ALMOST. You remind yourself that 'cute' is not typically a survival strategy.",
                        Get: "Even sleeping dragons are not cuddly. Leave the dragon alone.",
                        Talk: "\"Sweet dreams,\" you whisper to the sleeping dragon. It snores in response. Probably not a good idea to push your luck."
                    }
                });
            }

            // Ruby (only accessible when dragon sleeps)
            if (state.flags.dragonAsleep && !state.flags.hasRuby) {
                spots.push({
                    id: 'ruby', name: 'Ruby of Courage',
                    parserNouns: [48],
                    x: 200, y: 82, w: 20, h: 20,
                    walkTo: { x: 200, y: 115 },
                    actions: {
                        Look: "The Ruby of Courage gleams atop the treasure hoard, pulsing with a warm red light. It's calling to you. Or you're imagining things. Either way, it's very pretty.",
                        Get: function (engine) {
                            engine.addItem('ruby', 'Ruby', 'The Ruby of Courage — blazing red gem');
                            engine.setFlag('hasRuby');
                            engine.addScore(12);
                            audio.sfxMagic();
                            return "You tiptoe across the treasure pile — VERY carefully, because gold coins are surprisingly noisy — and pluck the Ruby of Courage from the hoard. It pulses warmly in your hand and you feel a surge of bravery. Two gems found! One more to go! The dragon snores on, blissfully unaware. You resist the urge to take anything else. Mostly.";
                        },
                        Talk: "The Ruby hums with an inner fire. It seems eager to be reunited with the Mirror."
                    }
                });
            }

            // Treasure
            spots.push({
                id: 'treasure', name: 'Treasure Hoard',
                parserNouns: [46],
                x: 145, y: 88, w: 100, h: 32,
                walkTo: { x: 160, y: 125 },
                actions: {
                    Look: "Mountains of gold coins, jewels, and artifacts. You see crowns, scepters, and what appears to be a signed first edition of \"Dragononomics\". The pile is enormous — this dragon has been hoarding for centuries.",
                    Get: function (engine) {
                        if (!engine.hasFlag('dragonAsleep')) {
                            engine.showDeath("You reach for a gold coin. The dragon's eye snaps open. \"THIEF!\" it roars. This is a dragon who takes personal property rights VERY seriously.");
                            return null;
                        }
                        return "You consider pocketing some gold, but your pockets are already full of quest items and questionable life choices. Besides, the Ruby of Courage is the only treasure that matters right now.";
                    },
                    Talk: "\"All this gold and not a single vending machine in sight,\" you mutter."
                }
            });

            // Bones / Skeleton
            spots.push({
                id: 'skeleton', name: 'Skeleton',
                parserNouns: [61],
                x: 25, y: 122, w: 35, h: 22,
                walkTo: { x: 50, y: 140 },
                actions: {
                    Look: "The skeleton of a previous adventurer sits propped against the wall. A small sign next to it reads: \"I should have used...\" The rest has faded. You can only hope they were advocating for sunscreen. Or maybe sleeping potions. Probably sleeping potions.",
                    Get: "You could take a bone, but that seems disrespectful. Also, you have standards. Low standards, but standards.",
                    Talk: "\"Any last advice?\" you ask the skeleton. It maintains a stoic silence. Typical."
                }
            });

            return spots;
        },

        exits: [
            {   // North: back to mountain
                x: 130, y: 8, w: 60, h: 20,
                room: 'mountainPass', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            },
            {   // South: to enchanted lake
                x: 130, y: 155, w: 60, h: 15,
                room: 'enchantedLake', enterX: 160, enterY: 100, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 162,
                blocked(engine) {
                    if (!engine.hasFlag('dragonAsleep')) {
                        engine.showText("The dragon blocks the path beyond! You need to find a way to get past it without becoming a charcoal briquette.");
                        return true;
                    }
                    return false;
                }
            }
        ],

        onEnter(engine) {
            if (!engine.hasFlag('dragonWarned')) {
                engine.setFlag('dragonWarned');
                if (!engine.hasFlag('dragonAsleep')) {
                    engine.showText("You enter a vast cavern and immediately spot a DRAGON atop a mound of treasure! Its scales glimmer like fire. You also spot the Ruby of Courage in its hoard. How do you deal with a dragon? Very, very carefully...");
                }
            }
        }
    });

    // ============================================================
    // ROOM 11: ENCHANTED LAKE
    // ============================================================
    engine.registerRoom({
        id: 'enchantedLake',
        name: 'Enchanted Lake',
        walkBounds: { minX: 15, maxX: 305, minY: 95, maxY: 162 },
        draw(ctx, state, frame, seed) {
            // Twilight sky
            const skyGrad = ctx.createLinearGradient(0, 8, 0, 70);
            skyGrad.addColorStop(0, '#1a0a33');
            skyGrad.addColorStop(0.5, '#442266');
            skyGrad.addColorStop(1, '#774499');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 8, 320, 62);

            // Stars
            drawStars(ctx, seed + 110, 30);

            // Moon
            ctx.fillStyle = '#EEEEDD';
            ctx.beginPath();
            ctx.arc(260, 25, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a0a33';
            ctx.beginPath();
            ctx.arc(264, 22, 10, 0, Math.PI * 2);
            ctx.fill();

            // Willow trees
            const drawWillow = (x, y) => {
                ctx.fillStyle = '#443322';
                ctx.fillRect(x - 3, y - 20, 6, 20);
                ctx.fillStyle = '#225522';
                // Drooping branches
                ctx.strokeStyle = '#336633';
                ctx.lineWidth = 0.5;
                for (let b = 0; b < 8; b++) {
                    const angle = (b / 8) * Math.PI * 0.8 + Math.PI * 0.1;
                    const bx = x + Math.cos(angle) * 15;
                    const by = y - 18 + Math.sin(angle) * 5;
                    ctx.beginPath();
                    ctx.moveTo(x, y - 18);
                    ctx.quadraticCurveTo(bx, by - 10, bx + Math.sin(frame * 0.03 + b) * 2, y + 5);
                    ctx.stroke();
                }
                ctx.fillStyle = '#225522';
                ctx.beginPath();
                ctx.arc(x, y - 22, 10, 0, Math.PI * 2);
                ctx.fill();
            };

            drawWillow(40, 95);
            drawWillow(280, 95);

            // Lake bank
            ctx.fillStyle = '#336633';
            ctx.fillRect(0, 88, 320, 15);

            // Lake
            const lakeGrad = ctx.createLinearGradient(0, 100, 0, 170);
            lakeGrad.addColorStop(0, '#223366');
            lakeGrad.addColorStop(1, '#112244');
            ctx.fillStyle = lakeGrad;
            ctx.fillRect(0, 100, 320, 70);

            // Moon reflection
            ctx.fillStyle = 'rgba(200, 200, 180, 0.15)';
            ctx.fillRect(255, 105, 15, 60);

            // Water surface details
            drawWater(ctx, 0, 100, 320, 70, frame);

            // Lily pads
            ctx.fillStyle = '#228822';
            ctx.beginPath();
            ctx.ellipse(80, 125, 6, 3, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(200, 135, 5, 2.5, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Pink lily flower
            ctx.fillStyle = '#FF99CC';
            ctx.beginPath();
            ctx.arc(81, 124, 2, 0, Math.PI * 2);
            ctx.fill();

            // Waterfall in background
            ctx.fillStyle = '#99BBDD';
            ctx.fillRect(155, 30, 10, 58);
            ctx.fillStyle = '#BBDDFF';
            if (frame % 3 < 2) {
                ctx.fillRect(157, 30, 6, 58);
            }
            // Splash
            ctx.fillStyle = '#AACCEE';
            ctx.beginPath();
            ctx.arc(160, 88, 10, Math.PI, 0);
            ctx.fill();

            // Fairy (if not got emerald)
            if (!state.flags.hasEmerald) {
                drawNPC(ctx, 160, 100, 'fairy', frame);
            } else {
                // Magic portal (golden glow)
                const pGlow = Math.sin(frame * 0.06) * 0.2 + 0.7;
                ctx.globalAlpha = pGlow;
                ctx.fillStyle = '#FFDD66';
                ctx.beginPath();
                ctx.ellipse(160, 100, 15, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.ellipse(160, 100, 8, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                // Sparkles around portal
                for (let s = 0; s < 6; s++) {
                    const angle = frame * 0.04 + s * Math.PI / 3;
                    ctx.fillStyle = EGA.YELLOW;
                    ctx.fillRect(160 + Math.cos(angle) * 18, 100 + Math.sin(angle) * 12, 2, 2);
                }
            }

            // Magical particles
            for (let p = 0; p < 8; p++) {
                const px = (frame * 0.5 + p * 40) % 320;
                const py = 70 + Math.sin(frame * 0.02 + p) * 15;
                ctx.fillStyle = `rgba(255, 255, 180, ${0.3 + Math.sin(frame * 0.05 + p) * 0.2})`;
                ctx.fillRect(px, py, 1, 1);
            }

            // Grass on bank
            ctx.fillStyle = '#44AA44';
            const rng = mulberry32(seed + 115);
            for (let i = 0; i < 20; i++) {
                ctx.fillRect(rng() * 320, 88 + rng() * 10, 1, 2 + rng() * 3);
            }
        },

        getHotspots(state) {
            const spots = [];

            // Fairy
            if (!state.flags.hasEmerald) {
                spots.push({
                    id: 'fairy', name: 'Lake Fairy',
                    parserNouns: [50],
                    x: 145, y: 78, w: 30, h: 28,
                    walkTo: { x: 160, y: 102 },
                    actions: {
                        Look: "A shimmering fairy hovers above the lake's surface, translucent wings catching the moonlight. She's about a foot tall and radiates a gentle warmth. She looks at you with ancient, knowing eyes and a slightly mischievous smile.",
                        Get: "The fairy would literally slip through your fingers. She's part light, part magic, and entirely ungrabbable.",
                        Talk: function (engine) {
                            if (engine.hasFlag('riddleAsked')) {
                                return "The fairy smiles patiently. \"The riddle remains, brave one. I have cities but no houses, forests but no trees, rivers but no water. What am I?\" Think carefully!";
                            }
                            engine.setFlag('riddleAsked');
                            audio.sfxFairy();
                            return "The fairy speaks in a voice like wind chimes. \"Welcome, young Cedric. I am Luminara, guardian of the Emerald of Compassion. I shall give you the gem... if you can answer my riddle.\" She pauses dramatically. \"I have cities but no houses, forests but no trees, rivers but no water. What am I?\"";
                        },
                        Use: "You can't 'use' a fairy. Well, you could try, but it would be rude and probably result in an unfortunate magical transformation."
                    },
                    useCombos: {
                        'key_fairy': function () { return "The fairy giggles. \"What would I do with a key? I'm made of light, dear.\""; },
                        'cheese_fairy': function () { return "\"Cheese? Do I look like a mouse?\" The fairy seems mildly offended."; },
                        'mushroom_fairy': function () { return "\"No thank you. I prefer moonbeams and dewdrops.\""; },
                        'potion_fairy': function () { return "\"I don't need sleep, child. I AM a dream.\" She winks."; },
                    }
                });
            }

            // Answer riddle prompt (only visible after fairy asks)
            if (state.flags.riddleAsked && !state.flags.hasEmerald) {
                spots.push({
                    id: 'riddleAnswer', name: 'Answer the Riddle',
                    parserNouns: [60],
                    x: 80, y: 150, w: 160, h: 20,
                    walkTo: { x: 160, y: 155 },
                    actions: {
                        Look: "The fairy awaits your answer. \"I have cities but no houses, forests but no trees, rivers but no water. What am I?\" You'll need to TYPE your answer — press Enter to open the text parser.",
                        Talk: "The fairy tilts her head expectantly. \"Do you know the answer? Type it using the text parser — press Enter and speak your answer, brave one.\"",
                        Get: "You can't grab an answer out of thin air. Press Enter and TYPE your answer to the fairy's riddle.",
                        Use: "You need to speak your answer aloud. Press Enter to open the text parser and type what you think the answer is."
                    }
                });
            }

            // Lake
            spots.push({
                id: 'lake', name: 'Enchanted Lake',
                parserNouns: [33],
                x: 0, y: 105, w: 320, h: 65,
                walkTo: { x: 160, y: 102 },
                actions: {
                    Look: "The lake stretches before you, its surface mirror-smooth despite the waterfall. The moonlight paints silver ribbons across the water. Lily pads float serenely. It's the most beautiful place you've ever seen, and you've seen the castle kitchen on turkey day.",
                    Get: "You can't take a lake. Where would you put it?",
                    Use: function (engine) {
                        engine.showDeath("You wade into the enchanted lake. The water is surprisingly warm. And then surprisingly deep. And then surprisingly over your head. As you sink, the fairy shakes her head sadly. \"They never learn.\"");
                        return null;
                    },
                    Talk: "You whisper to the lake. Your words create tiny ripples that spread out in perfect circles. It's weirdly poetic. You should write this down."
                }
            });

            // Waterfall
            spots.push({
                id: 'waterfall', name: 'Waterfall',
                parserNouns: [33],
                x: 150, y: 28, w: 20, h: 65,
                walkTo: { x: 140, y: 100 },
                actions: {
                    Look: "A crystal-clear waterfall cascades down the cliff face into the lake. The sound is musical and soothing — like nature's own white noise machine.",
                    Get: "You try to bottle some waterfall. It keeps... falling. That's sort of its whole thing.",
                    Talk: "\"La la la!\" you sing along with the waterfall. You are not in key. The waterfall doesn't care."
                }
            });

            // Willow tree
            spots.push({
                id: 'willow', name: 'Weeping Willow',
                parserNouns: [31],
                x: 25, y: 70, w: 30, h: 30,
                walkTo: { x: 45, y: 102 },
                actions: {
                    Look: "A graceful weeping willow sways gently by the lake's edge. Its long fronds trail in the water like green fingers. It's very atmospheric. If you were directing a movie, you'd definitely have this scene.",
                    Get: "Breaking willow branches brings very bad luck. Or at least splinters.",
                    Talk: "\"Why are you weeping?\" you ask. The willow doesn't answer. It's a tree. But romantic of you to ask."
                }
            });

            // Magic portal (appears after getting emerald)
            if (state.flags.hasEmerald) {
                spots.push({
                    id: 'portal', name: 'Magic Portal',
                    parserNouns: [58],
                    x: 140, y: 95, w: 40, h: 20,
                    walkTo: { x: 160, y: 105 },
                    actions: {
                        Look: "A shimmering portal of golden light hovers where the fairy once stood. It pulses invitingly, ready to whisk you back to Castle Daventry.",
                        Talk: "The portal hums musically. It seems eager to take you home.",
                        Get: "You can't take a portal. But you can step through one!",
                        Use: function (engine) {
                            audio.sfxMagic();
                            engine.showText("You step into the portal. Golden light engulfs you, and for a brief, exhilarating moment, you fly above all of Daventry. Then — gently — you land back in the Throne Room, gems in hand!");
                            setTimeout(() => {
                                engine.changeRoom('throneRoom', 160, 140, 'right');
                            }, 2500);
                            return null;
                        }
                    }
                });
            }

            return spots;
        },

        exits: [
            {   // North: back to dragon's lair
                x: 130, y: 8, w: 60, h: 20,
                room: 'dragonLair', enterX: 160, enterY: 155, enterDir: 'right',
                playerWalkX: 160, playerWalkY: 97
            }
        ],

        onEnter(engine) {
            if (!engine.hasFlag('lakeEntered')) {
                engine.setFlag('lakeEntered');
                audio.sfxFairy();
                engine.showText("You emerge from the mountain into a scene of breathtaking beauty. A moonlit lake stretches before you, flanked by weeping willows and fed by a crystal waterfall. Fireflies dance in the air, and a soft glow emanates from the lake's center where a fairy hovers, waiting...");
            }
        }
    });

} // end registerAllRooms
