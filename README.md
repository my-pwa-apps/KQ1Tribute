# Crown Quest: A Fantasy Adventure

**A Sierra On-Line tribute in the spirit of King's Quest I, II and III**

A browser-based adventure game built with plain HTML5 Canvas and JavaScript.
No build step, no frameworks, no image or audio assets — every pixel and every
sound is generated at runtime.

> You are **Rowan**, eleven years a scullery boy in the house of the sorcerer
> **Morvane**. This morning the house is empty and the front door is not locked.

---

## Play

Open `index.html` in a browser, or serve it:

```bash
npm run serve      # http://127.0.0.1:8080
```

At the title screen, choose **Classic Parser** (type commands, Sierra text
windows) or **Enhanced Click** (verb bar and point-and-click). `F10` switches
between them at any time.

### Controls

| Input | Action |
|---|---|
| Click | Walk / interact with the selected verb |
| `W` `L` `G` `U` `T` | Walk, Look, Get, Use, Talk |
| Arrow keys | Walk |
| `I` | Inventory |
| `Enter` / `Tab` | Open the parser |
| `F2` | Highlight interactive objects |
| `F5` / `F7` | Save / load (five slots) |
| `F8` | Text speed |
| `M` | Mute |
| `R` | Restart after death |

The parser understands verb-noun and verb-noun-preposition-noun:

```
> look at the hourglass
> get the black bread
> use the brass key on the iron chest
> talk to corvus
> smell
```

---

## The story

The three treasures of Alderhaven went missing the winter the queen's ship went
down: the **Chest of Cormac**, the **Shield of Ardor** and the **Mirror of
Ianthe**. The king is dying, there is no heir, and out on the western headland
there is a tower nobody in the kingdom will name.

Twelve rooms across three acts, one goat, one dragon, one gnome with a name
problem, and 250 points.

---

## Architecture

The game ships as ordered `<script>` tags. There is no bundler, so room files
are parsed before the engine exists and register themselves through a queue.

```
index.html            UI shell: canvas, verb bar, inventory, save modal
js/palette.js         Shared colour vocabulary (PAL)
js/sound.js           Procedural PSG-style audio: square/triangle/noise, no files
js/engine.js          Reusable GameEngine: render loop, input, parser, inventory,
                      save/load, cutscenes, dialog trees, depth scaling, overlays
js/registry.js        Room-module queue, drained by the bootstrap
js/art.js             Drawing primitives, landscape, architecture, the treasures
js/actors.js          The shared human cel, the cast palettes, the creatures
js/icons.js           Inventory close-ups and speaker portraits
js/cutscenes.js       Set pieces and the title backdrop
js/rooms/act1.js      Morvane's house on Serpent's Crag
js/rooms/act2.js      Alderhaven
js/rooms/act3.js      The Amber Tower
js/game.js            Bootstrap only: items, dialog trees, the opening, wiring
js/vr.js              Optional first-person WebXR projection of the same scenes
js/content.js         Score contract, item metadata, victory ranks, shared rules
```

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

The engine itself is game-agnostic: item icons, speaker portraits, room scents,
parser synonyms, classic-mode rewrites and the title backdrop are all supplied
by the content layer rather than hard-coded.

### Content boundary contract

- `game.flavorResponses` owns story-specific fallback replies (`sing`, `clean`,
    `useTechnique`); the latter accepts the `{object}` placeholder. Neutral engine
    defaults work without any game-specific configuration.
- Registered items may provide `look(engine)` for examination side effects.
    Inventory clicks and parser examination share this guarded handler.
- `room.onEnter(engine, { restoring })` reconstructs room geometry and audio on
    every entry. Fresh-visit puzzle resets must be skipped when `restoring` is true.
- Inventory labels/descriptions reset from registration defaults on restart and
    before saved metadata is restored. Dialogue choices are saved per slot and
    cleared on restart; older saves without choices use an empty history.
- Save UI and `saveGame` share one eligibility check. Cutscenes, sequences and
    active conversations cannot be saved because their callbacks are not data.
- Progression uses `CrownQuestContent.rules.award(engine, event)` and its single
    250-point ledger. Award history and treasure custody persist independently of
    inventory possession. New flags remain part of the ordinary save state.

Architecture tests reject registered room/item/portrait IDs in engine string
literals and verify content-provided replies. The built-in hero cel still lives
in the engine; extracting the rendering systems and the existing bootstrap
progression wrappers remains structural backlog work, not a claim of a fully
skin-independent renderer.

---

## Development

Release status and independent playtest instructions are tracked in
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). The automated suite includes
touch-only routes, complete item/portrait sheets and offline audio signal checks;
physical-device testing, blind playtesting and listening still require sign-off.

```bash
npm install
npm run serve            # local server on :8080
npm run check:static     # lint + parse + content cross-references
npm run test:functional  # behaviour, walkthrough, architecture, accessibility
npm run test:visual      # visual regression against committed baselines
npm run test:visual:update   # re-record baselines — then LOOK at the PNGs
npm run check            # everything
```

`tools/validate_content.js` cross-references room ids, item ids and every
literal flag name. A flag that is read but never written, or written but never
read, fails the build — a misspelt flag is otherwise invisible at runtime.

[tests/full-game.spec.js](tests/full-game.spec.js) checks both the displayed score
and the raw 250-point award total before clamping. The automatic finale grants
10 points, while the original puzzle rewards are unchanged. All scored actions
are required, so victory has one attainable rank rather than unused lower tiers.
[tests/player-journey.spec.js](tests/player-journey.spec.js) completes the adventure
through real keyboard/parser inputs, without teleporting, injecting progression
state, or skipping sequences. State and reliability regressions run in CI too.

Bump `VERSION` in `serviceworker.js` on every code change.

---

## Credits

An original fan tribute. King's Quest is a trademark of Activision. Inspired by
the adventure games of Roberta Williams and Sierra On-Line.

Engine architecture informed by the open-source AGI and SCUMM interpreter
community — see `AGI_ENGINE_TECHNICAL_REFERENCE.md`.

Bundled typeface: VT323 (SIL Open Font License 1.1, see `fonts/VT323-OFL.txt`).

## License

MIT. See `LICENSE`.
