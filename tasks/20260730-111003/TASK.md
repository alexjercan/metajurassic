# Give the game-over modal a vertical escape hatch on short viewports

- STATUS: OPEN
- PRIORITY: 62
- TAGS: bug,ui,mobile

## Story

As a player who finishes a round with the phone held sideways, I want to be able
to reach the game-over buttons, so that the round does not end in a dead screen.

## Problem

The modal has no vertical escape hatch. `.modal-overlay` is `position: fixed`
with no scrolling, and `.modal` has no `max-height`, so a modal taller than the
viewport is simply cut off at both ends and its actions are unreachable.

Measured at 568x320 (iPhone SE landscape): the modal is ~331px tall and
overflows by 5.6px top and bottom. This is PRE-EXISTING - identical on master
and on the branch for `20260729-141428` - and was found by that task's round-1
reviewer while checking a horizontal fix, which is why it is a task of its own
rather than a finding there.

## Why it matters now

`20260729-101838` adds a stats card and a countdown to this same modal, which
makes it taller. Whatever margin exists at short heights today goes away with
that work, so the escape hatch belongs with or before it.

## Steps

- [ ] Reproduce first: an E2E case at a landscape phone size (568x320) that
      fails on the current code because a `.modal-actions` control is outside
      the viewport vertically. `expectModalFitsViewport` in `e2e/helpers.ts`
      already makes exactly this assertion - the case is a new entry, not a new
      helper.
- [ ] Decide the mechanism and record it: `max-height` plus `overflow-y: auto`
      on `.modal`, or scrolling on `.modal-overlay`. Note that a scrollable
      modal makes "inside the viewport" insufficient on its own - a control
      scrolled out of view still reports a rect inside the viewport, so the
      check needs the treatment `expectFullyVisibleWithin` already applies to
      `#arena` (it is blind to intermediate scroll containers otherwise).
- [ ] Check the sizes that stress it, not just the one reported (LESSONS.md:
      `a-layout-assertion-at-one-viewport-is-a-sample-of-one`), and read the
      rendered screens, not only the geometry.

## Definition of Done

- Every game-over action is reachable at 568x320. (test: `e2e/mobile.spec.ts`)
- The new case fails on this commit's parent. (cmd: revert the CSS, re-run it)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Found by the out-of-context reviewer of `20260729-141428` (see that task's
  `REVIEW.md`, Round 1, the prose note after the findings).
