# Replace the share-failure alert with inline feedback

- STATUS: OPEN
- PRIORITY: 58
- TAGS: bug,ux,ui
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a player whose browser refuses the clipboard write, I want to be told inside
the game rather than by a system dialog, so that a failed share reads as part of
the game and not as a page error.

## Problem

`src/game.ts` (the `#modal-share-btn` handler) ends its rejection path with
`console.error` plus `alert("Failed to share game state. Please try again.")`.
Guesses deliberately moved OFF `alert()` for this exact reason - an unknown or
repeated guess now reports next to the input via `#input-error`, because a
system dialog interrupts the round and reads as a page error rather than as game
feedback (see the comment at `src/game.ts:96`). The share failure path never got
the same treatment, so the one place a modal action can fail is also the only
place left that still raises a browser dialog.

Found while mapping the post-game journey for `20260729-092504`; that task pins
the current `alert()` behaviour in `e2e/share.spec.ts` ("does not claim a copy
for a clipboard write that failed") so this change has a baseline to move.

## Steps

- [ ] Decide where the message belongs. The modal covers the viewport when the
      share fails, so `#input-error` is not visible; the likely home is a line
      inside `.modal-actions` or under `#modal-stats`.
- [ ] Add the element to `src/index.html` and style it to match `#input-error`.
- [ ] Replace the `alert()` in the share handler with that element, and clear it
      on a later successful share.
- [ ] Update the pinning test in `e2e/share.spec.ts` from "a dialog was raised"
      to "the inline message appeared", keeping the assertion that the button
      never claims "Copied!".

## Definition of Done

- A failed clipboard write shows an in-game message and raises no dialog.
  (test: `npm run test:e2e -- share.spec.ts`)
- No `alert(` remains in `src/`. (cmd: `grep -rn 'alert' src/`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- The failing-clipboard stub already exists: `stubShareApis(page, false, true)`
  in `e2e/share.spec.ts`.
- Sequencing: independent of `20260729-101838`, which also edits the modal.
