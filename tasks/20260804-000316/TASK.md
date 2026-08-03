# Pin the daily clock in every e2e spec that opens the daily page

- PRIORITY: 60
- TAGS: bug, e2e, ui
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a maintainer, I want `npm run ci` green on master, so that a branch's own
regressions are visible.

## Context

Reproduced on master (`b821117`) and on the unrelated branch
`fix/share-headline-puzzle-number`; identical failures on both, so this is
master breakage, not branch breakage. Found while reviewing `20260729-141429`,
whose own diff touches only share text.

Failing:

- `e2e/panel.spec.ts:139` - info panel: a mid-game hint does not resurrect the
  panel for later guesses
- `e2e/mobile.spec.ts:228` - the pull tab is on screen, names the revealed
  clade, and opens it
- `e2e/mobile.spec.ts:271` - a mid-game hint on a phone still shows its clade

Understanding corrected the first read of this. The `e846885` hint-chip
hypothesis and the "element is not visible on `#hint-box`" symptom above are
both WRONG - do not re-run that investigation. `NOTES.md` has the evidence; the
short version:

- The three specs open `/` with no clock pin, so they play whatever puzzle the
  real date seeds. `guessFirstSuggestion(page, "saurus")` always guesses
  Ceratosaurus, and on 2026-08-04 that IS the daily target.
- The fixture therefore WINS on guess 1. The win modal opens, `#hint-box` is
  correctly hidden by `updateHintButton`, and later clicks fail with
  `<div id="modal-overlay" class="modal-overlay active"> intercepts pointer
  events`.
- Not a regression, and not `e846885`. It is a date-dependent fixture that
  re-fires on any future date whose target is the top match for a spec's query.
  That is why the same suite was green on 2026-07-29.

The bug is the class, not the three instances: 13 spec files call
`page.goto("/")`, 8 of them with no pin at all, and the 5 that do pin repeat
`"2026-06-15T12:00:00"` as separate literals. See `DECISION.md`.

## Steps

1. [x] Write the guard first: `test/dailyClockPin.test.ts`, modelled on
   `test/lintGate.test.ts`. Read every `e2e/*.spec.ts` with `fs`; for each file
   whose source contains `goto("/")`, assert the source also references
   `pinDailyClock`. Fail with the offending file names in the message. Run
   `npx jest test/dailyClockPin.test.ts` and watch it name the 8 unpinned
   files.
2. [x] Add `e2e/helpers/clock.ts`: `export const PINNED_DAY = "2026-06-15T12:00:00"`
   and `export async function pinDailyClock(page: Page): Promise<void>` calling
   `page.clock.install({ time: new Date(PINNED_DAY) })`. Comment why `install`
   and not `pauseAt` (the 100ms autocomplete blur timer and the tree settle
   waits need time to advance - `e2e/postgame.spec.ts:221`).
3. [x] Fold the 5 existing literals onto the helper:
   `e2e/hintKeyboard.spec.ts:68`, `e2e/postgame.spec.ts:31`,
   `e2e/share.spec.ts:83`, `e2e/modal.spec.ts:15,67,93`,
   `e2e/mobile.spec.ts:785`. Leave `e2e/postgame.spec.ts:231`'s
   `pauseAt("2026-06-15T12:30:00")` as a pause, but derive its date from
   `PINNED_DAY` so the two cannot drift.
4. [x] Add a top-level `test.beforeEach(pinDailyClock)` to the 8 unpinned files
   that open the daily page: `e2e/panel.spec.ts`, `e2e/mobile.spec.ts`,
   `e2e/onboarding.spec.ts`, `e2e/smoke.spec.ts`, `e2e/social.spec.ts`,
   `e2e/images.spec.ts`, `e2e/autocomplete.spec.ts`, `e2e/practice.spec.ts`,
   `e2e/archiveFilter.spec.ts` (that list is 9 including `mobile`, whose pin at
   :785 is one describe only and does not cover :228/:271). In
   `e2e/panel.spec.ts` and `e2e/mobile.spec.ts`, comment WHY - the fixture
   always guesses Ceratosaurus and would win the round outright on a matching
   date.
5. [x] Run `npx playwright test e2e/panel.spec.ts:139 e2e/mobile.spec.ts:228
   e2e/mobile.spec.ts:271` and confirm all three pass.
6. [x] Run the full `npm run ci`. Pinning moves the date for OTHER assertions in
   the same files (puzzle number, archive contents, streak dates); decide each
   new failure on its merits - fix the spec, or record why the pinned day is
   wrong for it - and do not weaken an assertion to make it pass. Report any
   spec that turns out to have been silently depending on "today".

## Definition of Done

- No spec that opens the daily page runs on the real clock; the guard names any
  that does (test: `test/dailyClockPin.test.ts`).
- The pinned day is written once, in `e2e/helpers/clock.ts`, and no spec
  carries its own copy of the date - 8 hits on the base branch, none after
  (cmd: `grep -rn 2026-06-15 e2e/*.spec.ts`).
- The three reported failures pass (cmd: `npx playwright test
  e2e/panel.spec.ts:139 e2e/mobile.spec.ts:228 e2e/mobile.spec.ts:271`).
- The whole gate is green on this branch (cmd: `npm run ci`).
- `e2e/panel.spec.ts` and `e2e/mobile.spec.ts` say why the pin is load-bearing,
  so it is not deleted as boilerplate (manual: user judgement).

## Notes

- Base-branch red confirmed at plan time on `master` (2026-08-04): the three
  specs fail as reported; `grep -rn pinDailyClock e2e/ test/` returns nothing;
  the literal-date grep returns 8 hits; 8 files with `goto("/")` have no pin.
- Proof 1 and proof 2 are independent: deleting the helper reddens both, but
  re-inlining one literal reddens only proof 2, and adding a new unpinned spec
  reddens only proof 1.
- The `cmd:` proof on the three specs is evidence for one date, which is why
  the jest guard, not that command, is the durable criterion
  (`LESSONS.md: a-guard-no-test-can-fail-is-a-comment`).
- Guard granularity is file-level, and deliberately so: detecting "this
  `describe` lacks a `beforeEach`" textually is more machinery than the
  property is worth. A new file is the case that actually recurs.
- `e2e/routes.spec.ts`, `e2e/seed.spec.ts`, `e2e/closeness.spec.ts`,
  `e2e/ladder.spec.ts` and `e2e/tree.spec.ts` never open `/` - out of scope,
  and the guard leaves them alone.
- No `src/` change is expected. If one proves necessary, that is a different
  defect than the one diagnosed here; stop and say so.

## Close-out

### What and why

`e2e/helpers/clock.ts` names the played day once (`PINNED_DAY`) and installs it
(`pinDailyClock`); all 13 specs that call `page.goto("/")` now pin from a
file-level `test.beforeEach`, and `test/dailyClockPin.test.ts` holds both
properties by reading the sources. The three reported failures pass, and
`npm run ci` exits 0.

### Deviations from the plan

- **Steps 3 and 4 merged into one shape: every pin is file-level.** The plan
  folded the 5 existing literals in place and added a `beforeEach` only to the
  unpinned files. Doing that would have left `e2e/hintKeyboard.spec.ts:47` and
  `e2e/share.spec.ts:238,256` opening `/` on the real clock - three
  `goto("/")` sites the plan's file list never mentions, because the guard is
  file-level and those files already referenced `pinDailyClock` elsewhere. So
  the pins were hoisted to the top of all 13 files instead. Uniform, and no
  site is left out by construction. `page.clock.install` throws if called
  twice, so the inner calls had to go rather than stack.
- **`e2e/mobile.spec.ts`'s pull-tab test needed a different guess** - see
  below. No other spec's assertions moved.

### The spec that was silently depending on "today" (Step 6)

`e2e/mobile.spec.ts`'s "the pull tab is on screen, names the revealed clade,
and opens it" still failed after pinning, at `expect(tab).toHaveClass(
/has-unseen/)`.

`src/ui/panel.ts`'s `noteCardRendered` only claims the unseen marker when a
guess CHANGES the mounted card - i.e. deepens the best clade past the root card
already on screen. On the pinned day the target is Pentaceratops (seed 166),
and `guessFirstSuggestion(page, "saurus")` guesses Ceratosaurus, which meets a
ceratopsian only at `dinosauria` - the root. Same card, no marker.

So the test never asserted what it claimed to: it needed the day's target to
happen to be a Ceratosaurus relative, and the calendar had been supplying one.
Fixed on its merits by guessing `Triceratops` by name (`guessNamedSpecies`),
which meets Pentaceratops at `chasmosaurinae`. Nothing was weakened - the
assertion is unchanged and now has a fixture that can actually satisfy it.

### Difficulties and diagnosis

Determining the pinned day's target took a throwaway jest file over
`buildGameData` + `dateToSeed` (removed); the clade chains behind the
Ceratosaurus/Triceratops comparison came from the same scratch run.

### Evidence

- `test/dailyClockPin.test.ts`: red first, naming 13 unpinned files and 5
  carrying their own date literal; green after.
- `grep -rn 2026-06-15 e2e/*.spec.ts`: 8 hits on the base, 0 now; the date
  lives only in `e2e/helpers/clock.ts:7`.
- `npx playwright test e2e/panel.spec.ts:149 e2e/mobile.spec.ts:238
  e2e/mobile.spec.ts:289`: 3 passed. NOTE the line numbers - the DoD proof
  quotes the base-branch lines 139/228/271, which the inserted pin blocks
  moved. Same three tests, by title.
- `npm run ci`: exit 0, 168 e2e tests passed.
- `manual:` proof (the pin reads as load-bearing in `panel.spec.ts` and
  `mobile.spec.ts`) left pending for review.

### Reflection

The plan's file-level reasoning was right about the guard and wrong about the
edit sites: "this file already mentions `pinDailyClock`" is exactly the blind
spot the file-level guard has, and the plan inherited it when choosing where to
edit. Hoisting every pin to file scope closes it for the same cost. The
`DECISION.md` consequence about a new `describe` inside a pinned file skipping
the pin still stands, and is now the only remaining hole.

The pull-tab finding is the more useful one: pinning did not just stabilise the
suite, it exposed a test whose assertion had been satisfied by luck. Worth
expecting more of those the next time a date-dependent fixture is frozen.
