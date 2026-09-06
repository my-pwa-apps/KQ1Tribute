const { test, expect } = require('@playwright/test');

/* global CAST_HATTIE, CAST_FENNOW, CAST_GNOME, CAST_ELOWEN, CAST_VILLAGER, CAST_MORVANE */

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

        test('Morvane arriving on the crag', async ({ page }) => {
            await enterRoom(page, 'crag_path', 160, 336, [['crag_nudged', true]]);
            await page.evaluate(() => window.engine.setFlag('crag_timer', 9001));
            await shot(page, 'crag-morvane-arrives');
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

        test('Fennow remains after the ring gift and parchment pickup', async ({ page }) => {
            await halt(page);
            await page.evaluate(() => window.engine.addToInventory('parchment'));
            await enterRoom(page, 'dark_wood', 300, 350, [['hare_freed', true], ['has_ring', true]]);
            await shot(page, 'dark-wood-after-gifts');
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

        test('troll bridge mid-crossing', async ({ page }) => {
            await enterRoom(page, 'troll_bridge', 327, 276, [['troll_routed', true]]);
            await shot(page, 'troll-bridge-crossing');
        });

        test('troll bridge far bank', async ({ page }) => {
            await enterRoom(page, 'troll_bridge', 420, 196, [['troll_routed', true]]);
            await shot(page, 'troll-bridge-far-bank');
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

        test('Elowen reunited outside the tower', async ({ page }) => {
            await enterRoom(page, 'amber_tower', 400, 344,
                [['sockets_lit', 3], ['door_opened', true], ['elowen_freed', true]]);
            await page.evaluate(() => {
                const game = window.engine;
                game.showTextWindow('"I am Elowen. Your mother." She holds you. For a while there is no kingdom, no sorcerer, and nothing you have to do.');
                game.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('elowen-reunion.png', { maxDiffPixels: 60 });
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

        test('walking cast faces and portraits', async ({ page }) => {
            await halt(page);
            await page.evaluate(() => {
                const game = window.engine;
                const ctx = game.ctx;
                const cast = [
                    ['hattie', CAST_HATTIE], ['fennow', CAST_FENNOW], ['gnome', CAST_GNOME],
                    ['elowen', CAST_ELOWEN], ['villager', CAST_VILLAGER], ['morvane', CAST_MORVANE]
                ];
                ctx.fillStyle = '#34383a';
                ctx.fillRect(0, 0, game.WIDTH, game.HEIGHT);
                cast.forEach(([, palette], index) => {
                    const center = 53 + index * 106;
                    window.drawVgaPerson(ctx, center, 135, 2.6, { ...palette, animTimer: 4000 });
                    window.drawVgaPerson(ctx, center, 255, 2.6, { ...palette, animTimer: 5201 });
                });
                game.applyClassicSceneRaster(ctx);
                ctx.font = '12px "Courier New"';
                cast.forEach(([id], index) => {
                    const center = 53 + index * 106;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(id, center - 28, 20);
                    game.portraitArt[id](ctx, center, 330, { blinking: false, mouthOpen: false });
                });
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('cast-faces.png', { maxDiffPixels: 0 });
        });

        test('every inventory icon including both pail states', async ({ page }) => {
            await halt(page);
            const count = await page.evaluate(() => {
                const game = window.engine;
                const ctx = game.ctx;
                const items = [...Object.keys(game.items), 'pail_full'];
                ctx.fillStyle = '#34383a';
                ctx.fillRect(0, 0, 640, 400);
                ctx.font = '12px "Courier New"';
                items.forEach((id, index) => {
                    const centerX = 64 + (index % 5) * 128;
                    const centerY = 60 + Math.floor(index / 5) * 126;
                    game.setFlag('pail_full', id === 'pail_full');
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(centerX - 28, centerY - 28, 56, 56);
                    ctx.clip();
                    game.itemArt[id === 'pail_full' ? 'pail' : id](ctx, centerX, centerY, 4000);
                    ctx.restore();
                    ctx.fillStyle = '#ffffff';
                    const words = id.replaceAll('_', ' ').split(' ');
                    words.forEach((word, line) => ctx.fillText(word, centerX - 52, centerY + 43 + line * 13));
                });
                return items.length;
            });
            expect(count).toBe(14);
            await expect(page.locator('#game-canvas')).toHaveScreenshot('all-inventory-icons.png', { maxDiffPixels: 0 });
        });

        test('every portrait in neutral and speaking states', async ({ page }) => {
            await halt(page);
            const count = await page.evaluate(() => {
                const game = window.engine;
                const ctx = game.ctx;
                ctx.fillStyle = '#34383a';
                ctx.fillRect(0, 0, 640, 400);
                ctx.font = '12px "Courier New"';
                Object.entries(game.portraitArt).forEach(([id, paint], index) => {
                    const cellX = (index % 5) * 128;
                    const cellY = Math.floor(index / 5) * 190;
                    [false, true].forEach((speaking, phase) => {
                        const centerX = cellX + 32 + phase * 62;
                        const centerY = cellY + 80;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(centerX - 28, centerY - 28, 56, 56);
                        ctx.clip();
                        paint(ctx, centerX, centerY, { blinking: speaking, mouthOpen: speaking, t: speaking ? 5201 : 4000 });
                        ctx.restore();
                    });
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(id, cellX + 12, cellY + 132);
                });
                return Object.keys(game.portraitArt).length;
            });
            expect(count).toBe(9);
            await expect(page.locator('#game-canvas')).toHaveScreenshot('all-portraits.png', { maxDiffPixels: 0 });
        });

        for (const [phase, elapsed] of [['charge', 800], ['fall', 1500], ['splash', 2350]]) {
            test(`goat encounter ${phase}`, async ({ page }) => {
                await halt(page);
                const state = await page.evaluate(time => {
                    const game = window.engine;
                    game.animTimer = 4000;
                    game.idleActive = false;
                    game.idleElapsed = 0;
                    game.playerFrame = 0;
                    game.playerFrameTimer = 0;
                    game.setFlag('goat_follows');
                    game.goToRoom('troll_bridge', 80, 354);
                    for (let frame = 0; frame < 200 && !game.bridgeEncounter; frame++) {
                        if (game.textWindow) game.dismissTextWindow();
                        game.update(1000 / 60);
                    }
                    if (!game.bridgeEncounter) throw new Error('Encounter animation never started');
                    game.animTimer = game.bridgeEncounter.startedAt + time;
                    game.textWindow = null;
                    game.roomTransition = 0;
                    game.render();
                    return { routed: game.getFlag('troll_routed'), busy: !!game.sequence };
                }, elapsed);
                expect(state).toEqual({ routed: false, busy: true });
                await expect(page.locator('#game-canvas')).toHaveScreenshot(`goat-${phase}.png`, { maxDiffPixels: 0 });
            });
        }

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

        test('text window with a human portrait', async ({ page }) => {
            await page.evaluate(() => {
                const e = window.engine;
                e.goToRoom('village_green', 300, 336);
                e.animTimer = 4000;
                e.textRevealEnabled = false;
                e.showTextWindow('Hattie lowers her voice and glances toward the western road.', { portrait: 'hattie' });
            });
            await page.evaluate(() => {
                const e = window.engine;
                e._loopRunning = false;
                e.animTimer = 4000;
                e.roomTransition = 0;
                e.render();
            });
            await expect(page.locator('#game-canvas')).toHaveScreenshot('human-portrait-window.png', { maxDiffPixels: 60 });
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

        for (const [stroke, elapsed] of [
            ['push', (6 * Math.PI + Math.PI / 2) * 280],
            ['pull', (6 * Math.PI + 3 * Math.PI / 2) * 280]
        ]) {
            test(`opening scrubbing ${stroke}`, async ({ page }) => {
                await page.evaluate((time) => {
                    const game = window.engine;
                    game._loopRunning = false;
                    game.playCutscene({ duration: 21000,
                        draw: (ctx, width, height, progress, elapsedTime) => window.cutsceneOpening(ctx, width, height, progress, elapsedTime) });
                    game.cutscene.elapsed = time;
                    game.render();
                }, elapsed);
                await expect(page.locator('#game-canvas')).toHaveScreenshot(`cutscene-scrub-${stroke}.png`, { maxDiffPixels: 60 });
            });
        }

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
