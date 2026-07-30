# Fix DST drift in seedToDate/dateToSeed shifting daily profile dates

- STATUS: CLOSED
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

## Flow State

- FLOW STEP: DONE
- PLAN STATUS: APPROVED

## Steps

- [x] Add a failing test that pins a real DST zone (`Europe/Bucharest`) rather
      than the ambient one - CI runs UTC, where an ambient-tz test passes
      vacuously. (The pin had to move to a jest `globalSetup`; setting `TZ` from
      inside a spec is inert.) Assert
      `seedToDate(dateToSeed(midnight)) === midnight` for every day across the
      March and October 2026 transitions, plus the reported 2026-07-29 case.
- [x] Make seed<->date arithmetic DST-stable: `dateToSeed` diffs whole local
      calendar days, `seedToDate` returns true local midnight, so format/parse
      of the calendar day round-trips all year.
- [x] Update the hand-copied `dateToSeed` mirror in `e2e/helpers.ts`
      (`computeDailyKey`) in the same change - see LESSONS.md
      `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`.
- [x] Re-check `loadAllGames` dating and `calculateStreak` against the fix.

## Outcome

`dateToSeed`/`seedToDate` now go through the local calendar fields
(`calendarDaysBetween` in `src/gameData.ts`), so a seed counts calendar days and
`seedToDate` is always exactly local midnight. `calculateStreak` held the same
elapsed-milliseconds arithmetic in BOTH its day comparisons - it broke a streak
across the 23h spring-forward night and kept a dead streak alive across it two
days later - and now uses the same helper. The E2E hand-copy of the seed formula
moved into `e2e/dailyKeyMirror.ts` with a Jest test holding it to the real
functions.

The seed for a summer day goes up by one as a result (the reported 2026-07-29
was 209, it is now 210), which rotates the daily target forward once at deploy;
see DECISION.md.

The tests are pinned to a DST-observing zone by a jest `globalSetup`
(`test/setTimeZone.js`), because jest hands each spec a COPY of `process.env`,
so setting TZ from inside a test is silently inert - the first attempt here
passed only because this machine sits in the reported zone, and would have gone
vacuously green on CI's UTC. `expectPinnedZone()` re-asserts the zone from
inside the specs so the pin cannot go quietly missing.

## Definition of Done

- seedToDate(dateToSeed(day)) lands on `day` across a DST boundary. (test: Jest)
- Under EEST, `seedToDate(getTodaySeed())` is today's local midnight, not
  yesterday 01:00. (test: Jest)
- The `e2e/helpers.ts` mirror computes the same seed as `dateToSeed`.
  (test: Jest)
- `npm run ci` passes. (cmd: `npm run ci`)
