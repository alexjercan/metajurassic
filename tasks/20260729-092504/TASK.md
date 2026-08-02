# Polish post-game flow and retention actions

- PRIORITY: 62
- TAGS: ux, gameplay, feature
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player who wins or loses a puzzle, I want the game-over state to guide me naturally to sharing, practice, profile progress, or tomorrow's puzzle, so that the session has a satisfying close and next step.

## Review Findings

- The modal has OK, Practice, and Share actions, and the hint box becomes a Practice link after game over.
- The review did not find browser tests for win/loss modal behavior, clipboard failure handling, post-game input disabled state, or profile stat update flow.
- The game has good retention surfaces, but they need a tested user journey.
- Scope split from the 2026-07-29 out-of-context review: the share content defects (fabricated average, fake streak emoji, practice rounds mislabeled with the daily puzzle id) are extracted to `20260729-101823`, and the missing stats card plus next-puzzle countdown to `20260729-101838`. This task stays focused on mapping and testing the existing journey so those changes land against captured behavior.

## Coverage audit (2026-07-30)

The Review Findings above are partly stale - `20260729-092258` (E2E harness),
`20260729-101823` (share rewrite) and `20260729-101754` (practice lifecycle)
landed coverage since. What EXISTS today:

- `e2e/modal.spec.ts`: the win and loss modal appear with the right title and
  title class, and the actions sit on one row on desktop. Nothing exercises what
  the three actions DO.
- `e2e/share.spec.ts`: a WIN shared through the native sheet and through the
  clipboard fallback, with real stats and the exact emoji grid.
- `e2e/practice.spec.ts`: the modal's Practice action on the PRACTICE page
  (retargeted to New game there) and finished-round retention on disk.
- `test/share.test.ts`: loss share text at unit level.
- `test/gameStats.test.ts`: stat computation at unit level.

What has NO coverage at any level:

- `initGame` (`src/game.ts`) is imported by zero tests. Post-game input
  disabling and the hint chip's swap to a Practice link have no test at any
  level; the DOM-heavy wiring makes E2E the right altitude. (The share BUTTON is
  already driven end to end by `e2e/share.spec.ts` on its win paths - what is
  missing there is the loss branch and the failure path, below.)
- The DAILY modal's OK and Practice actions.
- A LOSS shared from the shipped page (unit-only today).
- A clipboard write that FAILS. The current handler logs and calls `alert()`
  (`src/game.ts:370-373`) - the same system-dialog pattern that guesses moved
  away from in favour of `#input-error`. Pin the behavior here; the UX call goes
  to a follow-up task.
- The profile page reflecting a daily round that just finished.

## Steps

- [x] Write the win and loss journey maps to `NOTES.md`: correct guess or spent
      guesses -> modal -> OK / Practice / Share -> profile progress -> next
      attempt, naming the code path for each leg.
- [x] Add `e2e/postgame.spec.ts` for the daily post-game journey: input disabled
      (property, cleared placeholder, no further guess recorded), all three
      actions present and usable, OK dismissing the modal, the Practice action
      navigating to `/practice/`, and the hint chip having become a working
      Practice link rather than a disabled hint.
      NOT covered, deliberately: `disableInput`'s
      `autocompleteBox.style.display = "none"`. The suggestion box is already
      hidden by `selectAndSubmit` before the game hears about the guess, and by
      the blur timer on the click-away path, so that line is redundant on every
      reachable path and no test can falsify it. The step's original wording
      ("hidden autocomplete") claimed otherwise; the review caught the
      assertion passing under mutation, and the second attempt at it - a real
      in-page round with the list open - passed under the same mutation too.
      Recorded rather than papered over.
- [x] Extend the loss case in the same spec: the modal reveals the target name
      and the "all 25 guesses" line, and the answer is revealed on the board.
- [x] Extend `e2e/share.spec.ts` with a LOSS share through the shipped page and
      with a clipboard write that REJECTS, asserting the button does not claim
      "Copied!" for a write that never happened.
- [x] Add a profile-progress leg: a finished daily win is visible in
      `#games-played-daily`, `#total-wins-daily` and `#current-streak-daily`.
- [x] File follow-up tatr tasks for the UX defects the mapping surfaces (at
      minimum the `alert()` share-failure path); do not fix them here.
- [x] Run `npm run ci` green.

## Definition of Done

- Win and loss modal actions (OK, Practice, Share) are covered in browser tests.
  (test: `npm run test:e2e -- postgame.spec.ts`)
- Post-game input is disabled and the next-step actions remain available.
  (test: `npm run test:e2e -- postgame.spec.ts`)
- Share is covered from the shipped page for both win and loss, plus a failing
  clipboard write. (test: `npm run test:e2e -- share.spec.ts`)
- A finished daily round is visible on the profile page.
  (test: `npm run test:e2e -- postgame.spec.ts`)
- The journey maps are recorded in `tasks/20260729-092504/NOTES.md`.
- Every UX defect found is either fixed or filed as its own tatr task; none is
  left only as prose. (cmd: `tatr ls | grep 20260730-165921`)
- `npm run ci` passes. (cmd: `npm run ci`)

### Proof runs

Figures below are from the ROUND-2 tree (the tree being committed). The round-1
numbers they replaced - `125 passed`, "eight mutations" - expired the moment the
review fixes changed the specs, per LESSONS.md
`a-verification-result-expires-when-the-code-it-ran-against-changes`; the
reviewer caught them still standing.

- `npm run ci` (as `nix develop -c env E2E_PORT=8181 npm run ci`): exit 0,
  `Tests: 323 passed, 323 total` (Jest) and `126 passed (25.2s)` (E2E, the last
  step). Independently re-run by the reviewer: `126 passed (22.2s)`, Jest 323,
  `format:check` and `lint` clean. `E2E_PORT` because another checkout may hold
  8080 (AGENTS.md); the default is untouched, so CI is unaffected.
- `tatr ls | grep 20260730-165921` returns the one filed follow-up. The grep
  this DoD originally carried (`grep -i post-game`) was RUN at close-out and
  matched this task's own title plus the pre-existing `20260729-101838`, so it
  went green whether or not anything had been filed - a proof of nothing. It is
  narrowed to the task ID it is meant to prove. (LESSONS.md
  `absence-proving-greps-must-be-run-when-written`.)
- Every new test has a recorded mutation that turns it red: thirteen experiments
  (M1-M8, M5b, E1-E5), verbatim strings in `NOTES.md` and `REVIEW.md`. The
  in-page test added in round 2 is falsified by M1 (reviewer's run, red at
  `postgame.spec.ts:256`).
- Flake check (the reviewer's runs, not mine), `-g`-narrowed so the total IS the
  repeat count (LESSONS.md
  `a-whole-file-repeat-count-is-not-a-sample-of-one-test`): the in-page test x25,
  the hint-slot test x25, the loss-share test x15 - all clean.
- One assertion was DELETED rather than fixed: see the autocomplete note on the
  step above. The reviewer then tried to break that reasoning with a probe on the
  hint path (list open, `useHint` spending the last guesses, so the round ends
  without `selectAndSubmit`) and confirmed the blur timer is the hider there too -
  it fires even under `page.clock.install`. The redundant pair in `disableInput`
  is left in place, documented in `NOTES.md`, not silently "cleaned up".

## Notes

- Useful code areas: `src/game.ts`, `src/gameState.ts`, `src/ui/modal.ts`, and `src/profile.ts`.
- Sequencing: do this before `20260729-101838` (which changes the modal) and alongside or after `20260729-092258` (the browser harness it needs).
