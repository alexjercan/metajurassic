# Add post-game stats card and next-puzzle countdown

- STATUS: CLOSED
- PRIORITY: 60
- TAGS: feature, ux, gameplay

## Story

As a player finishing the daily puzzle, I want the game-over moment to show my stats and count down to the next puzzle, so that finishing feels like a ritual worth returning for tomorrow.

## Review Findings

- The win modal shows only "Solved in X / 25 guesses" and the loss modal only the answer. No streak, average, or distribution appears at game over, even though `gameStats.ts` already computes all of them for the profile page.
- There is no "next puzzle in HH:MM" countdown anywhere; that plus a stats card is the standard close that makes daily .io games sticky.
- The loss copy "You used all 25 guesses" is wrong when hints were spent (for example 22 guesses plus 1 hint).

## Steps

- [x] `src/gameOverCopy.ts` (new, pure): `winSummary(guessCount, hintCount)` and
      `lossSummary(guessCount, hintCount)`. With no hints both return today's
      strings verbatim (`Solved in N / 25 guesses`, `You used all 25 guesses`).
      With hints they name the split, because `GameState.numberOfGuesses()`
      already folds `hintClades.size * HINT_COST` into the total, which is what
      makes the current loss line a lie at 22 guesses plus 1 hint.
- [x] `test/gameOverCopy.test.ts` (new): the no-hint strings are unchanged, and
      the hint cases name guesses and hints separately for win and loss.
- [x] `src/countdown.ts` (new, pure, no DOM): `msUntilNextPuzzle(now)` and
      `formatCountdown(ms)`. The boundary is LOCAL midnight, reached by
      `new Date(y, m, d + 1)` - the same calendar-field arithmetic
      `seedToDate`/`localDayIndex` use in `src/gameData.ts`, not `now + 86400000`,
      which drifts an hour across a DST night.
- [x] `test/countdown.test.ts` (new): whole-hour and sub-minute remainders, the
      zero/negative clamp, and one DST night per `test/setTimeZone.js` +
      `test/timeZone.ts` (the pattern in `test/dstSeedDate.test.ts`) proving the
      23h and 25h nights still land on the next local midnight.
- [x] `src/index.html`: inside `.modal`, after `#modal-stats` and BEFORE
      `.modal-actions`, add `<div class="modal-extras" id="modal-extras" hidden>`
      holding a four-cell stat row (Played / Win % / Streak / Avg) with ids and a
      `#modal-countdown` line. Ships hidden in the SHARED template - the practice
      page renders the same file (`webpack.config.js:44`) and leaves it hidden,
      the way `#new-game-btn` already does.
- [x] `src/partials/modal.css`: style `.modal-extras` and the stat cells. Reuse
      the `.modal-stats` glass treatment; keep the row on one line at 320px by
      letting it wrap rather than by adding a media block.
- [x] `src/ui/modal.ts`: take one options object (`speciesName`, `guessCount`,
      `hintCount`, and `daily?: ModalStats`). Render extras and start a 1s
      countdown tick only when `daily` is present; clear the interval in
      `hideModal()` and before starting a new one, so a second game-over in the
      same document cannot leave two ticking.
- [x] `src/game/index.ts`: `showGameOverModal()` builds those options, calling
      `computeGameStats(data, defaultStorage(), "daily")` only when
      `shareContext.mode === "daily"` - the same storage-read-after-save the
      share button already relies on (`src/game/shareButton.ts`), so the round
      being shown is counted. No new `GameOptions` field.
- [x] `grep -rn "modal-extras\|#modal-countdown" src e2e` and confirm the only
      thing that unhides the extras is the daily branch above; the practice page
      must reach none of them.
- [x] `e2e/postgame.spec.ts`: daily win and daily loss show the four stat values
      that `computeGameStats` reports for the seeded round, and a countdown that
      matches `HH:MM:SS` and DECREASES under `page.clock.fastForward`.
- [x] `e2e/postgame.spec.ts`: a daily loss seeded with `hintClades` renders the
      hint-aware copy (the helper already accepts `hintClades`).
- [x] `e2e/practice.spec.ts`: a finished practice round shows `#modal-extras`
      hidden, no countdown, and the working new-game action - the divergence
      guard for the shared template.

## Definition of Done

- Daily game over shows real stats and a live countdown.
  (test: `npx playwright test e2e/postgame.spec.ts -g "stats card|countdown"`)
- Practice game over offers replay without a countdown or stats card.
  (test: `npx playwright test e2e/practice.spec.ts -g "lightweight"`)
- Loss and win copy are accurate when hints were spent, and unchanged without
  them. (test: `npx jest test/gameOverCopy.test.ts`, plus the hint-loss case in
  `e2e/postgame.spec.ts`)
- The countdown boundary is the local-midnight one `dateToSeed` uses, DST
  included. (test: `npx jest test/countdown.test.ts`)
- The taller modal still fits every viewport in
  `NARROW_VIEWPORTS`/`SHORT_VIEWPORTS`.
  (test: `npx playwright test e2e/mobile.spec.ts -g "game-over modal"`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Depends on: `20260729-092504` (post-game flow mapping/tests) so the existing journey is captured first, and `20260729-101747` (round-trip fix) so the streak shown is actually correct.
- Related: `20260729-101823` (share rewrite); the modal is where sharing happens, so design them together.
- All four blockers are CLOSED as of planning: `20260729-092504`,
  `20260729-101747`, `20260729-101823`, and the phone-width modal fix
  `20260729-141428`. `20260730-111003` then gave `.modal` a `max-height` plus
  `overflow-y: auto`, so a taller modal has a vertical escape hatch and the
  existing sweeps in `e2e/mobile.spec.ts` already assert it.
- No histogram, and no fifth "where this round landed" figure: see
  `DECISION.md` section 2. The Steps above supersede the original step 1.
- Deferred, unfiled: stamping `formatPuzzleId(seed)` into the modal (the
  Metazooa reference note below). Nothing in this DoD needs it.
- Assumption: the countdown is daily-only and gates on `shareContext.mode`,
  which the practice page already passes (`src/practice.ts`). No new option is
  added to `GameOptions`.
- Assumption: `computeGameStats` is cheap enough to call at game over. It walks
  `localStorage` twice, which is what the share button already does on click in
  the same modal.

## Playtest evidence (2026-07-29, from `20260729-092435`)

The playtest pass evaluated the session close and confirms this task's premise.
ON-SCREEN unless noted; full context in `tasks/20260729-092435/NOTES.md`.

- The win modal is a trophy, "The answer was X", and `Solved in 2 / 25 guesses`. No streak, no distribution, no countdown. (`05-win-modal-seed42-desktop.png`)
- The loss modal reads `You used all 25 guesses` - correct in the no-hint round captured, and still wrong when hints were spent, as this task already records.
- JUDGMENT: the share message is now genuinely worth pasting after `20260729-101823` (grid varies, stats are real), but nothing on the end screen refers to tomorrow at all. The retention gap is the modal around the share, not the share.
- Practice game over offers both a "Practice" link in the hint chip and a "Practice" button in the modal; on the practice page both mean "play again", which works. Keeping practice lightweight, as this task plans, is consistent with what is there.
- BLOCKER to note: the modal action row already overflows a phone viewport (`20260729-141428`). A stats card and countdown make it taller and wider, so land that fix first.

## Metazooa reference (2026-07-29, from `20260729-092452`)

Captured from the live game; full context in `tasks/20260729-092452/NOTES.md`.

- REFERENCE, the reference close: modal `You win!` / `No more guesses.`, the
  line "Share your score or play a practice game!", a mini-stats block of FOUR
  numbers (Games: Plays, Wins / Streak: Current, Max), a share button and a
  practice outlet. There is no distribution histogram.
- REFERENCE, and it moves the countdown decision: Metazooa's "A new game will
  start in 8h 54m" renders on the HOME page - the page a player passes through
  on the way in - not in the game-over modal. Metajurassic has no such page, so
  the countdown has nowhere else to go and the modal is the right home for it
  here; worth stating explicitly rather than assuming parity.
- JUDGMENT from the alignment pass: the reference ritual is LIGHTER than what
  this task's steps plan. Four numbers and a share button retain; density is not
  what does the work. Consider that before designing a large card, especially
  given the phone-width blocker (`20260729-141428`) this task already records.
- REFERENCE, no work owed: the share TEXT is at parity or better after
  `20260729-101823` - same shape as Metazooa's (id, headline, heat grid, streak
  and average, URL). The gap really is the modal around it.
- REFERENCE, minor and unfiled: Metazooa stamps the board itself with the round
  number (`Animal #1094`). Metajurassic computes `dinosaur-#NNNNN` already but
  shows it only inside the share text. If the modal grows a stats card, that id
  is the cheapest way to make the round feel like today's puzzle.

## Close-out (2026-08-02)

### What and why

The daily game-over modal now closes the ritual: the summary line, a four-cell
stat row (Played / Win % / Streak / Avg) and a live `Next puzzle in HH:MM:SS`.
Practice is untouched and stays lightweight - the card and the countdown are
gated on `shareContext.mode === "daily"`, the one fact that already decides
whether a round is the daily, so nothing new was added to `GameOptions`.

Two pure modules carry the logic that is cheap to pin in Jest and expensive to
pin through a browser: `src/gameOverCopy.ts` (the hint-aware split) and
`src/countdown.ts` (the local-midnight boundary). `src/ui/modal.ts` keeps
everything that touches the DOM, including the 1s tick.

Beyond the plan, and load-bearing:

- **`formatWinRate` / `formatAverageGuesses` moved into `src/gameStats.ts`.**
  The modal shows two figures the profile panel already shows, and both have a
  rule attached (whole-percent rounding; "0" rather than "0.0" when nothing has
  been won). Written a second time in the modal, the same round could have read
  differently in the two places. `src/profile/statsPanel.ts` now calls the
  shared pair for daily and practice alike, so there is one definition rather
  than three.
- **`e2e/helpers/modal.ts` gained `expectStatCardFits` and
  `expectStatCardOnOneRow`,** exercised from `e2e/mobile.spec.ts`.
  `expectModalFitsViewport` walks `.modal-actions` and nothing else, so the row
  this task added had no geometric coverage at all.

### Difficulties and diagnosis

- **The stat cells rendered 74px wide for 64px of content, and wrapped 3+1 on
  the Pixel 5.** `min-width` applies to the CONTENT box by default, so the 8px
  padding and 1px border were added outside the floor: 314px of row against a
  303.7px content box. `box-sizing: border-box` on `.modal-extra` restates the
  floor as the outer width the row's arithmetic is done in - the same trap, and
  the same fix, the `max-width` on `.modal` already documents. Measured, not
  estimated: 282px of cells in 303.7px at 393px, one row; 2x2 at 320px, which
  is the honest outcome there.
- **The countdown test was a real flake, not a fixture quirk.** Playwright's
  `clock.install` keeps advancing with real time, so `before` and the value
  read after a 90s fast-forward were 5s apart on a slower run (expected 43109,
  got 43104). `clock.pauseAt` fixes it, but only at a time AHEAD of the running
  clock - pausing at the 12:00 `openDaily` installs fails with "Cannot
  fast-forward to the past", since the page load has already moved it. The
  suite pauses at 12:30 on the same calendar day, so the daily storage key is
  unchanged.
- **A walkthrough log read as a bug and was not.** `#modal` `textContent` on
  the practice page prints "0 Played 0% Win % 0 Streak 0 Avg", because
  `textContent` includes hidden nodes. The absent countdown line is the tell:
  nothing painted it, so the card was correctly hidden.

### Evidence

- `npm run ci` green, exit 0: 357 Jest tests, 149 Playwright tests.
- Every Definition-of-Done proof run individually and green.
- Mutation-checked rather than assumed:
  - `now + 86400000` for the countdown boundary reddens 5 of 11 cases in
    `test/countdown.test.ts`, including both DST days. The DST cases are read
    at 01:00 and 02:00, BEFORE each transition; an evening sample sits after it
    and agrees with the broken arithmetic on all 365 days.
  - ungating `daily` in `src/game/index.ts` reddens the practice lightweight
    test.
  - dropping `stopCountdown()` from `hideModal()` reddens "the countdown stops
    when the modal is dismissed"; dropping the `setInterval` reddens "counts
    DOWN".
  - removing `box-sizing: border-box` from `.modal-extra` reddens "the stats
    card is one row on the 393px phone".
  - `expectStatCardFits` is honest about its own reach, in a comment: the cells
    wrap and shrink, so `width: 300px` leaves it green and only an unshrinkable
    cell (`min-width: 300px`) reddens it. That is the failure mode the floor
    introduces, and wrapping is not a defect it should report.
- Screenshots taken at 1280/393/320 through a throwaway spec (removed): one row
  of four on desktop and the Pixel 5, 2x2 at 320px, countdown under the card.

### Reflection

The plan's step 6 asked to "keep the row on one line at 320px by letting it
wrap", which cannot both hold - four cells do not fit a 238px content box at
any honest size. Implemented as: one row at the 393px width this project runs,
wrapping below it, with both outcomes pinned as numbers rather than described
in words.

Worth carrying: a layout number that comes out wrong by exactly the padding is
a `box-sizing` question, and this file had already paid for that lesson once.
Reading `.modal`'s existing comment before writing the new rule would have
saved the round trip.
