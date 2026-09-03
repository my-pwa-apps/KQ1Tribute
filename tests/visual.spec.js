const { test, expect } = require('@playwright/test');

// Visual baselines. These exist to make art changes reviewable: a pure refactor
// must produce byte-identical PNGs, and a deliberate art change must be looked
// at before its snapshot is accepted.

/** Stop the render loop before touching any state. Changing rooms while rAF is
 *  still running lets a stray frame advance the timer or nudge the ego, which
 *  shows up as an intermittent one-pixel snapshot diff. */
async function halt(page) {
    await page.evaluate(() => { window.engine._loopRunning = false; });
}

/** Freeze everything time-dependent so a screenshot is deterministic. */
async function freeze(page) {
    await page.evaluate(() => {
        const e = window.engine;
        e._loopRunning = false;
        e.animTimer = 4000;
        e.roomTransition = 0;
        e.idleActive = false;
        e.idleElapsed = 0;
        e.playerWalking = false;
        e.playerTargetX = null;
        e.playerTargetY = null;
        e.playerFrame = 0;
        e.playerFrameTimer = 0;
        e.textWindow = null;
        e.sequence = null;
        e.cutscene = null;
    });
}

async function shot(page, name) {
    await freeze(page);
    await page.evaluate(() => window.engine.render());
    await expect(page.locator('#game-canvas')).toHaveScreenshot(`${name}.png`, { maxDiffPixels: 60 });
}

/** Enter a room with an optional list of flags pre-set, so a baseline can
 *  capture a mid-game state without playing the whole game to reach it. */
async function enterRoom(page, roomId, x = 320, y = 336, flags) {
    await halt(page);
    await page.evaluate(({ roomId: id, x: px, y: py, flags: f }) => {
        const e = window.engine;
        for (const [name, value] of f || []) e.setFlag(name, value);
        e.goToRoom(id, px, py);
        e.playerFacing = 'toward';
    }, { roomId, x, y, flags: flags || [] });
    await freeze(page);
    await page.evaluate(() => window.engine.render());
}

test.describe('visual baselines', () => {
    // The stage is a fixed 640x400 canvas, so a second device profile would
    // record byte-identical images at a different scale. One project is enough.
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'baselines are recorded on chromium only');
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        // The bundled pixel font loads with font-display: swap, so a shot taken
        // before it arrives is rendered in the fallback face and differs.
        await page.evaluate(() => document.fonts.ready);
    });

    test('title screen', async ({ page }) => {
        await shot(page, 'title');
    });

    test.describe('rooms', () => {
        test.beforeEach(async ({ page }) => {
            await page.keyboard.press('e');
            await page.evaluate(() => {
                const e = window.engine;
                if (e.cutscene) e.skipCutscene();
                e.setTextSpeed('instant', false);
            });
            await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
        });

        test('scullery', async ({ page }) => {
            await enterRoom(page, 'scullery', 300, 336);
            await shot(page, 'scullery');
        });

        test('study', async ({ page }) => {
            await enterRoom(page, 'study', 300, 336);
            await shot(page, 'study');
        });

        test('study with the stair revealed', async ({ page }) => {
            await enterRoom(page, 'study', 300, 336, [['stair_revealed', true], ['found_key', true]]);
            await shot(page, 'study-stair-revealed');
        });

        test('spell room', async ({ page }) => {
            await enterRoom(page, 'spell_room', 320, 344, [['chest_open', true], ['read_spell', true]]);
            await shot(page, 'spell-room');
        });

        test('spell room with the circle laid', async ({ page }) => {
            await enterRoom(page, 'spell_room', 320, 356,
                [['chest_open', true], ['read_spell', true], ['circle_feather', true], ['circle_salt', true]]);
            await shot(page, 'spell-room-circle-laid');
        });

        test('crag path', async ({ page }) => {
            await enterRoom(page, 'crag_path', 160, 336, [['morvane_passed', true]]);
            await shot(page, 'crag-path');
        });

        test('harbour road', async ({ page }) => {
            await enterRoom(page, 'harbour_road', 300, 340);
            await shot(page, 'harbour-road');
        });

        test('village green', async ({ page }) => {
            await enterRoom(page, 'village_green', 220, 350);
            await shot(page, 'village-green');
        });

        test('village green with the goat following', async ({ page }) => {
            await enterRoom(page, 'village_green', 300, 350,
                [['goat_follows', true], ['rope_tied', true]]);
            await shot(page, 'village-green-goat');
        });

        test('bottom of the well', async ({ page }) => {
            await enterRoom(page, 'well_bottom', 300, 340);
            await shot(page, 'well-bottom');
        });

        test('dark wood', async ({ page }) => {
            await enterRoom(page, 'dark_wood', 300, 350);
            await shot(page, 'dark-wood');
        });

        test('dark wood after the hare is freed', async ({ page }) => {
            await enterRoom(page, 'dark_wood', 300, 350, [['hare_freed', true]]);
            await shot(page, 'dark-wood-fennow');
        });

        test('troll bridge', async ({ page }) => {
            await enterRoom(page, 'troll_bridge', 150, 340);
            await shot(page, 'troll-bridge');
        });

        test('troll bridge after the goat', async ({ page }) => {
            await enterRoom(page, 'troll_bridge', 150, 340, [['troll_routed', true]]);
            await page.evaluate(() => { const e = window.engine; e.sequence = null; });
            await shot(page, 'troll-bridge-routed');
        });

        test('cloud realm', async ({ page }) => {
            await enterRoom(page, 'cloud_realm', 110, 344);
            await shot(page, 'cloud-realm');
        });

        test('dragon cave', async ({ page }) => {
            await enterRoom(page, 'dragon_cave', 520, 344);
            await shot(page, 'dragon-cave');
        });

        test('dragon cave after the fire is out', async ({ page }) => {
            await enterRoom(page, 'dragon_cave', 420, 344, [['dragon_doused', true]]);
            await shot(page, 'dragon-cave-doused');
        });

        test('amber tower', async ({ page }) => {
            await enterRoom(page, 'amber_tower', 200, 344);
            await shot(page, 'amber-tower');
        });

        test('amber tower with all three sockets lit', async ({ page }) => {
            await enterRoom(page, 'amber_tower', 200, 344,
                [['sockets_lit', 3], ['door_opened', true]]);
            await page.evaluate(() => { const e = window.engine; e.sequence = null; e.cutscene = null; });
            await shot(page, 'amber-tower-open');
        });
    });

    test.describe('overlays and set pieces', () => {
        test.beforeEach(async ({ page }) => {
            await page.keyboard.press('e');
            await page.evaluate(() => {
                const e = window.engine;
                if (e.cutscene) e.skipCutscene();
                e.setTextSpeed('instant', false);
            });
            await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
        });

        test('text window with a portrait', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e.goToRoom('study', 300, 336);
                e.animTimer = 4000;
                e.textRevealEnabled = false;
                e.showTextWindow('"Boy," says the raven. You sit down rather suddenly.', { portrait: 'corvus' });
            });
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.animTimer = 4000;
                e.roomTransition = 0;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('portrait-window.png', { maxDiffPixels: 60 });
        });

        test('inventory close-up', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e.textRevealEnabled = false;
                e.addToInventory('mirror_of_ianthe');
                e.showItemCloseUp(e.items['mirror_of_ianthe']);
            });
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.animTimer = 4000;
                e.roomTransition = 0;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('item-closeup.png', { maxDiffPixels: 60 });
        });

        test('death overlay', async ({ page }) => {
            await page.evaluate(() => window.engine.die('A brief noise like a forge door, and then no more Rowan at all.'));
            await shot(page, 'death-overlay');
        });

        test('victory overlay', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e.score = 250;
                e.victory('Alderhaven is whole again.');
            });
            await shot(page, 'victory-overlay');
        });

        test('opening cutscene', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.playCutscene({ duration: 21000, draw: (c, w, h, p, el) => window.cutsceneOpening(c, w, h, p, el) });
                e.cutscene.elapsed = 3000;
                e.animTimer = 4000;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('cutscene-opening.png', { maxDiffPixels: 60 });
        });

        test('the duel at the tower', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.playCutscene({ duration: 15000, draw: (c, w, h, p, el) => window.cutsceneMorvaneDuel(c, w, h, p, el) });
                e.cutscene.elapsed = 4800;
                e.animTimer = 4000;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('cutscene-duel.png', { maxDiffPixels: 60 });
        });

        test('the coronation', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.playCutscene({ duration: 12000, draw: (c, w, h, p, el) => window.cutsceneCoronation(c, w, h, p, el) });
                e.cutscene.elapsed = 9000;
                e.animTimer = 4000;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('cutscene-coronation.png', { maxDiffPixels: 60 });
        });
    });
});
