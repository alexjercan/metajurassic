# Retro: Graph scaling on small screens and mobile browsers

- TASK: 20260331-154614
- DATE: 20260729
- OUTCOME: shipped (commit d684369, 2026-04-01). Record BACKFILLED on
  2026-07-29 during the flow-conformance repair (`20260729-092239`); no
  REVIEW.md or RETRO.md existed at the original closeout.

## Nature of this record

This retro is reconstructed after the fact. The task shipped and was closed
without a retro, so the "what went well / wrong" below is inferred from the
committed diff and the report, and the primary lesson is about the PROCESS miss,
not the code.

## What this was

A bug task: the dinosaur/clade guess tree overflowed and clipped on small
screens, and on Android Chrome the arena could not be scrolled left (Opera also
misbehaved). Desktop Firefox/Chromium were fine. The fix makes `#arena` the
single touch-enabled scroll container, scales `.tree` down in discrete steps
(90/80/70/60%) once it overflows the viewport by 1.2x-1.8x, adds mobile-specific
padding/font tweaks, and switches the post-render auto-scroll from `smooth` to
`instant` (with a fallback) so Android Chrome stops swallowing manual scroll.

## What went well

- The fix matched the report point-for-point: single scroll surface for the
  Android left-scroll bug, dynamic downscaling for the "too many guesses ->
  clipped tree" complaint, and smooth -> instant scroll for the manual-scroll
  conflict. The reasoning was even written into the diff comments.
- Scope stayed tight - CSS plus one render hook, no churn elsewhere.

## What went wrong / difficulties

- **The task was closed with no review and no retro.** This is the real miss.
  `tatr check` went red, and everything about WHY the thresholds and the
  smooth->instant switch were chosen survived only as commit-message and inline
  comments, not as a durable task trail. A future session resuming from the files
  alone would have had to reverse-engineer the intent.
- **No automated coverage was added** for layout/scroll behavior, so the fix is
  unpinned (see REVIEW.md N1).
- **Scaling recomputes only on render, not on resize/orientation change** (see
  REVIEW.md N2), so a mid-game rotation can leave the tree wrongly scaled until
  the next guess. The follow-up task `20260729-092339` (harden tree scaling and
  mobile scroll behavior) is the right home for this.

## What to do differently next time

- Close a task through work -> review -> compound, not by flipping STATUS to
  CLOSED. Even a solo, obviously-correct fix gets a one-line REVIEW verdict and a
  short RETRO on disk, so the trail is resumable and `tatr check` stays green.
  (Lesson: `close-a-task-with-its-review-and-retro-not-just-the-status`.)
- For layout/scroll fixes, add at least a jsdom-level check that the intended
  scale class is chosen for a given width ratio, and recompute scale on `resize`
  / `orientationchange`, not only on render.

## Lessons (folded into LESSONS.md)

- `close-a-task-with-its-review-and-retro-not-just-the-status` - a CLOSED status
  is not a finished task; the verdict and retro must be on disk beside it.
- `backfilled-records-must-say-so` - reconstructed records are labelled BACKFILL
  and dated to now; do not fabricate a review round or a plan-approval marker
  that never happened.

## Follow-ups

- `20260729-092339` (harden tree scaling and mobile scroll behavior) should pick
  up the resize/orientation recompute (N2) and add regression coverage (N1).
