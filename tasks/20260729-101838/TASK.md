# Add post-game stats card and next-puzzle countdown

- STATUS: OPEN
- PRIORITY: 60
- TAGS: feature,ux,gameplay

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
