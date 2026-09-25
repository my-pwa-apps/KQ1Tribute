const { test, expect } = require('@playwright/test');

// Painted-scenery trial for the Alderhaven rooms: ChatGPT backgrounds with the
// dynamic props still drawn live. Each room must keep its exits reachable and
// its obstacles where the picture draws them.

async function enterPainted(page, roomId, x, y, flags = {}) {
    await page.goto('/?scenery=painted');
    await page.keyboard.press('e');
    await page.evaluate(async ({ roomId, x, y, flags }) => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        await game.game.drawPlayerSprite.ready;
        game._loopRunning = false;
        for (const [name, value] of Object.entries(flags)) game.setFlag(name, value);
        game.goToRoom(roomId, x, y);
        game.textWindow = null;
        game._textQueue = [];
        game.roomTransition = 0;
        game.animTimer = 4000;
        game.playerFacing = 'toward';
        game.mouseX = 620; game.mouseY = 380;
    }, { roomId, x, y, flags });
}

async function walkTo(page, points) {
    return page.evaluate((targets) => targets.map(([x, y]) => {
        const game = window.engine;
        game.playerTargetX = x; game.playerTargetY = y; game.playerWalking = true;
        for (let frame = 0; frame < 400 && game.playerWalking; frame++) game.update(16);
        return Math.hypot(game.playerX - x, game.playerY - y) < 1;
    }), points);
}

test('painted harbour road keeps its obstacles, exits and live props', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await enterPainted(page, 'harbour_road', 320, 330);
    await page.waitForFunction(() => window.engine.minimumWalkY === 205);
    const geometry = await page.evaluate(() => {
        const game = window.engine;
        const drawn = [];
        const drawImage = game.ctx.drawImage;
        game.ctx.drawImage = function (image, ...args) {
            if (image.src) drawn.push(image.src.split('/').pop());
            return drawImage.call(this, image, ...args);
        };
        try { game.render(); } finally { game.ctx.drawImage = drawImage; }
        return {
            drawn,
            blocked: [[60, 270], [466, 290]].map((point) => game.collidesBarrier(...point)),
            clear: [[320, 330], [200, 300], [600, 222], [40, 300]].map((point) => game.collidesBarrier(...point))
        };
    });
    expect(geometry.drawn).toContain('harbour-road-trial.png');
    expect(geometry.blocked).toEqual([true, true]);
    expect(geometry.clear).toEqual([false, false, false, false]);
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-harbour-road.png');
    expect(await walkTo(page, [[320, 330], [560, 300], [588, 238]])).toEqual([true, true, true]);
    const exit = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('harbour_road', 320, 330);
        game.textWindow = null;
        game.currentAction = 'walk';
        const road = game.rooms.harbour_road.hotspots.find((h) => h.name === 'the road inland');
        game.handleClick(road.x + road.w / 2, road.y + road.h / 2);
        for (let frame = 0; frame < 400 && game.currentRoomId === 'harbour_road'; frame++) game.update(16);
        return game.currentRoomId;
    });
    expect(exit).toBe('village_green');
    expect(errors).toEqual([]);
});

test('a missing painted background falls back to the procedural harbour road', async ({ page }) => {
    await page.route('**/icons/harbour-road-trial.png', (route) => route.abort());
    await enterPainted(page, 'harbour_road', 320, 330);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
        minY: window.engine.minimumWalkY,
        skiff: window.engine.rooms.harbour_road.hotspots.find((h) => h.name === 'the skiff').x
    }));
    expect(state.minY).not.toBe(205);
    expect(state.skiff).toBe(60);
});

test('painted village green moves the actors and state props onto the picture', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await enterPainted(page, 'village_green', 300, 330);
    await page.waitForFunction(() => window.engine.minimumWalkY === 241);
    const state = await page.evaluate(() => {
        const game = window.engine;
        const drawn = [];
        const drawImage = game.ctx.drawImage;
        game.ctx.drawImage = function (image, ...args) {
            if (image.src) drawn.push(image.src.split('/').pop());
            return drawImage.call(this, image, ...args);
        };
        try { game.render(); } finally { game.ctx.drawImage = drawImage; }
        return {
            drawn,
            layers: game.foregroundLayers.map((layer) => layer.y).sort((a, b) => a - b),
            blocked: [[350, 280], [100, 270], [450, 285]].map((point) => game.collidesBarrier(...point)),
            clear: [[300, 330], [230, 306], [430, 304], [600, 264]].map((point) => game.collidesBarrier(...point))
        };
    });
    expect(state.drawn).toContain('village-green-trial.png');
    expect(state.layers).toEqual([302, 322]);
    expect(state.blocked).toEqual([true, true, true]);
    expect(state.clear).toEqual([false, false, false, false]);
    await expect(page.locator('#game-canvas')).toHaveScreenshot('painted-village-green.png');
    // The rope puzzle and the goat still work against the moved hotspots.
    const puzzle = await page.evaluate(() => {
        const game = window.engine;
        const well = game.rooms.village_green.hotspots.find((h) => h.name === 'the well');
        game.addToInventory('rope');
        well.useItem(game.actionScope, 'rope');
        game.addToInventory('bread');
        game.rooms.village_green.hotspots.find((h) => h.name === 'the goat').useItem(game.actionScope, 'bread');
        return { tied: game.getFlag('rope_tied'), goat: game.getFlag('goat_follows') };
    });
    expect(puzzle).toEqual({ tied: true, goat: true });
    expect(await walkTo(page, [[430, 304], [590, 300]])).toEqual([true, true]);
    expect(errors).toEqual([]);
});

// Every other painted Alderhaven room: its picture is drawn, the reachable floor
// still leads to each exit, and the puzzle state is still drawn on top.
const ROOMS = [
    { id: 'well_bottom', image: 'well-bottom-trial.png', at: [336, 320], minY: 271, flags: {},
        reach: [[400, 330], [310, 326], [380, 360], [590, 360]], exit: 'the rope', to: 'village_green' },
    { id: 'dark_wood', image: 'dark-wood-trial.png', at: [320, 320], minY: 206, flags: {},
        reach: [[380, 314], [214, 304], [560, 290], [400, 310], [120, 305]], exit: 'the cave mouth', to: 'dragon_cave' },
    { id: 'troll_bridge', image: 'troll-bridge-trial.png', at: [200, 350], minY: 151, flags: { troll_routed: true },
        reach: [[333, 330], [500, 350]], exit: 'the beanstalk', to: 'cloud_realm' },
    { id: 'cloud_realm', image: 'cloud-realm-trial.png', at: [90, 344], minY: 286, flags: {},
        reach: [[200, 330], [232, 300]], exit: 'the beanstalk', to: 'troll_bridge' },
    { id: 'dragon_cave', image: 'dragon-cave-trial.png', at: [560, 330], minY: 263, flags: { dragon_doused: true },
        reach: [[470, 330], [300, 320], [580, 312]], exit: 'the way out', to: 'dark_wood' },
    { id: 'amber_tower', image: 'amber-tower-trial.png', at: [200, 340], minY: 299, flags: { has_all_three: true },
        reach: [[318, 316], [560, 330]], exit: 'the shore path east', to: 'harbour_road' }
];

for (const room of ROOMS) {
    test(`painted ${room.id} keeps its floor, exit and live props`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await enterPainted(page, room.id, ...room.at, room.flags);
        await page.waitForFunction((minY) => window.engine.minimumWalkY === minY, room.minY);
        const drawn = await page.evaluate(() => {
            const game = window.engine;
            const images = [];
            const drawImage = game.ctx.drawImage;
            game.ctx.drawImage = function (image, ...args) {
                if (image.src) images.push(image.src.split('/').pop());
                return drawImage.call(this, image, ...args);
            };
            try { game.render(); } finally { game.ctx.drawImage = drawImage; }
            return images;
        });
        expect(drawn).toContain(room.image);
        await expect(page.locator('#game-canvas')).toHaveScreenshot(`painted-${room.id}.png`);
        expect(await walkTo(page, room.reach)).toEqual(room.reach.map(() => true));
        const arrived = await page.evaluate(({ id, exit, at }) => {
            const game = window.engine;
            game.goToRoom(id, ...at);
            game.textWindow = null;
            game._textQueue = [];
            game.currentAction = 'walk';
            const hotspot = game.rooms[id].hotspots.find((h) => h.name === exit);
            game.handleClick(hotspot.x + hotspot.w / 2, hotspot.y + hotspot.h / 2);
            for (let frame = 0; frame < 900 && game.currentRoomId === id; frame++) {
                if (game.textWindow) game.dismissTextWindow();
                game.update(16);
            }
            return game.currentRoomId;
        }, { id: room.id, exit: room.exit, at: room.at });
        expect(arrived).toBe(room.to);
        expect(errors).toEqual([]);
    });
}

test('the painted bridge still drops the unwary into the gorge and lets the routed cross', async ({ page }) => {
    await enterPainted(page, 'troll_bridge', 200, 350);
    await page.waitForFunction(() => window.engine.minimumWalkY === 151);
    const result = await page.evaluate(() => {
        const game = window.engine;
        const bridge = game.rooms.troll_bridge.hotspots.find((h) => h.name === 'the bridge');
        const blockedBeforeRouting = !game.walkableArea(333, 250);
        bridge.walk(game.actionScope);
        const died = game.dead;
        game.tryAgain();
        game.textWindow = null;
        game.setFlag('troll_routed');
        bridge.walk(game.actionScope);
        for (let frame = 0; frame < 900 && game.sequence; frame++) game.update(16);
        return { blockedBeforeRouting, died, farBank: game.playerY < 168, room: game.currentRoomId };
    });
    expect(result).toEqual({ blockedBeforeRouting: true, died: true, farBank: true, room: 'troll_bridge' });
});

test('painted wood arrivals stand on the path and every exit is reachable from them', async ({ page }) => {
    await enterPainted(page, 'dark_wood', 60, 354);
    await page.waitForFunction(() => window.engine.minimumWalkY === 206);
    const result = await page.evaluate(() => {
        const game = window.engine;
        const run = (name) => {
            game.textWindow = null;
            game._textQueue = [];
            game.currentAction = 'walk';
            const hotspot = game.rooms.dark_wood.hotspots.find((h) => h.name === name);
            game.handleClick(hotspot.x + hotspot.w / 2, hotspot.y + hotspot.h / 2);
            for (let frame = 0; frame < 900 && game.currentRoomId === 'dark_wood'; frame++) game.update(16);
            return game.currentRoomId;
        };
        const standing = game.walkableArea(game.playerX, game.playerY);
        const east = run('the track east');
        game.goToRoom('dark_wood', 580, 354);
        const cave = run('the cave mouth');
        return { standing, east, cave };
    });
    expect(result).toEqual({ standing: true, east: 'troll_bridge', cave: 'dragon_cave' });
});
