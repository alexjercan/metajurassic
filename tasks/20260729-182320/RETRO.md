# Retro: Rank-ladder summary of what the guesses have narrowed

- TASK: 20260729-182320
- BRANCH: feat/rank-ladder-summary
- REVIEW ROUNDS: 4

## What went well

- The DECIDE-FIRST Step earned its place. `DECISION.md` settled the
  depth-to-target fork before any code, so no review round argued about WHAT to
  build; all four rounds were about the panel's behaviour.
- Deriving the ladder from the `CladeNode[]` the board already draws made the
  "no unrevealed clade" invariant hold by construction. Reviewers re-derived the
  roll-up rule twice and it survived both passes unchanged - zero findings ever
  landed on `rankLadder.ts` or `ladderCard.ts`.
- Every round used an out-of-context reviewer and every fix was pinned by an
  e2e case confirmed red on the unfixed code. R3.1's fix was verified by
  sabotage, not by reading, which is what turned a plausible claim into a
  confirmed one.
- R1.2 and R1.5 show the Response line working as designed: one finding was
  answered with reasoned pushback that the next round accepted, the other by
  taking the reviewer's call.

## What went wrong

Rounds 1, 2 and 3 all found the same defect at three depths, and each fix
created the next one:

- R1.1: `selectTab` had only the two click handlers as callers, so the Summary
  pane was sticky and later cards mounted into a hidden container.
- R2.2: the R1.1 fix made `selectTab("info")` unconditional, so a rejected
  guess yanked the player off Summary.
- R3.1: the R2.2 `changed` gate covered the pane but not the pull tab's
  advertisement, so a non-deepening guess promised a card the panel would not
  open onto.

Root cause, and why it looked sound at the time: the plan treated the tab strip
as a mount point - "Add the tab strip", "Wire the tabs ... defaulting to Info".
It is not. `#info-panel` already had an implicit state machine (open/closed,
`manuallyClosedPanel`, `unseenCardTitle` advertising a card by name from the
pull tab), and adding a second pane added a dimension to it. The plan did name
the surface's one KNOWN trap - it cites LESSONS.md on `openPanel()` clearing
`manuallyClosedPanel` - which made the surface feel already-surveyed. Naming
one trap is not enumerating the states.

R2.1 is the same gap in a different lens: the two tab buttons were the first
focusable controls ever placed inside `#info-panel`, and a container hidden
only by `transform` had therefore never needed `inert`. A markup-and-CSS
framing of the step could not surface that; a state framing ("what is true of
this container while closed?") would have.

## What to improve next time

- Adding a pane, mode or tab to an existing surface is a state-machine change,
  not a mount point. The plan-time question: enumerate the surface's existing
  states and list what the new dimension crosses with each. Here that is
  open/closed x which-pane x pull-tab-advertises, nine cells; R1.1, R2.2 and
  R3.1 are three of them.
- When two things must agree (the pane the panel opens onto, and the card the
  pull tab promises by name), put them behind ONE gate rather than two
  conditions that happen to match. The round-3 fix did exactly this, and the
  round-4 reviewer could then prove the two are the same state by counting
  `selectTab`'s three callers. Two matching conditions is a bug waiting for the
  next edit.
- New focusable controls inside a container hidden by `transform` or
  `visibility` need an explicit `inert`. Worth a keyboard check whenever a step
  adds the first interactive element to an existing container.

## Action items

- No follow-up tasks. Every finding is closed on this branch.
- The Pixel 5 screenshot cited under Evidence has no artifact in the worktree;
  three rounds carried this forward as "not verified". `e2e/ladder.spec.ts` on
  the Pixel 5 project covers the occlusion claim, so the screenshot line is
  redundant evidence rather than an unmet proof - but a cited artifact that
  does not exist should not have been written down.
- Reusable observations submitted through `knowledge`, all three new:
  `planning/a-new-mode-multiplies-a-surfaces-states`,
  `pattern/coupled-signals-belong-behind-one-gate`,
  `frontend/visually-hidden-is-still-interactive`. `knowledge check` clean; no
  failed write to carry here.

## Context

No compaction, threshold crossing or checkpoint handoff was recorded across the
four rounds. One out-of-context reviewer per round, each given only the task ID,
branch, worktree, default branch, dimensions and record format - the delegation
that kept the primary's context small enough that four rounds never needed one.

The diff is ~1550 lines across 13 files, but ~820 of that is tests and task
records and ~380 is REVIEW.md itself. The shipped code is four modules plus
markup and CSS, for one feature the plan sized correctly. Breadth is not a
missed split here; the churn was depth in one module, not spread.
