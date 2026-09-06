const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// The game canvas is not introspectable by axe, so these scans target the DOM
// chrome around it: landmarks, headings, controls, live regions and the modal.
async function scan(page) {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

function describeViolations(violations) {
    return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`).join('\n');
}

async function startGame(page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press('e');
    await page.waitForFunction(
        () => !!window.engine && !window.engine.titleScreen && !!window.engine.cutscene,
        null,
        { timeout: 10000 }
    );
    for (let index = 0; index < 40; index++) {
        if (await page.evaluate(() => !window.engine.cutscene)) break;
        await page.keyboard.press('Space');
        await page.waitForTimeout(90);
    }
}

test.describe('accessibility conformance', () => {
    test('the title screen has no serious or critical violations', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium');
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        const violations = await scan(page);
        expect(describeViolations(violations)).toBe('');
    });

    test('gameplay chrome and inventory have no serious or critical violations', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium');
        await startGame(page);
        await page.evaluate(() => {
            window.engine.addToInventory('brass_key');
            window.engine.addToInventory('pail');
        });
        await expect(page.locator('#inventory-items button')).toHaveCount(2);
        const violations = await scan(page);
        expect(describeViolations(violations)).toBe('');
    });

    test('the save modal has no serious or critical violations', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium');
        await startGame(page);
        await page.keyboard.press('F5');
        await expect(page.locator('#save-modal')).toHaveClass(/open/);
        const violations = await scan(page);
        expect(describeViolations(violations)).toBe('');
    });

    test('an open dialog has no serious or critical violations', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium');
        await startGame(page);
        await page.evaluate(() => {
            const e = window.engine;
            e.goToRoom('village_green', 220, 350);
            e.roomTransition = 0;
            e.startDialog('hattie');
            for (let i = 0; i < 10 && e.activeDialog && e.activeDialog.phase !== 'options'; i++) {
                e._advanceDialog();
            }
        });
        await expect(page.locator('#dialog-accessibility-options button').first()).toBeAttached();
        const violations = await scan(page);
        expect(describeViolations(violations)).toBe('');
    });
});
