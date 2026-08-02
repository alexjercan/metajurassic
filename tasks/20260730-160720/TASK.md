# Let the game-over modal fit a landscape phone without scrolling

- PRIORITY: 58
- TAGS: bug, ui, mobile, ux
- KIND: TASK
- ACTIVITY: -
- GATES: -
- RESOLUTION: -

## Story

As a player finishing a round with the phone sideways, I want to see the whole
game-over card at once, so that reaching the buttons is not a scroll I have to
discover.

## Problem

`20260730-111003` gave the modal a vertical escape hatch (`max-height:
calc(100% - 32px)` plus `overflow-y: auto` on `.modal`), which made every action
REACHABLE at every short viewport. It did not make them VISIBLE. Read off the
final layout at 568x320 (iPhone SE landscape):

| viewport | content height | visible height | max scroll |
|----------|----------------|----------------|------------|
| 568x320 | 329 | 286 | 43 |
| 480x320 | 329 | 286 | 43 |
| 640x360 | 329 | 326 | 3 |
| 360x320 | 379 | 286 | 93 |
| 360x300 | 379 | 266 | 113 |

At 568x320 the action row is cut in half by the modal's bottom edge and there is
no persistent scrollbar or other affordance - the screenshot shows three
half-pills and nothing that says "there is more below". This is strictly better
than before (the actions were unreachable-by-design then, and the modal was
clipped at both ends), but at 568x320 specifically it is a step back on
LEGIBILITY: on master the row was fully visible and only the modal's chrome was
cut.

## Why it is worth doing

The gap is small. 568x320 needs 331px of outer height and has 320px: **11px**.
A modest trim of the icon, the paddings and the margins closes it, and the
common landscape phone then needs no scroll at all. The escape hatch stays as
the guarantee for the sizes a trim cannot reach (360x300 needs 113px of scroll -
that one is honestly a scrolling modal).

## Steps

- [ ] Decide between the two shapes and record it: a `@media (max-height: ...)`
      compaction block, or a scroll affordance (a styled persistent scrollbar, a
      bottom fade). They are not exclusive; compaction is the one that removes
      the need.
- [ ] If compaction: order the height block AFTER the `max-width: 768px` block.
      A `@media (max-height: 700px)` compaction was once written above it and
      never applied on any phone (LESSONS.md:
      `css-media-blocks-on-different-axes-are-resolved-by-file-order`). Verify
      the effect on BOTH axes.
- [ ] Pin it: at 568x320 and 480x320 the modal's `scrollHeight` must equal its
      `clientHeight` (no scroll needed), while 360x300 keeps its escape hatch.
      `e2e/mobile.spec.ts` already sweeps all five sizes.
- [ ] Read the rendered screens again after the trim - a compaction that makes
      the icon or the stats card look wrong has traded one defect for another.

## Definition of Done

- No scroll is needed at 568x320 or 480x320, win and loss.
  (test: `e2e/mobile.spec.ts`)
- Every action stays REACHABLE at all five short sizes - the escape hatch is not
  removed. (test: `e2e/mobile.spec.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Found by reading the rendered screens at the end of `20260730-111003`, which
  no assertion in that task could see (LESSONS.md:
  `re-render-and-look-after-every-layout-change-not-once-per-task`).
- `20260729-101838` adds a stats card and a countdown to this modal, which makes
  the 11px gap larger. Sequence this after that work, or re-measure.
