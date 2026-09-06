const { test, expect } = require('@playwright/test');

test('procedural cues and ambience produce finite, audible output with headroom and working mute', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'offline audio is independent of viewport');
    await page.goto('/');
    const report = await page.evaluate(async () => {
        const cues = ['footstep', 'uiClick', 'pickup', 'scoreUp', 'doorOpen', 'roomTransition',
            'death', 'victory', 'swordClash', 'error', 'save', 'metalScrape', 'magicChime',
            'castSpell', 'titleTheme', 'playerMotif', 'sorcererMotif', 'gameStart', 'explosion',
            'sell', 'talk', 'drink', 'splash', 'teleport', 'dragonRoar', 'alarm', 'blip'];
        const ambience = ['tower', 'forest', 'wind', 'cave_drip', 'sea', 'hearth', 'village', 'dungeon'];
        const originalRandom = Math.random;
        let seed = 173;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
        const results = [];
        try {
            for (const name of [...cues, ...ambience.map(type => `ambient:${type}`), 'muted', 'bridge-mix']) {
                const sound = new window.engine.sound.constructor();
                sound.ctx = new OfflineAudioContext(1, 44100 * 10, 44100);
                sound.master = sound.ctx.createGain();
                sound.master.gain.value = sound.volume;
                sound.master.connect(sound.ctx.destination);
                let clock = 0;
                sound._t = () => clock;
                sound._startAmbientLoop = (body, intervalMs) => {
                    sound._ambientDest = sound._ambientBus;
                    for (clock = 0; clock < 7; clock += intervalMs / 1000) body();
                    sound._ambientDest = null;
                    clock = 0;
                };
                if (name.startsWith('ambient:')) sound.startAmbient(name.slice(8));
                else if (name === 'muted') {
                    sound.setMuted(true);
                    sound.victory();
                    sound.explosion();
                } else if (name === 'bridge-mix') {
                    sound.startAmbient('wind');
                    sound.footstep();
                    clock = 1.1;
                    sound.explosion();
                    clock = 2.1;
                    sound.splash();
                    clock = 3.2;
                    sound.scoreUp();
                } else sound[name]();
                const buffer = await sound.ctx.startRendering();
                let peak = 0;
                let nonFinite = 0;
                let energy = 0;
                for (const sample of buffer.getChannelData(0)) {
                    if (!Number.isFinite(sample)) nonFinite++;
                    peak = Math.max(peak, Math.abs(sample));
                    energy += sample * sample;
                }
                results.push({ name, peak, nonFinite, rms: Math.sqrt(energy / buffer.length) });
                sound.stopAmbient();
            }
        } finally {
            Math.random = originalRandom;
        }
        return results;
    });
    await testInfo.attach('audio-levels', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect(report).toHaveLength(37);
    for (const result of report) {
        expect(result.nonFinite, result.name).toBe(0);
        expect(result.peak, result.name).toBeLessThan(0.95);
        if (result.name === 'muted') expect(result.peak).toBe(0);
        else {
            expect(result.peak, result.name).toBeGreaterThan(0.0001);
            expect(result.rms, result.name).toBeGreaterThan(0);
        }
    }
});