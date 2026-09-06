# Crown Quest — Game Quality and Engineering Backlog

Findings from a full-repository review (architecture, code, performance, security,
reliability, testing, maintainability, UX). Items already fixed during the review
are listed in [Completed during review](#completed-during-review) at the bottom.

Priority: **Critical** threatens completion or save integrity; **High** blocks
important play or confidence in progression; **Medium** is a meaningful quality
gap; **Low** is polish or preventative work. Structural work does not outrank
confirmed player-facing progression defects.

---

## Adventure quality audit - 2026-09-06

### Release-Polish Follow-Up

The follow-up polish adds a visible goat charge, troll fall and river splash;
Fennow stays available for missed lore after his ring gift; solved bridge and
parchment prose now match state. Complete item/portrait sheets exposed and fixed
the giant portrait's framing. New draw-integrity tests cover those registries
and the full encounter timeline.

The touch-control and complete-art-sheet items below are now resolved, leaving
seven inherited engineering items open. Real touch input tests exercise pickup,
selection, walking, second-room entry and save/restore in both orientations;
classic commands use text insertion and touch Send. This found and fixed missing
landscape d-pad controls and clipped tools. Audio has 37 offline signal checks,
not a claimed listening review. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
for independent blind playtesting, physical devices, listening and hosting gates.
The prior repair results below remain historical evidence for that earlier tree.

Final polish gate: **342 passed, 58 intentionally skipped**; static checks clean;
all 12 rooms render in **3.4-11.5 ms**. The 41 visual baselines include inspected
new/changed images, with nine exact encounter repeat checks. Cache version
`v1.3.1` passes the guard against local `HEAD`; `origin/main` lacks the file.

Current-working-tree review. Existing unresolved engineering items below remain
open; historical completion claims are not new verification. Audit priorities
use player impact (Critical / High / Medium / Low), not structural size alone.

### Implementation follow-up

Eleven audit items below are now resolved. The original evidence is retained as
the pre-fix record; checked entries refer to the fixes and regression coverage
listed here, not to the original review-only run.

- [tests/state-regressions.spec.js](tests/state-regressions.spec.js): supplies
  omitted individually/together; first goat crossing normally/skipped; ring and
  crag restore; pail reset; dialogue gifts across two slots/restart; rejected
  transient saves; equivalent puzzle verbs; repeat acquisitions; all six socket
  orders with intermediate saves.
- [tests/player-journey.spec.js](tests/player-journey.spec.js): continuous real
  keyboard/parser journey to 250-point victory, no injected progression or
  skipped sequences. Existing navigation tests retain pointer coverage.
- [tests/full-game.spec.js](tests/full-game.spec.js): raw award total before
  clamping, every named event earned. The automatic duel award is now 10 rather
  than 30; all puzzle rewards are unchanged. Only the attainable victory rank
  remains; lower ranks require deliberately optional scoring before reintroduction.
- [tests/reliability.spec.js](tests/reliability.spec.js): parser, click, walking,
  exit, edge and both dialogue callback paths contain faults; local messages name
  their context and failed dialogue choices remain retryable.
- [tests/architecture.spec.js](tests/architecture.spec.js): no registered content
  IDs in engine string literals; story-specific fallback replies come from
  content configuration. See [README.md](README.md) for the hook contract.
- The input journey, state regressions and reliability tests now run in CI.
- Final full gate: **328 passed, 46 intentionally skipped**; static checks clean.
  Measured room frame cost: 6.0-13.9 ms against the 16 ms target.
- Visual refresh: 35 passed / 35 intentionally skipped; all 35 PNG baselines are
  byte-identical. Inspected cloud/cave screenshots and source-region pixel
  comparisons verify that deposited treasures remain absent. Mobile state
  regressions: 22 passed, including opening the tools menu to reach Save.
- Service-worker version: `v1.3.0`; guard passes against local `HEAD`. The default
  `origin/main` comparison skips because that ref lacks the file.

Nine inherited structural, platform-validation, visual-coverage and recovery-UX
items remain open. They are not claimed fixed by this gameplay repair pass.

- [x] **Keep the first goat-assisted crossing on the room's bridge geometry**

  **Priority:** High
  **Category:** Progression
  **Confidence:** High
  **Player impact:** High
  **Area:** Troll bridge, first goat arrival
  **Affected files:** [js/game.js](js/game.js), [js/rooms/act2.js](js/rooms/act2.js), [tests/navigation.spec.js](tests/navigation.spec.js)
  **Evidence:** CONFIRMED by runtime probe: after first goat arrival and skipped routing, crossing remains in a blocking sequence after 1,000 updates at x=322, y=293.8, minimumWalkY=280. The bootstrap replaces the room's two-bank/deck predicate with y > 292 and adds a right-edge cloud exit; crossing targets y=196. Navigation fixtures set troll_routed before entry, bypassing this sequence.
  **Problem:** Solving the troll puzzle installs obsolete navigation state instead of retaining the room's flag-aware geometry.
  **Impact:** The first bridge crossing can stall and the near-bank edge can bypass the visible beanstalk. Re-entering reconstructs a different layout.
  **Recommended solution:** Remove the bootstrap geometry/exit replacement; retain the room-owned predicate that already reads troll_routed. Keep the goat reward and narrative sequence.
  **Sierra-design consideration:** Preserve the goat solution, danger before routing, and bridge traversal; do not substitute teleportation for the puzzle payoff.
  **Regression considerations:** Normal and skipped routing; near/far-bank return; save/restore; no duplicate 15-point reward.
  **Acceptance criteria:** First arrival with the goat permits mouse and keyboard crossing and retreat without re-entry, restore, or hidden edge teleportation.
  **Validation:** Trigger routing from goat_follows with troll_routed unset, finish normally and with Escape, then cross and return through actual inputs.
  **Estimated effort:** Small
  **Game-design value:** High
  **Technical debt reduction:** Medium

---

- [x] **Prevent irreversible sailing without the bread and pail**

  **Priority:** Critical
  **Category:** Progression
  **Confidence:** High
  **Player impact:** High
  **Area:** Act I departure and mainland resource dependencies
  **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [tests/full-game.spec.js](tests/full-game.spec.js)
  **Evidence:** CONFIRMED: obtaining the spell without bread/pail and using the thimble on the skiff reaches harbour_road alive. Only the scullery supplies these items; the harbour skiff refuses return. Bread recruits the required goat; only a filled pail douses the dragon for the required mirror.
  **Problem:** An irreversible transition checks Morvane and wind but not essential supplies, with no specific loss warning or recovery.
  **Impact:** A live game becomes unwinnable; overwriting the last pre-departure save loses the run.
  **Recommended solution:** Preserve one-way sailing but provide an in-fiction pre-departure supply check, or deliberately author mainland replacement sources. Prefer the smaller departure guard unless design explicitly chooses replacement puzzles.
  **Sierra-design consideration:** This is an unintentional progression defect, not a fair death or a useful old-school inventory challenge. Do not reveal later puzzle solutions in the reminder.
  **Regression considerations:** Fully equipped departure, earlier return indoors, normal/skipped sailing, each item omitted separately and both omitted.
  **Acceptance criteria:** Every allowed arrival on the mainland retains a reachable route to the goat and dragon solutions.
  **Validation:** New-game omission matrix followed through real departure and mainland interactions; preserve 250-point normal solution.
  **Estimated effort:** Small
  **Game-design value:** High
  **Technical debt reduction:** Medium

- [x] **Serialize and reset dialogue choices with the adventure state**

  **Priority:** Critical
  **Category:** Save/Restore
  **Confidence:** High
  **Player impact:** High
  **Area:** Once-only dialogue rewards, restore, restart
  **Affected files:** [js/engine.js](js/engine.js), [js/game.js](js/game.js), [tests/game.spec.js](tests/game.spec.js)
  **Evidence:** CONFIRMED: save before requesting Hattie's rope, receive it, restore, talk again: no rope and no rope option. Restarting in the same page also leaves the option missing. registerDialog stores chosenOptions outside flags; getSaveData/loadGame/restart omit it. Fennow's once-only ring gift shares this mechanism.
  **Problem:** World/inventory state rewinds while dialogue eligibility remains in the future; reload instead discards dialogue history entirely.
  **Impact:** Restore and restart can remove access to required items and clues, making completion impossible until an out-of-game reload or earlier compatible save.
  **Recommended solution:** Include per-dialogue choices in versioned save state; reset them for new games and restore a defined empty default for older saves. Commit once-only choice and reward together, or prohibit snapshots before pending dialogue actions finish.
  **Sierra-design consideration:** Preserve one-time conversation writing; restore must restore the same world, not penalize experimentation.
  **Regression considerations:** Rope and ring, cross-slot restores, fresh-page restores, once-only lore, saving during a reward response, old save defaults.
  **Acceptance criteria:** Pre-reward restore/new game offers each reward again; post-reward restore preserves choices and cannot duplicate rewards.
  **Validation:** Round trips before/after both gifts, same-page restart, fresh page, and two save slots with different dialogue histories.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** High

- [x] **Refuse or safely checkpoint saves during unfinished scripted transactions**

  **Priority:** Critical
  **Category:** Save/Restore
  **Confidence:** High
  **Player impact:** High
  **Area:** Save button, cutscenes, blocking sequences, ending
  **Affected files:** [js/engine.js](js/engine.js), [js/rooms/act3.js](js/rooms/act3.js), [tests/reliability.spec.js](tests/reliability.spec.js)
  **Evidence:** CONFIRMED through DOM Save/slot buttons during the first ending narration: restore yields amber_tower, door_opened=true, sockets_lit=3, empty inventory, no sequence/cutscene, won=false after 1,000 updates. Keyboard blocks F5 during sequences, but toolbar handlers and saveGame only reject title/dead/won. Callbacks are not serialized.
  **Problem:** Saves can capture committed flags/items before the callback that completes their transaction; restore discards that callback.
  **Impact:** A valid-looking save permanently strands the ending. Mid-sailing and dialogue-response snapshots have the same partial-transaction risk.
  **Recommended solution:** Centralize save eligibility for every entry point and reject unstable states with explicit feedback, or save a deliberately stable checkpoint. Do not attempt to serialize closures.
  **Sierra-design consideration:** Manual saves remain; blocking only genuinely unsavable moments protects their reliability.
  **Regression considerations:** Ordinary narration may still be savable where no transaction is pending; load must remain usable for recovery; do not overwrite a prior valid slot on refusal.
  **Acceptance criteria:** No UI, parser, touch, or API save entry point writes a snapshot whose required continuation is lost on restore.
  **Validation:** DOM save attempts during opening, spell, sailing, goat, dragon, gift response, duel and coronation; verify prior slot unchanged or checkpoint resumable.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** High

- [x] **Restore room-local puzzle state without replaying fresh-entry resets**

  **Priority:** High
  **Category:** Save/Restore
  **Confidence:** High
  **Player impact:** High
  **Area:** Cloud ring and crag timer
  **Affected files:** [js/engine.js](js/engine.js), [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [tests/game.spec.js](tests/game.spec.js)
  **Evidence:** CONFIRMED: ring_worn=true before save, false after load; taking the shield then kills Rowan. loadGame restores flags before goToRoom calls cloud onEnter, which resets the ring. Crag onEnter likewise resets crag_timer/crag_nudged.
  **Problem:** Restore is treated as a new room visit, silently changing saved puzzle state.
  **Impact:** A player restoring a safe state can die from an action that was safe when saved; timing also changes.
  **Recommended solution:** Separate reconstructing room geometry/audio from new-visit state changes, with an explicit restore context. Preserve per-visit ring reset only on genuine arrival.
  **Sierra-design consideration:** Keep re-equipping on a new visit if intended; restoring is not travel.
  **Regression considerations:** Existing saved facing/far-bank fixes, timer warnings, ordinary entry, old-version compatibility.
  **Acceptance criteria:** Same-room restore preserves ring protection, timer and warning state while rebuilding correct geometry and visuals.
  **Validation:** Save while protected then restore/take shield; crag snapshots before/after warning; fresh room entry still applies intended resets.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** High

---

- [x] **Make advertised puzzle verbs and hints agree with progression state**

  **Priority:** Medium
  **Category:** Interaction
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Spell reading, tapestry, parchment, village hints
  **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [js/engine.js](js/engine.js), [tests/game.spec.js](tests/game.spec.js)
  **Evidence:** CONFIRMED: read spellbook displays the recipe but leaves read_spell=false; the circle then refuses ingredients until the lectern is used. Pull/use tapestry only dusts it although LOOK moves it. GET parchment says it is taken without granting it; LOOK grants it. After rope_tied=true and rope consumption, the village hint still directs the player to request rope.
  **Problem:** Plausible actions and explicit feedback disagree with actual state transitions.
  **Impact:** Players who inferred the solution encounter misleading refusals or repeat completed steps.
  **Recommended solution:** Route equivalent verbs to shared content handlers, or explicitly explain the lectern requirement before refusing ingredients. Make parchment feedback truthful and test rope_tied before inventory in the hint.
  **Sierra-design consideration:** Preserve discovery and ritual prerequisites, not accidental verb guessing. Do not reveal the gnome answer automatically beyond the existing design.
  **Regression considerations:** Original LOOK/USE solutions, both interfaces, single awards, meaningful wrong-item feedback.
  **Acceptance criteria:** Each stated successful action changes the corresponding state, and hints never prescribe an impossible or completed prerequisite.
  **Validation:** Command table for read/use book, pull/look tapestry, take/look parchment and pre/post-rope hints in both interfaces.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** Medium

- [x] **Reset mutable item descriptions when starting a new adventure**

  **Priority:** Medium
  **Category:** Inventory
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Pail presentation and restart
  **Affected files:** [js/engine.js](js/engine.js), [js/content.js](js/content.js), [tests/game.spec.js](tests/game.spec.js)
  **Evidence:** CONFIRMED: fill the pail, restart in the same page; pail_full=false but items.pail.name remains Pail of Water. restart clears inventory/flags but not mutated item metadata.
  **Problem:** Presentation from an earlier run survives into a fresh game.
  **Impact:** The newly acquired empty pail claims to contain water, misleading preparation for the dragon.
  **Recommended solution:** Preserve immutable registration defaults or reconstruct item presentation from state through a content hook on restart and restore.
  **Sierra-design consideration:** Keep the useful filled/empty descriptions; make them trustworthy.
  **Regression considerations:** Filled and empty save round trips, fresh-page boot, repeated restarts, close-up and inventory labels.
  **Acceptance criteria:** An empty pail always has empty text, and a filled pail always has filled text across restart/restore.
  **Validation:** Fill, restart, reacquire, inspect, then refill and save/load; assert flags, name and description together.
  **Estimated effort:** Small
  **Game-design value:** Medium
  **Technical debt reduction:** Medium

- [x] **Add a continuous player-input solution and adverse-order regression matrix**

  **Priority:** High
  **Category:** Testing
  **Confidence:** High
  **Player impact:** High
  **Area:** Whole-game progression and CI
  **Affected files:** [tests/full-game.spec.js](tests/full-game.spec.js), [tests/navigation.spec.js](tests/navigation.spec.js), [tests/reliability.spec.js](tests/reliability.spec.js), [package.json](package.json)
  **Evidence:** CONFIRMED: full-game's act helper calls goToRoom and raw handlers; dialog helper starts conversations directly. Navigation bridge fixtures seed troll_routed. A real keyboard route encountered the first-goat crossing stall, then reached victory only by Escape-skipping that walk. test:functional omits reliability.spec.js.
  **Problem:** Isolated tests prove happy-path transactions and prepared navigation states, but not their composition or same-page reset/restore behavior.
  **Impact:** The normal test gate misses the confirmed release blockers documented above.
  **Recommended solution:** Keep fast handler tests; add one no-teleport/no-state-injection input route, exercise natural sequence completion, and add the focused omission/restore/first-arrival tests specified per finding. Include reliability tests in CI.
  **Sierra-design consideration:** Test intended hazards and failure messages; do not bypass puzzles to make the suite green.
  **Regression considerations:** Both parser and pointer paths, genuinely touch-only coverage in the existing mobile item, normal and skipped presentation, full score ledger independent of clamping.
  **Acceptance criteria:** Continuous completion uses only public inputs and granted state; each confirmed progression defect has a regression that fails before its fix and passes afterwards; CI executes reliability tests.
  **Validation:** New-game-to-ending route plus restore/restart and omitted-item matrices, both browser profiles as appropriate.
  **Estimated effort:** Large
  **Game-design value:** High
  **Technical debt reduction:** High

---

## Structural Work - Player-Impact Priorities

- [ ] **Split the oversized engine into focused modules**
  - **Priority:** Medium
  - **Category:** Architecture
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js), [index.html](index.html), [serviceworker.js](serviceworker.js), [eslint.config.js](eslint.config.js), [tools/validate_content.js](tools/validate_content.js)
  - **Evidence:** CONFIRMED: save/load, dialogue choices, parser, rendering, sequences, sprites and input remain in the same file, with definitions beyond line 4,600.
  - **Problem:** The engine exceeds the documented ~1,500-line hard ceiling and owns too many independent systems. The contributor routing table sends further reusable systems into it.
  - **Impact:** Every change touches one enormous file, which maximises merge conflicts and review burden and makes it impossible to reason about a subsystem in isolation. It is also the single biggest obstacle to onboarding, because there is no smaller unit to read first.
  - **Recommended solution:** Extract along existing seams into `js/engine/` — `parser.js`, `saveload.js`, `dialog.js`, `textwindow.js`, `player.js`, `overlays.js` — leaving `engine.js` as the loop, state and composition root. Keep the existing script-tag/registry pattern; no bundler is required. Move one seam per commit and prove each with byte-identical visual baselines.
  - **Acceptance criteria:** No file in `js/` exceeds 1,500 lines; `npm run check` passes; all 29 visual baselines are byte-identical after the move; the routing table in `.github/copilot-instructions.md` names the new modules.
  - **Estimated effort:** Large
  - **Sierra-design consideration:** Pure structural change; preserve all commands, timing, jokes and visuals.
  - **Regression considerations:** Fix state defects first; keep engine/content registration and public APIs stable.
  - **Validation:** Functional, continuous progression, draw-integrity and byte-identical visual tests after each extraction.
  - **Game-design value:** Medium
  - **Business value:** Medium — no user-visible change, but it is the precondition for most other work here.
  - **Technical debt reduction:** High

- [ ] **Enforce the file-size ceiling automatically**
  - **Priority:** Low
  - **Category:** Architecture
  - **Confidence:** High
  - **Player impact:** Low
  - **Area:** Tooling
  - **Affected files:** [tools/validate_content.js](tools/validate_content.js), [package.json](package.json)
  - **Evidence:** CONFIRMED: the static gate passes despite engine and act files exceeding 1,500 lines; the former example count of 1,421 was below that ceiling and is not evidence of a violation.
  - **Problem:** The ~800-line soft / ~1,500-line hard ceiling is not enforced by the gate.
  - **Impact:** A documented rule nobody enforces is a rule that is already broken. Splitting the engine once without a guard means it simply regrows.
  - **Recommended solution:** Add a line-count check to the static gate: fail over 1,500, warn over 800, with a short explicit allow-list carrying the target size for files being actively split.
  - **Acceptance criteria:** `npm run check:static` fails when a non-allow-listed file exceeds 1,500 lines; the allow-list shrinks to empty as the split above lands.
  - **Estimated effort:** Small
  - **Business value:** Low direct, High preventative
  - **Sierra-design consideration:** No gameplay change.
  - **Regression considerations:** Explicit temporary exceptions must not force a risky all-at-once refactor.
  - **Validation:** Deliberately exceed the limit in a fixture and verify failure; check exceptions separately.
  - **Game-design value:** Low
  - **Technical debt reduction:** High

- [ ] **Split the act files into one file per room**
  - **Priority:** Medium
  - **Category:** Architecture
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Content
  - **Affected files:** [js/rooms/act2.js](js/rooms/act2.js), [index.html](index.html), [serviceworker.js](serviceworker.js), [tools/validate_content.js](tools/validate_content.js)
  - **Evidence:** CONFIRMED: act2 registers seven rooms and act1 registers four; their puzzle and art definitions are grouped by act.
  - **Problem:** Multiple independent rooms share large files, against the one-room-per-file guidance.
  - **Impact:** Two people editing different rooms conflict in the same file, and a room's art, hotspots and puzzle logic cannot be reviewed on their own.
  - **Recommended solution:** Move each room to `js/rooms/act2/<room>.js`, with genuinely shared helpers (`alderhavenSky`, `followingGoat`, `wearRing`) promoted to a sibling `shared.js`. The registry pattern needs no change.
  - **Acceptance criteria:** One room per file; all three registration points updated; visual baselines byte-identical.
  - **Estimated effort:** Medium
  - **Sierra-design consideration:** Preserve scene composition and puzzle ownership.
  - **Regression considerations:** Do not mix art or puzzle redesign with moves; keep shared bridge geometry together.
  - **Validation:** Registration gate, progression and visual tests after each move.
  - **Game-design value:** Medium
  - **Business value:** Low
  - **Technical debt reduction:** Medium

---

## Correctness, Performance and Process

- [ ] **Extend static-layer caching to the remaining scenes**
  - **Priority:** Low
  - **Category:** Performance
  - **Confidence:** High
  - **Player impact:** Low
  - **Area:** Rooms
  - **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [js/rooms/act3.js](js/rooms/act3.js)
  - **Evidence:** CONFIRMED remaining uncached scenery in room draw functions. Updated desktop measurement: all rooms 2.6-7.4ms/frame; the older 14.6/15.1ms measurements are superseded. Mobile power/frame cost was not measured.
  - **Problem:** Some static procedural scenery still repaints every frame, but no current desktop frame-budget failure was observed.
  - **Impact:** Potential avoidable CPU/battery cost; low-end dropped frames remain unverified, not a confirmed defect.
  - **Recommended solution:** Wrap each room's static prefix in `eng.staticLayer(key, fn)`, composing any flag the art depends on into the key. Verify each with the visual baselines, which must stay byte-identical.
  - **Acceptance criteria:** Every room reports under 8ms/frame in `npm run test:perf`; all visual baselines unchanged.
  - **Estimated effort:** Medium
  - **Business value:** Medium
  - **Sierra-design consideration:** Keep deterministic art and animation unchanged.
  - **Regression considerations:** Cache keys must include state; animated effects must remain uncached.
  - **Validation:** Profile candidate rooms before editing, then compare timings and byte-identical snapshots; include a low-end target before claiming mobile benefit.
  - **Game-design value:** Low
  - **Technical debt reduction:** Low

- [ ] **Confirm or delete `AGI_ENGINE_TECHNICAL_REFERENCE.md`**
  - **Priority:** Low
  - **Category:** Documentation
  - **Confidence:** Medium
  - **Player impact:** Low
  - **Area:** Repository root
  - **Affected files:** [AGI_ENGINE_TECHNICAL_REFERENCE.md](AGI_ENGINE_TECHNICAL_REFERENCE.md)
  - **Problem:** At 1,917 lines this is the second-largest file in the repository and the largest piece of prose. It documents Sierra's original AGI interpreter, not this codebase, and is inherited from an earlier prototype.
  - **Impact:** A newcomer — human or AI — reasonably assumes the largest document describes the system they are working on, and takes design cues from an interpreter this project does not implement. Misleading documentation costs more than absent documentation.
  - **Recommended solution:** Either add a header stating plainly that it is background reading about the historical engine and binds nothing in this repository, or move it to `docs/reference/` and link it from the README as inspiration. Delete it if neither is true.
  - **Acceptance criteria:** The file's status is unambiguous within its first ten lines, or it no longer sits at the repository root.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Medium
  - **Evidence:** Inherited documentation finding; README identifies the historical reference as inspiration. No new runtime defect is claimed.
  - **Sierra-design consideration:** Historical inspiration is valuable and need not be deleted.
  - **Regression considerations:** Preserve useful reference material and attribution.
  - **Validation:** Check the first ten lines and README link after clarification.
  - **Game-design value:** Low

- [x] **Test the touch and mobile control path**
  - **Resolution:** [tests/touch.spec.js](tests/touch.spec.js) passes three genuine
    touch routes, including held/released d-pad and touch parser submission.
    Inspected portrait/landscape viewport captures and per-control bounds checks
    cover wrapping. Physical software-keyboard behavior remains a release gate.
  - **Priority:** Medium
  - **Category:** Testing
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Input
  - **Affected files:** [index.html](index.html), [js/engine.js](js/engine.js), [tests/game.spec.js](tests/game.spec.js)
  - **Problem:** A `mobile-chromium` Playwright project exists, but the visual and performance suites skip it and no test exercises the on-screen d-pad or the touch parser field. The mobile layout is effectively unverified.
  - **Impact:** The controls a phone player depends on could break entirely and the whole suite would stay green.
  - **Recommended solution:** Add a mobile-only spec covering d-pad movement, tap-to-walk, tap-to-act, the parser input and inventory selection at a phone viewport.
  - **Acceptance criteria:** A player can reach a second room and pick up an item using only touch, asserted in the `mobile-chromium` project.
  - **Estimated effort:** Medium
  - **Business value:** High
  - **Technical debt reduction:** Low
  - **Evidence:** CONFIRMED: mobile profile exists, but navigation tests still use page.keyboard/page.mouse-style clicks; no true d-pad/touch-parser progression test was found. Desktop-style mobile-profile passes are not touch-only proof.
  - **Sierra-design consideration:** Preserve parser and verb modes; ensure touch can express them.
  - **Regression considerations:** Portrait/landscape layout, software keyboard, tap dismissal, inventory scrolling and death recovery.
  - **Validation:** Real touchscreen or hasTouch browser context, using no hardware-keyboard helpers to complete the acceptance route.
  - **Game-design value:** High

- [ ] **Make visual baselines reproducible off a Windows desktop**
  - **Priority:** Medium
  - **Category:** Testing
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Test infrastructure
  - **Affected files:** [playwright.config.js](playwright.config.js), [.github/workflows/quality.yml](.github/workflows/quality.yml)
  - **Problem:** The 29 baselines are recorded on `win32`/Chromium. CI therefore has to skip the visual suite entirely, so the project's strongest safety net — the one that proves a refactor changed no pixels — never runs on a pull request.
  - **Impact:** Art regressions can only be caught by whoever happens to run the suite locally on Windows.
  - **Recommended solution:** Record a second baseline set inside the official Playwright Docker image and run that set in CI, keeping the Windows set for local iteration.
  - **Acceptance criteria:** A pull request that changes a room's art fails CI on a pixel diff.
  - **Estimated effort:** Medium
  - **Business value:** Medium
  - **Technical debt reduction:** Medium
  - **Evidence:** CONFIRMED: quality.yml explicitly excludes the Windows visual suite. The exact historical baseline count is superseded by newer snapshots.
  - **Sierra-design consideration:** Protect existing pixel art, not a new aesthetic.
  - **Regression considerations:** Wait for bundled fonts, freeze timers and use a pinned browser environment.
  - **Validation:** Deliberately alter one scene pixel region and prove the CI visual job fails.
  - **Game-design value:** Medium

- [x] **Cover the whole cast and every item in the visual baselines**
  - **Resolution:** Inspected sheets cover all 13 items plus the filled pail and
    all nine portraits in two expression states. Corrected the giant framing;
    exact sheet comparisons and canvas validity guards now protect the helpers.
  - **Priority:** Medium
  - **Category:** Testing
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Art
  - **Affected files:** [tests/visual.spec.js](tests/visual.spec.js)
  - **Evidence:** CONFIRMED partial progress: cast-faces now covers six human cels/portraits and was inspected in this audit. The visual spec still has one item-closeup example, not an exhaustive thirteen-item sheet.
  - **Problem:** Full item and remaining portrait coverage is still absent; the prior claim that no cast sheet exists is obsolete.
  - **Impact:** A change to the shared `portraitBust` or `drawVgaPerson` helper can silently distort every face in the game; nothing would fail.
  - **Recommended solution:** Add two sheet snapshots — all portraits, and all item close-ups — rendered on a flat background at a fixed animation timer.
  - **Acceptance criteria:** Editing a shared actor or icon helper fails the visual suite.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Low
  - **Sierra-design consideration:** Preserve cast proportions and treasure readability.
  - **Regression considerations:** Include filled/empty pail and relevant creature portraits, with fixed animation time.
  - **Validation:** Inspect the sheets and prove a shared helper regression changes the expected snapshot.
  - **Game-design value:** Medium

---

## Reliability, Boundaries and Scoring

- [x] **Document the engine/content boundary as an explicit contract**
  - **Priority:** Medium
  - **Category:** Architecture
  - **Confidence:** High
  - **Player impact:** Low
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js), [.github/copilot-instructions.md](.github/copilot-instructions.md)
  - **Evidence:** CONFIRMED exception to the historical claim: engine parser replies name the sorcerer's floors, scullery-boy technique and a Bramble King ballad. Bootstrap also monkey-patches room entry and inventory for progression.
  - **Problem:** The intended generic boundary is not fully enforced; the first-goat geometry defect demonstrates the cost of progression logic outside its room owner.
  - **Impact:** The generic-engine property is easy to lose one small conditional at a time, and losing it undoes the work that made this engine reusable.
  - **Recommended solution:** Add a test that greps `js/engine.js` for the id of every registered room, item and portrait and fails on any hit.
  - **Acceptance criteria:** Adding `if (item.id === 'pail')` to the engine fails the suite.
  - **Estimated effort:** Small
  - **Business value:** Low
  - **Technical debt reduction:** Medium
  - **Sierra-design consideration:** Move, do not delete, game-specific jokes and responses.
  - **Regression considerations:** An ID grep alone cannot detect prose coupling; avoid false positives in generic words.
  - **Validation:** Boundary tests plus parser-response regression checks; document explicit content hooks.
  - **Game-design value:** Medium

- [ ] **Give the crash screen a recovery action**
  - **Priority:** Low
  - **Category:** UI/UX
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js)
  - **Problem:** `reportCrash()` now explains what happened and confirms that saves are intact, but the player must reload manually and then press F7.
  - **Impact:** A recoverable fault still reads as a dead end to a non-technical player.
  - **Recommended solution:** Offer a keypress that reloads and immediately restores the most recent save.
  - **Acceptance criteria:** From a forced crash, one keypress returns the player to their last save.
  - **Estimated effort:** Small
  - **Business value:** Medium
  - **Technical debt reduction:** Low
  - **Evidence:** Existing reportCrash/reliability tests verify an announced halt, not one-action restore; no natural crash occurred during this audit.
  - **Sierra-design consideration:** Keep manual save ownership and do not silently choose an older slot.
  - **Regression considerations:** Empty/corrupt saves, unavailable storage and the same fault recurring after reload.
  - **Validation:** Force a draw failure and verify a clearly labelled recovery path with and without valid saves.
  - **Game-design value:** Medium

- [x] **Report content-handler failures distinctly in development**
  - **Priority:** Medium
  - **Category:** Bug
  - **Confidence:** High
  - **Player impact:** Medium
  - **Area:** Engine
  - **Affected files:** [js/engine.js](js/engine.js)
  - **Evidence:** CONFIRMED: performAction uses runContentHandler, but parser use-item, walk callbacks and dialogue actions still invoke handlers directly. No natural exception was observed on the completed route.
  - **Problem:** Error containment depends on input path; development labels also do not consistently identify the failed content.
  - **Impact:** A room bug can hide behind flavour text for longer than it should.
  - **Recommended solution:** Route equivalent parser/click/walk/dialogue invocations through the same guarded dispatch, and add a local-development room/handler label.
  - **Acceptance criteria:** A thrown handler is contained in every input path, names its context on localhost, and stays player-appropriate in production.
  - **Estimated effort:** Small
  - **Business value:** Low
  - **Technical debt reduction:** Low
  - **Sierra-design consideration:** Fault messages must be distinguishable from intentionally funny refusals.
  - **Regression considerations:** Preserve handler arguments, actionScope narration and pending-action behavior.
  - **Validation:** Inject the same throwing handler through click, parser, walk and dialogue paths; assert visible recovery and continued input.
  - **Game-design value:** Medium

- [x] **Make acquisition state and the scoring contract independent of inventory and score clamping**

  **Priority:** Medium
  **Category:** Score
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Acquisition, deposited treasures, award ledger
  **Affected files:** [js/content.js](js/content.js), [js/engine.js](js/engine.js), [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [tests/full-game.spec.js](tests/full-game.spec.js)
  **Evidence:** CONFIRMED: the 21 normal awards sum to 270, but maxScore=250 and addScore clamps. The input route reaches 240 before the 30-point duel and displays 250 afterwards. Recollecting salt after placing it awards +3 again. After depositing the shield and returning to the cloud, its inventory-based hidden getter exposes it again; acquisition grants another shield while socket_shield_of_ardor remains true.
  **Problem:** Inventory possession is used as historical acquisition state, and a capped score assertion hides the award mismatch.
  **Impact:** Duplicate treasure custody and repeated awards invalidate completion/scoring claims; lower victory ranks have no demonstrated legitimate route because ordinary scored actions are required.
  **Recommended solution:** Declare awards once, guard them and source visibility with persistent event/acquisition state, and reconcile the intended 250-point contract explicitly. Do not simply raise the maximum or change tests to accept 270 without a design decision.
  **Sierra-design consideration:** Retain rewards for exploration and cleverness; optional scoring or lower ranks must correspond to genuine optional routes, not bugs.
  **Regression considerations:** Salt resupply may be allowed without another award; deposited treasures must not respawn. Preserve legitimate ending custody and alternate socket orders.
  **Acceptance criteria:** Unclamped award sum equals the declared maximum; each event awards once; source, inventory and socket custody cannot contradict each other; every retained rank has an intentional reachability rationale.
  **Validation:** Capture award events before clamping across a complete route; repeat salt collection; deposit/revisit shield and mirror; test all six socket orders and save/load midway.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** High

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
- [x] **Doused dragon art direction** — replaced artificial purple palette swap with authentic Sierra-style narrative exhaustion: cooled crimson tones, drooped wings, head resting low on paws, heavy sleeping eyelid, soot/ash streaks, and cavern steam motes.
- [x] **Organic canopy silhouetting in Dark Wood** — added gnarly branch silhouettes, twig breaks, and ragged leaf clusters cutting across the canopy sky openings to break procedural mathematical curve profiles.
- [x] **Cloud Realm horizon grounding** — added billowing cumulus cloud crests along the horizon line nesting the marble pillars directly into the cloud deck.
- [x] **Classic Sierra death stinger** — replaced generic descending pitch buzzer with a 4-note mournful minor brass stinger (Eb4 -> D4 -> C4 -> G3) and low timpani resonance.
- [x] **Grumbold rebuilt as a hunched troll** — hinged two-segment arms, planted feet, jaw and tusks; rope-bridge deck extended so he stands on the planks rather than in the gorge.
- [x] **Harbour road and village green lawns broken** — wheel ruts, puddles, grass clumps, stump, fence post and trough so the greens stop reading as sandwich turf.
- [x] **Broadleaf trees forked** — overlapping irregular canopy masses, forked trunk and visible roots instead of stacked-ellipse lollipops.
- [x] **Sleeping giant grounded** — connected reclining figure on the hall floor band, overlapping a column, near hand hanging toward the cloud lip.
- [x] **Duel directed** — larger Morvane, tower reduced to a distant silhouette, thicker forked bolt and flash lighting.
- [x] **Coronation seated** — receding dais, overlapping crowd ranks, crown landing on Rowan's cap rather than hovering.
- [x] **The troll bridge had no gorge** — the span stood on a pillar in the same lawn the player walked on, so the troll guarded nothing. Restaged as a gorge running across the screen with the far wall facing the camera, and the span now recedes into the screen (`drawRecedingBridge`), anchored to both lips.
- [x] **Exteriors had no ground-plane recession** — harbour road, village green and the bridge banks laid one flat green rectangle from horizon to frame edge, with grass detail the same size at the horizon as at the player's feet. Added `turfRecession()`: tonal bands hazing toward the sky, blade length and contrast scaling with depth.
- [x] **Conifers and hedgerows were wallpaper** — `drawPine` ignored its seed entirely, so every tree was identical at a fixed pitch. Height, tier count, width and lean are now all seeded; the village hedgerow crowns are jittered the same way.
- [x] **Rowan wore the wrong costume in every cutscene** — `drawEgoFront` was authored against a greyscale ramp and the tunic remap lived in `drawPlayer`, so cutscenes drew the under-painting and he attended his own coronation in a white shirt. The remap now belongs to the cel.
- [x] **The dragon was vector art** — untapered rectangle legs, evenly spaced identical belly plates, a flat triangle wing and a comb spine. Rebuilt with hinged tapering legs, overlapping scutes of uneven width, a wing with finger bones and sagging membrane, a varied ridge and scale texture over the barrel.
- [x] **The Shield of Ardor read as a wagon wheel** — flat disc with twelve even spokes. Now a domed boss with a specular, a lit-above/shadowed-below rim band with rivets, and four short device rays.
- [x] **Water dither was a screen door** — one even checkerboard across the whole sea. `waterBand` now ramps pattern size and opacity with depth and breaks into swell dashes near the shore.
- [x] **The cave mouth was a flat green shape** — four nested flat polygons. Now a lit landscape seen through a ragged hole: sky, sunlit foliage, silhouetted trunks and rock teeth on the rim.
- [x] **The death panel vibrated** — saturated red on saturated blue at matching luminance. Headline is now bone white with a shadow on a deep ground, red kept for the border. Victory stars scattered along the border instead of four identical corner marks.
- [x] **Both cottage chimneys floated** — each stack was a hand-placed rectangle whose base sat 16-24px above the thatch it was supposed to pass through. Added `roofSurfaceY()` so roof furniture is derived from the same numbers `thatchRoof` was given, and seated both stacks on it with packed thatch at the join.
- [x] **Hattie floated in front of her cart** — she stood at ground y=324 directly over a cartwheel whose own ground contact was y=334, so her contact shadow was painted onto the wheel. Moved into the open in front of the cart at y=352, where her feet are below the wheels and she correctly occludes them.
- [x] **Nothing detected floating objects** — grounding was convention only. Added an F9 authoring overlay drawing the walkable band, the barriers, and a labelled tick at every ground point an actor claimed that frame, so a sprite drawn above its own anchor is visible immediately.
- [x] **Every human NPC was a frozen statue** — every creature helper took `animTimer` and breathed, but the shared human cel took none, so peddlers and villagers stood dead still indefinitely. `drawVgaPerson` now takes `animTimer` and a per-character `phase` and gives a slow breath plus an occasional blink, staggered across the cast.
- [x] **The coronation carpet was not in perspective** — the cloth was a splaying trapezoid but its gold borders were two vertical `fillRect` bars, so the trim stood up out of the floor plane. Carpet edges, gold borders and cross-weave are now all derived from one pair of edge functions, the borders widen with depth, and the carpet runs up the dais treads as a runner and out past the bottom of frame.
- [x] **No fanfare at the coronation** — added `drawTrumpeter` and a `CAST_HERALD` livery: two heralds at the foot of the dais with long trumpets raised and device banners swinging under the tubes.
- [x] **The cave mouth rework was worse than what it replaced** — the first attempt filled the opening with saturated mid-value greens, which at that size read as a large emerald rather than daylight. Redone as blown-out light: pale desaturated ramp, a glare bloom, and dark tree silhouettes as the only dark shapes, with a thick near-black rock rim. Caught by reviewing the screenshot rather than by any test.
- [x] **The flagstone floor was brickwork stood on end** — `flagstones()` compressed its courses with distance but drew every stone as an axis-aligned rectangle at a fixed horizontal pitch, so the joints running away from the viewer stayed vertical and the floor read as a wall lying down. Stones are now trapezoids whose side joints follow the floor's spread from the back-wall foot out to the full frame, drawn at partial opacity so the shell's floor banding still modulates them. Affected the scullery and the study; the spell room, well bottom and dragon cave use tonal banding with no grid and were already correct.
- [x] **The study's front door stopped short of the floor** — the leaf was drawn to wall-band fraction 0.86 and its surround to 0.89, leaving it hanging ~11% of the wall height above the flagstones. `rBand(x, 1)` *is* the wall/floor junction, so both now run to 1, with a stone threshold across the base. The exit hotspot was resized to the door that is actually drawn.
- [x] **Props had no source of truth for the surface under them** — four separate floating objects (chimney, Hattie, shelf pans and pail, desk candle) all came from a hand-written base coordinate that ignored the thing underneath. Added a per-room surface registry: `addSurface(id, x0, x1, yAt)` where `yAt` is a number for a flat top or a function of x for one that slopes to the vanishing point, plus `surfaceY()` and `standOn()`. The scullery larder shelves, copper rack and the study desk are declared once in `onEnter` and every prop on them now takes its base from `standOn()`, so it is correct by construction. F9 draws each surface and a tick at every prop contact. Two architecture tests fail if a prop stands on an undeclared surface, sits off the ends of one, or if a declared surface has no props left on it.
- [x] **The study candle floated 22px above the desk** — its dish was placed at y=240 while the desk surface is y=262, and it was the only object on that desk not measured from the top. Restood on the desk at a clear spot on the left, dish base on the surface and the stick built up from the dish; the hotspot moved with it.
- [x] **The scullery stair was outlined in black, not framed** — the opening was a near-black rectangle with two 6px jamb strips, so the doorway read as a hole cut in the wall. Replaced with a timber casing: planked posts, a head beam with iron straps, a worn sill and pegs, drawn last so it frames the treads and the light spilling down. The exit hotspot was widened to match the drawn frame.
- [x] **The scullery's copper pans floated off their shelf** — each pan was an ellipse *centred* 4px above the plank, so its lower edge hung 4-6px clear, and they were the only shelf objects with no contact shadow. Now based on the band at the pan's own x and built upward. The `shelfShadow` helper takes a wall band, so both walls use one measurement.
- [x] **The scullery pail was drawn below its own shadow** — `ITEM_ART.pail` is drawn about its middle with its base 17 units below the origin, but the room placed the origin as if it were the base, sinking the pail ~8px past its contact shadow. Ground line and origin are now derived from one number.
- [x] **Three interiors had no walkable floor** — `scullery`, `study` and `spell_room` never called `setWalkableArea`, and `clearRoomState()` resets it to null, so the ego could walk through the hearth, behind the back wall and into the screen edge. All three now confine the ego to their floor.
- [x] **Interior screen edges teleported the player through blank walls** — the scullery's right edge and the study's left and right edges each duplicated the destination of a drawn stair or door, so walking into a featureless wall silently moved you as if you had used the stair. Removed; interiors now leave only by an exit the player can see. Two architecture tests lock this down: every room must confine the ego to a bounded floor, and every edge transition must have an exit hotspot near that edge.
- [x] **Canvas failed silently, so typos became iterations** — an invalid `fillStyle` is a no-op that paints in the previous colour, and NaN geometry draws nothing; neither throws nor fails a test, and the visual baselines record the wrong picture as the new truth. Added `tests/draw-integrity.spec.js`, which wraps `CanvasRenderingContext2D.prototype` and fails on invalid paint state or non-finite geometry across every room (first-visit and solved) and every cutscene stepped through 20 beats. It carries a self-test that plants a bad colour, and it found a real pre-existing bug on its first run: `dustMotes` in `dragon_cave` was called with misordered arguments, so a string landed in a numeric slot and its motes had never drawn at all.
