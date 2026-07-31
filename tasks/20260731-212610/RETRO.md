# Retro: KISS pass: core game loop (game.ts, gameState.ts, share text)

- TASK: 20260731-212610
- BRANCH: refactor/kiss-core-game-loop
- REVIEW ROUNDS: 2

## What went well

- **Writing `DECISION.md` before moving a line.** The four choices it settles -
  the boundary, no barrel re-exports, `consistentCandidates` staying put, the
  `updateUI` seam - were all decided while reading the code, not while
  defending a diff. The barrel-re-export question in particular is one that
  would have been much harder to answer honestly after the fact, because the
  facade version is cheaper and the diff would already have existed.
- **Verifying the split mechanically rather than by reading.** Stripping
  comments and blank lines from both sides, sorting, and diffing turned "did
  the move change behaviour" from a judgement into a check. It found nothing,
  which is the point - and it is what let review state the no-behaviour-change
  claim as evidence rather than as confidence.
- **Checking each comment's backing record before compacting it.** This changed
  the answer twice inside one file: the hint-purchase essay compacted (both
  records hold the rationale), the brief-mount essay did not.

## What went wrong

- **The importer grep filtered the signal out.** To enumerate what imported
  `gameState`, the plan grepped and then excluded lines matching
  `SavedGameState`, `gameStateKey` and friends, meaning to drop noise from
  symbols that were staying. `test/gameStats.test.ts` imports `gameStateKey`,
  which was moving. The filter hid it. It seemed sound because the exclusion
  list was written from the list of symbols staying behind - but the same
  string appears in both roles, and the filter cannot tell them apart. Jest
  caught it in the first run.
- **The record search covered one record KIND, not the record tree** (review
  R1.2). Asking "is the brief-mount rationale recorded" turned into grepping
  the two `DECISION.md` files the comment itself named. It is recorded, in
  `tasks/20260729-092327/TASK.md:110-117`. The decision to keep the comment in
  full survived - a TASK.md close-out is not a compaction target the policy
  accepts - but the reason written into `NOTES.md` was false, and `NOTES.md`
  is precedent for seven remaining siblings.
- **`AGENTS.md` still named the deleted `src/game.ts`** (review R1.1). The doc
  sweep looked for stale references to the SPLIT files and found none, because
  the search was for `gameState.ts` and `shareText.ts`. Nothing checked the
  path that ceased to exist.

## What to improve next time

- Enumerate call sites with the widest possible grep and filter the OUTPUT by
  reading it. An exclusion pattern written from the stay-behind list cannot
  distinguish a symbol that is staying from a string that merely contains it.
- Before recording "no record backs this comment", grep `tasks/` whole. Then
  ask the separate question of whether the record found is a kind the policy
  accepts as a compaction target. Two questions, not one.
- After deleting or renaming a path, grep for the OLD path across docs, not
  only for the new ones. The seven remaining children each delete or move at
  least one path.

## Diagnosis

**Breadth.** The diff is 23 files, and that is inherent rather than a missed
split: 17 of them are one-line import edits that only exist because the task
refused a barrel re-export. The alternative that would have shrunk the diff is
the one `DECISION.md` rejects on the epic's own goal. The 6 substantive files
are the two source clusters this task is named for.

**Churn.** Both round-1 findings are doc/record defects, not design defects, and
both trace to the same plan-time gap: the plan wrote greps but did not require
that each one be re-run WITHOUT its filter before its result was recorded as a
fact. `plan`'s from-scratch challenge would not have caught either; the
cold-reader test in `plan/decision.md` would have caught R1.2, because a cold
reader of that `NOTES.md` paragraph has no way to check "no record exists"
except by running a wider search than the one described. Both are close kin of
the ledger's `absence-proving-greps-must-be-run-when-written`, which is at
three occurrences and pending promotion.

**Context.** No pressure observed. No compaction warning, no checkpoint, no
handoff, no delegation. The cluster fits one pass comfortably; the largest file
read was 440 lines.

## Action items

- None requiring a new task. The three improvements above are folded into
  `LESSONS.md` and apply directly to the seven remaining epic children.
- `20260731-212611` inherits one open question from `DECISION.md` case 3:
  whether `consistentCandidates` belongs with `treeBuilder.ts`. It was left in
  `gameState.ts` for cluster-boundary reasons, not on the merits.
