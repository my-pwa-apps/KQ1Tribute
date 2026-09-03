// ============================================================
// Crown Quest - PROCEDURAL SOUND ENGINE
// All sounds generated with Web Audio API — no audio files
// ============================================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = false;
        this.volume = 0.3;
        this.blocked = false;
        this.onStateChange = null;
        // Called with a short label when a significant sound cannot be heard
        // (muted, suspended, or Web Audio unavailable) so the UI can caption it.
        this.onInaudibleCue = null;
    }

    /** Report a sound the player cannot currently hear, for visual captioning. */
    _cue(label) {
        if (!this.onInaudibleCue) return;
        if (this.getStatus() === 'on') return;
        this.onInaudibleCue(label);
    }

    /** Create AudioContext on first user gesture (required by browsers). Safe to call multiple times. */
    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                return this.ctx.resume().then(() => {
                    this.blocked = false;
                    if (this.onStateChange) this.onStateChange();
                    return true;
                }).catch(() => {
                    this.blocked = true;
                    if (this.onStateChange) this.onStateChange();
                    return false;
                });
            }
            return Promise.resolve(this.ctx.state === 'running');
        }
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) throw new Error('Web Audio API unavailable');
            this.ctx = new AudioContextClass();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : this.volume;
            this.master.connect(this.ctx.destination);
            this.ctx.addEventListener('statechange', () => {
                if (this.onStateChange) this.onStateChange();
            });
            return this.init();
        } catch (e) {
            this.blocked = true;
            console.warn('Web Audio API not available');
            if (this.onStateChange) this.onStateChange();
            return Promise.resolve(false);
        }
    }

    getStatus() {
        if (this.blocked) return 'blocked';
        if (this.muted) return 'off';
        if (this.ctx && this.ctx.state === 'suspended') return 'paused';
        return 'on';
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.value = m ? 0 : this.volume;
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    // ---- Utility: oscillator with exponential decay envelope ----
    _osc(type, freq, start, dur, vol) {
        if (!this.ctx) return null;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(Math.min(vol || 0.3, 1), start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.connect(g);
        g.connect(this._ambientDest || this.master);
        o.start(start);
        o.stop(start + dur + 0.01);
        o.onended = () => { g.disconnect(); };
        return o;
    }

    // ---- Utility: filtered noise burst ----
    _noise(start, dur, vol, freq) {
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate;
        const samples = Math.max(1, Math.floor(sr * dur));
        const buf = this.ctx.createBuffer(1, samples, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(Math.min(vol || 0.1, 1), start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        if (freq) {
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = freq;
            f.Q.value = 1;
            src.connect(f);
            f.connect(g);
            src.onended = () => { f.disconnect(); g.disconnect(); };
        } else {
            src.connect(g);
            src.onended = () => { g.disconnect(); };
        }
        g.connect(this._ambientDest || this.master);
        src.start(start);
    }

    _t() { return this.ctx ? this.ctx.currentTime : 0; }

    // ================================================================
    // SOUND EFFECTS
    // ================================================================

    /** Soft boot-tap — plays on walking frame changes */
    footstep() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.05, 0.06, 900);
        this._osc('sine', 110 + Math.random() * 40, t, 0.04, 0.04);
    }

    /** Short click for action button / UI interaction */
    uiClick() {
        if (!this.ctx) return;
        const t = this._t();
        this._osc('square', 900, t, 0.025, 0.06);
        this._osc('sine', 1200, t + 0.012, 0.02, 0.04);
    }

    /** Ascending chime — item acquired (3-voice chiptune arpeggio) */
    pickup() {
        this._cue('item acquired');
        if (!this.ctx) return;
        const t = this._t();
        // Voice 1 (Lead square)
        this._osc('square', 659.25, t, 0.08, 0.09);         // E5
        this._osc('square', 830.61, t + 0.06, 0.08, 0.09);  // G#5
        this._osc('square', 987.77, t + 0.12, 0.08, 0.10);  // B5
        this._osc('square', 1318.51, t + 0.18, 0.22, 0.12); // E6
        // Voice 2 (Harmonic accompaniment)
        this._osc('triangle', 329.63, t, 0.15, 0.08);       // E4
        this._osc('triangle', 493.88, t + 0.12, 0.28, 0.08); // B4
        // Voice 3 (Chiptune sparkle)
        this._osc('sine', 1318.51, t + 0.18, 0.25, 0.06);
        this._osc('sine', 1661.22, t + 0.24, 0.20, 0.04);
    }

    /** Rising arpeggio — score points earned (Tandy 3-voice flourish) */
    scoreUp() {
        this._cue('points scored');
        if (!this.ctx) return;
        const t = this._t();
        // Voice 1 (Lead pulse arpeggio)
        this._osc('square', 523.25, t, 0.06, 0.08);         // C5
        this._osc('square', 659.25, t + 0.05, 0.06, 0.08);  // E5
        this._osc('square', 783.99, t + 0.10, 0.06, 0.08);  // G5
        this._osc('square', 1046.50, t + 0.15, 0.22, 0.10); // C6
        // Voice 2 (Harmonic 3rd)
        this._osc('triangle', 261.63, t, 0.12, 0.07);       // C4
        this._osc('triangle', 523.25, t + 0.10, 0.25, 0.06); // C5
        // Voice 3 (Upper shimmer)
        this._osc('sine', 1046.50, t + 0.15, 0.24, 0.06);
        this._osc('sine', 1318.51, t + 0.20, 0.18, 0.04);
    }

    /** Hydraulic hiss + mechanical clunk */
    doorOpen() {
        this._cue('door opens');
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.35, 0.1, 600);
        this._osc('sawtooth', 80, t, 0.12, 0.08);
        this._osc('sine', 250, t + 0.04, 0.25, 0.05);
    }

    /** Soft whoosh for screen transitions */
    roomTransition() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.25, 0.045, 2000);
        this._osc('sine', 350, t, 0.08, 0.03);
        this._osc('sine', 500, t + 0.04, 0.12, 0.025);
    }

    /** Descending buzzer — player died (Dissonant minor downward crash) */
    death() {
        this._cue('you have died');
        if (!this.ctx) return;
        const t = this._t();
        const o1 = this._osc('sawtooth', 466.16, t, 0.7, 0.16); // Bb4
        if (o1) o1.frequency.exponentialRampToValueAtTime(55, t + 0.7);
        const o2 = this._osc('square', 440, t, 0.65, 0.12);    // A4 (dissonant semitone)
        if (o2) o2.frequency.exponentialRampToValueAtTime(50, t + 0.65);
        this._noise(t + 0.08, 0.6, 0.06, 1200);
        this._osc('sawtooth', 110, t + 0.25, 0.55, 0.09);
    }

    /** Triumphant fanfare — victory! (4-voice brassy chiptune cadence) */
    victory() {
        this._cue('victory fanfare');
        if (!this.ctx) return;
        const t = this._t();
        // Fanfare motif
        const notes = [
            { f: 523.25, tOfs: 0.00, dur: 0.12 }, // C5
            { f: 659.25, tOfs: 0.12, dur: 0.12 }, // E5
            { f: 783.99, tOfs: 0.24, dur: 0.12 }, // G5
            { f: 1046.50, tOfs: 0.36, dur: 0.30 }, // C6
            { f: 880.00, tOfs: 0.68, dur: 0.14 }, // A5
            { f: 1046.50, tOfs: 0.84, dur: 0.14 }, // C6
            { f: 1174.66, tOfs: 1.00, dur: 0.60 }  // D6
        ];
        notes.forEach(n => {
            this._osc('square', n.f, t + n.tOfs, n.dur, 0.12);
            this._osc('triangle', n.f * 0.5, t + n.tOfs, n.dur, 0.08);
            this._osc('sine', n.f * 2, t + n.tOfs, n.dur * 0.8, 0.04);
        });
        // Final sustained grand chord
        this._osc('square', 1046.50, t + 1.6, 1.2, 0.10); // C6
        this._osc('square', 1318.51, t + 1.6, 1.2, 0.08); // E6
        this._osc('square', 1567.98, t + 1.6, 1.2, 0.08); // G6
        this._osc('triangle', 523.25, t + 1.6, 1.4, 0.12); // C5 bass
    }

    /** Descending zap — energy weapon */
    /** Steel on steel — a blade drawn or a blow parried */
    swordClash() {
        this._cue('steel rings');
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.12, 0.16, 5200);
        this._osc('triangle', 2400, t, 0.10, 0.09);
        this._osc('triangle', 1600, t + 0.03, 0.22, 0.06);
        const o = this._osc('sawtooth', 900, t, 0.28, 0.05);
        if (o) o.frequency.exponentialRampToValueAtTime(300, t + 0.28);
    }

    /** Low double-buzz — action failed */
    error() {
        this._cue('that did not work');
        if (!this.ctx) return;
        const t = this._t();
        this._osc('square', 220, t, 0.1, 0.08);
        this._osc('square', 165, t + 0.1, 0.15, 0.06);
    }

    /** Ascending triple-beep — game saved/loaded */
    save() {
        this._cue('game saved');
        if (!this.ctx) return;
        const t = this._t();
        this._osc('sine', 550, t, 0.05, 0.07);
        this._osc('sine', 740, t + 0.05, 0.05, 0.07);
        this._osc('sine', 990, t + 0.1, 0.1, 0.05);
    }

    /** Harsh scraping — prying a lid, dragging stone */
    metalScrape() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.45, 0.09, 400);
        const o = this._osc('sawtooth', 120, t, 0.35, 0.1);
        if (o) o.frequency.linearRampToValueAtTime(280, t + 0.35);
        this._osc('sawtooth', 90, t + 0.08, 0.25, 0.07);
    }

    /** Ethereal shimmer — enchantment takes hold */
    magicChime() {
        this._cue('a chime of magic');
        if (!this.ctx) return;
        const t = this._t();
        this._osc('sine', 523.25, t, 0.5, 0.045);
        this._osc('sine', 783.99, t + 0.06, 0.45, 0.035);
        this._osc('sine', 1046.5, t + 0.12, 0.4, 0.028);
        this._osc('triangle', 1568, t + 0.18, 0.35, 0.016);
    }

    /** A spell released — rising shimmer with a soft thump of displaced air */
    castSpell() {
        this._cue('a spell is cast');
        if (!this.ctx) return;
        const t = this._t();
        const o = this._osc('sine', 260, t, 0.65, 0.07);
        if (o) o.frequency.exponentialRampToValueAtTime(1900, t + 0.6);
        this._osc('triangle', 520, t + 0.05, 0.5, 0.035);
        this._noise(t + 0.2, 0.45, 0.04, 2600);
        this._osc('sine', 65, t + 0.55, 0.3, 0.06);
    }

    /** Main title fanfare — a bright heraldic call over a sustained drone. */
    titleTheme() {
        if (!this.ctx) return;
        const t = this._t();
        // Heraldic trumpet call on the tonic triad, answered a fourth higher.
        const melody = [392.00, 523.25, 587.33, 659.25, 523.25, 659.25, 783.99];
        melody.forEach((freq, i) => {
            const offset = i < 4 ? i * 0.17 : 0.75 + (i - 4) * 0.19;
            const duration = i === melody.length - 1 ? 0.7 : 0.15;
            this._osc('square', freq, t + offset, duration, 0.05);
            this._osc('triangle', freq * 0.5, t + offset, duration + 0.06, 0.038);
        });
        this._osc('sine', 130.81, t, 1.9, 0.045);
        this._osc('sine', 196.00, t + 1.15, 0.6, 0.032);
    }

    /** Rowan's motif — a light, hopeful running figure that never quite lands. */
    playerMotif() {
        if (!this.ctx) return;
        const t = this._t();
        const notes = [293.66, 349.23, 440.00, 587.33, 523.25];
        notes.forEach((freq, i) => {
            const offset = i < 4 ? i * 0.12 : 0.58;
            this._osc('square', freq, t + offset, i === 4 ? 0.36 : 0.10, 0.042);
            if (i < 4) this._osc('triangle', freq * 0.5, t + offset, 0.16, 0.024);
        });
    }

    /** Morvane's leitmotif — a descending chromatic tread heard near his work. */
    sorcererMotif() {
        if (!this.ctx) return;
        const t = this._t();
        const notes = [110.00, 103.83, 98.00, 92.50];
        notes.forEach((freq, i) => {
            const offset = i * 0.30;
            this._osc('sawtooth', freq, t + offset, 0.40, 0.042);
            this._osc('sine', freq * 2.02, t + offset + 0.03, 0.32, 0.022);
        });
        this._osc('triangle', 55, t, 1.45, 0.05);
    }

    /** Dramatic title flourish — game begins. */
    gameStart() {
        this.titleTheme();
    }

    /** Deep boom — collapsing stone, thunder, a giant's footfall */
    explosion() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.5, 0.18, 200);
        this._noise(t + 0.04, 0.35, 0.12, 600);
        this._osc('sine', 50, t, 0.3, 0.1);
        this._osc('sawtooth', 35, t + 0.06, 0.35, 0.07);
    }

    /** Coins on a counter — commerce */
    sell() {
        if (!this.ctx) return;
        const t = this._t();
        this._osc('triangle', 1300, t, 0.035, 0.1);
        this._osc('triangle', 1600, t + 0.035, 0.035, 0.08);
        this._osc('sine', 2100, t + 0.07, 0.1, 0.06);
        this._noise(t + 0.05, 0.025, 0.04, 4000);
    }

    /** Muttered speech blips */
    talk() {
        if (!this.ctx) return;
        const t = this._t();
        const base = 150 + Math.random() * 70;
        for (let i = 0; i < 4; i++) {
            this._osc('triangle', base + Math.random() * 45, t + i * 0.06, 0.045, 0.025);
        }
    }

    /** Gulp/pour — drinking a potion or a draught of ale */
    drink() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.1, 0.04, 1200);
        this._osc('sine', 180, t + 0.03, 0.07, 0.025);
        this._osc('sine', 220, t + 0.07, 0.08, 0.02);
    }

    /** Something heavy enters water — a bucket, a stone, a hero */
    splash() {
        if (!this.ctx) return;
        const t = this._t();
        this._noise(t, 0.35, 0.13, 900);
        this._noise(t + 0.06, 0.5, 0.07, 2600);
        const o = this._osc('sine', 320, t, 0.2, 0.05);
        if (o) o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
    }

    /** Rising sweep — a magic door swallows you */
    teleport() {
        if (!this.ctx) return;
        const t = this._t();
        const o = this._osc('sine', 220, t, 0.7, 0.08);
        if (o) o.frequency.exponentialRampToValueAtTime(1800, t + 0.7);
        this._osc('triangle', 440, t, 0.5, 0.04);
        this._noise(t + 0.15, 0.55, 0.05, 1500);
    }

    /** A dragon draws breath and objects to your presence */
    dragonRoar() {
        this._cue('a dragon roars');
        if (!this.ctx) return;
        const t = this._t();
        const o = this._osc('sawtooth', 90, t, 1.1, 0.11);
        if (o) o.frequency.exponentialRampToValueAtTime(42, t + 1.1);
        this._osc('square', 62, t + 0.05, 0.95, 0.06);
        this._noise(t, 1.2, 0.09, 320);
        this._noise(t + 0.3, 0.8, 0.05, 1400);
    }

    /** Two-tone alert — a warning horn on the walls */
    alarm() {
        if (!this.ctx) return;
        const t = this._t();
        this._osc('square', 800, t, 0.12, 0.05);
        this._osc('square', 600, t + 0.12, 0.12, 0.05);
    }

    /** Quick blip — text appears */
    blip() {
        if (!this.ctx) return;
        const t = this._t();
        this._osc('sine', 700, t, 0.035, 0.03);
    }

    // ================================================================
    // AMBIENT / LOOPING SOUND SYSTEM
    // Procedural background audio that loops per-room
    // ================================================================

    /** Stop any currently playing ambient sound */
    stopAmbient() {
        if (this._ambientTimer) {
            clearInterval(this._ambientTimer);
            this._ambientTimer = null;
        }
        // Disconnecting the bus silences tones that were already scheduled;
        // clearing the interval alone only stops future ones.
        if (this._ambientBus) {
            try { this._ambientBus.disconnect(); } catch { /* already detached */ }
            this._ambientBus = null;
        }
        this._ambientDest = null;
        this._ambientType = null;
    }

    /** Run an ambient loop with every source it creates routed to the ambient bus. */
    _startAmbientLoop(body, intervalMs) {
        this._ambientTimer = setInterval(() => {
            if (this.muted || !this.ctx || !this._ambientBus) return;
            this._ambientDest = this._ambientBus;
            try { body(); } finally { this._ambientDest = null; }
        }, intervalMs);
    }

    /** Start a looping ambient sound for the given room type */
    startAmbient(type) {
        if (!this.ctx) return;
        this.stopAmbient();
        this._ambientType = type;
        this._ambientBus = this.ctx.createGain();
        this._ambientBus.connect(this.master);

        switch (type) {
            case 'tower':
                // The sorcerer's house: a low unsettled drone and the tick of
                // something arcane counting down.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._osc('sine', 58 + Math.random() * 4, t, 2.0, 0.022);
                    this._osc('sine', 87, t + 0.3, 1.4, 0.012);
                    this._osc('triangle', 1180, t + 0.5, 0.04, 0.012);
                    this._osc('triangle', 1180, t + 1.5, 0.04, 0.012);
                    if (Math.random() > 0.65) this._osc('sawtooth', 41, t + Math.random(), 0.9, 0.018);
                }, 2200);
                break;

            case 'forest':
                // Birdsong over a soft wash of leaves.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._noise(t, 2.4, 0.014, 900 + Math.random() * 300);
                    const calls = 1 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < calls; i++) {
                        const dt = Math.random() * 2;
                        const f = 1500 + Math.random() * 900;
                        this._osc('sine', f, t + dt, 0.06, 0.016);
                        this._osc('sine', f * 1.28, t + dt + 0.07, 0.05, 0.012);
                    }
                }, 2600);
                break;

            case 'wind':
                // Exposed high ground: sustained wind with occasional gusts.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._noise(t, 2.5, 0.022, 380 + Math.random() * 220);
                    if (Math.random() > 0.5) this._noise(t + 0.5, 1.5, 0.03, 300 + Math.random() * 300);
                }, 2800);
                break;

            case 'cave_drip':
                // Echoing drips over a deep cavern resonance.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._osc('sine', 55, t, 2.0, 0.012);
                    const drips = 2 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < drips; i++) {
                        this._osc('sine', 800 + Math.random() * 400, t + Math.random() * 2, 0.06, 0.015);
                    }
                }, 2500);
                break;

            case 'sea':
                // Surf rolling in and drawing back, with distant gulls.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._noise(t, 1.5, 0.03, 520);
                    this._noise(t + 1.4, 1.3, 0.018, 320);
                    if (Math.random() > 0.6) {
                        const f = 1100 + Math.random() * 300;
                        this._osc('sawtooth', f, t + Math.random() * 2, 0.09, 0.012);
                        this._osc('sawtooth', f * 0.86, t + Math.random() * 2 + 0.12, 0.09, 0.010);
                    }
                }, 3000);
                break;

            case 'hearth':
                // A hall with a fire in it: crackle plus a warm room tone.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._osc('sine', 70, t, 2.2, 0.014);
                    const pops = 3 + Math.floor(Math.random() * 4);
                    for (let i = 0; i < pops; i++) {
                        this._noise(t + Math.random() * 2, 0.03, 0.02, 1800 + Math.random() * 2500);
                    }
                }, 2300);
                break;

            case 'village':
                // Distant chatter and the odd hammer on an anvil.
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._noise(t, 2.0, 0.013, 300);
                    for (let i = 0; i < 3; i++) {
                        this._osc('triangle', 130 + Math.random() * 90, t + Math.random() * 1.5, 0.04, 0.008);
                    }
                    if (Math.random() > 0.55) {
                        const dt = Math.random() * 1.6;
                        this._osc('triangle', 2100, t + dt, 0.05, 0.014);
                        this._osc('triangle', 1650, t + dt + 0.02, 0.09, 0.009);
                    }
                }, 2400);
                break;

            case 'dungeon':
                // Morvane's reach: the sorcerer motif over a chromatic drone.
                this.sorcererMotif();
                this._startAmbientLoop(() => {
                    const t = this._t();
                    this._osc('sawtooth', 38, t, 2.2, 0.02);
                    this._osc('sine', 76.5, t + 0.1, 1.8, 0.015);
                    this._osc('sine', 150, t + 0.5, 0.3, 0.012);
                    this._osc('sine', 142, t + 1.3, 0.3, 0.012);
                    if (Math.random() > 0.4) this._noise(t + Math.random() * 1.5, 0.2, 0.01, 1500);
                }, 2400);
                break;
        }
    }

    /** Release AudioContext resources */
    dispose() {
        this.stopAmbient();
        if (this.ctx) {
            try { this.ctx.close(); } catch (e) { /* already closed */ }
            this.ctx = null;
            this.master = null;
        }
    }
}
