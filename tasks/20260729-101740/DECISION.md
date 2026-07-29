# Decision: how to map a daily seed to a species

- STATUS: ACCEPTED
- DATE: 2026-07-29

## Context

`GameData.speciesIndexForDate(seed)` currently returns `seed % species.length`
(`src/gameData.ts:78`). The species array is built from `index.json` in file
insertion order (`src/jsonLoader.ts:33`, `Object.entries`). Two harms follow:

1. The daily answer walks the file in order, so tomorrow is literally the next
   JSON entry and the whole 150-entry schedule is glanceable in the file.
2. The file is partially clade-clustered, so consecutive days land on
   taxonomic neighbors, leaking cross-day information even to players who
   never open the repo.

The repo is public and the answer is computed client-side and offline, so a
determined source-reader can always recompute the schedule from whatever
algorithm and salt we commit. That is inherent and out of scope. The two harms
above are the achievable targets: kill the glanceable file-order sequence and
guarantee consecutive days are not file-adjacent (array-adjacent positions in
the loaded species list). File adjacency is the cheap proxy the DoD names; it
matters because harm 2 lives in whatever local clustering the file has, and a
full shuffle plus a hard no-adjacent-positions guarantee removes both the
glanceable order and any such clustering. Note the adjacency property is purely
positional: it depends only on the species count and the salt, not on the
taxonomy sitting at those positions.

## Fork 1: mapping algorithm

Candidates considered:

- **Affine / multiplicative**: `index = (a*seed + b) mod N`, `gcd(a,N)=1`.
  Bijection per cycle (coverage), constant non-unit step so adjacency is
  guaranteed for all data. Rejected: a fixed step means every day is the same
  file-distance from the previous, a systematic rotation through the
  clade-clustered file; weaker scramble and coprimality is fragile if N later
  shares a factor with `a`.
- **Feistel / cycle-walking PRP**: bijection for any N, well distributed, but
  random-like so it cannot GUARANTEE non-adjacency; the strict adjacency test
  would be probabilistic. Rejected as overkill for N=150.
- **Seeded Fisher-Yates permutation (CHOSEN)**: build a permutation of
  `[0, N)` once via a deterministic PRNG (mulberry32) seeded by a fixed
  integer salt, cache it on `GameData`, and return `perm[seed mod N]`. True
  bijection (full coverage), strongest scramble (no residual arithmetic
  structure), deterministic across devices/offline. Adjacency is not
  guaranteed by construction, so the salt is chosen (small search) so that the
  shipped N=150 data has zero file-adjacent consecutive pairs over a full
  cycle, and the adjacency test pins that. If content later changes and the
  test goes red, that is a real signal to re-verify the schedule and rotate
  the salt, not a false alarm.

Decision: **seeded Fisher-Yates permutation with a fixed salt.** `dateToSeed`
and `seedToDate` are untouched; only the seed-to-index mapping changes.

## Fork 2: retroactivity of already-played dates

The mapping is a pure function of the seed with no stored schedule, so any
change necessarily remaps past dates too. This is safe: a saved game persists
its `targetId` (`src/gameState.ts` load path reads `parsed.targetId`), so every
in-progress or finished game keeps the species it was started with regardless
of the mapping. Only fresh games for a date use the new mapping, and past dates
are not normally playable anyway.

Decision: **the new mapping applies retroactively.** No migration, no
schedule freezing, no dual-mapping code. Restored games are unaffected by
construction.

## Consequence for sibling tasks

The deterministic-seed / URL-param task must call the same
`speciesIndexForDate` so a given seed reproduces the same mapped target.
