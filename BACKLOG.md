# Crown Quest — Game Quality and Engineering Backlog

Findings from a full-repository review (architecture, code, performance, security,
reliability, testing, maintainability, UX). Items already fixed during the review
are listed in [Completed during review](#completed-during-review) at the bottom.

Priority: **Critical** threatens completion or save integrity; **High** blocks
important play or confidence in progression; **Medium** is a meaningful quality
gap; **Low** is polish or preventative work. Structural work does not outrank
confirmed player-facing progression defects.

---

## Adventure quality audit - 2026-09-24

Review of the clean `270884b` tree. Baseline: static gate clean; 130/130
chromium functional tests pass (game, full-game, player-journey, navigation,
state-regressions, reliability); per-room frame cost 5.0-12.3 ms
(village_green slowest). No regressions were found in the items closed by the
2026-09-06 pass. The findings below come from reading the code and from
temporary Playwright probes, which were deleted afterwards. Each one either
reproduces in a probe or can be seen directly in the cited code. None of them
blocks the proven 250-point route.

### Implementation follow-up

All eleven findings are fixed, along with six of the seven inherited structural
items. The seventh, Linux visual baselines, is prepared but waits on a CI run.
Regression coverage lives in the new
[tests/audit-regressions.spec.js](tests/audit-regressions.spec.js) and in
additions to the touch, reliability, game, full-game, player-journey and
state-regression specs.

- Final gate `npm run check`: **427 passed, 61 intentionally skipped**
  (profile-specific). Static checks are clean; `check:sw` reports
  `v1.3.16 -> v1.4.0`.
- Room frame cost is 4.0-6.6 ms.
- The score contract is 270: 250 required plus 20 optional.
- Rooms now live one per file. The "Affected files" links to `js/rooms/act1.js`
  and `act2.js` below are historical: act1 became `house.js`, `scullery.js`,
  `study.js`, `spell_room.js` and `crag_path.js`; act2 became `alderhaven.js`
  and one file per Alderhaven room; act3 became `amber_tower.js`. The engine
  subsystems now live in `js/engine/`.
- New or changed baselines, all inspected: `death-overlay`,
  `death-overlay-confirm`, `victory-overlay` and `amber-tower-duel`. The three
  goat-encounter images and the painted/prop images differ only in the
  "/ 270" score HUD.

- [x] **Let every input model recover from death without discarding the adventure**

  **Resolution:** The death panel now offers real Try Again (T), Restore (F7) and Restart (R) buttons, each of which works by pointer, tap and key. Try Again replays the arrival in the current room (`_captureArrival`/`checkpoint`); Restart asks for confirmation once there is score to lose; the message bar names the same options. The victory panel has a tappable Play Again. Verified by the new touch-only test in [tests/touch.spec.js](tests/touch.spec.js) (retry, restore from a slot, confirmed restart) and the inspected `death-overlay`, `death-overlay-confirm` and `victory-overlay` baselines.

  **Priority:** High
  **Category:** UI/UX
  **Confidence:** High
  **Player impact:** High
  **Area:** Death overlay, restart, touch controls
  **Affected files:** [js/engine.js](js/engine.js), [index.html](index.html), [tests/touch.spec.js](tests/touch.spec.js)
  **Evidence:** CONFIRMED by probe: in the mobile-chromium profile, after the dragon kills Rowan, a canvas tap leaves `dead === true`. The visible buttons are only the verbs, Objects, Hint, Tools and the d-pad; there is no Restart or Restore control. `handleCanvasActivate` returns immediately when `dead` is set, and R is the only restart path (keydown handler). The panel says "Press R to try again", but `restart()` wipes flags, inventory and score and returns to the scullery. The message bar says "Press R to restart", and neither text mentions F7/Load.
  **Problem:** On touch, a death with no save can only be undone by reloading the page, and a death with a save relies on finding Load inside Tools. On desktop, "try again" really means "lose everything since the opening". Six death triggers exist (crag, bridge, giant x2, dragon x2).
  **Impact:** One Sierra-style death can end a phone session outright. A keyboard player who takes "try again" at its word throws away all unsaved progress.
  **Recommended solution:** Make the death panel offer the classic Sierra choice through real buttons as well as keys: Restore (opens the load modal), Restart (asks to confirm if the score is above zero), and optionally Try Again from the room entrance. Accept a tap on each option. Make the panel text and the message bar agree. Give the victory panel's "Press R to play again" a tappable equivalent.
  **Sierra-design consideration:** Keep the deaths, their jokes and manual saves. Restore/Restart/Quit is the authentic Sierra death dialog. A room-entry retry is optional modernisation and should be clearly labelled.
  **Regression considerations:** Refusing to save while dead; keyboard R; restoring from an empty slot; the victory overlay; no double restart from one tap.
  **Acceptance criteria:** Using only touch, a player can restart after a death, or restore a save, on both phone orientations. Every death prompt names the options that actually exist.
  **Validation:** Add a touch.spec case: die, tap Restore, load a slot; die again, tap Restart, confirm, and arrive in the scullery with score 0.
  **Estimated effort:** Small
  **Game-design value:** High
  **Technical debt reduction:** Low

- [x] **Teach the classic parser the verbs its own puzzles invite**

  **Resolution:** The parser keeps prepositions while parsing, so GIVE/FEED X TO Y, PUT/POUR/THROW/TIE/SPRINKLE X IN/ON/TO Y, WEAR/PUT ON, FILL X WITH Y, V Y WITH X (`unlock chest with key`), CLIMB DOWN/ENTER, HIDE, SAY, CAST, SAIL and ASK X FOR Y all reach the existing handlers. Rooms answer object-less verbs through `room.verbs` and items answer item-only commands through `use`/`wear`/`fill`. Incomplete phrases ask a specific question ("Give Crust of Bread to whom?"). Verified by the 31-row phrase table and the no-echo test in [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js).

  **Priority:** High
  **Category:** Parser
  **Confidence:** High
  **Player impact:** High
  **Area:** Classic (parser) mode and the touch parser field
  **Affected files:** [js/engine.js](js/engine.js), [js/game.js](js/game.js), [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [tests/game.spec.js](tests/game.spec.js)
  **Evidence:** CONFIRMED by a probe of 70 commands, each run in the state where it should work. Parser confusion or a snark reply comes back for: `give bread to goat`, `feed goat`, `tie rope to well`, `say mendharbe`, `wear ring`, `put on ring`, `fill pail`, `hide behind boulder`, `free/untie/release hare`, `put feather in circle`, `cast spell`, `throw/pour water on fire`, `put chest in socket`, `sail` and `lift hourglass`. `climb down well`, `go down well` and `enter well` reply "You'll have to steer your feet yourself", because the well is not an exit. `unlock chest with key` replies "It is locked. You will have to use the brass key on it.": `normalizeParserText` strips WITH, so the instrument is lost. `get key` in the study answers with hourglass snark. `ask raven for feather` talks to the feather. `use thimble on boat` says "You don't see that here". The equivalent `use X on Y` forms all work.
  **Problem:** The vocabulary covers look/get/use/talk/walk plus jokes. The game's solutions are giving, wearing, speaking a name, filling, hiding, freeing and tying, and players type exactly those verbs. The previous review noted the gap but did not backlog it.
  **Impact:** Classic mode is a headline feature. There, the most natural phrasing of eight of the game's puzzles is refused, sometimes with a reply that restates the command the player just typed. This is guess-the-verb friction the puzzles themselves do not deserve.
  **Recommended solution:** Map GIVE/FEED/OFFER/SHOW X TO Y, PUT/PLACE/DROP/INSERT/THROW/POUR X IN/ON/INTO Y, and WEAR/PUT ON onto the existing `useItem` dispatch. Accept WITH as an instrument separator (`unlock chest with key`, `fill pail with water`). Treat CLIMB DOWN/ENTER on a non-exit hotspot as USE of that hotspot. Add a SAY/SPEAK verb routed to an optional `say` hotspot handler or content hook (see the gnome item below). Add nouns for things found under or behind objects (`key`, `boat`, `water`) through `parserSynonyms` or hotspot names. Keep new aliases in the content layer where they name game nouns.
  **Sierra-design consideration:** A parser is supposed to accept the player's own wording. Keep the jokes and the terse classic replies. The fix must widen phrasing only and never hint at or bypass a puzzle.
  **Regression considerations:** Existing `use X on Y` routes, the player-journey command list, snark for genuinely wrong items, `again`, and the architecture test that keeps content IDs out of the engine.
  **Acceptance criteria:** Every command listed under Evidence either performs the intended action or gives a specific, truthful refusal. No reply tells the player to do exactly what they just typed.
  **Validation:** A table-driven parser spec with one row per phrasing: set up the state, run the command, assert the resulting flag or inventory change. Then rerun player-journey.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** Medium

- [x] **Stop important narration from being silently replaced in the single text window**

  **Resolution:** `showMessage(..., { priority: true })` marks warnings and signposts. Later messages, and their screen-reader announcements, queue behind a priority window. `queueMessage` shows a consequence after the current line, and a window opened by a dialogue action now survives the end of the dialogue. The crag and cloud warnings and the three-treasure signpost use these. Verified by the room-entry (classic, enhanced, live region) and chest-last tests in [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js).

  **Priority:** Medium
  **Category:** UI/UX
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Text window, room entry, dialogue end, screen-reader announcements
  **Affected files:** [js/engine.js](js/engine.js), [js/game.js](js/game.js), [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js)
  **Evidence:** CONFIRMED by probe, three cases. (1) In classic mode, the first crag warning ("you hear a stick strike stone... closer") is replaced by the room description, because `goToRoom` calls `showMessage(room.description)` after `onEnter` and classic mode opens a window for every message. The same happens to the cloud hall's "Fennow's ring is in your pocket" reminder. (2) In both modes, the `aria-live` region ends on the room description, so screen-reader users never hear either warning. (3) If the Chest of Cormac is the last treasure collected, the window announcing that the tower has begun to shine is opened inside the gnome's dialogue action and then cleared by `_advanceDialog`'s `pendingEnd` branch (`textWindow = null`). Afterwards `windowAfterDialog` is null and the text survives only in the enhanced-mode message bar.
  **Problem:** `showTextWindow` has one slot and no queue, so any later message overwrites an earlier, more important one.
  **Impact:** Classic players lose the fair warning before the crag death, and screen-reader players lose it in both modes. Anyone who collects the chest last misses the only in-world pointer to Act III, leaving the hint system as the only signpost.
  **Recommended solution:** Queue window messages, or mark messages raised during `onEnter` or a dialogue action as priority so the description goes to the message bar only. Also let `pendingEnd` keep a window opened by the action. Order live-region announcements so the warning is announced last.
  **Sierra-design consideration:** Keep the terse classic cadence. The fix is about ordering, not about adding text.
  **Regression considerations:** Room-transition message rhythm, the dialogue text/options cadence, blocking sequences that expect a single window, and the existing crag timer and pause behaviour.
  **Acceptance criteria:** In both modes, the crag warning and the cloud reminder are the text the player (and the live region) receives on first entry. Collecting the chest last still shows the treasure window after the dialogue closes.
  **Validation:** Probe-style tests for classic and enhanced crag entry, cloud entry with the ring, and the gnome bargain with the shield and mirror already held.
  **Estimated effort:** Small
  **Game-design value:** Medium
  **Technical debt reduction:** Medium

- [x] **Make the player speak the gnome's name instead of picking it from a menu**

  **Resolution:** The menu offers "I know your name.", which opens a typed prompt (`promptText`) in both interfaces and on touch; classic players can also type SAY MENDHARBE. Wrong guesses get varied replies, and saying the parchment's literal EBRAHDNEM nudges toward reading it backwards. Verified by the menu, prompt and guess tests in [tests/game.spec.js](tests/game.spec.js) and [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js), plus both full-route specs.

  **Priority:** Medium
  **Category:** Puzzle
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Mendharbe's bargain
  **Affected files:** [js/game.js](js/game.js), [js/rooms/act2.js](js/rooms/act2.js), [js/content.js](js/content.js)
  **Evidence:** CONFIRMED by probe: holding the parchment is enough for the gnome's menu to list "4. Your name is Mendharbe." The parchment never has to be read, and the backwards word never has to be reversed. The parser has no SAY verb (see the parser item). The gnome's own line, "Guess all you like", can't be acted on.
  **Problem:** The UI performs the puzzle's only inference, so the KQ1 name-guessing homage has no player step.
  **Impact:** The first treasure — 25 points, and the game's most iconic homage — comes free once the parchment is picked up.
  **Recommended solution:** Replace the literal option with "I know your name." That option should prompt for the name through the existing parser/touch input, or tell the player to SAY it. Accept `say mendharbe` (tolerating a missing "the") and answer wrong guesses with jokes; the existing Rumpelstiltskin joke can be one. Hattie's clue and the parchment stay as they are, so the puzzle remains fair: read the word backwards.
  **Sierra-design consideration:** This restores the original design intent. Don't make it harder than a single reversal, and never punish wrong guesses.
  **Regression considerations:** The touch parser field must be reachable from the dialogue; the award must stay single (`nameTheGnome`); the after_bargain topic; player-journey and full-game routes need updating.
  **Acceptance criteria:** The chest cannot be won without the player entering the reversed word. Touch, keyboard and pointer players can all enter it. Wrong answers get varied, non-punishing replies.
  **Validation:** Parser and touch tests for right, wrong and not-yet-found answers; full 250-point journey.
  **Estimated effort:** Small
  **Game-design value:** High
  **Technical debt reduction:** Low

- [x] **Give the player the mirror's payoff in the duel**

  **Resolution:** The duel cutscene now stops after the shield breaks, on its own caption "You have nothing left but a mirror". Morvane stands on the shore path gathering the second stroke, with a warning at 6 s and a death at 14 s. USE MIRROR, from the item alone or aimed at any tower hotspot or at Morvane, plays the reflection and awards `duel`. The pause is a death-recovery checkpoint and can be saved and restored. Verified by the wait, death, retry and save tests in [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js), the updated socket-order and reunion tests, and the inspected `amber-tower-duel` baseline.

  **Priority:** Medium
  **Category:** Puzzle
  **Confidence:** Medium
  **Player impact:** Medium
  **Area:** Amber Tower finale
  **Affected files:** [js/rooms/act3.js](js/rooms/act3.js), [js/cutscenes.js](js/cutscenes.js), [js/content.js](js/content.js)
  **Evidence:** CONFIRMED in code: `beginTheEnd` runs setting the third treasure, Morvane's monologue, `cutsceneMorvaneDuel`, the `duel` award, the reunion and the coronation as one uninterrupted sequence. Hattie's tale, the continuity rules ("the mirror returns hostile magic") and the mirror's description all set up an action the player never takes. The previous review noted the climax is "mostly automatic".
  **Problem:** The player's last act is placing a treasure in a socket. The villain is defeated without any player input.
  **Impact:** The ending lands with less force than the puzzles before it, and a clearly planted setup gets no payoff.
  **Recommended solution:** Pause after "He raises one white hand and the air goes hard." and wait for a single action: USE MIRROR (on Morvane, or anywhere) reflects the curse and plays the duel cutscene. Any other action, or a long delay, triggers a death with Sierra humour, then a retry from the start of the pause. Move the `duel` award onto this action.
  **Sierra-design consideration:** KQ-style finales hinge on one final item use. Failing must never cost progress; there must be no dead end after the ward opens.
  **Regression considerations:** Save refusal during the ending, skipping the sequence with Escape, the six socket orders, the score contract, and the parser, pointer and touch paths for the mirror.
  **Acceptance criteria:** Victory needs one intentional mirror use. Failing or skipping can never strand the game, and total points stay 250.
  **Validation:** Full-game and player-journey routes; a test of failure followed by a retry; saves refused during the pause.
  **Estimated effort:** Medium
  **Game-design value:** High
  **Technical debt reduction:** Low

- [x] **Give the score something to reward beyond finishing**

  **Resolution:** Seven guarded optional awards (20 points) now sit on existing interactions: reading the ledger, asking Corvus "Who am I?", Hattie's tower tale, greeting the villager, Grumbold's goat story, Fennow on the dragon, and calling to the tower window. `maxScore` is 270 and there are three ranks: Steadfast (the 250-point minimal route), Listener (260+) and Unbroken (270). full-game earns all 270 unclamped; player-journey wins the minimal route at 250.

  **Priority:** Medium
  **Category:** Score
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Award table, victory ranks
  **Affected files:** [js/content.js](js/content.js), [js/rooms](js/rooms), [tests/full-game.spec.js](tests/full-game.spec.js)
  **Evidence:** CONFIRMED in code: all 21 entries in `rules.awards`, 250 points in total, sit on the single required route (every one is a prerequisite for victory), and `victory.ranks` holds one rank with `min: 0`. Every finished game therefore ends on 250/250 with the same title.
  **Problem:** The score works purely as a progress bar. Nothing rewards exploration, kindness beyond the hare, or cleverness. That is the job Sierra scoring does, and the previous review already noted lower ranks need optional points.
  **Impact:** Players have no reason to experiment, and the rank screen carries no information.
  **Recommended solution:** Add about 5-8 guarded optional awards to interactions that already exist and have personality, for example: asking Corvus every question, reading the ledger's list of years, sparing the wish-coins, or greeting the villager. Raise `maxScore` to match, and reintroduce two or three ranks with thresholds that can each be reached by a real route.
  **Sierra-design consideration:** Keep optional points modest and never required. No points for deaths, and none that can be farmed.
  **Regression considerations:** The unclamped-sum contract test, persistent `award_*` guards, existing saves (they store a raw score, so `maxScore` clamping and the rank thresholds must still hold for them), and status-bar text.
  **Acceptance criteria:** The minimum route and the full route produce different scores and ranks, and the unclamped sum equals `maxScore`.
  **Validation:** Update full-game to earn every award; add a test that the minimal route wins below the maximum.
  **Estimated effort:** Medium
  **Game-design value:** Medium
  **Technical debt reduction:** Low

- [x] **Stop precaching 19.7 MB of opt-in trial art for every player**

  **Resolution:** The trial PNGs have been removed from `ASSETS`. The service worker caches them on first use in `crownquest-art-trials`, a cache that survives version bumps. The contributor guide now describes the opt-in trial assets. Painted-* suites pass (the images still load on request); `npm run check:sw` passes at `v1.4.0`.

  **Priority:** Medium
  **Category:** Performance
  **Confidence:** High
  **Player impact:** Medium
  **Area:** Service worker, painted-art trials
  **Affected files:** [serviceworker.js](serviceworker.js), [js/rooms/act1.js](js/rooms/act1.js), [js/cutscenes.js](js/cutscenes.js), [js/icons.js](js/icons.js), [js/actors.js](js/actors.js), [.github/copilot-instructions.md](.github/copilot-instructions.md)
  **Evidence:** CONFIRMED: `ASSETS` precaches 15 `icons/*-trial.png` files, 19,717,086 bytes in total. The code only loads them under `?scenery=painted`, `?props=painted` or `?actors=painted`. `VERSION` is bumped on every code change, so each deploy creates a new cache and downloads them again. The contributor guide still says "no sprite sheets or image assets exist anywhere in this project".
  **Problem:** Default players, who see procedural art, pay the full download and storage cost of an experiment they never see.
  **Impact:** Metered mobile players download about 20 MB on first visit and after every update. Installation is slower, and an install can fail on a flaky connection. The documentation also misleads contributors about the asset model.
  **Recommended solution:** Drop the trial PNGs from `ASSETS` and cache them at runtime only when a painted mode is requested, or move the trials to a separate build. Update the guide's asset rule to describe the opt-in trial assets.
  **Sierra-design consideration:** None; the default art is unchanged.
  **Regression considerations:** Painted-mode test suites (painted-*.spec.js), offline play of default mode, and the service-worker version guard.
  **Acceptance criteria:** A default first visit precaches no `*-trial.png`, and painted mode still renders when online.
  **Validation:** Inspect the Cache Storage contents after install in default and painted modes; run the painted-* suites and `npm run check:sw`.
  **Estimated effort:** Small
  **Game-design value:** Low
  **Technical debt reduction:** Medium

- [x] **Make the following goat a character you can look at**

  **Resolution:** `goatHotspot` ("your goat") sits in each room's hotspot list at the goat's drawn position, with LOOK/TALK/GET/USE text that changes after the troll. Verified in all four rooms by [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js).

  **Priority:** Low
  **Category:** Interaction
  **Confidence:** High
  **Player impact:** Low
  **Area:** Goat in harbour_road, village_green, dark_wood, troll_bridge
  **Affected files:** [js/rooms/act2.js](js/rooms/act2.js)
  **Evidence:** CONFIRMED by probe: with `goat_follows`, `look goat` in the dark wood returns "You don't see any goat here", and clicking the drawn goat hits no hotspot. `followingGoat` only adds a draw layer, and the village goat hotspot is hidden once it follows.
  **Problem:** A visible companion, the hero of the bridge scene, can't be looked at, talked to or fed.
  **Impact:** A small immersion break, and a missed chance for the post-troll jokes the goat has earned.
  **Recommended solution:** Have `followingGoat` also register a goat hotspot at its drawn position, with state-aware LOOK, TALK and USE text before and after the troll.
  **Sierra-design consideration:** Pure flavour; don't turn it into a puzzle.
  **Regression considerations:** Hotspot ordering (last-to-first), bridge crossing clicks near the goat, and the navigation specs.
  **Acceptance criteria:** In every room where it is drawn, the goat answers LOOK and TALK in both interfaces.
  **Validation:** Parser and click checks in the four rooms before and after `troll_routed`.
  **Estimated effort:** Small
  **Game-design value:** Medium
  **Technical debt reduction:** Low

- [x] **Keep room hints from prescribing completed steps**

  **Resolution:** Scullery and well hints now check `circle_salt` and `dragon_doused`. The well hint also tells the player to read the name backwards and say it. Verified by the hint test in [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js).

  **Priority:** Low
  **Category:** Interaction
  **Confidence:** High
  **Player impact:** Low
  **Area:** Scullery and well hints
  **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js)
  **Evidence:** CONFIRMED by probe: after the salt has gone into the circle and the thimble is made, the scullery hint still says "There is a crock of coarse sea salt... Take a pinch." After the dragon is doused, the well hint still says "Fill your pail here. Water is going to matter later." Both test inventory rather than progress (`hasItem('sea_salt')`, `pail_full`).
  **Problem:** This is the same class of issue the earlier rope-hint fix addressed, in two more rooms.
  **Impact:** A player who asks for help is sent to repeat finished work.
  **Recommended solution:** Test `circle_salt`/`thimble` and `dragon_doused` before the inventory checks.
  **Sierra-design consideration:** Hints stay optional and unscored.
  **Regression considerations:** First-visit hint order.
  **Acceptance criteria:** No room hint prescribes a completed step.
  **Validation:** Extend the hint assertions in the state-regression specs.
  **Estimated effort:** Small
  **Game-design value:** Low
  **Technical debt reduction:** Low

- [x] **Make gift conversations say and do what they mean**

  **Resolution:** Fennow now offers the ring in his greeting until he has given it, and Rowan answers "I would be glad of it." Asking Corvus for the feather hands it over through the same `RULES.takeFeather` as the perch, which awards it once. Verified in [tests/audit-regressions.spec.js](tests/audit-regressions.spec.js) and the restore/restart gift regression.

  **Priority:** Low
  **Category:** Dialogue
  **Confidence:** High
  **Player impact:** Low
  **Area:** Fennow and Corvus dialogue
  **Affected files:** [js/game.js](js/game.js)
  **Evidence:** CONFIRMED in code and by probe: Fennow's first menu offers "Take this ring, then. (accept his gift)" before any ring has been mentioned, and the line reads as if Rowan were handing over a ring. The previous review noted this as polish. Asking Corvus "May I have that feather?" gets "Take it." but grants nothing (probe: `hasFeather: false`), while the study hint says "he will let you have it if you ask".
  **Problem:** The option text and the resulting state don't match what the player chose.
  **Impact:** Brief confusion. Players may believe they already hold the feather.
  **Recommended solution:** Have Fennow offer the ring in his greeting or reply first, then let Rowan accept it in his own voice. Have Corvus's answer grant the feather through the same code as the perch hotspot, or reword it and the hint so that picking it up is clearly still needed.
  **Sierra-design consideration:** Keep Corvus's dry reply and Fennow's quiet generosity.
  **Regression considerations:** Once-only choices and their persistence across save/restore, the single `raven_feather` award, and the `featherCollected` visibility.
  **Acceptance criteria:** Each gift option says what the player means, and its outcome matches its text.
  **Validation:** Dialogue tests for both gifts, including save/restore.
  **Estimated effort:** Small
  **Game-design value:** Low
  **Technical debt reduction:** Low

- [x] **Match the doused-dragon narration to its art**

  **Resolution:** The dousing line now describes the dragon sinking back beside the steaming pit, wings drooping and head low, as the doused baseline shows it.

  **Priority:** Low
  **Category:** Narrative
  **Confidence:** High
  **Player impact:** Low
  **Area:** Dragon cave
  **Affected files:** [js/rooms/act2.js](js/rooms/act2.js)
  **Evidence:** CONFIRMED: the dousing sequence says the dragon "backs against the far wall with its wings clamped flat". The `dragon-cave-doused` baseline shows it still lying beside the pit, head low and wings drooped, exactly where it was before (the art direction chosen in an earlier pass).
  **Problem:** Text and picture describe different outcomes.
  **Impact:** A small continuity break at a key puzzle payoff.
  **Recommended solution:** Rewrite the line to match the slumped, appalled dragon on the picture. This is cheaper, and keeps the chosen art.
  **Sierra-design consideration:** Keep the joke that it is "far too busy being upset".
  **Regression considerations:** Classic rewrites, skipped sequence.
  **Acceptance criteria:** The narration describes the pose that is on screen.
  **Validation:** Read through the sequence against the baseline image.
  **Estimated effort:** Small
  **Game-design value:** Low
  **Technical debt reduction:** Low

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

- [x] **Split the oversized engine into focused modules**
  - **Resolution:** `js/engine.js` (901 lines) keeps state, room entry, inventory, flags, the loop and crash handling. `GameEngine.extend()` installs `js/engine/{input,parser,narration,scenes,world,render,player,saveload,npc}.js`, and every method moved verbatim. The routing tables in README and the contributor guide name the modules. The functional and visual suites pass unchanged.
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

- [x] **Enforce the file-size ceiling automatically**
  - **Resolution:** [tools/check_modules.js](tools/check_modules.js) syntax-checks every shipped script. It fails any `js/` file over 1,500 lines and lists files over 800. Its allow-list is empty and the tool rejects stale entries. It replaces the `node -c` chain in `check:static`.
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

- [x] **Split the act files into one file per room**
  - **Resolution:** The twelve rooms each live in `js/rooms/<room_id>.js`. Shared helpers moved to `js/rooms/house.js` (interior shell) and `js/rooms/alderhaven.js` (goat, sky, bridge geometry) under `CrownQuest.shared`. [tools/modules.js](tools/modules.js) is the single load-order list; validate_content checks index.html order, the service worker, and unlisted files on disk. The architecture test now expects 12 room modules.
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

- [x] **Extend static-layer caching to the remaining scenes**
  - **Resolution:** Static scenery in village_green, troll_bridge, dragon_cave, harbour_road, amber_tower, spell_room and study is now cached, with flag state encoded in the keys (for example `rope_tied`, `cart_rope`, `doused`). Measured 4.1-6.8 ms per room, all under 8 ms. Every room baseline passes within its existing tolerance; the only rewritten room images differ in the "/ 270" score HUD.
  - **Priority:** Low
  - **Category:** Performance
  - **Confidence:** High
  - **Player impact:** Low
  - **Area:** Rooms
  - **Affected files:** [js/rooms/act1.js](js/rooms/act1.js), [js/rooms/act2.js](js/rooms/act2.js), [js/rooms/act3.js](js/rooms/act3.js)
  - **Evidence:** CONFIRMED remaining uncached scenery in room draw functions. 2026-09-24 desktop measurement: 5.0-12.3ms/frame (village_green 12.3, troll_bridge 10.8, dragon_cave 10.3, spell_room 10.1), all under the 16ms budget; seven rooms are at or above this item's 8ms target. Mobile power/frame cost was not measured.
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

- [x] **Confirm or delete `AGI_ENGINE_TECHNICAL_REFERENCE.md`**
  - **Resolution:** The first lines now state that it is historical background reading about Sierra's interpreter and binds nothing in this repository.
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
  - **Status (2026-09-24):** Partly done, and blocked on a Linux runner. The `visual` job in [.github/workflows/quality.yml](.github/workflows/quality.yml) runs the suite inside the pinned `mcr.microsoft.com/playwright:v1.61.1-noble` image. It records `*-chromium-linux.png` baselines as an artefact when dispatched with `record`, and compares against them on every push and pull request once they are committed. No Docker or WSL is available on this machine, so the Linux set has not been recorded and the job has not been seen to fail on a planted diff; the acceptance criteria stay open.
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

- [x] **Give the crash screen a recovery action**
  - **Resolution:** The crash panel names the newest save slot. R, Enter or a tap stores the choice in sessionStorage and reloads, and `start()` restores that slot. With no save it reloads to the title. Verified by the new reload-and-restore test in [tests/reliability.spec.js](tests/reliability.spec.js).
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
