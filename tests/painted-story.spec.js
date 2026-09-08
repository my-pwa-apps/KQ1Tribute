const { test, expect } = require('@playwright/test');

async function enterCrag(page) {
    await page.goto('/?scenery=painted');
    await page.keyboard.press('e');
    await page.evaluate(async () => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        await game.game.drawPlayerSprite.ready;
        game._loopRunning = false;
        game.setFlag('morvane_passed');
        game.goToRoom('crag_path', 320, 346);
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.playerFacing = 'toward';
        game.mouseX = 620; game.mouseY = 380;
    });
    await page.waitForFunction(() => window.engine.minimumWalkY === 165);
}

test('painted crag aligns obstacles, floor routes, and house exit', async ({ page }) => {
    await enterCrag(page);
    const geometry = await page.evaluate(() => {
        const game = window.engine;
        game.render();
        return { blocked: [[500, 280], [320, 190], [600, 220]].map(point => game.collidesBarrier(...point)),
            clear: [[135, 178], [150, 230], [320, 346], [590, 346]].map(point => game.collidesBarrier(...point)) };
    });
    expect(geometry).toEqual({ blocked: [true, true, true], clear: [false, false, false, false] });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-crag.png');
    const route = await page.evaluate(() => {
        const game = window.engine;
        const reached = [];
        for (const [x, y] of [[590, 346], [320, 346], [140, 270], [135, 210]]) {
            game.playerTargetX = x; game.playerTargetY = y; game.playerWalking = true;
            for (let frame = 0; frame < 240 && game.playerWalking; frame++) game.update(16);
            reached.push(Math.hypot(game.playerX - x, game.playerY - y) < 1);
        }
        game.currentAction = 'walk';
        game.handleClick(130, 128);
        for (let frame = 0; frame < 120 && game.currentRoomId === 'crag_path'; frame++) game.update(16);
        return { reached, room: game.currentRoomId };
    });
    expect(route.reached).toEqual([true, true, true, true]);
    expect(route.room).toBe('study');
});

test('painted title and intro panels retain text and pixel rendering', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?scenery=painted');
    await page.waitForFunction(() => ['title', 'house', 'morvane', 'opendoor'].every(id =>
        window.drawPaintedStoryFrame(document.createElement('canvas').getContext('2d'), id, 640, 400)));
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
        const game = window.engine;
        game._loopRunning = false;
        game.animTimer = 4000;
        game.render();
    });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-title.png');
    for (const [name, progress] of [['house', 0.1], ['morvane', 0.6], ['opendoor', 0.85]]) {
        const drawn = await page.evaluate(({ progress, name }) => {
            const game = window.engine;
            const sources = [], captions = [];
            const drawImage = game.ctx.drawImage, fillText = game.ctx.fillText;
            game.ctx.drawImage = function(image, ...args) {
                if (image.src) sources.push(image.src.split('/').pop());
                else if (image.width === 320 && image.height === 200) sources.push('story-raster');
                return drawImage.call(this, image, ...args);
            };
            game.ctx.fillText = function(text, ...args) {
                captions.push(text);
                return fillText.call(this, text, ...args);
            };
            try {
                window.cutsceneOpening(game.ctx, 640, 400, progress, 4000);
            } finally {
                game.ctx.drawImage = drawImage;
                game.ctx.fillText = fillText;
            }
            return { sources, captions, loaded: window.drawPaintedStoryFrame(
                document.createElement('canvas').getContext('2d'), name, 640, 400) };
        }, { progress, name });
        expect(drawn.loaded).toBe(true);
        expect(drawn.sources).toContain('story-raster');
        expect(drawn.captions).toHaveLength(1);
        await expect(page.locator('#game-canvas')).toHaveScreenshot(`painted-intro-${name}.png`);
    }
    expect(errors).toEqual([]);
});

test('painted boulder masks Rowan and the wizard encounter preserves sailing', async ({ page }) => {
    await enterCrag(page);
    for (const [name, groundY] of [['behind', 275], ['front', 346]]) {
        await page.evaluate(y => {
            const game = window.engine;
            game.playerX = 440; game.playerY = y;
            game.render();
        }, groundY);
        await expect(page.locator('#game-canvas')).toHaveScreenshot(`painted-boulder-${name}.png`);
    }
    const encounter = await page.evaluate(() => {
        const game = window.engine;
        game.setFlag('morvane_passed', false);
        game.currentAction = 'use';
        game.handleClick(480, 250);
        const score = game.score;
        game.cutscene.draw(game.ctx, 640, 400, 0.35, 2450);
        return { passed: game.getFlag('morvane_passed'), duration: game.cutscene.duration, score };
    });
    expect(encounter.passed).toBe(true);
    expect(encounter.duration).toBe(7000);
    expect(encounter.score).toBeGreaterThan(0);
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-morvane-passes.png');
    const outcome = await page.evaluate(() => {
        const game = window.engine;
        game.skipCutscene();
        game.textWindow = null;
        game.rooms.crag_path.hotspots.find(hotspot => hotspot.name === 'the boulder').use(game);
        const score = game.score;
        game.textWindow = null;
        game.addToInventory('thimble');
        const skiff = game.rooms.crag_path.hotspots.find(hotspot => hotspot.name === 'the skiff');
        skiff.useItem(game, 'thimble');
        const guarded = game.hasItem('thimble') && !game.cutscene;
        game.addToInventory('bread'); game.addToInventory('pail');
        game.textWindow = null;
        skiff.useItem(game, 'thimble');
        game.skipCutscene();
        return { score, guarded, room: game.currentRoomId, thimble: game.hasItem('thimble') };
    });
    expect(outcome).toEqual({ score: encounter.score, guarded: true, room: 'harbour_road', thimble: false });
});

test('missing crag image retains original geometry and hiding sequence', async ({ page }) => {
    await page.route('**/icons/crag-trial.png', route => route.abort());
    await page.goto('/?scenery=painted');
    await page.keyboard.press('e');
    const fallback = await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.goToRoom('crag_path', 320, 346);
        game.textWindow = null; game.roomTransition = 0;
        game.render();
        const minY = game.minimumWalkY;
        game.currentAction = 'use';
        game.handleClick(470, 280);
        game.cutscene.draw(game.ctx, 640, 400, 0.4, 2800);
        game.skipCutscene();
        return { minY, passed: game.getFlag('morvane_passed'), barriers: game.barriers };
    });
    expect(fallback).toEqual({ minY: 280, passed: true, barriers: [{ x: 408, y: 250, w: 130, h: 60 }] });
});

test('missing story artwork and original mode keep procedural panels', async ({ page }) => {
    await page.route('**/icons/*trial.png', route => route.abort());
    for (const url of ['/?scenery=painted', '/']) {
        await page.goto(url);
        expect(await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            game.render();
            for (const progress of [0.1, 0.35, 0.6, 0.85]) {
                window.cutsceneOpening(game.ctx, 640, 400, progress, 4000);
            }
            return ['title', 'house', 'morvane', 'opendoor'].map(id =>
                window.drawPaintedStoryFrame(game.ctx, id, 640, 400));
        })).toEqual([false, false, false, false]);
    }
});