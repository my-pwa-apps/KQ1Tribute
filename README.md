# King's Quest: The Darkened Mirror

**A Sierra Online King's Quest Tribute Game**

A browser-based adventure game inspired by Sierra Online's classic King's Quest
series (KQ1, KQ2, KQ3). Built using architectural patterns from the original
**AGI (Adventure Game Interpreter)** engine, studied from open-source reimplementations.

Features procedurally generated environments, characters, and SN76496-style PSG
sound effects, an original story set in the Kingdom of Daventry, interactive
objects, a typed text parser, and the trademark Sierra humor.

## AGI Engine Inspiration

The engine architecture is directly informed by studying these open-source AGI
and adventure game interpreters:

| Repository | Author | What we learned |
|-----------|--------|-----------------|
| [agi](https://github.com/lanceewing/agi) | Lance Ewing | Original Sierra AGI source code (C/Assembly) extracted from game disks |
| [agile-gdx](https://github.com/lanceewing/agile-gdx) | Lance Ewing | Java AGI interpreter — priority bands, AnimatedObject, cel animation |
| [nagi](https://github.com/sonneveld/nagi) | Nick Sonneveld | C AGI clone from disassembly — picture rendering, priority screen |
| [scummvm](https://github.com/scummvm/scummvm) | ScummVM Team | C++ AGI engine — dissolve transitions, EGA palette, sprite occlusion |
| [scumm-8](https://github.com/Liquidream/scumm-8) | Liquidream | PICO-8 SCUMM engine — simplified room/verb/inventory patterns |
| [nscumm](https://github.com/scemino/nscumm) | scemino | C# SCUMM — script/room architecture |
| [ags](https://github.com/adventuregamestudio/ags) | AGS Team | Adventure Game Studio — hotspot/interaction patterns |

### AGI Features Implemented

- **LFSR Dissolve Transitions** — Room changes use the iconic pseudo-random pixel
  dissolve effect from ScummVM's `transition_Amiga()` (XOR polynomial `0x3500`)
- **EGA Dithering** — CGA-style checkerboard mixing of two colors for shading,
  replacing CSS gradients (AGI had no gradient fills)
- **Priority-Band Depth Sorting** — Y-based priority system (priorities 4–14) for
  correct draw ordering of player behind/in front of room elements
- **Text Parser** — Type commands like `look mirror`, `get bread`, `talk wizard`  
  alongside point-and-click (AGI's `WORDS.TOK` dictionary + `said()` matching)
- **SN76496 PSG Audio** — Square wave tone generation with LFSR noise channel,
  matching the TI SN76496 chip used in PCjr (AGI's sound hardware)
- **Authentic EGA Palette** — Canonical 16-color IBM EGA values from ScummVM's
  `palette.h` (6-bit RGB scaled to 8-bit: `#000000` to `#FFFFFF`)

## Play the Game

Open `index.html` in any modern browser, or serve via a local HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx http-server -p 8080
```

Then navigate to `http://localhost:8080`.

## Controls

| Input | Action |
|-------|--------|
| **Click** | Walk to location / interact with object |
| **Enter** or **Tab** | Open text parser (type commands!) |
| **1** | Select Walk verb |
| **2** | Select Look verb |
| **3** | Select Get verb |
| **4** | Select Use verb |
| **5** | Select Talk verb |
| **I** or **6** | Open/close Inventory |
| **ESC** | Close inventory / cancel parser |

### Text Parser Examples

Type commands just like in the original Sierra AGI games:

```
> look mirror
> get bread
> talk wizard
> use key on door
> examine throne
> take mushroom
```

## How to Play

1. **Select a verb** from the bar at the bottom (Walk, Look, Get, Use, Talk)
2. **Click on objects** in the scene to interact with them
3. **Or type commands** by pressing Enter — like the original Sierra games!
4. **Collect items** using the Get verb
5. **Use items** by selecting one from Inventory, then clicking on a target
6. **Talk to characters** to learn about the story and get hints

## Story

You are **Cedric**, a young page at Castle Daventry. King Graham has departed on
urgent business, and the **Magic Mirror** — Daventry's most precious treasure — has
gone dark. The court wizard Crispin tells you that three **Enchanted Gems** sustain
the Mirror's power:

- **Ruby of Courage** — hidden in a dragon's hoard
- **Sapphire of Wisdom** — deep in a crystal cavern
- **Emerald of Compassion** — guarded by a fairy at an enchanted lake

Your quest: find all three gems and restore the Mirror before darkness falls!

## Rooms

The game features 11 interconnected rooms:

```
Throne Room ←→ Courtyard ←→ Garden
                    ↓
              Forest Path
                    ↓
              River Bridge ←→ Witch's Cottage
                    ↓
              Dark Forest
                    ↓
            Crystal Cavern
                    ↓
            Mountain Pass
                    ↓
            Dragon's Lair
                    ↓
           Enchanted Lake
```

## Features

- **AGI-authentic engine** inspired by Sierra's original Adventure Game Interpreter
- **LFSR dissolve transitions** — iconic pixel-by-pixel room transitions
- **Text parser input** — type commands like `look mirror` or `get bread`
- **EGA dithering** — checkerboard color mixing (no CSS gradients — AGI didn't have them!)
- **Priority-band depth sorting** — Y-based draw ordering like real AGI
- **SN76496 PSG audio** — 3-channel square wave + LFSR noise (no audio files)
- **Procedural environments** — Trees, crystals, stars, clouds generated by seeded PRNG
- **11 unique rooms** with distinct visual themes
- **Multiple puzzles** with item combinations
- **Sierra-style death scenes** with humorous messages
- **Score system** (100 points maximum)
- **Full inventory system** with item selection
- **NPC dialogue** with hints and humor
- **Animated player character** with walk cycle
- **Retro EGA-inspired graphics** at 320×200 resolution

## Tech Stack

- Pure HTML5 Canvas (no frameworks or libraries)
- Vanilla JavaScript (~3500+ lines)
- Web Audio API for SN76496-style procedural sound
- CSS3 for pixel-perfect scaling
- Zero external dependencies

## Architecture

```
index.html          ← Entry point
css/style.css       ← CRT-style pixel-perfect scaling
js/audio.js         ← SN76496 PSG audio (square waves + LFSR noise)
js/engine.js        ← Core engine: dissolve transitions, priority system,
                       text parser, EGA palette, dithering, rendering
js/rooms.js         ← 11 rooms with procedural drawing + hotspots
js/game.js          ← Initialization + game loop startup
```

## Credits

This is an original fan tribute. King's Quest is a trademark of Activision.
Inspired by the classic Sierra On-Line adventure games created by Roberta Williams.

Engine architecture informed by open-source AGI/SCUMM interpreters — see the
table above for specific repositories studied.

## License

This project is a fan-made tribute for educational and entertainment purposes.
