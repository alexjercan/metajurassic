# Give the game-over modal a vertical escape hatch on short viewports

- PRIORITY: 62
- TAGS: bug, ui, mobile
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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

## Measured before planning (2026-07-30)

The win and loss modals both render 331.2px tall at every landscape width
measured, and 381.2px once the action row wraps. Geometry read off the real
screens (dev server + Playwright, daily round seeded into localStorage off a
frozen clock):

| viewport | `.modal` box | `#modal-share-btn` bottom | verdict today |
|----------|--------------|---------------------------|---------------|
| 568x320 | `[-5.6, 325.6]`, h 331.2 | 296.6 (in) | box clipped 5.6px top AND bottom; buttons reachable |
| 480x320 | `[-5.6, 325.6]`, h 331.2 | 296.6 (in) | same |
| 640x360 | `[14.4, 345.6]`, h 331.2 | 316.6 (in) | fits |
| 360x320 | `[-30.6, 350.6]`, h 381.2 | 321.6 | Share **1.6px below the fold** |
| 360x300 | `[-40.6, 340.6]`, h 381.2 | 311.6 | Share **11.6px below the fold** |

In the four cases that do not fit, `.modal-overlay` reports
`overflowY: visible` with `scrollHeight > clientHeight` and `document` is not
scrollable: the overflow exists and nothing can reach it. That is the missing
escape hatch. 640x360 has no overflow to reach (scrollHeight 360, clientHeight
360), which is what makes it the control size.

**This corrects the first Step as originally written.** At the reported 568x320
no `.modal-actions` control is outside the viewport - what is cut off is the
modal's own top and bottom edge (border, padding, and under the taller modal
`20260729-101838` brings, the actions). The screenshot at 568x320 confirms it:
the red loss border is visible left and right and absent top and bottom. A
control only goes off-screen once the row wraps, which needs a narrow AND short
viewport (360x320, 360x300). Both failures are the same missing mechanism, so
the reproduction covers both sizes rather than asserting a control overflow at
568x320 that does not exist.

## Steps

- [x] Reproduce first, at both failure shapes, before any CSS changes:
      a `SHORT_VIEWPORTS` sweep in `e2e/mobile.spec.ts` covering 568x320
      (the reported iPhone SE landscape, where the BOX is clipped), 480x320,
      640x360 (fits today - the control size), 360x320 and 360x300 (where the
      wrapped row puts `#modal-share-btn` 1.6px and 11.6px below the fold).
      Watch it fail for the right reason at each, and record which assertion
      fires where.
- [x] Rework `expectModalFitsViewport`'s VERTICAL promise from "always visible"
      to "reachable", since a capped scrolling modal makes the old form
      unsatisfiable by design. Horizontal assertions stay unconditional and
      unchanged. The vertical form becomes: the `.modal` box lies inside the
      viewport (still literally true under the chosen mechanism), and every
      control in the row can be scrolled into view and is then WHOLLY in the
      viewport - `toBeInViewport({ ratio: 1 })`, the treatment
      `expectFullyVisibleWithin` already applies to `#arena`, because a rect
      comparison is blind to an intermediate scroll container. Restore
      `scrollTop` to 0 after the reachability pass so the rect measurements and
      `expectActionsOnOneRow` still read the unscrolled layout.
- [x] Apply the mechanism chosen at the plan gate (see `DECISION.md`):
      `max-height: calc(100% - 32px)` plus `overflow-y: auto` on `.modal`.
      A percentage of the fixed overlay, NOT `100vh` - a mobile dynamic toolbar
      makes `vh` lie about the height. Because the cap is a percentage it does
      not depend on the padding, so unlike `max-width` it needs no restatement
      per media block (LESSONS.md:
      `converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`);
      grep `max-height` across every media block to confirm nothing overrides
      it.
- [x] Prove the new scroll container did not silence the horizontal guards it
      sits next to. `overflow-y: auto` computes `overflow-x` to `auto` too, so
      `.modal` becomes a scroll container on BOTH axes: re-run the
      `20260729-141428` attack with each of that task's horizontal CSS fixes
      reverted one at a time and confirm the suite still goes red (LESSONS.md:
      `verify-a-guard-fix-with-the-attack-that-defeated-it`,
      `revert-each-part-of-a-fix-separately-not-the-fix-as-a-whole`,
      `a-speculative-knob-beside-a-failing-test-is-a-suspect`). CORRECTED while
      doing it: that task's OWN review established that its single reverts were
      all green and only its full parent CSS reddens the suite, so the
      discriminating attack is the combination, not N separate reverts. Run as
      such; the N-separate-reverts discipline is applied to THIS task's two
      declarations, where it does discriminate.
- [x] Read the rendered screens at every swept size, after the final layout
      state and not once mid-task (LESSONS.md:
      `re-render-and-look-after-every-layout-change-not-once-per-task`) -
      geometry cannot see a scrollbar over a rounded corner or content that
      looks truncated with no affordance.

## Definition of Done

- Every game-over action is reachable at 568x320, 480x320, 640x360, 360x320 and
  360x300, on both the win and the loss modal. (test: `e2e/mobile.spec.ts`)
- The `.modal` box lies inside the viewport at each of those sizes.
  (test: `e2e/mobile.spec.ts`)
- Each new assertion fails on this commit's parent, per size and per axis - not
  "the sweep goes red somewhere". (cmd: revert `src/style.css` from the parent
  into a scratch copy, re-run `npm run test:e2e -- mobile.spec.ts`, record which
  assertion fires at which size)
- The reachability assertion is not vacuous, on BOTH arms: at least one swept
  size needs a real scroll to satisfy it, and at least one is satisfied with a
  zero scroll delta. The short sweep supplies the first arm (the 32px inset caps
  the modal below its 331.2px content at every height under ~363px, so all five
  short sizes scroll, 640x360 by only ~3.2px); the existing `NARROW_VIEWPORTS`
  sweep supplies the second (the 331.2px modal inside a 393x500 fits the 468px cap
  with no scroll at all). (cmd: log the scroll delta per control and quote one of each)
- The horizontal guards from `20260729-141428` still fail when reverted one at a
  time, with the new scroll container in place. (cmd: N separate reverts, N
  recorded results)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Found by the out-of-context reviewer of `20260729-141428` (see that task's
  `REVIEW.md`, Round 1, the prose note after the findings).
- Deliberately NOT in scope: compacting the modal at short heights (a
  `@media (max-height: ...)` block trimming the icon and paddings so it fits
  without scrolling). It is a polish improvement on top of the escape hatch, it
  has a floor the stats card and countdown will push through, and it lands on
  `css-media-blocks-on-different-axes-are-resolved-by-file-order`. File it as
  its own task if the scrolling modal reads badly on the screens.

## Verification record

All figures below were produced against the code being committed, not recalled
from an earlier run (LESSONS.md:
`a-verification-result-expires-when-the-code-it-ran-against-changes` - the helper
was reworked twice after the first repro, so every experiment was re-run at the
end). Mutations were applied by `scratchpad/mutate.py` and undone by restoring a
scratch copy of `src/style.css`, never `git checkout`
(`revert-a-test-mutation-with-a-scratch-copy-not-git-checkout`).

### The reproduction, on master's CSS, with the FINAL helper

10 new cases (win and loss x five sizes): **8 failed, 2 passed**, and the two
that passed are the 640x360 pair - the size the old CSS satisfies. Per size and
per axis:

| size | assertion that fired |
|------|----------------------|
| 568x320 | `.modal starts 6px above the 320px viewport` |
| 480x320 | `.modal starts 6px above the 320px viewport` |
| 640x360 | (passed - the modal fits with 14.4px to spare) |
| 360x320 | `the "Share" action cannot be brought wholly on screen` |
| 360x300 | `the "Share" action cannot be brought wholly on screen` |

Two distinct failure shapes, which is why both are in the sweep: the clipped BOX
at the reported landscape size, and an unreachable CONTROL once the row wraps.

### Each part of the fix, reverted on its own

| mutation | result |
|----------|--------|
| `no-hatch` (both declarations gone) | 8 failed - the four `.modal`-clipped cases and the four unreachable-Share cases |
| `no-max-height` (keep `overflow-y: auto`) | 8 failed - identical set; without the cap there is nothing to scroll |
| `no-overflow-y` (keep `max-height`) | 4 failed - the 360x320 and 360x300 pairs, where the capped box makes the wrapped row spill outside it visibly |
| `revert-141428` (the whole horizontal fix, hatch kept) | 14 failed |

Both declarations are individually load-bearing, and they fail on DIFFERENT
subsets - the cap is what the two 320px-tall landscape sizes need, and the
overflow is what the two narrow-and-short sizes need.

### The horizontal attack, with the new scroll container in place

`overflow-y: auto` computes `overflow-x` to `auto`, so `.modal` is now a scroll
container on both axes and the concern was that it would absorb the overflow
`20260729-141428` fixed. It does not. With that task's whole parent CSS restored
and the escape hatch kept, the suite reports the same measured numbers it did
then:

```
#modal-close-btn starts 14px left of the 393px viewport
#modal-close-btn starts 31px left of the 360px viewport
#modal-close-btn starts 5px left of the 393px viewport
at 1280px the actions need 421.6px of the row's 420.0px
```

14 failed, including all three original mobile pins, both practice cases and the
desktop single-row pin. The 14px matches that task's own recorded figure exactly.

This experiment ALSO changed the fix. On the first attempt the reachability pass
ran before the rect pass, and every one of those cases reported the vague
`the "OK" action cannot be brought wholly on screen` instead - true (the scroll
container clips a too-wide row) but useless. The three passes are now ordered
horizontal rects -> reachability -> `.modal` box fit, and the precise messages
are back. It surfaced a second coupling too: `max-height` is an OUTER height only
because of the `box-sizing: border-box` beside it, and the 141428 revert takes
that out, so the cap silently became a CONTENT height and the box was clipped
5.6px again. Both facts are now in the CSS comment.

### Non-vacuity of the reachability assertion, both arms

Max scroll offset of `#modal`, read off the final layout (identical for win and
loss):

| size | scrollHeight | clientHeight | max scroll |
|------|--------------|--------------|------------|
| 568x320 | 329 | 286 | 43 |
| 480x320 | 329 | 286 | 43 |
| 640x360 | 329 | 326 | 3 |
| 360x320 | 379 | 286 | 93 |
| 360x300 | 379 | 266 | 113 |
| 393x851 | 329 | 329 | **0** |
| 393x500 | 329 | 329 | **0** |

The short sweep supplies the scrolling arm, the existing `NARROW_VIEWPORTS`
sweep the zero-scroll arm. The reachability pass is therefore asserting something
different at the two, rather than being satisfied trivially everywhere.

One subpixel finding while getting this right: Chromium snaps `scrollTop` to
whole pixels against this fractional layout, so the exact 15.188px a control
needed landed on 15 and left 0.188px of it over the clip edge -
`intersectionRatio` 0.9955 at every control and every short size. The scroll
rounds UP rather than the assertion relaxing to `ratio: 0.99`, which would have
equally passed a control clipped by a real bug (LESSONS.md:
`never-add-a-tolerance-to-silence-an-undiagnosed-failure`).

### Round 2: what the review changed

The reviewer found the reachability pass could manufacture its own pass
(`overflow: hidden` is programmatically scrollable and inert to touch and wheel),
and that the vertical axis had lost the containment half of what the old
assertion pinned. Both are fixed by ADDING assertions, and both mutations are now
rejected where they were green:

| mutation | before the review | after |
|----------|-------------------|-------|
| `overflow-y: hidden` (was not tried) | 0 failed | **10 failed**, all five sizes x both outcomes |
| `no-overflow-y` | 4 failed | **8 failed**, 568x320 and 480x320 now included |

The containment assertion was also falsified on its own, with the new
overflow guard disabled, to prove it is not merely shadowed by it: `the "OK"
action still hangs 15px below the modal's own box after scrolling it as far as it
goes` - the same 15px the reviewer measured. Full detail in `REVIEW.md`.

### The rendered screens

Captured at all five short sizes plus 393x851 and 393x500, win and loss, at both
ends of the scroll range: 26 screenshots, all read.

- The modal box now fits at every size - the border is visible on all four sides
  where before the top and bottom edges were off screen.
- Scrolled to the bottom, every action is fully visible at every size, including
  the wrapped two-row layout at 360x300.
- 640x360 looks untouched (a 3px scroll is invisible), and 393x851 / 393x500 are
  unchanged from master, as their zero max-scroll says they must be.
- **Found by looking, not by any assertion:** at 568x320 the action row is cut in
  half by the modal's bottom edge until the player scrolls, and there is no
  persistent scrollbar or other affordance. Reachable, but less legible at THAT
  size than master, where the row was fully visible and only the chrome was cut.
  The content is 331px against 320px - an 11px gap. Filed as `20260730-160720`
  (p58) with the measurements; the compaction this task scoped out is what closes
  it, and the escape hatch remains the guarantee for 360x300, which needs 113px
  of scroll and cannot be trimmed into fitting.
