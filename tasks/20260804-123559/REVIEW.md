# Review: Guard the sorted graph invariant beyond the generator

- TASK: 20260804-123559
- BRANCH: chore/guard-sorted-graph-invariant

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) scripts/test_content_pipeline.py:174 - the premise guard's
  failure message names the lost premise but no remedy, so a maintainer on a
  filesystem whose `os.listdir` happens to return these seven fixture names in
  sorted order sees a permanently red `npm run ci` with no stated action.
  Append the remedy to the message, e.g. `"; rename or add fixture ids until
  os.listdir disagrees with sorted() on this filesystem"`.
  - Response:
- [ ] R1.2 (NIT) scripts/test_content_pipeline.py:177 - the message is built
  with four-line `+` concatenation while the surrounding Python
  (`scripts/markdown_to_json.py:42`, `scripts/test_content_pipeline.py:254`)
  uses f-strings and implicit adjacent-string concatenation. Replace with
  `f"premise lost: os.listdir already reports {kind} in sorted order, so this
  test cannot tell a sorting generator from a directory-order one"` split
  across adjacent string literals.
  - Response:

Severity note on R1.1: the out-of-context reviewer filed it MINOR on a claimed
~20% chance that ext4 htree order equals sorted order for this fixture set.
The recording pass re-derived that claim empirically - 600 fresh `mkdtemp`
directories on this repository's ext4 volume, populated with the exact fixture
names, produced zero sorted listings. The htree hash seed is per-filesystem, so
the risk is not refuted on other machines, but it is not the routine outcome
the MINOR severity implied. The finding is a message-wording improvement that
changes no behavior, so it is recorded as a NIT.

Verification performed by the recording pass, independent of the reviewer:

- Proof 1 (forced sorting `os.listdir`): rc=0. The run fails on the new
  `assertNotEqual` with the premise-lost message, which is the stated criterion.
- Proof 2 (reversed committed key order): rc=0. Jest reports `1 failed, 8
  passed` with the failure at `test/contentSource.test.ts:110`. This is the
  load-bearing claim re-derived rather than accepted: the order-blind
  `expect(fromSource).toEqual(committed)` on line 101 still passes against the
  reversed payload, so the new key-order assertion is the only thing that
  catches the defect. `src/jurassic/index.json` was restored by the proof and
  the tree is clean.
- `npm run ci`: rc=0 - format, eslint, pipeline test, Jest coverage, 184
  Playwright tests passed.
- `git status --porcelain`: empty. `tatr check 20260804-123559`: rc=0.
- Steps re-read literally against the diff. R1.1 asserts the premise for both
  `species` and `clades` before `self.generate()` and the comment now says the
  premise is asserted rather than assumed. R1.2 asserts the committed keys
  against a sorted copy of themselves for both maps and replaces the "Both
  sides are sorted by id now" comment. R1.3 `DECISION.md` carries both the
  oracle choice and the forward correction, and does not edit
  `20260730-120355`'s records. R1.4 `AGENTS.md:24` names the invariant and its
  effect on the daily answer.
- `DECISION.md` choice 2 checked against code: `src/gameState.ts:93` persists
  `targetId` and `src/gameState.ts:65` restores `parsed.targetId`, so the
  forward correction of `20260730-120355` is right.
- Oracle soundness: every species and clade id is lowercase ASCII, so
  JavaScript's default `.sort()` and Python's `sorted()` agree and no
  collation difference can hide an unsorted payload.

Pending user checks - open `manual:` proofs, which do not block APPROVE:

- Read `AGENTS.md:24` and confirm the `src/jurassic/index.json` row names the
  sorted-key-order invariant and its effect on the daily answer.
