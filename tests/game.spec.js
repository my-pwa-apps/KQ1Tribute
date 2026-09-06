const { test, expect } = require('@playwright/test');

// Behavioural tests for the engine as this game configures it: input, parser,
// inventory, save/load, deaths and the dead ends that make an adventure unfair.

async function boot(page, { classic = false } = {}) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press(classic ? 'c' : 'e');
    await page.evaluate(() => {
        const e = window.engine;
        if (e.cutscene) e.skipCutscene();
        e.setTextSpeed('instant', false);
    });
    await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
}

const flag = (page, name) => page.evaluate((n) => window.engine.getFlag(n), name);

test.describe('boot and title screen', () => {
    test('the title screen offers both interface modes', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        expect(await page.evaluate(() => window.engine.titleScreen)).toBe(true);
        await page.keyboard.press('e');
        expect(await page.evaluate(() => window.engine.titleScreen)).toBe(false);
        expect(await page.evaluate(() => window.engine.classicMode)).toBe(false);
    });

    test('classic mode hides the point-and-click chrome', async ({ page }) => {
        await boot(page, { classic: true });
        await expect(page.locator('#action-bar')).toBeHidden();
        expect(await page.evaluate(() => window.engine.classicMode)).toBe(true);
    });

    test('the game exposes its identity through the definition, not hard-coding', async ({ page }) => {
        await boot(page);
        const game = await page.evaluate(() => ({
            id: window.engine.game.id,
            title: window.engine.game.title,
            storagePrefix: window.engine.game.storagePrefix
        }));
        expect(game).toEqual({ id: 'crown_quest', title: 'CROWN QUEST', storagePrefix: 'crownquest' });
    });
});

test.describe('simulation timing', () => {
    for (const control of ['keyboard', 'click', 'sequence']) {
        test(`${control} walking covers the same distance at every frame rate`, async ({ page }) => {
            await boot(page);
            const distances = await page.evaluate((mode) => {
                const game = window.engine;
                game._loopRunning = false;
                return [30, 60, 120, 144].map((fps) => {
                    game.goToRoom('harbour_road', 200, 350);
                    game.textWindow = null;
                    game.sequence = null;
                    game.keysDown = {};
                    if (mode === 'keyboard') game.keysDown.ArrowRight = true;
                    else if (mode === 'sequence') game.runSequence([{ walk: [600, 350] }]);
                    else {
                        game.playerTargetX = 600;
                        game.playerTargetY = 350;
                        game.playerWalking = true;
                    }
                    for (let frame = 0; frame < fps; frame++) game.update(1000 / fps);
                    return game.playerX - 200;
                });
            }, control);
            for (const distance of distances) expect(distance).toBeCloseTo(180, 5);
        });
    }

    test('room updates run once and pause for blocking presentation', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            game.textWindow = null;
            const room = game.rooms[game.currentRoomId];
            const originalUpdate = room.onUpdate;
            let elapsed = 0;
            room.onUpdate = (_engine, dt) => { elapsed += dt; };
            try {
                game.update(100);
                const once = elapsed;
                game.showTextWindow('Read this at your own pace.');
                game.update(100);
                const reading = elapsed;
                game.textWindow = null;
                game.runSequence([1000]);
                game.update(100);
                const sequencing = elapsed;
                game.sequence = null;
                game.activeDialog = { phase: 'options' };
                game.update(100);
                return { once, reading, sequencing, dialog: elapsed };
            } finally {
                room.onUpdate = originalUpdate;
                game.activeDialog = null;
            }
        });
        expect(result).toEqual({ once: 100, reading: 100, sequencing: 100, dialog: 100 });
    });

    test('crag warning leaves the full escape time after reading', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            game.goToRoom('crag_path', 90, 322);
            for (let tick = 0; tick < 100; tick++) game.update(100);
            const reading = { timer: game.getCounter('crag_timer'), dead: game.dead };
            game.textWindow = null;
            game.update(100);
            return { reading, timer: game.getCounter('crag_timer'), dead: game.dead };
        });
        expect(result).toEqual({ reading: { timer: 0, dead: false }, timer: 100, dead: false });
    });
});

test.describe('inventory and hotspots', () => {
    test('a consumed feather stays collected and cannot score twice', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            game.goToRoom('study', 300, 336);
            const feather = game.rooms.study.hotspots.find((hotspot) => hotspot.name === 'the feather');
            feather.get(game.actionScope);
            game.setFlag('read_spell');
            game.goToRoom('spell_room', 320, 336);
            game.rooms.spell_room.hotspots.find((hotspot) => hotspot.name === 'the chalk circle')
                .useItem(game.actionScope, 'raven_feather');
            game.goToRoom('study', 300, 336);
            feather.get(game.actionScope);
            const current = { hidden: feather.hidden, score: game.score, carried: game.hasItem('raven_feather') };
            game.setFlag('feather_taken', false);
            feather.get(game.actionScope);
            return { current, legacy: { hidden: feather.hidden, score: game.score, carried: game.hasItem('raven_feather') } };
        });
        expect(result.current).toEqual({ hidden: true, score: 3, carried: false });
        expect(result.legacy).toEqual(result.current);
    });

    test('picking up an item scores once and only once', async ({ page }) => {
        await boot(page);
        const run = async () => page.evaluate(() => {
            const e = window.engine;
            const hs = e.rooms.scullery.hotspots.find((h) => h.name === 'the black bread');
            if (!hs.hidden) hs.get(e.actionScope);
            e.textWindow = null;
            return { score: e.score, count: e.inventory.filter((i) => i === 'bread').length };
        });
        const first = await run();
        const second = await run();
        expect(first.score).toBe(2);
        expect(second.score).toBe(2);
        expect(second.count).toBe(1);
    });

    test('hidden hotspots disappear once their item is taken', async ({ page }) => {
        await boot(page);
        expect(await page.evaluate(() => window.engine.rooms.scullery.hotspots
            .find((h) => h.name === 'the pail').hidden)).toBe(false);
        await page.evaluate(() => {
            const e = window.engine;
            e.rooms.scullery.hotspots.find((h) => h.name === 'the pail').get(e.actionScope);
            e.textWindow = null;
        });
        expect(await page.evaluate(() => window.engine.rooms.scullery.hotspots
            .find((h) => h.name === 'the pail').hidden)).toBe(true);
    });

    test('looking at an NPC never removes them from the room', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('study', 300, 330);
            const hs = e.rooms.study.hotspots.find((h) => h.name === 'Corvus');
            e.currentAction = 'look';
            e.performAction(hs);
            e.textWindow = null;
        });
        expect(await page.evaluate(() => window.engine.rooms.study.hotspots
            .find((h) => h.name === 'Corvus').hidden)).toBeFalsy();
    });
});

test('actors and scenery share the same two-pixel world raster', async ({ page }) => {
    await boot(page);
    const mismatches = await page.evaluate(() => {
        const game = window.engine;
        game._loopRunning = false;
        return ['dragon_cave', 'village_green', 'study'].map((roomId) => {
            game.goToRoom(roomId, 500, 350);
            game.animTimer = 4000;
            game.ctx.clearRect(0, 0, game.WIDTH, game.HEIGHT);
            game.drawScene(game.ctx, game.rooms[roomId]);
            const pixels = game.ctx.getImageData(0, 0, game.WIDTH, game.HEIGHT).data;
            let differences = 0;
            for (let row = 0; row < game.HEIGHT; row += 2) {
                for (let column = 0; column < game.WIDTH; column += 2) {
                    const base = (row * game.WIDTH + column) * 4;
                    for (const offset of [4, game.WIDTH * 4, (game.WIDTH + 1) * 4]) {
                        for (let channel = 0; channel < 4; channel++) {
                            if (pixels[base + channel] !== pixels[base + offset + channel]) differences++;
                        }
                    }
                }
            }
            return { roomId, differences };
        });
    });
    expect(mismatches).toEqual([
        { roomId: 'dragon_cave', differences: 0 },
        { roomId: 'village_green', differences: 0 },
        { roomId: 'study', differences: 0 }
    ]);
});

test.describe('parser', () => {
    const parse = (page, command) => page.evaluate((c) => {
        const e = window.engine;
        e.textWindow = null;
        e.executeParserCommand(c);
        return e.message;
    }, command);

    test('verb-noun commands reach the right hotspot', async ({ page }) => {
        await boot(page);
        const msg = await parse(page, 'look at the hearth');
        expect(msg.toLowerCase()).toContain('fire');
    });

    test('synonyms map fantasy nouns onto hotspot names', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => window.engine.goToRoom('village_green', 300, 336));
        const msg = await parse(page, 'get bucket');
        expect(msg).toBeTruthy();
    });

    test('unknown nouns get a Sierra-style refusal, not a crash', async ({ page }) => {
        await boot(page);
        const msg = await parse(page, 'look at the aardvark');
        expect(msg).toContain('aardvark');
    });

    test('the scent verb reads the room, not a hard-coded table', async ({ page }) => {
        await boot(page);
        const msg = await parse(page, 'smell');
        expect(msg).toContain('lye');
    });
});

test.describe('deaths are fair and recoverable', () => {
    test('crossing the bridge without the goat is fatal', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('troll_bridge', 120, 336);
            e.rooms.troll_bridge.hotspots.find((h) => h.name === 'the bridge').walk(e.actionScope);
        });
        expect(await page.evaluate(() => window.engine.dead)).toBe(true);
        await page.keyboard.press('r');
        await page.waitForFunction(() => !window.engine.dead);
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('scullery');
    });

    test('taking the shield unprotected is fatal, and the ring prevents it', async ({ page }) => {
        await boot(page);
        const takeShield = (wearRing) => page.evaluate((wear) => {
            const e = window.engine;
            e.dead = false;
            e.goToRoom('cloud_realm', 90, 344);
            const hs = e.rooms.cloud_realm.hotspots;
            if (wear) hs.find((h) => h.name === 'the giant').useItem(e.actionScope, 'ring_of_mist');
            hs.find((h) => h.name === 'the Shield of Ardor').get(e.actionScope);
            return { dead: e.dead, has: e.hasItem('shield_of_ardor') };
        }, wearRing);
        expect(await takeShield(false)).toEqual({ dead: true, has: false });
        await page.evaluate(() => { window.engine.addToInventory('ring_of_mist'); });
        expect(await takeShield(true)).toEqual({ dead: false, has: true });
    });

    test('the dragon kills you until its fire is out', async ({ page }) => {
        await boot(page);
        const grab = () => page.evaluate(() => {
            const e = window.engine;
            e.dead = false;
            e.goToRoom('dragon_cave', 560, 340);
            e.rooms.dragon_cave.hotspots.find((h) => h.name === 'the Mirror of Ianthe').get(e.actionScope);
            return e.dead;
        });
        expect(await grab()).toBe(true);
        await page.evaluate(() => window.engine.setFlag('dragon_doused'));
        expect(await grab()).toBe(false);
    });

    test('the crag path warns before it kills', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('crag_path', 90, 322);
        });
        expect(await flag(page, 'morvane_warned')).toBe(true);
        expect(await page.evaluate(() => window.engine.dead)).toBe(false);
    });
});

test.describe('no unwinnable states', () => {
    test('both crag return exits lead back to the study without the storm', async ({ page }) => {
        await boot(page);
        const rooms = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            return ['the house', 'the path back to the house'].map((name) => {
                game.goToRoom('crag_path', 90, 322);
                const hotspot = game.rooms.crag_path.hotspots.find((entry) => entry.name === name);
                if (!hotspot.isExit) throw new Error(`${name} is not an exit`);
                hotspot.onExit(game.actionScope);
                return game.currentRoomId;
            });
        });
        expect(rooms).toEqual(['study', 'study']);
    });

    test('Hattie clues the name puzzle without revealing its answer', async ({ page }) => {
        await boot(page);
        const response = await page.evaluate(() => window.engine.dialogs.hattie.topics[0].options
            .find((option) => option.text === 'Tell me about the gnome.').response);
        expect(response).not.toContain('Mendharbe');
        expect(response).toContain('backwards');
        expect(response).toContain('wood');
    });

    test('the shore path west stays shut until all three treasures are held', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('harbour_road', 120, 336);
            e.rooms.harbour_road.hotspots.find((h) => h.name === 'the shore path west').onExit(e.actionScope);
        });
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('harbour_road');
    });

    test('the pail can always be refilled at the well', async ({ page }) => {
        await boot(page);
        const refill = () => page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('well_bottom', 320, 330);
            e.rooms.well_bottom.hotspots.find((h) => h.name === 'the pool').use(e.actionScope);
            return e.getFlag('pail_full');
        });
        await page.evaluate(() => { window.engine.addToInventory('pail'); });
        expect(await refill()).toBe(true);
        await page.evaluate(() => window.CrownQuestContent.rules.setPailWater(window.engine, false));
        expect(await refill()).toBe(true);
    });

    test('the gnome cannot be named without finding the parchment', async ({ page }) => {
        await boot(page);
        const available = await page.evaluate(() => {
            const e = window.engine;
            e.startDialog('gnome');
            while (e.activeDialog && e.activeDialog.phase !== 'options') e._advanceDialog();
            return e.activeDialog.visibleOptions.map((o) => o.text);
        });
        expect(available.some((t) => t.includes('Mendharbe'))).toBe(false);
    });
});

test.describe('walking out of a room', () => {
    for (const returning of [false, true]) {
        test(`clicking the scullery stairs approaches below the barrier (returning: ${returning})`, async ({ page }) => {
            await boot(page);
            await page.evaluate((arriving) => {
                const game = window.engine;
                game._loopRunning = false;
                if (arriving) game.goToRoom('study', 96, 330);
                game.goToRoom('scullery', arriving ? 424 : 320, arriving ? 280 : 300);
                game.textWindow = null;
                game.currentAction = 'walk';
            }, returning);
            const canvas = page.locator('#game-canvas');
            const bounds = await canvas.boundingBox();
            await canvas.click({ position: { x: 444 / 640 * bounds.width, y: 210 / 400 * bounds.height } });
            const result = await page.evaluate(() => {
                const game = window.engine;
                for (let frame = 0; frame < 300 && game.currentRoomId === 'scullery'; frame++) {
                    game.update(1000 / 60);
                }
                return { room: game.currentRoomId, pending: !!game.pendingAction };
            });
            expect(result).toEqual({ room: 'study', pending: false });
        });
    }

    /** Drive the ego to a point with click-to-walk and let update() run. */
    async function walkTo(page, x, y) {
        await page.evaluate(({ x: tx, y: ty }) => {
            const e = window.engine;
            e.textWindow = null;
            e.currentAction = 'walk';
            e.pendingAction = null;
            e.playerTargetX = tx;
            e.playerTargetY = ty;
            e.playerWalking = true;
        }, { x, y });
    }

    test('click-to-walk fires an exit hotspot, not just arrow keys', async ({ page }) => {
        await boot(page);
        await walkTo(page, 430, 332);
        await page.waitForFunction(() => window.engine.currentRoomId === 'study', null, { timeout: 8000 });
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('study');
    });

    test('click-to-walk fires a screen edge transition', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => window.engine.goToRoom('study', 200, 336));
        await walkTo(page, 32, 340);
        await page.waitForFunction(() => window.engine.currentRoomId === 'scullery', null, { timeout: 8000 });
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('scullery');
    });

    test('arriving in a room does not immediately re-trigger its exits', async ({ page }) => {
        await boot(page);
        await walkTo(page, 430, 332);
        await page.waitForFunction(() => window.engine.currentRoomId === 'study', null, { timeout: 8000 });
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('study');
    });
});

test.describe('overlapping hotspots resolve to the nearer object', () => {
    test('the raven is clickable in front of the tapestry', async ({ page }) => {
        await boot(page);
        const hit = await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('study', 200, 336);
            const hs = e.findHotspot(100, 200, e.rooms.study);
            return hs && hs.name;
        });
        expect(hit).toBe('Corvus');
    });
});

test.describe('findable items are clickable where they are drawn', () => {
    // A hotspot rect that has drifted from its art is invisible at runtime: the
    // object is on screen and clicking it does nothing. Each point below is a
    // pixel on the drawn object, taken from the room art.
    const TARGETS = [
        ['scullery', 'the crock of salt', 51, 83],
        ['scullery', 'the black bread', 112, 128],
        ['scullery', 'the pail', 250, 285],
        ['study', 'the hourglass', 372, 240],
        ['study', 'the feather', 128, 212],
        ['spell_room', 'the iron chest', 120, 300],
        ['spell_room', 'the chalk circle', 320, 344],
        ['dark_wood', 'the parchment', 214, 300],
        ['dark_wood', 'the hare', 400, 340],
        ['village_green', 'the well', 320, 300],
        ['well_bottom', 'the pool', 200, 346],
        ['cloud_realm', 'the Shield of Ardor', 340, 168],
        ['dragon_cave', 'the fire pit', 216, 344],
        ['dragon_cave', 'the Mirror of Ianthe', 480, 314],
        ['amber_tower', 'the sockets', 320, 272]
    ];

    for (const [room, name, x, y] of TARGETS) {
        test(`${room}: ${name}`, async ({ page }) => {
            await boot(page);
            const hit = await page.evaluate(({ room: r, x: px, y: py }) => {
                const e = window.engine;
                e.inventory = [];
                e.flags = {};
                e.goToRoom(r, 320, 336);
                const hs = e.findHotspot(px, py, e.rooms[r]);
                return hs && hs.name;
            }, { room, x, y });
            expect(hit).toBe(name);
        });
    }
});

test.describe('text windows leave room for their art', () => {
    // The art panel is opaque and sits at the window's right edge, so every
    // wrapped line must end before it or the panel eats the end of the text.
    test('an item close-up opens its own window and does not cover the text', async ({ page }) => {
        await boot(page);
        const r = await page.evaluate(() => {
            const e = window.engine;
            e.addToInventory('spellbook');
            e.showItemCloseUp(e.items['spellbook']);
            const tw = e.textWindow;
            if (!tw) return { error: 'no text window' };
            const ctx = e._measureCtx;
            ctx.font = '13px "Courier New"';
            return {
                widest: Math.round(Math.max(...tw.lines.map((l) => ctx.measureText(l).width))),
                artLeft: Math.round(tw.w - 56 - 16)
            };
        });
        expect(r.error).toBeUndefined();
        expect(r.widest).toBeLessThan(r.artLeft);
    });

    test('a portrait message does not cover the text', async ({ page }) => {
        await boot(page);
        const r = await page.evaluate(() => {
            const e = window.engine;
            e.showMessage('"You came off a ship. It broke on the rocks below this house, eleven winters back, and he went down and came up with one thing."', { window: true, portrait: 'corvus' });
            const tw = e.textWindow;
            if (!tw) return { error: 'no text window' };
            const ctx = e._measureCtx;
            ctx.font = '13px "Courier New"';
            return {
                widest: Math.round(Math.max(...tw.lines.map((l) => ctx.measureText(l).width))),
                artLeft: Math.round(tw.w - 56 - 16)
            };
        });
        expect(r.error).toBeUndefined();
        expect(r.widest).toBeLessThan(r.artLeft);
    });
});

test.describe('save and load', () => {
    test('a round trip restores room, score, inventory and flags', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('dark_wood', 200, 340);
            e.playerFacing = 'left';
            e.addToInventory('rope');
            e.setFlag('goat_follows');
            e.addScore(10);
            e.saveGame(0);
        });
        const before = await page.evaluate(() => ({
            room: window.engine.currentRoomId,
            score: window.engine.score,
            facing: window.engine.playerFacing,
            inv: [...window.engine.inventory],
            goat: window.engine.getFlag('goat_follows')
        }));

        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('scullery', 300, 322);
            e.inventory = [];
            e.score = 0;
            e.flags = {};
            e.loadGame(0);
        });
        const after = await page.evaluate(() => ({
            room: window.engine.currentRoomId,
            score: window.engine.score,
            facing: window.engine.playerFacing,
            inv: [...window.engine.inventory],
            goat: window.engine.getFlag('goat_follows')
        }));

        expect(after).toEqual(before);
    });

    test('a corrupt save is rejected without breaking the game', async ({ page }) => {
        await boot(page);
        const ok = await page.evaluate(() => {
            localStorage.setItem('crownquest_save_0', '{ not json');
            return window.engine.loadGame(0);
        });
        expect(ok).toBeFalsy();
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('scullery');
    });
});

test.describe('story continuity', () => {
    test('the gnome name and conversation change only after the bargain', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            game.goToRoom('well_bottom', 320, 330);
            const gnome = game.rooms.well_bottom.hotspots.find(hotspot => hotspot.name === 'the gnome');
            const before = { name: gnome.name, description: gnome.description };
            window.CrownQuestContent.rules.nameTheGnome(game.actionScope);
            gnome.talk(game.actionScope);
            return { before, after: { name: gnome.name, description: gnome.description },
                topic: game.activeDialog.topicId, greeting: game.activeDialog.greetingText,
                chestVisible: !game.rooms.well_bottom.hotspots.find(hotspot => hotspot.name === 'the chest').hidden };
        });
        expect(result.before.name).toBe('the gnome');
        expect(result.before.description).not.toContain('Mendharbe');
        expect(result.after.name).toBe('Mendharbe');
        expect(result.after.description).toContain('no longer his seat');
        expect(result.topic).toBe('after_bargain');
        expect(result.greeting).toContain('packing');
        expect(result.chestVisible).toBe(false);
    });

    test('returning indoors acknowledges Morvane without closing retreat paths', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            game.setFlag('morvane_passed');
            const descriptions = ['scullery', 'study', 'spell_room'].map(id => {
                game.goToRoom(id, 300, 336);
                return game.rooms[id].description;
            });
            const options = game.dialogs.corvus.topics[0].options;
            return { descriptions,
                out: options.find(option => option.text === 'Where is Morvane?').condition(game),
                indoors: options.find(option => option.text === 'Where is Morvane now?').condition(game) };
        });
        result.descriptions.forEach(description => expect(description).toContain('observatory'));
        expect(result.out).toBe(false);
        expect(result.indoors).toBe(true);
    });

    test('literacy and the eleven-year treasure history are established before the ending', async ({ page }) => {
        await boot(page);
        const result = await page.evaluate(() => {
            const game = window.engine;
            const find = (room, name) => game.rooms[room].hotspots.find(hotspot => hotspot.name === name);
            const marker = find('harbour_road', 'the signpost') || game.rooms.harbour_road.hotspots.find(hotspot => hotspot.description?.includes('waymarker'));
            find('dark_wood', 'the parchment').look(game.actionScope);
            return { sign: marker.description, parchment: game.message,
                history: game.dialogs.hattie.topics[0].options.find(option => option.text === 'What is wrong with this kingdom?').response,
                gnome: game.dialogs.gnome.topics[0].text };
        });
        expect(result.sign).toContain('ordinary letters');
        expect(result.parchment).toContain('flour sacks');
        expect(result.history).toContain('six-year-old son');
        expect(result.history).toContain('eleven winters');
        expect(result.gnome).toContain('Thirty years');
        expect(result.gnome).toContain('Eleven years ago this chest');
    });

    for (const skipping of [false, true]) {
        test(`treasures and royal reunion stay consistent (skipping: ${skipping})`, async ({ page }) => {
            await boot(page);
            const result = await page.evaluate((skip) => {
                const game = window.engine;
                game._loopRunning = false;
                const treasures = ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'];
                treasures.forEach(id => game.addToInventory(id));
                game.goToRoom('amber_tower', 400, 336);
                const sockets = game.rooms.amber_tower.hotspots.find(hotspot => hotspot.name === 'the sockets');
                treasures.forEach(id => sockets.useItem(game.actionScope, id));
                const advanceSequence = () => {
                    if (skip) game.skipSequence();
                    else for (let step = 0; step < 100 && game.sequence; step++) {
                        if (game.textWindow) game.dismissTextWindow();
                        game.update(100);
                    }
                };
                advanceSequence();
                const duelInventory = [...game.inventory];
                game.update(15000);
                const reunion = game.sequence.steps.filter(step => step.say).map(step => step.say).join(' ');
                const afterDuel = [...game.inventory];
                advanceSequence();
                game.update(12000);
                return { duelInventory, afterDuel, reunion, freed: game.getFlag('elowen_freed'), won: game.won, score: game.score,
                    treasuresLeft: game.inventory.filter(id => treasures.includes(id)) };
            }, skipping);
            expect(result.duelInventory).toEqual(expect.arrayContaining(['shield_of_ardor', 'mirror_of_ianthe']));
            expect(result.duelInventory).not.toContain('chest_of_cormac');
            expect(result.afterDuel).not.toContain('shield_of_ardor');
            expect(result.reunion).toContain('Your mother');
            expect(result.reunion).toContain('Your father is Aldric');
            expect(result.reunion).toContain('seventeen');
            expect(result.reunion).toContain('Aldric does not die');
            expect(result.reunion).toContain('ward is finished');
            expect(result.treasuresLeft).toEqual([]);
            expect(result.won).toBe(true);
            expect(result.freed).toBe(true);
            expect(result.score).toBe(30);
        });
    }
});

test.describe('progression rules have one implementation', () => {
    test('the goat routs the troll exactly once', async ({ page }) => {
        await boot(page);
        const score = await page.evaluate(() => {
            const e = window.engine;
            e.setFlag('goat_follows');
            const before = e.score;
            e.goToRoom('troll_bridge', 120, 336);
            for (let i = 0; i < 40 && e.sequence; i++) e.skipSequence();
            e.goToRoom('dark_wood', 580, 340);
            e.goToRoom('troll_bridge', 120, 336);
            for (let i = 0; i < 40 && e.sequence; i++) e.skipSequence();
            return e.score - before;
        });
        expect(score).toBe(15);
    });

    test('setting a treasure twice cannot double-light a socket', async ({ page }) => {
        await boot(page);
        const lit = await page.evaluate(() => {
            const e = window.engine;
            e.addToInventory('chest_of_cormac');
            e.goToRoom('amber_tower', 400, 336);
            const hs = e.rooms.amber_tower.hotspots.find((h) => h.name === 'the sockets');
            hs.useItem(e.actionScope, 'chest_of_cormac');
            hs.useItem(e.actionScope, 'chest_of_cormac');
            return e.getCounter('sockets_lit');
        });
        expect(lit).toBe(1);
    });
});
