# Fix DST drift in seedToDate/dateToSeed shifting daily profile dates

- STATUS: OPEN
- PRIORITY: 80
- TAGS: bug,testing

## Story

As a daily player, I want my profile to date each game on the calendar day I
actually played it, so streaks and history stay correct year-round.

## Problem

`dateToSeed` and `seedToDate` (`src/gameData.ts`) are not clean inverses at
local midnight across a DST boundary. `FIRST_DAY` is `new Date(2026, 0, 1)`
(winter, e.g. UTC+2), but `seedToDate(seed) = FIRST_DAY + (seed-1)*86400000`
advances in fixed 24h UTC-equivalent steps. Once the local zone shifts to
summer time (e.g. UTC+3), `seedToDate(dateToSeed(todayMidnight))` lands on the
PREVIOUS calendar day at 01:00 instead of today.

Observed 2026-07-29 (EEST): `getTodaySeed()` = 209, but `seedToDate(209)` is
`Jul 28 01:00`, so `loadAllGames` dates today's daily game as yesterday. This
shifts every daily profile date by one day for half the year and can move a
current streak off "today".

Discovered while fixing 20260729-101747 (puzzle-key round-trip). That fix's
streak tests anchor to `seedToDate` to stay robust to this drift; this task is
the drift itself.

## Steps

- [ ] Add a failing test: for a range of calendar days spanning a DST
      transition, `seedToDate(getTodaySeed())` floored to local midnight equals
      that day's midnight.
- [ ] Make seed<->date arithmetic DST-stable (e.g. compute whole-day
      differences in local time, or anchor both ends to UTC midnight
      consistently) so format/parse of the calendar day round-trips all year.
- [ ] Re-check `loadAllGames` dating and `calculateStreak` against the fix.

## Definition of Done

- seedToDate(dateToSeed(day)) lands on `day` across a DST boundary. (test: Jest)
- `npm run ci` passes. (cmd: `npm run ci`)
