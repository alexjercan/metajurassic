# Guard the sorted graph invariant beyond the generator

- PRIORITY: 25
- TAGS: chore, content, testing
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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

- [x] R1.1 In `test_sorts_ids_regardless_of_creation_order`
      (`scripts/test_content_pipeline.py:157`), assert the premise before
      `self.generate()`: for each of `species` and `clades` under
      `self.content`, `assertNotEqual(entries, sorted(entries), <message
      naming the lost premise>)`. Reword the existing comment so it says the
      premise is asserted, not assumed.
- [x] R1.2 In `test/contentSource.test.ts`, inside "regenerates index.json
      exactly", add beside the existing `expect(fromSource).toEqual(committed)`
      a key-order assertion on the COMMITTED payload for both `species` and
      `clades`: `expect(Object.keys(committed.X)).toEqual([...Object.keys(
      committed.X)].sort())`. Replace the "Both sides are sorted by id now"
      comment with one saying `toEqual` is order-blind and index.json key order
      picks the daily answer. Oracle choice is settled in DECISION.md - assert
      against a sorted copy of the committed keys, not against `fromSource`.
- [x] R1.3 Write `tasks/20260804-123559/DECISION.md` with two entries: the R1.2
      oracle choice, and the forward correction of `20260730-120355`
      `DECISION.md:50` / `NOTES.md:92` - `saveGameState` writes `targetId`
      (`src/gameState.ts:93`) and `loadGameState` restores `parsed.targetId`
      (`src/gameState.ts:65`), so a mid-round player keeps their target across
      a deploy; only a player with no saved round yet sees the new target,
      which is indistinguishable from a normal day. Do not edit
      `20260730-120355`'s records - they are append-only.
- [x] R1.4 In `AGENTS.md:24`, extend the `src/jurassic/index.json` repository
      map row to name the invariant: `species` and `clades` are in sorted id
      order, and that order picks the daily answer, so a re-order re-points
      every puzzle.
- [x] Run the three DoD proofs; the first two must flip from red to green.

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

## Close-out

What and why. Four maintainer-facing guards, no behavior change. The pipeline
test now asserts its own premise (`os.listdir` returns the four species and
four clade files in non-alphabetical order) instead of assuming it, so a
filesystem that sorts turns the test red rather than letting it pass without
distinguishing a sorting generator from a directory-order one.
`test/contentSource.test.ts` now asserts the COMMITTED `index.json` key order,
which `toEqual` cannot see; DECISION.md records the oracle choice and corrects
the earlier task's target-swap claim; `AGENTS.md:24` names the invariant where
a maintainer meets the file.

Alternatives. Recorded in DECISION.md: comparing key order between
`fromSource` and `committed` (rejected - both sides sorted by construction, so
it could not fail), and a runtime sortedness check in `src/jsonLoader.ts`
(rejected - moves a build-time content invariant into shipped code and surfaces
the failure to players).

Difficulties and diagnosis. None material. The R1.3 claim was verified against
the code before it was written down rather than copied from the plan:
`src/gameState.ts:93` writes `targetId` into the persisted record and
`src/gameState.ts:65` restores `parsed.targetId`, so the earlier records'
"mid-round player gets a target swap" is wrong. The worktree needed
`npm install` before Jest could resolve the `ts-jest` preset.

Evidence. Both `cmd:` proofs were run on the base commit first and were red
there (proof 1: the forced-sorting run still passed, rc=1; proof 2: the
reversed payload still passed Jest, rc=1). After the change both are green
(rc=0), proof 1 failing with the premise-lost message and proof 2 failing on
`test/contentSource.test.ts:110`. `npm run ci` is green end to end (Jest plus
184 Playwright tests), `git status --porcelain` shows only this task's files,
`tatr check 20260804-123559` is clean. The `manual:` proof (`AGENTS.md:24`)
stays pending for review.

Reflection. The R1.2 oracle was the only real decision here, and it is the
kind that silently produces a green-but-useless test: asserting `fromSource`
key order against `committed` key order would have looked like a guard while
being unable to fail, because `readSource` already sorts. Worth remembering
that when a test builds its own expected value, the expected value has to be
independent of the property under test.
