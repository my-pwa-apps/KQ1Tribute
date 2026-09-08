const { test, expect } = require('@playwright/test');

async function boot(page) {
    await page.goto('/?scenery=painted&actors=painted');
    const loaded = await page.evaluate(() => window.engine.game.drawPlayerSprite.ready);
    await page.keyboard.press('e');
    await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.setTextSpeed('instant', false);
        game.textWindow = null;
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.idleActive = false;
        game.playerX = 340;
        game.playerY = 330;
        game.playerFacing = 'toward';
        game.playerWalking = false;
        game.playerFrame = 0;
    });
    await page.waitForFunction(() => window.engine.minimumWalkY === 237);
    return loaded;
}

test('painted hero renders at game scale on desktop and mobile', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    expect(await boot(page)).toBe(true);
    await page.evaluate(() => window.engine.render());
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-hero-scullery.png');
    const metrics = await page.evaluate(() => {
        const game = window.engine;
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const frames = [];
        for (const [facing, direction, walking, count] of [
            ['toward', 1, false, 1], ['right', 1, false, 1],
            ['away', 1, false, 1], ['left', -1, false, 1],
            ['right', 1, true, 8], ['left', -1, true, 8],
            ['toward', 1, true, 8], ['away', 1, true, 8]
        ]) {
            for (let frame = 0; frame < count; frame++) {
                game.playerFacing = facing;
                game.playerDir = direction;
                game.playerWalking = walking;
                game.playerFrame = Math.floor(frame * 6 / 8);
                game.playerFrameTimer = (frame * 6 / 8 % 1) * 110;
                ctx.clearRect(0, 0, 640, 400);
                const drawn = game.game.drawPlayerSprite(ctx, game);
                const pixels = ctx.getImageData(0, 0, 640, 400).data;
                let minX = 640, minY = 400, maxX = -1, maxY = -1, opaque = 0;
                let hash = 2166136261;
                for (let offset = 0; offset < pixels.length; offset += 4) {
                    if (pixels[offset + 3] <= 128) continue;
                    const x = (offset / 4) % 640;
                    const y = Math.floor(offset / 4 / 640);
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    opaque++;
                    hash = Math.imul(hash ^ offset ^ pixels[offset], 16777619);
                }
                frames.push({ drawn, minX, minY, maxX, maxY, opaque, hash,
                    expectedHeight: 37.8 * game.playerSpriteScale(game.playerY) * 1.5 });
            }
        }
        return frames;
    });
    for (const frame of metrics) {
        expect(frame.drawn).toBe(true);
        expect(frame.opaque).toBeGreaterThan(500);
        expect(frame.opaque).toBeLessThan(6000);
        expect(Math.abs(frame.maxY - frame.minY + 1 - frame.expectedHeight)).toBeLessThan(4);
        expect(Math.abs(frame.maxY - metrics[0].maxY)).toBeLessThanOrEqual(2);
        expect(frame.minX).toBeGreaterThan(290);
        expect(frame.maxX).toBeLessThan(390);
    }
    for (let offset = 4; offset < metrics.length; offset += 8) {
        expect(new Set(metrics.slice(offset, offset + 8).map(frame => frame.hash)).size).toBe(8);
    }
    await page.evaluate(() => {
        const game = window.engine;
        const canvas = document.createElement('canvas');
        canvas.id = 'sprite-proof';
        canvas.width = 800;
        canvas.height = 800;
        canvas.style.width = '100%';
        canvas.style.maxWidth = '800px';
        canvas.style.height = 'auto';
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#727b80';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < 5; row++) {
            for (let frame = 0; frame < (row === 0 ? 4 : 8); frame++) {
                game.playerFacing = row === 0 ? ['toward', 'right', 'away', 'left'][frame]
                    : ['right', 'left', 'toward', 'away'][row - 1];
                game.playerDir = row === 2 || (row === 0 && frame === 3) ? -1 : 1;
                game.playerWalking = row !== 0;
                game.playerFrame = Math.floor(frame * 6 / 8);
                game.playerFrameTimer = (frame * 6 / 8 % 1) * 110;
                ctx.save();
                ctx.translate(50 + frame * 100 - game.playerX,
                    150 + row * 160 - game.playerY - 12 * game.playerSpriteScale(game.playerY));
                game.game.drawPlayerSprite(ctx, game);
                ctx.restore();
            }
        }
        document.body.append(canvas);
    });
    await expect(page.locator('#sprite-proof')).toHaveScreenshot('painted-hero-directions.png');
    expect(errors).toEqual([]);
});

test('movement animates side views and stops in the matching idle pose', async ({ page }) => {
    expect(await boot(page)).toBe(true);
    for (const [key, direction] of [['ArrowRight', 1], ['ArrowLeft', -1]]) {
        const before = await page.evaluate(() => window.engine.playerX);
        await page.keyboard.down(key);
        const walking = await page.evaluate(() => {
            const game = window.engine;
            const frames = [];
            for (let tick = 0; tick < 12; tick++) {
                game.update(60);
                frames.push(game.playerFrame);
            }
            game.render();
            return { x: game.playerX, facing: game.playerFacing, direction: game.playerDir,
                walking: game.playerWalking, frames };
        });
        expect((walking.x - before) * direction).toBeGreaterThan(30);
        expect(walking).toMatchObject({ facing: direction > 0 ? 'right' : 'left', direction, walking: true });
        expect(new Set(walking.frames).size).toBeGreaterThanOrEqual(4);
        await page.keyboard.up(key);
        const idle = await page.evaluate(() => {
            window.engine.update(16);
            return { walking: window.engine.playerWalking, direction: window.engine.playerDir };
        });
        expect(idle).toEqual({ walking: false, direction });
    }
    await page.evaluate(() => {
        const game = window.engine;
        game.currentAction = 'get';
        game.handleClick(250, 280);
    });
    expect(await page.evaluate(() => window.engine.hasItem('pail'))).toBe(true);
});

test('painted scenery selects drawn Rowan unless explicitly overridden', async ({ page }) => {
    for (const url of ['/?scenery=painted', '/?actors=painted']) {
        await page.goto(url);
        expect(await page.evaluate(async () => {
            const game = window.engine;
            if (!game.game.drawPlayerSprite) return false;
            await game.game.drawPlayerSprite.ready;
            return game.game.drawPlayerSprite(game.ctx, game);
        })).toBe(true);
    }
    for (const url of ['/', '/?scenery=painted&actors=procedural']) {
        await page.goto(url);
        expect(await page.evaluate(() => window.engine.game.drawPlayerSprite)).toBeNull();
    }
});

test('failed sprite load retains the procedural hero', async ({ page }) => {
    await page.route('**/icons/rowan-atlas-trial.png', route => route.abort());
    expect(await boot(page)).toBe(false);
    expect(await page.evaluate(() => window.engine.game.drawPlayerSprite(window.engine.ctx, window.engine))).toBe(false);
    await page.evaluate(() => window.engine.render());
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-hero-fallback.png');
});

test('front and back walks animate from real movement input', async ({ page }) => {
    expect(await boot(page)).toBe(true);
    for (const [key, facing, sign, startY] of [
        ['ArrowUp', 'away', -1, 350], ['ArrowDown', 'toward', 1, 245]
    ]) {
        await page.evaluate(y => {
            const game = window.engine;
            game.playerX = 340;
            game.playerY = y;
            game.playerFrame = 0;
            game.playerFrameTimer = 0;
            game.textWindow = null;
        }, startY);
        await page.keyboard.down(key);
        const result = await page.evaluate(() => {
            const game = window.engine;
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            const poses = new Set();
            for (let tick = 0; tick < 45; tick++) {
                game.update(16);
                const currentY = game.playerY;
                game.playerY = 330;
                ctx.clearRect(0, 0, 640, 400);
                game.game.drawPlayerSprite(ctx, game);
                poses.add(canvas.toDataURL());
                game.playerY = currentY;
            }
            game.render();
            return { y: game.playerY, facing: game.playerFacing, walking: game.playerWalking, poses: poses.size };
        });
        await page.keyboard.up(key);
        expect(result).toMatchObject({ facing, walking: true });
        expect((result.y - startY) * sign).toBeGreaterThan(30);
        expect(result.poses).toBeGreaterThanOrEqual(6);
    }
});