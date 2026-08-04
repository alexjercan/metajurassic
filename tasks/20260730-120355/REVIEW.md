# Review: Make the generated content graph deterministically ordered

- TASK: 20260730-120355
- BRANCH: chore/deterministic-content-graph-order

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) scripts/test_content_pipeline.py:162 - the comment claims
  writing the fixture files "in deliberately non-alphabetical order" stops
  directory order passing by accident, but `os.listdir` order is
  filesystem-determined (ext4 htree hash, tmpfs link order), not creation
  order. On a filesystem that happens to return those names sorted the test
  goes vacuously green and stops guarding. Assert the premise before
  `self.generate()` - `self.assertNotEqual(os.listdir(d), sorted(os.listdir(d)))`
  for the species and clades dirs - and reword the comment to say the premise
  is asserted, not assumed.
  - Response:
- [ ] R1.2 (MINOR) test/contentSource.test.ts:102 - nothing in `npm run ci`
  asserts the COMMITTED `src/jurassic/index.json` is in sorted key order. The
  new pipeline test only covers the generator's tmpdir output, and DoD proof 1
  is a one-shot command. A payload committed unsorted (stale artifact, bad
  merge resolution, hand edit) keeps CI green while the invariant this task
  exists to establish is gone. This test already holds both sides: add
  `expect(Object.keys(committed.species)).toEqual([...Object.keys(committed.species)].sort())`
  and the same for `clades`, beside the existing `toEqual`.
  - Response:
- [ ] R1.3 (MINOR) tasks/20260730-120355/DECISION.md:50 - "A player mid-round
  on deploy day gets a target swap; their saved guesses persist" contradicts
  the code. `saveGameState` writes `targetId` and `loadGameState` restores
  `parsed.targetId` (src/gameState.ts:64,93), so a player with saved state
  keeps the ORIGINAL target; only rounds not yet started see the shift. Same
  wording at tasks/20260730-120355/NOTES.md:92. Add a correcting line to the
  TASK.md Close-out noting `targetId` is persisted.
  - Response:
- [ ] R1.4 (NIT) AGENTS.md:24 - the `src/jurassic/index.json` row says only
  "Generated runtime graph. Never hand-edit."; the new invariant is recorded on
  no doc surface outside `tasks/`. Extend to "Generated runtime graph, keys
  sorted by id (that order picks the daily answer). Never hand-edit."
  - Response:

Verification by the recording pass, independent of the out-of-context
reviewer:

- All four DoD proofs run here, each on its own criterion: sortedness holds on
  both sections; the branch payload parses equal to master's with both key
  orders changed; the new pipeline test passes; `npm run ci` exits 0 with 406
  Jest and 183 Playwright tests - the exact numbers the Close-out claims. No
  `manual:` proofs exist, so there are no pending user checks.
- R1.3 re-derived from source, not from the reviewer's report: `src/gameState.ts`
  persists `targetId` in `saveGameState` and passes `parsed.targetId` to the
  restored `GameState`, so the mid-round swap the decision reasoned about
  cannot happen for a saved round.
- The reviewer confirmed red-without-fix (the new test fails on the species key
  list with `sorted()` reverted), byte-identical regeneration, the two-commit
  shape (87bad15 code/test/comments, 62ba2cc payload alone), and re-derived
  every repointed fixture from the payload independently. No `toEqual` was
  weakened to `toContain` and no count was dropped.
- Process signal: the plan said two commits; a third (72b8802) was needed for
  14 order-pinned fixtures that the plan's seed-only grep missed. Recorded
  honestly as an unplanned step with its own reflection, so this is a
  planning-depth note, not a defect.
