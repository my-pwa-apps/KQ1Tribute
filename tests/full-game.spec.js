const { test, expect } = require('@playwright/test');

// A scripted walkthrough of the whole game. This is the only test that proves
// the puzzle chain is completable and that maxScore is actually reachable.

const MAX_SCORE = 250;

/** Drive the game directly rather than through clicks: the point of this test
 *  is the progression chain, not the input layer (tests/game.spec.js covers that). */
async function boot(page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press('e');
    // Skip the opening cutscene and land in the scullery.
    await page.evaluate(() => {
        const e = window.engine;
        if (e.cutscene) e.skipCutscene();
        e.setTextSpeed('instant', false);
    });
    await page.waitForFunction(() => window.engine.currentRoomId === 'scullery');
}

/** Run a hotspot handler by name, the way the player's click would. */
async function act(page, roomId, hotspotName, verb, itemId) {
    await page.evaluate(({ roomId: rid, hotspotName: name, verb: v, itemId: item }) => {
        const e = window.engine;
        if (e.currentRoomId !== rid) e.goToRoom(rid, 320, 330);
        e.textWindow = null;
        e.sequence = null;
        const hs = e.rooms[rid].hotspots.find((h) => h.name === name);
        if (!hs) throw new Error(`no hotspot "${name}" in ${rid}`);
        if (v === 'useItem') hs.useItem(e.actionScope, item);
        else hs[v](e.actionScope);
    }, { roomId, hotspotName, verb, itemId });
    // Let any blocking sequence finish before the next beat.
    await page.evaluate(() => {
        const e = window.engine;
        for (let i = 0; i < 40 && e.sequence; i++) e.skipSequence();
        if (e.cutscene) e.skipCutscene();
        e.textWindow = null;
    });
}

async function pickDialogOption(page, dialogId, optionText) {
    await page.evaluate(({ dialogId: id, optionText: text }) => {
        const e = window.engine;
        e.startDialog(id);
        // startDialog opens on the greeting; the option list only exists once
        // the greeting has been dismissed.
        while (e.activeDialog && e.activeDialog.phase !== 'options') e._advanceDialog();
        if (!e.activeDialog) throw new Error(`dialog ${id} closed before showing options`);
        // Displayed options are numbered, so match on the trailing text.
        const idx = e.activeDialog.visibleOptions.findIndex((o) => o.text.endsWith(text));
        if (idx < 0) {
            throw new Error(`no option "${text}" in ${id}; saw ${e.activeDialog.visibleOptions.map((o) => o.text).join(' | ')}`);
        }
        e.selectDialogOption(idx);
        // Dismiss the response so its action fires.
        e._advanceDialog();
        e.textWindow = null;
        e.activeDialog = null;
    }, { dialogId, optionText });
}

const state = (page) => page.evaluate(() => ({
    room: window.engine.currentRoomId,
    score: window.engine.score,
    inventory: [...window.engine.inventory],
    dead: window.engine.dead,
    won: window.engine.won
}));

test.describe('full walkthrough', () => {
    test.slow();

    test('the game can be completed and every point is reachable', async ({ page }) => {
        await boot(page);

        // ---- ACT I: the scullery ----
        await act(page, 'scullery', 'the black bread', 'get');
        await act(page, 'scullery', 'the crock of salt', 'get');
        await act(page, 'scullery', 'the pail', 'get');
        expect((await state(page)).inventory).toEqual(expect.arrayContaining(['bread', 'sea_salt', 'pail']));

        // ---- ACT I: the study ----
        await act(page, 'study', 'the hourglass', 'look');
        await act(page, 'study', 'the feather', 'get');
        await act(page, 'study', 'the tapestry', 'look');
        expect((await state(page)).inventory).toEqual(expect.arrayContaining(['brass_key', 'raven_feather']));

        // ---- ACT I: the hidden room ----
        await act(page, 'spell_room', 'the iron chest', 'useItem', 'brass_key');
        await act(page, 'spell_room', 'the spellbook', 'get');
        await act(page, 'spell_room', 'the lectern', 'use');
        await act(page, 'spell_room', 'the chalk circle', 'useItem', 'raven_feather');
        await act(page, 'spell_room', 'the chalk circle', 'useItem', 'sea_salt');
        await act(page, 'spell_room', 'the chalk circle', 'use');
        expect((await state(page)).inventory).toContain('thimble');

        // ---- ACT I: the crag ----
        await act(page, 'crag_path', 'the boulder', 'use');
        await act(page, 'crag_path', 'the skiff', 'useItem', 'thimble');
        await page.waitForFunction(() => window.engine.currentRoomId === 'harbour_road');

        // ---- ACT II: the rope and the goat ----
        await pickDialogOption(page, 'hattie', 'Could I have a rope?');
        expect((await state(page)).inventory).toContain('rope');
        await act(page, 'village_green', 'the well', 'useItem', 'rope');
        await act(page, 'village_green', 'the goat', 'useItem', 'bread');
        expect(await page.evaluate(() => window.engine.getFlag('goat_follows'))).toBe(true);

        // ---- ACT II: the parchment, the hare, the ring ----
        await act(page, 'dark_wood', 'the parchment', 'look');
        await act(page, 'dark_wood', 'the hare', 'get');
        await pickDialogOption(page, 'fennow', 'Take this ring, then. (accept his gift)');
        expect((await state(page)).inventory).toContain('ring_of_mist');

        // ---- ACT II: the chest ----
        await act(page, 'well_bottom', 'the pool', 'use');
        await pickDialogOption(page, 'gnome', 'Your name is Mendharbe.');
        expect((await state(page)).inventory).toContain('chest_of_cormac');

        // ---- ACT II: the troll and the shield ----
        await page.evaluate(() => window.engine.goToRoom('troll_bridge', 120, 336));
        await page.evaluate(() => {
            const e = window.engine;
            for (let i = 0; i < 40 && e.sequence; i++) e.skipSequence();
            e.textWindow = null;
        });
        expect(await page.evaluate(() => window.engine.getFlag('troll_routed'))).toBe(true);

        await page.evaluate(() => window.engine.goToRoom('cloud_realm', 90, 344));
        await act(page, 'cloud_realm', 'the giant', 'useItem', 'ring_of_mist');
        await act(page, 'cloud_realm', 'the Shield of Ardor', 'get');
        expect((await state(page)).inventory).toContain('shield_of_ardor');

        // ---- ACT II: the dragon and the mirror ----
        await act(page, 'dragon_cave', 'the fire pit', 'useItem', 'pail');
        await act(page, 'dragon_cave', 'the Mirror of Ianthe', 'get');
        const beforeEnd = await state(page);
        expect(beforeEnd.inventory).toEqual(expect.arrayContaining([
            'chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'
        ]));
        expect(beforeEnd.dead).toBe(false);

        // ---- ACT III ----
        await act(page, 'amber_tower', 'the sockets', 'useItem', 'chest_of_cormac');
        await act(page, 'amber_tower', 'the sockets', 'useItem', 'shield_of_ardor');
        await act(page, 'amber_tower', 'the sockets', 'useItem', 'mirror_of_ianthe');
        await page.waitForFunction(() => window.engine.won, null, { timeout: 15000 });

        const final = await state(page);
        expect(final.won).toBe(true);
        expect(final.dead).toBe(false);
        expect(final.score).toBe(MAX_SCORE);
    });

    test('maxScore matches the published contract', async ({ page }) => {
        await boot(page);
        expect(await page.evaluate(() => window.engine.maxScore)).toBe(MAX_SCORE);
    });
});
