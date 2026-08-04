# Guard the sorted graph invariant beyond the generator

- PRIORITY: 25
- TAGS: chore, content, testing
- KIND: TASK
- ACTIVITY: UNDERSTANDING
- GATES: -
- RESOLUTION: -

## Story

As a maintainer of the content pipeline, I want the sorted-graph invariant
guarded where it can actually rot, so that a filesystem quirk or a hand-edited
payload fails a check instead of passing one.

## Context

Round 1 of `20260730-120355` approved the reorder with four open findings, all
MINOR or NIT. They share a theme: the invariant is enforced at the generator
and nowhere else. See `tasks/20260730-120355/REVIEW.md` R1.1-R1.4.

## Steps

- [ ] R1.1 `scripts/test_content_pipeline.py:162` - the new test's premise is
      that `os.listdir` returns the fixture files unsorted, but listdir order
      is filesystem-determined, not creation order. Assert the premise before
      `self.generate()` for both the species and clades dirs, and reword the
      comment to say the premise is asserted rather than assumed.
- [ ] R1.2 `test/contentSource.test.ts:102` - nothing in `npm run ci` asserts
      the COMMITTED `src/jurassic/index.json` is sorted. Add a key-order
      assertion for `species` and `clades` beside the existing `toEqual`; the
      test already holds both sides.
- [ ] R1.3 `tasks/20260730-120355/DECISION.md:50` and `NOTES.md:92` claim a
      player mid-round on deploy day gets a target swap. `saveGameState` writes
      `targetId` and `loadGameState` restores it (`src/gameState.ts:64,93`), so
      a saved round keeps its original target. Records are append-only, so
      correct this forward in this task's DECISION.md rather than editing
      theirs.
- [ ] R1.4 `AGENTS.md:24` - record the invariant on a doc surface outside
      `tasks/`: extend the `src/jurassic/index.json` row to name the sorted key
      order and that it picks the daily answer.

## Definition of Done

- The pipeline test fails loudly when its unsorted-listdir premise does not
  hold. (cmd: `python3 scripts/test_content_pipeline.py MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order`)
- A committed payload in unsorted key order fails the Jest suite. (cmd: `npx jest test/contentSource.test.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)
