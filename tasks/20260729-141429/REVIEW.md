# Review: Fix the duplicated word in the share headline

- TASK: 20260729-141429
- BRANCH: fix/share-headline-puzzle-number

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) src/puzzleKey.ts:50 - `formatPuzzleId` is exported but has
  no cross-module caller left. Its only caller is `gameStateKey` in the same
  file; `e2e/dailyKeyMirror.ts` is a hand-copy, not an import. The export was
  added for `shareText.ts`, and this diff removes that consumer. Drop the
  `export` keyword so the machine formatter is module-private again; the Step
  constraint is about output bytes, not visibility.
  - Response:
- [ ] R1.2 (MINOR) test/share.test.ts:262 - the DoD names this case as the
  proof for both modes "for a win and a loss", but both fixtures are wins
  (`playedGame(["Tyrannosaurus"])`) and only `✅` headlines are asserted. The
  loss template (`src/shareText.ts:123`) is pinned only by
  `e2e/share.spec.ts:267`'s `toContain("💀 Dinosaur #")`. Add an assertion in
  the same case using a lost game, pinning the whole first line
  `💀 Dinosaur #211 🦖`.
  - Response:
- [ ] R1.3 (NIT) test/share.test.ts:274 - "practice is labelled and carries its
  seed id, not a daily number" now asserts `toContain("Practice Dinosaur #43")`
  for the same input the new case pins as a whole first line; it is a strict
  subset. Delete lines 274-283.
  - Response:

Verification, re-derived in-session and not delegated:

- `npm test`: exit 0, 370 tests in 27 suites.
- DoD grep proof `! grep -rn --include='*.ts' -e 'Dinosaur dinosaur-' src test
  e2e scripts`: no hits.
- R1.1 re-derived independently: `grep -rn formatPuzzleId src test e2e scripts`
  returns only `src/puzzleKey.ts` (definition, `gameStateKey` call, two
  comments) and the two `e2e/dailyKeyMirror.ts` comments. Confirmed.
- Storage keys untouched: the diff does not edit `gameStateKey`,
  `parseGameStateKey`, `test/gameState.test.ts`, `test/gameStats.test.ts`,
  `test/rollingAverage.test.ts`, `e2e/seed.spec.ts`, `e2e/practice.spec.ts` or
  `e2e/dailyKeyMirror.ts`. Step 5 held.
- Close-out honesty: the reviewer reproduced red-without-fix (reverting only
  `src/puzzleKey.ts` and `src/shareText.ts` yields
  `Received: "✅ Dinosaur dinosaur-#00211 🦖"`), matching the recorded claim.
  No assertion was weakened: `test/seedMode.test.ts` l.133 traded two loose
  `toContain`s for one adjacency-pinning assertion, which is stricter.
- `npm run ci` currently exits 1 on THREE e2e hint-chip tests
  (`e2e/panel.spec.ts:139`, `e2e/mobile.spec.ts:228`, `e2e/mobile.spec.ts:271`,
  all failing to click a not-visible `#hint-box`). Reproduced identically on
  master `b821117`, so it is pre-existing breakage, not this diff, and does not
  block. Filed as `20260804-000316`. The close-out's "168 e2e passed" was true
  when run; that count is not reproducible today for reasons outside this diff.

Process signal: the DoD's `npm run ci` proof is only as green as master is. It
passed during the work phase and fails now with no change to the branch, which
means a whole-suite proof cannot distinguish this task's health from the
default branch's. A per-task proof naming the suites the diff can actually
break would have held.
