# KISS pass: Jest suites and playtest rigs

- STATUS: CLOSED
- PRIORITY: 58
- TAGS: refactor, testing

## Story

As a maintainer reading a Jest suite or a playtest rig, I want its comments to
tell me why the assertion is the assertion, not which task once wanted it, so
that the surviving prose is worth reading.

## Problem

`test/` and `scripts/playtest/` carry the rest of the narrative comments.
`scripts/playtest/hint.ts` (830 lines, 117 comment) documents THREE hint rules -
the pre-`20260729-141424` behaviour, the rejected fork, and the shipped rule -
which is legitimate for a comparison rig but reads as three histories stacked.
`scripts/playtest/difficulty.ts` (571) and `walkthrough.ts` (395) repeat the
playtest-pass framing in their headers.

`test/gameStats.test.ts` (1110) and `test/treeBuilder.test.ts` (874) each hold
describes over two different `src/` modules, and `treeBuilder.test.ts` carries a
`// ====` banner at line 549 - the file-size policy's "boundary that has not
happened yet".

## Steps

- [x] Capture the baseline: full sorted Jest `fullName` list and a `wc -l` table
      for `test/` and `scripts/playtest/`, into `tasks/<id>/NOTES.md`.
      (`LESSONS.md`: a silently dropped test is the failure mode here.)
- [x] Split `test/treeBuilder.test.ts` at its line-549 banner. Move the shared
      synthetic-tree fixture (`species`, `clades`, `makeGameData`, `makeState`,
      and the ASCII lineage diagram, which is a KEEP) to a new
      `test/treeFixtures.ts` - precedent: `test/timeZone.ts`. `buildGuessTree`,
      `buildGuessTree with hints` and `buildGuessTree edge cases` stay in
      `test/treeBuilder.test.ts`; `findNextHintCladeId`, `findBestHintCladeId`
      and `findNextHintCladeId edge cases` move verbatim to a new
      `test/hintSelection.test.ts`. Not into `test/hintRule.test.ts`: that suite
      runs against the real payload, and mixing fixture worlds in one file would
      cost a reader more than the split saves.
- [x] Split `test/gameStats.test.ts` by module under test. Move `species`,
      `clades` and `MockLocalStorage` to a new `test/statsFixtures.ts`; move the
      `calculateRollingAverage` describe verbatim to a new
      `test/rollingAverage.test.ts`. `loadAllGames`, `computeGameStats` and the
      daily-profile dating regression stay - all three exercise `gameStats.ts`.
- [x] Compact the three playtest rig headers to what a reader running the rig
      needs: what it simulates, what it prints, what it cross-checks, how to run
      it. Rationale already recorded elsewhere compacts to one line plus its
      pointer - `tasks/20260729-092435/DECISION.md` (skill-ceiling caveat),
      `tasks/20260729-141424/DECISION.md` (shipped hint threshold),
      `tasks/20260729-160500/SPIKE.md` (what the rig was measuring). The
      alternative hint rules in `hint.ts` stay - they are the rig's subject -
      but as labelled rule implementations, not as a history.
- [x] Compact comments across the remaining `test/` files, densest first:
      `dataIntegrity` (47), `practiceSession` (46), `lintGate` (46),
      `autocompleteBlur` (46), `hintRule` (40), `closeness` (38), `treeLayout`
      (31), `contentSource` (31). Why-this-assertion is a KEEP at whatever
      length it needs; which-task-asked-for-it is not.
- [x] Diff the after-list against the baseline; both lists go in `NOTES.md`.

## Definition of Done

- The sorted list of Jest test `fullName`s is byte-identical before and after.
  (cmd: `nix develop --command node_modules/.bin/jest --silent --json
  --outputFile=$OUT` on base and on the branch, `fullName`s extracted, sorted
  and `diff`ed; both lists and the empty diff recorded in `NOTES.md`)
- Before/after `wc -l` for every file touched, with the new files listed.
  (cmd: `wc -l test/*.ts scripts/playtest/*.ts` table in `NOTES.md`)
- No file in `test/` or `scripts/playtest/` still names a tatr ID outside a
  `NOTE:`/`FIXME:`/`TODO:`/`BUG:` marker or a record pointer that states its
  constraint first. (cmd: `grep -rn "20[0-9]\{6\}-[0-9]\{6\}" test/
  scripts/playtest/`, each hit justified in `NOTES.md`)
- Every playtest rig still runs and prints its summary, including the `hint.ts`
  cross-check against `findNextHintCladeId`.
  (cmd: `nix develop --command npm run playtest:difficulty` and
  `nix develop --command npm run playtest:hint`)
- `npm run ci` passes. (cmd: `nix develop --command npm run ci`)

## Notes

- Assumption: a pure refactor has no red-first proof. The parity of the sorted
  `fullName` list IS the proof, and it is meaningful only if captured on the
  base commit before any edit - hence step 1 first.
- `npm run playtest:walkthrough` needs a running server and writes screenshots;
  it is out of the DoD. Its header is still compacted, and it must still
  typecheck under `npm run lint`.
- The ASSERTIONS move verbatim. No assertion is rewritten, no `describe`
  renamed, no exported symbol changed - a rename would break the parity proof by
  design. Comments inside a moved block are still subject to Step 5, so a move
  can drop a narration line.

## Close-out

**What and why.** Both oversized suites split at a real module boundary, not at
a line count: `treeBuilder.test.ts` at the `// ====` banner the file-size policy
calls a boundary that has not happened yet, `gameStats.test.ts` where
`calculateRollingAverage` (a different `src/` module) starts. Each split needed
a fixture module because every describe in the file shared one - `treeFixtures.ts`
and `statsFixtures.ts`, both pure moves with `export` added. The three playtest
rig headers lost the playtest-pass framing and gained what a reader running the
rig needs; the alternative hint rules in `hint.ts` stayed, relabelled from
history ("what the game did BEFORE `<id>`") to rule implementations ("baseline
rule", "deepest-clade rule"). Twelve record pointers survive because each states
its constraint before pointing; one became a `NOTE:` marker because the task it
names is still OPEN.

**Alternatives.** The hint describes could have merged into the existing
`test/hintRule.test.ts` instead of a new `hintSelection.test.ts`. Rejected:
`hintRule.test.ts` runs against the real payload and these run against a
four-species synthetic tree, so one file would hold two fixture worlds - more
expensive to read than the split saves. Also considered and rejected: widening
the prettier glob to cover `test/`, which would reformat every existing test
file and drown this diff (recorded in NOTES.md for a future pass).

**Difficulties.** `hint.ts` carried two contradicting section numberings - a
header saying "section 5 measures rescue" against in-file banners numbering the
same work 1-7. Diagnosed by reading the `console.log("## N ...")` headings,
which are the only numbering the rig's reader ever sees; the banners lost their
numbers and the header now indexes the printed ones. The printed order is
0,1,2,4,3,5 because `main()` calls `pacing` before `simulate` - left alone and
documented, since reordering is a behaviour change.

**Evidence.** Sorted Jest `fullName` list is byte-identical before and after -
323 tests, md5 `332edcc18fac4f471bc7357d937c5cdd` on both sides, empty diff.
Both rigs run; `hint.ts` cross-check 548/548. `npm run ci` green (323 unit,
126 e2e). Line-count table and the full ID audit in `NOTES.md`.

**Reflection.** Capturing the parity list on the base commit before touching
anything was the step that made the rest safe to do quickly - every subsequent
edit was checkable in seconds. Worth making the default opening move for any
move-only refactor. The pass also shows a limit of line counts as a signal:
total lines were flat (7711 -> 7709) while the largest file halved, which is the
number that actually decides whether a file fits a reader's working context.
