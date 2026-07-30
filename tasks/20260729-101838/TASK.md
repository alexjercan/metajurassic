# Add post-game stats card and next-puzzle countdown

- STATUS: OPEN
- PRIORITY: 60
- TAGS: feature,ux,gameplay
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a player finishing the daily puzzle, I want the game-over moment to show my stats and count down to the next puzzle, so that finishing feels like a ritual worth returning for tomorrow.

## Review Findings

- The win modal shows only "Solved in X / 25 guesses" and the loss modal only the answer. No streak, average, or distribution appears at game over, even though `gameStats.ts` already computes all of them for the profile page.
- There is no "next puzzle in HH:MM" countdown anywhere; that plus a stats card is the standard close that makes daily .io games sticky.
- The loss copy "You used all 25 guesses" is wrong when hints were spent (for example 22 guesses plus 1 hint).

## Steps

- [ ] Extend the daily game-over modal with a compact stats card: streak, win rate, average guesses, and where this game landed in the distribution.
- [ ] Add a live countdown to the next daily puzzle, consistent with the local-time seed boundary in `dateToSeed`.
- [ ] Fix the loss copy to reflect guesses plus hints spent.
- [ ] Keep practice game over lightweight: no countdown, offer "play again".
- [ ] Test modal content for win/loss, daily/practice, and hint-using games.

## Definition of Done

- Daily game over shows real stats and a countdown. (test: browser E2E win/loss modal tests)
- Practice game over offers replay without a countdown. (test: browser E2E practice test)
- Loss copy is accurate when hints were used. (test: Jest or E2E copy test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Depends on: `20260729-092504` (post-game flow mapping/tests) so the existing journey is captured first, and `20260729-101747` (round-trip fix) so the streak shown is actually correct.
- Related: `20260729-101823` (share rewrite); the modal is where sharing happens, so design them together.

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
