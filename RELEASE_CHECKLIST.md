# Crown Quest Release Sign-Off

Status: polished release candidate, not yet signed off for general release.
This checklist separates automated evidence from testing that requires people
and physical hardware. No blind playtest or listening session has been completed
as part of the automated polish pass.

## Implemented and Checked

- [x] Goat charge, troll fall, river splash and return use the shared character
  art. Normal completion and Escape retain correct progression and one reward.
- [x] Fennow remains available after the ring gift for unasked clues; solved
  bridge and parchment descriptions agree with the visible state.
- [x] All 13 item icons plus the filled pail, and all nine portraits in neutral
  and expressive states, have inspected snapshots. The giant's face is centered.
- [x] Touch-only pickup, inventory selection, held d-pad movement/release,
  second-room entry and save/restore pass at 393x851 and 851x393. Classic parser
  submission uses browser text insertion, not a hardware keyboard helper.
- [x] Touch tools wrap without clipping; d-pad controls remain available in
  landscape. Short viewports scroll vertically to reach the controls.
- [x] Offline audio rendering covers 27 cues, eight ambient loops, the bridge
  mix and mute: finite samples, non-silent unmuted output and peak below 0.95.
  This is signal validation, not a judgement of musical quality or device volume.
- [x] Accessibility scanning uses real inventory items, not obsolete fixture IDs.

## Blind Playtest

Recruit at least three people who have not read the source, walkthrough or
spoiler sections of the quality review. Include an experienced Sierra player,
a less experienced adventure player and a touch-only player. Give them only the
game URL and its normal in-game controls. Obtain consent before recording.

1. Start a fresh game. Let the participant choose an interface. Do not explain
   puzzle solutions or narrate expected actions.
2. Record each room reached, useful clue noticed, attempted solution, hint used,
   death, restore, and period of confusion longer than five minutes. Ask what
   they believe their current goal is without giving the answer.
3. Use the built-in hints first when help is requested. Record every external
   intervention and its reason; a walkthrough-assisted finish is not an
   unassisted completion.
4. Ask the participant to save, close/reopen the game and resume. Observe whether
   the slot and restored world match their expectations.
5. At completion or abandonment, ask which puzzles felt fair, which clues were
   missed, whether the story relationships made sense, and whether major
   animation beats communicated the action. Record duration rather than guessing
   a marketed playtime.
6. Turn observations into reproducible backlog entries. Correct completion
   blockers first, then repeat affected sections with a fresh participant.

Release acceptance: every intended solution is discoverable from game clues;
no participant is stranded by a lost item, unavailable conversation or restore;
no developer-only intervention is required. Deaths may remain where their warning
and recovery are understood. Repeated confusion at the same clue needs a design
decision, not dismissal as player error.

| Participant | Device / browser | Mode | Duration | Hints / interventions | Result / blockers |
|---|---|---|---|---|---|
| Pending | | | | | |
| Pending | | | | | |
| Pending | | | | | |

## Physical Devices and Listening

- [ ] Android Chrome and iOS Safari: portrait, landscape, rotation mid-play,
  software-keyboard open/close, command Send, inventory scroll, long-press release,
  text dismissal, save/load, death recovery and background/resume.
- [ ] Desktop Chrome/Edge plus Firefox and Safari where supported: keyboard,
  pointer, text legibility, audio activation, save/restore and full ending.
- [ ] Listen on headphones and phone speakers at normal volume: title, every
  room ambience, acquisition/score, sailing, goat encounter, dragon, death, duel
  and coronation. Check intelligibility, relative loudness, harshness, unwanted
  clicks, overlapping cues, mute/unmute and resumed-tab behavior.
- [ ] Confirm essential feedback remains clear while muted or audio is blocked.
- [ ] Test the deployment's service-worker upgrade from the previous version,
  offline reopen and retention of existing saves on the actual hosting origin.
- [ ] If WebXR is advertised for release, test on a supported headset. Otherwise
  label it experimental rather than implying certified headset support.

| Gate | Tester | Device / build | Date | Evidence | Approved |
|---|---|---|---|---|---|
| Blind playtest | Pending | | | | No |
| Physical mobile | Pending | | | | No |
| Listening | Pending | | | | No |
| Hosting / offline update | Pending | | | | No |

## Automated Release Gate

Latest local candidate result: `npm run check` passed **342 tests**, with **58
intentional profile skips**. Static checks are clean; all 12 room render costs
were 3.4-11.5 ms against a 16 ms target. All 41 visual baselines pass, including
inspected new/changed PNGs. The cache-version check passes against local `HEAD`
for `v1.3.1`; its default `origin/main` comparison skips because the file is absent
there. This evidence does not check off the human sign-off rows above.

Run `npm run check` on the candidate tree. Run `npm run test:visual:update` only
for intentional visual changes and inspect every changed PNG before acceptance.
The Windows baselines do not certify other operating systems. Use
`node tools/check_sw_version.js HEAD` when the default comparison ref lacks the
service-worker file; for a shipped update, compare against the actual previous
release instead. Keep the independent open engineering work in
[BACKLOG.md](BACKLOG.md) visible; a green suite does not replace the gates above.