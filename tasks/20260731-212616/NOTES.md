# NOTES: KISS pass over the Jest suites and playtest rigs

## Test-name parity (the load-bearing proof)

Captured on the base commit `1e83a04` before any edit, and again on the branch:

```
nix develop --command node_modules/.bin/jest --silent --json --outputFile=$OUT
# then: testResults[].assertionResults[].fullName, sorted
```

| | tests | md5 of the sorted name list |
|-|-|-|
| before | 323 | `332edcc18fac4f471bc7357d937c5cdd` |
| after | 323 | `332edcc18fac4f471bc7357d937c5cdd` |

`diff before-names.txt after-names.txt` is empty. Same 323 names, same suite
count in content terms (21 files -> 23 files, because two suites were split).

## Line counts

New files, all of them code moved out of a split. Assertions are verbatim; two
narration comments inside the `calculateRollingAverage` block ("Should have 2
separate data points", "Should have 2 separate weeks") were dropped on the way,
which is Step 5 applying to a moved block:

| File | Lines | Holds |
|------|-------|-------|
| `test/treeFixtures.ts` | 115 | synthetic clade tree, `makeGameData`, `makeState` |
| `test/hintSelection.test.ts` | 163 | `findNextHintCladeId`, `findBestHintCladeId` over that tree |
| `test/statsFixtures.ts` | 72 | species/clades fixture, `MockLocalStorage` |
| `test/rollingAverage.test.ts` | 432 | `calculateRollingAverage` |

Files that changed size:

| File | Before | After |
|------|--------|-------|
| `test/gameStats.test.ts` | 1110 | 603 |
| `test/treeBuilder.test.ts` | 874 | 597 |
| `scripts/playtest/hint.ts` | 830 | 836 |
| `test/gameState.test.ts` | 462 | 461 |
| `test/practiceSession.test.ts` | 453 | 454 |
| `test/dataIntegrity.test.ts` | 246 | 245 |
| `test/storage.test.ts` | 155 | 153 |
| `test/seedMode.test.ts` | 148 | 147 |
| `test/lintGate.test.ts` | 103 | 103 |
| `scripts/playtest/walkthrough.ts` | 395 | 394 |
| `scripts/playtest/difficulty.ts` | 571 | 571 |

Every other file the diff touches is unchanged in length - the edit replaced a
comment line in place: `test/autocomplete.test.ts` (136),
`test/autocompleteBlur.test.ts` (258), `test/closeness.test.ts` (182),
`test/gameData.test.ts` (290), `test/hintRule.test.ts` (228),
`test/onboarding.test.ts` (53), `test/treeLayout.test.ts` (230).

Totals over `test/*.ts` plus `scripts/playtest/*.ts`: 7711 -> 7710. The pass did
not shrink the total and was not trying to - the DoD is the largest file and the
comment quality, not the sum. The two biggest suites dropped by 46% and 32%; the
comment deletions roughly cancel the import headers the two new fixture modules
need.

`scripts/playtest/hint.ts` grew by 6 lines: its header lost the archaeology and
gained the section index and the run command, which is what a reader running the
rig actually needs.

## Remaining tatr IDs

`grep -rn "20[0-9]\{6\}-[0-9]\{6\}" test/ scripts/playtest/` returns 13 hits.
Every one is a record pointer that states its constraint first, except one live
marker:

| Site | Shape |
|------|-------|
| `hint.ts:703` | `NOTE:` marker - the clade-member surface the hint-follower model needs is unbuilt (20260729-141425, OPEN) |
| `setTimeZone.js:10` | bare `(tasks/20260729-122943)`, no record file cited. Pre-existing and untouched by this diff - the file is jest `globalSetup`, not a suite Step 5 names. Left alone rather than widened into an unrelated edit |
| the other 11 | `... See tasks/<id>/DECISION.md` or `SPIKE.md`, each after the constraint it explains |

Removed as archaeology: bare IDs in `autocompleteBlur.test.ts`,
`treeLayout.test.ts`, `dataIntegrity.test.ts`, `walkthrough.ts`, plus the
`REVIEW.md round 1, MAJOR/MINOR` and `Found in review, R1.1` attributions in
`lintGate.test.ts` and `closeness.test.ts`, and the pass framing in all three
playtest rig headers.

## Two things the pass found

**`hint.ts` carried two contradicting section numberings.** The header said
"section 5 measures rescue"; the in-file banners numbered the same sections
1-7 with sanity as 5. The printed headings (`## 0` .. `## 5`) are the only
numbering a reader of the output sees, so the banners lost their numbers and
the header now indexes the printed ones. Printed order is 0, 1, 2, 4, 3, 5 -
`pacing` is called before `simulate` in `main()`. Left as is; the headings are
self-labelling and reordering the calls is a behaviour change.

**`walkthrough.ts` told findings to go to a specific closed task's NOTES.md.**
Now: "the task record that ran it".

## Rigs

- `npm run playtest:hint`: cross-check green, 548/548 agree between the
  reproduced `split<=0.5` policy and the shipped `findNextHintCladeId`.
- `npm run playtest:difficulty`: full report prints; `consistent` policy
  loss=0.0% mean=4.7, unchanged shape.
- `npm run playtest:walkthrough` needs a running server and writes screenshots -
  out of the DoD by plan, lints clean.

## `npm run ci`

Green: format:check, lint (`--max-warnings=0`), test:pipeline, test:coverage
(323 passed), test:e2e (126 passed).

Note for a future pass: `npm run format` and `format:check` cover `src/`,
`e2e/`, `scripts/` and the config files but NOT `test/`, so the new test files
are lint-checked but not prettier-checked. Not fixed here - widening the
format glob would reformat every existing `test/` file and drown this diff.
