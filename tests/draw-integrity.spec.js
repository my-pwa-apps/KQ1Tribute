const { test, expect } = require('@playwright/test');

// Canvas fails silently, and that is what turns a one-line typo into an
// iteration. Setting fillStyle to an invalid colour is a no-op, so the shape
// paints in whatever colour happened to be current; passing NaN geometry draws
// nothing at all. Neither throws, neither fails a unit test, and the visual
// baselines happily record the wrong picture as the new truth.
//
// Real examples this guard would have caught, each of which cost a render cycle:
//   - mixHex() returns an rgb() string, so mixHex(mixHex(...)) parsed to NaN and
//     an entire field painted black.
//   - roofSurfaceY() called without its final x argument returned NaN, and a
//     chimney silently vanished.
//   - two colour literals picked up a stray character and became invalid.
//
// This sweeps every room and every cutscene with the instrumentation on.

const GEOMETRY_METHODS = [
    'fillRect', 'strokeRect', 'clearRect', 'rect', 'roundRect',
    'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo',
    'arc', 'ellipse', 'translate', 'scale', 'rotate', 'transform',
    'setTransform', 'drawImage', 'fillText', 'strokeText'
];

/** Wrap CanvasRenderingContext2D so invalid paint state and non-finite geometry
 *  are recorded instead of silently ignored. */
async function installGuard(page) {
    await page.evaluate((methods) => {
        const proto = CanvasRenderingContext2D.prototype;
        if (proto.__guardInstalled) { window.__drawViolations = []; return; }
        proto.__guardInstalled = true;
        window.__drawViolations = [];
        const record = (kind, detail) => {
            const v = window.__drawViolations;
            if (v.length < 200) v.push(`${kind}: ${detail}`);
        };

        // A rejected colour assignment leaves the previous value in place, so
        // probing against two different priors is what reveals it. The probe
        // must go through the ORIGINAL descriptor or it re-enters this guard.
        const probe = document.createElement('canvas').getContext('2d');
        const rawFill = Object.getOwnPropertyDescriptor(proto, 'fillStyle');
        const valid = (value) => {
            if (typeof value !== 'string') return true;
            rawFill.set.call(probe, '#000000');
            rawFill.set.call(probe, value);
            const a = rawFill.get.call(probe);
            rawFill.set.call(probe, '#ffffff');
            rawFill.set.call(probe, value);
            return a === rawFill.get.call(probe);
        };

        for (const prop of ['fillStyle', 'strokeStyle']) {
            const desc = Object.getOwnPropertyDescriptor(proto, prop);
            Object.defineProperty(proto, prop, {
                configurable: true,
                get() { return desc.get.call(this); },
                set(value) {
                    if (!valid(value)) record('invalid ' + prop, String(value));
                    desc.set.call(this, value);
                }
            });
        }
        for (const prop of ['globalAlpha', 'lineWidth']) {
            const desc = Object.getOwnPropertyDescriptor(proto, prop);
            Object.defineProperty(proto, prop, {
                configurable: true,
                get() { return desc.get.call(this); },
                set(value) {
                    if (typeof value === 'number' && !Number.isFinite(value)) record('non-finite ' + prop, String(value));
                    desc.set.call(this, value);
                }
            });
        }
        for (const name of methods) {
            const original = proto[name];
            if (typeof original !== 'function') continue;
            proto[name] = function (...args) {
                for (let i = 0; i < args.length; i++) {
                    const a = args[i];
                    if (typeof a === 'number' && !Number.isFinite(a)) {
                        record('non-finite argument', `${name}() arg ${i} = ${a}`);
                        break;
                    }
                }
                return original.apply(this, args);
            };
        }
    }, GEOMETRY_METHODS);
}

async function violations(page) {
    return page.evaluate(() => {
        const seen = window.__drawViolations.slice();
        window.__drawViolations = [];
        return seen;
    });
}

test.describe('draw integrity', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'one profile is enough; the canvas is fixed size');
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.evaluate(() => document.fonts.ready);
        await page.keyboard.press('e');
        await page.evaluate(() => {
            const e = window.engine;
            if (e.cutscene) e.skipCutscene();
            e.setTextSpeed('instant', false);
        });
        await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
        await installGuard(page);
    });

    test('no room paints with an invalid colour or non-finite geometry', async ({ page }) => {
        const report = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const out = {};
            for (const id of Object.keys(e.rooms)) {
                window.__drawViolations = [];
                e.goToRoom(id, 320, 336);
                e.roomTransition = 0;
                e.textWindow = null;
                // Several timer values, so animated art is exercised too.
                for (const t of [0, 1200, 4000, 9000]) {
                    e.animTimer = t;
                    if (id === 'crag_path') e.setFlag('crag_timer', t);
                    e.render();
                }
                if (window.__drawViolations.length) out[id] = window.__drawViolations.slice(0, 6);
            }
            return out;
        });
        expect(report, `rooms painting invalid state:\n${JSON.stringify(report, null, 2)}`).toEqual({});
    });

    test('no room paints with an invalid colour once its puzzles are solved', async ({ page }) => {
        // Flag-gated art is a second set of draw paths and gets far less
        // eyeball time than the first-visit state.
        const report = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            for (const f of ['troll_routed', 'goat_follows', 'dragon_doused', 'gnome_named',
                'hare_freed', 'rope_tied', 'stair_revealed', 'circle_laid', 'ring_worn']) {
                e.setFlag(f, true);
            }
            const out = {};
            for (const id of Object.keys(e.rooms)) {
                window.__drawViolations = [];
                e.goToRoom(id, 320, 336);
                e.roomTransition = 0;
                e.textWindow = null;
                for (const t of [0, 4000]) { e.animTimer = t; e.render(); }
                if (window.__drawViolations.length) out[id] = window.__drawViolations.slice(0, 6);
            }
            return out;
        });
        expect(report, `rooms painting invalid state:\n${JSON.stringify(report, null, 2)}`).toEqual({});
    });

    test('no cutscene paints with an invalid colour or non-finite geometry', async ({ page }) => {
        const report = await page.evaluate(() => {
            const e = window.engine;
            e._loopRunning = false;
            const scenes = {
                cutsceneOpening: 21000,
                cutsceneMorvanePasses: 9000,
                cutsceneSailAway: 12000,
                cutsceneMorvaneDuel: 15000,
                cutsceneCoronation: 12000
            };
            const out = {};
            for (const [name, duration] of Object.entries(scenes)) {
                window.__drawViolations = [];
                e.playCutscene({ duration, draw: (c, w, h, p, el) => window[name](c, w, h, p, el) });
                // Step through the whole scene: every beat is a different frame.
                for (let i = 0; i <= 20; i++) {
                    e.cutscene.elapsed = duration * (i / 20);
                    e.animTimer = i * 700;
                    e.render();
                }
                e.skipCutscene();
                if (window.__drawViolations.length) out[name] = window.__drawViolations.slice(0, 6);
            }
            return out;
        });
        expect(report, `cutscenes painting invalid state:\n${JSON.stringify(report, null, 2)}`).toEqual({});
    });

    test('the guard itself detects a bad colour and NaN geometry', async ({ page }) => {
        // A guard nobody has seen fail is not a guard.
        const found = await page.evaluate(() => {
            window.__drawViolations = [];
            const ctx = window.engine.ctx;
            ctx.fillStyle = 'rgb(NaN,NaN,NaN)';
            ctx.fillRect(0, 0, NaN, 10);
            return window.__drawViolations.slice();
        });
        expect(found.some((v) => v.startsWith('invalid fillStyle'))).toBe(true);
        expect(found.some((v) => v.startsWith('non-finite argument'))).toBe(true);
        await violations(page);
    });

    test('all item variants and portrait expressions draw valid geometry', async ({ page }) => {
        await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            for (const filled of [false, true]) {
                game.setFlag('pail_full', filled);
                for (const paint of Object.values(game.itemArt)) paint(game.ctx, 320, 200, 4000);
            }
            for (const paint of Object.values(game.portraitArt)) {
                for (const expressive of [false, true]) paint(game.ctx, 320, 200, { blinking: expressive, mouthOpen: expressive, t: expressive ? 5201 : 4000 });
            }
        });
        expect(await violations(page)).toEqual([]);
    });

    test('the goat encounter renders every phase and commits only after its payoff', async ({ page }) => {
        const result = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            game.setFlag('goat_follows');
            game.goToRoom('troll_bridge', 80, 354);
            const before = game.getFlag('troll_routed');
            for (let frame = 0; frame < 200 && !game.bridgeEncounter; frame++) {
                if (game.textWindow) game.dismissTextWindow();
                game.update(1000 / 60);
            }
            if (!game.bridgeEncounter) throw new Error('Missing goat animation');
            game.roomTransition = 0;
            const start = game.bridgeEncounter.startedAt;
            const frames = new Set();
            for (let elapsed = 0; elapsed <= 3200; elapsed += 100) {
                game.animTimer = start + elapsed;
                game.render();
                frames.add(game.canvas.toDataURL());
            }
            game.skipSequence();
            return { before, frames: frames.size, after: game.getFlag('troll_routed'), score: game.score, animation: game.bridgeEncounter };
        });
        expect(result).toMatchObject({ before: false, after: true, score: 15, animation: null });
        expect(result.frames).toBeGreaterThan(25);
        expect(await violations(page)).toEqual([]);
    });

    test('both hands stay on the brush throughout the opening scrub stroke', async ({ page }) => {
        const samples = await page.evaluate(() => {
            const game = window.engine;
            game._loopRunning = false;
            const ctx = game.ctx;
            const originalArm = window.drawVgaArm;
            const originalRect = ctx.fillRect;
            const results = [];
            let hands = [], brushX;
            ctx.fillRect = function (x, y, width, height) {
                if (y === 318 && width === 76 && height === 22) brushX = x + 38;
                return originalRect.call(this, x, y, width, height);
            };
            window.drawVgaArm = (cel, shoulderX, shoulderY, scale, sign, upper, fore, colours) => {
                const handX = shoulderX - Math.sin(sign * upper) * 6.2 * scale
                    - Math.sin(sign * (upper + fore)) * 6.15 * scale;
                const handY = shoulderY + Math.cos(sign * upper) * 6.2 * scale
                    + Math.cos(sign * (upper + fore)) * 6.15 * scale;
                hands.push(new DOMPoint(handX, handY).matrixTransform(cel.getTransform()));
                originalArm(cel, shoulderX, shoulderY, scale, sign, upper, fore, colours);
            };
            try {
                for (let frame = 0; frame < 33; frame++) {
                    const elapsed = 5600 + frame * 64;
                    hands = [];
                    brushX = undefined;
                    window.cutsceneOpening(ctx, 640, 400, elapsed / 21000, elapsed);
                    results.push({ brushX, count: hands.length, errors: hands.map((hand, index) =>
                        Math.hypot(hand.x - (brushX + [-24, 12][index]), hand.y - 323)) });
                }
            } finally {
                window.drawVgaArm = originalArm;
                ctx.fillRect = originalRect;
            }
            return results;
        });
        expect(Math.max(...samples.map(sample => sample.brushX)) - Math.min(...samples.map(sample => sample.brushX))).toBeGreaterThan(23);
        for (const sample of samples) {
            expect(sample.count).toBe(2);
            for (const error of sample.errors) expect(error).toBeLessThan(0.01);
        }
        expect(await violations(page)).toEqual([]);
    });
});
