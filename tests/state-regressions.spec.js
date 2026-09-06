const { test, expect } = require('@playwright/test');

async function boot(page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press('e');
    await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.setTextSpeed('instant', false);
        game.textWindow = null;
    });
}

test.beforeEach(async ({ page }) => boot(page));

test('Fennow remains available for unasked clues after gifting the ring', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('dark_wood', 300, 354);
        game.executeParserCommand('get hare');
        game.executeParserCommand('talk Fennow');
        game._advanceDialog();
        game.selectDialogOption(game.activeDialog.visibleOptions.findIndex(option => option.text.includes('accept his gift')));
        game._advanceDialog();
        game.selectDialogOption(game.activeDialog.visibleOptions.findIndex(option => option.text.includes('Thank you.')));
        game._advanceDialog();
        game.goToRoom('village_green', 580, 354);
        game.goToRoom('dark_wood', 60, 354);
        game.executeParserCommand('talk Fennow');
        game._advanceDialog();
        const options = game.activeDialog.visibleOptions.map(option => option.text);
        const hidden = game.rooms.dark_wood.hotspots.find(hotspot => hotspot.name === 'Fennow').hidden;
        return { options, hidden, rings: game.inventory.filter(item => item === 'ring_of_mist').length };
    });
    expect(result.hidden).toBe(false);
    expect(result.rings).toBe(1);
    expect(result.options.some(text => text.includes('above the cloud'))).toBe(true);
    expect(result.options.some(text => text.includes('And the dragon'))).toBe(true);
    expect(result.options.some(text => text.includes('accept his gift'))).toBe(false);
});

const treasures = ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'];
for (const first of treasures) {
    for (const second of treasures.filter(item => item !== first)) {
        const order = [first, second, treasures.find(item => item !== first && item !== second)];
        test(`socket order with intermediate restores: ${order.join(', ')}`, async ({ page }) => {
            const result = await page.evaluate(items => {
                const game = window.engine;
                items.forEach(item => game.addToInventory(item));
                game.goToRoom('amber_tower', 320, 340);
                const sockets = game.rooms.amber_tower.hotspots.find(hotspot => hotspot.name === 'the sockets');
                const snapshots = [];
                items.forEach((item, index) => {
                    sockets.useItem(game.actionScope, item);
                    if (index < 2) {
                        game.saveGame(index);
                        game.loadGame(index);
                        snapshots.push({ count: game.getCounter('sockets_lit'), carried: game.hasItem(item), socket: game.getFlag(`socket_${item}`) });
                    }
                });
                for (let frame = 0; frame < 10000 && !game.won; frame++) {
                    if (game.textWindow) game.dismissTextWindow();
                    game.update(1000 / 60);
                }
                return { snapshots, won: game.won, score: game.score, inventory: game.inventory };
            }, order);
            expect(result).toEqual({ snapshots: [
                { count: 1, carried: false, socket: true }, { count: 2, carried: false, socket: true }
            ], won: true, score: 30, inventory: [] });
        });
    }
}

test('natural puzzle verbs update the same persistent state', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('study', 300, 336);
        game.executeParserCommand('pull tapestry');
        const stair = game.getFlag('stair_revealed');
        game.addToInventory('spellbook');
        game.executeParserCommand('read spellbook');
        const read = game.getFlag('read_spell');
        game.setFlag('read_spell', false);
        game.currentAction = 'look';
        game.handleInventoryClick('spellbook');
        const clicked = game.getFlag('read_spell');
        game.goToRoom('dark_wood', 300, 340);
        game.executeParserCommand('get parchment');
        const parchment = game.hasItem('parchment');
        game.setFlag('rope_tied');
        return { stair, read, clicked, parchment, hint: game.rooms.village_green.hint(game) };
    });
    expect(result).toMatchObject({ stair: true, read: true, clicked: true, parchment: true });
    expect(result.hint).not.toContain('Talk to her');
});

test('consumed salt and deposited treasures cannot award twice', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        const salt = game.rooms.scullery.hotspots.find(hotspot => hotspot.name === 'the crock of salt');
        salt.get(game.actionScope);
        game.removeFromInventory('sea_salt');
        game.setFlag('circle_salt');
        salt.get(game.actionScope);
        const saltScore = game.score;
        const sources = [['cloud_realm', 'the Shield of Ardor', 'shield_of_ardor'], ['dragon_cave', 'the Mirror of Ianthe', 'mirror_of_ianthe']];
        const states = sources.map(([room, name, item]) => {
            game.goToRoom(room, 500, 340);
            game.setFlag('ring_worn');
            game.setFlag('dragon_doused');
            const source = game.rooms[room].hotspots.find(hotspot => hotspot.name === name);
            source.get(game.actionScope);
            const score = game.score;
            game.goToRoom('amber_tower', 320, 340);
            game.rooms.amber_tower.hotspots.find(hotspot => hotspot.name === 'the sockets').useItem(game.actionScope, item);
            game.goToRoom(room, 500, 340);
            source.get(game.actionScope);
            return { hidden: source.hidden, carried: game.hasItem(item), unchanged: game.score === score };
        });
        return { saltScore, states };
    });
    expect(result.saltScore).toBe(3);
    expect(result.states).toEqual(Array(2).fill({ hidden: true, carried: false, unchanged: true }));
});

for (const omitted of [['bread'], ['pail'], ['bread', 'pail']]) {
    test(`sailing requires supplies: missing ${omitted.join(' and ')}`, async ({ page }) => {
        const result = await page.evaluate((missing) => {
            const game = window.engine;
            for (const item of ['thimble', 'bread', 'pail']) {
                if (!missing.includes(item)) game.addToInventory(item);
            }
            game.setFlag('morvane_passed');
            game.goToRoom('crag_path', 520, 336);
            const boat = game.rooms.crag_path.hotspots.find(hotspot => hotspot.name === 'the skiff');
            boat.useItem(game.actionScope, 'thimble');
            const refused = { room: game.currentRoomId, wind: game.hasItem('thimble'), cutscene: !!game.cutscene, message: game.message };
            for (const item of missing) game.addToInventory(item);
            boat.useItem(game.actionScope, 'thimble');
            game.skipCutscene();
            return { refused, room: game.currentRoomId, wind: game.hasItem('thimble') };
        }, omitted);
        expect(result.refused).toMatchObject({ room: 'crag_path', wind: true, cutscene: false });
        expect(result.refused.message).toContain('scullery');
        expect(result).toMatchObject({ room: 'harbour_road', wind: false });
    });
}

for (const skip of [false, true]) {
    test(`first goat arrival preserves the bridge crossing (skip: ${skip})`, async ({ page }) => {
        await page.evaluate((skipping) => {
            const game = window.engine;
            game.setFlag('goat_follows');
            game.goToRoom('troll_bridge', 120, 354);
            if (skipping) game.skipSequence();
            else for (let frame = 0; frame < 1000 && game.sequence; frame++) {
                if (game.textWindow) game.dismissTextWindow();
                game.update(16.67);
            }
            game.textWindow = null;
            game.roomTransition = 0;
            game.render();
        }, skip);
        await page.getByRole('button', { name: 'Walk', exact: true }).click();
        const bounds = await page.locator('#game-canvas').boundingBox();
        await page.locator('#game-canvas').click({ position: { x: 332 * bounds.width / 640, y: 240 * bounds.height / 400 } });
        const crossing = await page.evaluate(() => {
            const game = window.engine;
            for (let frame = 0; frame < 1000; frame++) game.update(16.67);
            return { room: game.currentRoomId, y: game.playerY, sequence: !!game.sequence, score: game.score };
        });
        expect(crossing).toMatchObject({ room: 'troll_bridge', sequence: false, score: 15 });
        expect(crossing.y).toBeLessThan(204);
        await page.keyboard.down('ArrowDown');
        const returned = await page.evaluate(() => {
            const game = window.engine;
            for (let frame = 0; frame < 100 && game.playerY < 354; frame++) game.update(16.67);
            return { room: game.currentRoomId, y: game.playerY, score: game.score };
        });
        await page.keyboard.up('ArrowDown');
        expect(returned.room).toBe('troll_bridge');
        expect(returned.y).toBeGreaterThan(334);
        expect(returned.score).toBe(15);
    });
}

test('restore preserves ring protection and fresh entry still removes it', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.addToInventory('ring_of_mist');
        game.goToRoom('cloud_realm', 200, 340);
        game.rooms.cloud_realm.hotspots.find(hotspot => hotspot.name === 'the giant').useItem(game.actionScope, 'ring_of_mist');
        game.saveGame(0);
        game.loadGame(0);
        const restored = game.getFlag('ring_worn');
        game.rooms.cloud_realm.hotspots.find(hotspot => hotspot.name === 'the Shield of Ardor').get(game.actionScope);
        const safe = game.hasItem('shield_of_ardor') && !game.dead;
        game.goToRoom('cloud_realm', 200, 340);
        return { restored, safe, fresh: game.getFlag('ring_worn') };
    });
    expect(result).toEqual({ restored: true, safe: true, fresh: false });
});

test('restore preserves the crag timer and warning', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('crag_path', 180, 336);
        game.textWindow = null;
        game.update(4000);
        game.saveGame(0);
        game.loadGame(0);
        const restored = [game.getCounter('crag_timer'), game.getFlag('crag_nudged')];
        game.goToRoom('study', 300, 336);
        game.goToRoom('crag_path', 180, 336);
        return { restored, fresh: [game.getCounter('crag_timer'), game.getFlag('crag_nudged')] };
    });
    expect(result).toEqual({ restored: [4000, true], fresh: [0, false] });
});

test('restart resets pail text while saves retain filled text', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.addToInventory('pail');
        game.goToRoom('well_bottom', 260, 340);
        game.rooms.well_bottom.hotspots.find(hotspot => hotspot.name === 'the pool').use(game.actionScope);
        game.saveGame(0);
        game.restart();
        const restarted = { name: game.items.pail.name, full: game.getFlag('pail_full') };
        game.loadGame(0);
        const restored = { name: game.items.pail.name, full: game.getFlag('pail_full') };
        return { restarted, restored };
    });
    expect(result).toEqual({
        restarted: { name: 'Wooden Pail', full: false },
        restored: { name: 'Pail of Water', full: true }
    });
});

for (const pending of ['sequence', 'cutscene', 'dialog', 'ending']) {
    test(`saving during ${pending} leaves the slot unchanged`, async ({ page }) => {
        const before = await page.evaluate((state) => {
            const game = window.engine;
            game.saveGame(0);
            const saved = localStorage.getItem(game.getSaveKey(0));
            if (state === 'sequence') game.runSequence(['A pending scene.', () => game.addToInventory('bread')]);
            if (state === 'cutscene') game.playCutscene({ duration: 3000, draw: () => {} });
            if (state === 'dialog') {
                game.startDialog('hattie');
                game._advanceDialog();
                game.selectDialogOption(game.activeDialog.visibleOptions.findIndex(option => option.text.includes('Could I have a rope')));
            }
            if (state === 'ending') {
                game.goToRoom('amber_tower', 320, 340);
                const sockets = game.rooms.amber_tower.hotspots.find(hotspot => hotspot.name === 'the sockets');
                for (const item of ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe']) {
                    game.addToInventory(item);
                    sockets.useItem(game.actionScope, item);
                }
            }
            game.saveGame(0);
            return saved;
        }, pending);
        const save = page.getByRole('button', { name: 'Save', exact: true });
        if (!await save.isVisible()) await page.locator('#btn-tools').click();
        await save.click();
        await expect(page.locator('#save-modal')).not.toHaveClass(/open/);
        expect(await page.evaluate(() => window.engine.message)).toContain('before saving');
        expect(await page.evaluate(() => localStorage.getItem(window.engine.getSaveKey(0)))).toBe(before);
    });
}

for (const gift of [
    { dialog: 'hattie', item: 'rope', text: 'Could I have a rope?' },
    { dialog: 'fennow', item: 'ring_of_mist', text: 'accept his gift' }
]) {
    test(`${gift.item}: dialogue history follows restore and restart`, async ({ page }) => {
        const result = await page.evaluate(({ dialog, item, text }) => {
            const game = window.engine;
            const offer = () => {
                game.startDialog(dialog);
                game._advanceDialog();
                return game.activeDialog.visibleOptions.findIndex(option => option.text.includes(text));
            };
            game.saveGame(0);
            game.selectDialogOption(offer());
            game._advanceDialog();
            game.activeDialog = null;
            game.textWindow = null;
            game.saveGame(1);
            game.loadGame(1);
            const afterGift = { held: game.hasItem(item), offered: offer() >= 0 };
            game.loadGame(0);
            const beforeGift = { held: game.hasItem(item), offered: offer() >= 0 };
            game.restart();
            const restarted = { held: game.hasItem(item), offered: offer() >= 0 };
            return { afterGift, beforeGift, restarted };
        }, gift);
        expect(result).toEqual({
            afterGift: { held: true, offered: false },
            beforeGift: { held: false, offered: true },
            restarted: { held: false, offered: true }
        });
    });
}