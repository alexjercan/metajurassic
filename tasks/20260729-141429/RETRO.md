# Retro: Fix the duplicated word in the share headline

- TASK: 20260729-141429
- BRANCH: fix/share-headline-puzzle-number
- REVIEW ROUNDS: 1

## What went well

- The plan named every line to touch, including the assertions to leave alone,
  so the diff stayed at five files and review found nothing above MINOR.
- DECISION.md was written before the code and carried the from-scratch
  argument: two formatters over one display number, because only the key has a
  parse inverse. Review re-derived it instead of re-litigating it.
- Red-first held and was independently reproducible: reverting only the two
  source files while keeping the new tests yields
  `✅ Dinosaur dinosaur-#00211 🦖`.

## What went wrong

- The Definition of Done leaned on `npm run ci` as its whole-suite proof. That
  proof passed during work and failed at review time with zero change to the
  branch: three hint-chip e2e tests (`e2e/panel.spec.ts:139`,
  `e2e/mobile.spec.ts:228`, `e2e/mobile.spec.ts:271`) fail identically on
  master `b821117`. A default-branch regression is indistinguishable from a
  task regression under that proof. Filed as `20260804-000316`.
- The DoD claimed both modes "for a win and a loss", but the new unit case
  builds two wins; the loss headline is pinned only by an E2E `toContain`
  (R1.2). The Step text and the DoD text drifted from each other and nobody
  compared them until review.
- `formatPuzzleId` was left exported after this task removed its only
  cross-module caller (R1.1). The Step constrained output bytes, so visibility
  went unexamined.

## What to improve next time

- Breadth: the diff is small and single-purpose. No split was missed.
- Churn: the plan-time question that would have caught R1.2 is reading the DoD
  sentence back against the Step that proves it - "win and a loss" names two
  fixtures, the Step wrote one. R1.1 is the mirror: a Step that removes a
  module's last external caller should ask whether the export survives it.
- Context: no threshold crossing, compaction warning, or checkpoint. One
  environment cost is on record - a fresh sprout worktree had no
  `node_modules`, so the first jest run failed on a missing `ts-jest` preset
  rather than on the assertion. `npm ci` inside `nix develop` is part of
  sprouting here, not part of debugging.

## Action items

- `20260804-000316` - fix the three hint-chip e2e failures on master.
- R1.1, R1.2 and R1.3 are open MINOR/NIT findings; they did not block APPROVE
  and are not carried into this task.

## Landing message

```
fix: name the puzzle once in the share headline

The share headline read `✅ Dinosaur dinosaur-#00211 🦖` because
`formatPuzzleId` served both the storage key, which needs the `dinosaur-`
prefix and 5-digit padding as an exact parse inverse, and the prose headline,
which printed it after a literal `Dinosaur `.

Split the two jobs over one shared `puzzleDisplayNumber` helper:
`formatPuzzleId` keeps its byte-for-byte key output, and a new
`formatPuzzleNumber` returns `#211` for the headline. Storage keys, their
parse inverse, streaks and profile dates are unchanged.
```
