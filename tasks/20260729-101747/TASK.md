# Fix puzzle key round-trip off-by-one breaking profile dates and streaks

- STATUS: OPEN
- PRIORITY: 92
- TAGS: bug,testing

## Story

As a daily player checking my profile, I want game history, dates, and streaks computed from the games I actually played, so that my stats are trustworthy.

## Review Findings

- `parseGameStateKey` does not invert `gameStateKey`: `formatPuzzleId` maps seed 1 to key `dinosaur-#00002`, but parsing that key returns seed 2 (`src/gameState.ts:12-47`).
- `loadAllGames` dates daily results with `seedToDate(parsed.seed)` (`src/gameStats.ts:161`), so every daily game in the profile is dated one day late.
- The current-streak check in `calculateStreak` consequently counts a win from two days ago as still active.
- The unit tests assert parse in isolation and never round-trip format-then-parse (`test/gameState.test.ts:349-381`), so the suite encodes the bug: 114 green tests, wrong behavior.
- Parsing also drops the modulo, so practice seeds above 100000 cannot round-trip; harmless today because practice stats use the stored `createdAt`, but worth normalizing while here.

## Steps

- [ ] Decide the canonical key format (keep or drop the +1 display offset) and make format/parse exact inverses; prefer whichever keeps existing saved keys valid.
- [ ] Migrate or tolerate existing localStorage keys so players do not lose history.
- [ ] Add a round-trip property test: for a range of seeds and both modes, `parseGameStateKey(gameStateKey(seed, mode))` returns the original seed and mode.
- [ ] Add a profile dating regression test: a game saved for seed N appears in `loadAllGames` dated `seedToDate(N)`.
- [ ] Add streak regression tests: a win two days ago is not a current streak; a win yesterday or today is.

## Definition of Done

- Round-trip property test passes over a seed range including the modulo edge. (test: Jest property test)
- Profile dates match played dates. (test: Jest loadAllGames test)
- Current streak covered for today/yesterday/older cases. (test: Jest streak tests)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Fix the seam with a test that crosses it, not just the constant. This bug is the canonical example of isolated unit tests missing a format/parse seam; the lesson belongs in LESSONS.md when this closes.
