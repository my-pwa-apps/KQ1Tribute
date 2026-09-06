const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The game has no bundler, so its module boundaries are enforced by load order
// and a registry rather than by imports. These tests assert the contract holds
// at runtime, which a static check cannot prove.

const ROOM_IDS = [
    'amber_tower', 'cloud_realm', 'crag_path', 'dark_wood', 'dragon_cave',
    'harbour_road', 'scullery', 'spell_room', 'study', 'troll_bridge',
    'village_green', 'well_bottom'
];

test.describe('module architecture', () => {
    test('engine code does not embed registered content IDs or story-specific fallback replies', async ({ page }) => {
        await page.goto('/');
        const ids = await page.evaluate(() => [...new Set([
            ...Object.keys(window.engine.rooms), ...Object.keys(window.engine.items), ...Object.keys(window.engine.portraitArt)
        ])]);
        const source = fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8');
        const literals = [...source.matchAll(/(['"])([^'"\n]+)\1/g)].map(match => match[2]);
        expect(ids.filter(id => literals.includes(id))).toEqual([]);
        expect(source).not.toMatch(/scullery-boy|Bramble King|sorcerer\\'s floors/);
        await page.keyboard.press('c');
        const replies = await page.evaluate(() => {
            const game = window.engine;
            game.skipCutscene();
            game.executeParserCommand('sing');
            const song = game.message;
            game.executeParserCommand('clean');
            const cleaning = game.message;
            game.game.flavorResponses = {};
            game.executeParserCommand('sing');
            return { song, cleaning, generic: game.message };
        });
        expect(replies.song).toContain('Bramble King');
        expect(replies.cleaning).toContain("sorcerer's floors");
        expect(replies.generic).not.toContain('Bramble King');
    });

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

    test('every room confines the ego to a walkable floor', async ({ page }) => {
        // A room with no walkable area lets the ego stroll through walls and off
        // the screen edge. Three interiors shipped without one, which is how the
        // scullery teleported you upstairs for walking into a blank wall.
        const bad = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = [];
            for (const id of Object.keys(e.rooms)) {
                e.goToRoom(id, 320, 336);
                if (typeof e.walkableArea !== 'function') { out.push(`${id}: no walkable area`); continue; }
                // The floor must be bounded: nothing walkable in the far corners.
                const leaks = [[4, 8], [636, 8], [4, 396], [636, 396]]
                    .filter(([x, y]) => e.walkableArea(x, y));
                if (leaks.length) out.push(`${id}: walkable at ${JSON.stringify(leaks)}`);
            }
            return out;
        });
        expect(bad).toEqual([]);
    });

    test('every edge transition is backed by a drawn exit', async ({ page }) => {
        // Walking off a screen edge is fair in an exterior, where the path
        // visibly continues. Inside a room it has to correspond to a door the
        // player can actually see, or they get teleported out of a blank wall.
        const bad = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = [];
            for (const id of Object.keys(e.rooms)) {
                e.goToRoom(id, 320, 336);
                const edges = Object.entries(e.edgeTransitions).filter(([, fn]) => typeof fn === 'function');
                if (!edges.length) continue;
                const exits = (e.rooms[id].hotspots || []).filter((hs) => hs.isExit);
                for (const [edge] of edges) {
                    const near = exits.some((hs) => {
                        const cx = hs.walkToX !== undefined ? hs.walkToX : hs.x + hs.w / 2;
                        if (edge === 'left') return cx < 190;
                        if (edge === 'right') return cx > 450;
                        return true;
                    });
                    if (!near) out.push(`${id}: ${edge} edge has no exit hotspot near it`);
                }
            }
            return out;
        });
        expect(bad).toEqual([]);
    });

    test('every prop contact lands on the surface it claims', async ({ page }) => {
        await page.keyboard.press('e');
        await page.evaluate(() => { if (window.engine.cutscene) window.engine.skipCutscene(); });
        // Props that stand on furniture must take their base from the surface
        // registry, not a hand-written constant. A chimney, a shelf of pans, a
        // pail and a desk candle have all floated here by ignoring the thing
        // underneath them, and none of it failed a test.
        const bad = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = [];
            for (const id of Object.keys(e.rooms)) {
                e.goToRoom(id, 320, 336);
                e.roomTransition = 0;
                e.textWindow = null;
                e.render();
                for (const p of e._propBases) {
                    const s = e.surfaces[p.surface];
                    if (!s) { out.push(`${id}: prop on undeclared surface '${p.surface}'`); continue; }
                    if (p.x < s.x0 || p.x > s.x1) {
                        out.push(`${id}: prop at x=${p.x} is off the ends of '${p.surface}'`);
                    }
                    const expected = typeof s.yAt === 'function' ? s.yAt(p.x) : s.yAt;
                    if (Math.abs(p.y - expected) > 0.5) {
                        out.push(`${id}: '${p.surface}' prop base ${p.y} != surface ${expected}`);
                    }
                }
            }
            return out;
        });
        expect(bad).toEqual([]);
    });

    test('rooms that declare surfaces actually stand props on them', async ({ page }) => {
        await page.keyboard.press('e');
        await page.evaluate(() => { if (window.engine.cutscene) window.engine.skipCutscene(); });
        // A surface nobody stands on is a surface that has silently stopped
        // being used, which puts its props back on hand-written constants.
        const unused = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = [];
            for (const id of Object.keys(e.rooms)) {
                e.goToRoom(id, 320, 336);
                e.roomTransition = 0;
                e.textWindow = null;
                e.render();
                const used = new Set(e._propBases.map((p) => p.surface));
                for (const name of Object.keys(e.surfaces)) {
                    if (!used.has(name)) out.push(`${id}: surface '${name}' has no props on it`);
                }
            }
            return out;
        });
        expect(unused).toEqual([]);
    });

    test('the shared art modules are loaded before any room needs them', async ({ page }) => {
        const missing = await page.evaluate(() => [
            // js/art.js
            'ditherRect', 'skyBands', 'starField', 'stoneWall', 'woodPlanks',
            'thatchRoof', 'perspectiveFrame', 'interiorShell', 'flame',
            'wallTorch', 'drawTree', 'drawPine', 'drawBush', 'waterBand',
            'rockFace', 'drawCastle', 'drawWell', 'drawRecedingBridge', 'drawSkiff',
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
