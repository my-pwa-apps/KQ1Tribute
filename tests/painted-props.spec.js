const { test, expect } = require('@playwright/test');

async function boot(page, url = '/?scenery=painted') {
    await page.goto(url);
    await page.keyboard.press('e');
    await page.evaluate(async () => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        if (game.game.drawPlayerSprite) await game.game.drawPlayerSprite.ready;
        game._loopRunning = false;
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.idleActive = false;
        game.playerX = 340;
        game.playerY = 330;
        game.playerFacing = 'toward';
    });
}

test('generated props replace room and inventory art and disappear on pickup', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page);
    await page.waitForFunction(() => {
        const ctx = document.createElement('canvas').getContext('2d');
        return ['bread', 'pail'].every(id => window.drawPaintedItem(ctx, id, 30, 50, 40, 40));
    });
    await page.evaluate(() => window.engine.render());
    await expect(page.locator('#game-canvas')).toHaveScreenshot('generated-props-scullery.png');
    const art = await page.evaluate(() => {
        const game = window.engine;
        const canvas = document.createElement('canvas');
        canvas.id = 'prop-proof';
        canvas.width = 320;
        canvas.height = 112;
        canvas.style.width = '100%';
        canvas.style.maxWidth = '640px';
        canvas.style.height = 'auto';
        canvas.style.imageRendering = 'pixelated';
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#303331';
        ctx.fillRect(0, 0, 320, 112);
        const sources = [];
        const original = ctx.drawImage.bind(ctx);
        ctx.drawImage = (image, ...args) => { sources.push(image.src); original(image, ...args); };
        game.itemArt.bread(ctx, 54, 50, 4000);
        game.itemArt.pail(ctx, 154, 50, 4000);
        game.setFlag('pail_full', true);
        game.itemArt.pail(ctx, 254, 50, 4000);
        const full = ctx.getImageData(234, 22, 40, 50).data;
        const empty = ctx.getImageData(134, 22, 40, 50).data;
        game.setFlag('pail_full', false);
        document.body.append(canvas);
        return { sources: sources.map(source => source.split('/').pop()),
            waterVisible: full.some((value, index) => value !== empty[index]) };
    });
    expect(art.sources).toEqual(['bread-trial.png', 'pail-trial.png', 'pail-trial.png']);
    expect(art.waterVisible).toBe(true);
    await expect(page.locator('#prop-proof')).toHaveScreenshot('generated-props-inventory.png');
    await page.evaluate(() => document.getElementById('prop-proof').remove());
    for (const [id, x, y] of [['bread', 60, 140], ['pail', 250, 280]]) {
        await page.evaluate(() => { window.engine.textWindow = null; window.engine.currentAction = 'get'; });
        const canvas = page.locator('#game-canvas');
        const bounds = await canvas.boundingBox();
        await canvas.click({ position: { x: x * bounds.width / 640, y: y * bounds.height / 400 } });
        expect(await page.evaluate(id => window.engine.hasItem(id), id)).toBe(true);
    }
    const remainingSprites = await page.evaluate(() => {
        const game = window.engine;
        const original = game.ctx.drawImage;
        const sources = [];
        game.ctx.drawImage = function(image, ...args) {
            if (image.src) sources.push(image.src);
            return original.call(this, image, ...args);
        };
        try { game.textWindow = null; game.render(); } finally { game.ctx.drawImage = original; }
        return sources.filter(source => /\/(bread|pail)-trial\.png$/.test(source));
    });
    expect(remainingSprites).toEqual([]);
    expect(errors).toEqual([]);
});

test('failed prop downloads retain drawable procedural items and pickups', async ({ page }) => {
    await page.route('**/icons/*-trial.png', route => /\/(bread|pail|crock|candle|ledger|spellbook)-trial\.png$/.test(route.request().url())
        ? route.abort() : route.continue());
    await boot(page);
    const fallback = await page.evaluate(() => {
        const game = window.engine;
        const canvas = document.createElement('canvas');
        canvas.width = 56; canvas.height = 56;
        const ctx = canvas.getContext('2d');
        return ['bread', 'pail', 'spellbook'].map(id => {
            ctx.clearRect(0, 0, 56, 56);
            const painted = window.drawPaintedItem(ctx, id, 28, 45, 40, 40);
            game.itemArt[id](ctx, 28, 28, 4000);
            return { painted, opaque: ctx.getImageData(0, 0, 56, 56).data.filter((value, index) => index % 4 === 3 && value > 0).length };
        });
    });
    for (const item of fallback) {
        expect(item.painted).toBe(false);
        expect(item.opaque).toBeGreaterThan(100);
    }
    expect(await page.evaluate(() => {
        const game = window.engine;
        game.currentAction = 'get';
        game.handleClick(60, 140);
        game.textWindow = null;
        game.handleClick(250, 280);
        for (const room of ['study', 'spell_room']) {
            game.goToRoom(room, 330, 346);
            game.setFlag('chest_open', true);
            game.textWindow = null;
            game.roomTransition = 0;
            game.render();
        }
        return game.hasItem('bread') && game.hasItem('pail');
    })).toBe(true);
});

test('original game and explicit prop override keep procedural art', async ({ page }) => {
    for (const url of ['/', '/?scenery=painted&props=procedural']) {
        await boot(page, url);
        expect(await page.evaluate(() => {
            const ctx = document.createElement('canvas').getContext('2d');
            return ['bread', 'pail', 'crock', 'candle', 'ledger', 'spellbook', '__proto__'].map(id => window.drawPaintedItem(ctx, id, 28, 45, 40, 40));
        })).toEqual([false, false, false, false, false, false, false]);
    }
});

test('generated room dressing preserves salt, ledger, flame and spellbook states', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page);
    await page.waitForFunction(() => {
        const ctx = document.createElement('canvas').getContext('2d');
        return ['crock', 'candle', 'ledger', 'spellbook'].every(id => window.drawPaintedItem(ctx, id, 30, 50, 40, 40));
    });
    const salt = await page.evaluate(() => {
        const game = window.engine;
        game.render();
        const before = game.ctx.getImageData(45, 45, 14, 12).data;
        game.currentAction = 'get';
        game.handleClick(51, 61);
        game.textWindow = null;
        game.render();
        const after = game.ctx.getImageData(45, 45, 14, 12).data;
        return { collected: game.hasItem('sea_salt'), changed: before.some((value, index) => value !== after[index]) };
    });
    expect(salt).toEqual({ collected: true, changed: true });
    await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('study', 330, 346);
        game.roomTransition = 0;
        game.textWindow = null;
        game.mouseX = 620; game.mouseY = 380;
        game.render();
    });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('generated-study-dressing.png');
    const study = await page.evaluate(() => {
        const game = window.engine;
        const first = game.ctx.getImageData(255, 182, 28, 25).data;
        game.animTimer += 450;
        game.render();
        const second = game.ctx.getImageData(255, 182, 28, 25).data;
        game.currentAction = 'look';
        game.handleClick(313, 218);
        return { flameChanges: first.some((value, index) => value !== second[index]), text: !!game.textWindow };
    });
    expect(study).toEqual({ flameChanges: true, text: true });
    await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('spell_room', 210, 350);
        game.setFlag('chest_open', true);
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.render();
    });
    await expect(page.locator('#game-canvas')).toHaveScreenshot('generated-chest-spellbook.png');
    const book = await page.evaluate(() => {
        const game = window.engine;
        game.currentAction = 'get';
        game.handleClick(120, 280);
        const canvas = document.createElement('canvas');
        canvas.id = 'book-proof'; canvas.width = 160; canvas.height = 80;
        canvas.style.width = '100%'; canvas.style.maxWidth = '480px'; canvas.style.height = 'auto';
        canvas.style.imageRendering = 'pixelated';
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#303331'; ctx.fillRect(0, 0, 160, 80);
        game.itemArt.spellbook(ctx, 40, 38, 0);
        game.itemArt.spellbook(ctx, 120, 38, 450);
        const first = ctx.getImageData(12, 10, 56, 56).data;
        const second = ctx.getImageData(92, 10, 56, 56).data;
        document.body.append(canvas);
        return { collected: game.hasItem('spellbook'), glowChanges: first.some((value, index) => value !== second[index]) };
    });
    expect(book).toEqual({ collected: true, glowChanges: true });
    await expect(page.locator('#book-proof')).toHaveScreenshot('generated-spellbook-glow.png');
    expect(errors).toEqual([]);
});