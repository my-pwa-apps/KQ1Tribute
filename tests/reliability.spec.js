const { test, expect } = require('@playwright/test');

async function startGame(page) {
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
}

test.describe('reliability', () => {
    test.beforeEach(async ({ page }) => {
        await startGame(page);
    });

    test('a throwing room draw stops the loop and tells the player', async ({ page }) => {
        // Before the crash handler existed, requestAnimationFrame was only
        // re-armed after a successful frame, so any exception froze the game on
        // a stale canvas with no message and no hint that saves were safe.
        const result = await page.evaluate(async () => {
            const e = window.engine;
            const room = e.rooms[e.currentRoomId];
            const original = room.draw;
            room.draw = () => { throw new Error('deliberate test failure'); };
            await new Promise((resolve) => setTimeout(resolve, 120));
            const state = {
                looping: e._loopRunning,
                message: e.lastError ? e.lastError.message : null
            };
            room.draw = original;
            return state;
        });
        expect(result.looping).toBe(false);
        expect(result.message).toContain('deliberate test failure');

        // The player is told what happened, in the live region as well as on canvas.
        await expect(page.locator('[role="status"]')).toContainText(/breaks off|saved games/i);
    });

    test('a throwing hotspot handler does not swallow the click', async ({ page }) => {
        // Hotspot handlers run inside DOM event listeners, where an exception is
        // reported to the console and then discarded - the player just sees a
        // dead click with no explanation.
        const shown = await page.evaluate(() => {
            const e = window.engine;
            const hotspot = { name: 'test object', look: () => { throw new Error('bad content'); } };
            e.currentAction = 'look';
            e.performAction(hotspot);
            return e.message;
        });
        expect(shown).toMatch(/refuses to cooperate/i);

        // The engine is still alive and interactive afterwards.
        const alive = await page.evaluate(() => window.engine._loopRunning);
        expect(alive).toBe(true);
    });

    test('save still works when localStorage is full', async ({ page }) => {
        const outcome = await page.evaluate(() => {
            const e = window.engine;
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
            let threw = false;
            try {
                e.saveGame(1);
            } catch {
                threw = true;
            }
            Storage.prototype.setItem = original;
            // Read e.message, not the text window: a save failure reports
            // through the message bar and leaves any open window alone.
            return {
                threw,
                message: e.message,
                titleScreen: e.titleScreen, dead: e.dead, won: e.won
            };
        });
        expect(outcome.threw).toBe(false);
        expect({ titleScreen: outcome.titleScreen, dead: outcome.dead, won: outcome.won })
            .toEqual({ titleScreen: false, dead: false, won: false });
        expect(outcome.message).toMatch(/could not|unable|failed|not be saved|save failed/i);
    });
});
