# Randomize the daily puzzle sequence

- STATUS: CLOSED
- PRIORITY: 98
- TAGS: bug, gameplay, design

## Story

As a daily player, I want the mystery dinosaur to be unpredictable from day to day, so that the puzzle stays a genuine guessing game even for players who notice patterns or read the public repo.

## Review Findings

- `GameData.getRandomSpecies` picks `species[seed % species.length]` (`src/gameData.ts:78-89`) with seed = days since 2026-01-01.
- The daily answer therefore walks `src/jurassic/index.json` in file insertion order: tomorrow's answer is literally the next species in the JSON, and the whole sequence repeats every 150 days.
- The file order is partially clade-clustered, so consecutive days can be taxonomic neighbors, which leaks information between days even for players who never open the repo.
- The repo is public, so the full schedule is readable by anyone.

## Steps

- [x] Replace the modulo pick with a seeded permutation of the species list (for example a hash of the seed with a fixed salt) so consecutive seeds map to unrelated species.
- [x] Keep the mapping stable per seed: the same date must produce the same target on every device, offline included.
- [x] Decide whether already-played dates keep their old targets or the new mapping applies retroactively, and record the choice in `DECISION.md` (saved games store `targetId`, so restored games are safe either way).
- [x] Add unit tests: determinism per seed, full coverage of the species list over `species.length` consecutive seeds, and an adjacency test that consecutive seeds do not map to adjacent JSON entries.
- [x] Confirm practice mode still behaves (it shares `getRandomSpecies` with random seeds, which is fine either way).

## Definition of Done

- Consecutive dates produce non-adjacent species indices. (test: Jest adjacency test over a window of seeds)
- The mapping is deterministic across runs and devices. (test: Jest determinism test)
- Every species is still reachable over a full cycle. (test: Jest permutation coverage test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Biggest gameplay-integrity gap found in the out-of-context review; do it ahead of UX work.
- Keep `dateToSeed`/`seedToDate` untouched; only the seed-to-species mapping changes.
- The deterministic-seed URL param task must reproduce the same mapped target for a given seed.
