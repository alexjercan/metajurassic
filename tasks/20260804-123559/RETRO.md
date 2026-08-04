# Retro: Guard the sorted graph invariant beyond the generator

- TASK: 20260804-123559
- BRANCH: chore/guard-sorted-graph-invariant
- REVIEW ROUNDS: 1

## What went well

Carving the four MINOR/NIT findings of `20260730-120355` R1.1-R1.4 into one
follow-up task, rather than blocking that task's approval on them, kept both
diffs small and independently landable. The plan named the oracle choice up
front instead of leaving it to the worker, so the review had nothing structural
to argue with: one round, APPROVE, two NITs, no rework.

Verifying the R1.3 claim against `src/gameState.ts` before writing it down,
rather than carrying the plan's wording forward, is what turned a repetition
into a correction. The forward-correction pattern - a new task's DECISION.md
correcting an append-only earlier record instead of editing it - worked and
cost nothing.

## What went wrong

Nothing material. The out-of-context reviewer filed the R1.1 message-wording
finding as MINOR on a quantitative claim (a ~20% chance that ext4 htree order
equals sorted order for this fixture set) that the recording pass could not
reproduce: 600 fresh `mkdtemp` directories on this volume gave zero sorted
listings. The severity, not the finding, was the error, and the recording pass
caught it only because the review workflow requires re-deriving a load-bearing
claim rather than accepting the reviewer's.

## What to improve next time

Breadth: the diff is small and single-purpose, and the split that produced it
was made at the previous task's review rather than late here. No change wanted.

Churn: zero review rework, so neither the from-scratch challenge nor the
cold-reader rationale test would have bought anything. The plan encoding the
R1.2 oracle - and its rejected alternative - is the reason.

Context: the sprout worktree needed `npm install` before Jest could resolve the
`ts-jest` preset. That is a per-worktree cost every task in this repository
pays and it is worth expecting rather than rediscovering. No compaction, no
handoff, no threshold crossing observed.

The transferable lesson is about test oracles, not this repository: when a test
constructs its own expected value, the construction has to be independent of
the property under test. Sorting the actual to build the expected, or comparing
two values that a shared code path already normalized, produces an assertion
that cannot fail for the defect it exists to catch.

## Action items

- None. Both open findings are NITs on a test failure message; they are
  recorded in REVIEW.md and do not warrant a follow-up task.

## Landing message

```
test: guard the sorted graph invariant beyond the generator

The sorted-key-order invariant of src/jurassic/index.json was enforced at
the generator and nowhere else, so a filesystem quirk or a hand-edited
payload could re-point every daily puzzle while every check stayed green.

The pipeline test now asserts its unsorted-listdir premise instead of
assuming it, and test/contentSource.test.ts asserts the committed key
order against a sorted copy of itself - an oracle independent of how the
test read the directory, which order-blind toEqual could not provide.
AGENTS.md names the invariant on the index.json row. DECISION.md records
the oracle choice and forward-corrects 20260730-120355's target-swap
claim: saveGameState persists targetId, so a mid-round player keeps their
target across a deploy.

No behavior change.
```
