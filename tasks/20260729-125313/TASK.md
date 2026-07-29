# Stop the info panel auto-opening on a mid-game reload

- STATUS: OPEN
- PRIORITY: 60
- TAGS: bug,ui,ux,mobile

## Story

As a returning player reloading a game in progress on my phone, I want to see
the tree and the input first, so that the info panel is not covering the game
surface before I have done anything in this session.

## Context

Found in review round 1 of `20260729-092315`, which fixed the same shape of bug
for the FIRST load (no guess yet) and deliberately scoped this case out - see
`tasks/20260729-092315/DECISION.md`, "Two paths this deliberately does NOT
change".

The mechanism: `manuallyClosedPanel` in `src/ui/panel.ts` is module-level, so it
resets to `false` on every page load. A restored game with a `state.lastGuessId`
therefore reaches the tail `openPanel()` in `renderLastGuess` during the very
first `updateUI()` call from `initGame`. On a phone `.info-panel` is `width:
100%` and overlays `#arena` exactly, so the tree is hidden on load exactly as it
was before 20260729-092315 - just for a returning player instead of a new one.

## Steps

- [ ] Decide how "render triggered by page load" is distinguished from "render
      triggered by a fresh guess" - this changes `renderLastGuess`'s contract,
      so weigh an explicit parameter against having `initGame` suppress the open
      on its first `updateUI()`, and record the choice in `DECISION.md`.
- [ ] Consider whether the manual-close preference should persist across loads
      (localStorage) instead of resetting, and whether that is a better fix.
- [ ] Implement the chosen behavior without disturbing the post-guess auto-open
      or the hint-purchase open (both pinned by `e2e/panel.spec.ts`).
- [ ] Add an E2E test that seeds a mid-game state into localStorage (see
      `e2e/helpers.ts` `seedFinishedDailyGame` for the pattern) and asserts the
      panel is closed after the reload.

## Definition of Done

- Reloading a game that already has a guess leaves the info panel closed on a
  phone viewport, with the tree visible. (test: browser E2E mid-game reload test)
- The panel still auto-opens after a fresh guess and on a hint purchase.
  (test: `e2e/panel.spec.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)
