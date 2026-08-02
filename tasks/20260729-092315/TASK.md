# Fix first-run mobile game focus

- PRIORITY: 90
- TAGS: bug, ui, ux, mobile
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a new mobile player, I want the first screen to clearly show the mystery target, the tree, and the input, so that I understand I am playing a guessing game before interacting with the info panel.

## Review Findings

- A live 390x844 Chromium screenshot showed the auto-opened info panel consuming almost the whole viewport on first load.
- The startup path calls `updateUI`, then `renderLastGuess`, and `renderLastGuess` opens the panel even when there is no last guess.
- On desktop, the tree remains visible but the panel still dominates the right side before the player makes a move.
- Root cause confirmed in code: `renderLastGuess` opens the panel even when `state.lastGuessId` is unset (`src/ui/panel.ts:38-48`, called from `updateUI` in `src/game.ts`), and the module-level `manuallyClosedPanel` flag resets on every page load, so the panel re-opens on each visit.

## Steps

- [x] Decide the intended first-load behavior for desktop and mobile: closed panel, collapsed panel, bottom sheet, or inline intro card.
- [x] If the chosen behavior has a product fork, record the decision in `DECISION.md` for this task before implementation.
- [x] Write the browser tests FIRST and watch them fail for the right reason: flip the `test.fixme` occlusion test in `e2e/mobile.spec.ts` (left blocked on this task by 20260729-092258), add first-load "panel closed" assertions for mobile and desktop, add "panel still auto-opens after a guess", and invert the first-load expectation in `e2e/panel.spec.ts`.
- [x] Update the startup panel behavior so the tree and input are the primary focus before the first guess, especially on mobile: drop the `openPanel()` call from the `!state.lastGuessId` branch of `renderLastGuess` (`src/ui/panel.ts`).
- [x] Preserve an easy way to inspect the starting clade hint without forcing it over the play surface: keep rendering the hint clade card into the panel on load, so the always-visible `#open-panel` pull tab reveals it in one tap.
- [x] Verify that manual panel close/open behavior still works after guesses.
- [x] Run `npm run ci` inside the nix dev shell and confirm it is green.

## Definition of Done

- On a 390x844 viewport, the first screen shows the input and primary game/tree surface without the info panel occupying the viewport. (test: browser E2E mobile first-load test)
- On desktop, the first screen remains understandable and balanced. (test: browser E2E desktop first-load test)
- The info panel can still be opened manually and auto-updates after a guess when that behavior is intended. (test: browser E2E panel test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- This task should probably depend on `20260729-092258` if we want regression tests first.
- The current implementation points to `src/game.ts`, `src/ui/panel.ts`, and `src/style.css`.
