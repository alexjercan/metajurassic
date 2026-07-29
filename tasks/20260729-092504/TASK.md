# Polish post-game flow and retention actions

- STATUS: OPEN
- PRIORITY: 62
- TAGS: ux, gameplay, feature

## Story

As a player who wins or loses a puzzle, I want the game-over state to guide me naturally to sharing, practice, profile progress, or tomorrow's puzzle, so that the session has a satisfying close and next step.

## Review Findings

- The modal has OK, Practice, and Share actions, and the hint box becomes a Practice link after game over.
- The review did not find browser tests for win/loss modal behavior, clipboard failure handling, post-game input disabled state, or profile stat update flow.
- The game has good retention surfaces, but they need a tested user journey.
- Scope split from the 2026-07-29 out-of-context review: the share content defects (fabricated average, fake streak emoji, practice rounds mislabeled with the daily puzzle id) are extracted to `20260729-101823`, and the missing stats card plus next-puzzle countdown to `20260729-101838`. This task stays focused on mapping and testing the existing journey so those changes land against captured behavior.

## Steps

- [ ] Map the win flow from correct guess to modal, share, profile progress, and practice.
- [ ] Map the loss flow from exhausted guesses to revealed answer, practice, and next attempt.
- [ ] Verify the post-game hint/practice affordance does not confuse players who expect hints to be disabled.
- [ ] Add browser tests for win and loss modal actions.
- [ ] Add coverage for clipboard success and failure behavior where feasible.
- [ ] Add follow-up tasks for any UX copy or layout changes discovered.

## Definition of Done

- Win and loss modal behavior is covered in browser tests. (test: browser E2E win/loss tests)
- Post-game input is disabled and the next-step actions remain available. (test: browser E2E post-game test)
- Share text is covered by tests for both win and loss. (test: Jest or browser share test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Useful code areas: `src/game.ts`, `src/gameState.ts`, `src/ui/modal.ts`, and `src/profile.ts`.
- Sequencing: do this before `20260729-101838` (which changes the modal) and alongside or after `20260729-092258` (the browser harness it needs).
