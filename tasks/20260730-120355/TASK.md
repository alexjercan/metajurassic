# Make the generated content graph deterministically ordered

- PRIORITY: 35
- TAGS: chore, content, tooling
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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

- [x] Add `MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order` to
      `scripts/test_content_pipeline.py`. Write several species and clade `.md`
      files in deliberately non-alphabetical creation order into the existing
      `self.content` fixture, run `self.generate()`, and assert
      `list(data["species"])` and `list(data["clades"])` each equal their
      `sorted()`. Confirm it fails before the next step: sortedness is
      otherwise enforced only by convention (see `DECISION.md`).
- [x] In `scripts/markdown_to_json.py:122-131`, iterate `sorted(os.listdir(path))`
      in `load_directory` and replace the lines 123-126 comment (which defers
      the sort to this task) with one naming the invariant. Confirm
      `scripts/json_to_markdown.py` needs no matching change: it writes one file
      per id and never depends on dict order.
- [x] Fix the now-stale comment at `test/contentSource.test.ts:102-103`
      ("directory order vs sorted") - both sides are sorted now; keep the note
      that `toEqual` compares structurally.
- [x] Commit those three edits. `src/jurassic/index.json` stays untouched in
      this commit.
- [x] Regenerate: `python3 scripts/markdown_to_json.py`. Verify the result is a
      pure reorder with the DoD proof, not by eye. `commontree-metajurassic.json`
      is rewritten as a byproduct and is gitignored. Commit `index.json` alone.
- [x] Run `npm run ci` and confirm nothing asserts a seed-to-species mapping.
      Grep showed no test hardcodes a species for a given seed
      (`test/seedMode.test.ts:94,125` derive the target through
      `speciesIndexForDate`), so the one-time daily-answer shift breaks no test;
      the suite run is the proof.
- [x] Unplanned, found by that suite run: 14 tests DID pin the shipped order,
      just not through a seed. Repoint them at the new order without weakening
      any of them (see close-out).

## Close-out

### What and why

`load_directory` now iterates `sorted(os.listdir(path))`, so `index.json` key
order is a property of the content, not of the filesystem. Two commits: code,
test and comments (`87bad15`), then the regenerated payload alone (`62ba2cc`),
so the ~1900-line reorder is reviewable as a movement diff.

### Difficulties and diagnosis

The plan's grep was for a seed-to-species mapping and found none, which was
correct but too narrow. Two other families of test pin the shipped order:

- Autocomplete ranking. `test/autocomplete.test.ts`,
  `test/autocompleteBlur.test.ts` and `e2e/autocomplete.spec.ts` assert exact
  suggestion lists, because both defects they pin are about ORDER (which names
  survive the truncation to 8, and which comes first). Their expectations were
  recomputed from the new payload; the "prefix group before interior group"
  property each one exists to prove is unchanged, and the comments that quote
  source order were updated with it.
- The seeded practice and pinned-daily fixtures. Seed 42 moved Struthiomimus ->
  Camarasaurus and the pinned day moved Pentaceratops -> Eoraptor, so
  `CLOSENESS_LADDER` (`e2e/helpers/rounds.ts`) was re-derived by running
  `guessTier` over every species against the new target - all five tiers are
  populated for Camarasaurus. `e2e/ladder.spec.ts` needed a genuinely
  non-deepening guess (Saltasaurus is a macronarian, deeper than the new best
  card; Tyrannosaurus meets the target at `eusaurischia`, above it), and
  `e2e/mobile.spec.ts` needed a genuinely deepening one (Triceratops meets
  Eoraptor only at the root; Brachiosaurus meets it at `sauropodomorpha`).

Every change there is a re-derivation from the payload, not a loosened
assertion: no `toEqual` became a `toContain`, and no count was dropped.

### Evidence

All four DoD proofs pass on the branch. The new pipeline test was confirmed red
on the base three times before the fix, failing on the species key list, not on
a setup error. `npm run ci` is green: 406 Jest tests, 183 Playwright tests.

### Reflection

"Grep for tests that assert X" only covers the mechanism you named. The
daily-answer shift was the consequence DECISION.md reasoned about, and it did
break nothing; what broke was every fixture that had quietly baked in the
shipped list order for an unrelated reason. Running the suite before believing
the grep would have found this in one step.

## Definition of Done

- The committed graph is in sorted key order, both sections. (cmd: `python3 -c "import json;d=json.load(open('src/jurassic/index.json'));assert all(list(d[k])==sorted(d[k]) for k in ('species','clades'))"`)
- The branch's `index.json` change is a pure reorder: every field value identical to master's, key order different in both sections. Branch-scoped - run before landing. (cmd: `python3 -c "import json,subprocess as s;o=json.loads(s.run(['git','show','master:src/jurassic/index.json'],capture_output=True,text=True,check=True).stdout);n=json.load(open('src/jurassic/index.json'));assert o==n,'values changed';assert all(list(o[k])!=list(n[k]) for k in ('species','clades')),'no reorder'"`)
- A regression that reintroduces unsorted output fails the suite. (cmd: `python3 scripts/test_content_pipeline.py MarkdownToJsonTest.test_sorts_ids_regardless_of_creation_order`)
- `npm run ci` passes. (cmd: `npm run ci`)
