# Crown Quest: A Fantasy Adventure — AI Coding Instructions

## Architecture Overview

A Sierra-style adventure game (King's Quest I/II/III tribute) built with
**JavaScript and HTML5 Canvas** (640x400, `image-rendering: pixelated`), plus a
vendored Three.js browser module for optional first-person WebXR. No build
system and no runtime install.

- [index.html](../index.html) — UI shell: canvas, action buttons, inventory bar, save/load modal, message area
- [js/engine.js](../js/engine.js) — reusable `GameEngine`: render loop, input, parser, click-to-walk, cutscenes, blocking sequences, dialog trees, save/load, overlays, all driven by a game definition object
- [js/registry.js](../js/registry.js) — room-module registry. Rooms are parsed before the engine exists, so each file queues a factory via `CrownQuest.defineRooms(fn)` and the bootstrap drains the queue.
- [js/art.js](../js/art.js) — drawing primitives, landscape, architecture, the three treasures
- [js/actors.js](../js/actors.js) — the shared human cel, the cast palettes, the creatures
- [js/icons.js](../js/icons.js) — inventory close-ups and speaker portraits
- [js/cutscenes.js](../js/cutscenes.js) — set pieces and the title backdrop
- [js/rooms/*.js](../js/rooms) — the rooms, grouped by act
- [js/game.js](../js/game.js) — bootstrap only: items, dialog trees, the opening, `installRooms`, `start`
- [js/content.js](../js/content.js) — score contract, item metadata, victory ranks, shared progression rules

### Where does new code go?

| Kind of change | File |
|---|---|
| Reusable system (input, parser, inventory, save/load, cutscene machinery, NPCs, depth scaling, overlays) | `js/engine.js` |
| Drawing helper used by more than one room | `js/art.js` |
| A person or a creature | `js/actors.js` |
| An inventory icon or a speaker portrait | `js/icons.js` |
| A set-piece animation or the title art | `js/cutscenes.js` |
| A room's art, hotspots and puzzle logic | the matching `js/rooms/*.js` |
| Items, dialog trees, the opening | `js/game.js` |
| Score contract, item metadata, victory ranks, shared progression rules | `js/content.js` |

Adding a module requires three registrations — `index.html`, the `ASSETS` list
in `serviceworker.js`, and `CONTENT_FILES` in `tools/validate_content.js`. The
static gate fails if any is missed.

### Reusable Engine Boundary

The engine is game-agnostic. Anything that names a character, a room, an item or
a joke belongs in the content layer, supplied through the game definition:

```js
new GameEngine({ id, title, shortTitle, subtitle, storagePrefix, maxScore,
                 startRoom, startX, startY, victory, onStart,
                 drawTitleBackdrop, parserSynonyms, classicRewrites })
```

Item close-ups come from `engine.itemArt[id]`, speaker portraits from
`engine.portraitArt[id]`, and a room's scent line from `room.smell`. If you find
yourself adding a `if (item.id === 'x')` branch to `js/engine.js`, it belongs in
`js/icons.js` instead.

## Key Patterns

### Room Registration

```js
engine.registerRoom({ id, name, description, smell, hint, draw, hotspots,
                      onEnter?, onUpdate? })
```

`draw(ctx, w, h, eng)` renders everything procedurally — no sprite sheets or
image assets exist anywhere in this project. `onUpdate(e, dt)` ticks once per
frame and is suppressed during cutscenes, sequences, death and victory.

### Hotspot Structure

```js
{ name, x, y, w, h, description, look?, get?, use?, talk?, useItem?, walk?,
  isExit?, onExit?, walkToX?, hidden? }
```

- Actions without handlers fall through to generic snark in `engine.performAction()`
- `hidden` can be a getter: `get hidden() { return engine.hasItem('pail'); }`
- Hotspots are checked **last-to-first** — later entries win a click
- `useItem` receives `(engine, itemId)`

### State Management

- **Flags**: `engine.setFlag(name, value?)` / `getFlag(name)` / `getCounter(name)`
- Every literal flag name is cross-referenced by `tools/validate_content.js`. A
  flag read but never written, or written but never read, fails the build.
- **Never gate the drawing of a persistent object on a flag set by `look`** —
  that is how examining an NPC makes them vanish. Gate visuals on
  action-specific flags instead.
- **Score**: guard every award with a flag, or re-entering a room farms points.
  `tests/full-game.spec.js` asserts a complete playthrough totals exactly
  `content.game.maxScore`.

### Blocking Sequences

```js
engine.runSequence([
    { walk: [420, 340] },        // blocking walk
    'The door opens.',           // text window, waits for dismissal
    600,                         // wait 600ms
    (e) => e.setFlag('opened')
], { skippable: true, onEnd });
```

Prefer this over chained `playCutscene` calls for in-room scripted beats.
Escape skips it and still applies every remaining step's side effects.

## Art Rules (non-negotiable — they define the look)

### Sierra pseudo-3D for interiors

Build the geometry with `perspectiveFrame()` and paint the shell with
`interiorShell()`. Never re-derive the vanishing point by hand.

- Vanishing point near centre screen (x≈320, y≈45–90)
- Wall-mounted objects are perspective trapezoids computed from the frame's
  `lBand`/`rBand`, never flat rectangles. Use `wallPanel()` or `F.trap()`.
- **Do not draw floor perspective-grid lines.** Depth comes from the wall
  convergence, tonal floor banding and cast shadows.
- Call `engine.setDepthScaling()` in `onEnter` and use `addForegroundLayer()`
  for anything the ego should walk behind.

### Exteriors

- Aerial perspective: distant ranges shift toward the haze colour (`distantRange`)
- `skyBands()` for skies, `turfTexture()` for open ground, `blendSeam()` for the
  join between two flat areas
- **Never `ditherRect` a wide band across a whole screen.** A large checkerboard
  stops reading as a blend and starts reading as stripes. `blendSeam()` exists
  for exactly this.

### Objects and creatures

1. **Black underdrawing first.** An oversized near-black silhouette under every
   object, then the lit shape on top. Without it small objects do not read.
2. **Three tones per surface** — highlight, mid, shadow — plus the black edge.
3. **One saturated accent** per object to break up the local hue.
4. Glass is a dark inset, a saturated tone, and exactly one white specular.
5. Every recurring object has exactly **one** helper used by every room and
   cutscene. Never hand-draw the same thing twice; it always drifts.

### Characters

- The ego is drawn by `engine.drawEgoFront()` (front) and `drawPlayer()`
  (side/back). All three views share one measurement frame.
- Every other person is `drawVgaPerson()` from `js/actors.js`, coloured by a
  `CAST_*` palette. Never hand-roll a figure out of stacked rectangles: it comes
  out as a 4-head mascot standing next to a 5.5-head hero.
- **Scale NPCs with `vgaPersonScale(engine, groundY, heightFactor)`.** Guessing
  the scale is the single most common way this game's cast has gone wrong.
- Limbs are two hinged segments (`drawVgaArm`) so poses actually bend.

### Determinism

Scattered detail uses `seededRandom(seed)`, never `Math.random()`. Rooms must
render identically on every frame or the visual baselines are worthless.
Animation reads `eng.animTimer`.

## Development Workflow

- **Run**: `npm run serve`, then http://127.0.0.1:8080
- **Validate**: `npm run check:static`; full gate `npm run check`
- **Art changes**: `npm run test:visual:update`, then **look at the PNGs** before
  accepting them. A pure refactor must produce byte-identical baselines.
- Bump `VERSION` in `serviceworker.js` after every code change.

## Common Pitfalls

- **Smart quotes**: never use Unicode curly quotes in string literals — ASCII only
- **Canvas text**: always reset `ctx.textAlign` to `'left'` after `'center'`/`'right'`
- **`lightPool` and `vignette` take an `'r,g,b'` triple**, not an `rgba(...)`
  string. Passing a full colour throws at draw time.
- **`drawContactShadow(ctx, x, y, scale, { rx, ry })` multiplies `rx` by
  `scale`.** Pass `scale: 1` when `rx`/`ry` are already absolute, or the puddle
  swamps the sprite.
- Registries keyed by save data must use `Object.hasOwn`; `if (obj[key])` accepts
  `__proto__` and can write onto `Object.prototype`.
- Dead ends are worse than deaths. Every gate must either be reversible or warn
  before it closes.
