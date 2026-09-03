// ============================================================
// CROWN QUEST - BOOTSTRAP
// Items, dialog trees, the opening cutscene, and wiring only.
// Room art, hotspots and puzzle logic live in js/rooms/*.js.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const CONTENT = CrownQuestContent;
    const RULES = CONTENT.rules;

    const engine = new GameEngine(Object.assign({}, CONTENT.game, {
        drawTitleBackdrop,
        // Fantasy nouns the parser should recognise on top of its neutral base.
        parserSynonyms: {
            sword: ['blade', 'shield'],
            gold: ['chest', 'treasure', 'hoard', 'coins'],
            treasure: ['chest', 'shield', 'mirror', 'hoard'],
            glass: ['mirror'],
            bucket: ['pail'],
            water: ['pail', 'pool', 'well'],
            loaf: ['bread', 'crust'],
            crust: ['bread'],
            grimoire: ['spellbook', 'book'],
            tome: ['spellbook', 'book'],
            wizard: ['morvane', 'sorcerer'],
            sorcerer: ['morvane', 'wizard'],
            bird: ['raven', 'corvus', 'gull'],
            crow: ['raven', 'corvus'],
            dwarf: ['gnome', 'mendharbe'],
            monster: ['troll', 'dragon', 'giant'],
            beast: ['dragon', 'goat', 'hare'],
            rabbit: ['hare'],
            elf: ['fennow'],
            peddler: ['hattie', 'cart'],
            ring: ['mist', 'band'],
            key: ['brass'],
            feather: ['raven', 'quill'],
            salt: ['crock'],
            plant: ['beanstalk', 'stalk'],
            vine: ['beanstalk', 'stalk']
        },
        // Classic parser mode trims the long enhanced-mode narration.
        classicRewrites: {
            'There is a troll standing on it.': 'A troll is on the bridge.',
            'You are not taking a dragon anywhere.': 'Don\'t be ridiculous.',
            'You have nothing left to set.': 'You have nothing to set.',
            'The circle is not ready. It wants a feather of a black bird and a pinch of salt from the sea.':
                'The circle wants a black feather and sea salt.',
            'You lean in and look down. Twenty feet of nothing, then water. Without a rope this is simply a hole you would fall into once.':
                'It is a long way down. You need a rope.'
        }
    }));
    window.engine = engine;

    // ========== ITEMS ==========
    CONTENT.items.forEach((item) => engine.registerItem({ ...item }));

    // ========== ART REGISTRIES ==========
    // The engine stays game-agnostic; the pictures live in the content layer.
    engine.itemArt = ITEM_ART;
    engine.portraitArt = PORTRAIT_ART;

    // ========== DIALOG TREES ==========

    // Corvus — the raven who has watched everything and mentioned none of it.
    engine.registerDialog({
        id: 'corvus',
        startTopic: 'greeting',
        topics: [{
            id: 'greeting',
            text: 'The raven looks at you for a long moment. "Boy," he says. You sit down rather suddenly.',
            options: [
                {
                    text: 'You can talk?',
                    response: '"I have always been able to talk. You never asked. Eleven years, and not once." He resettles his wings. "You are a poor conversationalist and a very good floor-scrubber."',
                    once: true
                },
                {
                    text: 'Where is Morvane?',
                    response: '"Out. Down the crag, on business he does not discuss with birds." A pause. "He will be back before the tide turns, and he counts the stairs on his way up. He has always counted them."',
                    once: true
                },
                {
                    text: 'Who am I?',
                    response: '"You came off a ship. It broke on the rocks below this house, eleven winters back, and he went down and came up with one thing." He tilts his head. "He did not go down to save anybody. He went down to see what had washed up."',
                    once: true
                },
                {
                    text: 'What is he hiding in this room?',
                    response: '"Two things. One under the hourglass, which he sits over so nobody will look. One behind the hanging, which he tells you never to clean." He clicks his beak. "You have dusted around that tapestry four hundred times."',
                    once: true
                },
                {
                    text: 'May I have that feather?',
                    response: '"Take it. I have a great many and you have nothing at all." He looks away, pointedly. "Some spells want a feather of a black bird. I am told this is a coincidence."',
                    condition: (e) => !e.hasItem('raven_feather'),
                    once: true
                },
                {
                    text: 'What is Alderhaven?',
                    response: '"A kingdom across the water with a sick king, no heir, and three treasures it has mislaid." He preens. "One in a well, one above the cloud, one under a dragon. I mention it in passing."',
                    once: true
                },
                {
                    text: 'Why help me now?',
                    response: '"Because today he left the house, and you went up the stair, and in eleven years you have never done either." He turns his back. "Go on. I am asleep."',
                    endDialog: true
                }
            ]
        }]
    });

    // Hattie the peddler — gives the rope, and most of the act's signposting.
    engine.registerDialog({
        id: 'hattie',
        startTopic: 'greeting',
        topics: [{
            id: 'greeting',
            text: '"Well," says the peddler, looking you up and down. "You are not from here, you have no shoes worth the name, and you are carrying a book you cannot read. Hattie."',
            options: [
                {
                    text: 'I came off the crag.',
                    response: '"The crag." She stops sorting twine. "There is a man on that rock. Nobody goes near it, and nothing comes off it." She looks at you again, differently. "Well. Something has."',
                    once: true
                },
                {
                    text: 'What is wrong with this kingdom?',
                    response: '"King Aldric is dying, there is no heir, and the three treasures of Alderhaven went missing the same winter the queen\'s ship went down." She spits, neatly. "Realm holds together on treasures, boy. Pull them out and it comes apart like wet bread."',
                    once: true
                },
                {
                    text: 'Where are the treasures now?',
                    response: '"Everyone knows and nobody goes. The chest is down our own well, with a gnome sat on it. The shield is above the cloud where the beanstalk goes. The mirror is under a dragon in the wood." She shrugs. "Knowing has never been the hard part."',
                    once: true
                },
                {
                    text: 'Could I have a rope?',
                    response: '"Could you." She looks at the well, then at you, and something in her face gives up. "Take it. Twenty foot of good hemp. And when you drown down there I shall want it back."',
                    condition: (e) => !e.hasItem('rope') && !e.getFlag('rope_tied'),
                    action: (e) => {
                        e.addToInventory('rope');
                        e.updateInventoryUI();
                        e.sound.pickup();
                    },
                    once: true
                },
                {
                    text: 'Tell me about the gnome.',
                    response: '"Mendharbe? No, that is not it. Nobody has his name. He offers it as a bargain and nobody has ever won it." She grins. "He wrote it down once, in the wood, backwards, out of sheer vanity. Been up there weathering for thirty years."',
                    once: true
                },
                {
                    text: 'And the goat?',
                    response: '"That goat is a menace with a legal opinion. It has put two men in the river and eaten a shutter." She softens. "Mind, if you were going anywhere with a troll on it, you could do worse than take it along. It has views on bridges."',
                    once: true
                },
                {
                    text: 'What is the tower on the headland?',
                    response: 'Her hands stop. "We do not talk about the tower." She turns back to the cart. "There is a woman in it. There has been a woman in it for eleven years, and nobody in Alderhaven can get up that path far enough to see her twice."',
                    once: true
                },
                {
                    text: 'Thank you, Hattie.',
                    response: '"Go on then. And eat something."',
                    endDialog: true
                }
            ]
        }]
    });

    // Fennow the elf — the ring, in return for the hare.
    engine.registerDialog({
        id: 'fennow',
        startTopic: 'greeting',
        topics: [{
            id: 'greeting',
            text: '"That snare cost somebody a day," says the elf, "and you undid it in a minute, and you did not eat what was in it. That is three unusual things before breakfast."',
            options: [
                {
                    text: 'It was caught. That is all.',
                    response: '"Yes," he says. "That is all. That is the whole of it and most people manage to make it complicated." He looks at you sideways. "Fennow."'
                },
                {
                    text: 'Take this ring, then. (accept his gift)',
                    response: '"It is not a great magic. It will not stop a blade or open a door." He drops the grey band into your palm. "It will make you no more visible than weather. Weather can walk past a great many things that a boy cannot."',
                    condition: (e) => !e.getFlag('has_ring'),
                    action: (e) => RULES.giveRingOfMist(e),
                    once: true
                },
                {
                    text: 'What is above the cloud?',
                    response: '"A hall with no roof and a giant asleep in it, and a white shield on the wall that does not belong to him." He picks a leaf out of the air. "He is not cruel. He is simply very large and asleep, and those two together will kill you just as dead."',
                    condition: (e) => e.getFlag('has_ring'),
                    once: true
                },
                {
                    text: 'And the dragon?',
                    response: '"Four hundred years on the same fire. It has never once let it go out." He smiles, faintly. "I have often thought that if somebody ever did put it out, the dragon would be far too upset to eat anybody."',
                    once: true
                },
                {
                    text: 'Thank you.',
                    response: '"Mind the ring. It only works while you are wearing it, and people forget."',
                    endDialog: true
                }
            ]
        }]
    });

    // Mendharbe — the name bargain.
    engine.registerDialog({
        id: 'gnome',
        startTopic: 'greeting',
        topics: [
            {
                id: 'greeting',
                text: '"Company!" says the gnome, delighted, not standing up. "Down my well, in my dark, on my chest. Do you know, in thirty years, exactly nobody has managed the last part."',
                options: [
                    {
                        text: 'That chest belongs to Alderhaven.',
                        response: '"It does," he agrees cheerfully. "And I am sitting on it. Both of those are true and only one of them is comfortable."',
                        once: true
                    },
                    {
                        text: 'What will it take?',
                        response: '"My name. Say my name and the chest is yours and I shall go somewhere with a view." He taps his pipe. "Three guesses. It has always been three guesses, and it has always been three wrong ones."',
                        once: true
                    },
                    {
                        text: 'Is it Rumpelstiltskin?',
                        response: 'He laughs so hard he nearly falls off the treasure of a kingdom. "No. No, but I do like that you tried. Everyone tries that one."',
                        once: true
                    },
                    {
                        text: 'Your name is Mendharbe.',
                        response: 'The gnome goes very quiet. Then he stands up off the chest, brushes it down, and bows so low his beard touches the water. "Thirty years," he says. "And it was the vanity that did it. It always is."',
                        condition: (e) => e.hasItem('parchment') && !e.getFlag('gnome_named'),
                        action: (e) => RULES.nameTheGnome(e),
                        endDialog: true
                    },
                    {
                        text: 'Why sit down here at all?',
                        response: '"Because up there they would take it off me in an afternoon, and down here I have a fire, a pipe, and a joke that has run for three decades." He shrugs. "You do not get all three very often."',
                        once: true
                    },
                    {
                        text: 'I will come back.',
                        response: '"You will. Everyone does. Nobody brings the name."',
                        condition: (e) => !e.getFlag('gnome_named'),
                        endDialog: true
                    },
                    {
                        text: 'Goodbye, Mendharbe.',
                        response: '"Goodbye, king," he says, which is a strange thing to say, and he does not explain it.',
                        condition: (e) => e.getFlag('gnome_named'),
                        endDialog: true
                    }
                ]
            }
        ]
    });

    // Grumbold — the toll that cannot be paid.
    engine.registerDialog({
        id: 'troll',
        startTopic: 'greeting',
        topics: [{
            id: 'greeting',
            text: '"TOLL," says the troll, without moving. It is less a word than a landslide with grammar.',
            options: [
                {
                    text: 'What is the toll?',
                    response: '"Everything you got." He considers. "Then also you don\'t cross. That\'s the whole toll. It\'s a good toll. Been doing it four hundred year."',
                    once: true
                },
                {
                    text: 'That is not a toll, that is robbery.',
                    response: '"Yeah." He looks pleased. "Bridge is mine. Gorge is mine. You is optional."',
                    once: true
                },
                {
                    text: 'What is on the other side?',
                    response: '"Beanstalk. Goes up." He scratches. "Nobody comes back down it, so I reckon it\'s nice up there."',
                    once: true
                },
                {
                    text: 'Has anyone ever got past you?',
                    response: 'He thinks about this for an uncomfortably long time. "One goat," he says at last, with feeling. "Once. Long time ago. Don\'t like goats."',
                    once: true
                },
                {
                    text: 'I will be going, then.',
                    response: '"Yeah," says Grumbold, settling. "You will."',
                    endDialog: true
                }
            ]
        }]
    });

    // ========== THE GOAT ROUTS THE TROLL ==========
    // Lives here rather than in the room because it is a progression rule the
    // room only triggers; keeping it beside the dialog keeps the beat readable.
    const originalGoTo = engine.goToRoom.bind(engine);
    engine.goToRoom = function (roomId, px, py) {
        originalGoTo(roomId, px, py);
        if (roomId !== 'troll_bridge' || !this.getFlag('goat_follows') || this.getFlag('troll_routed')) return;
        this.setFlag('troll_routed');
        this.addScore(15);
        this.runSequence([
            'Grumbold sees the goat. The goat sees Grumbold.',
            600,
            (e) => { e.sound.footstep(); },
            'What happens next takes about a second and a half and will be described in this village for a hundred years.',
            (e) => { e.sound.explosion(); e.shake(9); },
            500,
            'The goat hits him amidships at a flat run with its head down and four hundred years of accumulated bridge-related grievance behind it.',
            700,
            'Grumbold goes off the bridge in a long, dignified arc, complaining the entire way, and lands in the river with a sound like a dropped wardrobe.',
            (e) => { e.sound.splash(); },
            600,
            (e) => {
                e.setWalkableArea((x, y) => y > 292 && y < 372 && x > 20 && x < 620);
                e.setEdgeTransition('right', (eng) => eng.goToRoom('cloud_realm', 90, 344));
            },
            'The goat returns to your side and resumes chewing. It does not appear to consider this remarkable.'
        ], { skippable: true });
    };

    // ========== TREASURE COUNT ==========
    // One place decides when the shore path west opens, so the gate can never
    // disagree with the inventory.
    const originalAdd = engine.addToInventory.bind(engine);
    engine.addToInventory = function (itemId) {
        originalAdd(itemId);
        const all = ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'].every((id) => this.hasItem(id));
        if (all && !this.getFlag('has_all_three')) {
            this.setFlag('has_all_three');
            this.sound.scoreUp();
            this.showMessage('All three treasures of Alderhaven are in your hands, and the weight of them is not the weight of the metal. Out on the western headland, something the colour of old honey has begun to shine.', { window: true });
        }
    };

    // ========== ROOMS ==========
    CrownQuest.installRooms(engine);

    // ========== OPENING ==========
    engine.game.onStart = () => {
        engine.playCutscene({
            duration: 21000,
            draw: (ctx, w, h, progress, elapsed) => cutsceneOpening(ctx, w, h, progress, elapsed),
            onEnd: () => {
                engine.goToRoom('scullery', CONTENT.game.startX, CONTENT.game.startY);
                engine.showMessage('The house is empty. You have a floor to scrub, a stair you have never been allowed to climb, and the whole of the rest of your life starting some time this morning.', { window: true });
            }
        });
    };

    engine.start();
});
