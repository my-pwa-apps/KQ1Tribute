const { test, expect } = require('@playwright/test');

async function settle(page) {
    for (let beat = 0; beat < 150; beat++) {
        const state = await page.evaluate(() => {
            const game = window.engine;
            for (let frame = 0; frame < 120; frame++) {
                if (game.textWindow || game.dead || game.won || game.activeDialog?.phase === 'options') break;
                game.update(1000 / 60);
                if (!game.sequence && !game.cutscene && !game.playerWalking) break;
            }
            return { dead: game.dead, won: game.won, text: !!game.textWindow,
                options: game.activeDialog?.phase === 'options', busy: !!(game.sequence || game.cutscene || game.playerWalking) };
        });
        expect(state.dead, 'the player-input route must remain alive').toBe(false);
        if (state.won || state.options) return;
        if (state.text) await page.keyboard.press('Enter');
        else if (!state.busy) return;
    }
    throw new Error('Player journey stalled in a walk or scripted scene');
}

async function command(page, text, room) {
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
    await settle(page);
    if (room) expect(await page.evaluate(() => window.engine.currentRoomId), text).toBe(room);
}

async function choose(page, text) {
    const index = await page.evaluate(label => window.engine.activeDialog.visibleOptions.findIndex(option => option.text.includes(label)), text);
    expect(index, text).toBeGreaterThanOrEqual(0);
    await page.keyboard.press(String(index + 1));
    await settle(page);
}

test('a continuous player-input journey wins without injected progression or skipping', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press('c');
    await page.evaluate(() => {
        window.engine._loopRunning = false;
        window.engine.setTextSpeed('instant', false);
    });
    await settle(page);
    for (const text of ['get black bread', 'get crock of salt', 'get pail']) await command(page, text);
    await command(page, 'walk stair up', 'study');
    for (const text of ['look hourglass', 'get feather', 'pull tapestry']) await command(page, text);
    await command(page, 'walk hidden stair', 'spell_room');
    for (const text of ['use brass key on iron chest', 'get spellbook', 'read spellbook',
        'use raven feather on chalk circle', 'use sea salt on chalk circle', 'use chalk circle']) await command(page, text);
    await command(page, 'walk stair up', 'study');
    await command(page, 'walk front door', 'crag_path');
    await command(page, 'use boulder');
    await command(page, 'use thimble on skiff', 'harbour_road');
    await command(page, 'walk road inland', 'village_green');
    await command(page, 'talk Hattie');
    await choose(page, 'Could I have a rope');
    await choose(page, 'Thank you, Hattie');
    await command(page, 'use rope on well');
    await command(page, 'use bread on goat');
    await command(page, 'walk wood', 'dark_wood');
    await command(page, 'get parchment');
    await command(page, 'get hare');
    await command(page, 'talk Fennow');
    await choose(page, 'accept his gift');
    await choose(page, 'Thank you.');
    await command(page, 'walk track west', 'village_green');
    await command(page, 'use well', 'well_bottom');
    await command(page, 'use pool');
    await command(page, 'talk gnome');
    await choose(page, 'Your name is Mendharbe');
    await command(page, 'use rope', 'village_green');
    await command(page, 'walk wood', 'dark_wood');
    await command(page, 'walk track east', 'troll_bridge');
    await command(page, 'walk beanstalk', 'cloud_realm');
    await command(page, 'use ring of mist on giant');
    await command(page, 'get Shield of Ardor');
    await command(page, 'use beanstalk', 'troll_bridge');
    await command(page, 'use bridge');
    await command(page, 'walk track west', 'dark_wood');
    await command(page, 'walk cave mouth', 'dragon_cave');
    await command(page, 'use pail on fire pit');
    await command(page, 'get Mirror of Ianthe');
    await command(page, 'use way out', 'dark_wood');
    await command(page, 'walk track west', 'village_green');
    await command(page, 'walk road west', 'harbour_road');
    await command(page, 'walk shore path west', 'amber_tower');
    for (const treasure of ['Chest of Cormac', 'Shield of Ardor', 'Mirror of Ianthe']) await command(page, `use ${treasure} on sockets`);
    expect(await page.evaluate(() => ({ won: window.engine.won, score: window.engine.score }))).toEqual({ won: true, score: 250 });
});