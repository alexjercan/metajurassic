# Split e2e/helpers.ts into focused helper modules

- STATUS: OPEN
- PRIORITY: 60
- TAGS: refactor,testing,e2e
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

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

- [ ] Follow the rules from the policy task, with the test-comment carve-out:
      a comment stating why an assertion is shaped as it is, or which mutation
      it must reject, is a KEEP.
- [ ] Split `e2e/helpers.ts` into focused modules along the seams above. Keep a
      re-export barrel only if the spec import churn is otherwise large; prefer
      updating imports. Record the split boundaries.
- [ ] Give each exported helper a one-line docstring stating its promise, and
      delete the narration that a docstring replaces.
- [ ] Compact the essays in `e2e/mobile.spec.ts` (248 comment lines) and the
      other specs. Preserve every "this must fail when X is reverted" note -
      those are the ledger's non-vacuity discipline in the code.
- [ ] Change no assertion anywhere. Moving a helper between files is allowed;
      changing what it checks is not.
- [ ] Prove it: the full E2E suite passes, and a spot-check mutation still goes
      red through the moved helpers (`LESSONS.md`:
      `verify-a-guard-fix-with-the-attack-that-defeated-it`).

## Definition of Done

- No `e2e/` file exceeds roughly 400 lines, or the exception is recorded with
  its reason. (cmd: `wc -l e2e/*.ts` before and after)
- Helper bodies are byte-identical apart from formatting and comments.
  (cmd: `git diff` reviewed statement by statement; the diff is moves plus
  comment deletions, and every non-move hunk is listed in the record)
- A recorded mutation that reddened the suite before the split still reddens it
  after, through the moved helper. (cmd: apply from a scratch copy, run, record)
- `npm run test:e2e` and `npm run ci` pass. (cmd: both)
