# Retro: Make the generated content graph deterministically ordered

- TASK: 20260730-120355
- BRANCH: chore/deterministic-content-graph-order
- REVIEW ROUNDS: 1

## What went well

The commit shape held under pressure. The plan demanded the ~1900-line
regeneration land alone, and it did (`62ba2cc`, `index.json` only), so the
reorder is reviewable as a movement diff - the exact failure that got the
attempt in `20260729-092352` reverted.

Verification never trusted the eye. Every DoD proof is a parsed-content
comparison, and the reviewer reproduced the payload byte-identically from the
markdown source. The repointed fixtures were re-derived by running `guessTier`
over the new payload, not hand-edited until green, so no `toEqual` softened to
`toContain` and no count was dropped.

One review round, APPROVE, four findings all MINOR or NIT.

## What went wrong

The plan asked a narrow verification question and believed the answer. Its last
Step said "confirm nothing asserts a seed-to-species mapping", grepped for
exactly that, and found nothing - correct, and irrelevant. Fourteen tests
across six files pinned the shipped list order for unrelated reasons:
autocomplete ranking fixtures, which exist to prove ORDER properties, and the
seed-42 and pinned-day e2e helpers. That was sound at plan time because
DECISION.md had reasoned the daily-answer shift through carefully and the shift
really did break nothing; the blind spot was assuming the shift was the only
way list order could leak into a test.

DECISION.md's consequence section asserted "a player mid-round on deploy day
gets a target swap" from reasoning about `speciesIndexForDate` alone. Review
found `saveGameState` persists `targetId` and `loadGameState` restores it
(`src/gameState.ts:64,93`), so a saved round keeps its target. The claim was
load-bearing for accepting the shift and was never read off the code.

The invariant is guarded only at the generator. A committed payload in unsorted
key order keeps `npm run ci` green (R1.2).

## What to improve next time

Breadth: the diff grew by one unplanned commit (`72b8802`, 14 fixtures). Not a
missed split - a green suite is inseparable from the reorder, so it had to ride
this branch. It is a plan-depth miss, not a boundary problem.

Churn: no review rework. The from-scratch challenge in `plan` did run on the CI
guard and rejected regenerate-then-`git diff --exit-code` for good reasons, but
stopped at that one alternative and missed the cheap assertion sitting in
`test/contentSource.test.ts`, which already had both sides in hand. Rejecting
the obvious guard is not the same as finding the right one.

Context: the flow resumed cold - the main checkout's TASK.md still read
WORKING while the worktree read REVIEWING - and `sprout ls` resolved it in one
step. Round 1 was delegated out-of-context and re-derived the load-bearing
`targetId` claim independently, which is what caught R1.3. No compaction or
threshold pressure recorded.

## Action items

- `20260804-123559` carries all four open findings (R1.1-R1.4): assert the
  pipeline test's unsorted-listdir premise, pin the committed payload's key
  order in `test/contentSource.test.ts`, correct the mid-round-swap claim
  forward, and record the invariant in `AGENTS.md`.
- Before believing a targeted grep about test coverage, run the suite. The grep
  answers the mechanism you named; the suite answers the question you asked.
- A consequence recorded in DECISION.md must be read off the code it describes.
  Reasoning that stops one call short of the persistence layer is how a
  confident claim ships wrong.

## Landing message

```
chore: sort generated content graph ids

`load_directory` iterates `sorted(os.listdir(path))`, so `index.json` key
order is a property of the content rather than of the filesystem, and a
one-line content edit diffs as a one-line edit on any machine. A pipeline test
pins the invariant.

The regenerated payload lands as its own pure-movement commit. Key order picks
the daily answer, so every puzzle number re-points once; 14 fixtures that had
baked in the shipped order were re-derived from the new payload without
weakening any assertion.
```
