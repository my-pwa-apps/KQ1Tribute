const { test, expect } = require('@playwright/test');

async function tapCanvas(page, x, y) {
    const canvas = page.locator('#game-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    await page.touchscreen.tap(bounds.x + x * bounds.width / 640, bounds.y + y * bounds.height / 400);
}

async function dismiss(page) {
    for (let count = 0; count < 12; count++) {
        if (!await page.evaluate(() => !!window.engine.textWindow)) return;
        await tapCanvas(page, 630, 395);
    }
    expect(await page.evaluate(() => !!window.engine.textWindow)).toBe(false);
}

async function start(page, mode) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const button = await page.evaluate(selected => window.engine.getTitleButtonRect(selected), mode);
    await tapCanvas(page, button.x + button.w / 2, button.y + button.h / 2);
    await tapCanvas(page, 320, 200);
    await page.evaluate(() => {
        window.engine._loopRunning = false;
        window.engine.setTextSpeed('instant', false);
    });
    await dismiss(page);
    expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('scullery');
}

async function advance(page, frames = 300) {
    await page.evaluate(count => {
        for (let frame = 0; frame < count && !window.engine.textWindow; frame++) window.engine.update(1000 / 60);
    }, frames);
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Requires the touch-enabled mobile profile');
});

for (const viewport of [{ width: 393, height: 851 }, { width: 851, height: 393 }]) {
    test(`touch-only pickup, walking and restore at ${viewport.width}x${viewport.height}`, async ({ page, context }, testInfo) => {
        await page.setViewportSize(viewport);
        await start(page, 'enhanced');
        await page.getByRole('button', { name: 'Get', exact: true }).tap();
        const pail = await page.evaluate(() => {
            const hotspot = window.engine.rooms.scullery.hotspots.find(entry => entry.name === 'the pail');
            return { x: hotspot.x + hotspot.w / 2, y: hotspot.y + hotspot.h / 2 };
        });
        await tapCanvas(page, pail.x, pail.y);
        expect(await page.evaluate(() => window.engine.hasItem('pail'))).toBe(true);
        await dismiss(page);
        await page.getByRole('button', { name: 'Wooden Pail', exact: true }).tap();
        expect(await page.evaluate(() => window.engine.selectedItem)).toBe('pail');
        await page.getByRole('button', { name: 'Walk', exact: true }).tap();
        await dismiss(page);
        const right = page.locator('#dpad-right');
        await right.scrollIntoViewIfNeeded();
        const bounds = await right.boundingBox();
        const session = await context.newCDPSession(page);
        const before = await page.evaluate(() => window.engine.playerX);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
        await advance(page, 20);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        const after = await page.evaluate(() => window.engine.playerX);
        expect(after).toBeGreaterThan(before + 10);
        await advance(page, 10);
        expect(await page.evaluate(() => window.engine.playerX)).toBe(after);
        const stair = await page.evaluate(() => {
            const hotspot = window.engine.rooms.scullery.hotspots.find(entry => entry.name === 'the stair up');
            return { x: hotspot.x + hotspot.w / 2, y: hotspot.y + hotspot.h / 2 };
        });
        await tapCanvas(page, stair.x, stair.y);
        await advance(page);
        expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('study');
        await dismiss(page);
        if (!await page.locator('#btn-save').isVisible()) await page.locator('#btn-tools').tap();
        await page.locator('#btn-save').tap();
        await page.locator('.slot-row').first().getByRole('button', { name: 'Save', exact: true }).tap();
        await page.locator('#btn-load').tap();
        await page.locator('.slot-row').first().getByRole('button', { name: 'Load', exact: true }).tap();
        expect(await page.evaluate(() => ({ room: window.engine.currentRoomId, pail: window.engine.hasItem('pail') })))
            .toEqual({ room: 'study', pail: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.locator('#dpad-right')).toBeVisible();
        const clipped = await page.evaluate(() => {
            const container = document.getElementById('game-container').getBoundingClientRect();
            return [...document.querySelectorAll('#save-load-bar button, #dpad button')].filter(button => {
                const bounds = button.getBoundingClientRect();
                return bounds.width && (bounds.left < container.left || bounds.right > container.right);
            }).map(button => button.id);
        });
        expect(clipped).toEqual([]);
        await dismiss(page);
        await page.evaluate(() => { window.engine.roomTransition = 0; window.engine.render(); });
        await page.locator('#game-canvas').scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath('touch-scene.png') });
        await right.scrollIntoViewIfNeeded();
        await expect(right).toBeInViewport();
        await page.screenshot({ path: testInfo.outputPath('touch-controls.png') });
        await session.detach();
    });
}

test('classic touch parser submits text without a hardware keyboard', async ({ page, context }, testInfo) => {
    await start(page, 'classic');
    const session = await context.newCDPSession(page);
    for (const command of ['get black bread', 'get pail', 'walk stair up']) {
        await page.locator('#touch-parser-input').tap();
        await session.send('Input.insertText', { text: command });
        await page.getByRole('button', { name: 'Send', exact: true }).tap();
        await advance(page);
        await dismiss(page);
    }
    expect(await page.evaluate(() => ({ room: window.engine.currentRoomId, bread: window.engine.hasItem('bread'), pail: window.engine.hasItem('pail') })))
        .toEqual({ room: 'study', bread: true, pail: true });
    await page.evaluate(() => { window.engine.roomTransition = 0; window.engine.render(); });
    await page.screenshot({ path: testInfo.outputPath('touch-parser-layout.png'), fullPage: true });
    await page.locator('#btn-enhanced').tap();
    expect(await page.evaluate(() => window.engine.classicMode)).toBe(false);
    await session.detach();
});