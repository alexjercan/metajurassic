# Retro: Randomize the daily puzzle sequence

- TASK: 20260729-101740
- DATE: 20260729
- OUTCOME: shipped. Seeded Fisher-Yates permutation replaces the `seed % N`
  daily pick. Reviewed out-of-context (APPROVE, round 1), two MINOR + one NIT
  addressed, `npm run ci` green (122 tests).

## What this was

A gameplay-integrity bug: `GameData.speciesIndexForDate` returned
`seed % species.length`, so the daily answer walked `src/jurassic/index.json`
in file-insertion order. Tomorrow was literally the next file entry (the whole
150-day schedule was glanceable in the public repo) and consecutive days could
land on file-neighbors. The fix maps the seed through a cached Fisher-Yates
permutation of `[0, N)` seeded by a fixed salt (`0x9e3779b9`), so consecutive
days are non-adjacent, coverage over a cycle is a true bijection, and the
mapping stays a pure deterministic function of the seed (same target on every
device, offline). `dateToSeed`/`seedToDate` were left untouched.

## What went well

- Test-first worked cleanly: the adjacency and insertion-order tests went red
  on the modulo impl for the right reason, then green after the permutation, so
  the tests demonstrably catch the bug rather than just re-encoding the fix.
- The two load-bearing forks (permutation algorithm; retroactivity) were
  settled in a DECISION.md at the plan gate. Retroactive remap is safe because
  saved games persist `targetId`, which the review independently confirmed.
- The out-of-context reviewer added real value: it verified mulberry32 against
  the canonical reference bit-for-bit and empirically re-ran adjacency/coverage
  against the real `index.json`, and it caught that the adjacency guarantee is
  positional (count + salt only), not taxonomic as the design note implied.

## What went wrong / difficulties

- **`node_modules` symlink leaked into the first branch commit.** A sprout
  worktree has no `node_modules`, so I symlinked the main checkout's. Then
  `git add -A` staged the symlink: `.gitignore` has `node_modules/` with a
  trailing slash, which matches a directory but NOT a symlink named
  `node_modules`. Caught it in the commit stat and fixed with
  `git rm --cached`, then added specific paths for later commits.
- **First-pass tests only exercised a dummy 150-species list.** The adjacency
  property is positional so the dummy proves the algorithm, but the *production*
  guarantee (zero adjacency for the real count) was unpinned - a future
  species-list resize could break the salt silently. The reviewer's NIT was
  right; added a test that builds `GameData` from the real `index.json` and
  pins `length === 150` plus adjacency/coverage on the real N.
- **Toolchain discovery cost.** `node`/`npm` are not on PATH here; the JS
  toolchain comes from the nix devShell (`flake.nix`, `pkgs.nodejs`). Ran the
  check suite via a nix-store `node` bin plus a `node_modules` symlink into the
  worktree, which is what led to the leak above.

## What to do differently next time

- In a sprout worktree that needs `node_modules`, either add an ignore entry for
  the bare `node_modules` symlink or never `git add -A` - stage explicit paths.
  Verify the commit stat has no stray `node_modules` entry before moving on.
- When a property is claimed to hold for the shipped data, pin it against the
  REAL payload, not just a same-sized fixture, so a data edit fails CI.
- Record the JS toolchain entrypoint (nix devShell / `nix develop -c`) up front
  so the check suite is runnable without re-deriving it.

## Lessons (folded into LESSONS.md)

- `sprout-worktrees-have-no-node_modules-dont-git-add-all` - the symlink
  workaround leaks past `node_modules/` gitignore because the rule's trailing
  slash does not match a symlink; stage explicit paths.
- `pin-shipped-invariants-against-the-real-payload` (reinforces the existing
  `mock-fixtures-hide-real-data-defects-test-the-real-payload`): a positional
  property proven on a same-sized dummy still leaves the real-count invariant
  unpinned; assert against the real `index.json`.
- `metajurassic-js-toolchain-lives-in-the-nix-devshell` - `node`/`npm` are not
  on PATH; use the `flake.nix` devShell (or a nix-store node + a node_modules
  symlink) to run `npm run ci`.
