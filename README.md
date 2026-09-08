# Crown Quest: A Fantasy Adventure

**A Sierra On-Line tribute in the spirit of King's Quest I, II and III**

A browser-based adventure game built with plain HTML5 Canvas and JavaScript.
No build step or frameworks. The default scenery and all audio are generated
at runtime; an opt-in scullery trial uses a supplied background image.

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

### Painted Scenery Trial

Open `http://127.0.0.1:8080/?scenery=painted` to try the supplied scullery
background, study, and hidden chamber with existing animated props and collectible items.
The opening cutscene and remaining rooms retain their procedural art.
Remove the query string to compare the original rooms.

The trial adjusts hotspots and walking bounds to the picture. The scullery
table has a cached foreground mask traced from the original image: its wooden
surfaces hide Rowan behind them, while the gaps underneath show his legs.
The rear aisle is walkable, the table's floor footprint remains solid, and
Rowan draws in front when closer to the viewer. If the image cannot load,
the original room remains usable.

The study keeps its procedural tapestry, raven, and desk props over the painted
background. The tapestry conceals the image's secret opening until examined;
the key puzzle, feather, conversation, and all three exits remain available.
Its desk and foreground stair railing have matching collision bounds. Each
background loads independently, with procedural fallback on image failure.

The hidden chamber uses the supplied `icons/hidden-room-trial.png` background.
Its chest, spellbook, chalk circle, ingredients, alcove contents, and magical
effects remain dynamic. The painted lectern and return stair have aligned
hotspots and collision bounds. The chest-to-thimble puzzle is unchanged.

Run `npx playwright test tests/painted-scenery.spec.js` for the trial's desktop
and mobile interaction, fallback, and screenshot checks.

The painted trial also includes the supplied title screen, isolated-house
opening panel, Morvane doorway panel, unlocked-door panel, and Serpent's Crag exterior. Title and
intro artwork is resolved to 320x200 pixels before enlargement; title text and
captions remain sharp. The scrubbing intro beat retains its original animation
because no replacement image was supplied.
The outdoor house path, sea boundary, and boulder have aligned hotspots and
collision geometry. A cached boulder mask hides Rowan behind the rock.
Morvane's passing sequence uses the same painted landscape, with the existing
animated wizard. The right-hand path accesses the skiff in the cove below,
out of sight; the supply warning and sailing puzzle are unchanged.
Each missing image falls back to its original art independently.
Run `npx playwright test tests/painted-story.spec.js` for title, intro, outdoor
movement, hiding, sailing, fallback, and desktop/mobile screenshot checks.

The painted scenery trial uses the supplied Rowan sprite sheets by default:
`http://127.0.0.1:8080/?scenery=painted`.
Use `?actors=painted` alone to try the sprites with procedural scenery.
The trial uses four standing views and eight walking frames in each direction,
including a dedicated left-facing sheet (no mirroring). A prepared transparent
atlas aligns the figures at the belt and feet. The painted hero is 50% taller
than the original, retaining the same ground anchor and depth scaling. The
eight poses share the existing walk-cycle duration and footstep timing.
Cutscene actors and portraits retain their original art. Add `&actors=procedural` to
compare the procedural hero. If the atlas fails to load, the original
hero remains visible. No save-data changes are required.

To regenerate the atlas, run `node tools/prepare_rowan_trial.js <source-directory> --write`.
It expects `ROWAN.png`, `ROWANRIGHT WALK.png`, `ROWANLEFT WALK.png`,
`ROWANFRONT Walk.png`, and `ROWANBACK Walk.png`. The tool removes the baked
neutral checkerboard in the supplied left/front/back images and writes
`icons/rowan-atlas-trial.png`; it does not alter the source sheets. Its color
mask is specific to these images, so inspect the atlas after regeneration.

Run `npx playwright test tests/painted-actors.spec.js` for sprite pixel checks,
directional screenshots, movement, and failed-load fallback. The optional
`drawPlayerSprite(ctx, engine)` game-definition hook draws after the engine's
contact shadow; return `true` to replace the procedural gameplay sprite, or
`false` to use it. Canvas state is restored by the engine after the hook.

### Painted Prop Drafts

The first isolated-object trial covers bread and a raised-handle wooden pail.
The inspected Cloudflare-generated sprites are installed in the game: painted
scenery selects them automatically for the scullery and inventory close-ups.
Use `?props=painted` to try them with procedural scenery, or add
`&props=procedural` to the painted-scenery URL to compare the original props.
The pail keeps its animated water when full; pickups and puzzles are unchanged.
The floor pail has a solid base and is depth-sorted against Rowan. Its collision
and drawing disappear on pickup, including after returning to the room. The
table, desk, perch, chest and lectern retain their solid footprints. Walking
stops or slides against obstacles; choose a clear waypoint around them rather
than expecting automatic route planning. `addBarrier` optionally accepts an
`enabled(engine)` predicate for state-dependent obstacles.
Each missing sprite falls back independently to its procedural drawing.
Generated dressing also replaces the salt crock in the scullery, the candle
and open ledger in the study, and the collectible spellbook in its chest and
inventory close-up. Salt contents, candle flame/light, and the book's pulsing
sigil remain state-driven or animated overlays. The chest itself is unchanged.
Run `npx playwright test tests/painted-props.spec.js` for the integration checks.

It reuses the Cloudflare generator below, but requests a flat magenta background
instead of a room. Run from the terminal containing your credentials:

```powershell
node tools/generate_props.js art-drafts/props-trial-01
```

Without a flag this only previews both requests; no credentials or network are
used. Add `--generate` to explicitly submit two potentially chargeable requests:

```powershell
node tools/generate_props.js art-drafts/props-trial-01 --generate
```

Add `--dressing` for the separate crock/candle/ledger/spellbook batch (four
requests instead of two). Use a new output directory. The installed dressing
sources and their source-specific `cleanup.json` recipe are retained locally
under `art-drafts/props-dressing-01`. A recipe maps prop IDs to optional pixel
`top`/`bottom` crop bounds and `stretch: true` for filling the sprite canvas;
the candle recipe removes the model's unwanted flame, and the ledger recipe
removes loose ribbons. Reprepare with `--prepare-only --dressing` without an
API request, in a directory with sources/recipe and no prepared outputs.

The generation command requires a new output directory and does not retry.
It retains `bread-source.png` / `pail-source.png` (or `.jpg`), removes magenta
or white backgrounds including enclosed handle gaps, and writes transparent `bread.png`, `pail.png`,
bottom-anchor metadata in `props.json`, and `preview.png` with light/dark
backgrounds and approximate scene-size samples. Existing output files are not
overwritten. No game artwork or puzzle logic is changed automatically.

The keying assumes these prompts' magenta-free, dark objects, not arbitrary images.
Shaded magenta is removed by connected background-color regions so enclosed
dark cover colors survive. This is still image preparation, not general-purpose
segmentation: inspect each generated result before accepting its sprites.
White-background mode removes near-white pixels and connected light neutral
shadows, so it is unsuitable for props with white or pale gray surfaces.
It rejects missing margins and non-keyed opaque backgrounds, but cannot judge
art quality, remove every color fringe, or repair an incorrect handle. Inspect
the originals and preview before integrating sprites into the game. Bread and
pail use 96x48 and 96x128 sprite canvases respectively; runtime sizes still need
to be checked against the room.

To prepare already-generated sources without making another request, use
`node tools/generate_props.js <draft-directory> --prepare-only` in a directory
with both source images and no existing prepared outputs. If a request fails,
keep any successful source; do not regenerate it just to retry the other prop.
Use the single-image generator below for the missing source, then prepare only.

Run `node --test tools/generate_props.test.js` for offline transparency,
anchor, input-validation and overwrite tests. Preparation uses the project's
existing Playwright Chromium installation.

### Cloudflare Background Generation

This optional development tool uses Cloudflare Workers AI's
[`@cf/leonardo/lucid-origin`](https://developers.cloudflare.com/workers-ai/models/lucid-origin/)
model. It does not run in the browser or change the game automatically.
Node 22 or newer is recommended. No additional packages are required.

Preview the hidden-chamber request without credentials, network access, or cost:

```powershell
node tools/generate_background.js tools/art-prompts/hidden-chamber.txt art-drafts/hidden-chamber
```

For live generation, configure `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` privately in the local environment or an ignored
`.env.cloudflare` file. Use Cloudflare's Workers AI token template, or grant
Workers AI Read and Edit permissions on the intended account. An account ID
alone, a ChatGPT subscription, or a Cloudflare website deployment does not
provide Workers AI API access. Never paste tokens into chat, prompts, source
files, or browser-side JavaScript. See the
[Cloudflare setup instructions](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

To persist values already entered in a PowerShell session, first restart any
running development servers so the hidden-file protection is active. Then run
this from that same terminal:

```powershell
node tools/save_cloudflare_env.js
```

This writes the project-root `.env.cloudflare` without displaying either value.
It checks that Git ignores the file and refuses to overwrite an existing file.
This is local plaintext storage, not an encrypted vault. Never force-add it to
Git or include it in a deployment/upload. The development server blocks hidden
files, but that does not protect copies uploaded to other servers. Load it in
future terminals with Node's `--env-file=.env.cloudflare` option. No API call
is made by the save helper. Run `node --test tools/save_cloudflare_env.test.js
tools/serve.test.js` to test these safeguards using synthetic values only.

Once authenticated, this explicit command submits ONE potentially chargeable
request, with a 1280x800 image, 20 steps, and a fixed seed:

```powershell
node --env-file=.env.cloudflare tools/generate_background.js tools/art-prompts/hidden-chamber.txt art-drafts/hidden-chamber --generate
```

The command does not retry automatically. Check account usage before retrying
a timeout, since the service may still have processed the request. Review the
model's current pricing and terms before running it; this tool does not enable
billing, accept provider terms, or enforce an account-wide spending limit.

The actual returned format determines the `.png` or `.jpg` extension. Drafts
are saved under the git-ignored `art-drafts/` directory; existing drafts are
not overwritten. Inspect composition, image quality, and alignment before
promoting a draft into the game. Matching the existing ChatGPT artwork is not
guaranteed. A fixed seed is useful for experiments, not a promise of identical
results across provider updates.

Run `node --test tools/generate_background.test.js` for mocked tests that
never contact Cloudflare. Live generation requires separately configured
credentials and has not been verified by these tests.

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
