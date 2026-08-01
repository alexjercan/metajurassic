# KISS pass: Jest suites and playtest rigs

- STATUS: OPEN
- PRIORITY: 58
- TAGS: refactor, testing
- KIND: STORY
- FLOW STEP: PLANNED
- PLAN STATUS: APPROVED
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

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

- [ ] Capture the baseline: full sorted Jest `fullName` list and a `wc -l` table
      for `test/` and `scripts/playtest/`, into `tasks/<id>/NOTES.md`.
      (`LESSONS.md`: a silently dropped test is the failure mode here.)
- [ ] Split `test/treeBuilder.test.ts` at its line-549 banner. Move the shared
      synthetic-tree fixture (`species`, `clades`, `makeGameData`, `makeState`,
      and the ASCII lineage diagram, which is a KEEP) to a new
      `test/treeFixtures.ts` - precedent: `test/timeZone.ts`. `buildGuessTree`,
      `buildGuessTree with hints` and `buildGuessTree edge cases` stay in
      `test/treeBuilder.test.ts`; `findNextHintCladeId`, `findBestHintCladeId`
      and `findNextHintCladeId edge cases` move verbatim to a new
      `test/hintSelection.test.ts`. Not into `test/hintRule.test.ts`: that suite
      runs against the real payload, and mixing fixture worlds in one file would
      cost a reader more than the split saves.
- [ ] Split `test/gameStats.test.ts` by module under test. Move `species`,
      `clades` and `MockLocalStorage` to a new `test/statsFixtures.ts`; move the
      `calculateRollingAverage` describe verbatim to a new
      `test/rollingAverage.test.ts`. `loadAllGames`, `computeGameStats` and the
      daily-profile dating regression stay - all three exercise `gameStats.ts`.
- [ ] Compact the three playtest rig headers to what a reader running the rig
      needs: what it simulates, what it prints, what it cross-checks, how to run
      it. Rationale already recorded elsewhere compacts to one line plus its
      pointer - `tasks/20260729-092435/DECISION.md` (skill-ceiling caveat),
      `tasks/20260729-141424/DECISION.md` (shipped hint threshold),
      `tasks/20260729-160500/SPIKE.md` (what the rig was measuring). The
      alternative hint rules in `hint.ts` stay - they are the rig's subject -
      but as labelled rule implementations, not as a history.
- [ ] Compact comments across the remaining `test/` files, densest first:
      `dataIntegrity` (47), `practiceSession` (46), `lintGate` (46),
      `autocompleteBlur` (46), `hintRule` (40), `closeness` (38), `treeLayout`
      (31), `contentSource` (31). Why-this-assertion is a KEEP at whatever
      length it needs; which-task-asked-for-it is not.
- [ ] Diff the after-list against the baseline; both lists go in `NOTES.md`.

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
- Moves are verbatim. No assertion is rewritten, no `describe` renamed, no
  exported symbol changed - a rename would break the parity proof by design.
