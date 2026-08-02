# Add post-game stats card and next-puzzle countdown

- STATUS: OPEN
- PRIORITY: 60
- TAGS: feature, ux, gameplay
- KIND: TASK
- FLOW STEP: PLANNED
- PLAN STATUS: APPROVED

## Story

As a player finishing the daily puzzle, I want the game-over moment to show my stats and count down to the next puzzle, so that finishing feels like a ritual worth returning for tomorrow.

## Review Findings

- The win modal shows only "Solved in X / 25 guesses" and the loss modal only the answer. No streak, average, or distribution appears at game over, even though `gameStats.ts` already computes all of them for the profile page.
- There is no "next puzzle in HH:MM" countdown anywhere; that plus a stats card is the standard close that makes daily .io games sticky.
- The loss copy "You used all 25 guesses" is wrong when hints were spent (for example 22 guesses plus 1 hint).

## Steps

- [ ] `src/gameOverCopy.ts` (new, pure): `winSummary(guessCount, hintCount)` and
      `lossSummary(guessCount, hintCount)`. With no hints both return today's
      strings verbatim (`Solved in N / 25 guesses`, `You used all 25 guesses`).
      With hints they name the split, because `GameState.numberOfGuesses()`
      already folds `hintClades.size * HINT_COST` into the total, which is what
      makes the current loss line a lie at 22 guesses plus 1 hint.
- [ ] `test/gameOverCopy.test.ts` (new): the no-hint strings are unchanged, and
      the hint cases name guesses and hints separately for win and loss.
- [ ] `src/countdown.ts` (new, pure, no DOM): `msUntilNextPuzzle(now)` and
      `formatCountdown(ms)`. The boundary is LOCAL midnight, reached by
      `new Date(y, m, d + 1)` - the same calendar-field arithmetic
      `seedToDate`/`localDayIndex` use in `src/gameData.ts`, not `now + 86400000`,
      which drifts an hour across a DST night.
- [ ] `test/countdown.test.ts` (new): whole-hour and sub-minute remainders, the
      zero/negative clamp, and one DST night per `test/setTimeZone.js` +
      `test/timeZone.ts` (the pattern in `test/dstSeedDate.test.ts`) proving the
      23h and 25h nights still land on the next local midnight.
- [ ] `src/index.html`: inside `.modal`, after `#modal-stats` and BEFORE
      `.modal-actions`, add `<div class="modal-extras" id="modal-extras" hidden>`
      holding a four-cell stat row (Played / Win % / Streak / Avg) with ids and a
      `#modal-countdown` line. Ships hidden in the SHARED template - the practice
      page renders the same file (`webpack.config.js:44`) and leaves it hidden,
      the way `#new-game-btn` already does.
- [ ] `src/partials/modal.css`: style `.modal-extras` and the stat cells. Reuse
      the `.modal-stats` glass treatment; keep the row on one line at 320px by
      letting it wrap rather than by adding a media block.
- [ ] `src/ui/modal.ts`: take one options object (`speciesName`, `guessCount`,
      `hintCount`, and `daily?: ModalStats`). Render extras and start a 1s
      countdown tick only when `daily` is present; clear the interval in
      `hideModal()` and before starting a new one, so a second game-over in the
      same document cannot leave two ticking.
- [ ] `src/game/index.ts`: `showGameOverModal()` builds those options, calling
      `computeGameStats(data, defaultStorage(), "daily")` only when
      `shareContext.mode === "daily"` - the same storage-read-after-save the
      share button already relies on (`src/game/shareButton.ts`), so the round
      being shown is counted. No new `GameOptions` field.
- [ ] `grep -rn "modal-extras\|#modal-countdown" src e2e` and confirm the only
      thing that unhides the extras is the daily branch above; the practice page
      must reach none of them.
- [ ] `e2e/postgame.spec.ts`: daily win and daily loss show the four stat values
      that `computeGameStats` reports for the seeded round, and a countdown that
      matches `HH:MM:SS` and DECREASES under `page.clock.fastForward`.
- [ ] `e2e/postgame.spec.ts`: a daily loss seeded with `hintClades` renders the
      hint-aware copy (the helper already accepts `hintClades`).
- [ ] `e2e/practice.spec.ts`: a finished practice round shows `#modal-extras`
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
