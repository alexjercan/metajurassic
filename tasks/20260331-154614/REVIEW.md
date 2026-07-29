# Review: Graph scaling on small screens and mobile browsers

- TASK: 20260331-154614
- DATE: 20260729
- REVIEWER: backfill (reconstructed after the fact)
- COMMIT: d684369 "fix: decrease size of graph with number of guesses"

## Nature of this record

This is a BACKFILLED review. The task was implemented and set CLOSED on
2026-04-01 without a REVIEW.md, so no live, out-of-context review round happened
at the time. This document records what can be verified today from the committed
diff (`git show d684369`) and the current tree, and flags what a real review
would have wanted. It does not claim a review gate occurred on the original date.

## What was verified from the diff

The change addresses the reported problem - the guess tree overflowing and
clipping on small screens, and the inability to scroll left on Android Chrome:

- `src/style.css`: `main` switched from `overflow: auto` to `overflow: hidden`
  and `#arena` became the sole scroll container (`width: 100%`,
  `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`,
  `touch-action: pan-x pan-y`). This is a coherent fix for the Android
  left-scroll bug: a single, explicitly touch-enabled scroll surface rather than
  nested `overflow: auto` panes.
- `.tree` gained `transform-origin: center top` plus four discrete
  `tree-scale-{90,80,70,60}` classes, and a mobile media-query block shrinks tree
  padding, node-box padding, and font size.
- `src/ui/treeVisualizer.ts`: after render, it compares `container.scrollWidth`
  to `arena.clientWidth` and adds the appropriate scale class at 1.2x / 1.5x /
  1.8x overflow thresholds, clearing stale classes first. Scrolling was changed
  from `behavior: "smooth"` to `"instant"` with a `try/catch` fallback to direct
  `scrollTop`/`scrollLeft` assignment - the diff's own comment ties the smooth ->
  instant change to Android Chrome swallowing manual scroll during a smooth
  animation, which matches the reported symptom.

The logic reads correctly: classes are removed before re-adding, thresholds are
ordered widest-first, and the fallback covers browsers without
`ScrollBehavior "instant"`.

## Gaps a live review would have raised (MINOR / notes, not blockers)

- N1 (MINOR) No automated coverage. The scaling and scroll behavior is
  layout/DOM work with no test or runnable example pinning it, so a future
  refactor of the thresholds or class names has no safety net. Reasonable to
  defer given it is CSS-transform layout, but worth a jsdom-level check that the
  right scale class is chosen for a given `scrollWidth`/`clientWidth` ratio.
- N2 (MINOR) Scale is computed only inside `renderTree` (on each new guess). A
  window resize or orientation change AFTER a render does not recompute the scale
  class, so rotating the device mid-game can leave the tree clipped or
  over-shrunk until the next guess. A `resize`/`orientationchange` listener would
  close this.
- N3 (NIT) The overflow thresholds (1.2 / 1.5 / 1.8) and scale steps are fixed
  magic numbers with no comment on how they were chosen; fine for now, brittle if
  node sizing changes.

## Verdict

- VERDICT: APPROVE

Approved as a backfill: the shipped change is a sound, targeted fix for the
reported cross-browser/mobile symptoms and is already in `master`. The gaps above
are recorded as honest follow-up candidates (see RETRO.md and the tree-scaling
hardening task `20260729-092339`), not as grounds to reopen landed work.
