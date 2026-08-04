# KISS pass: core game loop (game.ts, gameState.ts, share text)

- PRIORITY: 70
- TAGS: refactor, gameplay
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer reading the core game loop, I want the round rules, the DOM
wiring, and the share text in separate files, so that changing one does not
require paging through the other two.

## Problem

`src/game.ts` (381 lines, 60 comment) is one `initGame` function doing every
job at once: element lookup, guess submission, hint chip copy, the onboarding
brief mount, tree render, and the share button handler. Several comments are
multi-paragraph essays that reproduce a `DECISION.md` - the brief-mount comment
runs 14 lines, the hint-panel comment 17.

`src/gameState.ts` (440 lines, 70 comment) holds three unrelated concerns: the
puzzle key/seed arithmetic, the `GameState` class and persistence, and the
share-grid formatter with its emoji table.

## Steps

Rules come from `AGENTS.md` `## Comments` and `## File size`; worked examples
from `tasks/20260731-212557/DECISION.md`. Do not re-derive them.

- [x] Record the baseline. Rebuild the parser-based comment rig in
      `scratchpad/comments.js` per `tasks/20260731-212557/NOTES.md`
      (`## How the population was counted`; the scanner and a line grep both
      lie). Capture `wc -l` and comment counts for `src/game.ts`,
      `src/gameState.ts`, `src/constants.ts`, `src/gameData.ts` into
      `NOTES.md`.
- [x] Write `DECISION.md` before moving code. It settles four choices:
      (1) the `gameState.ts` / `puzzleKey.ts` boundary; (2) no barrel
      re-exports from `gameState.ts` - every importer is updated, so the file
      does not stay a facade of the concerns it no longer holds;
      (3) `consistentCandidates` stays in `gameState.ts` (moving it would edit
      `src/treeBuilder.ts`, which sibling 20260731-212611 owns);
      (4) `src/game.ts` becomes `src/game/`, and the `updateUI` callback the
      extracted units take is the minimal seam a move needs, not a widget
      abstraction.
- [x] Split `src/shareText.ts` out of `gameState.ts`: `ShareContext`,
      `ShareStats`, `SHARE_URL`, `CLOSENESS_CELLS`, `CORRECT_CELL`,
      `HINT_CELL`, `buildShareGrid`, `formatStatsLine`, `shareMessage`,
      `formatGameStateForSharing`. `src/ui/share.ts` is the transport and stays
      separate.
- [x] Split `src/puzzleKey.ts` out of `gameState.ts`: `PADDING_LENGTH`,
      `PUZZLE_ID_MODULUS`, `puzzleResidue`, `getTodaySeed`, `parseSeedParam`,
      `formatPuzzleId` (now exported for `shareText.ts`), `gameStateKey`,
      `parseGameStateKey`. `gameState.ts` keeps `SavedGameState`,
      `isRoundOver`, `createNewGameState`, `loadGameState`, `saveGameState`,
      the `GameState` class, and `consistentCandidates`.
- [x] Update every importer of the moved symbols. `src/index.ts` and
      `src/game/` are this cluster's; the rest are import-line-only edits,
      listed here and changed in no other way:
      `src/practiceSession.ts`, `src/gameStats.ts`, and the comment reference
      to `gameState.ts` at `src/closeness.ts:37`. In `test/`:
      `share.test.ts`, `seedMode.test.ts`, `practiceSession.test.ts`,
      `gameState.test.ts`, `closeness.test.ts`, `dailyKeyMirror.test.ts`.
      Confirm the list with a grep before editing; no test is restructured and
      no assertion is touched.
- [x] Convert `src/game.ts` to `src/game/index.ts` so `src/index.ts` and
      `src/practice.ts` keep importing `./game` unchanged. `index.ts` keeps
      the element lookup, `updateUI`, `submitGuess` and the input-error pair
      (the core loop, tangled with `updateUI` by design), and the wiring.
      Extract, moving code only: `src/game/hintChip.ts` (`updateHintButton`
      plus the hint-purchase click), `src/game/onboardingBrief.ts`
      (`syncOnboardingBrief`), `src/game/shareButton.ts` (the modal share
      handler and its `computeGameStats` read). No new source directory glob
      work is needed: `src/**/*.ts` already covers Prettier, ESLint, and
      tsconfig.
- [x] Compact the comments in the cluster, including the new files and
      `constants.ts` and `gameData.ts`. The brief-mount essay (14 lines) and
      the hint-panel essay (17) become one constraint line plus the record
      pointer. Keep, in compacted form: `canUseHint` vs `canAffordHint`, the
      `finally`-ordering note, the brief-as-flex-sibling reason, the
      `CLOSENESS_CELLS`-indexes-`closenessTier` note, the
      `formatPuzzleId`/`parseGameStateKey` inverse. `gameData.ts`'s
      `DAILY_SHUFFLE_SALT` comment is case 2 of the policy decision - it has no
      record behind it and is KEPT IN FULL.
- [x] Re-run the rig, fill the before/after tables in `NOTES.md`, then
      `npm run ci` and `npm run build` inside `nix develop`.

## Definition of Done

- The cluster is split, with before/after `wc -l` and comment counts for every
  touched file recorded.
  (cmd: `wc -l` and rig table in `tasks/20260731-212610/NOTES.md`; red on base,
  where `src/game.ts` is 381 lines and `src/gameState.ts` 440, and none of
  `src/shareText.ts`, `src/puzzleKey.ts`, `src/game/` exists)
- `gameState.ts` holds no share or puzzle-key symbol, and re-exports none of
  them.
  (cmd: `grep -nE 'formatGameStateForSharing|buildShareGrid|CLOSENESS_CELLS|
  gameStateKey|parseGameStateKey|parseSeedParam|PUZZLE_ID_MODULUS|
  getTodaySeed|export \*|export \{' src/gameState.ts` returns only the
  declarations of symbols the file still owns)
- No assertion in `test/` or `e2e/` changed. (cmd: `git diff master -- test
  e2e` shows import-path lines only, each listed in `NOTES.md`; `e2e/` is
  expected empty)
- Every surviving inline task reference in the cluster is a one-line record
  pointer or a live tracker marker.
  (cmd: `grep -rnE '//.*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/game
  src/gameState.ts src/shareText.ts src/puzzleKey.ts src/constants.ts
  src/gameData.ts`, each hit justified)
- `npm run ci` and `npm run build` pass inside `nix develop`. (cmd: both)

## Close-out

**What and why.** `src/gameState.ts` (440) and `src/game.ts` (381) each held
several unrelated jobs, which is the `AGENTS.md` `## File size` trigger.
`gameState.ts` shed `src/puzzleKey.ts` (seed and storage-key arithmetic) and
`src/shareText.ts` (the share message and its emoji tables), keeping the round
and its persistence. `src/game.ts` became `src/game/`: `index.ts` keeps the
element lookup, `updateUI`, the guess path and the wiring; `hintChip.ts`,
`onboardingBrief.ts` and `shareButton.ts` take one job each. Boundaries and the
four judgement calls behind them are in `DECISION.md`; measurements in
`NOTES.md`.

**Alternatives.** Re-exporting the moved symbols from `gameState.ts` would have
confined the diff to this cluster, and was rejected: a file that still exports
the share formatter still reads as the file that holds it, which is the exact
thing the epic is trying to end. Extracting `submitGuess` too was rejected -
it and `updateUI` are mutually recursive by design (the `finally` ordering
spans both), so separating them needs callbacks in both directions to express
one rule.

**Difficulties.** The plan's importer grep excluded lines matching
`gameStateKey`, meant to filter `SavedGameState`, and so hid a real hit in
`test/gameStats.test.ts`. Jest caught it; the fix was to re-run the sweep with
no symbol filter at all, which is what `NOTES.md` records. Separately, the plan
told this task to compact the 14-line brief-mount comment, and reading the two
`DECISION.md` files it points at showed neither records the layout reason. The
policy's case 2 governs: compact only towards an existing record, so it was
kept in full and only its dead first clause removed.

**Evidence.** `npm run ci` exit 0, `npm run build` exit 0, both inside
`nix develop`; 291 Jest tests and 126 Playwright tests pass. `e2e/` is
untouched; `test/` is 7 files, +15/-11, entirely import lines - verified by
filtering imports out of `git diff master -- test e2e` and finding nothing
left. All 8 surviving task references in the cluster are one-line record
pointers attached to a stated constraint. Largest file in the cluster: 440
lines before, 230 after.

**Reflection.** The line total ROSE 17 across the cluster. That is what a split
costs - each file pays for its own import block - and it is worth siblings
knowing before they measure themselves against a line-reduction target that
this pass does not actually promise. The number that moved is the largest file,
not the total. Also worth carrying: checking whether a record actually contains
the rationale, before compacting a comment towards it, changed the answer twice
in one file.
