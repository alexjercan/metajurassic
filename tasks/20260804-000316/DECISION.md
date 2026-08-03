# Decision: Pin the daily clock in every e2e spec that opens the daily page

- DATE: 20260804-001458
- STATUS: ACCEPTED
- TASK: 20260804-000316
- TAGS: e2e, test-fixture

## Context

`NOTES.md` diagnosed the three failures: no `src/` defect exists. Every spec
that calls `page.goto("/")` plays whatever puzzle the real calendar seeds, and
`guessFirstSuggestion(page, "saurus")` always guesses Ceratosaurus. On
2026-08-04 the daily target IS Ceratosaurus, so the fixture wins the round on
guess 1, the win modal covers the arena, and later clicks time out. The same
suite was green on 2026-07-29. Eight spec files open the daily page unpinned;
five more already pin `2026-06-15T12:00:00` as five separate string literals.
So the choice is what to pin, how to pin it, and how to keep the property
provable after the fix.

## Decision

Pin the class, not the three instances. Add `e2e/helpers/clock.ts` exporting
`PINNED_DAY` and `pinDailyClock(page)`, call it from a `test.beforeEach` in
every spec that opens `/`, and fold the five existing date literals onto the
same constant. Guard the property with a source-scanning jest test
(`test/dailyClockPin.test.ts`) asserting that a spec containing `goto("/")`
also references `pinDailyClock`.

Built from scratch today this is still the shape: the date is a fixture input,
so it gets named once, and the invariant "the daily page is never opened on the
real clock" is invisible to every runtime test - the suite is green on the days
it happens to be green - so only a source-level guard can hold it.
`test/lintGate.test.ts` already sets that precedent for a policy no runtime test
can observe.

`clock.install`, not `pauseAt`: time must keep advancing or the autocomplete's
100ms blur timer and the tree settle waits stall (`e2e/postgame.spec.ts:221`).

## Alternatives considered

- **Fix only the three failing tests.** Cheapest, and leaves eight files armed
  with the same trap; the next calendar collision reopens this task under a
  different spec name. Rejected: the three failures are instances, not the bug.
- **Auto-fixture via `test.extend`.** No per-file call, but it fights the specs
  that install their own clock (`postgame.spec.ts` pauses at 12:30) and hides
  the pin from a reader of the spec. Rejected on KISS: more machinery for less
  visibility.
- **A `cmd:` proof re-running the three specs instead of the jest guard.** That
  is evidence for one moment on one date, exactly the
  `a-guard-no-test-can-fail-is-a-comment` failure. Kept as a secondary proof,
  rejected as the primary one.
- **Do nothing.** `npm run ci` stays a coin flip on the calendar, which is how
  this was found in the first place - masking a branch's own regressions.

## Consequences

Easier: the suite's verdict depends on the code, not the day. One constant
names the played puzzle, so moving it is one edit.

Harder: every pinned spec now tests one puzzle forever. A content change that
moves the 2026-06-15 target changes what these specs play - a loud,
deterministic failure instead of calendar roulette, which is the trade being
bought. After this, no test covers "the daily page works for an arbitrary
seed"; `e2e/seed.spec.ts` covers the seeded practice round, which is the
closest standing cover. The guard is file-level: a new `test.describe` inside
an already-pinned file that skips the `beforeEach` still passes it.
