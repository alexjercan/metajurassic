# Review: Fix DST drift in seedToDate/dateToSeed shifting daily profile dates

- TASK: 20260729-122943
- BRANCH: fix/dst-seed-date-roundtrip

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

- [x] R1.1 (BLOCKER) jest.config.js:3 - `test/setTimeZone.js` is written as a
  jest `globalSetup` but is never registered: `jest.config.js` has no
  `globalSetup` key, and nothing else sets `TZ`. The suite therefore runs in the
  machine's ambient zone; it is green here only because this machine is in
  Europe/Bucharest. On CI (`ubuntu-latest`, UTC) the run is red: `TZ=UTC npx
  jest` fails the two zone guards, so the DoD "npm run ci passes" does not hold
  where it is actually checked. Add `globalSetup:
  "<rootDir>/test/setTimeZone.js",` to `jest.config.js`. Verified: with that
  line, `TZ=UTC npx jest` runs all 224 tests green.
  - Response: Confirmed and fixed: the line was written and then reverted by a `git checkout jest.config.js` during a mutation check, and the file's absence from the staged list went unnoticed. `globalSetup` is now registered; `TZ=UTC npm run ci` is the check.
- [x] R1.2 (MAJOR) test/gameStats.test.ts:1063,1076,1088 - the three new streak
  tests are the only coverage of the `calculateStreak` half of the fix, but none
  asserts the pinned zone, so in a non-DST zone they pass without ever crossing a
  transition - the vacuous-green failure mode `test/timeZone.ts` exists to
  prevent. Call `expectPinnedZone()` in a `beforeAll` for that describe block.
  - Response: Fixed: `expectPinnedZone()` now runs in a `beforeAll` for that describe block.
- [x] R1.3 (MINOR) e2e/dailyKeyMirror.ts:12 - the header claims the Jest test
  checks the mirror "in more than one time zone", but the test runs only in the
  single globally pinned zone. Drop that clause or make it true.
  - Response: Fixed: the comment now says "at the hours where a formula change actually shows", which is what the test does.
- [x] R1.4 (MINOR) LESSONS.md:304-312 - the lesson
  `anchor-date-fixtures-to-the-code-under-test-not-the-inverse` states as present
  fact that `seedToDate(dateToSeed(x))` is not a clean inverse across a DST
  boundary. That is now false and the fixture it prescribes is gone. LESSONS.md
  is not under `tasks/`, so it is in scope: append that the drift is fixed here
  while the general advice stands.
  - Response: Fixed: the entry now records that the drift is fixed here while keeping the fixture advice.
- [x] R1.5 (MINOR) tasks/20260729-122943/TASK.md:66-71 - the Outcome states the
  tests are pinned by a jest `globalSetup`, which is not what the code does (see
  R1.1). Accurate once R1.1 lands; otherwise the Outcome and Step 1 must be
  corrected instead.
  - Response: Accurate once R1.1 landed. Step 1's wording also corrected to name the globalSetup mechanism rather than the re-import one that never worked.
- [x] R1.6 (NIT) AGENTS.md:37-56 - the change makes the whole Jest run execute in
  a fixed non-UTC, DST-observing zone, which is load-bearing for anyone writing a
  date-sensitive test. Add a line under the test commands naming the pin and the
  guard.
  - Response: Fixed: AGENTS.md's build/test section now documents the pin, why TZ must be set in globalSetup, and the `expectPinnedZone()` guard.

Not findings, recorded for the history:

The reviewer ran the core arithmetic over every day of 2025-2027 at hours 0, 1,
2, 3, 12 and 23 in UTC, Europe/Bucharest, America/Santiago and America/Havana
(midnight-transition zones, where local midnight does not exist on the
spring-forward day), Asia/Kathmandu, Australia/Lord_Howe and Pacific/Chatham
(non-hour offsets), Australia/Sydney, America/Sao_Paulo, Asia/Tehran and
America/Los_Angeles: zero mismatches, and `dateToSeed` stays integral including
for pre-anchor dates with zero or negative seeds.

Revert experiments in a scratch copy confirmed both halves of the fix are
pinned: the elapsed-ms `dateToSeed`/`seedToDate` fails 6 tests, and reverting
only `src/gameStats.ts` fails the spring-forward streak test and the
"win two days ago is stale" test.

`src/gameStats.ts:278` declares a `yesterday` local that nothing reads. It
predates this diff but sits in the function this change rewrites.

The DoD line about `getTodaySeed()` has no test calling that exact function
alongside `seedToDate`; `test/dstSeedDate.test.ts:71` exercises the identical
expression (`getTodaySeed`'s entire body) and `test/dailyKeyMirror.test.ts`
covers `getTodaySeed` under fake timers. Judged adequate, just not literal.

Commands run from the worktree inside `nix develop`: `npx jest` (224 passed,
ambient EEST); `TZ=UTC npx jest` (2 failed); `TZ=UTC npx jest --globalSetup
./test/setTimeZone.js` (224 passed); `E2E_PORT=8181 npm run ci` (all green, 1
skipped).

## Round 2

- VERDICT: APPROVE
- REVIEWER: out-of-context

All six round-1 findings confirmed resolved by the reviewer; no new findings.
The round-1 checkboxes are ticked on that confirmation.

- R1.1: `jest.config.js:6` registers the `globalSetup`, and
  `TZ=UTC E2E_PORT=8181 npm run ci` - the exact condition that was red in round
  1 - is fully green (format:check, lint, 224/224 Jest with coverage thresholds
  met, 77 Playwright passed, 1 skipped).
- R1.2: mutation-checked in a scratch copy - with the `globalSetup` line deleted
  under `TZ=UTC` the run now fails 10 tests including all three DST streak
  cases, where previously only the 2 guards went red and the streak cases passed
  vacuously.
- R1.3 to R1.6: comment, LESSONS.md entry, TASK.md wording and AGENTS.md section
  all match the code.

Drift check: `git diff 1ad00b2..HEAD` touches exactly the files the responses
describe plus the dead-`yesterday` removal in `src/gameStats.ts`, which nothing
read; no prettier reflow leaked into unrelated hunks, and the rest of
`master...HEAD` is unchanged from round 1.

Worth knowing, not a finding: the zone pin covers Jest only - the Playwright
suite still runs in the ambient zone. That is fine today (the browser mirror's
formula is guarded by `test/dailyKeyMirror.test.ts`, and the e2e specs derive
the key from the page's own clock), but a future DST-sensitive assertion written
in `e2e/` would not inherit the pin. AGENTS.md says "the Jest suite", so it does
not overclaim.

In-session re-derivation of a load-bearing claim: `TZ=UTC npm run ci` was run
independently in this session before the round was requested, with the same
result (224 Jest, 77 e2e green).
