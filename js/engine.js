/* ======================================================
   King's Quest: The Darkened Mirror — Game Engine
   Core rendering, input, player, state management
   
   Architecture inspired by Sierra Online's AGI engine:
     - ScummVM (engines/agi/) — picture, view, sprite, graphics
     - NAGI by Nick Sonneveld — AGI disassembly clone
     - AGILE by Lance Ewing — Java/libGDX AGI interpreter
     - SCUMM-8 by Liquidream — PICO-8 retro adventure engine
   
   Key AGI features implemented:
     - LFSR dissolve screen transitions (from ScummVM Amiga transition)
     - EGA 16-color palette with CGA-style checkerboard dithering
     - Priority-band depth sorting (Y-based, priorities 4-14)
     - Text parser input (type commands alongside point-and-click)
     - SN76496-style square wave audio chain
   ====================================================== */

// ==================== UTILITIES ====================

/** Seeded PRNG (mulberry32) */
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// ==================== EGA PALETTE ====================
// Authentic IBM EGA 16-color palette (6-bit RGB scaled to 8-bit)
// Source: ScummVM engines/agi/palette.h PALETTE_EGA

const EGA = {
    BLACK: '#000000',
    BLUE: '#0000AA',
    GREEN: '#00AA00',
    CYAN: '#00AAAA',
    RED: '#AA0000',
    MAGENTA: '#AA00AA',
    BROWN: '#AA5500',
    LGRAY: '#AAAAAA',
    DGRAY: '#555555',
    LBLUE: '#5555FF',
    LGREEN: '#55FF55',
    LCYAN: '#55FFFF',
    LRED: '#FF5555',
    LMAGENTA: '#FF55FF',
    YELLOW: '#FFFF55',
    WHITE: '#FFFFFF',
    SKIN: '#FFAA55',
    DGREEN: '#005500',
    DBLUE: '#000077',
    DBROWN: '#553300',
    GOLD: '#CCAA00',
    SKY: '#3355AA',
    SKYLIGHT: '#5577CC',
    WATER: '#2244AA',
    WATERL: '#4466CC',
    STONE: '#888888',
    STONED: '#666666',
    DIRT: '#997744',
    GRASS: '#228822',
    GRASSD: '#116611'
};

// ==================== AGI DISSOLVE TRANSITION ====================
// LFSR-based dissolve effect — from ScummVM engines/agi/graphics.cpp
// Uses Amiga-style XOR polynomial 0x3500 to pseudo-randomly reveal pixels

class DissolveTransition {
    constructor() {
        this.active = false;
        this.lfsrState = 1;
        this.pixelsRevealed = 0;
        this.totalPixels = 320 * 162; // logical game area (y: 8–169)
        this.pixelsPerFrame = 2600;   // ~20 frames to complete
        this.oldImageData = null;
        this.newImageData = null;
        this.canvasWidth = 640;
        this.canvasHeight = 400;
        this.scale = 2;
    }

    start(oldImageData, newImageData, canvasWidth, canvasHeight, scale) {
        this.oldImageData = oldImageData;
        this.newImageData = newImageData;
        this.canvasWidth = canvasWidth || 640;
        this.canvasHeight = canvasHeight || 400;
        this.scale = scale || 2;
        // LFSR cycles through logical 320x162 game-area pixels
        this.totalPixels = 320 * 162;
        this.lfsrState = 1;
        this.pixelsRevealed = 0;
        this.active = true;
    }

    /** Advance one frame. Draws at physical canvas resolution. */
    step(ctx) {
        if (!this.active) return false;

        const s = this.scale;
        const cw = this.canvasWidth;

        for (let i = 0; i < this.pixelsPerFrame; i++) {
            // Advance LFSR (Galois, 16-bit maximal-length)
            // Polynomial from ScummVM: transition_Amiga() — 0x3500
            if (this.lfsrState & 1) {
                this.lfsrState = (this.lfsrState >> 1) ^ 0x3500;
            } else {
                this.lfsrState = this.lfsrState >> 1;
            }

            if (this.lfsrState < this.totalPixels) {
                const lx = this.lfsrState % 320;
                const ly = Math.floor(this.lfsrState / 320);
                // Map logical pixel to physical canvas coordinates
                const px = lx * s;
                const py = (ly + 8) * s;
                // Read colour from new image data at physical coords
                const idx = (py * cw + px) * 4;
                const r = this.newImageData.data[idx];
                const g = this.newImageData.data[idx + 1];
                const b = this.newImageData.data[idx + 2];
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                // Draw a SCALE×SCALE block (one logical pixel)
                ctx.fillRect(px, py, s, s);
                this.pixelsRevealed++;
            }

            // LFSR cycled back to seed — done
            if (this.lfsrState === 1) {
                this.active = false;
                break;
            }
        }

        return this.active;
    }
}

// ==================== AGI PRIORITY SYSTEM ====================
// Depth-sorting by Y position — from ScummVM/NAGI/agile-gdx
// Priority bands 4–14 across the 162-pixel game area
// Objects with higher Y (closer to bottom) draw in front

class PrioritySystem {
    constructor() {
        this.priorityBase = 48; // default: everything above is priority 4
        this.table = new Uint8Array(168);
        this.buildTable();
    }

    buildTable() {
        for (let y = 0; y < 168; y++) {
            if (y < this.priorityBase) {
                this.table[y] = 4;
            } else {
                this.table[y] = Math.min(14,
                    Math.floor((y - this.priorityBase) /
                    ((168 - this.priorityBase) / 10)) + 5);
            }
        }
    }

    /** Get priority for a given Y position (game area, 0-167) */
    fromY(y) {
        return this.table[clamp(Math.floor(y), 0, 167)];
    }

    /** Check if objectA (at yA) should draw in front of objectB (at yB) */
    isFrontOf(yA, yB) {
        return this.fromY(yA) >= this.fromY(yB);
    }
}

// ==================== AGI TEXT PARSER ====================
// Typed text input — from ScummVM engines/agi/words.cpp
// Supports synonym groups, ignored words, and said() pattern matching

class TextParser {
    constructor() {
        // Dictionary: word → groupId  (groupId 0 = ignored)
        this.dictionary = new Map();
        this.lastParsedWords = [];
        this.active = false;
        this.inputBuffer = '';
        this.cursorBlink = 0;

        this._loadDictionary();
    }

    _loadDictionary() {
        // Word groups matching our game's verbs and nouns
        // Based on AGI WORDS.TOK format: groupId → synonyms
        const groups = {
            // ── Verbs ──
            1: ['look', 'examine', 'inspect', 'see', 'view', 'read', 'check'],
            2: ['get', 'take', 'grab', 'pick', 'acquire', 'steal'],
            3: ['use', 'apply', 'put', 'place', 'combine', 'attach'],
            4: ['talk', 'speak', 'ask', 'say', 'tell', 'greet', 'hello', 'hi', 'answer', 'respond', 'reply'],
            5: ['walk', 'go', 'move', 'travel', 'run', 'enter'],
            6: ['open', 'unlock'],
            7: ['give', 'offer', 'show', 'hand'],
            8: ['eat', 'drink', 'taste', 'consume'],
            9: ['push', 'pull', 'move', 'press'],

            // ── Nouns — room objects ──
            20: ['mirror', 'looking glass', 'glass'],
            21: ['throne', 'chair', 'seat'],
            22: ['bread', 'loaf', 'food'],
            23: ['door', 'gate', 'entrance', 'exit'],
            24: ['table', 'desk'],
            25: ['torch', 'flame', 'fire', 'light'],
            26: ['tapestry', 'banner', 'flag', 'hanging'],
            27: ['carpet', 'rug'],
            28: ['key', 'golden key'],
            29: ['guard', 'soldier', 'knight'],
            30: ['merlin', 'wizard', 'mage', 'sorcerer'],
            31: ['tree', 'trees', 'oak'],
            32: ['flower', 'flowers', 'rose', 'roses'],
            33: ['fountain', 'water', 'pool', 'river', 'stream', 'lake', 'well', 'bucket'],
            34: ['bridge', 'crossing'],
            35: ['troll', 'monster', 'beast', 'creature'],
            36: ['sign', 'signpost', 'post'],
            37: ['lantern', 'lamp'],
            38: ['mushroom', 'mushrooms', 'fungus'],
            39: ['witch', 'hag', 'crone', 'sorceress'],
            40: ['cauldron', 'pot', 'kettle'],
            41: ['potion', 'bottle', 'vial', 'elixir'],
            42: ['crystal', 'gem', 'shard', 'crystals'],
            43: ['stalactite', 'stalactites', 'stalagmite'],
            44: ['cave', 'cavern', 'grotto', 'tunnel'],
            45: ['dragon', 'wyrm', 'serpent', 'drake'],
            46: ['treasure', 'gold', 'coins', 'hoard'],
            47: ['sapphire', 'blue gem'],
            48: ['ruby', 'red gem'],
            49: ['emerald', 'green gem'],
            50: ['fairy', 'sprite', 'fae', 'nymph'],
            51: ['cheese'],
            52: ['path', 'road', 'trail'],
            53: ['mountain', 'mountains', 'peak', 'cliff'],
            54: ['forest', 'woods'],
            55: ['castle', 'palace', 'kingdom'],
            56: ['garden', 'courtyard', 'yard'],
            57: ['rock', 'rocks', 'stone', 'stones', 'boulder'],
            58: ['portal', 'teleport', 'gateway'],
            59: ['inventory', 'items', 'stuff', 'bag'],
            60: ['riddle', 'puzzle', 'answer'],
            61: ['skull', 'skulls', 'bones', 'bone', 'skeleton'],
            62: ['web', 'webs', 'cobweb', 'cobwebs', 'spider'],
            63: ['jar', 'jars', 'shelf', 'shelves'],
            64: ['egg', 'eggs', 'nest'],
            65: ['lyre', 'harp', 'instrument', 'music'],
            66: ['map', 'chart', 'atlas'],

            // ── Ignored words (groupId 0) ──
            0: ['a', 'an', 'the', 'at', 'to', 'in', 'on', 'of', 'with',
                'and', 'or', 'my', 'up', 'around', 'about', 'into', 'from',
                'is', 'it', 'this', 'that', 'some', 'please', 'here', 'there'],
        };

        for (const [id, words] of Object.entries(groups)) {
            const groupId = parseInt(id);
            for (const word of words) {
                this.dictionary.set(word.toLowerCase(), groupId);
            }
        }
    }

    /** Parse typed input into word group IDs */
    parse(input) {
        this.lastParsedWords = [];
        const cleaned = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (!cleaned) return { success: false, words: [], unknown: null };

        const tokens = cleaned.split(/\s+/);

        for (const token of tokens) {
            const groupId = this.dictionary.get(token);
            if (groupId === undefined) {
                return { success: false, words: this.lastParsedWords, unknown: token };
            }
            if (groupId === 0) continue; // ignored word (articles, prepositions)
            this.lastParsedWords.push({ word: token, groupId });
        }

        return { success: true, words: this.lastParsedWords, unknown: null };
    }

    /** Check if parsed words match a said() pattern — from AGI said() opcode */
    said(...expectedGroupIds) {
        if (this.lastParsedWords.length < expectedGroupIds.length) return false;
        for (let i = 0; i < expectedGroupIds.length; i++) {
            if (expectedGroupIds[i] === 1) continue;     // anyword wildcard
            if (expectedGroupIds[i] === 9999) return true; // rest-of-line
            if (i >= this.lastParsedWords.length) return false;
            if (this.lastParsedWords[i].groupId !== expectedGroupIds[i]) return false;
        }
        return this.lastParsedWords.length === expectedGroupIds.length;
    }

    /** Get the first verb and noun group IDs from last parse */
    getVerbNoun() {
        const verb = this.lastParsedWords.find(w =>
            w.groupId >= 1 && w.groupId <= 9);
        const noun = this.lastParsedWords.find(w =>
            w.groupId >= 20);
        return {
            verb: verb ? verb.groupId : null,
            noun: noun ? noun.groupId : null,
            verbWord: verb ? verb.word : null,
            nounWord: noun ? noun.word : null,
        };
    }
}

// ==================== EGA DITHERING ====================
// CGA-style checkerboard dithering — from ScummVM render_BlockCGA()
// and NAGI sbuf_util.c even/odd row alternation
// AGI used 2-color mixing to simulate more than 16 colors

/**
 * Draw a dithered rectangle mixing two EGA colors in a checkerboard pattern.
 * This is the authentic AGI technique for shading and gradients.
 */
const _ditherPatterns = new Map();
function ditherRect(ctx, x, y, w, h, color1, color2) {
    const key = color1 + '|' + color2;
    let pat = _ditherPatterns.get(key);
    if (!pat) {
        const c = document.createElement('canvas');
        c.width = 2; c.height = 2;
        const pc = c.getContext('2d');
        pc.fillStyle = color1;
        pc.fillRect(0, 0, 1, 1); pc.fillRect(1, 1, 1, 1);
        pc.fillStyle = color2;
        pc.fillRect(1, 0, 1, 1); pc.fillRect(0, 1, 1, 1);
        pat = ctx.createPattern(c, 'repeat');
        _ditherPatterns.set(key, pat);
    }
    ctx.fillStyle = pat;
    ctx.fillRect(x, y, w, h);
}

/**
 * Draw a dithered rectangle with AGI splatter-brush pattern (LFSR-based).
 * From ScummVM picture.cpp plotPattern() with splatter bit.
 */
function splatterRect(ctx, x, y, w, h, color, density, seed) {
    let t = seed || 1;
    ctx.fillStyle = color;
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            // Advance LFSR — polynomial 0xB8 from AGI splatter brush
            if (t & 1) t = (t >> 1) ^ 0xB8;
            else t = t >> 1;
            if ((t & 0x03) < density) {
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }
}

/**
 * Draw sky with AGI-style dithered bands instead of CSS gradients.
 * AGI couldn't do gradients — it used banded dithering.
 */
function drawDitheredSky(ctx, topColor, midColor, botColor) {
    // Band 1: top — dithered dark+mid (y: 8-35)
    ditherRect(ctx, 0, 8, 320, 28, topColor || EGA.BLUE, midColor || EGA.LBLUE);
    // Band 2: middle — solid mid (y: 36-65)
    ctx.fillStyle = midColor || EGA.LBLUE;
    ctx.fillRect(0, 36, 320, 30);
    // Band 3: bottom — dithered mid+light (y: 66-100)
    ditherRect(ctx, 0, 66, 320, 34, midColor || EGA.LBLUE, botColor || EGA.LCYAN);
}

// ==================== DRAWING HELPERS ====================

function drawSky(ctx, topColor, botColor) {
    // AGI-style banded sky with dithered transitions
    // AGI didn't have gradient fills — used solid+dithered bands
    const top = topColor || EGA.SKY;
    const bot = botColor || EGA.SKYLIGHT;
    // Top band: solid dark
    ctx.fillStyle = top;
    ctx.fillRect(0, 8, 320, 30);
    // Middle band: dithered transition (checkerboard of 2 colors)
    ditherRect(ctx, 0, 38, 320, 25, top, bot);
    // Bottom band: solid light
    ctx.fillStyle = bot;
    ctx.fillRect(0, 63, 320, 37);
}

function drawGround(ctx, y, color, color2) {
    ctx.fillStyle = color || EGA.GRASS;
    ctx.fillRect(0, y, 320, 170 - y);
    if (color2) {
        // Dirt path
        ctx.fillStyle = color2;
        ctx.fillRect(120, y, 80, 170 - y);
    }
}

function drawStars(ctx, seed, count) {
    const rng = mulberry32(seed);
    ctx.fillStyle = EGA.WHITE;
    for (let i = 0; i < count; i++) {
        const sx = Math.floor(rng() * 320);
        const sy = 8 + Math.floor(rng() * 60);
        const bright = rng() > 0.5 ? EGA.WHITE : EGA.YELLOW;
        ctx.fillStyle = bright;
        ctx.fillRect(sx, sy, 1, 1);
    }
}

function drawTree(ctx, x, y, seed, scale) {
    const rng = mulberry32(seed);
    scale = scale || 1;
    const tw = Math.floor((3 + rng() * 3) * scale);
    const th = Math.floor((12 + rng() * 10) * scale);
    // Trunk
    ctx.fillStyle = '#664422';
    ctx.fillRect(x - tw / 2, y - th, tw, th);
    // Canopy layers
    const shades = ['#005500', '#006600', '#007700', '#004400'];
    const clusters = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < clusters; i++) {
        ctx.fillStyle = shades[Math.floor(rng() * shades.length)];
        const cx = x + (rng() - 0.5) * 16 * scale;
        const cy = y - th - 2 * scale + (rng() - 0.5) * 10 * scale;
        const r = (6 + rng() * 8) * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPineTree(ctx, x, y, seed, scale) {
    const rng = mulberry32(seed);
    scale = scale || 1;
    // Trunk
    ctx.fillStyle = '#553311';
    ctx.fillRect(x - 2 * scale, y - 8 * scale, 4 * scale, 8 * scale);
    // Triangle layers
    const layers = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < layers; i++) {
        const w = (14 - i * 3) * scale;
        const h = (8 + rng() * 3) * scale;
        const ly = y - 8 * scale - i * 6 * scale;
        ctx.fillStyle = i % 2 === 0 ? '#005500' : '#006600';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, ly);
        ctx.lineTo(x + w / 2, ly);
        ctx.lineTo(x, ly - h);
        ctx.closePath();
        ctx.fill();
    }
}

function drawCloud(ctx, x, y, seed) {
    const rng = mulberry32(seed);
    ctx.fillStyle = '#DDDDEE';
    const blobs = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < blobs; i++) {
        ctx.beginPath();
        ctx.arc(
            x + (rng() - 0.3) * 25,
            y + (rng() - 0.5) * 6,
            4 + rng() * 6,
            0, Math.PI * 2
        );
        ctx.fill();
    }
}

function drawMountainRange(ctx, seed, y, color1, color2) {
    const rng = mulberry32(seed);
    ctx.fillStyle = color1 || '#555577';
    for (let i = 0; i < 5; i++) {
        const mx = rng() * 320;
        const mw = 60 + rng() * 100;
        const mh = 30 + rng() * 40;
        ctx.beginPath();
        ctx.moveTo(mx - mw / 2, y);
        ctx.lineTo(mx, y - mh);
        ctx.lineTo(mx + mw / 2, y);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        if (color2) {
            ctx.fillStyle = color2;
            ctx.beginPath();
            ctx.moveTo(mx - mw / 8, y - mh + mh / 5);
            ctx.lineTo(mx, y - mh);
            ctx.lineTo(mx + mw / 8, y - mh + mh / 5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = color1;
        }
    }
}

function drawStoneWall(ctx, x, y, w, h, color) {
    ctx.fillStyle = color || EGA.STONE;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 0.5;
    for (let row = 0; row < h; row += 5) {
        const off = (Math.floor(row / 5) % 2) * 8;
        for (let col = -8; col < w; col += 16) {
            ctx.strokeRect(x + col + off, y + row, 16, 5);
        }
    }
}

function drawWater(ctx, x, y, w, h, frame) {
    ctx.fillStyle = EGA.WATER;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = EGA.WATERL;
    ctx.lineWidth = 0.5;
    for (let row = 0; row < h; row += 3) {
        ctx.beginPath();
        for (let col = 0; col <= w; col += 2) {
            const wy = y + row + Math.sin((col + frame * 3) * 0.15) * 1.5;
            if (col === 0) ctx.moveTo(x + col, wy);
            else ctx.lineTo(x + col, wy);
        }
        ctx.stroke();
    }
}

function drawCastleWall(ctx, x, y, w, h) {
    // Wall
    drawStoneWall(ctx, x, y, w, h, '#999999');
    // Battlements
    const bw = 8;
    for (let i = 0; i < w; i += bw * 2) {
        ctx.fillStyle = '#999999';
        ctx.fillRect(x + i, y - 6, bw, 6);
    }
}

function drawTorch(ctx, x, y, frame) {
    // Handle
    ctx.fillStyle = EGA.BROWN;
    ctx.fillRect(x - 1, y, 3, 8);
    // Flame
    const colors = [EGA.YELLOW, '#FF8800', EGA.LRED];
    const flicker = Math.sin(frame * 0.3) * 2;
    ctx.fillStyle = colors[frame % 3];
    ctx.beginPath();
    ctx.arc(x + 1, y - 2 + flicker * 0.5, 3 + Math.sin(frame * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = EGA.YELLOW;
    ctx.beginPath();
    ctx.arc(x + 1, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawDoor(ctx, x, y, w, h, color) {
    ctx.fillStyle = color || '#663300';
    ctx.fillRect(x, y, w, h);
    // Planks
    ctx.strokeStyle = '#552200';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.stroke();
    // Handle
    ctx.fillStyle = EGA.GOLD;
    ctx.fillRect(x + w - 5, y + h / 2 - 1, 3, 3);
}

function drawFlower(ctx, x, y, color, seed) {
    const rng = mulberry32(seed);
    // Stem
    ctx.fillStyle = '#228822';
    ctx.fillRect(x, y - 4, 1, 5);
    // Petals
    ctx.fillStyle = color;
    const petals = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * 2, y - 5 + Math.sin(angle) * 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = EGA.YELLOW;
    ctx.beginPath();
    ctx.arc(x, y - 5, 1, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== PLAYER DRAWING ====================

function drawPlayer(ctx, x, y, frame, direction, walking) {
    // y = foot position, character is ~20px tall
    const dir = direction === 'left' ? -1 : 1;
    const walkCycle = walking ? frame % 4 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = EGA.DBROWN;
    const legSwing = walking ? Math.sin(walkCycle * Math.PI / 2) * 2 : 0;
    ctx.fillRect(x - 3 + legSwing, y - 3, 2, 3);
    ctx.fillRect(x + 1 - legSwing, y - 3, 2, 3);

    // Leggings
    ctx.fillStyle = '#444444';
    ctx.fillRect(x - 3 + legSwing, y - 7, 2, 4);
    ctx.fillRect(x + 1 - legSwing, y - 7, 2, 4);

    // Tunic body
    ctx.fillStyle = EGA.BLUE;
    ctx.fillRect(x - 4, y - 14, 8, 7);

    // Belt
    ctx.fillStyle = EGA.BROWN;
    ctx.fillRect(x - 4, y - 9, 8, 1);
    ctx.fillStyle = EGA.GOLD;
    ctx.fillRect(x - 1, y - 9, 2, 1);

    // Arms
    ctx.fillStyle = EGA.BLUE;
    const armSwing = walking ? Math.sin(walkCycle * Math.PI / 2) * 1.5 : 0;
    ctx.fillRect(x - 6, y - 14 + armSwing, 2, 5);
    ctx.fillRect(x + 4, y - 14 - armSwing, 2, 5);
    // Hands
    ctx.fillStyle = EGA.SKIN;
    ctx.fillRect(x - 6, y - 9 + armSwing, 2, 2);
    ctx.fillRect(x + 4, y - 9 - armSwing, 2, 2);

    // Head
    ctx.fillStyle = EGA.SKIN;
    ctx.fillRect(x - 3, y - 19, 6, 5);

    // Eyes
    ctx.fillStyle = EGA.BLACK;
    if (direction === 'left') {
        ctx.fillRect(x - 2, y - 17, 1, 1);
        ctx.fillRect(x, y - 17, 1, 1);
    } else {
        ctx.fillRect(x, y - 17, 1, 1);
        ctx.fillRect(x + 2, y - 17, 1, 1);
    }

    // Hair / hat (feathered cap)
    ctx.fillStyle = EGA.RED;
    ctx.fillRect(x - 4, y - 22, 8, 3);
    ctx.fillRect(x - 3, y - 23, 6, 1);
    // Feather
    ctx.fillStyle = EGA.YELLOW;
    ctx.fillRect(x + 3 * dir, y - 25, 1, 3);
    ctx.fillRect(x + 4 * dir, y - 26, 1, 2);
}

// ==================== NPC DRAWING ====================

function drawNPC(ctx, x, y, type, frame) {
    if (type === 'merlin') {
        // Long blue robe
        ctx.fillStyle = '#3333AA';
        ctx.fillRect(x - 5, y - 14, 10, 12);
        // Head
        ctx.fillStyle = EGA.SKIN;
        ctx.fillRect(x - 3, y - 19, 6, 5);
        // Beard
        ctx.fillStyle = EGA.LGRAY;
        ctx.fillRect(x - 2, y - 14, 4, 4);
        // Pointy hat
        ctx.fillStyle = '#3333AA';
        ctx.fillRect(x - 4, y - 22, 8, 3);
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 22);
        ctx.lineTo(x, y - 30);
        ctx.lineTo(x + 4, y - 22);
        ctx.fill();
        // Stars on hat
        ctx.fillStyle = EGA.YELLOW;
        ctx.fillRect(x - 1, y - 26, 1, 1);
        ctx.fillRect(x + 2, y - 24, 1, 1);
        // Staff
        ctx.fillStyle = EGA.BROWN;
        ctx.fillRect(x + 6, y - 25, 2, 23);
        ctx.fillStyle = EGA.LCYAN;
        ctx.beginPath();
        ctx.arc(x + 7, y - 26, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'guard') {
        // Armor body
        ctx.fillStyle = EGA.LGRAY;
        ctx.fillRect(x - 4, y - 14, 8, 10);
        // Legs
        ctx.fillRect(x - 3, y - 4, 2, 4);
        ctx.fillRect(x + 1, y - 4, 2, 4);
        // Head
        ctx.fillStyle = EGA.SKIN;
        ctx.fillRect(x - 3, y - 19, 6, 5);
        // Helmet
        ctx.fillStyle = EGA.LGRAY;
        ctx.fillRect(x - 4, y - 22, 8, 3);
        ctx.fillRect(x - 3, y - 23, 6, 1);
        // Spear
        ctx.fillStyle = EGA.BROWN;
        ctx.fillRect(x + 6, y - 25, 1, 25);
        ctx.fillStyle = EGA.LGRAY;
        ctx.beginPath();
        ctx.moveTo(x + 5, y - 25);
        ctx.lineTo(x + 6.5, y - 30);
        ctx.lineTo(x + 8, y - 25);
        ctx.fill();
    } else if (type === 'troll') {
        // Large, green
        ctx.fillStyle = '#336633';
        ctx.fillRect(x - 7, y - 18, 14, 14);
        // Legs
        ctx.fillStyle = '#335533';
        ctx.fillRect(x - 6, y - 4, 4, 4);
        ctx.fillRect(x + 2, y - 4, 4, 4);
        // Head
        ctx.fillStyle = '#448844';
        ctx.fillRect(x - 5, y - 24, 10, 6);
        // Eyes
        ctx.fillStyle = EGA.YELLOW;
        ctx.fillRect(x - 3, y - 22, 2, 2);
        ctx.fillRect(x + 2, y - 22, 2, 2);
        // Mouth
        ctx.fillStyle = EGA.RED;
        ctx.fillRect(x - 3, y - 19, 6, 1);
        // Club
        ctx.fillStyle = EGA.BROWN;
        ctx.fillRect(x + 8, y - 20, 3, 15);
        ctx.fillRect(x + 7, y - 22, 5, 4);
    } else if (type === 'witch') {
        // Black robe
        ctx.fillStyle = '#222222';
        ctx.fillRect(x - 5, y - 14, 10, 12);
        ctx.fillRect(x - 3, y - 2, 2, 2);
        ctx.fillRect(x + 1, y - 2, 2, 2);
        // Head
        ctx.fillStyle = '#88AA66';
        ctx.fillRect(x - 3, y - 19, 6, 5);
        // Nose
        ctx.fillStyle = '#88AA66';
        ctx.fillRect(x + 3, y - 17, 2, 2);
        // Hat (pointy, black)
        ctx.fillStyle = '#111111';
        ctx.fillRect(x - 6, y - 22, 12, 3);
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 22);
        ctx.lineTo(x, y - 33);
        ctx.lineTo(x + 4, y - 22);
        ctx.fill();
        // Eyes
        ctx.fillStyle = EGA.LGREEN;
        ctx.fillRect(x - 2, y - 17, 1, 1);
        ctx.fillRect(x + 1, y - 17, 1, 1);
    } else if (type === 'fairy') {
        // Small, glowing
        const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;
        ctx.globalAlpha = glow;
        // Wings
        ctx.fillStyle = '#AADDFF';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 12, 4, 7, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y - 12, 4, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#EEDDFF';
        ctx.fillRect(x - 2, y - 15, 4, 10);
        // Head
        ctx.fillStyle = EGA.SKIN;
        ctx.fillRect(x - 2, y - 19, 4, 4);
        // Hair
        ctx.fillStyle = EGA.GOLD;
        ctx.fillRect(x - 3, y - 21, 6, 2);
        // Sparkles around
        ctx.fillStyle = EGA.YELLOW;
        for (let i = 0; i < 4; i++) {
            const angle = frame * 0.05 + i * Math.PI / 2;
            const sparkX = x + Math.cos(angle) * 10;
            const sparkY = y - 12 + Math.sin(angle) * 8;
            ctx.fillRect(sparkX, sparkY, 1, 1);
        }
        ctx.globalAlpha = 1.0;
    } else if (type === 'dragon') {
        // Large red dragon
        ctx.fillStyle = '#AA2200';
        // Body
        ctx.fillRect(x - 15, y - 15, 30, 12);
        // Head
        ctx.fillRect(x + 15, y - 20, 10, 10);
        // Eye
        ctx.fillStyle = EGA.YELLOW;
        ctx.fillRect(x + 21, y - 18, 2, 2);
        // Tail
        ctx.fillStyle = '#882200';
        ctx.fillRect(x - 25, y - 12, 12, 4);
        ctx.fillRect(x - 30, y - 14, 6, 4);
        // Wings
        ctx.fillStyle = '#993311';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 15);
        ctx.lineTo(x + 5, y - 35);
        ctx.lineTo(x + 15, y - 15);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#AA2200';
        ctx.fillRect(x - 10, y - 3, 4, 4);
        ctx.fillRect(x + 5, y - 3, 4, 4);
        // Fire particles if awake
    }
}

// ==================== GAME ENGINE ====================

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Logical dimensions (all game code uses these)
        this.WIDTH = 320;
        this.HEIGHT = 200;
        // Canvas is 2x for crisp display on modern screens
        this.SCALE = 2;

        // ── AGI subsystems ──
        this.dissolve = new DissolveTransition();
        this.priority = new PrioritySystem();
        this.parser = new TextParser();

        // Game state
        this.state = {
            screen: 'title', // title, playing, death, victory, inventory
            currentRoom: 'throneRoom',
            inventory: [],
            flags: {},
            score: 0,
            maxScore: 100,
            selectedVerb: 'Walk',
            selectedItem: null,
            gameOver: false,
            won: false,
        };

        // Player
        this.player = {
            x: 160, y: 140,
            targetX: 160, targetY: 140,
            moving: false,
            direction: 'right',
            frame: 0,
            visible: true,
            speed: 1.2,
            walkCallback: null,
        };

        // Text display
        this.textState = {
            fullText: '',
            displayedText: '',
            charIndex: 0,
            active: false,
            timer: 0,
            speed: 2, // chars per frame
            callback: null,
            queue: [],
        };

        // Death state
        this.deathText = '';

        // UI
        this.verbs = ['Walk', 'Look', 'Get', 'Use', 'Talk', 'Items'];
        this.verbRects = [];
        this.hoveredHotspot = null;
        this.hoveredVerb = -1;

        // Rooms
        this.rooms = {};

        // Timing
        this.frameCount = 0;
        this.gameSeed = Math.floor(Math.random() * 99999);

        // Title screen anim
        this.titleTimer = 0;

        // Action queue (walk then act)
        this.pendingAction = null;

        this.setupInput();
    }

    // ---- Input ----

    setupInput() {
        this.canvas.addEventListener('click', (e) => {
            const coords = this.getGameCoords(e);
            this.handleClick(coords.x, coords.y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.getGameCoords(e);
            this.handleHover(coords.x, coords.y);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') e.preventDefault();
            this.handleKey(e.key);
        });
    }

    getGameCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Map mouse position to logical 320x200 coordinates
        // (canvas is 640x400 physical but we work in 320x200 logical)
        return {
            x: Math.floor((e.clientX - rect.left) / rect.width * this.WIDTH),
            y: Math.floor((e.clientY - rect.top) / rect.height * this.HEIGHT)
        };
    }

    handleClick(x, y) {
        if (this.state.screen === 'title') {
            audio.init();
            audio.playTheme();
            this.state.screen = 'playing';
            document.body.classList.add('game-started');
            return;
        }

        if (this.state.screen === 'death') {
            this.restartGame();
            return;
        }

        if (this.state.screen === 'victory') {
            return; // just admire
        }

        // Block input during dissolve transition
        if (this.dissolve.active) return;

        if (this.state.screen === 'inventory') {
            this.handleInventoryClick(x, y);
            return;
        }

        // Dismiss text popup (handles animation skip + popup close)
        if (this._dismissText()) return;

        // Check verb bar click (y: 170-181)
        if (y >= 170 && y <= 181) {
            for (let i = 0; i < this.verbRects.length; i++) {
                const vr = this.verbRects[i];
                if (pointInRect(x, y, vr.x, vr.y, vr.w, vr.h)) {
                    if (this.verbs[i] === 'Items') {
                        this.state.screen = 'inventory';
                        return;
                    }
                    this.state.selectedVerb = this.verbs[i];
                    this.state.selectedItem = null;
                    return;
                }
            }
            return;
        }

        // Game area click (y: 8 to 169)
        if (y >= 8 && y < 170) {
            this.handleGameClick(x, y);
        }
    }

    handleGameClick(x, y) {
        const room = this.rooms[this.state.currentRoom];
        if (!room) return;

        // Check exits first (for Walk verb)
        if (this.state.selectedVerb === 'Walk') {
            const exits = room.exits || [];
            for (const exit of exits) {
                if (pointInRect(x, y, exit.x, exit.y, exit.w, exit.h)) {
                    // Check if exit is blocked
                    if (exit.blocked && exit.blocked(this)) {
                        return;
                    }
                    this.movePlayerTo(exit.playerWalkX || x, exit.playerWalkY || y, () => {
                        this.changeRoom(exit.room, exit.enterX, exit.enterY, exit.enterDir);
                    });
                    return;
                }
            }
        }

        // Check hotspots
        const hotspots = room.getHotspots ? room.getHotspots(this.state) : [];
        for (const hs of hotspots) {
            if (pointInRect(x, y, hs.x, hs.y, hs.w, hs.h)) {
                const verb = this.state.selectedVerb;
                const walkTo = hs.walkTo || { x: hs.x + hs.w / 2, y: Math.min(hs.y + hs.h, 160) };

                if (verb === 'Walk') {
                    this.movePlayerTo(walkTo.x, walkTo.y);
                    return;
                }

                // Walk to hotspot then perform action
                this.movePlayerTo(walkTo.x, walkTo.y, () => {
                    this.performAction(verb, hs);
                });
                return;
            }
        }

        // Default: walk to clicked position
        if (this.state.selectedVerb === 'Walk') {
            const bounds = room.walkBounds || { minX: 10, maxX: 310, minY: 90, maxY: 165 };
            const tx = clamp(x, bounds.minX, bounds.maxX);
            const ty = clamp(y, bounds.minY, bounds.maxY);
            this.movePlayerTo(tx, ty);
        }
    }

    performAction(verb, hotspot) {
        // Handle Use with selected inventory item
        if (verb === 'Use' && this.state.selectedItem) {
            const comboKey = this.state.selectedItem + '_' + hotspot.id;
            if (hotspot.useCombos && hotspot.useCombos[comboKey]) {
                const result = hotspot.useCombos[comboKey](this);
                if (result) this.showText(result);
            } else {
                this.showText("That doesn't seem to work.");
            }
            this.state.selectedItem = null;
            return;
        }

        // Normal verb action
        const action = hotspot.actions && hotspot.actions[verb];
        if (!action) {
            // Default responses
            const defaults = {
                Look: "You see nothing special.",
                Get: "You can't take that.",
                Use: "You can't use that.",
                Talk: "It doesn't respond.",
            };
            this.showText(defaults[verb] || "Nothing happens.");
            return;
        }

        if (typeof action === 'function') {
            const result = action(this);
            if (result) this.showText(result);
        } else {
            this.showText(action);
        }
    }

    handleInventoryClick(x, y) {
        // Close button area (top-right)
        if (x > 280 && y < 25) {
            this.state.screen = 'playing';
            return;
        }

        // Click on inventory item
        const items = this.state.inventory;
        const cols = 4;
        const startX = 30, startY = 35;
        const itemW = 65, itemH = 25;

        for (let i = 0; i < items.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const ix = startX + col * itemW;
            const iy = startY + row * itemH;

            if (pointInRect(x, y, ix, iy, itemW - 2, itemH - 2)) {
                // Select item for Use
                this.state.selectedItem = items[i].id;
                this.state.selectedVerb = 'Use';
                this.state.screen = 'playing';
                this.showText(`Using: ${items[i].name}`);
                return;
            }
        }
    }

    handleHover(x, y) {
        if (this.state.screen !== 'playing') return;

        // Check verb hover
        this.hoveredVerb = -1;
        if (y >= 170 && y <= 181) {
            for (let i = 0; i < this.verbRects.length; i++) {
                if (pointInRect(x, y, this.verbRects[i].x, this.verbRects[i].y,
                    this.verbRects[i].w, this.verbRects[i].h)) {
                    this.hoveredVerb = i;
                }
            }
        }

        // Check hotspot hover
        this.hoveredHotspot = null;
        if (y >= 8 && y < 170) {
            const room = this.rooms[this.state.currentRoom];
            if (!room) return;
            const hotspots = room.getHotspots ? room.getHotspots(this.state) : [];
            for (const hs of hotspots) {
                if (pointInRect(x, y, hs.x, hs.y, hs.w, hs.h)) {
                    this.hoveredHotspot = hs;
                    break;
                }
            }
        }
    }

    handleKey(key) {
        if (this.state.screen === 'title') {
            audio.init();
            audio.playTheme();
            this.state.screen = 'playing';
            document.body.classList.add('game-started');
            return;
        }
        if (this.state.screen === 'death') {
            this.restartGame();
            return;
        }

        // ── AGI Text Parser mode ──
        // Toggle with Enter or Tab; type commands like "look mirror"
        if (this.parser.active && this.state.screen === 'playing') {
            if (key === 'Escape') {
                this.parser.active = false;
                this.parser.inputBuffer = '';
                return;
            }
            if (key === 'Enter') {
                if (this.parser.inputBuffer.trim()) {
                    this.processParserInput(this.parser.inputBuffer.trim());
                }
                this.parser.active = false;
                this.parser.inputBuffer = '';
                return;
            }
            if (key === 'Backspace') {
                this.parser.inputBuffer = this.parser.inputBuffer.slice(0, -1);
                return;
            }
            if (key.length === 1 && this.parser.inputBuffer.length < 40) {
                this.parser.inputBuffer += key;
                return;
            }
            return; // swallow all other keys while parsing
        }

        // Space/Enter/Tab dismiss text popups; Enter/Tab also open parser
        if ((key === 'Enter' || key === 'Tab' || key === ' ') && this.state.screen === 'playing') {
            if (this._dismissText()) return;
            // Space only dismisses text, doesn't open parser
            if (key !== ' ') {
                this.parser.active = true;
                this.parser.inputBuffer = '';
            }
            return;
        }

        // Quick verb keys
        const keyMap = { '1': 'Walk', '2': 'Look', '3': 'Get', '4': 'Use', '5': 'Talk' };
        if (keyMap[key]) {
            this.state.selectedVerb = keyMap[key];
            this.state.selectedItem = null;
        }
        if (key === 'i' || key === 'I' || key === '6') {
            this.state.screen = this.state.screen === 'inventory' ? 'playing' : 'inventory';
        }
        if (key === 'Escape') {
            if (this.state.screen === 'inventory') this.state.screen = 'playing';
        }
    }

    // ── AGI Text Parser Command Processing ──
    // Maps typed commands to game actions, like AGI's said() opcode

    processParserInput(input) {
        const result = this.parser.parse(input);

        if (!result.success) {
            if (result.unknown) {
                this.showText(`I don't understand "${result.unknown}".`);
            } else {
                this.showText("I don't understand that.");
            }
            audio.sfxError();
            return;
        }

        if (result.words.length === 0) {
            this.showText("What?");
            return;
        }

        const { verb, noun, verbWord, nounWord } = this.parser.getVerbNoun();

        // ── Special: Fairy riddle answer ──
        // If the riddle has been asked, accept the answer "map" typed in any form
        if (this.state.currentRoom === 'enchantedLake' &&
            this.hasFlag('riddleAsked') && !this.hasFlag('hasEmerald')) {
            // Check if any parsed word is noun group 66 (map)
            const hasMapWord = result.words.some(w => w.groupId === 66);
            if (hasMapWord) {
                this.addItem('emerald', 'Emerald', 'The Emerald of Compassion — brilliant green gem');
                this.setFlag('hasEmerald');
                this.addScore(12);
                audio.sfxFairy();
                this.showText('"A map!" you exclaim. The fairy\'s face lights up with delight. "Correct! Wisdom and compassion go hand in hand, young one." She waves her hand and the Emerald of Compassion materializes before you, pulsing with green light. "Take it, and restore the Mirror. Daventry needs you." The fairy fades into moonlight with a final, warm smile.');
                const self = this;
                setTimeout(() => {
                    if (self.hasItem('sapphire') && self.hasItem('ruby')) {
                        self.showText('You now have all three gems! Return to the Throne Room and use them on the Magic Mirror!');
                    } else {
                        self.showText('The Emerald of Compassion is yours! You must still find the other gems before the Mirror can be restored.');
                    }
                }, 3500);
                return;
            }
        }

        // Special: "inventory" / "items"
        if (noun === 59) {
            this.state.screen = 'inventory';
            return;
        }

        // Map parser verb groups to engine verbs
        const verbGroupToVerb = {
            1: 'Look', 2: 'Get', 3: 'Use', 4: 'Talk', 5: 'Walk',
            6: 'Use',  7: 'Use', 8: 'Use', 9: 'Use',
        };

        const engineVerb = verb ? verbGroupToVerb[verb] : null;

        if (!engineVerb) {
            this.showText(`What do you want to do with ${nounWord || 'that'}?`);
            return;
        }

        if (!noun) {
            this.showText(`${verbWord} what?`);
            return;
        }

        // Find matching hotspot in current room
        const room = this.rooms[this.state.currentRoom];
        if (!room) return;

        const hotspots = room.getHotspots ? room.getHotspots(this.state) : [];

        // Check parser nouns against hotspot parserNouns
        // Try ALL parsed nouns so "give bread to troll" finds the troll
        const parsedNouns = result.words.filter(w => w.groupId >= 20);
        let matchedHotspot = null;
        let matchedNounWord = nounWord;

        for (const pn of parsedNouns) {
            for (const hs of hotspots) {
                if (hs.parserNouns && hs.parserNouns.includes(pn.groupId)) {
                    matchedHotspot = hs;
                    matchedNounWord = pn.word;
                    break;
                }
            }
            if (matchedHotspot) break;
        }

        if (!matchedHotspot) {
            // Try matching by name keyword
            for (const pn of parsedNouns) {
                for (const hs of hotspots) {
                    if (hs.name && pn.word &&
                        hs.name.toLowerCase().includes(pn.word.toLowerCase())) {
                        matchedHotspot = hs;
                        matchedNounWord = pn.word;
                        break;
                    }
                }
                if (matchedHotspot) break;
            }
        }

        if (!matchedHotspot) {
            this.showText(`You don't see any "${matchedNounWord}" here.`);
            return;
        }

        // Set the verb and walk to + perform action
        this.state.selectedVerb = engineVerb;
        const walkTo = matchedHotspot.walkTo ||
            { x: matchedHotspot.x + matchedHotspot.w / 2,
              y: Math.min(matchedHotspot.y + matchedHotspot.h, 160) };

        if (engineVerb === 'Walk') {
            this.movePlayerTo(walkTo.x, walkTo.y);
        } else {
            this.movePlayerTo(walkTo.x, walkTo.y, () => {
                this.performAction(engineVerb, matchedHotspot);
            });
        }
    }

    // ---- State Management ----

    addItem(id, name, desc) {
        if (!this.hasItem(id)) {
            this.state.inventory.push({ id, name, desc: desc || name });
            audio.sfxPickup();
        }
    }

    removeItem(id) {
        this.state.inventory = this.state.inventory.filter(item => item.id !== id);
    }

    hasItem(id) {
        return this.state.inventory.some(item => item.id === id);
    }

    setFlag(flag) {
        this.state.flags[flag] = true;
    }

    hasFlag(flag) {
        return !!this.state.flags[flag];
    }

    addScore(points) {
        this.state.score = Math.min(this.state.score + points, this.state.maxScore);
        audio.sfxScore();
    }

    // ---- Room Management ----

    registerRoom(room) {
        this.rooms[room.id] = room;
    }

    changeRoom(roomId, playerX, playerY, dir) {
        if (!this.rooms[roomId]) {
            console.warn('Room not found:', roomId);
            return;
        }

        // ── AGI Dissolve Transition ──
        // Capture old screen at physical canvas resolution
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const oldImageData = this.ctx.getImageData(0, 0, cw, ch);

        this.state.currentRoom = roomId;
        this.player.x = playerX || 160;
        this.player.y = playerY || 140;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.player.moving = false;
        if (dir) this.player.direction = dir;
        this.hoveredHotspot = null;
        this.pendingAction = null;

        // Room enter callback
        const room = this.rooms[roomId];
        if (room.onEnter) {
            room.onEnter(this);
        }

        // Render new room with scaling to capture at physical resolution
        this.ctx.save();
        this.ctx.scale(this.SCALE, this.SCALE);
        this.renderGame(this.ctx);
        this.ctx.restore();
        const newImageData = this.ctx.getImageData(0, 0, cw, ch);

        // Restore old image and start dissolve at physical resolution
        this.ctx.putImageData(oldImageData, 0, 0);
        this.dissolve.start(oldImageData, newImageData, cw, ch, this.SCALE);

        audio.sfxRoomEnter();
    }

    // ---- Text Display ----

    showText(text, callback) {
        if (this.textState.active) {
            // Queue it
            this.textState.queue.push({ text, callback });
            return;
        }
        this.textState.fullText = text;
        this.textState.displayedText = '';
        this.textState.charIndex = 0;
        this.textState.active = true;
        this.textState.callback = callback || null;
        this.textState.timer = 0;
    }

    showNextQueued() {
        if (this.textState.queue.length > 0) {
            const next = this.textState.queue.shift();
            this.textState.fullText = next.text;
            this.textState.displayedText = '';
            this.textState.charIndex = 0;
            this.textState.active = true;
            this.textState.callback = next.callback || null;
            this.textState.timer = 0;
        }
    }

    showDeath(text) {
        this.deathText = text;
        this.state.screen = 'death';
        this.state.gameOver = true;
        audio.sfxDeath();
    }

    showVictory() {
        // Clear any lingering text popup so it doesn't overlay victory screen
        this.textState.active = false;
        this.textState.displayedText = '';
        this.textState.fullText = '';
        this.textState.callback = null;
        this.textState.queue = [];
        this.state.screen = 'victory';
        this.state.won = true;
        audio.sfxVictory();
    }

    /** Dismiss text popup: skip animation or close visible popup.
     *  Returns true if text was dismissed, false if nothing to dismiss. */
    _dismissText() {
        // Text is still animating — skip to end
        if (this.textState.active) {
            this.textState.displayedText = this.textState.fullText;
            this.textState.charIndex = this.textState.fullText.length;
            this.textState.active = false;
            // Fire callback that updateText would have triggered
            if (this.textState.callback) {
                const cb = this.textState.callback;
                this.textState.callback = null;
                cb();
            }
            return true;
        }
        // Popup is fully visible — close it
        if (this.textState.displayedText) {
            this.textState.displayedText = '';
            this.textState.fullText = '';
            if (this.textState.queue.length > 0) {
                this.showNextQueued();
            }
            return true;
        }
        return false;
    }

    // ---- Player Movement ----

    movePlayerTo(x, y, callback) {
        const room = this.rooms[this.state.currentRoom];
        const bounds = room ? (room.walkBounds || { minX: 10, maxX: 310, minY: 90, maxY: 165 }) :
            { minX: 10, maxX: 310, minY: 90, maxY: 165 };

        this.player.targetX = clamp(x, bounds.minX, bounds.maxX);
        this.player.targetY = clamp(y, bounds.minY, bounds.maxY);
        this.player.moving = true;
        this.player.walkCallback = callback || null;

        // Face direction
        if (this.player.targetX > this.player.x + 2) this.player.direction = 'right';
        else if (this.player.targetX < this.player.x - 2) this.player.direction = 'left';
    }

    updatePlayer() {
        if (!this.player.moving) return;

        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        const d = dist(this.player.x, this.player.y, this.player.targetX, this.player.targetY);

        if (d < 2) {
            this.player.x = this.player.targetX;
            this.player.y = this.player.targetY;
            this.player.moving = false;
            this.player.frame = 0;
            if (this.player.walkCallback) {
                const cb = this.player.walkCallback;
                this.player.walkCallback = null;
                cb();
            }
            return;
        }

        const speed = this.player.speed;
        this.player.x += (dx / d) * speed;
        this.player.y += (dy / d) * speed;

        // Walk animation
        if (this.frameCount % 4 === 0) {
            this.player.frame++;
        }

        // Footstep sounds
        if (this.frameCount % 12 === 0) {
            audio.sfxWalk();
        }

        // Face direction
        if (Math.abs(dx) > 1) {
            this.player.direction = dx > 0 ? 'right' : 'left';
        }
    }

    // ---- Text Update ----

    updateText() {
        if (!this.textState.active) return;
        this.textState.timer++;
        if (this.textState.timer % this.textState.speed === 0) {
            if (this.textState.charIndex < this.textState.fullText.length) {
                this.textState.charIndex++;
                this.textState.displayedText = this.textState.fullText.substring(0, this.textState.charIndex);
                // Talk sound for character text
                if (this.textState.charIndex % 3 === 0) {
                    audio.sfxTalk();
                }
            } else {
                this.textState.active = false;
                if (this.textState.callback) {
                    const cb = this.textState.callback;
                    this.textState.callback = null;
                    cb();
                }
            }
        }
    }

    // ---- Restart ----

    restartGame() {
        this.state = {
            screen: 'playing',
            currentRoom: 'throneRoom',
            inventory: [],
            flags: {},
            score: 0,
            maxScore: 100,
            selectedVerb: 'Walk',
            selectedItem: null,
            gameOver: false,
            won: false,
        };
        this.player = {
            x: 160, y: 140,
            targetX: 160, targetY: 140,
            moving: false,
            direction: 'right',
            frame: 0,
            visible: true,
            speed: 1.2,
            walkCallback: null,
        };
        this.textState = {
            fullText: '', displayedText: '', charIndex: 0,
            active: false, timer: 0, speed: 2, callback: null, queue: []
        };
        this.deathText = '';
        this.hoveredHotspot = null;
        this.pendingAction = null;

        // Reset AGI subsystems
        this.dissolve.active = false;
        this.parser.active = false;
        this.parser.inputBuffer = '';

        // Re-enter first room
        const room = this.rooms['throneRoom'];
        if (room && room.onEnter) room.onEnter(this);
    }

    // ==================== RENDER ====================

    render() {
        const ctx = this.ctx;

        // ── AGI Dissolve — during transitions, step the LFSR dissolve ──
        if (this.dissolve.active) {
            // Dissolve operates at physical canvas resolution
            this.dissolve.step(ctx);
            // Render UI over dissolve with logical scaling
            ctx.save();
            ctx.scale(this.SCALE, this.SCALE);
            this.renderStatusBar(ctx);
            this.renderVerbBar(ctx);
            this.renderTextArea(ctx);
            ctx.restore();
            return;
        }

        // Apply 2x scale so all drawing at 320x200 fills the 640x400 canvas
        ctx.save();
        ctx.scale(this.SCALE, this.SCALE);
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        switch (this.state.screen) {
            case 'title': this.renderTitle(ctx); break;
            case 'playing': this.renderGame(ctx); break;
            case 'inventory': this.renderGame(ctx); this.renderInventoryOverlay(ctx); break;
            case 'death': this.renderDeath(ctx); break;
            case 'victory': this.renderVictory(ctx); break;
        }

        // AGI-style text popup window (drawn on top of everything)
        if (this.textState.active || this.textState.displayedText) {
            this.renderTextPopup(ctx);
        }

        ctx.restore();
    }

    renderTitle(ctx) {

        // Dark background with stars
        ctx.fillStyle = '#0a0a22';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        drawStars(ctx, 12345, 80);

        // Castle silhouette
        ctx.fillStyle = '#111133';
        // Main castle body
        ctx.fillRect(100, 100, 120, 60);
        // Towers
        ctx.fillRect(90, 70, 25, 90);
        ctx.fillRect(205, 70, 25, 90);
        ctx.fillRect(140, 55, 20, 105);
        ctx.fillRect(165, 60, 20, 100);
        // Battlements
        for (let i = 90; i < 230; i += 10) {
            ctx.fillRect(i, 65 + Math.sin(i * 0.1) * 3, 5, 5);
        }

        // Moon
        ctx.fillStyle = '#DDDDAA';
        ctx.beginPath();
        ctx.arc(250, 40, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a22';
        ctx.beginPath();
        ctx.arc(255, 37, 13, 0, Math.PI * 2);
        ctx.fill();

        // Title text
        ctx.fillStyle = EGA.GOLD;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("KING'S QUEST", this.WIDTH / 2, 25);

        ctx.fillStyle = EGA.WHITE;
        ctx.font = '9px monospace';
        ctx.fillText('The Darkened Mirror', this.WIDTH / 2, 40);

        // Subtitle
        ctx.fillStyle = EGA.LGRAY;
        ctx.font = '7px monospace';
        ctx.fillText('A Sierra Online Tribute', this.WIDTH / 2, 55);

        // Blinking prompt
        if (Math.floor(this.titleTimer / 30) % 2 === 0) {
            ctx.fillStyle = EGA.LCYAN;
            ctx.font = '7px monospace';
            ctx.fillText('Click or press any key to begin', this.WIDTH / 2, 180);
        }

        // Ground
        ctx.fillStyle = '#112211';
        ctx.fillRect(0, 160, this.WIDTH, 40);
        ctx.textAlign = 'left';
    }

    renderGame(ctx) {
        // ── AGI Status Bar (y: 0-7) — score/room display ──
        this.renderStatusBar(ctx);

        // ── AGI Game Area (y: 8-169) — room + sprites with priority sorting ──
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 8, this.WIDTH, 162);
        ctx.clip();

        const room = this.rooms[this.state.currentRoom];
        if (room && room.draw) {
            // AGI priority-based draw: rooms provide drawBackground (behind player)
            // and optionally drawForeground (in front of player based on Y)
            if (room.drawBackground) {
                // AGI-style split rendering with priority depth sorting
                room.drawBackground(ctx, this.state, this.frameCount, this.gameSeed);

                // Draw player at its priority band
                if (this.player.visible) {
                    drawPlayer(ctx, Math.round(this.player.x), Math.round(this.player.y),
                        this.player.frame, this.player.direction, this.player.moving);
                }

                // Draw foreground elements (higher Y = in front of player)
                if (room.drawForeground) {
                    room.drawForeground(ctx, this.state, this.frameCount, this.gameSeed,
                        this.player.y);
                }
            } else {
                // Legacy rooms without split draw — draw everything, then player on top
                room.draw(ctx, this.state, this.frameCount, this.gameSeed);

                if (this.player.visible) {
                    drawPlayer(ctx, Math.round(this.player.x), Math.round(this.player.y),
                        this.player.frame, this.player.direction, this.player.moving);
                }
            }
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 8, this.WIDTH, 162);
        }

        // Hotspot highlight
        if (this.hoveredHotspot && this.state.selectedVerb !== 'Walk') {
            ctx.strokeStyle = EGA.YELLOW;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(this.hoveredHotspot.x, this.hoveredHotspot.y,
                this.hoveredHotspot.w, this.hoveredHotspot.h);
            ctx.setLineDash([]);
        }

        ctx.restore();

        // ── AGI Verb Bar (y: 170-181) ──
        this.renderVerbBar(ctx);

        // ── AGI Text/Parser Area (y: 182-199) ──
        this.renderTextArea(ctx);
    }

    renderStatusBar(ctx) {
        ctx.fillStyle = '#222244';
        ctx.fillRect(0, 0, this.WIDTH, 8);
        ctx.fillStyle = EGA.WHITE;
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        const room = this.rooms[this.state.currentRoom];
        const roomName = room ? room.name : '';
        ctx.fillText(roomName, 4, 6);
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${this.state.score} of ${this.state.maxScore}`, this.WIDTH - 4, 6);
        ctx.textAlign = 'left';
    }

    renderVerbBar(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 170, this.WIDTH, 12);

        const verbW = Math.floor(this.WIDTH / this.verbs.length);
        this.verbRects = [];

        for (let i = 0; i < this.verbs.length; i++) {
            const vx = i * verbW;
            const selected = this.verbs[i] === this.state.selectedVerb;
            const hovered = i === this.hoveredVerb;

            this.verbRects.push({ x: vx, y: 170, w: verbW, h: 12 });

            if (selected) {
                ctx.fillStyle = '#3333AA';
                ctx.fillRect(vx, 170, verbW, 12);
            } else if (hovered) {
                ctx.fillStyle = '#222255';
                ctx.fillRect(vx, 170, verbW, 12);
            }

            ctx.fillStyle = selected ? EGA.WHITE : EGA.LGRAY;
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            const shortcut = i < 5 ? `${i + 1}:` : '';
            ctx.fillText(shortcut + this.verbs[i], vx + verbW / 2, 179);
        }

        // Selected item indicator
        if (this.state.selectedItem) {
            ctx.fillStyle = EGA.YELLOW;
            ctx.textAlign = 'right';
            ctx.fillText(`[${this.state.selectedItem}]`, this.WIDTH - 2, 179);
        }

        ctx.textAlign = 'left';

        // Separator line
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 170);
        ctx.lineTo(this.WIDTH, 170);
        ctx.stroke();
    }

    renderTextArea(ctx) {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 182, this.WIDTH, 18);

        // Separator
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 182);
        ctx.lineTo(this.WIDTH, 182);
        ctx.stroke();

        // ── AGI Text Parser Input ──
        if (this.parser.active) {
            // Show parser prompt (like AGI's text input line)
            ctx.fillStyle = EGA.WHITE;
            ctx.font = '7px monospace';
            ctx.textAlign = 'left';
            this.parser.cursorBlink++;
            const cursor = (Math.floor(this.parser.cursorBlink / 15) % 2 === 0) ? '_' : '';
            ctx.fillText('> ' + this.parser.inputBuffer + cursor, 4, 193);
            // Hint
            ctx.fillStyle = EGA.DGRAY;
            ctx.textAlign = 'right';
            ctx.fillText('Enter=submit  Esc=cancel', this.WIDTH - 4, 198);
            ctx.textAlign = 'left';
            return;
        }

        // Show hover label or parser hint (messages now use popup window)
        if (this.hoveredHotspot) {
            ctx.fillStyle = EGA.LCYAN;
            ctx.font = '7px monospace';
            ctx.textAlign = 'left';
            const verb = this.state.selectedVerb;
            const item = this.state.selectedItem;
            let label = `${verb} ${this.hoveredHotspot.name || '???'}`;
            if (item) label = `Use ${item} on ${this.hoveredHotspot.name}`;
            ctx.fillText(label, 4, 193);
        } else {
            // Parser hint when idle
            ctx.fillStyle = EGA.DGRAY;
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press Enter to type a command', this.WIDTH / 2, 193);
            ctx.textAlign = 'left';
        }
    }

    // ── AGI-Style Text Popup Window ──
    // Authentic AGI interpreter displayed text in centered windows
    // with a coloured background and border, dismissed by keypress/click

    renderTextPopup(ctx) {
        const text = this.textState.displayedText || '';
        if (!text) return;

        // Word-wrap text into lines
        ctx.font = '7px monospace';
        const maxWidth = 260;
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const w = ctx.measureText(testLine).width;
            if (w > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = 10;
        const padding = 8;
        // Size box to fit content
        let boxWidth = 0;
        for (const line of lines) {
            const lw = ctx.measureText(line).width;
            if (lw > boxWidth) boxWidth = lw;
        }
        boxWidth += padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2 + (this.textState.active ? 0 : 10);
        const boxX = Math.floor((this.WIDTH - boxWidth) / 2);
        const boxY = Math.max(12, Math.floor(85 - boxHeight / 2));

        // Dark blue background (authentic AGI text window colour)
        ctx.fillStyle = '#000088';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // White border (double-pixel for clarity)
        ctx.strokeStyle = EGA.WHITE;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 1, boxY + 1, boxWidth - 2, boxHeight - 2);

        // Text lines
        ctx.fillStyle = EGA.WHITE;
        ctx.textAlign = 'left';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], boxX + padding, boxY + padding + i * lineHeight + 7);
        }

        // "Press ENTER" hint when text is fully revealed
        if (!this.textState.active) {
            ctx.fillStyle = EGA.YELLOW;
            ctx.font = '6px monospace';
            ctx.textAlign = 'center';
            const blink = Math.floor(this.frameCount / 20) % 2 === 0;
            if (blink) {
                ctx.fillText('[ click to continue ]', this.WIDTH / 2, boxY + boxHeight - 4);
            }
            ctx.textAlign = 'left';
        }
    }

    renderInventoryOverlay(ctx) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 30, 0.92)';
        ctx.fillRect(10, 10, 300, 155);

        // Border
        ctx.strokeStyle = EGA.GOLD;
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 300, 155);

        // Title
        ctx.fillStyle = EGA.GOLD;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('INVENTORY', this.WIDTH / 2, 22);

        // Close button
        ctx.fillStyle = EGA.LRED;
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('[X]', 305, 22);

        // Items
        const items = this.state.inventory;
        if (items.length === 0) {
            ctx.fillStyle = EGA.LGRAY;
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Your inventory is empty.', this.WIDTH / 2, 80);
            ctx.fillText("Perhaps you should 'Get' some things!", this.WIDTH / 2, 95);
        } else {
            const cols = 4;
            const startX = 25;
            const startY = 32;
            const itemW = 68;
            const itemH = 24;

            for (let i = 0; i < items.length; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const ix = startX + col * itemW;
                const iy = startY + row * itemH;

                // Item box
                ctx.fillStyle = '#111133';
                ctx.fillRect(ix, iy, itemW - 4, itemH - 2);
                ctx.strokeStyle = '#555588';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(ix, iy, itemW - 4, itemH - 2);

                // Item name
                ctx.fillStyle = EGA.WHITE;
                ctx.font = '6px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(items[i].name, ix + (itemW - 4) / 2, iy + 10);

                // Icon (simple colored square)
                const iconColors = {
                    bread: EGA.BROWN, key: EGA.GOLD, lantern: EGA.YELLOW,
                    cheese: EGA.YELLOW, mushroom: EGA.LRED, potion: EGA.LGREEN,
                    crystal_shard: EGA.LCYAN, sapphire: EGA.LBLUE,
                    ruby: EGA.LRED, emerald: EGA.LGREEN,
                };
                ctx.fillStyle = iconColors[items[i].id] || EGA.LGRAY;
                ctx.fillRect(ix + (itemW - 4) / 2 - 3, iy + 13, 6, 6);
            }
        }

        // Instructions
        ctx.fillStyle = EGA.DGRAY;
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click an item to USE it, or press ESC/I to close', this.WIDTH / 2, 158);
        ctx.textAlign = 'left';
    }

    renderDeath(ctx) {
        ctx.fillStyle = '#1a0000';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Skull (simple pixel art)
        ctx.fillStyle = EGA.WHITE;
        ctx.fillRect(145, 25, 30, 25);
        ctx.fillRect(140, 30, 40, 15);
        // Eye sockets
        ctx.fillStyle = '#1a0000';
        ctx.fillRect(148, 33, 6, 6);
        ctx.fillRect(166, 33, 6, 6);
        // Nose
        ctx.fillRect(158, 40, 4, 4);
        // Teeth
        ctx.fillStyle = EGA.WHITE;
        ctx.fillRect(148, 48, 24, 4);
        ctx.fillStyle = '#1a0000';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(150 + i * 5, 48, 1, 4);
        }

        // Death text
        ctx.fillStyle = EGA.LRED;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU HAVE DIED', this.WIDTH / 2, 70);

        // Death message (word wrapped)
        ctx.fillStyle = EGA.WHITE;
        ctx.font = '7px monospace';
        const words = this.deathText.split(' ');
        let line = '';
        let ly = 90;
        for (const word of words) {
            const test = line + (line ? ' ' : '') + word;
            if (test.length > 45) {
                ctx.fillText(line, this.WIDTH / 2, ly);
                ly += 10;
                line = word;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, this.WIDTH / 2, ly);

        // Score
        ctx.fillStyle = EGA.LGRAY;
        ctx.font = '7px monospace';
        ctx.fillText(`Final Score: ${this.state.score} of ${this.state.maxScore}`, this.WIDTH / 2, 155);

        // Restart prompt
        if (Math.floor(this.frameCount / 30) % 2 === 0) {
            ctx.fillStyle = EGA.YELLOW;
            ctx.fillText('Click or press any key to try again', this.WIDTH / 2, 175);
        }

        ctx.textAlign = 'left';
    }

    renderVictory(ctx) {
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        drawStars(ctx, 99999, 60);

        // Crown (simple pixel art)
        ctx.fillStyle = EGA.GOLD;
        ctx.fillRect(135, 20, 50, 15);
        ctx.fillRect(130, 18, 8, 20);
        ctx.fillRect(155, 14, 10, 25);
        ctx.fillRect(182, 18, 8, 20);
        // Gems on crown
        ctx.fillStyle = EGA.LRED;
        ctx.fillRect(133, 22, 4, 4);
        ctx.fillStyle = EGA.LBLUE;
        ctx.fillRect(158, 18, 4, 4);
        ctx.fillStyle = EGA.LGREEN;
        ctx.fillRect(184, 22, 4, 4);

        ctx.fillStyle = EGA.GOLD;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CONGRATULATIONS!', this.WIDTH / 2, 55);

        ctx.fillStyle = EGA.WHITE;
        ctx.font = '7px monospace';
        const victoryLines = [
            'You have restored the Magic Mirror',
            'and saved the Kingdom of Daventry!',
            '',
            'The light returns to the land,',
            'and King Graham shall hear of your',
            'brave deeds upon his return.',
            '',
            'Perhaps one day, you too shall',
            'wear the Adventurer\'s Crown.',
        ];
        victoryLines.forEach((line, i) => {
            ctx.fillStyle = i === 0 || i === 1 ? EGA.LCYAN : EGA.WHITE;
            ctx.fillText(line, this.WIDTH / 2, 75 + i * 10);
        });

        ctx.fillStyle = EGA.GOLD;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`Final Score: ${this.state.score} of ${this.state.maxScore}`, this.WIDTH / 2, 175);

        ctx.fillStyle = EGA.LGRAY;
        ctx.font = '6px monospace';
        ctx.fillText('Thank you for playing!', this.WIDTH / 2, 190);
        ctx.textAlign = 'left';
    }

    // ==================== GAME LOOP ====================

    update() {
        if (this.state.screen === 'playing') {
            this.updatePlayer();
            this.updateText();
        }
        if (this.state.screen === 'title') {
            this.titleTimer++;
        }
        this.frameCount++;
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }
}
