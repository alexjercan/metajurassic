# Guard the sorted graph invariant beyond the generator

- PRIORITY: 25
- TAGS: chore, content, testing
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a maintainer of the content pipeline, I want the sorted-graph invariant
guarded where it can actually rot, so that a filesystem quirk or a hand-edited
payload fails a check instead of passing one.

## Context

Round 1 of `20260730-120355` approved the reorder with four open findings, all
MINOR or NIT. They share a theme: the invariant is enforced at the generator
and nowhere else. See `tasks/20260730-120355/REVIEW.md` R1.1-R1.4.

No behavior change. Four maintainer-facing guards; the generator
(`scripts/markdown_to_json.py:128`) is already correct and is not touched, nor
is `src/` or `src/jurassic/index.json`.

## Steps

- [ ] R1.1 In `test_sorts_ids_regardless_of_creation_order`
      (`scripts/test_content_pipeline.py:157`), assert the premise before
      `self.generate()`: for each of `species` and `clades` under
      `self.content`, `assertNotEqual(entries, sorted(entries), <message
      naming the lost premise>)`. Reword the existing comment so it says the
      premise is asserted, not assumed.
- [ ] R1.2 In `test/contentSource.test.ts`, inside "regenerates index.json
      exactly", add beside the existing `expect(fromSource).toEqual(committed)`
      a key-order assertion on the COMMITTED payload for both `species` and
      `clades`: `expect(Object.keys(committed.X)).toEqual([...Object.keys(
      committed.X)].sort())`. Replace the "Both sides are sorted by id now"
      comment with one saying `toEqual` is order-blind and index.json key order
      picks the daily answer. Oracle choice is settled in DECISION.md - assert
      against a sorted copy of the committed keys, not against `fromSource`.
- [ ] R1.3 Write `tasks/20260804-123559/DECISION.md` with two entries: the R1.2
      oracle choice, and the forward correction of `20260730-120355`
      `DECISION.md:50` / `NOTES.md:92` - `saveGameState` writes `targetId`
      (`src/gameState.ts:93`) and `loadGameState` restores `parsed.targetId`
      (`src/gameState.ts:65`), so a mid-round player keeps their target across
      a deploy; only a player with no saved round yet sees the new target,
      which is indistinguishable from a normal day. Do not edit
      `20260730-120355`'s records - they are append-only.
- [ ] R1.4 In `AGENTS.md:24`, extend the `src/jurassic/index.json` repository
      map row to name the invariant: `species` and `clades` are in sorted id
      order, and that order picks the daily answer, so a re-order re-points
      every puzzle.
- [ ] Run the three DoD proofs; the first two must flip from red to green.

## Definition of Done

- The pipeline test fails loudly, rather than passing vacuously, when its
  unsorted-listdir premise does not hold. Verified by forcing a sorting
  `os.listdir` in the test process; red on base (test still passed), green
  when the premise is asserted.
  (cmd: `python3 -c "import os,sys,unittest; sys.path.insert(0,'scripts'); import test_content_pipeline as t; r=os.listdir; t.os.listdir=(lambda p: sorted(r(p))); s=unittest.TestLoader().loadTestsFromName('MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order',t); sys.exit(0 if not unittest.TextTestRunner().run(s).wasSuccessful() else 1)"`)
- A committed payload in unsorted key order fails the Jest suite. Verified by
  reversing the key order of `src/jurassic/index.json`, running the suite, and
  restoring the file; red on base (Jest passed), green with the assertion.
  (cmd: `bash -c 'cp src/jurassic/index.json /tmp/ij.bak && python3 -c "import json,collections as c; p=\"src/jurassic/index.json\"; d=json.load(open(p),object_pairs_hook=c.OrderedDict); d.update({k:c.OrderedDict(reversed(list(d[k].items()))) for k in (\"species\",\"clades\")}); json.dump(d,open(p,\"w\"))" && ! npx jest test/contentSource.test.ts; rc=$?; cp /tmp/ij.bak src/jurassic/index.json; exit $rc'`)
- `AGENTS.md` names the sorted-key-order invariant and its effect on the daily
  answer on the `src/jurassic/index.json` row. (manual: read `AGENTS.md:24`)
- The unmodified suites still pass and the tree is clean after the proofs.
  (cmd: `npm run ci && git status --porcelain`)
- `tatr check` is clean. (cmd: `tatr check 20260804-123559`)
