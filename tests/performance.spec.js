const { test, expect } = require('@playwright/test');

// The whole game is procedural drawing, so a room's cost is whatever its draw
// function happens to do. Without a budget, an expensive texture added to one
// scene silently drops the frame rate on weaker machines and nobody notices
// until it ships.
//
// The printed table is the useful output; the assertion only catches an
// order-of-magnitude regression. The ceiling is deliberately far above the
// frame budget because this spec shares a machine with other Playwright
// workers, and contention alone can triple a timing. A tight assertion here
// would be flaky, and a flaky perf test gets deleted rather than fixed.
const FRAME_BUDGET_MS = 16;      // one frame at 60fps - the number to aim at
const HARD_CEILING_MS = 60;      // no single room may ever exceed this

test.describe('render performance', () => {
    test.slow();

    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'timings are only meaningful on one profile');
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.keyboard.press('e');
        await page.evaluate(() => {
            const e = window.engine;
            if (e.cutscene) e.skipCutscene();
            e.setTextSpeed('instant', false);
        });
        await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
    });

    test('every room renders within the frame budget', async ({ page }) => {
        const timings = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = {};
            for (const id of Object.keys(e.rooms)) {
                e.goToRoom(id, 320, 336);
                e.roomTransition = 0;
                e.textWindow = null;
                e.render(); // warm caches so the first frame is not measured
                const t0 = performance.now();
                for (let i = 0; i < 20; i++) { e.animTimer += 16; e.render(); }
                out[id] = (performance.now() - t0) / 20;
            }
            return out;
        });

        const slow = Object.entries(timings)
            .filter(([, ms]) => ms > HARD_CEILING_MS)
            .map(([id, ms]) => `${id} ${ms.toFixed(1)}ms`);
        expect(slow, `rooms over ${HARD_CEILING_MS}ms/frame`).toEqual([]);

        // Print the whole table so a slow-but-passing room is still visible.
        const table = Object.entries(timings).sort((a, b) => b[1] - a[1]);
        console.log(`frame cost per room (budget ${FRAME_BUDGET_MS}ms):`);
        for (const [id, ms] of table) {
            console.log(`  ${ms > FRAME_BUDGET_MS ? '!' : ' '} ${id.padEnd(16)} ${ms.toFixed(1)}ms`);
        }
    });

    test('the light pool and vignette caches stay bounded while animating', async ({ page }) => {
        // Both take animated radius/alpha from room code. Keying the cache on
        // those raw floats leaked one CanvasGradient per frame, for ever.
        const sizes = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            e.goToRoom('spell_room', 320, 344);
            e.roomTransition = 0;
            e.textWindow = null;
            for (let i = 0; i < 240; i++) { e.animTimer += 16; e.render(); }
            return { light: e._lightPoolCache.size, vignette: e._vignetteCache.size };
        });
        expect(sizes.light).toBeLessThan(24);
        expect(sizes.vignette).toBeLessThan(8);
    });
});
