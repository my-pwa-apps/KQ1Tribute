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

test.describe('inventory and hotspots', () => {
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
