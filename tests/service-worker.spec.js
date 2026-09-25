const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VERSION = fs.readFileSync(path.join(__dirname, '..', 'serviceworker.js'), 'utf8')
    .match(/const VERSION\s*=\s*'v([^']+)'/)[1];

async function controlledPage(page) {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    if (!await page.evaluate(() => !!navigator.serviceWorker.controller)) {
        await page.reload();
        await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    }
}

test.describe('service worker updates', () => {
    test.beforeEach(() => {
        test.skip(test.info().project.name !== 'chromium', 'one worker check is enough');
    });

    test('scripts are versioned, so stale cached copies can never pair with new HTML', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await controlledPage(page);
        const scripts = await page.evaluate(() => [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean));
        expect(scripts.length).toBeGreaterThan(30);
        for (const src of scripts) expect(src).toMatch(new RegExp(`\\.js\\?v=${VERSION.replace(/\./g, '\\.')}$`));

        // Simulate the first visit after an update: the controlling worker's
        // cache holds only an older build's scripts. The page must not pick
        // them up.
        await page.evaluate(async (version) => {
            await caches.delete(`crownquest-v${version}`);
            const stale = new Response('throw new Error("stale engine served");',
                { headers: { 'Content-Type': 'text/javascript' } });
            const old = await caches.open('crownquest-v0.0.1');
            await old.put(new URL('js/engine.js', location.href), stale.clone());
            await old.put(new URL('js/engine.js?v=0.0.1', location.href), stale.clone());
        }, VERSION);
        await page.reload();
        await page.waitForFunction(() => window.engine && window.engine.rooms && Object.keys(window.engine.rooms).length > 10);
        expect(errors).toEqual([]);
        await expect.poll(() => page.evaluate(async (version) => {
            const cache = await caches.open(`crownquest-v${version}`);
            return !!await cache.match(new URL(`js/engine.js?v=${version}`, location.href));
        }, VERSION)).toBe(true);
    });

    test('painted trial art is cached under a versioned name', async ({ page }) => {
        await controlledPage(page);
        await page.goto('/?scenery=painted');
        await page.waitForFunction(() => window.engine);
        await page.evaluate(() => window.engine.game.drawPlayerSprite.ready);
        await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(key => key.startsWith('crownquest-art-trials'))))
            .toEqual([expect.stringMatching(/^crownquest-art-trials-[a-z0-9]+$/)]);
    });
});
