const { test, expect } = require('@playwright/test');

async function boot(page, url = '/?scenery=painted&actors=procedural') {
    await page.goto(url);
    await page.keyboard.press('e');
    await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.setTextSpeed('instant', false);
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.playerFacing = 'toward';
    });
}

async function clickScene(page, x, y) {
    const canvas = page.locator('#game-canvas');
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: x * bounds.width / 640, y: y * bounds.height / 400 } });
}

test('painted scullery renders and preserves pickups and the stair exit', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page);
    await page.waitForFunction(() => window.engine.minimumWalkY === 237);
    await page.evaluate(() => window.engine.render());
    await expect(page.locator('#game-canvas')).toHaveScreenshot(`painted-scullery-${testInfo.project.name}.png`);
    for (const [item, x, y] of [['sea_salt', 51, 61], ['bread', 60, 140], ['pail', 250, 280]]) {
        await page.evaluate(() => {
            window.engine.textWindow = null;
            window.engine.currentAction = 'get';
        });
        await clickScene(page, x, y);
        expect(await page.evaluate(id => window.engine.hasItem(id), item)).toBe(true);
    }
    await page.evaluate(() => {
        window.engine.textWindow = null;
        window.engine.render();
    });
    await expect(page.locator('#game-canvas')).toHaveScreenshot(`painted-scullery-collected-${testInfo.project.name}.png`);
    await page.evaluate(() => { window.engine.currentAction = 'walk'; });
    await clickScene(page, 450, 160);
    const destination = await page.evaluate(() => {
        const game = window.engine;
        for (let frame = 0; frame < 500 && game.currentRoomId === 'scullery'; frame++) game.update(1000 / 60);
        return game.currentRoomId;
    });
    expect(destination).toBe('study');
    await page.evaluate(() => window.engine.goToRoom('scullery', 300, 336));
    expect(await page.evaluate(() => ({
        minY: window.engine.minimumWalkY,
        barriers: window.engine.barriers.filter(barrier => !barrier.enabled || barrier.enabled(window.engine)),
        layers: window.engine.foregroundLayers.length
    }))).toEqual({ minY: 237, barriers: [{ x: 0, y: 278, w: 214, h: 52 }], layers: 2 });
    await page.evaluate(() => {
        const game = window.engine;
        game.textWindow = null;
        game.playerX = 250;
        game.playerY = 300;
        game.keysDown.ArrowLeft = true;
        for (let frame = 0; frame < 90; frame++) game.update(1000 / 60);
        game.keysDown = {};
    });
    expect(await page.evaluate(() => window.engine.playerX)).toBeGreaterThanOrEqual(214);
    expect(errors).toEqual([]);
});

test('painted table occludes Rowan while leaving the rear aisle reachable', async ({ page }) => {
    await boot(page, '/?scenery=painted&actors=painted');
    expect(await page.evaluate(() => window.engine.game.drawPlayerSprite.ready)).toBe(true);
    await page.waitForFunction(() => window.engine.minimumWalkY === 237);
    await page.evaluate(() => {
        const game = window.engine;
        game.playerX = 300;
        game.playerY = 340;
        game.idleActive = false;
        game.currentAction = 'walk';
    });
    await clickScene(page, 120, 260);
    const destination = await page.evaluate(() => {
        const game = window.engine;
        for (let frame = 0; frame < 500; frame++) game.update(1000 / 60);
        game.playerFacing = 'toward';
        game.animTimer = 4000;
        game.render();
        return { x: game.playerX, y: game.playerY };
    });
    expect(Math.abs(destination.x - 120)).toBeLessThan(3);
    expect(Math.abs(destination.y - 260)).toBeLessThan(3);
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
        window.engine.playerX = 120;
        window.engine.playerY = 260;
        window.engine.mouseX = 620;
        window.engine.mouseY = 380;
        window.engine.render();
    });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-table-behind.png');
    const pixels = await page.evaluate(() => {
        const game = window.engine;
        const ctx = game.canvas.getContext('2d');
        const layers = game.foregroundLayers;
        const capture = (visible, foreground) => {
            game.playerVisible = visible;
            game.foregroundLayers = foreground;
            game.render();
            return ctx.getImageData(0, 0, 640, 400).data;
        };
        const differences = (first, second, x, y, width, height) => {
            let count = 0;
            for (let row = y; row < y + height; row++) {
                for (let column = x; column < x + width; column++) {
                    const offset = (row * 640 + column) * 4;
                    if (first[offset] !== second[offset] || first[offset + 1] !== second[offset + 1]
                        || first[offset + 2] !== second[offset + 2]) count++;
                }
            }
            return count;
        };
        const empty = capture(false, layers);
        const behind = capture(true, layers);
        const unmasked = capture(true, []);
        const result = {
            head: differences(empty, behind, 96, 180, 48, 60),
            legs: differences(empty, behind, 96, 270, 48, 28),
            hiddenTorso: differences(empty, behind, 100, 244, 40, 24),
            unmaskedTorso: differences(empty, unmasked, 100, 244, 40, 24)
        };
        game.playerX = 160;
        game.playerY = 344;
        const front = capture(true, layers);
        const frontWithoutMask = capture(true, []);
        result.frontDifference = differences(front, frontWithoutMask, 150, 300, 20, 24);
        game.foregroundLayers = layers;
        game.render();
        return result;
    });
    expect(pixels.head).toBeGreaterThan(50);
    expect(pixels.legs).toBeGreaterThan(20);
    expect(pixels.hiddenTorso).toBe(0);
    expect(pixels.unmaskedTorso).toBeGreaterThan(50);
    expect(pixels.frontDifference).toBe(0);
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-table-front.png');
    const movement = await page.evaluate(() => {
        const game = window.engine;
        game.playerX = 120;
        game.playerY = 260;
        game.keysDown.ArrowDown = true;
        for (let frame = 0; frame < 60; frame++) game.update(1000 / 60);
        const blockedY = game.playerY;
        game.keysDown = { ArrowRight: true };
        for (let frame = 0; frame < 120; frame++) game.update(1000 / 60);
        game.keysDown = {};
        return { blockedY, exitX: game.playerX };
    });
    expect(movement.blockedY).toBeLessThanOrEqual(278);
    expect(movement.exitX).toBeGreaterThan(214);
});

test('missing painted image leaves the original room usable', async ({ page }) => {
    await page.route('**/icons/scullery-trial.png', route => route.abort());
    await boot(page);
    expect(await page.evaluate(() => ({
        minY: window.engine.minimumWalkY,
        layers: window.engine.foregroundLayers.length,
        saltX: window.engine.rooms.scullery.hotspots.find(hotspot => hotspot.name === 'the crock of salt').x
    }))).toEqual({ minY: 280, layers: 2, saltX: 32 });
    await page.evaluate(() => window.engine.render());
    await page.evaluate(() => { window.engine.currentAction = 'get'; });
    await clickScene(page, 51, 79);
    expect(await page.evaluate(() => window.engine.hasItem('sea_salt'))).toBe(true);
});

async function enterStudy(page) {
    await boot(page, '/?scenery=painted&actors=painted');
    expect(await page.evaluate(() => window.engine.game.drawPlayerSprite.ready)).toBe(true);
    await page.evaluate(() => window.engine.goToRoom('study', 330, 346));
    await page.waitForFunction(() => window.engine.surfaceY('desk', 396) === 228);
    await page.evaluate(() => {
        const game = window.engine;
        game.textWindow = null;
        game.roomTransition = 0;
        game.render();
    });
}

async function studyAction(page, action, x, y) {
    await page.evaluate(verb => {
        window.engine.textWindow = null;
        window.engine.currentAction = verb;
    }, action);
    await clickScene(page, x, y);
}

test('painted study preserves the key, tapestry, feather and raven', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterStudy(page);
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-study.png');
    await studyAction(page, 'look', 396, 205);
    expect(await page.evaluate(() => window.engine.hasItem('brass_key'))).toBe(true);
    await studyAction(page, 'look', 70, 130);
    expect(await page.evaluate(() => window.engine.getFlag('stair_revealed'))).toBe(true);
    await studyAction(page, 'get', 187, 213);
    expect(await page.evaluate(() => window.engine.hasItem('raven_feather'))).toBe(true);
    await page.evaluate(() => { window.engine.textWindow = null; window.engine.render(); });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-study-revealed.png');
    await studyAction(page, 'talk', 161, 198);
    expect(await page.evaluate(() => !!window.engine.activeDialog)).toBe(true);
    expect(errors).toEqual([]);
});

test('painted study routes all exits and blocks the desk', async ({ page }) => {
    await enterStudy(page);
    await studyAction(page, 'look', 70, 130);
    for (const [x, y, room] of [[72, 146, 'spell_room'], [30, 350, 'scullery'], [574, 170, 'crag_path']]) {
        await page.evaluate(() => {
            const game = window.engine;
            game.goToRoom('study', 330, 346);
            game.textWindow = null;
            game.roomTransition = 0;
            game.currentAction = 'walk';
        });
        await clickScene(page, x, y);
        expect(await page.evaluate(() => {
            const game = window.engine;
            for (let frame = 0; frame < 500 && game.currentRoomId === 'study'; frame++) game.update(1000 / 60);
            return game.currentRoomId;
        })).toBe(room);
    }
    const bounds = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('study', 330, 346);
        game.textWindow = null;
        game.keysDown.ArrowUp = true;
        for (let frame = 0; frame < 120; frame++) game.update(1000 / 60);
        game.keysDown = {};
        return { y: game.playerY, barriers: game.barriers.length, layers: game.foregroundLayers.length,
            surface: game.surfaceY('desk', 396) };
    });
    expect(bounds.y).toBeGreaterThanOrEqual(314);
    expect(bounds).toMatchObject({ barriers: 3, layers: 1, surface: 228 });
});

test('missing study image retains procedural study and its key puzzle', async ({ page }) => {
    await page.route('**/icons/study-trial.png', route => route.abort());
    await boot(page);
    await page.evaluate(() => window.engine.goToRoom('study', 330, 346));
    expect(await page.evaluate(() => window.engine.surfaceY('desk', 372))).toBe(262);
    await studyAction(page, 'look', 372, 237);
    expect(await page.evaluate(() => window.engine.hasItem('brass_key'))).toBe(true);
});

async function enterHiddenRoom(page) {
    await boot(page, '/?scenery=painted&actors=painted');
    expect(await page.evaluate(() => window.engine.game.drawPlayerSprite.ready)).toBe(true);
    await page.evaluate(() => window.engine.goToRoom('spell_room', 210, 350));
    await page.waitForFunction(() => window.engine.rooms.spell_room.hotspots.find(hotspot => hotspot.name === 'the lectern').y === 171);
    await page.evaluate(() => {
        window.engine.textWindow = null;
        window.engine.roomTransition = 0;
        window.engine.render();
    });
}

async function hiddenRoomItem(page, item, x, y) {
    await page.evaluate(id => { window.engine.selectedItem = id; }, item);
    await studyAction(page, 'use', x, y);
    await page.evaluate(() => { window.engine.selectedItem = null; });
}

async function hiddenRoomShot(page, name) {
    const canvas = page.locator('#game-canvas');
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 620 / 640, bounds.y + bounds.height * 380 / 400);
    await page.evaluate(() => { window.engine.textWindow = null; window.engine.render(); });
    await expect(canvas).toHaveScreenshot(name);
}

test('painted hidden room preserves the complete chest and spell puzzle', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterHiddenRoom(page);
    await hiddenRoomShot(page, 'painted-hidden-room.png');
    await page.evaluate(() => {
        for (const item of ['brass_key', 'raven_feather', 'sea_salt']) window.engine.addToInventory(item);
    });
    await hiddenRoomItem(page, 'brass_key', 120, 305);
    expect(await page.evaluate(() => window.engine.getFlag('chest_open'))).toBe(true);
    await hiddenRoomShot(page, 'painted-hidden-room-open.png');
    await studyAction(page, 'get', 120, 280);
    expect(await page.evaluate(() => window.engine.hasItem('spellbook'))).toBe(true);
    await hiddenRoomItem(page, 'spellbook', 510, 205);
    expect(await page.evaluate(() => window.engine.getFlag('read_spell'))).toBe(true);
    await hiddenRoomItem(page, 'raven_feather', 320, 345);
    await hiddenRoomItem(page, 'sea_salt', 320, 345);
    expect(await page.evaluate(() => ({
        feather: window.engine.getFlag('circle_feather'), salt: window.engine.getFlag('circle_salt'),
        retained: window.engine.hasItem('raven_feather') || window.engine.hasItem('sea_salt')
    }))).toEqual({ feather: true, salt: true, retained: false });
    await hiddenRoomShot(page, 'painted-hidden-room-circle.png');
    await studyAction(page, 'use', 320, 345);
    expect(await page.evaluate(() => !!window.engine.sequence)).toBe(true);
    await page.evaluate(() => window.engine.skipSequence());
    expect(await page.evaluate(() => window.engine.hasItem('thimble'))).toBe(true);
    const score = await page.evaluate(() => window.engine.score);
    await studyAction(page, 'use', 320, 345);
    expect(await page.evaluate(() => window.engine.score)).toBe(score);
    expect(errors).toEqual([]);
});

test('painted hidden room keeps obstacles solid and the return stair reachable', async ({ page }) => {
    await enterHiddenRoom(page);
    for (const [x, edge] of [[120, 328], [510, 302]]) {
        const y = await page.evaluate(px => {
            const game = window.engine;
            game.playerX = px;
            game.playerY = 350;
            game.keysDown.ArrowUp = true;
            for (let frame = 0; frame < 90; frame++) game.update(1000 / 60);
            game.keysDown = {};
            return game.playerY;
        }, x);
        expect(y).toBeGreaterThanOrEqual(edge);
    }
    await page.evaluate(() => {
        window.engine.playerX = 320;
        window.engine.playerY = 350;
    });
    await studyAction(page, 'walk', 597, 150);
    expect(await page.evaluate(() => {
        const game = window.engine;
        for (let frame = 0; frame < 500 && game.currentRoomId === 'spell_room'; frame++) game.update(1000 / 60);
        return game.currentRoomId;
    })).toBe('study');
    await page.evaluate(() => window.engine.goToRoom('spell_room', 320, 344));
    expect(await page.evaluate(() => window.engine.barriers)).toEqual([
        { x: 58, y: 286, w: 128, h: 42 }, { x: 462, y: 240, w: 92, h: 62 }
    ]);
});

test('missing hidden-room image retains the procedural chest puzzle', async ({ page }) => {
    await page.route('**/icons/hidden-room-trial.png', route => route.abort());
    await boot(page);
    await page.evaluate(() => {
        window.engine.goToRoom('spell_room', 210, 350);
        window.engine.addToInventory('brass_key');
        window.engine.roomTransition = 0;
        window.engine.render();
    });
    expect(await page.evaluate(() => window.engine.rooms.spell_room.hotspots.find(hotspot => hotspot.name === 'the lectern').y)).toBe(246);
    await hiddenRoomItem(page, 'brass_key', 120, 305);
    await studyAction(page, 'get', 120, 280);
    expect(await page.evaluate(() => window.engine.hasItem('spellbook'))).toBe(true);
});