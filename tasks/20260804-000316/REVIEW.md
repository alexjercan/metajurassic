# Review: Pin the daily clock in every e2e spec that opens the daily page

- TASK: 20260804-000316
- BRANCH: fix/pin-daily-clock-e2e

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) test/dailyClockPin.test.ts:41 - the detector is the literal
  substring `goto("/")`, so a future spec written as `page.goto("/", {
  waitUntil: "load" })` or with backticks opens the daily page and passes the
  guard silently. Widen to a regex over `goto(` plus a quoted `/` if the false
  negative ever bites. All 13 current sites match, so nothing is wrong in this
  tree.
  - Response:
- [ ] R1.2 (NIT) test/dailyClockPin.test.ts:52 - the "own copy of the date"
  check bans ANY ISO datetime literal (`/\d{4}-\d{2}-\d{2}T/`) in every spec,
  not just the pinned day in specs that open `/`. A future spec asserting a
  rendered ISO timestamp would fail a guard whose stated rule is about the
  fixture date. Scope the regex to `PINNED_DAY`'s date to match the DoD wording.
  - Response:
- [ ] R1.3 (NIT) e2e/social.spec.ts:5, e2e/images.spec.ts:5,
  e2e/archiveFilter.spec.ts:5 - the file-level pin installs a fake clock for
  every test in files where only one test opens `/`; the rest hit `/species/`,
  `/clades/`, `/faq/`. Harmless and it is what makes the guard uniform, so
  leave it unless a non-daily test later needs the real clock.
  - Response:

### Verification

Round 1 findings came from an out-of-context reviewer given only the task ID,
branch, worktree, dimensions and this format. The recording pass re-derived the
load-bearing claims independently rather than accepting them:

- Guard red on the base: replaying the guard's predicate over `git show
  master:e2e/*.spec.ts` names 13 files that call `goto("/")` without
  `pinDailyClock`. The guard is not vacuous after the fix either - it asserts
  `specs.length > 0` and `opensDailyPage.length > 0`.
- DoD line 2: `grep -rn 2026-06-15 e2e/*.spec.ts` returns 8 hits on `master`
  and 0 on the branch; the date lives only at `e2e/helpers/clock.ts:7`.
- Coverage is complete by construction: 13 spec files contain `goto("/")` and
  all 13 carry exactly one file-scope `pinDailyClock(page)`.
- DoD line 3: `npx playwright test e2e/panel.spec.ts:149 e2e/mobile.spec.ts:238
  e2e/mobile.spec.ts:289` - 3 passed. The close-out's note that the DoD's
  139/228/271 shifted by the inserted pin blocks is correct; same three tests
  by title.
- DoD line 4: `npm run ci` exit 0 - format:check, lint, 373 jest tests over 28
  suites, 168 Playwright tests. `tatr check` exit 0.

The record is honest. No `src/` change, as the plan predicted. Both plan
deviations (all pins hoisted to file scope; the pull-tab test switched to
`guessNamedSpecies(page, "Triceratops")`) are declared in the Close-out and the
DECISION.md amendment, and both check out in the diff -
`e2e/hintKeyboard.spec.ts` and `e2e/share.spec.ts` really do hold a `goto("/")`
outside the block that used to install the clock, and the pull-tab assertions
(`has-unseen`, label equality) are unchanged with only the fixture guess moved.
Nothing was weakened to make a test pass.

Design is the counterfactual shape: a fixture date named once, installed by one
helper, held by a source-level guard because no runtime test can observe "the
suite is green only on lucky days". `pinnedDayAt` has one caller but exists to
stop the paused instant drifting onto a different calendar day, which is the
`PINNED_DAY` invariant itself, not a speculative hook.

- Process signal: pinning exposed a test whose assertion had been satisfied by
  the calendar handing it a related target (`e2e/mobile.spec.ts`'s pull-tab
  test). Freezing a date-dependent fixture is a way to find luck-passing
  assertions, not only a way to stabilise a suite.

### Pending user checks

- `manual:` DoD line - `e2e/panel.spec.ts` and `e2e/mobile.spec.ts` say why the
  pin is load-bearing so it is not deleted as boilerplate. Both files carry the
  comment (`e2e/panel.spec.ts:7`, `e2e/mobile.spec.ts:39`); whether it reads as
  load-bearing is the user's judgement. Does not block APPROVE.
