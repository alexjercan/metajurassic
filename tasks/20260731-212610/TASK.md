# KISS pass: core game loop (game.ts, gameState.ts, share text)

- STATUS: OPEN
- PRIORITY: 70
- TAGS: refactor,gameplay
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
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

- [ ] Follow the rules from the policy task; do not re-derive them.
- [ ] Split the share formatter out of `gameState.ts` into its own module
      (`ShareStats`, `buildShareGrid`, `formatStatsLine`, `shareMessage`,
      `formatGameStateForSharing`, the cell tables). It shares nothing with the
      persistence code but the `GameState` type. Re-export or update imports;
      `src/ui/share.ts` is the transport and stays separate.
- [ ] Consider splitting the seed/puzzle-key arithmetic (`getTodaySeed`,
      `parseSeedParam`, `gameStateKey`, `parseGameStateKey`,
      `PUZZLE_ID_MODULUS`) from the `GameState` class and its load/save. Record
      the boundary chosen, or why one file is still right.
- [ ] Break `initGame` into named units in their own module(s): the guess
      submission path, the hint chip and hint purchase, the onboarding brief,
      and the share button. Move code; do not invent a widget abstraction for a
      single caller.
- [ ] Compact the comments in both files plus `constants.ts` and `gameData.ts`.
      The DECISION-reproducing essays become one constraint line plus the
      record pointer. Keep the guards - `canUseHint` vs `canAffordHint`, the
      `finally`-ordering note, the brief-as-flex-sibling reason - in compacted
      form.
- [ ] Prove no behaviour moved: the test and E2E suites are untouched by this
      task and stay green.

## Definition of Done

- `src/game.ts` and `src/gameState.ts` are each materially smaller, with the
  before/after `wc -l` of every file in the cluster recorded.
  (cmd: `wc -l` table in the task record)
- No assertion in `test/` or `e2e/` changed. (cmd: `git diff test e2e` is
  empty, or contains only import-path edits, each listed)
- Every surviving inline task reference in the cluster is a one-line record
  pointer or a live tracker marker.
  (cmd: `grep -nE '//.*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/game.ts
  src/gameState.ts src/constants.ts src/gameData.ts`)
- `npm run ci` and `npm run build` pass. (cmd: both)
