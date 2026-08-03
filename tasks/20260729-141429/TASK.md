# Fix the duplicated word in the share headline

- PRIORITY: 50
- TAGS: bug, ux, content
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

## Story

As a player pasting my result, I want the first line to read cleanly, so that the share message looks deliberate.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F4.2), ON-SCREEN.

- The share headline renders `✅ Dinosaur dinosaur-#00211 🦖`. `formatPuzzleId` (`src/gameState.ts`) already returns `dinosaur-#00211`, and `formatGameStateForSharing` prefixes `Dinosaur ` again.
- Practice is worse: `✅ Practice Dinosaur dinosaur-#00043 🦖`.
- It is the first line of the thing players paste in public.

## Steps

- [ ] Decide the display form (for example `Dinosaur #211` / `Practice Dinosaur #43`) and apply it in one place.
- [ ] Do NOT change `gameStateKey` / `parseGameStateKey`. The storage key format and its parse inverse are load-bearing for profile dates and streaks (`20260729-101747`); only the human-facing headline changes.
- [ ] Update the share tests and any E2E expectations that assert the old string.

## Definition of Done

- The headline names the puzzle once. (test: `test/share.test.ts`)
- Storage keys are unchanged. (test: existing `gameStateKey`/`parseGameStateKey` round-trip tests still pass untouched)
- `npm run ci` passes. (cmd: `npm run ci`)
