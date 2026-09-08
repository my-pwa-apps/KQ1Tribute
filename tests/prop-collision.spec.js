const { test, expect } = require('@playwright/test');

async function boot(page) {
    await page.goto('/?scenery=painted');
    await page.keyboard.press('e');
    await page.evaluate(async () => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        await game.game.drawPlayerSprite.ready;
        game._loopRunning = false;
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
    });
    await page.waitForFunction(() => window.engine.minimumWalkY === 237);
}

test('pail blocks keyboard and click walking until collected, including re-entry', async ({ page }) => {
    await boot(page);
    const blocked = await page.evaluate(() => {
        const game = window.engine;
        game.playerX = 320; game.playerY = 290;
        game.keysDown = { ArrowLeft: true };
        for (let frame = 0; frame < 60; frame++) game.update(16);
        game.keysDown = {};
        const keyboardX = game.playerX;
        game.playerX = 320;
        game.currentAction = 'walk';
        game.handleClick(250, 290);
        for (let frame = 0; frame < 150; frame++) game.update(16);
        const clickX = game.playerX;
        game.playerX = 272; game.playerY = 290;
        game.playerTargetX = 270; game.playerTargetY = 290;
        game.playerWalking = true;
        game.pendingAction = () => { throw new Error('Blocked arrival executed an action'); };
        game.update(16);
        return { keyboardX, clickX, finalX: game.playerX, blocked: game.collidesBarrier(250, 290) };
    });
    expect(blocked.keyboardX).toBeGreaterThanOrEqual(271);
    expect(blocked.clickX).toBeGreaterThanOrEqual(271);
    expect(blocked.finalX).toBe(272);
    expect(blocked.blocked).toBe(true);
    const route = await page.evaluate(() => {
        const game = window.engine;
        const points = [[310, 260], [225, 260], [225, 340], [310, 340]];
        const reached = [];
        for (const [x, y] of points) {
            game.playerTargetX = x; game.playerTargetY = y; game.playerWalking = true;
            for (let frame = 0; frame < 180 && game.playerWalking; frame++) game.update(16);
            reached.push(Math.hypot(game.playerX - x, game.playerY - y) < 1);
        }
        game.currentAction = 'get'; game.handleClick(250, 280);
        game.textWindow = null;
        const afterPickup = game.collidesBarrier(250, 290);
        game.goToRoom('study', 330, 346);
        game.goToRoom('scullery', 320, 290);
        game.textWindow = null; game.roomTransition = 0;
        game.keysDown = { ArrowLeft: true };
        for (let frame = 0; frame < 24; frame++) game.update(16);
        game.keysDown = {};
        return { reached, afterPickup, afterReturn: game.collidesBarrier(250, 290), x: game.playerX,
            pailLayers: game.foregroundLayers.filter(layer => layer.y === 286).length };
    });
    expect(route.reached).toEqual([true, true, true, true]);
    expect(route.afterPickup).toBe(false);
    expect(route.afterReturn).toBe(false);
    expect(route.x).toBeLessThan(277);
    expect(route.pailLayers).toBe(1);
});

test('nearby furniture remains solid with reachable floor around it', async ({ page }) => {
    await boot(page);
    const rooms = await page.evaluate(() => {
        const game = window.engine;
        return [
            ['study', [[320, 280], [160, 290]], [[490, 330], [210, 350]]],
            ['spell_room', [[120, 310], [510, 295]], [[210, 350], [440, 340]]]
        ].map(([room, blocked, clear]) => {
            game.goToRoom(room, 330, 350);
            return { blocked: blocked.map(([x, y]) => game.collidesBarrier(x, y)),
                clear: clear.map(([x, y]) => game.collidesBarrier(x, y)) };
        });
    });
    for (const room of rooms) {
        expect(room.blocked).toEqual([true, true]);
        expect(room.clear).toEqual([false, false]);
    }
});

test('pail is depth-sorted around the larger painted hero', async ({ page }) => {
    await boot(page);
    await page.waitForFunction(() => {
        const ctx = document.createElement('canvas').getContext('2d');
        return window.drawPaintedItem(ctx, 'pail', 30, 50, 40, 40);
    });
    for (const [name, groundY] of [['behind', 266], ['front', 318]]) {
        const order = await page.evaluate(y => {
            const game = window.engine;
            game.playerX = 250; game.playerY = y;
            game.playerFacing = 'toward'; game.playerWalking = false;
            game.mouseX = 620; game.mouseY = 380;
            const images = [];
            const original = game.ctx.drawImage;
            game.ctx.drawImage = function(image, ...args) {
                if (image.src && /\/(rowan-atlas|pail)-trial\.png$/.test(image.src)) images.push(image.src.split('/').pop());
                return original.call(this, image, ...args);
            };
            try { game.render(); } finally { game.ctx.drawImage = original; }
            return images;
        }, groundY);
        expect(order).toEqual(name === 'behind' ? ['rowan-atlas-trial.png', 'pail-trial.png']
            : ['pail-trial.png', 'rowan-atlas-trial.png']);
        await expect(page.locator('#game-canvas')).toHaveScreenshot(`pail-${name}-rowan.png`);
    }
});