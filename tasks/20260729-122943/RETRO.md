# Retro: Fix DST drift in seedToDate/dateToSeed shifting daily profile dates

- TASK: 20260729-122943
- BRANCH: fix/dst-seed-date-roundtrip
- REVIEW ROUNDS: 2

## What went well

- Mutation-checking each new test paid for itself twice before review. The
  daily-key mirror test first sampled only NOON, where the broken and fixed seed
  formulas agree - it passed against a deliberately reverted `dateToSeed`, which
  is the only reason the sampling moved to the day's edges. A test written for a
  bug this arithmetic is not trustworthy until it has been watched to fail.
- Following the drift outward found the same defect where nobody had reported
  it: `calculateStreak` diffed local midnights in elapsed milliseconds in BOTH
  its comparisons, so it broke a streak across the 23h spring-forward night and
  kept a dead one alive across it two days later. The task only asked to
  "re-check" that function.
- Naming the schedule consequence in DECISION.md rather than burying it: the fix
  moves today's seed up by one for DST zones in summer, which rotates the daily
  target once at deploy. That is a player-visible effect of an internal fix.

## What went wrong

- R1.1 (BLOCKER): the `globalSetup` line that pins the suite's time zone was
  written, then silently reverted by a `git checkout jest.config.js` used to
  restore the file after a mutation check - the config was still uncommitted, so
  checkout threw the fix away with the mutation. The whole time-zone pin was
  inert for the rest of the session and `npm run ci` was green anyway, because
  this machine sits in Europe/Bucharest, the very zone the pin selects. On CI's
  UTC it would have been red. Root cause: using git to undo an experiment in a
  file that also held uncommitted real work.
- The signal was on screen and went unread: `git status --short` before the
  commit listed ten paths and `jest.config.js` was not among them, right after a
  step whose whole point was to add a line to it.
- R1.2 (MAJOR): the three streak tests were written without the zone guard the
  other DST specs use, so once the pin was restored they were still the one
  place that could pass vacuously in UTC. The guard existed; it just was not
  applied to tests added later in the session.

## What to improve next time

- Restore a mutation experiment from a copy taken before it (`cp file /tmp/...`
  then copy back), never with `git checkout` - the file usually also holds
  uncommitted work. Where a copy is awkward, commit first, mutate, then reset.
- Read the staged path list against the step list before committing: every file
  a step claimed to change should appear.
- When a spec's validity depends on the environment (zone, locale, clock), it
  asserts that environment itself. A conditional that never occurs is greener
  than one that passes.

## Action items

- [x] LESSONS.md: `restore-a-mutation-experiment-from-a-copy-not-git-checkout`
- [x] LESSONS.md: `an-environment-dependent-test-must-assert-its-environment`
- [x] LESSONS.md: `fix-the-arithmetic-class-not-the-reported-callsite`
- [x] AGENTS.md documents the pinned Jest time zone and why TZ cannot be set
      from inside a spec (review finding R1.6)

Observation, no task filed: the zone pin covers Jest only - the Playwright suite
still runs in the ambient zone. Nothing needs it today (the browser mirror's
formula is guarded by a Jest test, and the e2e specs derive the key from the
page's own clock), but a DST-sensitive assertion written in `e2e/` would not
inherit the pin.
