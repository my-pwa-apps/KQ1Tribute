/* ======================================================
   King's Quest: The Darkened Mirror — Procedural Audio
   
   SN76496-inspired PSG audio system.
   The AGI engine used the TI SN76496 (PCjr) or compatible
   Programmable Sound Generator with:
     - 3 square wave tone channels
     - 1 noise channel (LFSR-based)
     - 4-bit attenuation (volume) per channel
   
   Source: AGILE (lanceewing/agile-gdx) SoundPlayer.java
   and ScummVM engines/agi/sound_pcjr.cpp
   ====================================================== */

class GameAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
        this.musicTimeout = null;

        // SN76496 has 3 tone channels + 1 noise = 4 channels
        this.PSG_CHANNELS = 4;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Play a SN76496-style square wave tone.
     * The SN76496 only produces square waves (50% duty cycle)
     * with 4-bit volume (0-15 attenuation steps).
     */
    playTone(freq, duration, type = 'square', volume = 0.08, delay = 0) {
        if (!this.enabled || !this.ctx) return;
        this.ensureContext();

        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // SN76496 only has square waves; for authenticity,
        // default to square but allow triangle for bass register
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        // SN76496 attenuation: 4-bit (0=max, 15=off), 2dB per step
        // We simulate this with exponential envelope
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
    }

    /**
     * SN76496 noise channel — LFSR-based white/periodic noise.
     * The SN76496 noise uses a 15-bit LFSR with taps at bits 0 and 1.
     */
    playNoise(duration, volume = 0.04, delay = 0) {
        if (!this.enabled || !this.ctx) return;
        this.ensureContext();

        const t = this.ctx.currentTime + delay;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);

        // SN76496 LFSR noise generation (15-bit, taps 0,1)
        let lfsr = 0x4000; // initial seed
        for (let i = 0; i < bufferSize; i++) {
            const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
            lfsr = (lfsr >> 1) | (bit << 14);
            data[i] = (lfsr & 1) ? volume : -volume;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(t);
    }

    /** Play a sequence of notes (melody) across tone channels */
    playMelody(notes, type = 'square', volume = 0.06) {
        let delay = 0;
        for (const [freq, dur] of notes) {
            if (freq > 0) {
                this.playTone(freq, dur, type, volume, delay);
            }
            delay += dur;
        }
    }

    /**
     * Play two voices simultaneously (AGI music had 3 tone channels).
     * This creates a richer, more authentic AGI sound.
     */
    playDualVoice(melody1, melody2, volume = 0.05) {
        this.playMelody(melody1, 'square', volume);
        this.playMelody(melody2, 'square', volume * 0.7);
    }

    // ---- Sound Effects ----

    sfxPickup() {
        this.playTone(523, 0.08, 'square', 0.07);
        this.playTone(659, 0.08, 'square', 0.07, 0.08);
        this.playTone(784, 0.12, 'square', 0.07, 0.16);
    }

    sfxScore() {
        this.playTone(523, 0.1, 'square', 0.06);
        this.playTone(659, 0.1, 'square', 0.06, 0.1);
        this.playTone(784, 0.1, 'square', 0.06, 0.2);
        this.playTone(1047, 0.2, 'square', 0.06, 0.3);
    }

    sfxDeath() {
        // AGI death — descending square wave + noise burst
        this.playMelody([
            [440, 0.25], [370, 0.25], [311, 0.25],
            [262, 0.25], [220, 0.4], [147, 0.6]
        ], 'square', 0.1);
        this.playNoise(1.0, 0.03, 0.3);
    }

    sfxWalk() {
        // Short percussive footstep using low tone
        const freq = 80 + Math.random() * 40;
        this.playTone(freq, 0.04, 'triangle', 0.04);
    }

    sfxDoor() {
        this.playTone(220, 0.15, 'triangle', 0.07);
        this.playTone(165, 0.25, 'triangle', 0.05, 0.15);
    }

    sfxTalk() {
        const freq = 180 + Math.random() * 220;
        this.playTone(freq, 0.06, 'square', 0.04);
    }

    sfxMagic() {
        for (let i = 0; i < 6; i++) {
            this.playTone(
                440 + i * 130 + Math.random() * 50,
                0.2, 'sine', 0.06, i * 0.08
            );
        }
    }

    sfxSplash() {
        // Noise-like splash using SN76496 noise channel
        this.playNoise(0.3, 0.06);
        this.playTone(200, 0.15, 'triangle', 0.04, 0.05);
    }

    sfxError() {
        this.playTone(200, 0.15, 'square', 0.06);
        this.playTone(150, 0.2, 'square', 0.06, 0.15);
    }

    sfxVictory() {
        const fanfare = [
            [523, 0.15], [523, 0.15], [523, 0.15], [523, 0.4],
            [415, 0.4], [466, 0.4], [523, 0.15], [466, 0.1], [523, 0.6]
        ];
        this.playMelody(fanfare, 'square', 0.08);
    }

    sfxDragon() {
        // Dragon roar — deep square waves + noise
        this.playMelody([
            [80, 0.3], [60, 0.4], [50, 0.5]
        ], 'square', 0.12);
        this.playNoise(0.8, 0.05, 0.1);
    }

    sfxFairy() {
        for (let i = 0; i < 8; i++) {
            this.playTone(
                800 + i * 100, 0.15, 'sine', 0.04, i * 0.1
            );
        }
    }

    /** Simple procedural background theme (plays once) — 3-channel PSG style */
    playTheme() {
        if (!this.enabled) return;
        this.ensureContext();
        // Main melody (channel 1 — lead voice)
        const melody = [
            [330, 0.3], [370, 0.3], [415, 0.3], [440, 0.5],
            [415, 0.3], [370, 0.3], [330, 0.5], [0, 0.2],
            [294, 0.3], [330, 0.3], [370, 0.3], [415, 0.5],
            [370, 0.3], [330, 0.3], [294, 0.5], [0, 0.2],
            [262, 0.3], [294, 0.3], [330, 0.5], [370, 0.3],
            [330, 0.3], [294, 0.3], [262, 0.7]
        ];
        // Harmony (channel 2 — accompaniment, a third below)
        const harmony = [
            [262, 0.3], [294, 0.3], [330, 0.3], [349, 0.5],
            [330, 0.3], [294, 0.3], [262, 0.5], [0, 0.2],
            [220, 0.3], [262, 0.3], [294, 0.3], [330, 0.5],
            [294, 0.3], [262, 0.3], [220, 0.5], [0, 0.2],
            [196, 0.3], [220, 0.3], [262, 0.5], [294, 0.3],
            [262, 0.3], [220, 0.3], [196, 0.7]
        ];
        // Bass (channel 3 — root notes, triangle for deeper register)
        const bass = [
            [131, 0.6], [0, 0], [165, 0.6], [175, 1.0],
            [165, 0.6], [0, 0], [131, 0.7], [0, 0.2],
            [110, 0.6], [0, 0], [131, 0.6], [165, 1.0],
            [131, 0.6], [0, 0], [110, 0.7], [0, 0.2],
            [98, 0.6], [0, 0], [110, 0.5], [131, 0.8],
            [110, 0.6], [0, 0], [98, 0.7]
        ];
        this.playMelody(melody, 'square', 0.05);
        this.playMelody(harmony, 'square', 0.03);
        this.playMelody(bass, 'triangle', 0.04);
    }

    /** Short room-enter jingle — AGI-style ascending arpeggio */
    sfxRoomEnter() {
        this.playTone(330, 0.08, 'square', 0.04);
        this.playTone(415, 0.08, 'square', 0.04, 0.08);
        this.playTone(523, 0.12, 'square', 0.04, 0.16);
    }

    /** Parser command accepted beep */
    sfxParserOk() {
        this.playTone(880, 0.06, 'square', 0.04);
    }

    /** AGI-style room transition whoosh (dissolve SFX) */
    sfxDissolve() {
        this.playNoise(0.4, 0.02);
        this.playTone(200, 0.1, 'square', 0.03);
        this.playTone(300, 0.1, 'square', 0.03, 0.1);
    }
}

// Global audio instance
const audio = new GameAudio();
