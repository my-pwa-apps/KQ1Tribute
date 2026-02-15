# Sierra Online AGI Engine — Technical Reference for HTML5 Canvas Implementation

> Compiled from four open-source AGI reimplementations:
> - **ScummVM** (C++) — `engines/agi/` — most complete, multi-platform
> - **NAGI** (C) — closest to original disassembly
> - **agile-gdx** (Java/libGDX) — cleanest OOP architecture
> - **SCUMM-8** (PICO-8/Lua) — simplified retro adventure patterns

---

## Table of Contents
1. [Screen Architecture & Dimensions](#1-screen-architecture--dimensions)
2. [Priority Bands](#2-priority-bands)
3. [Picture Rendering](#3-picture-rendering)
4. [Screen Transitions](#4-screen-transitions)
5. [EGA 16-Color Palette & Dithering](#5-ega-16-color-palette--dithering)
6. [VIEW System (Sprites & Animation)](#6-view-system-sprites--animation)
7. [Text Parser](#7-text-parser)
8. [Integration Guide for KQ1Tribute](#8-integration-guide-for-kq1tribute)

---

## 1. Screen Architecture & Dimensions

### Coordinate System
The AGI engine uses a **160×168** internal game screen with a **dual-buffer architecture**:

| Buffer | Resolution | Purpose |
|--------|-----------|---------|
| Visual Screen (`_gameScreen`) | 160×168 bytes | Pixel color data (EGA color index 0-15) |
| Priority Screen (`_priorityScreen`) | 160×168 bytes | Priority/control values (0-15) |
| Display Screen | 320×200 (or 640×400) | Final output: pixels doubled horizontally |

The 200-line display breaks down as:
- **Lines 0–7**: Status bar (score, room name)
- **Lines 8–175**: Game area (168 lines → mapped from 160×168 internal)
- **Lines 176–199**: Text input / message area

### NAGI's Interleaved Buffer
NAGI uses a single byte per pixel where the lower nibble is the visual color and upper nibble is the priority:

```c
// NAGI: sbuf_util.c
// Buffer format: each byte = (priority << 4) | visual_color
// gfx_picbuff is 160×168 bytes

void sbuff_plot(int x, int y) {
    u8 *b = gfx_picbuff + y * 160 + x;
    // Dithering: even rows use col_even, odd rows use col_odd
    u8 colour = (y & 1) ? col_odd : col_even;
    *b = (*b | sbuff_drawmask) & colour;
}
```

### ScummVM's Separate Buffers

```cpp
// ScummVM: graphics.h / graphics.cpp
byte _gameScreen[160 * 168];      // Visual buffer
byte _priorityScreen[160 * 168];  // Priority buffer
uint32 _displayScreen[320 * 200]; // Final RGBA output (or 640×400)

void GfxMgr::putPixel(int16 x, int16 y, byte drawMask, byte color, byte priority) {
    int offset = y * SCRIPT_WIDTH + x;  // SCRIPT_WIDTH = 160
    if (drawMask & GFX_SCREEN_MASK_VISUAL)
        _gameScreen[offset] = color;
    if (drawMask & GFX_SCREEN_MASK_PRIORITY)
        _priorityScreen[offset] = priority;
}
```

### JavaScript Translation

```javascript
// For KQ1Tribute — dual buffer system
const GAME_WIDTH = 160;
const GAME_HEIGHT = 168;
const DISPLAY_WIDTH = 320;
const DISPLAY_HEIGHT = 200;

class AGIScreen {
    constructor() {
        this.visualBuffer = new Uint8Array(GAME_WIDTH * GAME_HEIGHT);   // color indices 0-15
        this.priorityBuffer = new Uint8Array(GAME_WIDTH * GAME_HEIGHT); // priority values 0-15
        // Off-screen canvas for double-buffered rendering
        this.offCanvas = document.createElement('canvas');
        this.offCanvas.width = DISPLAY_WIDTH;
        this.offCanvas.height = DISPLAY_HEIGHT;
        this.offCtx = this.offCanvas.getContext('2d');
    }

    putPixel(x, y, drawMask, color, priority) {
        if (x < 0 || x >= GAME_WIDTH || y < 0 || y >= GAME_HEIGHT) return;
        const offset = y * GAME_WIDTH + x;
        if (drawMask & 1) this.visualBuffer[offset] = color;  // visual
        if (drawMask & 2) this.priorityBuffer[offset] = priority; // priority
    }

    /** Render 160×168 buffer to 320×200 display (2x horizontal) */
    renderToDisplay(ctx) {
        const imageData = this.offCtx.createImageData(DISPLAY_WIDTH, DISPLAY_HEIGHT);
        const pixels = imageData.data;
        for (let y = 0; y < GAME_HEIGHT; y++) {
            for (let x = 0; x < GAME_WIDTH; x++) {
                const colorIndex = this.visualBuffer[y * GAME_WIDTH + x];
                const [r, g, b] = EGA_PALETTE_RGB[colorIndex];
                const displayX = x * 2;
                const displayY = y; // offset by status bar height in final blit
                // Write two horizontal pixels
                for (let dx = 0; dx < 2; dx++) {
                    const i = ((displayY + 8) * DISPLAY_WIDTH + displayX + dx) * 4;
                    pixels[i] = r;
                    pixels[i + 1] = g;
                    pixels[i + 2] = b;
                    pixels[i + 3] = 255;
                }
            }
        }
        this.offCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(this.offCanvas, 0, 0);
    }
}
```

---

## 2. Priority Bands

### Concept
Priority bands are the AGI engine's depth-sorting system. The 168-line game screen is divided into horizontal bands, each assigned a priority value from 4–14. An object's priority determines whether it appears in front of or behind other objects and background elements.

Priority values 0–3 are **control lines** with special meanings:

| Priority | Meaning | Effect |
|----------|---------|--------|
| **0** | Unconditional Block | Permanently impassable (walls, cliffs) |
| **1** | Conditional Block | Blocked unless `ignore.blocks` is set |
| **2** | Trigger / Signal | Sets `hit.special` flag when ego walks over |
| **3** | Water | Object must `stay.on.water` to cross; sets `on.water` flag |
| **4–14** | Depth bands | Normal drawing priorities (4 = furthest back, 14 = nearest) |
| **15** | Foreground | Always in front, ignores all control lines |

### Default Priority Table

The default table maps Y position → priority. Y 0–47 all map to priority 4, then each subsequent 12-pixel band increments:

```
 Priority    Y Range       Band Height
 --------   ----------     -----------
    4        0  – 47        48 pixels (special: everything above horizon)
    5        48 – 59        12 pixels
    6        60 – 71        12 pixels
    7        72 – 83        12 pixels
    8        84 – 95        12 pixels
    9        96 – 107       12 pixels
   10       108 – 119       12 pixels
   11       120 – 131       12 pixels
   12       132 – 143       12 pixels
   13       144 – 155       12 pixels
   14       156 – 167       12 pixels
```

### ScummVM Implementation

```cpp
// ScummVM: graphics.cpp
void GfxMgr::createDefaultPriorityTable() {
    for (int16 y = 0; y < SCRIPT_HEIGHT; y++) {
        // Default: priorities 1-14 mapped across 12-pixel bands
        int16 priority = (y / 12) + 1;
        if (priority > 14) priority = 14;
        if (priority < 4)  priority = 4;   // clamp below 4
        _priorityTable[y] = priority;
    }
}

// Custom priority base (set by script command)
void GfxMgr::setPriorityTable(int16 priorityBase) {
    _priorityTableSet = true;
    for (int16 y = 0; y < SCRIPT_HEIGHT; y++) {
        if (y < priorityBase) {
            _priorityTable[y] = 4;
        } else {
            _priorityTable[y] = (int16)((float)(y - priorityBase) /
                (float)(SCRIPT_HEIGHT - priorityBase) * 10.0f + 5.0f);
            if (_priorityTable[y] > 14) _priorityTable[y] = 14;
        }
    }
}

// Convert priority → Y position (for sprite sorting)
int16 GfxMgr::priorityToY(int16 priority) {
    for (int16 y = 0; y < SCRIPT_HEIGHT; y++) {
        if (_priorityTable[y] >= priority) return y;
    }
    return SCRIPT_HEIGHT - 1;
}
```

### NAGI Implementation

```c
// NAGI: obj_picbuff.c
u8 pri_table[172];  // 168 + 4 padding

void pri_default_gen() {
    int c, p;
    // Y 0-47: priority 4
    for (c = 0; c < 48; c++) pri_table[c] = 4;
    // Y 48-167: priorities 5-14, each spanning 12 pixels
    p = 5;
    for (c = 48; c < 168; c++) {
        pri_table[c] = p;
        if (((c - 48) % 12 == 11) && (p < 14)) p++;
    }
}
```

### agile-gdx Priority Calculation (Floating-Point)

```java
// agile-gdx: AnimatedObject.java
private byte calculatePriority(int y) {
    return (byte)(y < state.priorityBase
        ? Defines.BACK_MOST_PRIORITY   // = 4
        : (byte)(((y - state.priorityBase) / ((168.0 - state.priorityBase) / 10.0f)) + 5));
}

// Effective Y for sorting (when priority is fixed)
private short effectiveY() {
    return (fixedPriority
        ? (short)(state.priorityBase +
            Math.ceil(((168.0 - state.priorityBase) / 10.0f) *
                (priority - Defines.BACK_MOST_PRIORITY - 1)))
        : y);
}
```

### Position Validation with Priority Checking

The `canBeHere()` / `checkPriority()` function scans the object's **baseline** (bottom row of pixels) against the priority screen:

```java
// agile-gdx: AnimatedObject.java — canBeHere()
private boolean canBeHere() {
    boolean canBeHere = true;
    boolean entirelyOnWater = true;  // assume water until proven otherwise
    boolean hitSpecial = false;

    // Auto-calculate priority from Y if not fixed
    if (!this.fixedPriority) {
        this.priority = calculatePriority(this.y);
    }

    // Priority 15: skip all control line checking
    if (this.priority != 15) {
        // Scan baseline pixels (y * 160 + x .. y * 160 + x + width)
        int startPixelPos = (y * 160) + x;
        int endPixelPos = startPixelPos + xSize();

        for (int pixelPos = startPixelPos; pixelPos < endPixelPos; pixelPos++) {
            int priority = state.controlPixels[pixelPos];

            if (priority != 3) {
                entirelyOnWater = false;
                if (priority == 0) {
                    canBeHere = false; break;   // permanent block
                } else if (priority == 1) {
                    if (!ignoreBlocks) {
                        canBeHere = false; break; // conditional block
                    }
                } else if (priority == 2) {
                    hitSpecial = true;  // trigger zone
                }
            }
        }

        if (entirelyOnWater && this.stayOnLand) canBeHere = false;
        if (!entirelyOnWater && this.stayOnWater) canBeHere = false;
    }

    if (this.objectNumber == 0) {
        state.setFlag(Defines.ONWATER, entirelyOnWater);
        state.setFlag(Defines.HITSPEC, hitSpecial);
    }
    return canBeHere;
}
```

### JavaScript Translation

```javascript
class PrioritySystem {
    constructor() {
        this.priorityTable = new Uint8Array(168);
        this.priorityBase = 48; // default
        this.buildDefaultTable();
    }

    buildDefaultTable() {
        for (let y = 0; y < 168; y++) {
            if (y < this.priorityBase) {
                this.priorityTable[y] = 4;
            } else {
                this.priorityTable[y] = Math.min(14,
                    Math.floor((y - this.priorityBase) /
                    ((168 - this.priorityBase) / 10)) + 5);
            }
        }
    }

    /** Set custom priority base (some rooms use this) */
    setPriorityBase(base) {
        this.priorityBase = base;
        this.buildDefaultTable();
    }

    priorityFromY(y) {
        return this.priorityTable[Math.min(167, Math.max(0, y))];
    }

    priorityToY(priority) {
        for (let y = 0; y < 168; y++) {
            if (this.priorityTable[y] >= priority) return y;
        }
        return 167;
    }

    /** Check if an object can occupy position (x, y) with given width */
    canBeHere(x, y, width, priorityBuffer, ignoreBlocks, stayOnWater, stayOnLand) {
        const priority = this.priorityFromY(y);
        if (priority >= 15) return { canBe: true, onWater: false, hitSpecial: false };

        let onWater = true;
        let hitSpecial = false;

        for (let px = x; px < x + width; px++) {
            if (px < 0 || px >= 160) continue;
            const ctrl = priorityBuffer[y * 160 + px];

            if (ctrl !== 3) {
                onWater = false;
                if (ctrl === 0) return { canBe: false, onWater: false, hitSpecial };
                if (ctrl === 1 && !ignoreBlocks) return { canBe: false, onWater: false, hitSpecial };
                if (ctrl === 2) hitSpecial = true;
            }
        }

        if (onWater && stayOnLand) return { canBe: false, onWater, hitSpecial };
        if (!onWater && stayOnWater) return { canBe: false, onWater, hitSpecial };

        return { canBe: true, onWater, hitSpecial };
    }
}
```

---

## 3. Picture Rendering

### Overview
AGI pictures are **vector drawing command sequences**. A picture resource is a byte stream of opcodes (0xF0–0xFF) interleaved with coordinate data. The renderer draws to both the visual and priority buffers simultaneously.

### Opcode Table

| Opcode | Name | Parameters | Description |
|--------|------|-----------|-------------|
| `0xF0` | Set Visual Color | 1 byte (color 0-15) | Set drawing color for visual screen |
| `0xF1` | Disable Visual | none | Stop writing to visual screen |
| `0xF2` | Set Priority Color | 1 byte (priority 0-15) | Set drawing color for priority screen |
| `0xF3` | Disable Priority | none | Stop writing to priority screen |
| `0xF4` | Y-Corner Draw | pairs of (y, x) | Step-pattern lines alternating Y then X |
| `0xF5` | X-Corner Draw | pairs of (x, y) | Step-pattern lines alternating X then Y |
| `0xF6` | Absolute Line | pairs of (x, y) | Connected line segments |
| `0xF7` | Relative/Short Line | packed bytes | Short relative lines from current pos |
| `0xF8` | Flood Fill | pairs of (x, y) | Fill enclosed regions |
| `0xF9` | Set Pen Size/Type | 1 byte | Configure brush pattern |
| `0xFA` | Plot Brush | pairs of (x, y) | Plot brush patterns at positions |
| `0xFF` | End of Picture | none | Terminates picture data |

### Line Drawing (Bresenham)

```cpp
// ScummVM: picture.cpp — draw_Line()
void PictureMgr::draw_Line(int16 x1, int16 y1, int16 x2, int16 y2) {
    int i, x, y, deltaX, deltaY, stepX, stepY, errorX, errorY, detdelta;

    x = x1; y = y1;
    stepX = 1; stepY = 1;
    deltaX = x2 - x1; deltaY = y2 - y1;

    if (deltaY < 0) { stepY = -1; deltaY = -deltaY; }
    if (deltaX < 0) { stepX = -1; deltaX = -deltaX; }

    if (deltaY > deltaX) {
        detdelta = deltaY;
        for (i = 0, errorX = deltaY / 2; i <= deltaY; i++, y += stepY) {
            putVirtPixel(x, y);
            errorX -= deltaX;
            if (errorX < 0) { errorX += deltaY; x += stepX; }
        }
    } else {
        detdelta = deltaX;
        for (i = 0, errorY = deltaX / 2; i <= deltaX; i++, x += stepX) {
            putVirtPixel(x, y);
            errorY -= deltaY;
            if (errorY < 0) { errorY += deltaX; y += stepY; }
        }
    }
}
```

### Short/Relative Lines (Packed Byte Format)

```cpp
// ScummVM: picture.cpp — draw_LineShort()
// Each byte encodes dx and dy in 4 bits each:
//   upper nibble = dx (bit 3 = sign, bits 0-2 = magnitude)
//   lower nibble = dy (bit 3 = sign, bits 0-2 = magnitude)
void PictureMgr::draw_LineShort() {
    int16 x1 = getNextByte(); // starting point
    int16 y1 = getNextByte();
    putVirtPixel(x1, y1);

    while (true) {
        byte disp = getNextByte();
        if (disp >= 0xF0) break;  // next opcode

        int dx = (disp >> 4) & 0x07;
        if (disp & 0x80) dx = -dx;   // sign bit
        int dy = disp & 0x07;
        if (disp & 0x08) dy = -dy;   // sign bit

        draw_Line(x1, y1, x1 + dx, y1 + dy);
        x1 += dx;
        y1 += dy;
    }
}
```

### Flood Fill

```cpp
// ScummVM: picture.cpp — draw_Fill()
// Stack-based flood fill. Fills pixels that match the "empty" color:
//   - Visual: fills where current color == 15 (white = unfilled)
//   - Priority: fills where current priority == 4 (default background priority)
void PictureMgr::draw_Fill() {
    while (true) {
        int16 x = getNextByte();
        if (x >= 0xF0) break;
        int16 y = getNextByte();
        draw_FillAt(x, y);
    }
}

void PictureMgr::draw_FillAt(int16 x, int16 y) {
    // Use a stack-based approach
    Common::Stack<Common::Point> stack;
    stack.push(Common::Point(x, y));

    while (!stack.empty()) {
        Common::Point p = stack.pop();
        if (p.x < 0 || p.x >= SCRIPT_WIDTH || p.y < 0 || p.y >= SCRIPT_HEIGHT)
            continue;

        byte screenColor = _gfx->getColor(p.x, p.y);
        byte screenPriority = _gfx->getPriority(p.x, p.y);

        // Only fill if the pixel is "empty"
        if (_scrOn && screenColor != 15) continue;
        if (_priOn && screenPriority != 4) continue;

        putVirtPixel(p.x, p.y);

        // Push neighbors (4-connected)
        if (p.y > 0) stack.push(Common::Point(p.x, p.y - 1));
        if (p.x + 1 < SCRIPT_WIDTH) stack.push(Common::Point(p.x + 1, p.y));
        if (p.y + 1 < SCRIPT_HEIGHT) stack.push(Common::Point(p.x, p.y + 1));
        if (p.x > 0) stack.push(Common::Point(p.x - 1, p.y));
    }
}
```

### Brush/Pen Plotting

The AGI engine supports circle and square brushes with optional "splatter" (random dithering):

```cpp
// ScummVM: picture.cpp
static const uint8 _circles[][15] = {
    { 0 },                                                           // size 0
    { 0, 1, 1, 1, 0 },                                               // size 1
    { 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0 },                      // size 2
    { 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, // ... etc           // size 3
    // ...up to size 7
};

void PictureMgr::plotPattern(int16 x, int16 y) {
    int circleSize = _penSize;
    bool isCircle = (_penStyle & 0x10);  // bit 4: 1=circle, 0=square
    bool isSplatter = (_penStyle & 0x20); // bit 5: 1=splatter/dither

    // LFSR splatter pattern
    static uint16 splatterBit = 0x01;
    static uint8 splatterT = 0;
    if (isSplatter) {
        splatterT = (splatterBit & 1) ? (splatterT ^ 0xB8) : splatterT;
        splatterBit >>= 1; // or: splatterT = (splatterT * 2) ^ ...
    }

    for (int py = y - circleSize; py <= y + circleSize; py++) {
        for (int px = x - circleSize; px <= x + circleSize; px++) {
            bool draw = true;
            if (isCircle) {
                // Check circle lookup table
                draw = circleData[...]; // indexed into _circles
            }
            if (isSplatter) {
                // LFSR dither: advance t, only draw if bit is set
                splatterT = splatterT >> 1;
                if (splatterT & 0x01) splatterT ^= 0xB8;
                draw = draw && (splatterT & 0x02);
            }
            if (draw) putVirtPixel(px, py);
        }
    }
}
```

### Complete Picture Command Decoder

```javascript
// JavaScript: AGI Picture Renderer
class PictureRenderer {
    constructor(screen) {
        this.screen = screen;
        this.scrOn = false;  // visual screen enabled
        this.priOn = false;  // priority screen enabled
        this.scrColor = 0;
        this.priColor = 0;
        this.penSize = 0;
        this.penStyle = 0;   // bit 4 = circle, bit 5 = splatter
    }

    decode(data) {
        let pos = 0;
        const getByte = () => data[pos++];

        while (pos < data.length) {
            const opcode = getByte();
            if (opcode === 0xFF) break; // end of picture

            switch (opcode) {
                case 0xF0: // Set visual color
                    this.scrColor = getByte();
                    this.scrOn = true;
                    break;
                case 0xF1: // Disable visual draw
                    this.scrOn = false;
                    break;
                case 0xF2: // Set priority color
                    this.priColor = getByte();
                    this.priOn = true;
                    break;
                case 0xF3: // Disable priority draw
                    this.priOn = false;
                    break;
                case 0xF4: // Y-corner lines
                    this._drawCorner(data, pos, true);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
                case 0xF5: // X-corner lines
                    this._drawCorner(data, pos, false);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
                case 0xF6: // Absolute lines
                    this._drawAbsLine(data, pos);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
                case 0xF7: // Short/relative lines
                    this._drawShortLine(data, pos);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
                case 0xF8: // Flood fill
                    this._floodFill(data, pos);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
                case 0xF9: // Set pen size/style
                    this.penStyle = getByte();
                    this.penSize = this.penStyle & 0x07;
                    break;
                case 0xFA: // Plot with pen
                    this._plotBrush(data, pos);
                    pos = this._skipUntilOpcode(data, pos);
                    break;
            }
        }
    }

    putVirtPixel(x, y) {
        if (x < 0 || x >= 160 || y < 0 || y >= 168) return;
        let mask = 0;
        if (this.scrOn) mask |= 1;
        if (this.priOn) mask |= 2;
        this.screen.putPixel(x, y, mask, this.scrColor, this.priColor);
    }

    _drawLine(x1, y1, x2, y2) {
        // Bresenham's line algorithm
        let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
        let sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
        let x = x1, y = y1;

        if (dy > dx) {
            let err = Math.floor(dy / 2);
            for (let i = 0; i <= dy; i++) {
                this.putVirtPixel(x, y);
                y += sy;
                err -= dx;
                if (err < 0) { err += dy; x += sx; }
            }
        } else {
            let err = Math.floor(dx / 2);
            for (let i = 0; i <= dx; i++) {
                this.putVirtPixel(x, y);
                x += sx;
                err -= dy;
                if (err < 0) { err += dx; y += sy; }
            }
        }
    }

    _floodFillAt(startX, startY) {
        const stack = [[startX, startY]];
        const visited = new Set();
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= 160 || y < 0 || y >= 168) continue;
            const key = y * 160 + x;
            if (visited.has(key)) continue;
            visited.add(key);

            // Only fill "empty" pixels (visual=15, priority=4)
            if (this.scrOn && this.screen.visualBuffer[key] !== 15) continue;
            if (this.priOn && this.screen.priorityBuffer[key] !== 4) continue;

            this.putVirtPixel(x, y);
            stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
        }
    }

    // ... corner, absolute, short-line, brush plotting helpers follow same patterns
}
```

---

## 4. Screen Transitions

### Amiga-Style LFSR Dissolve

The most iconic AGI transition is the **pseudo-random dissolve** using a Linear Feedback Shift Register (LFSR). It reveals the new screen by pseudo-randomly activating individual pixels.

```cpp
// ScummVM: graphics.cpp — Amiga fade transition
void GfxMgr::transition_Amiga() {
    uint16 screenPos = 1;
    uint32 reached_goal = 0;

    // Total pixels in game area: 160 * 168 * 0.5 = ~13440 unique positions
    do {
        // Advance LFSR
        screenPos = screenPos ^ 0x3500;  // XOR feedback polynomial

        // Map LFSR value to screen position
        if (screenPos < (160 * 168)) {
            // Copy pixel from new picture to display
            int16 x = screenPos % SCRIPT_WIDTH;
            int16 y = screenPos / SCRIPT_WIDTH;
            render_Block(x, y, 1, 1);  // render single pixel
            reached_goal++;

            // Update display periodically for visible dissolve effect
            if ((reached_goal % 220) == 0) {
                // Blit to actual screen — creates ~30 visual updates over ~0.5 sec
                g_system->updateScreen();
                g_system->delayMillis(
                    (reached_goal <= 3300) ? 
                    (7 - (reached_goal / 660)) : 1
                );
            }
        }
    } while (screenPos != 1);  // LFSR cycles back to initial seed
}
```

### Atari ST Transition (Higher Resolution LFSR)

```cpp
// ScummVM: graphics.cpp — Atari ST
void GfxMgr::transition_AtariSt() {
    uint32 screenPos = 1;
    uint32 reached_goal = 0;
    // Operates at double-width display (320×168)
    do {
        screenPos = screenPos ^ 0xD5A0;  // Different polynomial
        if (screenPos < (320 * 168)) {
            int16 x = (screenPos % 320) / 2;  // map back to 160-wide
            int16 y = screenPos / 320;
            render_Block(x, y, 1, 1);
            reached_goal++;
            if ((reached_goal % 168) == 0) {
                g_system->updateScreen();
                g_system->delayMillis(
                    (reached_goal <= 2800) ? 5 : 1
                );
            }
        }
    } while (screenPos != 1);
}
```

### JavaScript Dissolve Transition

```javascript
class DissolveTransition {
    constructor(displayWidth, displayHeight) {
        this.width = displayWidth;    // 320
        this.height = displayHeight;  // 168
        this.totalPixels = this.width * this.height;
        this.lfsrState = 1;
        this.pixelsRevealed = 0;
        this.active = false;
        this.pixelsPerFrame = 1800; // Adjust for speed (~30 frames to complete)
    }

    start() {
        this.lfsrState = 1;
        this.pixelsRevealed = 0;
        this.active = true;
    }

    /**
     * Call each frame. Returns array of [x, y] pixel positions to reveal.
     * When empty, the transition is complete.
     */
    step() {
        if (!this.active) return [];
        const reveals = [];

        for (let i = 0; i < this.pixelsPerFrame; i++) {
            // Advance LFSR (15-bit maximal-length for 320×168 = 53760)
            let bit = ((this.lfsrState >> 0) ^ (this.lfsrState >> 2)) & 1;
            this.lfsrState = (this.lfsrState >> 1) | (bit << 14);

            // Alternative: use XOR polynomial like original AGI
            // this.lfsrState ^= 0x3500;

            if (this.lfsrState < this.totalPixels) {
                const x = this.lfsrState % this.width;
                const y = Math.floor(this.lfsrState / this.width);
                reveals.push([x, y]);
                this.pixelsRevealed++;
            }

            if (this.lfsrState === 1) {
                this.active = false;
                break;
            }
        }
        return reveals;
    }
}

// Usage in game loop:
function transitionToNewRoom(oldImageData, newImageData, ctx) {
    const dissolve = new DissolveTransition(320, 168);
    dissolve.start();

    function animateTransition() {
        const pixels = dissolve.step();
        for (const [x, y] of pixels) {
            // Copy pixel from new image to display
            const srcIdx = (y * 320 + x) * 4;
            ctx.fillStyle = `rgb(${newImageData.data[srcIdx]},${newImageData.data[srcIdx+1]},${newImageData.data[srcIdx+2]})`;
            ctx.fillRect(x, y + 8, 1, 1); // +8 for status bar offset
        }
        if (dissolve.active) {
            requestAnimationFrame(animateTransition);
        }
    }
    animateTransition();
}
```

### Other Transition Types (from SCUMM-8)

SCUMM-8 implements additional transition styles that work well for HTML5 Canvas:

```lua
-- SCUMM-8: Iris transition (circle wipe)
-- Opens from center of screen outward
-- Closes from edges to center

-- Cut transition: instant room swap (no animation)
```

```javascript
// JavaScript: Iris (circle wipe) transition
class IrisTransition {
    constructor(centerX, centerY, maxRadius) {
        this.cx = centerX || 160;
        this.cy = centerY || 92;
        this.maxRadius = maxRadius || 200;
        this.currentRadius = 0;
        this.speed = 8; // pixels per frame
        this.opening = true;
        this.active = false;
    }

    start(opening = true) {
        this.opening = opening;
        this.currentRadius = opening ? 0 : this.maxRadius;
        this.active = true;
    }

    step(ctx, newSceneRenderer) {
        if (!this.active) return;

        // Draw new scene
        newSceneRenderer();

        // Mask with circle
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(this.cx, this.cy + 8, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Advance
        this.currentRadius += this.opening ? this.speed : -this.speed;
        if (this.opening && this.currentRadius >= this.maxRadius) this.active = false;
        if (!this.opening && this.currentRadius <= 0) this.active = false;
    }
}
```

---

## 5. EGA 16-Color Palette & Dithering

### Canonical EGA Palette

The AGI engine uses the standard IBM EGA 16-color palette. Original values are 6-bit per channel (0x00–0x3F), scaled to 8-bit for modern displays.

```cpp
// ScummVM: palette.h — PALETTE_EGA (6-bit RGB values)
static const byte PALETTE_EGA[] = {
    0x00, 0x00, 0x00,   //  0: Black
    0x00, 0x00, 0x2A,   //  1: Blue
    0x00, 0x2A, 0x00,   //  2: Green
    0x00, 0x2A, 0x2A,   //  3: Cyan
    0x2A, 0x00, 0x00,   //  4: Red
    0x2A, 0x00, 0x2A,   //  5: Magenta
    0x2A, 0x15, 0x00,   //  6: Brown
    0x2A, 0x2A, 0x2A,   //  7: Light Gray
    0x15, 0x15, 0x15,   //  8: Dark Gray
    0x15, 0x15, 0x3F,   //  9: Light Blue
    0x15, 0x3F, 0x15,   // 10: Light Green
    0x15, 0x3F, 0x3F,   // 11: Light Cyan
    0x3F, 0x15, 0x15,   // 12: Light Red
    0x3F, 0x15, 0x3F,   // 13: Light Magenta
    0x3F, 0x3F, 0x15,   // 14: Yellow
    0x3F, 0x3F, 0x3F,   // 15: White
};
// Note: Scale 6-bit to 8-bit: value * 255 / 63 (or value * 4 + value / 16)
```

### JavaScript EGA Palette

```javascript
// 8-bit RGB values (6-bit values scaled: v * 255 / 63)
const EGA_PALETTE_RGB = [
    [0x00, 0x00, 0x00],  //  0: Black
    [0x00, 0x00, 0xAA],  //  1: Blue
    [0x00, 0xAA, 0x00],  //  2: Green
    [0x00, 0xAA, 0xAA],  //  3: Cyan
    [0xAA, 0x00, 0x00],  //  4: Red
    [0xAA, 0x00, 0xAA],  //  5: Magenta
    [0xAA, 0x55, 0x00],  //  6: Brown
    [0xAA, 0xAA, 0xAA],  //  7: Light Gray
    [0x55, 0x55, 0x55],  //  8: Dark Gray
    [0x55, 0x55, 0xFF],  //  9: Light Blue
    [0x55, 0xFF, 0x55],  // 10: Light Green
    [0x55, 0xFF, 0xFF],  // 11: Light Cyan
    [0xFF, 0x55, 0x55],  // 12: Light Red
    [0xFF, 0x55, 0xFF],  // 13: Light Magenta
    [0xFF, 0xFF, 0x55],  // 14: Yellow
    [0xFF, 0xFF, 0xFF],  // 15: White
];

// CSS hex equivalents (matching your existing EGA object)
const EGA_PALETTE_HEX = [
    '#000000', '#0000AA', '#00AA00', '#00AAAA',
    '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF',
    '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
];
```

### Platform-Specific Palettes

ScummVM defines alternate palettes for every platform AGI ran on:

| Platform | Bit Depth | Scale Factor | Notes |
|----------|-----------|-------------|-------|
| **EGA** | 6-bit | × 4.048 | Standard IBM EGA |
| **CGA** | 8-bit | × 1 | 4 colors + dithered mixtures |
| **Hercules** | monochrome | — | Green or amber tint |
| **Amiga** | 4-bit | × 17 | 3 palette variants (V1/V2/V3) |
| **Apple IIGS** | 4-bit | × 17 | Slightly different hues |
| **Atari ST** | 3-bit | × 36.43 | |
| **Macintosh** | 16-bit CLUT | ÷ 256 | 3 CLUT variants |
| **VGA** | 8-bit | × 1 | 256-color later games |

### CGA Dithering (Mixture Colors)

CGA couldn't display 16 colors, so AGI dithered them by alternating two CGA colors:

```cpp
// ScummVM: graphics.cpp
static const byte CGA_MixtureColorTable[] = {
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
    0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF
};
// Each nibble is a CGA color index.
// Even pixels use high nibble, odd pixels use low nibble.

void GfxMgr::render_BlockCGA(int16 x, int16 y, int16 width, int16 height) {
    for (/* each pixel */) {
        byte egaColor = _gameScreen[srcOffset];
        byte cgaMixture = CGA_MixtureColorTable[egaColor];
        byte cgaColor1 = cgaMixture >> 4;    // high nibble
        byte cgaColor2 = cgaMixture & 0x0F;  // low nibble
        // Alternate between the two colors based on pixel position
        _displayScreen[dstOffset] = cgaColor1;     // left pixel
        _displayScreen[dstOffset + 1] = cgaColor2; // right pixel
    }
}
```

### NAGI's Row-Based Dithering

```c
// NAGI: sbuf_util.c
// Even/odd row dithering for "mixed" colors
u8 col_even, col_odd;

void sbuff_plot(int x, int y) {
    u8 *b = gfx_picbuff + y * 160 + x;
    u8 colour = (y & 1) ? col_odd : col_even;
    *b = (*b | sbuff_drawmask) & colour;
}

// Setting a dithered color (two EGA indices packed into even/odd):
// col_even = (vis_low << 0) | (pri << 4)
// col_odd  = (vis_high << 0) | (pri << 4)
```

### Hercules Monochrome Dithering (8×16 Pattern)

```cpp
// ScummVM: graphics.cpp
static const byte herculesColorMapping[] = {
    // 16 entries × 8 bytes = 128 bytes
    // Each EGA color maps to an 8-pixel horizontal dither pattern
    // 0 = black pixel, 1 = lit pixel
    0, 0, 0, 0, 0, 0, 0, 0,   // EGA 0 (black)  → all off
    1, 0, 0, 0, 1, 0, 0, 0,   // EGA 1 (blue)   → sparse dots
    0, 1, 0, 0, 0, 1, 0, 0,   // EGA 2 (green)  → offset sparse dots
    1, 0, 1, 0, 1, 0, 1, 0,   // EGA 3 (cyan)   → checkerboard
    // ... etc up to
    1, 1, 1, 1, 1, 1, 1, 1,   // EGA 15 (white) → all on
};
```

### JavaScript EGA Dithering Effect

```javascript
/**
 * Apply CGA-style checkerboard dithering to simulate mixed colors.
 * Useful for creating that authentic retro look on a Canvas.
 */
function ditherPattern(ctx, x, y, w, h, color1Idx, color2Idx) {
    const c1 = EGA_PALETTE_HEX[color1Idx];
    const c2 = EGA_PALETTE_HEX[color2Idx];
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            ctx.fillStyle = ((px + py) % 2 === 0) ? c1 : c2;
            ctx.fillRect(px, py, 1, 1);
        }
    }
}

/**
 * EGA-style brush splatter using LFSR (same algorithm as AGI picture renderer).
 * Creates the distinctive random dither pattern used for bushes, grass, etc.
 */
function splatterBrush(ctx, cx, cy, size, colorIdx, seed) {
    let t = seed || 0;
    const color = EGA_PALETTE_HEX[colorIdx];
    ctx.fillStyle = color;

    for (let py = cy - size; py <= cy + size; py++) {
        for (let px = cx - size; px <= cx + size; px++) {
            // Advance LFSR
            if (t & 1) t = (t >> 1) ^ 0xB8;
            else t = t >> 1;

            // Draw only if LFSR bit is set (creates random pattern)
            if (t & 0x02) {
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }
}
```

---

## 6. VIEW System (Sprites & Animation)

### Resource Hierarchy

```
VIEW (resource)
  ├── headerStepSize, headerCycleTime
  ├── description (optional text)
  └── Loop[] (0..n)
       └── Cel[] (0..m)
            ├── width, height
            ├── clearKey (transparent color index)
            ├── mirrored (flag)
            └── rawBitmap (RLE-decoded pixel data)
```

### RLE Cel Decompression

Each cel's pixel data is **Run-Length Encoded**. Each byte encodes:
- **High nibble** (bits 4-7): color index (0-15)
- **Low nibble** (bits 0-3): run length

A byte of `0x00` marks end-of-row (remaining pixels fill with transparent color).

```cpp
// ScummVM: view.cpp — Cel decoding
void AgiEngine::unpackViewCelData(AgiViewCel &cel, const uint8 *data, uint16 len) {
    int bitmapSize = cel.width * cel.height;
    cel.rawBitmap = new uint8[bitmapSize];

    int pixelPos = 0;
    int dataPos = 0;

    for (int y = 0; y < cel.height; y++) {
        // RLE decode one row
        while (dataPos < len) {
            byte rleData = data[dataPos++];
            if (rleData == 0) break; // end of row

            byte color = (rleData >> 4) & 0x0F;
            byte runLen = rleData & 0x0F;

            for (int i = 0; i < runLen; i++) {
                if (cel.mirrored) {
                    // Mirror: write right-to-left
                    int mirrorX = cel.width - 1 - (pixelPos % cel.width);
                    cel.rawBitmap[y * cel.width + mirrorX] = color;
                } else {
                    cel.rawBitmap[pixelPos] = color;
                }
                pixelPos++;
            }
        }
        // Fill remaining pixels in row with transparent color
        while ((pixelPos % cel.width) != 0) {
            if (cel.mirrored) {
                int mirrorX = cel.width - 1 - (pixelPos % cel.width);
                cel.rawBitmap[y * cel.width + mirrorX] = cel.clearKey;
            } else {
                cel.rawBitmap[pixelPos] = cel.clearKey;
            }
            pixelPos++;
        }
    }
}
```

### Direction-to-Loop Mapping

AGI automatically selects the animation loop based on movement direction:

```cpp
// ScummVM: view.cpp
//                        stop  up  upR  R   dnR  dn  dnL  L   upL
static byte loopTable2[] = { 0, 0,   0,  0,   0,  0,   0,  1,  1 };  // 2-3 loops
static byte loopTable4[] = { 0, 3,   0,  0,   0,  2,   0,  1,  1 };  // 4+ loops

// Loop meanings by index:
// 0 = Right facing
// 1 = Left facing
// 2 = Front (towards camera)
// 3 = Back (away from camera)

void AgiEngine::updateScreenObjTable() {
    for (auto &obj : _game.screenObjTable) {
        if (!obj.flags & fAnimated) continue;
        if (!obj.flags & fUpdate) continue;
        if (!obj.flags & fDrawn) continue;

        // Auto-select loop from direction (unless loop is fixed)
        if (!(obj.flags & fFixLoop)) {
            if (obj.numberOfLoops < 2 || obj.numberOfLoops > 3) {
                // Use 4-loop table for 4+ loops, skip for 1 loop
            }
            byte newLoop = (obj.numberOfLoops <= 3)
                ? loopTable2[obj.direction]
                : loopTable4[obj.direction];
            if (newLoop != obj.currentLoop) {
                obj.setLoop(newLoop);
            }
        }

        // Advance cel (animation frame)
        if (obj.flags & fCycling) {
            if (--obj.cycleTimeCount == 0) {
                obj.cycleTimeCount = obj.cycleTime;
                advanceCel(obj);
            }
        }
    }
}
```

### Cel Cycling Types

```java
// agile-gdx: AnimatedObject.java
public void advanceCel() {
    int theCel = currentCel;
    int lastCel = numberOfCels() - 1;

    switch (cycleType) {
        case NORMAL:
            // Forward loop: 0 → 1 → 2 → ... → last → 0
            if (++theCel > lastCel) theCel = 0;
            break;

        case END_LOOP:
            // Play forward to end, then stop and set flag
            if (theCel >= lastCel || ++theCel == lastCel) {
                state.setFlag(motionParam1, true);
                cycle = false;
                direction = 0;
                cycleType = CycleType.NORMAL;
            }
            break;

        case REVERSE_LOOP:
            // Play backward to start, then stop and set flag
            if (theCel == 0 || --theCel == 0) {
                state.setFlag(motionParam1, true);
                cycle = false;
                direction = 0;
                cycleType = CycleType.NORMAL;
            }
            break;

        case REVERSE:
            // Continuous reverse: last → last-1 → ... → 0 → last
            if (theCel > 0) --theCel;
            else theCel = lastCel;
            break;
    }
    setCel(theCel);
}
```

### Sprite Drawing with Priority Occlusion

The core of the AGI rendering: each sprite pixel is tested against the priority screen to determine visibility.

```cpp
// ScummVM: sprite.cpp — drawCel()
void SpritesMgr::drawCel(ScreenObjEntry *screenObj) {
    int16 x = screenObj->xPos;
    int16 y = screenObj->yPos - screenObj->ySize + 1; // top of sprite
    int16 celWidth = screenObj->xSize;
    int16 celHeight = screenObj->ySize;
    byte *celData = screenObj->celData;
    byte objPriority = screenObj->priority;

    for (int16 cy = 0; cy < celHeight; cy++) {
        for (int16 cx = 0; cx < celWidth; cx++) {
            byte pixelColor = celData[cy * celWidth + cx];

            // Skip transparent pixels
            if (pixelColor == screenObj->clearKey) continue;

            int16 sx = x + cx;
            int16 sy = y + cy;
            if (sx < 0 || sx >= 160 || sy < 0 || sy >= 168) continue;

            byte screenPriority = _gfx->getPriority(sx, sy);

            // Control lines (priority 0-2): scan downward to find actual priority
            if (screenPriority <= 2) {
                screenPriority = checkControlPixel(sx, sy);
            }

            // Draw pixel only if object priority >= screen priority
            if (objPriority >= screenPriority) {
                _gfx->putPixel(sx, sy, GFX_SCREEN_MASK_ALL, pixelColor, objPriority);
            }
        }
    }
}

// Check control pixel: scan downward to find real priority
byte GfxMgr::checkControlPixel(int16 x, int16 y) {
    // If pixel has control-line priority (0-2), look below for real priority
    for (int16 checkY = y + 1; checkY < SCRIPT_HEIGHT; checkY++) {
        byte pri = getPriority(x, checkY);
        if (pri > 2) return pri;  // found a real priority
    }
    return 4; // default if nothing found
}
```

### NAGI's Sprite Blitting

```c
// NAGI: obj_blit.c
void obj_blit(OBJT *ot) {
    u8 *pb;      // pointer into priority buffer
    u8 pb_pri;   // priority at this pixel
    u8 ot_pri;   // object's priority

    ot_pri = ot->priority << 4; // shift to upper nibble for comparison

    for (int y = 0; y < ot->y_size; y++) {
        for (int x = 0; x < ot->x_size; x++) {
            u8 pixel = cel_data[...]; // RLE-decoded pixel
            if (pixel == ot->clear_key) continue;

            pb = gfx_picbuff + (ot->y_draw + y) * 160 + (ot->x + x);
            pb_pri = *pb & 0xF0; // upper nibble = priority

            // If priority <= 0x20 (control line), scan down for real priority
            if (pb_pri <= 0x20) {
                pb_pri = scan_down_for_priority(ot->x + x, ot->y_draw + y);
            }

            // Draw only if object priority >= background priority
            if (ot_pri >= pb_pri) {
                *pb = (*pb & 0xF0) | pixel; // write visual color (low nibble)
                // Also update priority nibble
                *pb = pixel | ot_pri;
            }
        }
    }
}
```

### Sprite Sorting (Draw Order)

Sprites are sorted by their effective Y position (or priority-to-Y for fixed-priority objects):

```java
// agile-gdx: AnimatedObject.java — Comparable implementation
public int compareTo(AnimatedObject other) {
    if (this.priority < other.priority) return -1;
    if (this.priority > other.priority) return 1;
    // Same priority: compare effective Y
    if (this.effectiveY() < other.effectiveY()) return -1;
    if (this.effectiveY() > other.effectiveY()) return 1;
    return 0; // same depth
}
```

### Background Save/Restore (Sprite Buffering)

Before drawing a sprite, the background underneath is saved. Before the next frame, backgrounds are restored in reverse order:

```java
// agile-gdx: AnimatedObject.java — Background save during draw()
this.saveArea.visBackPixels = new int[cellWidth][cellHeight];
this.saveArea.priBackPixels = new int[cellWidth][cellHeight];
this.saveArea.x = this.x;
this.saveArea.y = this.y;

// During draw: save existing pixels before overwriting
this.saveArea.visBackPixels[x][y] = state.visualPixels[screenPos];
this.saveArea.priBackPixels[x][y] = state.priorityPixels[priorityPos];

// Restore: write saved pixels back
public void restoreBackPixels() {
    // Iterate over saved area and write back original values
    state.visualPixels[screenPos] = saveArea.visBackPixels[x][y];
    state.priorityPixels[priorityPos] = saveArea.priBackPixels[x][y];
}
```

### Add-to-Pic (Static Sprites)

`add.to.pic` permanently embeds a view cel into the picture buffer with an optional **control box** that prevents objects from walking through it:

```java
// agile-gdx: AnimatedObject.java — draw() with control box
if (controlBoxColour <= 3) {
    // Calculate height based on priority band
    int height = /* height of priority band or cel height (whichever smaller) */;

    // Draw bottom line of control box
    for (int i = 0; i < xSize(); i++) {
        priorityPixels[(this.y * 160) + this.x + i] = controlBoxColour;
    }
    // Draw sides
    for (int i = 1; i < height; i++) {
        priorityPixels[((this.y - i) * 160) + this.x] = controlBoxColour;
        priorityPixels[((this.y - i) * 160) + this.x + xSize() - 1] = controlBoxColour;
    }
    // Draw top line
    for (int i = 1; i < xSize() - 1; i++) {
        priorityPixels[((this.y - (height - 1)) * 160) + this.x + i] = controlBoxColour;
    }
}
```

### JavaScript Sprite System

```javascript
class Sprite {
    constructor(objectNum) {
        this.objectNum = objectNum;
        this.x = 0; this.y = 0;
        this.prevX = 0; this.prevY = 0;
        this.viewNum = 0;
        this.loopNum = 0;
        this.celNum = 0;
        this.priority = 0;
        this.fixedPriority = false;
        this.direction = 0;   // 0=stop, 1=up, 2=upRight, ..., 8=upLeft
        this.stepSize = 1;
        this.stepTime = 1;
        this.stepTimeCount = 1;
        this.cycleTime = 1;
        this.cycleTimeCount = 1;
        this.cycleType = 'normal'; // normal, endLoop, reverseLoop, reverse
        this.drawn = false;
        this.animated = false;
        this.cycling = true;
        this.ignoreBlocks = false;
        this.ignoreHorizon = false;
        this.ignoreObjects = false;
        this.fixedLoop = false;
        this.stayOnWater = false;
        this.stayOnLand = false;
        this.saveArea = null;
    }
}

// Direction lookup tables
const DX = [0, 0, 1, 1, 1, 0, -1, -1, -1]; // indexed by direction 0-8
const DY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
const LOOP_TABLE_2 = [0, 0, 0, 0, 0, 0, 0, 1, 1]; // 2-3 loops
const LOOP_TABLE_4 = [0, 3, 0, 0, 0, 2, 0, 1, 1]; // 4+ loops

class SpriteManager {
    constructor(screen, prioritySystem) {
        this.screen = screen;
        this.priority = prioritySystem;
        this.sprites = [];
    }

    /** Sort sprites for drawing (back-to-front) */
    sortSprites() {
        this.sprites.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            const ay = a.fixedPriority ? this.priority.priorityToY(a.priority) : a.y;
            const by = b.fixedPriority ? this.priority.priorityToY(b.priority) : b.y;
            return ay - by;
        });
    }

    /** Draw sprite with priority occlusion */
    drawSprite(sprite, celPixels, celWidth, celHeight, clearKey) {
        const topY = sprite.y - celHeight + 1;

        // Save background
        sprite.saveArea = {
            vis: [], pri: [],
            x: sprite.x, y: sprite.y,
            w: celWidth, h: celHeight
        };

        for (let cy = 0; cy < celHeight; cy++) {
            for (let cx = 0; cx < celWidth; cx++) {
                const pixel = celPixels[cy * celWidth + cx];
                if (pixel === clearKey) continue;

                const sx = sprite.x + cx;
                const sy = topY + cy;
                if (sx < 0 || sx >= 160 || sy < 0 || sy >= 168) continue;

                const offset = sy * 160 + sx;

                // Save background
                sprite.saveArea.vis.push({ offset, val: this.screen.visualBuffer[offset] });
                sprite.saveArea.pri.push({ offset, val: this.screen.priorityBuffer[offset] });

                let bgPriority = this.screen.priorityBuffer[offset];

                // Control line: scan down
                if (bgPriority <= 2) {
                    bgPriority = this._scanDownPriority(sx, sy);
                }

                // Depth test
                if (sprite.priority >= bgPriority) {
                    this.screen.visualBuffer[offset] = pixel;
                    this.screen.priorityBuffer[offset] = sprite.priority;
                }
            }
        }
    }

    /** Restore backgrounds in reverse order */
    restoreBackgrounds() {
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const sa = this.sprites[i].saveArea;
            if (!sa) continue;
            for (const p of sa.vis) this.screen.visualBuffer[p.offset] = p.val;
            for (const p of sa.pri) this.screen.priorityBuffer[p.offset] = p.val;
        }
    }

    _scanDownPriority(x, y) {
        for (let checkY = y + 1; checkY < 168; checkY++) {
            const pri = this.screen.priorityBuffer[checkY * 160 + x];
            if (pri > 2) return pri;
        }
        return 4;
    }
}
```

### The Animation Cycle

Every AGI "cycle" (game tick) performs this sequence:

```
1. Update logic (script execution)
2. For each animated object:
   a. Auto-select loop from direction (unless fixedLoop)
   b. Advance cel (if cycling and cycleTimeCount reaches 0)
   c. Update position (if moving and stepTimeCount reaches 0)
   d. Check boundary collisions, priority/control lines
3. Restore all sprite backgrounds (reverse paint order)
4. Sort sprites by priority/Y
5. Save backgrounds under new positions
6. Draw all sprites (front-to-back? No — back-to-front with priority test)
7. Show updated screen regions
```

### Movement & Collision (from agile-gdx)

```java
// Direction-to-delta lookup
private static short[] xs = { 0, 0, 1, 1, 1, 0, -1, -1, -1 };
private static short[] ys = { 0, -1, -1, 0, 1, 1, 1, 0, -1 };

public void updatePosition() {
    if (animated && update && drawn) {
        if (--stepTimeCount != 0) return;
        stepTimeCount = stepTime;

        short ox = this.x, oy = this.y;

        if (!repositioned) {
            ox += (short)(xs[direction] * stepSize);
            oy += (short)(ys[direction] * stepSize);
        }

        // Border checks
        if (ox < MINX) { ox = MINX; border = LEFT; }
        if (ox + xSize() > MAXX + 1) { ox = (short)(MAXX + 1 - xSize()); border = RIGHT; }
        if (oy - ySize() < MINY - 1) { oy = (short)(MINY - 1 + ySize()); border = TOP; }
        if (oy > MAXY) { oy = MAXY; border = BOTTOM; }
        if (!ignoreHorizon && oy <= horizon) { oy = (short)(horizon + 1); border = TOP; }

        this.x = ox; this.y = oy;

        // Validate position
        if (collide() || !canBeHere()) {
            this.x = px; this.y = py; // revert
            border = 0;
            findPosition(); // spiral search for valid position
        }
    }
}
```

### Spiral Position Search (findPosition)

When an object is placed in an invalid position, AGI spirals outward to find the nearest valid spot:

```java
// agile-gdx: AnimatedObject.java
public void findPosition() {
    if ((this.y <= state.horizon) && !this.ignoreHorizon) {
        this.y = (short)(state.horizon + 1);
    }
    if (goodPosition() && !collide() && canBeHere()) return;

    // Spiral: left → down → right → up, expanding each revolution
    int legLen = 1, legDir = 0, legCnt = 1;
    while (!goodPosition() || collide() || !canBeHere()) {
        switch (legDir) {
            case 0: --this.x; if (--legCnt == 0) { legDir = 1; legCnt = legLen; } break;
            case 1: ++this.y; if (--legCnt == 0) { legDir = 2; legCnt = ++legLen; } break;
            case 2: ++this.x; if (--legCnt == 0) { legDir = 3; legCnt = legLen; } break;
            case 3: --this.y; if (--legCnt == 0) { legDir = 0; legCnt = ++legLen; } break;
        }
    }
}
```

---

## 7. Text Parser

### Word Dictionary (WORDS.TOK Format)

AGI stores its word dictionary in a file called `WORDS.TOK`. Words are organized in 26 buckets (A–Z), compressed with shared-prefix encoding, and XOR-encrypted with `0x7F`.

```cpp
// ScummVM: words.cpp
int AgiEngine::loadWords(const char *fname) {
    Common::File fp;
    fp.open(fname);

    // Header: 26 uint16 offsets (one per letter A-Z)
    for (int i = 0; i < 26; i++) {
        _game.wordSectionOffsets[i] = fp.readUint16BE();
    }

    // Each word entry:
    // [1 byte: copy count] — how many chars to keep from previous word
    // [n bytes: XOR 0x7F encrypted chars] — new suffix
    // Terminated by byte with high bit set (last char | 0x80)
    // [2 bytes: word group number (BE)] — word ID
}
```

### Input Parsing

```cpp
// ScummVM: words.cpp — parseUsingDictionary()
void Words::parseUsingDictionary(const char *inputLine) {
    // 1. Clean input: strip punctuation, lowercase
    // 2. Split on separators: space , . ? ! ( ) ; : [ ] { }
    // 3. Look up each word in dictionary

    // Separators
    const char separators[] = " ,.?!()[];:{}";

    for (/* each word in input */) {
        // Skip "a" and "i" (single-letter words are ignored)
        if (wordLen == 1 && (word[0] == 'a' || word[0] == 'i')) continue;

        int wordId = findWordInDictionary(currentWord);

        if (wordId == DICTIONARY_RESULT_UNKNOWN) {
            // Unknown word — set flag, store the word for error message
            _vm->setFlag(VM_FLAG_SAID_ACCEPTED_INPUT, false);
            return;
        }

        if (wordId == DICTIONARY_RESULT_IGNORE) {
            continue; // articles, prepositions, etc. (word ID 0)
        }

        // Store recognized word ID
        _egoWords[_egoWordCount].id = wordId;
        _egoWords[_egoWordCount].word = currentWord;
        _egoWordCount++;
    }

    _vm->setFlag(VM_FLAG_ENTERED_CLI, true);
    _vm->setFlag(VM_FLAG_SAID_ACCEPTED_INPUT, true);
}
```

### The `said()` Test Command

The `said()` command in AGI scripts checks if the player typed specific word groups. It uses a simple pattern matching with wildcard support:

| Word ID | Meaning |
|---------|---------|
| `1` | "anyword" — matches any single word |
| `9999` | "rest of line" — matches remaining words |

```
// Script example: said(90, 54)
// Matches if player typed word-group-90 followed by word-group-54
// e.g., "look mirror" where "look" has ID 90, "mirror" has ID 54
```

### JavaScript Text Parser

```javascript
class TextParser {
    constructor() {
        this.dictionary = new Map(); // word → groupId
        this.synonymGroups = new Map(); // groupId → [words]
        this.ignoredWords = new Set(); // words with groupId 0
        this.lastParsedWords = [];
    }

    /** Load dictionary from a simple JSON format */
    loadDictionary(wordList) {
        // wordList: [{ word: "look", groupId: 90 }, { word: "examine", groupId: 90 }, ...]
        for (const entry of wordList) {
            const w = entry.word.toLowerCase();
            this.dictionary.set(w, entry.groupId);

            if (entry.groupId === 0) {
                this.ignoredWords.add(w);
            } else {
                if (!this.synonymGroups.has(entry.groupId)) {
                    this.synonymGroups.set(entry.groupId, []);
                }
                this.synonymGroups.get(entry.groupId).push(w);
            }
        }
    }

    /** Parse player input into word group IDs */
    parse(input) {
        this.lastParsedWords = [];

        // Clean input
        const cleaned = input.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // strip punctuation
            .trim();

        if (!cleaned) return { success: false, words: [], unknown: null };

        const tokens = cleaned.split(/\s+/);

        for (const token of tokens) {
            // Skip single-letter filler words
            if (token.length === 1 && (token === 'a' || token === 'i')) continue;

            const groupId = this.dictionary.get(token);

            if (groupId === undefined) {
                return { success: false, words: this.lastParsedWords, unknown: token };
            }

            if (groupId === 0) continue; // ignored word

            this.lastParsedWords.push({ word: token, groupId });
        }

        return { success: true, words: this.lastParsedWords, unknown: null };
    }

    /** Check if parsed words match a said() pattern */
    said(...expectedGroupIds) {
        if (this.lastParsedWords.length < expectedGroupIds.length) return false;

        for (let i = 0; i < expectedGroupIds.length; i++) {
            const expected = expectedGroupIds[i];

            if (expected === 1) continue; // anyword wildcard

            if (expected === 9999) return true; // rest-of-line wildcard

            if (i >= this.lastParsedWords.length) return false;

            if (this.lastParsedWords[i].groupId !== expected) return false;
        }

        // All expected words matched, and no extra unexpected words
        return this.lastParsedWords.length === expectedGroupIds.length;
    }
}

// Usage example:
const parser = new TextParser();
parser.loadDictionary([
    { word: 'look', groupId: 90 },
    { word: 'examine', groupId: 90 },
    { word: 'get', groupId: 91 },
    { word: 'take', groupId: 91 },
    { word: 'pick', groupId: 91 },
    { word: 'up', groupId: 0 },      // ignored word
    { word: 'the', groupId: 0 },     // ignored word
    { word: 'mirror', groupId: 54 },
    { word: 'bread', groupId: 55 },
    { word: 'door', groupId: 56 },
]);

const result = parser.parse("look at the mirror");
// result: { success: true, words: [{word:"look", groupId:90}, {word:"mirror", groupId:54}] }

parser.said(90, 54); // true: "look mirror"
parser.said(91, 55); // false: not "get bread"
```

---

## 8. Integration Guide for KQ1Tribute

### Current Project Summary

Your KQ1Tribute project uses a 320×200 Canvas with:
- Point-and-click verbs (Walk, Look, Get, Use, Talk)
- Room-based navigation with procedural drawing
- EGA-style palette (CSS hex colors, extended with custom blended colors)
- Simple pixel-art player/NPC sprites drawn with Canvas rect/arc calls
- Walk-to-target player movement
- Text display with typewriter effect

### Recommended Enhancements

#### 1. Add Priority-Based Depth Sorting
Your game currently draws the player at a fixed layer. Add a priority system to properly depth-sort the player behind/in front of room elements:

```javascript
// In your room draw() functions, draw elements based on their Y position
// Elements with higher Y (closer to bottom) appear in front

// Simple approach: split room drawing into background and foreground
draw(ctx, state, frame, seed) {
    this.drawBackground(ctx, ...);  // sky, walls, floor (priority ≤ player)
    // Player is drawn by engine between background and foreground
    this.drawForeground(ctx, ...);  // objects in front of player based on Y
}
```

#### 2. Add Control Lines to Rooms
Instead of rectangular `walkBounds`, use a priority buffer to define walkable areas:

```javascript
// Replace walkBounds with a priority-painted walk mask
registerRoom({
    id: 'throneRoom',
    // ... existing properties ...
    controlLines: [
        // Control line 0 (block): walls, furniture
        { type: 0, points: [[0, 100], [320, 100]] },           // wall line
        { type: 0, points: [[230, 90], [280, 90], [280, 100]] }, // table block
        // Control line 3 (water): moat
        { type: 3, fill: [50, 150, 100, 20] },
        // Control line 2 (trigger): door trigger zone
        { type: 2, fill: [295, 75, 20, 35] },
    ]
});
```

#### 3. Add Screen Transitions
Add dissolve transitions when changing rooms:

```javascript
// In changeRoom(), capture old screen and dissolve to new
changeRoom(roomId, playerX, playerY, dir) {
    // Save current display
    const oldImageData = this.ctx.getImageData(0, 0, 320, 200);
    // ... switch room ...
    // Render new room off-screen
    this.render();
    const newImageData = this.ctx.getImageData(0, 0, 320, 200);
    // Start dissolve
    this.startDissolve(oldImageData, newImageData);
}
```

#### 4. Enforce Strict EGA Palette
Replace your extended color set (SKIN, DGREEN, SKY, etc.) with pure EGA indices to achieve authentic AGI look. Use dithering for intermediate colors:

```javascript
// Instead of gradient fills, use checkerboard dithering
function drawSkyEGA(ctx) {
    // Upper sky: dither blue + dark blue
    ditherPattern(ctx, 0, 8, 320, 40, 1, 8);  // blue + darkgray
    // Lower sky: solid light blue
    ctx.fillStyle = EGA_PALETTE_HEX[9]; // light blue
    ctx.fillRect(0, 48, 320, 52);
}
```

#### 5. Add Text Parser Input
Add a text input field below the game area:

```javascript
// In engine constructor, add parser state
this.parserInput = '';
this.parserActive = false;

// In handleKey, capture typed input
if (this.parserActive) {
    if (key === 'Enter') {
        const result = this.parser.parse(this.parserInput);
        this.processParserResult(result);
        this.parserInput = '';
        this.parserActive = false;
    } else if (key === 'Backspace') {
        this.parserInput = this.parserInput.slice(0, -1);
    } else if (key.length === 1) {
        this.parserInput += key;
    }
}

// Toggle with Tab or Enter key
if (key === 'Tab') {
    this.parserActive = !this.parserActive;
}
```

### Mapping Existing Code to AGI Architecture

| Your Current Code | AGI Equivalent | Enhancement |
|---|---|---|
| `EGA` object (CSS hex) | `PALETTE_EGA` (6-bit RGB) | Use `EGA_PALETTE_RGB` array indexed 0-15 |
| `drawPlayer()` function | VIEW resource + cel RLE | Could convert to RLE-encoded sprite data |
| `walkBounds` rectangle | Priority buffer + control lines | Paint priority/control values per pixel |
| `room.draw()` | Picture resource (vector commands) | Could store rooms as opcode streams |
| `changeRoom()` | `new_room()` + transition | Add LFSR dissolve effect |
| `player.speed` | `stepSize` + `stepTime` | Separate speed from animation rate |
| `showText()` typewriter | AGI text window | Already close to AGI behavior |
| `state.selectedVerb` | N/A (AGI uses parser) | Add text parser as optional mode |
| `pointInRect()` hotspot check | `said()` + object positions | Parser-driven interactions |

---

## Quick Reference: Key Constants

```javascript
// AGI Screen Constants
const SCRIPT_WIDTH = 160;
const SCRIPT_HEIGHT = 168;
const DISPLAY_WIDTH = 320;
const DISPLAY_HEIGHT = 200;
const STATUS_BAR_HEIGHT = 8;
const TEXT_AREA_HEIGHT = 24;

// Priority Constants
const PRI_UNCONDITIONAL_BLOCK = 0;
const PRI_CONDITIONAL_BLOCK = 1;
const PRI_TRIGGER = 2;
const PRI_WATER = 3;
const PRI_MIN_BAND = 4;      // first usable depth priority
const PRI_MAX_BAND = 14;     // last usable depth priority
const PRI_FOREGROUND = 15;   // always in front, ignores controls

// Object Direction
const DIR_STOP = 0;
const DIR_UP = 1;
const DIR_UP_RIGHT = 2;
const DIR_RIGHT = 3;
const DIR_DOWN_RIGHT = 4;
const DIR_DOWN = 5;
const DIR_DOWN_LEFT = 6;
const DIR_LEFT = 7;
const DIR_UP_LEFT = 8;

// Screen Boundaries
const MINX = 0;
const MAXX = 159;
const MINY = 0;
const MAXY = 167;
const HORIZON_DEFAULT = 36;

// Picture Opcodes
const PIC_SET_VIS_COLOR = 0xF0;
const PIC_DISABLE_VIS = 0xF1;
const PIC_SET_PRI_COLOR = 0xF2;
const PIC_DISABLE_PRI = 0xF3;
const PIC_Y_CORNER = 0xF4;
const PIC_X_CORNER = 0xF5;
const PIC_ABS_LINE = 0xF6;
const PIC_REL_LINE = 0xF7;
const PIC_FLOOD_FILL = 0xF8;
const PIC_SET_PEN = 0xF9;
const PIC_PLOT_BRUSH = 0xFA;
const PIC_END = 0xFF;

// LFSR Polynomials for Transitions
const LFSR_AMIGA = 0x3500;
const LFSR_ATARI_ST = 0xD5A0;
const LFSR_SPLATTER = 0xB8;
```

---

## Sources

| Repository | URL | Language | Key Files Referenced |
|---|---|---|---|
| ScummVM | github.com/scummvm/scummvm/tree/master/engines/agi | C++ | picture.cpp/h, view.cpp/h, graphics.cpp/h, sprite.cpp, palette.h, words.cpp/h, checks.cpp |
| NAGI | github.com/sonneveld/nagi | C | pic_render.c, sbuf_util.c, obj_base.c, obj_blit.c, obj_picbuff.c, obj_priority.c |
| agile-gdx | github.com/lanceewing/agile-gdx | Java | AnimatedObject.java |
| SCUMM-8 | github.com/Liquidream/scumm-8 | Lua | Room transitions (iris, cut) |
