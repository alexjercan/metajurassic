# Make the generated content graph deterministically ordered

- PRIORITY: 35
- TAGS: chore, content, tooling
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As someone regenerating the content graph, I want `index.json` to come out in a
stable order, so that a one-line content edit produces a one-line diff no matter
which machine ran the script.

## Context

Found while doing `20260729-092352`. `scripts/markdown_to_json.py` builds its
dicts by iterating `os.listdir`, which returns directory order - arbitrary, and
different across filesystems and after any file churn. The committed
`index.json` happens to be in one such order today.

Sorting was tried in that task and immediately reverted: it reshuffled the whole
file, turning a 150-line content repair into a 1886-line diff that nobody could
review. The reorder is worth doing, but it has to land as its own change whose
diff is ONLY the reorder.

## Steps

Two commits, in this order. The regeneration is its own commit whose diff is
only `src/jurassic/index.json`; nothing else may ride along.

- [ ] Add `MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order` to
      `scripts/test_content_pipeline.py`. Write several species and clade `.md`
      files in deliberately non-alphabetical creation order into the existing
      `self.content` fixture, run `self.generate()`, and assert
      `list(data["species"])` and `list(data["clades"])` each equal their
      `sorted()`. Confirm it fails before the next step: sortedness is
      otherwise enforced only by convention (see `DECISION.md`).
- [ ] In `scripts/markdown_to_json.py:122-131`, iterate `sorted(os.listdir(path))`
      in `load_directory` and replace the lines 123-126 comment (which defers
      the sort to this task) with one naming the invariant. Confirm
      `scripts/json_to_markdown.py` needs no matching change: it writes one file
      per id and never depends on dict order.
- [ ] Fix the now-stale comment at `test/contentSource.test.ts:102-103`
      ("directory order vs sorted") - both sides are sorted now; keep the note
      that `toEqual` compares structurally.
- [ ] Commit those three edits. `src/jurassic/index.json` stays untouched in
      this commit.
- [ ] Regenerate: `python3 scripts/markdown_to_json.py`. Verify the result is a
      pure reorder with the DoD proof, not by eye. `commontree-metajurassic.json`
      is rewritten as a byproduct and is gitignored. Commit `index.json` alone.
- [ ] Run `npm run ci` and confirm nothing asserts a seed-to-species mapping.
      Grep showed no test hardcodes a species for a given seed
      (`test/seedMode.test.ts:94,125` derive the target through
      `speciesIndexForDate`), so the one-time daily-answer shift breaks no test;
      the suite run is the proof.

## Definition of Done

- The committed graph is in sorted key order, both sections. (cmd: `python3 -c "import json;d=json.load(open('src/jurassic/index.json'));assert all(list(d[k])==sorted(d[k]) for k in ('species','clades'))"`)
- The branch's `index.json` change is a pure reorder: every field value identical to master's, key order different in both sections. Branch-scoped - run before landing. (cmd: `python3 -c "import json,subprocess as s;o=json.loads(s.run(['git','show','master:src/jurassic/index.json'],capture_output=True,text=True,check=True).stdout);n=json.load(open('src/jurassic/index.json'));assert o==n,'values changed';assert all(list(o[k])!=list(n[k]) for k in ('species','clades')),'no reorder'"`)
- A regression that reintroduces unsorted output fails the suite. (cmd: `python3 scripts/test_content_pipeline.py MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order`)
- `npm run ci` passes. (cmd: `npm run ci`)
