# Retro: puzzle key round-trip off-by-one

Date: 2026-07-29

## What was delivered

`formatPuzzleId` and `parseGameStateKey` are now exact inverses. Parse's `+1`
was double-counting the display offset, so `parse(format(seed)) === seed + 1`;
daily profile dates and the current-streak check were one day late. Kept the
`+1` human display offset (existing saved keys stay valid, no migration) and
fixed parse to invert it, wrapping both sides by the 10^5 modulus so the
residue-99999 edge round-trips and negative practice seeds normalize.

Tests added that cross the seam: a format/parse round-trip property test, a
profile-dating regression through the production writer `saveGameState`, and
daily today/yesterday/older streak regressions.

## What went well

- The bug playbook paid off: writing the round-trip and streak tests FIRST and
  watching them go red (seed 7 read back as 8) aimed the fix precisely and
  proved the seam, rather than just flipping a constant.
- Choosing "keep the offset, fix parse" over "drop the offset" was the
  backward-compatible call: every localStorage key already on disk was written
  by `format`, so a corrected `parse` recovers the true seed with zero
  migration. Recorded as DECISION.md up front.
- The out-of-context review caught the one thing the author's context blinded
  them to: `e2e/helpers.ts:computeDailyKey` is a hand-copied mirror of
  `formatPuzzleId` and had silently drifted from source at the edge.

## What went wrong / difficulties

- The streak tests initially failed for a reason unrelated to the bug: I built
  "today's" seed with `dateToSeed(midnight)`, but `seedToDate(dateToSeed(x))`
  is NOT a clean inverse at local midnight across a DST boundary (FIRST_DAY is
  winter, now is summer), so the profile date drifted a day. Diagnosed by
  dumping `seedToDate(dateToSeed(day))` for a few days and seeing `Jul 28
  01:00` come back for `Jul 29`. Fixed the TEST to anchor its seeds to
  `seedToDate` (the profile's own date source) and filed the underlying drift
  as a separate task (20260729-122943) rather than widening scope.
- First CI run failed only at `test:e2e` with "Executable doesn't exist" -
  Playwright browsers are not on the ambient path; the gate must run inside
  `nix develop` (which sets `PLAYWRIGHT_BROWSERS_PATH`). Known repo fact, cost
  one wasted run; worth loading before the first CI attempt next time.

## Lessons

- Fulfills the pre-seeded lesson
  `test-must-cross-the-format-parse-seam-not-assert-each-side`: the 114 green
  tests asserted each side in isolation and encoded the very off-by-one they
  should have caught. The round-trip test is the guard.
- New candidate lesson: a hand-copied mirror of source logic (here the browser
  `computeDailyKey` mirroring `formatPuzzleId`) is a second seam that silently
  rots - when you change the original, grep for its mirrors and update them in
  the same change. To be folded into LESSONS.md by /lessons.
- New candidate lesson: `seedToDate`/`dateToSeed` round-trip is DST-fragile at
  local midnight; do not assume `seedToDate(dateToSeed(x))` returns x's day.
  Captured concretely in follow-up task 20260729-122943.

## What to do differently next time

- Run the gate inside `nix develop` from the first attempt on this repo.
- When a test needs "today/yesterday" dates that pass through a seed<->date
  conversion, anchor the fixture to the same function the code-under-test reads
  dates from, not the inverse function - the two may not round-trip.
