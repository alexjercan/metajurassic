# Review: Randomize the daily puzzle sequence

## Round 1 - out-of-context reviewer - APPROVE (with cleanups)

Verdict: **APPROVE.** No blocking or major defects. Algorithm verified
empirically against the real `src/jurassic/index.json` (N=150): mulberry32
matches the canonical reference bit-for-bit and stays in exact 32-bit space
(`Math.imul` / `| 0` / `>>> 0`), so the mapping is deterministic and portable
across engines/devices and offline; Fisher-Yates has no off-by-one
(`rand() < 1` always, so `floor(rand()*(i+1)) in [0,i]`); full coverage
confirmed; negative-seed normalization correct (`-1 -> 149`); cache built once
and memoized on a `readonly` species list; retroactive remap safe because saved
games persist `targetId`; `dateToSeed`/`seedToDate` untouched.

Findings to address (non-gating):

- MINOR: the design note overstates "salt tuned against real file clade
  ordering". The adjacency property is purely positional (a function of N and
  the salt), independent of the taxonomy at those positions; the reviewer
  confirmed `index.json` is not taxonomically sorted anyway. Fix the wording in
  `DECISION.md` and the code comment so the rationale is accurate.
- MINOR: the "does not walk file in insertion order" test asserts
  `count(perm[s] === s % N) < N`, which any non-identity permutation trivially
  satisfies (measured count is 1). Redundant with the strong adjacency test.
  Strengthen it (assert a small bound) or drop it.
- NIT: the production adjacency/coverage guarantee is only pinned for a dummy
  N=150 list. If the real species list ever changes size, the salt's adjacency
  property is not guaranteed and no test guards it. Add a test that loads the
  real game data and re-runs adjacency/coverage on the real N (and pins
  `species.length === 150`), so a future species-list edit that breaks the salt
  fails CI.

## Round 1 resolution

All three addressed on the branch (see round-2 verify below):

- DECISION.md + code comment reworded to describe the positional adjacency
  property accurately (no taxonomic-tuning claim).
- Insertion-order test tightened to assert the count is `<= 3`.
- Added a "real game data" test that builds `GameData` from the actual
  `src/jurassic/index.json`, pins `species.length === 150`, and re-runs the
  adjacency and coverage checks on the real N so any future species-list change
  that breaks the salt fails CI.
