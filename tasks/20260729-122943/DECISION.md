# Decision: the daily seed counts LOCAL CALENDAR days

- STATUS: ACCEPTED
- DATE: 2026-07-30
- TASK: 20260729-122943

## Context

`dateToSeed`/`seedToDate` did fixed-86400000ms arithmetic from
`FIRST_DAY = new Date(2026, 0, 1)`, a winter local midnight. In a zone that
observes DST the local-midnight-to-local-midnight distance is 23h or 25h, so
the pair stopped being inverses for the summer half of the year and the profile
dated today's daily game as yesterday.

The fix has to pick which of the two functions is "right", and that choice is
not internal: it decides which dinosaur is today's.

## Options

1. **Seed = local calendar days since Jan 1 2026** (chosen). Both directions go
   through the local y/m/d fields, so they are inverses in every zone and
   season, and `seedToDate` is always exactly local midnight.
2. Keep the existing seed numbering and make `seedToDate` its exact inverse.
   Rejected: `dateToSeed` is not calendar-based, so its inverse cannot be a
   calendar day either - a game played today would still be dated an hour into
   yesterday, which is the reported symptom.
3. Anchor both ends to UTC midnight. Rejected: the day would then roll over at
   02:00/03:00 local for the reporting zone, and the story asks for "the
   calendar day I actually played it".

## Consequence (accepted, worth knowing)

For players in a DST zone during summer time, today's seed goes UP by one (the
reported 2026-07-29 was seed 209, it is now 210):

- The daily target rotates one day forward at the moment this ships. A player
  mid-round on the day of deploy gets a new puzzle key and so a fresh board;
  the old key's state is not lost, just no longer today's.
- Daily games already saved for summer days keep their old key, and the profile
  now dates them one calendar day earlier than it used to. History stays
  complete; only the labels shift.

Neither is worth a migration: the seed is a schedule index, not player data,
and the alternative is being permanently a day off in the profile.

## Follow-on

`calculateStreak` (`src/gameStats.ts`) held the same elapsed-milliseconds
arithmetic in both of its day comparisons, so it broke a streak across the
spring-forward night and kept a dead one alive across it in the other
direction. Both now use `calendarDaysBetween` from `src/gameData.ts`.
