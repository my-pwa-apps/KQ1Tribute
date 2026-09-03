const { test, expect } = require('@playwright/test');

// The game has no bundler, so its module boundaries are enforced by load order
// and a registry rather than by imports. These tests assert the contract holds
// at runtime, which a static check cannot prove.

const ROOM_IDS = [
    'amber_tower', 'cloud_realm', 'crag_path', 'dark_wood', 'dragon_cave',
    'harbour_road', 'scullery', 'spell_room', 'study', 'troll_bridge',
    'village_green', 'well_bottom'
];

test.describe('module architecture', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('every room module registers through the registry', async ({ page }) => {
        const result = await page.evaluate(() => ({
            moduleCount: window.CrownQuest._roomModules.length,
            roomIds: Object.keys(window.engine.rooms).sort()
        }));

        expect(result.moduleCount).toBe(3);
        expect(result.roomIds).toEqual(ROOM_IDS);
    });

    test('the shared art modules are loaded before any room needs them', async ({ page }) => {
        const missing = await page.evaluate(() => [
            // js/art.js
            'ditherRect', 'skyBands', 'starField', 'stoneWall', 'woodPlanks',
            'thatchRoof', 'perspectiveFrame', 'interiorShell', 'flame',
            'wallTorch', 'drawTree', 'drawPine', 'drawBush', 'waterBand',
            'rockFace', 'drawCastle', 'drawWell', 'drawRopeBridge', 'drawSkiff',
            'drawAmberTower', 'drawChestOfCormac', 'drawShieldOfArdor',
            'drawMirrorOfIanthe',
            // js/actors.js
            'drawVgaPerson', 'drawVgaArm', 'drawRaven', 'drawGoat', 'drawTroll',
            'drawSleepingGiant', 'drawDragon', 'drawHare', 'drawGull',
            // js/cutscenes.js
            'drawTitleBackdrop', 'cutsceneOpening', 'cutsceneMorvanePasses',
            'cutsceneSailAway', 'cutsceneMorvaneDuel', 'cutsceneCoronation'
        ].filter((name) => typeof window[name] !== 'function'));

        expect(missing).toEqual([]);
    });

    test('inventory and portrait art cover every item and speaker', async ({ page }) => {
        const gaps = await page.evaluate(() => {
            const e = window.engine;
            return {
                missingItems: Object.keys(e.items).filter((id) => typeof e.itemArt[id] !== 'function'),
                missingPortraits: Object.keys(e.dialogs).filter((id) => typeof e.portraitArt[id] !== 'function')
            };
        });

        expect(gaps.missingItems).toEqual([]);
        expect(gaps.missingPortraits).toEqual([]);
    });

    test('every registered room can be entered and drawn', async ({ page }) => {
        await page.keyboard.press('e');
        const failures = await page.evaluate(() => {
            const e = window.engine;
            const broken = [];
            for (const id of Object.keys(e.rooms)) {
                try {
                    e.goToRoom(id, 320, 330);
                    e.roomTransition = 0;
                    e.render();
                } catch (err) {
                    broken.push(`${id}: ${err.message}`);
                }
            }
            return broken;
        });

        expect(failures).toEqual([]);
    });

    test('every room declares a name, description, hint and scent', async ({ page }) => {
        const incomplete = await page.evaluate(() => {
            const e = window.engine;
            return Object.entries(e.rooms)
                .filter(([, room]) => !room.name || !room.description || !room.hint || !room.smell)
                .map(([id]) => id);
        });

        expect(incomplete).toEqual([]);
    });

    test('every exit leads to a room that exists', async ({ page }) => {
        const dangling = await page.evaluate(() => {
            const e = window.engine;
            const bad = [];
            for (const [id, room] of Object.entries(e.rooms)) {
                for (const hs of room.hotspots || []) {
                    if (!hs.isExit) continue;
                    if (typeof hs.onExit !== 'function') bad.push(`${id}/${hs.name}: no onExit`);
                }
            }
            return bad;
        });

        expect(dangling).toEqual([]);
    });

    test('destroy() detaches listeners and stops the render loop', async ({ page }) => {
        const result = await page.evaluate(async () => {
            const e = window.engine;
            const attached = e._listeners.length;
            e.destroy();
            const before = e.animTimer;
            await new Promise((resolve) => setTimeout(resolve, 250));
            return {
                attached,
                remaining: e._listeners.length,
                loopRunning: e._loopRunning,
                advanced: e.animTimer !== before,
                globalCleared: window.engine === undefined
            };
        });

        expect(result.attached).toBeGreaterThan(10);
        expect(result.remaining).toBe(0);
        expect(result.loopRunning).toBe(false);
        expect(result.advanced).toBe(false);
        expect(result.globalCleared).toBe(true);
    });
});
