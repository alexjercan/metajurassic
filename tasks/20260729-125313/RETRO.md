# Retro: Stop the info panel auto-opening on a mid-game reload

- TASK: 20260729-125313
- BRANCH: none (no code change)
- REVIEW ROUNDS: 0

## What went well

Reproducing the bug before planning it was the whole task. Reading
`src/ui/panel.ts` first showed the tail `openPanel()` the task described had
already become conditional on `!isNarrowViewport()`, and running
`e2e/mobile.spec.ts -g "mid-game reload"` turned that reading into a green test
in under a minute. A plan written from the task prose would have produced a
`renderLastGuess` contract change for a bug that does not exist.

The scratch probe spec for the desktop half was worth the two minutes. It turned
"desktop presumably still auto-opens" into a measured
`PANEL AFTER RELOAD: info-panel active`, so the decision to leave desktop alone
rests on an observation rather than on reading the condition and assuming.

`e2e/mobile.spec.ts:193` carried a comment naming THIS task as the owner of the
general reload case. That pointer is what made the overlap findable from the
test side, and it is the pattern worth repeating: when a fix covers a
neighbouring task's ground incidentally, say so at the test.

## What went wrong

Nothing was broken, but the task sat OPEN at priority 60 for four days carrying
a "## Interim note from `20260729-141414`" that already said the phone half was
fixed. The note then concluded the desktop reload and the contract change were
"still unaddressed and still worth doing", and left the Steps, the Story and the
Definition of Done untouched underneath it. So the record simultaneously said
"mostly fixed" and "here is a four-step plan to fix it".

The interim note's judgement is the thing that did not hold up. It treated the
desktop auto-open as residual scope of the same bug. It is not: the filed Story
is about a phone player losing the board, and on desktop the panel does not
cover the tree. Calling it "still worth doing" imported work the evidence never
supported. That was a reasonable call to make in passing while finishing another
task - it costs nothing to write and defers the judgement - but a note that
changes a task's remaining scope should either narrow the DoD in place or say
the task may now be a no-op, not append an opinion above an unchanged plan.

## What to improve next time

When a task lands that incidentally covers another open task's ground, do not
just append an interim note. Edit the neighbour's Definition of Done to the
scope that actually remains, or mark it as needing re-verification. An unchanged
DoD under a note that contradicts it is a trap for the next agent, who will read
the Steps as authority.

For a bug task older than a few days, the first action is reproduce, not plan.
The cost is one test run; the saving here was an entire implementation of a
contract change that would have been reviewed, landed, and then done nothing.

## Action items

- None ship-side. The deferred localStorage question (persisting
  `manuallyClosedPanel` across loads, desktop-only) is deliberately NOT filed as
  a task: no player has reported it and no playtest measured it, so filing it
  would recreate the "still worth doing" pattern this retro is about. It is
  recorded in `DECISION.md` under Alternatives considered, where it is findable
  if evidence turns up.
