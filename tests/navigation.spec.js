const { test, expect } = require('@playwright/test');

async function boot(page, mode) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press(mode === 'keyboard' ? 'c' : 'e');
    await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.setTextSpeed('instant', false);
        game.textWindow = null;
    });
}

async function dismiss(page) {
    for (let count = 0; count < 10; count++) {
        if (!await page.evaluate(() => !!window.engine.textWindow)) return;
        await page.keyboard.press('Enter');
    }
    expect(await page.evaluate(() => !!window.engine.textWindow)).toBe(false);
}

async function clickScene(page, x, y) {
    const canvas = page.locator('#game-canvas');
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: x * bounds.width / 640, y: y * bounds.height / 400 } });
}

async function useObject(page, mode, name) {
    await dismiss(page);
    if (mode === 'keyboard') {
        await page.keyboard.type(`use ${name}`);
        await page.keyboard.press('Enter');
    } else {
        await page.getByRole('button', { name: 'Use', exact: true }).click();
        const point = await page.evaluate((label) => {
            const game = window.engine;
            const hotspot = game.rooms[game.currentRoomId].hotspots.find(entry => entry.name === label);
            return [hotspot.x + hotspot.w / 2, hotspot.y + hotspot.h / 2];
        }, name);
        await clickScene(page, ...point);
    }
}

async function advance(page, destination) {
    return page.evaluate((targetRoom) => {
        const game = window.engine;
        for (let frame = 0; frame < 500 && game.currentRoomId !== targetRoom; frame++) {
            game.update(1000 / 60);
        }
        return { room: game.currentRoomId, x: game.playerX, y: game.playerY, dead: game.dead };
    }, destination);
}

async function walkAxis(page, axis, target) {
    const start = await page.evaluate((coordinate) => window.engine[coordinate], axis);
    if (Math.abs(start - target) < 2) return;
    const positive = target > start;
    const key = axis === 'playerX' ? (positive ? 'ArrowRight' : 'ArrowLeft') : (positive ? 'ArrowDown' : 'ArrowUp');
    await page.keyboard.down(key);
    const result = await page.evaluate(({ coordinate, goal, increasing }) => {
        const game = window.engine;
        const room = game.currentRoomId;
        for (let frame = 0; frame < 500 && game.currentRoomId === room; frame++) {
            if (increasing ? game[coordinate] >= goal : game[coordinate] <= goal) break;
            game.update(1000 / 60);
        }
        return { room: game.currentRoomId, origin: room, value: game[coordinate] };
    }, { coordinate: axis, goal: target, increasing: positive });
    await page.keyboard.up(key);
    expect(result.room, `unexpected exit while approaching ${axis}=${target}`).toBe(result.origin);
    expect(Math.abs(result.value - target), `blocked at ${axis}=${result.value}`).toBeLessThan(4);
}

async function exitRoom(page, mode, name, destination, staging) {
    await dismiss(page);
    if (mode === 'keyboard') {
        if (staging) {
            await walkAxis(page, 'playerY', staging[1]);
            await walkAxis(page, 'playerX', staging[0]);
        }
        const target = await page.evaluate((label) => {
            const game = window.engine;
            const hotspot = game.rooms[game.currentRoomId].hotspots.find(entry => entry.name === label);
            return { x: game.exitTriggerPoint(hotspot).x, y: hotspot.walkToY, playerX: game.playerX };
        }, name);
        if (target.y !== undefined) await walkAxis(page, 'playerY', target.y);
        const key = target.x > target.playerX ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.down(key);
        const result = await advance(page, destination);
        await page.keyboard.up(key);
        expect(result, `keyboard exit ${name}`).toMatchObject({ room: destination, dead: false });
    } else {
        const point = await page.evaluate((label) => {
            const game = window.engine;
            game.currentAction = 'walk';
            const hotspot = game.rooms[game.currentRoomId].hotspots.find(entry => entry.name === label);
            const x = hotspot.x + hotspot.w / 2;
            const y = hotspot.y + hotspot.h / 2;
            return { x, y, hit: game.findHotspot(x, y, game.rooms[game.currentRoomId]).name };
        }, name);
        expect(point.hit).toBe(name);
        await clickScene(page, point.x, point.y);
        expect(await advance(page, destination), `mouse exit ${name}`).toMatchObject({ room: destination, dead: false });
    }
    await dismiss(page);
    await page.evaluate(() => {
        for (let frame = 0; frame < 60; frame++) window.engine.update(1000 / 60);
    });
    expect(await page.evaluate(() => window.engine.currentRoomId), 'arrival must not bounce back').toBe(destination);
}

const circuits = [
    { name: 'scullery stairs', room: 'scullery', start: [300, 336], flags: [],
        outward: ['the stair up', 'study'], backward: ['the stair down', 'scullery', [134, 336]] },
    { name: 'hidden chamber', room: 'study', start: [300, 336], flags: ['stair_revealed'],
        outward: ['the hidden stair', 'spell_room'], backward: ['the stair up', 'study'] },
    { name: 'front door and house', room: 'study', start: [300, 336], flags: ['morvane_passed'],
        outward: ['the front door', 'crag_path'], backward: ['the house', 'study', [180, 336]] },
    { name: 'front door and return path', room: 'study', start: [300, 336], flags: ['morvane_passed'],
        outward: ['the front door', 'crag_path'], backward: ['the path back to the house', 'study', [180, 336]] },
    { name: 'harbour and village', room: 'harbour_road', start: [300, 350], flags: [],
        outward: ['the road inland', 'village_green'], backward: ['the road west', 'harbour_road', [110, 350]] },
    { name: 'village and wood', room: 'village_green', start: [440, 350], flags: [],
        outward: ['the wood', 'dark_wood'], backward: ['the track west', 'village_green', [95, 350]] },
    { name: 'wood and cave', room: 'dark_wood', start: [300, 350], flags: [],
        outward: ['the cave mouth', 'dragon_cave'], backward: ['the way out', 'dark_wood', [500, 340]] },
    { name: 'wood and bridge', room: 'dark_wood', start: [300, 350], flags: [],
        outward: ['the track east', 'troll_bridge'], backward: ['the track west', 'dark_wood', [100, 350]] },
    { name: 'bridge and clouds', room: 'troll_bridge', start: [350, 350], flags: ['troll_routed'],
        outward: ['the beanstalk', 'cloud_realm', [322, 354]], backward: ['the beanstalk', 'troll_bridge', [155, 350]] },
    { name: 'tower and harbour', room: 'harbour_road', start: [300, 350], flags: ['has_all_three'],
        outward: ['the shore path west', 'amber_tower'], backward: ['the shore path east', 'harbour_road', [520, 350]] }
];

for (const mode of ['mouse', 'keyboard']) {
    test.describe(`${mode} navigation`, () => {
        test('descending from the clouds allows a full retreat across the bridge', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => {
                const game = window.engine;
                game.setFlag('troll_routed');
                game.goToRoom('cloud_realm', 155, 350);
            });
            await exitRoom(page, mode, 'the beanstalk', 'troll_bridge');
            expect(await page.evaluate(() => window.engine.playerY)).toBeLessThan(204);
            if (mode === 'keyboard') {
                await walkAxis(page, 'playerX', 322);
                await walkAxis(page, 'playerY', 354);
            } else {
                await clickScene(page, 332, 240);
                await advance(page, 'no-room');
            }
            await exitRoom(page, mode, 'the track west', 'dark_wood');
            expect(await page.evaluate(() => window.engine.minimumWalkY)).toBe(280);
        });

        test('revealing the hidden stair does not divert travel through the study', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => {
                const game = window.engine;
                game.setFlag('stair_revealed');
                game.setFlag('morvane_passed');
                game.goToRoom('scullery', 300, 336);
            });
            await exitRoom(page, mode, 'the stair up', 'study');
            await exitRoom(page, mode, 'the front door', 'crag_path');
            await exitRoom(page, mode, 'the house', 'study', [180, 336]);
            await exitRoom(page, mode, 'the stair down', 'scullery');
        });

        test('the well can be descended and climbed repeatedly', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => {
                const game = window.engine;
                game.setFlag('rope_tied');
                game.goToRoom('village_green', 400, 354);
            });
            for (let visit = 0; visit < 2; visit++) {
                await useObject(page, mode, 'the well');
                expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('well_bottom');
                await exitRoom(page, mode, 'the rope', 'village_green', [400, 340]);
            }
        });

        test('locked tower path leaves the inland road available', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => window.engine.goToRoom('harbour_road', 200, 354));
            await dismiss(page);
            if (mode === 'keyboard') {
                await page.keyboard.down('ArrowLeft');
                await advance(page, 'no-room');
                await page.keyboard.up('ArrowLeft');
            } else {
                await clickScene(page, 20, 330);
                await advance(page, 'no-room');
            }
            expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('harbour_road');
            await exitRoom(page, mode, 'the road inland', 'village_green');
        });

        test('the skiff requires safety and wind before sailing', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => {
                const game = window.engine;
                game.addToInventory('thimble');
                game.addToInventory('bread');
                game.addToInventory('pail');
                game.goToRoom('crag_path', 360, 336);
            });
            await useObject(page, mode, 'the skiff');
            expect(await page.evaluate(() => window.engine.message)).toContain('coming up the path');
            await useObject(page, mode, 'the boulder');
            await page.keyboard.press('Escape');
            await dismiss(page);
            if (mode === 'keyboard') {
                await page.keyboard.type('use thimble on skiff');
                await page.keyboard.press('Enter');
            } else {
                await page.locator('#inventory-items button').filter({ hasText: /Thimble/ }).click();
                await dismiss(page);
                await clickScene(page, 540, 360);
            }
            expect(await page.evaluate(() => !!window.engine.cutscene)).toBe(true);
            await page.keyboard.press('Escape');
            expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('harbour_road');
            await exitRoom(page, mode, 'the road inland', 'village_green');
        });

        test('the inland road can be retraced without entering side rooms', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => window.engine.goToRoom('harbour_road', 300, 350));
            await exitRoom(page, mode, 'the road inland', 'village_green');
            await exitRoom(page, mode, 'the wood', 'dark_wood');
            await exitRoom(page, mode, 'the track east', 'troll_bridge');
            await exitRoom(page, mode, 'the track west', 'dark_wood', [120, 354]);
            await exitRoom(page, mode, 'the track west', 'village_green');
            await exitRoom(page, mode, 'the road west', 'harbour_road');
        });

        test('the cleared bridge deck can be crossed and retraced', async ({ page }) => {
            await boot(page, mode);
            await page.evaluate(() => {
                const game = window.engine;
                game.setFlag('troll_routed');
                game.goToRoom('troll_bridge', 332, 350);
            });
            await dismiss(page);
            if (mode === 'keyboard') {
                await walkAxis(page, 'playerX', 322);
                await walkAxis(page, 'playerY', 196);
                await walkAxis(page, 'playerY', 350);
            } else {
                await clickScene(page, 332, 240);
                await advance(page, 'no-room');
                expect(await page.evaluate(() => window.engine.playerY)).toBeLessThan(204);
                await clickScene(page, 332, 240);
                await advance(page, 'no-room');
                expect(await page.evaluate(() => window.engine.playerY)).toBeGreaterThan(334);
            }
            expect(await page.evaluate(() => window.engine.currentRoomId)).toBe('troll_bridge');
        });

        for (const circuit of circuits) {
            test(`${circuit.name} works in both directions`, async ({ page }) => {
                await boot(page, mode);
                await page.evaluate(({ room, start, flags }) => {
                    const game = window.engine;
                    for (const flag of flags) game.setFlag(flag);
                    game.goToRoom(room, ...start);
                }, circuit);
                await exitRoom(page, mode, ...circuit.outward);
                await exitRoom(page, mode, ...circuit.backward);
            });
        }
    });
}

for (const skip of [false, true]) {
    test(`Morvane pauses before the crag death (skip: ${skip})`, async ({ page }) => {
        await boot(page, 'mouse');
        const encounter = await page.evaluate(() => {
            const game = window.engine;
            game.goToRoom('crag_path', 180, 336);
            game.textWindow = null;
            game.setFlag('crag_nudged');
            game.setFlag('crag_timer', 8990);
            game.update(20);
            return { dead: game.dead, sequence: !!game.sequence, timer: game.getCounter('crag_timer') };
        });
        expect(encounter).toEqual({ dead: false, sequence: true, timer: 9010 });
        if (skip) await page.keyboard.press('Escape');
        else {
            await page.evaluate(() => window.engine.update(1000));
            expect(await page.evaluate(() => window.engine.dead)).toBe(false);
            await page.evaluate(() => window.engine.update(600));
        }
        expect(await page.evaluate(() => window.engine.dead)).toBe(true);
    });
}

test('bridge saves restore the far bank and deck without moving Rowan into the gorge', async ({ page }) => {
    await boot(page, 'keyboard');
    const restored = await page.evaluate(() => {
        const game = window.engine;
        game.setFlag('troll_routed');
        return [[500, 196], [327, 276]].map(([x, y]) => {
            game.goToRoom('troll_bridge', x, y);
            game.saveGame(0);
            game.goToRoom('scullery', 300, 336);
            game.loadGame(0);
            return { room: game.currentRoomId, x: game.playerX, y: game.playerY,
                blocked: game.collidesBarrier(game.playerX, game.playerY) };
        });
    });
    expect(restored).toEqual([
        { room: 'troll_bridge', x: 500, y: 196, blocked: false },
        { room: 'troll_bridge', x: 327, y: 276, blocked: false }
    ]);
    await dismiss(page);
    await walkAxis(page, 'playerY', 354);
    await exitRoom(page, 'keyboard', 'the track west', 'dark_wood');
});