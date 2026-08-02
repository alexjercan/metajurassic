# Decision: Stop the info panel auto-opening on a mid-game reload

- DATE: 20260802-105825
- STATUS: ACCEPTED
- TASK: 20260729-125313
- TAGS: bug, ui, ux, mobile, no-op

## Context

The bug this task was filed for no longer reproduces. `20260729-141414` fixed it
as a side effect while solving the after-a-guess case, and the fix is already
pinned by a passing test. No code change lands under this task.

The task was written against a `renderLastGuess` that ended in an unconditional
`openPanel()`. Its mechanism was correct at the time: `manuallyClosedPanel` is
module-level, so it resets on every page load, and a restored game with a
`state.lastGuessId` reached that tail open during the first `updateUI()` from
`initGame`. On a phone `.info-panel` is `width: 100%` over `#arena`, so the tree
was hidden on arrival.

`20260729-141414` replaced the tail open with `if (!manuallyClosedPanel &&
!isNarrowViewport())` (`src/ui/panel.ts:137`). That condition is indifferent to
what TRIGGERED the render, so it suppresses the load-triggered open on a phone
for the same reason it suppresses the guess-triggered one. The task's Step 1 -
distinguish "render triggered by page load" from "render triggered by a fresh
guess" - asks for a distinction the shipped code no longer needs to make.

Measured 2026-08-02, a daily round with one guess then `page.reload()`:

- Pixel 5 (393px): `#info-panel` has no `active` class, `#tree-container`
  visible, `expectTreeNotOccludedByPanel` passes. This is
  `e2e/mobile.spec.ts:193`, "the tree stays visible after a mid-game reload",
  green on master today.
- Desktop Chrome: `#info-panel` is `info-panel active`. Measured with a scratch
  probe spec, not retained.

The Definition of Done names the phone viewport and asks for the tree to be
visible with the panel closed. That is the green mobile test above.

## Decision

Close the task as already fixed. Ship no code and add no test.

The desktop residue is behaviour, not a defect, and is deliberately left alone.
On desktop the panel sits BESIDE the tree rather than over it - the viewport
difference `20260729-141414` recorded - so the reload open costs the player
nothing they can see, and no playtest reported it. Changing it would alter
desktop behaviour on no evidence.

No test lands because `e2e/mobile.spec.ts:193` already covers the DoD's first
clause and `e2e/panel.spec.ts` covers the second (auto-open after a guess, and
on a hint purchase). A second reload test asserting the same phone invariant
would be a duplicate pin on one line of `src/ui/panel.ts`.

## Alternatives considered

- **Suppress the load-triggered open on every viewport.** Needs the Step 1
  contract change to `renderLastGuess` and alters desktop for no observed
  benefit. Rejected.
- **Persist `manuallyClosedPanel` to localStorage** (the task's Step 2).
  Rejected HERE, not rejected outright: it is a real, still-live gap - a desktop
  player who closes the panel by hand gets it back after a reload. It is a
  separate product question about how long a dismissal lasts, not the occlusion
  bug filed here, and it is desktop-only because nothing auto-opens on a phone.
  If wanted, it needs its own task and its own decision about session-vs-
  permanent scope.

## Consequences

- The task is DROPPED with `--superseded-by 20260729-141414` rather than DONE:
  `tatr` has no PLANNING -> DONE path, and no work was performed to review.
- The manual-close preference still resets on every page load. Anyone hitting
  that on desktop should open a new task rather than reopen this one.
- `src/ui/panel.ts:137` now carries a second, unstated responsibility: it is the
  only thing suppressing the reload auto-open. Its existing comment cites
  `20260729-141414` and the after-a-guess reason. A reader narrowing that
  condition to "after a guess only" would silently reintroduce this bug. The
  guard against that is `e2e/mobile.spec.ts:193`, whose comment already names
  this task as the owner of the general reload case.
