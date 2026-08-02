# Stop the info panel auto-opening on a mid-game reload

- STATUS: CLOSED
- PRIORITY: 60
- TAGS: bug, ui, ux, mobile
- KIND: TASK
- FLOW STEP: DROPPED
- PLAN STATUS: DRAFT

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

- [x] Decide how "render triggered by page load" is distinguished from "render
      triggered by a fresh guess" - resolved as NOT NEEDED: `20260729-141414`
      made the tail open conditional on `!isNarrowViewport()`, which is
      indifferent to the trigger. See `DECISION.md`.
- [x] Consider whether the manual-close preference should persist across loads
      (localStorage) instead of resetting - a real but separate desktop-only
      question, deferred to its own task. See `DECISION.md`.
- [x] Implement the chosen behavior - no code change lands; the behavior is
      already shipped.
- [x] Add an E2E test - already exists as `e2e/mobile.spec.ts:193`, "the tree
      stays visible after a mid-game reload", verified green on 2026-08-02.

## Definition of Done

- Reloading a game that already has a guess leaves the info panel closed on a
  phone viewport, with the tree visible. (test: browser E2E mid-game reload test)
- The panel still auto-opens after a fresh guess and on a hint purchase.
  (test: `e2e/panel.spec.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Resolution (2026-08-02)

Closed as already fixed, no code change. `20260729-141414` suppressed the
auto-open on narrow viewports regardless of what triggered the render, which
covers the reload. Verified green on both viewports; the desktop residue and the
localStorage question are judged out of scope. See `DECISION.md`.

## Playtest evidence (2026-07-29, from `20260729-092435`)

Confirmed still live, ON-SCREEN. A daily round with two guesses made, then
reloaded: the info panel is `active` again on arrival, on both viewports
(walkthrough scenario "returning", `07-returning-midgame-*.png`, 23 guesses
left).

On desktop this is cosmetic. On a phone the panel is full-width, so the
returning player is shown a clade card and NO tree at all - the reload throws
away the board they came back to. Worth noting when judging this task's
priority: its mobile consequence is severe, and it is the same surface as
`20260729-141414`.

## Interim note from `20260729-141414` (2026-07-29)

That task suppressed the post-guess panel auto-open on viewports at or below
768px (`tasks/20260729-141414/DECISION.md`), which changes this task's ground in
two ways.

- The phone half of this bug is already fixed. `renderLastGuess` never
  auto-opens on a narrow viewport whatever triggered the render, so a mid-game
  reload on a phone now leaves the tree visible; pinned by "the tree stays
  visible after a mid-game reload" in `e2e/mobile.spec.ts`. What remains for this
  task is the DESKTOP reload and the underlying contract change - teaching
  `renderLastGuess` to distinguish "render from page load" from "render from a
  fresh guess" - which is still unaddressed and still worth doing.
- This task's Definition of Done item "The panel still auto-opens after a fresh
  guess and on a hint purchase" is now false as written: on a narrow viewport a
  fresh guess deliberately does NOT auto-open. Narrow that item to desktop when
  this task is picked up. The hint-purchase half of the item is not a simple
  "still true" either: `src/game.ts` opens the panel by hand before the first
  guess on any viewport, and at any point on a narrow viewport, but a mid-game
  hint on DESKTOP still yields to a manual close - which is deliberate and pinned
  by "a mid-game hint does not resurrect the panel for later guesses" in
  `e2e/panel.spec.ts`. Do not "fix" that desktop case; it has a test.


## Dropped

- REASON: Already fixed: 20260729-141414 made the renderLastGuess auto-open conditional on !isNarrowViewport(), which suppresses the reload open on a phone whatever triggered the render. Verified green 2026-08-02 via e2e/mobile.spec.ts:193. Desktop residue and the localStorage manual-close question are out of scope; see DECISION.md.
- SUPERSEDED BY: 20260729-141414
