# Review: Rework the hint reveal rule

- DATE: 20260729
- ROUND: 1
- VERDICT: APPROVE (after M1 was fixed in-round)
- REVIEWER: in-context (see Caveat)

## Caveat

This is an IN-CONTEXT review by the session that wrote the change, not the
out-of-context round-1 review `/flow` normally requires - this session is
configured without subagents. Recorded honestly rather than dressed up as an
ordinary review: it caught a real defect and measured two risks that had been
assumed, but its blind spots are by construction the author's blind spots.

## What was reviewed

Diff on `feat/hint-threshold-split`: `src/constants.ts`, `src/gameState.ts`,
`src/treeBuilder.ts`, `src/game.ts`, `scripts/playtest/hint.ts`,
`test/hintRule.test.ts`, `test/hintCap.test.ts`, plus the task record.

## Findings

### M1 (MAJOR, fixed in-round) - the new helper was spliced into another symbol's doc comment

`consistentCandidates` was inserted between the two halves of the comment block
documenting `ShareStats`, leaving `// rather than printed as a zero: "Avg.
0.0"...` orphaned above the interface and the first half stranded above the new
function. Both symbols ended up with wrong or truncated documentation, and
nothing mechanical would have caught it - prettier, eslint and the tests are all
blind to a comment attached to the wrong thing.

Found by reading the DIFF rather than the file: in the file the text flows
plausibly, but the diff shows the insertion point sitting mid-paragraph. Fixed
by moving the helper above the comment block as its own unit and asserting the
share comment is contiguous again.

### M2 (MAJOR, measured, no change needed) - the rule now runs on every UI update

`findNextHintCladeId` is called from `updateHintButton()` on every render, and
it went from a lineage walk to something that computes the full consistent
candidate set (150 species x every guess, each an LCA over two lineage walks)
and then filters that set once per lineage level. That is roughly a 100x
increase in work on a hot path, and `GameData.lineage()` does not memoize.

Measured rather than argued: **0.21 ms per call with 20 guesses on the board,
0.18 ms cold** (node, desktop). Even at a 10x phone penalty this is ~2 ms on an
event that already redraws a tree. No change made; the number is recorded in the
task so a future regression has a baseline.

### M3 (MAJOR, fixed in-round) - the first version of the rule test asserted an unreachable state

`hintRule.test.ts` originally checked the qualifying/fallback property over COLD
boards only, and asserted both branches were exercised. The fallback branch never
fires on a cold board - from 150 candidates some clade always cuts to 75 - so the
test failed on its own anti-vacuity assertion. That assertion is the only reason
the gap was visible; without it the fallback rule would have been "tested" by
zero cases. Fixed by walking each target DOWN its hint ladder, which reaches the
deep states where the fallback actually fires.

Worth keeping as a pattern: a property test over two branches should count both
and fail if either is unexercised.

### m4 (MINOR, accepted) - `canAffordHint` vs `canUseHint`

A cap could have been folded into `canAffordHint`, leaving all callers working
with no rename. Instead `canAffordHint` stays budget-only and `canUseHint` is
the new gate, with `game.ts` moved to it. Slightly more surface, but "cannot
afford" and "not allowed" are different states that the UI will eventually want
to phrase differently, and `useHint` now throws a distinct message for each.
Deliberate; noted so a later reader does not collapse them.

### m5 (MINOR, pre-existing, not fixed) - duplicated revealed-clade computation

`findNextHintCladeId` and `buildGuessTree` each build the revealed-clade set with
the same logic, and the new test file builds it a third time. This predates the
change and extracting it would widen the diff beyond the task. Flagged for a
future cleanup rather than smuggled in here.

## What was checked and found sound

- **The harness mirror moved with the rule.** `scripts/playtest/hint.ts`
  reproduces the shipped rule and asserts agreement with the real function every
  run; that check now reports **548/548 agree** against the NEW rule, and the old
  behaviour is kept as an explicit `top-down (was)` baseline row. This is exactly
  the failure mode `LESSONS.md`
  `hand-copied-logic-mirrors-rot-update-them-in-the-same-change` describes, and
  the check would have gone red had the rig not been updated in the same commit.
- **The tree renders skipped levels correctly without changes.**
  `buildCladeSubtree` attaches a revealed clade under its NEAREST revealed
  ancestor, not its direct parent - the same path already used for non-adjacent
  LCA clades. Verified by reading the function before writing any code, and by
  the passing mobile E2E case that buys a mid-game hint.
- **Callers' assumptions checked, per `when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies`.**
  Grepped every `canAffordHint` and `findNextHintCladeId` call site.
  `src/ui/panel.ts` uses `findBestHintCladeId` (a different function, reads the
  built tree) and is unaffected.
- **The existing mock-tree tests were traced by hand before running**, and all
  five still hold under the threshold rule for the right reason: in a 4-species
  fixture the cutoff is 2, and the clade the old rule returned already met it.
- **Edge cases**: candidate set is never empty while a round is live (the target
  is always consistent with itself), and `cutoff` is floored at 1, so the
  comparison cannot degenerate. A won round is gated by `isGameOver()` before the
  result is used.
- **No new persisted state.** `consistentCandidates` is derived from the guess
  history; save/load format is untouched.
- **DoD verified with numbers, not claims** - rescue 83% -> 55%, deduce
  +2.2/+2.2/+2.4 (still a bad buy), blind unchanged at 83% -> 85%, mid-round bits
  0.06 -> 1.67. Recorded in TASK.md.
- `npm run ci` green (193 Jest tests, 34 E2E, format and lint clean).

## Verdict

APPROVE. M1 and M3 were real defects, both fixed and re-verified in-round; M2 was
a genuine risk retired by measurement rather than assertion. The change does what
the decision record says, and the harness that measures it moved with it.
