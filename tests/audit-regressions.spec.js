const { test, expect } = require('@playwright/test');

// Regressions for the 2026-09-24 audit: parser phrasing, narration that must
// not be overwritten, the spoken gnome name, the mirror duel, optional score,
// the following goat, gift dialogue and truthful hints.

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.keyboard.press('e');
    await page.evaluate(() => {
        const game = window.engine;
        if (game.cutscene) game.skipCutscene();
        game._loopRunning = false;
        game.setTextSpeed('instant', false);
        game.textWindow = null;
    });
});

// Each row: room, setup, command, and what must be true afterwards.
const PHRASES = [
    ['study', {}, 'lift hourglass', 'found_key'],
    ['study', {}, 'get key', 'found_key'],
    ['study', {}, 'move tapestry', 'stair_revealed'],
    ['study', {}, 'ask raven for feather', 'dialog:corvus'],
    ['spell_room', { items: ['brass_key'] }, 'unlock chest with key', 'chest_open'],
    ['spell_room', { items: ['brass_key'] }, 'open chest with key', 'chest_open'],
    ['spell_room', { items: ['raven_feather', 'spellbook'], flags: ['read_spell', 'chest_open'] }, 'put feather in circle', 'circle_feather'],
    ['spell_room', { items: ['sea_salt', 'spellbook'], flags: ['read_spell', 'chest_open'] }, 'sprinkle salt on circle', 'circle_salt'],
    ['spell_room', { items: ['spellbook'], flags: ['read_spell', 'chest_open', 'circle_feather', 'circle_salt'] }, 'cast spell', 'item:thimble'],
    ['spell_room', { items: ['spellbook'], flags: ['read_spell', 'chest_open', 'circle_feather', 'circle_salt'] }, 'say word', 'item:thimble'],
    ['crag_path', {}, 'hide behind boulder', 'morvane_passed'],
    ['crag_path', {}, 'hide', 'morvane_passed'],
    ['crag_path', { items: ['thimble', 'bread', 'pail'], flags: ['morvane_passed'] }, 'sail', 'award_sailed'],
    ['crag_path', { items: ['thimble', 'bread', 'pail'], flags: ['morvane_passed'] }, 'use thimble on boat', 'award_sailed'],
    ['village_green', { items: ['bread'] }, 'give bread to goat', 'goat_follows'],
    ['village_green', { items: ['bread'] }, 'feed bread to goat', 'goat_follows'],
    ['village_green', { items: ['bread'] }, 'feed goat with bread', 'goat_follows'],
    ['village_green', { items: ['rope'] }, 'tie rope to well', 'rope_tied'],
    ['village_green', { flags: ['rope_tied'] }, 'climb down well', 'room:well_bottom'],
    ['village_green', { flags: ['rope_tied'] }, 'enter well', 'room:well_bottom'],
    ['dark_wood', {}, 'free hare', 'hare_freed'],
    ['dark_wood', {}, 'untie hare', 'hare_freed'],
    ['well_bottom', { items: ['pail'] }, 'fill pail', 'pail_full'],
    ['well_bottom', { items: ['pail'] }, 'fill bucket with water', 'pail_full'],
    ['well_bottom', {}, 'say mendharbe', 'gnome_named'],
    ['cloud_realm', { items: ['ring_of_mist'] }, 'wear ring', 'ring_worn'],
    ['cloud_realm', { items: ['ring_of_mist'] }, 'put on ring', 'ring_worn'],
    ['dragon_cave', { items: ['pail'], full: true }, 'throw water on fire', 'dragon_doused'],
    ['dragon_cave', { items: ['pail'], full: true }, 'pour water on fire', 'dragon_doused'],
    ['dragon_cave', { items: ['pail'], full: true }, 'use pail on dragon', 'dragon_doused'],
    ['amber_tower', { items: ['chest_of_cormac'], flags: ['has_all_three'] }, 'put chest in socket', 'socket_chest_of_cormac']
];

test('the classic parser accepts the natural phrasing of every puzzle', async ({ page }) => {
    const results = await page.evaluate((rows) => rows.map(([room, setup, command, expected]) => {
        const game = window.engine;
        game.restart();
        game.goToRoom(room, 300, 346);
        (setup.items || []).forEach((id) => game.addToInventory(id));
        (setup.flags || []).forEach((flag) => game.setFlag(flag));
        if (setup.full) window.CrownQuestContent.rules.setPailWater(game, true);
        game.textWindow = null;
        game._textQueue = [];
        game.executeParserCommand(command);
        for (let frame = 0; frame < 600 && (game.playerWalking || game.sequence || game.cutscene); frame++) {
            if (game.cutscene) game.skipCutscene();
            if (game.textWindow) game.dismissTextWindow();
            game.update(1000 / 60);
        }
        const [kind, name] = expected.includes(':') ? expected.split(':') : ['flag', expected];
        const ok = kind === 'flag' ? game.getFlag(name) === true
            : kind === 'item' ? game.hasItem(name)
                : kind === 'room' ? game.currentRoomId === name
                    : !!game.activeDialog && game.activeDialog.dialogId === name;
        const reply = game.message;
        game.activeDialog = null;
        return { command, ok, reply };
    }), PHRASES);
    expect(results.filter((row) => !row.ok)).toEqual([]);
});

test('no parser reply tells the player to do what they just typed', async ({ page }) => {
    const reply = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('spell_room', 300, 346);
        game.addToInventory('brass_key');
        game.textWindow = null;
        game.executeParserCommand('unlock chest with key');
        return game.message;
    });
    expect(reply).not.toContain('You will have to use the brass key');
});

test('incomplete phrases ask a specific question instead of confusion', async ({ page }) => {
    const replies = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('village_green', 300, 354);
        game.addToInventory('bread');
        return ['give bread', 'feed goat', 'drop bread'].map((command) => {
            game.textWindow = null;
            game.executeParserCommand(command);
            return game.message;
        });
    });
    expect(replies[0]).toMatch(/to whom\?/);
    expect(replies[1]).toMatch(/with what\?/);
    expect(replies[2]).toMatch(/where\?/);
});

test('room-entry warnings survive the room description in both interfaces', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        const enter = (mode, room, setup) => {
            game.restart();
            game.setInterfaceMode(mode, false);
            setup();
            game.textWindow = null;
            game.goToRoom(room, 90, 330);
            const first = { window: game.textWindow && game.textWindow.text, live: game.dom.accessibility.textContent };
            game.dismissTextWindow();
            const next = mode === 'classic' ? game.textWindow && game.textWindow.text : game.dom.accessibility.textContent;
            return { first, next };
        };
        const out = {
            cragClassic: enter('classic', 'crag_path', () => {}),
            cragEnhanced: enter('enhanced', 'crag_path', () => {}),
            cloudClassic: enter('classic', 'cloud_realm', () => game.addToInventory('ring_of_mist'))
        };
        game.setInterfaceMode('enhanced', false);
        return out;
    });
    for (const key of ['cragClassic', 'cragEnhanced']) {
        expect(result[key].first.window, key).toContain('stick strike stone');
        expect(result[key].first.live, key).toContain('stick strike stone');
        expect(result[key].next, key).toContain('cliff path');
    }
    expect(result.cloudClassic.first.window).toContain('ring is in your pocket');
    expect(result.cloudClassic.next).toContain('floor of cloud');
});

test('a warning raised at the end of a scripted walk is not overwritten either', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.setInterfaceMode('classic', false);
        game.addToInventory('ring_of_mist');
        game.setFlag('troll_routed');
        game.goToRoom('troll_bridge', 500, 196);
        game.textWindow = null;
        game._textQueue = [];
        game.rooms.troll_bridge.hotspots.find((h) => h.name === 'the beanstalk').walk(game.actionScope);
        for (let frame = 0; frame < 600 && game.currentRoomId !== 'cloud_realm'; frame++) game.update(1000 / 60);
        const first = game.textWindow && game.textWindow.text;
        game.dismissTextWindow();
        const next = game.textWindow && game.textWindow.text;
        game.setInterfaceMode('enhanced', false);
        return { room: game.currentRoomId, first, next };
    });
    expect(result.room).toBe('cloud_realm');
    expect(result.first).toContain('ring is in your pocket');
    expect(result.next).toContain('floor of cloud');
});

test('collecting the chest last still announces the tower after the bargain', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.addToInventory('shield_of_ardor');
        game.addToInventory('mirror_of_ianthe');
        game.goToRoom('well_bottom', 320, 330);
        game.textWindow = null;
        game.executeParserCommand('say Mendharbe');
        const first = game.textWindow && game.textWindow.text;
        game.dismissTextWindow();
        return { first, second: game.textWindow && game.textWindow.text, chest: game.hasItem('chest_of_cormac') };
    });
    expect(result.first).toContain('Thirty years');
    expect(result.second).toContain('begun to shine');
    expect(result.chest).toBe(true);
});

test('the gnome answers wrong guesses and the enhanced prompt accepts the name', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('well_bottom', 320, 330);
        game.textWindow = null;
        const guess = (text) => { game.textWindow = null; game.executeParserCommand(`say ${text}`); return game.message; };
        const wrong = [guess('bob'), guess('rumpelstiltskin'), guess('ebrahdnem')];
        const afterWrong = game.hasItem('chest_of_cormac');
        game.textWindow = null;
        game.startDialog('gnome');
        game._advanceDialog();
        game.selectDialogOption(game.activeDialog.visibleOptions.findIndex((o) => o.text.includes('I know your name')));
        game.dismissTextWindow();
        const prompted = game.isTextPromptOpen();
        game.dom.sayInput.value = 'Mendharbe';
        game.dom.sayForm.requestSubmit();
        return { wrong, afterWrong, prompted, closed: !game.isTextPromptOpen(), chest: game.hasItem('chest_of_cormac'), score: game.score };
    });
    expect(result.afterWrong).toBe(false);
    expect(result.wrong[1]).toContain('Everyone tries that one');
    expect(result.wrong[2]).toContain('vain');
    expect(result).toMatchObject({ prompted: true, closed: true, chest: true, score: 25 });
});

async function reachDuel(page) {
    await page.evaluate(() => {
        const game = window.engine;
        ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'].forEach((id) => game.addToInventory(id));
        game.goToRoom('amber_tower', 320, 340);
        game.textWindow = null;
        game._textQueue = [];
        const sockets = game.rooms.amber_tower.hotspots.find((h) => h.name === 'the sockets');
        ['chest_of_cormac', 'shield_of_ardor', 'mirror_of_ianthe'].forEach((id) => sockets.useItem(game.actionScope, id));
        for (let i = 0; i < 40 && game.sequence; i++) game.skipSequence();
        if (game.cutscene) game.skipCutscene();
    });
}

test('the duel waits for the mirror, and waiting too long kills with a fair retry', async ({ page }) => {
    await reachDuel(page);
    const result = await page.evaluate(() => {
        const game = window.engine;
        const pause = { pending: game.getFlag('duel_pending'), shield: game.hasItem('shield_of_ardor'), won: game.won };
        const tick = (ms) => { for (let t = 0; t < ms; t += 100) { if (game.textWindow) game.dismissTextWindow(); game.update(100); } };
        game.executeParserCommand('use chest on morvane');
        tick(15000);
        const died = game.dead;
        game.tryAgain();
        const retry = { dead: game.dead, pending: game.getFlag('duel_pending'), mirror: game.hasItem('mirror_of_ianthe'), room: game.currentRoomId };
        game.textWindow = null;
        game.executeParserCommand('use mirror on morvane');
        const score = game.score;
        for (let i = 0; i < 400 && !game.won; i++) {
            if (game.cutscene) game.skipCutscene();
            if (game.sequence) game.skipSequence();
            if (game.textWindow) game.dismissTextWindow();
            game.update(100);
        }
        return { pause, died, retry, won: game.won, score };
    });
    expect(result.pause).toEqual({ pending: true, shield: false, won: false });
    expect(result.died).toBe(true);
    expect(result.retry).toEqual({ dead: false, pending: true, mirror: true, room: 'amber_tower' });
    expect(result.score).toBe(30);
    expect(result.won).toBe(true);
});

test('a save during the duel pause restores to the same pause', async ({ page }) => {
    await reachDuel(page);
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.textWindow = null;
        game.saveGame(0);
        game.restart();
        game.loadGame(0);
        return { pending: game.getFlag('duel_pending'), mirror: game.hasItem('mirror_of_ianthe'), morvane: !game.rooms.amber_tower.hotspots.find((h) => h.name === 'Morvane').hidden };
    });
    expect(result).toEqual({ pending: true, mirror: true, morvane: true });
});

test('optional awards are guarded and ranks separate the minimal and full routes', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        const rules = window.CrownQuestContent.rules;
        const optional = rules.optionalAwards.reduce((sum, id) => sum + rules.awards[id], 0);
        const required = game.maxScore - optional;
        game.goToRoom('study', 300, 336);
        const ledger = game.rooms.study.hotspots.find((h) => h.name === 'the ledger');
        ledger.look(game.actionScope);
        ledger.look(game.actionScope);
        const ranks = game.game.victory.ranks;
        const rankFor = (score) => ranks.find((tier) => score / game.maxScore >= tier.min).title;
        return { optional, required, ledgerScore: game.score, minimal: rankFor(required), full: rankFor(game.maxScore), middle: rankFor(required + 12) };
    });
    expect(result).toMatchObject({ optional: 20, required: 250, ledgerScore: 3 });
    expect(new Set([result.minimal, result.middle, result.full]).size).toBe(3);
});

test('the following goat answers LOOK and TALK wherever it is drawn', async ({ page }) => {
    const replies = await page.evaluate(() => {
        const game = window.engine;
        game.setFlag('goat_follows');
        return ['harbour_road', 'village_green', 'dark_wood', 'troll_bridge'].map((room) => {
            game.setFlag('troll_routed', room === 'troll_bridge');
            game.goToRoom(room, 400, 354);
            game.textWindow = null;
            game._textQueue = [];
            game.sequence = null;
            game.executeParserCommand('look goat');
            const look = game.message;
            game.executeParserCommand('talk goat');
            return { room, look, talk: game.message };
        });
    });
    for (const reply of replies) {
        expect(reply.look, reply.room).not.toContain("don't see");
        expect(reply.talk, reply.room).toContain('Maa');
    }
});

test('asking Corvus for the feather hands it over, once', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('study', 300, 336);
        game.textWindow = null;
        game.startDialog('corvus');
        game._advanceDialog();
        game.selectDialogOption(game.activeDialog.visibleOptions.findIndex((o) => o.text.includes('feather')));
        game._advanceDialog();
        game.activeDialog = null;
        const held = game.hasItem('raven_feather');
        const score = game.score;
        const perch = game.rooms.study.hotspots.find((h) => h.name === 'the feather');
        return { held, score, perchHidden: perch.hidden };
    });
    expect(result).toEqual({ held: true, score: 3, perchHidden: true });
});

test('Fennow offers the ring before Rowan accepts it', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        const greeting = game.dialogs.fennow.topics[0].text;
        game.setFlag('has_ring');
        return { before: greeting, after: game.dialogs.fennow.topics[0].text };
    });
    expect(result.before).toContain('This is yours');
    expect(result.after).not.toContain('This is yours');
});

test('hints never prescribe a finished step', async ({ page }) => {
    const hints = await page.evaluate(() => {
        const game = window.engine;
        const hintAt = (room, setup) => { game.restart(); setup(); game.goToRoom(room, 300, 340); return game.rooms[room].hint(game); };
        return {
            scullery: hintAt('scullery', () => { ['bread', 'pail', 'thimble'].forEach((id) => game.addToInventory(id)); game.setFlag('circle_salt'); }),
            well: hintAt('well_bottom', () => { ['gnome_named', 'dragon_doused'].forEach((f) => game.setFlag(f)); game.addToInventory('pail'); })
        };
    });
    expect(hints.scullery).not.toContain('Take a pinch');
    expect(hints.well).not.toContain('Fill your pail');
});

test('a walk that can only slide along a wall stops instead of spinning forever', async ({ page }) => {
    const result = await page.evaluate(() => {
        const game = window.engine;
        game.goToRoom('harbour_road', 320, 330);
        game.textWindow = null;
        game.clearBarriers();
        game.addBarrier(200, 300, 40, 60);
        game.playerX = 250; game.playerY = 330;
        game.playerTargetX = 100; game.playerTargetY = 330;
        game.playerWalking = true;
        let frames = 0;
        for (; frames < 600 && game.playerWalking; frames++) game.update(16);
        return { stopped: !game.playerWalking, frames };
    });
    expect(result.stopped).toBe(true);
    expect(result.frames).toBeLessThan(100);
});
