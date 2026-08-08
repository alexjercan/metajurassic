# Split e2e/helpers.ts into focused helper modules

- STATUS: CLOSED
- PRIORITY: 60
- TAGS: refactor, testing, e2e

## Story

As a maintainer writing an E2E test, I want to import the two helpers I need
without loading a 1409-line file, so that the assertion helpers stay findable
and their contracts stay readable.

## Problem

`e2e/helpers.ts` is the largest TypeScript file in the repo: 1409 lines, 430 of
them comments, 38 top-level symbols. It spans at least five unrelated jobs -
guess and play flows, tree node visibility and reachability geometry, scroll
and touch simulation, modal fit and reachability, and content/state seeding.
`expectModalFitsViewport` alone spans ~250 lines with `scrollModalTo` and
`expectActionsReachable` beside it.

The comment density here is mostly the good kind: it records why an assertion is
the assertion (see `tasks/20260730-111003`). This task splits the file and
compacts only genuine narration; it does not thin out contract documentation.

## Steps

- [x] Stand up the parser rig from `tasks/20260731-212557/NOTES.md` and validate
      it BOTH ways before use: against two landed sibling tables and against
      this task's own `e2e/` baseline. Record the validation in NOTES.md.
- [x] Move `e2e/helpers.ts` into `e2e/helpers/`, eight modules, no barrel:
      `guessing.ts`, `content.ts`, `rounds.ts`, `tree.ts`, `arena.ts`,
      `panel.ts`, `modal.ts`, `viewport.ts`. Boundaries and the symbol->module
      map go in DECISION.md.
- [x] Update the 11 importing specs' import lines only. List every edited line
      in NOTES.md; no other change to a spec's body in this step.
- [x] Comment pass over the eight new modules and over `e2e/mobile.spec.ts`
      plus the other specs, under `AGENTS.md` `## Comments` with no extra
      brevity rule. For EVERY keep and every compaction, grep `tasks/` on the
      comment's subject AND on the literal symbol name, read every record KIND
      found, and record the evidence. Compact only towards a DECISION.md,
      SPIKE.md or NOTES.md.
- [x] Change no assertion anywhere. Moving a helper between files is allowed;
      changing what it checks is not. Helper bodies stay byte-identical apart
      from indentation and comments.
- [x] Prove it: `npm run test:e2e` and `npm run ci` inside `nix develop`, and
      the recorded mutation (`.modal` `overflow-y: auto` -> `hidden` in
      `src/style.css`, the R1.1 attack `expectActionsReachable` documents) goes
      red before AND after, through the moved helper (`LESSONS.md`:
      `verify-a-guard-fix-with-the-attack-that-defeated-it`).
- [x] NOTES.md carries: rig validation, before/after `lines / comments /
      comment lines` per file from the rig, the per-comment "what happened to
      X" table built FROM `git diff master`, and the import-line edit list.

## Definition of Done

- No `e2e/` file exceeds roughly 400 lines, or the exception is recorded with
  its reason. (cmd: `wc -l e2e/*.ts` before and after)
- Helper bodies are byte-identical apart from formatting and comments.
  (cmd: `git diff` reviewed statement by statement; the diff is moves plus
  comment deletions, and every non-move hunk is listed in the record)
- A recorded mutation that reddened the suite before the split still reddens it
  after, through the moved helper. (cmd: apply from a scratch copy, run, record)
- `npm run test:e2e` and `npm run ci` pass. (cmd: both)
