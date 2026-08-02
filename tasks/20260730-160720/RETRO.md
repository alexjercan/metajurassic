# Retro: Let the game-over modal fit a landscape phone without scrolling

- TASK: 20260730-160720
- BRANCH: fix/short-viewport-modal-compaction
- REVIEW ROUNDS: 1

## What went well

The plan carried a measured budget per element and a prototype total, so the
implementation was arithmetic rather than iteration: 271px predicted, 271px
measured, first try. Review re-derived it independently and got the same
numbers at all four fitting sizes, plus red-on-base for the intended reason
(433 in 286 at 568x320, 457 in 366 at 900x400).

Breadth: the diff is one CSS block, two helpers and two spec touch points. No
split was missed; the 900x400 desktop case belongs with the phone sizes because
it is the same media block on the axis where nothing else exercises it.

Churn: none. One review round, verdict APPROVE, one MINOR.

## What went wrong

The block comment in `src/partials/responsive.css` states 273px where the card
measures 271, and calls 286/368 "the box" when those are the `calc(100% - 32px)`
CAP and the box is the card itself. `DECISION.md` and the Close-out both carry
the right number. Root cause: the post-trim figure was written into the comment
from an intermediate reading and not refreshed when the record was, so the same
fact lives in three places and one of them drifted. Found in review as R1.1.

The plan's Definition of Done asserted only the half that improved. It said
nothing about the two sizes that keep scrolling, and `expectActionsReachable`
is inert where there is no overflow - so with four of five clauses green, the
escape hatch this task deliberately preserves had no test requiring it.

Context: no pressure recorded. No checkpoint, no handoff, no delegation.

## What to improve next time

At plan time, ask what the change stops making true, not only what it starts
making true. A compaction that narrows where a fallback applies owes an
assertion at the cases that still need it; the implementer supplied
`expectModalStillScrolls` unprompted, and the plan should have asked for it.

Measurements that justify a change belong in one place. The record is the
place; a code comment should point at it rather than restate the numbers.

## Action items

- R1.1 is open and MINOR: correct the 273/box wording in
  `src/partials/responsive.css` when that block is next touched.
- Lesson `testing/a-fallback-needs-a-case-that-still-uses-it` written to the
  central repository with this task as its occurrence.
