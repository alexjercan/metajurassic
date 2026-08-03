# Pin the daily clock in every e2e spec that opens the daily page

- PRIORITY: 60
- TAGS: bug, e2e, ui
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

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

1. Write the guard first: `test/dailyClockPin.test.ts`, modelled on
   `test/lintGate.test.ts`. Read every `e2e/*.spec.ts` with `fs`; for each file
   whose source contains `goto("/")`, assert the source also references
   `pinDailyClock`. Fail with the offending file names in the message. Run
   `npx jest test/dailyClockPin.test.ts` and watch it name the 8 unpinned
   files.
2. Add `e2e/helpers/clock.ts`: `export const PINNED_DAY = "2026-06-15T12:00:00"`
   and `export async function pinDailyClock(page: Page): Promise<void>` calling
   `page.clock.install({ time: new Date(PINNED_DAY) })`. Comment why `install`
   and not `pauseAt` (the 100ms autocomplete blur timer and the tree settle
   waits need time to advance - `e2e/postgame.spec.ts:221`).
3. Fold the 5 existing literals onto the helper:
   `e2e/hintKeyboard.spec.ts:68`, `e2e/postgame.spec.ts:31`,
   `e2e/share.spec.ts:83`, `e2e/modal.spec.ts:15,67,93`,
   `e2e/mobile.spec.ts:785`. Leave `e2e/postgame.spec.ts:231`'s
   `pauseAt("2026-06-15T12:30:00")` as a pause, but derive its date from
   `PINNED_DAY` so the two cannot drift.
4. Add a top-level `test.beforeEach(pinDailyClock)` to the 8 unpinned files
   that open the daily page: `e2e/panel.spec.ts`, `e2e/mobile.spec.ts`,
   `e2e/onboarding.spec.ts`, `e2e/smoke.spec.ts`, `e2e/social.spec.ts`,
   `e2e/images.spec.ts`, `e2e/autocomplete.spec.ts`, `e2e/practice.spec.ts`,
   `e2e/archiveFilter.spec.ts` (that list is 9 including `mobile`, whose pin at
   :785 is one describe only and does not cover :228/:271). In
   `e2e/panel.spec.ts` and `e2e/mobile.spec.ts`, comment WHY - the fixture
   always guesses Ceratosaurus and would win the round outright on a matching
   date.
5. Run `npx playwright test e2e/panel.spec.ts:139 e2e/mobile.spec.ts:228
   e2e/mobile.spec.ts:271` and confirm all three pass.
6. Run the full `npm run ci`. Pinning moves the date for OTHER assertions in
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
