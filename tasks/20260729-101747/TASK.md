# Fix puzzle key round-trip off-by-one breaking profile dates and streaks

- PRIORITY: 92
- TAGS: bug, testing
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a daily player checking my profile, I want game history, dates, and streaks computed from the games I actually played, so that my stats are trustworthy.

## Review Findings

- `parseGameStateKey` does not invert `gameStateKey`: `formatPuzzleId` maps seed 1 to key `dinosaur-#00002`, but parsing that key returns seed 2 (`src/gameState.ts:12-47`).
- `loadAllGames` dates daily results with `seedToDate(parsed.seed)` (`src/gameStats.ts:161`), so every daily game in the profile is dated one day late.
- The current-streak check in `calculateStreak` consequently counts a win from two days ago as still active.
- The unit tests assert parse in isolation and never round-trip format-then-parse (`test/gameState.test.ts:349-381`), so the suite encodes the bug: 114 green tests, wrong behavior.
- Parsing also drops the modulo, so practice seeds above 100000 cannot round-trip; harmless today because practice stats use the stored `createdAt`, but worth normalizing while here.

## Steps

- [x] Decide the canonical key format (keep or drop the +1 display offset) and make format/parse exact inverses; prefer whichever keeps existing saved keys valid. Kept the +1 offset, fixed parse to invert it (DECISION.md).
- [x] Migrate or tolerate existing localStorage keys so players do not lose history. No migration needed: keys on disk were written by `format`, and the corrected `parse` recovers their true seed. The only key string that changed (residue 99999) was previously an invalid 6-digit key already rejected by the parse regex.
- [x] Add a round-trip property test: for a range of seeds and both modes, `parseGameStateKey(gameStateKey(seed, mode))` returns the original seed and mode. (test/gameState.test.ts round-trip block, incl. modulus edge + negative seed)
- [x] Add a profile dating regression test: a game saved for seed N appears in `loadAllGames` dated `seedToDate(N)`. (test/gameStats.test.ts round-trip regression block, via `saveGameState`)
- [x] Add streak regression tests: a win two days ago is not a current streak; a win yesterday or today is. (test/gameStats.test.ts, daily mode, seeds anchored to the profile's own `seedToDate`)

## Definition of Done

- Round-trip property test passes over a seed range including the modulo edge. (test: Jest property test)
- Profile dates match played dates. (test: Jest loadAllGames test)
- Current streak covered for today/yesterday/older cases. (test: Jest streak tests)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Fix the seam with a test that crosses it, not just the constant. This bug is the canonical example of isolated unit tests missing a format/parse seam; the lesson belongs in LESSONS.md when this closes.
- Discovered mid-fix: `seedToDate`/`dateToSeed` are not clean inverses at local midnight across a DST boundary, so daily profile dates drift by a day for half the year. Out of scope here; filed as follow-up task 20260729-122943. The streak tests anchor to `seedToDate` to stay robust to that drift.

## Decision

Keep the `+1` human display offset in `formatPuzzleId`; fix `parseGameStateKey`
to be its exact inverse (see DECISION.md). This keeps existing saved
localStorage keys valid with no migration. Both sides wrap by the 10^5 modulus
so the residue-99999 edge round-trips and negative practice seeds normalize.
