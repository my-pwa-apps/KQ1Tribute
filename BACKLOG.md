# Crown Quest — Engineering Backlog

Findings from a full-repository review (architecture, code, performance, security,
reliability, testing, maintainability, UX). Items already fixed during the review
are listed in [Completed during review](#completed-during-review) at the bottom.

Priority: **P1** blocks confidence in the product · **P2** meaningful risk or cost
· **P3** worth doing when the area is next touched.

---

## P1 — Structural risk

- [ ] **Split `js/engine.js` (4,550 lines) into focused modules**
  - **Priority:** P1
  - **Category:** Architecture / Maintainability
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js), [index.html](index.html), [serviceworker.js](serviceworker.js), [eslint.config.js](eslint.config.js), [tools/validate_content.js](tools/validate_content.js)
  - **Problem:** The engine is three times the project's own documented hard ceiling of ~1,500 lines. It currently holds the render loop, input, the text parser, the inventory, save/load, the dialog system, cutscene and sequence machinery, text-window layout, the player sprite, depth scaling, overlays and the VR handshake. The repository's contributor instructions tell authors that reusable systems "go in `js/engine.js`", so the file grows by construction.
  - **Impact:** Every change touches one enormous file, which maximises merge conflicts and review burden and makes it impossible to reason about a subsystem in isolation. It is also the single biggest obstacle to onboarding, because there is no smaller unit to read first.
  - **Recommended solution:** Extract along existing seams into `js/engine/` — `parser.js`, `saveload.js`, `dialog.js`, `textwindow.js`, `player.js`, `overlays.js` — leaving `engine.js` as the loop, state and composition root. Keep the existing script-tag/registry pattern; no bundler is required. Move one seam per commit and prove each with byte-identical visual baselines.
  - **Acceptance criteria:** No file in `js/` exceeds 1,500 lines; `npm run check` passes; all 29 visual baselines are byte-identical after the move; the routing table in `.github/copilot-instructions.md` names the new modules.
  - **Estimated effort:** Large
  - **Business value:** Medium — no user-visible change, but it is the precondition for most other work here.
  - **Technical debt reduction:** High

- [ ] **Enforce the file-size ceiling automatically**
  - **Priority:** P1
  - **Category:** Maintainability / Developer Experience
  - **Area:** Tooling
  - **Affected files:** [tools/validate_content.js](tools/validate_content.js), [package.json](package.json)
  - **Problem:** The ~800-line soft / ~1,500-line hard ceiling exists only as prose. Three files already exceed it (`engine.js` 4,550, `act2.js` 1,646, `act1.js` 1,421) and nothing failed.
  - **Impact:** A documented rule nobody enforces is a rule that is already broken. Splitting the engine once without a guard means it simply regrows.
  - **Recommended solution:** Add a line-count check to the static gate: fail over 1,500, warn over 800, with a short explicit allow-list carrying the target size for files being actively split.
  - **Acceptance criteria:** `npm run check:static` fails when a non-allow-listed file exceeds 1,500 lines; the allow-list shrinks to empty as the split above lands.
  - **Estimated effort:** Small
  - **Business value:** Low direct, High preventative
  - **Technical debt reduction:** High

- [ ] **Split `js/rooms/act2.js` (1,646 lines) into one file per room**
  - **Priority:** P1
  - **Category:** Architecture
  - **Area:** Content
  - **Affected files:** [js/rooms/act2.js](js/rooms/act2.js), [index.html](index.html), [serviceworker.js](serviceworker.js), [tools/validate_content.js](tools/validate_content.js)
  - **Problem:** Seven rooms share a file, against the project's own "one room per file" guidance. `act1.js` (1,421 lines, four rooms) has the same shape.
  - **Impact:** Two people editing different rooms conflict in the same file, and a room's art, hotspots and puzzle logic cannot be reviewed on their own.
  - **Recommended solution:** Move each room to `js/rooms/act2/<room>.js`, with genuinely shared helpers (`alderhavenSky`, `followingGoat`, `wearRing`) promoted to a sibling `shared.js`. The registry pattern needs no change.
  - **Acceptance criteria:** One room per file; all three registration points updated; visual baselines byte-identical.
  - **Estimated effort:** Medium
  - **Business value:** Low
  - **Technical debt reduction:** Medium

---

## P2 — Correctness, performance and process

- [ ] **Extend static-layer caching to the remaining scenes**
  - **Priority:** P2
  - **Category:** Performance
  - **Area:** Rooms
  - **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [js/rooms/act3.js](js/rooms/act3.js)
  - **Problem:** `engine.staticLayer()` now exists and is used by four rooms. The rest still repaint every seeded texture, tree rank and stone tessellation on all 60 frames per second. `spell_room` (15.1ms) and `study` (14.6ms) sit just under the 16ms budget on a fast desktop, which means they are over it on a low-end laptop or a phone.
  - **Impact:** Avoidable battery drain and dropped frames on exactly the low-powered devices where a 640×400 canvas game should feel effortless.
  - **Recommended solution:** Wrap each room's static prefix in `eng.staticLayer(key, fn)`, composing any flag the art depends on into the key. Verify each with the visual baselines, which must stay byte-identical.
  - **Acceptance criteria:** Every room reports under 8ms/frame in `npm run test:perf`; all visual baselines unchanged.
  - **Estimated effort:** Medium
  - **Business value:** Medium
  - **Technical debt reduction:** Low

- [ ] **Confirm or delete `AGI_ENGINE_TECHNICAL_REFERENCE.md`**
  - **Priority:** P2
  - **Category:** Documentation
  - **Area:** Repository root
  - **Affected files:** [AGI_ENGINE_TECHNICAL_REFERENCE.md](AGI_ENGINE_TECHNICAL_REFERENCE.md)
  - **Problem:** At 1,917 lines this is the second-largest file in the repository and the largest piece of prose. It documents Sierra's original AGI interpreter, not this codebase, and is inherited from an earlier prototype.
  - **Impact:** A newcomer — human or AI — reasonably assumes the largest document describes the system they are working on, and takes design cues from an interpreter this project does not implement. Misleading documentation costs more than absent documentation.
  - **Recommended solution:** Either add a header stating plainly that it is background reading about the historical engine and binds nothing in this repository, or move it to `docs/reference/` and link it from the README as inspiration. Delete it if neither is true.
  - **Acceptance criteria:** The file's status is unambiguous within its first ten lines, or it no longer sits at the repository root.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Medium

- [ ] **Test the touch and mobile control path**
  - **Priority:** P2
  - **Category:** UX / Testing
  - **Area:** Input
  - **Affected files:** [index.html](index.html), [js/engine.js](js/engine.js), [tests/game.spec.js](tests/game.spec.js)
  - **Problem:** A `mobile-chromium` Playwright project exists, but the visual and performance suites skip it and no test exercises the on-screen d-pad or the touch parser field. The mobile layout is effectively unverified.
  - **Impact:** The controls a phone player depends on could break entirely and the whole suite would stay green.
  - **Recommended solution:** Add a mobile-only spec covering d-pad movement, tap-to-walk, tap-to-act, the parser input and inventory selection at a phone viewport.
  - **Acceptance criteria:** A player can reach a second room and pick up an item using only touch, asserted in the `mobile-chromium` project.
  - **Estimated effort:** Medium
  - **Business value:** High
  - **Technical debt reduction:** Low

- [ ] **Make visual baselines reproducible off a Windows desktop**
  - **Priority:** P2
  - **Category:** Testing / Developer Experience
  - **Area:** Test infrastructure
  - **Affected files:** [playwright.config.js](playwright.config.js), [.github/workflows/quality.yml](.github/workflows/quality.yml)
  - **Problem:** The 29 baselines are recorded on `win32`/Chromium. CI therefore has to skip the visual suite entirely, so the project's strongest safety net — the one that proves a refactor changed no pixels — never runs on a pull request.
  - **Impact:** Art regressions can only be caught by whoever happens to run the suite locally on Windows.
  - **Recommended solution:** Record a second baseline set inside the official Playwright Docker image and run that set in CI, keeping the Windows set for local iteration.
  - **Acceptance criteria:** A pull request that changes a room's art fails CI on a pixel diff.
  - **Estimated effort:** Medium
  - **Business value:** Medium
  - **Technical debt reduction:** Medium

- [ ] **Cover the whole cast and every item in the visual baselines**
  - **Priority:** P2
  - **Category:** Testing
  - **Area:** Art
  - **Affected files:** [tests/visual.spec.js](tests/visual.spec.js)
  - **Problem:** Baselines cover rooms and a sample of overlays. Nine speaker portraits and thirteen item close-ups are asserted only for existence, by the architecture spec.
  - **Impact:** A change to the shared `portraitBust` or `drawVgaPerson` helper can silently distort every face in the game; nothing would fail.
  - **Recommended solution:** Add two sheet snapshots — all portraits, and all item close-ups — rendered on a flat background at a fixed animation timer.
  - **Acceptance criteria:** Editing a shared actor or icon helper fails the visual suite.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Low

---

## P3 — Polish

- [ ] **Document the engine/content boundary as an explicit contract**
  - **Priority:** P3
  - **Category:** Architecture / Documentation
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js), [.github/copilot-instructions.md](.github/copilot-instructions.md)
  - **Problem:** The rule "nothing in the engine may name a character, room, item or joke" is stated in prose and currently holds, but only a careful reader can confirm it.
  - **Impact:** The generic-engine property is easy to lose one small conditional at a time, and losing it undoes the work that made this engine reusable.
  - **Recommended solution:** Add a test that greps `js/engine.js` for the id of every registered room, item and portrait and fails on any hit.
  - **Acceptance criteria:** Adding `if (item.id === 'pail')` to the engine fails the suite.
  - **Estimated effort:** Small
  - **Business value:** Low
  - **Technical debt reduction:** Medium

- [ ] **Give the crash screen a recovery action**
  - **Priority:** P3
  - **Category:** Reliability / UX
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js)
  - **Problem:** `reportCrash()` now explains what happened and confirms that saves are intact, but the player must reload manually and then press F7.
  - **Impact:** A recoverable fault still reads as a dead end to a non-technical player.
  - **Recommended solution:** Offer a keypress that reloads and immediately restores the most recent save.
  - **Acceptance criteria:** From a forced crash, one keypress returns the player to their last save.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Low

- [ ] **Report content-handler failures distinctly in development**
  - **Priority:** P3
  - **Category:** Developer Experience
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js)
  - **Problem:** `runContentHandler()` shows players a deliberately in-fiction message. During development that same message can be mistaken for intentional writing.
  - **Impact:** A room bug can hide behind flavour text for longer than it should.
  - **Recommended solution:** When served from localhost, prefix the message with the failing room and hotspot.
  - **Acceptance criteria:** A thrown handler names its room and hotspot on localhost, and stays in-fiction in production.
  - **Estimated effort:** Small
  - **Business value:** Low
  - **Technical debt reduction:** Low

- [ ] **Add a scoring-contract test independent of the walkthrough**
  - **Priority:** P3
  - **Category:** Testing
  - **Area:** Content
  - **Affected files:** [js/content.js](js/content.js), [tests/full-game.spec.js](tests/full-game.spec.js)
  - **Problem:** `maxScore` is proven only by a full playthrough reaching exactly 250. Nothing asserts that the individual awards sum to it.
  - **Impact:** Rebalancing points requires re-deriving the total by hand, and a compensating pair of errors would pass.
  - **Recommended solution:** Declare each award in `content.js` and assert both that they sum to `maxScore` and that the walkthrough collects every one.
  - **Acceptance criteria:** Changing one award's value without updating `maxScore` fails the suite.
  - **Estimated effort:** Small
  - **Business value:** Low
  - **Technical debt reduction:** Medium

---

## Completed during review

- [x] **Unbounded `CanvasGradient` leak in `lightPool` / `vignette`** — caches were keyed on animated float radius and alpha, so rooms with a pulsing glow allocated a fresh gradient every frame and never released one. Rebuilt as unit-alpha ramps keyed on a quantised radius, with opacity applied via `globalAlpha`. Guarded by a test asserting both caches stay bounded across 240 animated frames.
- [x] **The render loop died silently on any exception** — `requestAnimationFrame` was re-armed only after a successful frame, so a single throw froze the game on a stale canvas with no message. Added a try/catch and `reportCrash()`, which stops cleanly, announces to screen readers and paints a panel confirming saved games are intact.
- [x] **Throwing hotspot handlers produced dead clicks** — handlers run inside DOM event listeners, where exceptions are discarded. Added `runContentHandler()` so a content bug becomes a visible message and the engine stays interactive.
- [x] **`dark_wood` rendered at 25.9ms/frame** — well over the 16ms budget. Added `engine.staticLayer()` and applied it to `dark_wood`, `scullery`, `study` and `spell_room`. `dark_wood` is now 5.8ms and every room is under budget, with byte-identical baselines proving the change was purely an optimisation.
- [x] **Dead `wallPanel()` helper with misleading documentation** — unused, while its comment claimed "every room goes through this". Deleted, and `tools/find_dead_art.js` now fails the static gate on any unreferenced shared helper.
- [x] **No continuous integration** — added `.github/workflows/quality.yml` running the static gate, the service-worker version guard, the functional and accessibility suites and the performance budget on every push and pull request.
- [x] **Cached canvases outlived the engine** — `destroy()` now clears the static-layer and gradient caches.
- [x] **Inline CSP was weaker than the deployed header** — `_headers` is a Cloudflare Pages / Netlify convention, so hosts that ignore it fell back to a `<meta>` policy missing `base-uri`, `object-src` and `form-action`. The two now match on every directive a meta tag can express.
