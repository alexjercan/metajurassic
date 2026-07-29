# Fix game-over modal overflow on phone viewports

- STATUS: OPEN
- PRIORITY: 76
- TAGS: bug,ui,mobile


## Story

As a player finishing a round on my phone, I want the game-over buttons to be fully on screen, so that I can share the result I just earned.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F3.8), ON-SCREEN.

- `05-win-modal-seed42-mobile.png` (Pixel 5 viewport): the `.modal-actions` row is wider than the viewport. "OK" is clipped at x=0 and the "Share" button runs off the right edge.
- Share is the retention action, and it is the one hanging off the screen.
- The same modal is fine at 1280x800 (`06-loss-modal-seed1-desktop.png`), so this is a narrow-viewport layout issue in `src/style.css`, not modal logic.

## Steps

- [ ] Make the modal and its action row fit narrow viewports (wrap, stack, or constrain width).
- [ ] Check win, loss, daily and practice - the practice modal carries an extra "Practice" action, so it is the widest case.
- [ ] Add a mobile E2E assertion that every `.modal-actions` control lies within the viewport bounds.

## Definition of Done

- All game-over actions are within the viewport on a phone. (test: `e2e/mobile.spec.ts` bounding-box assertion)
- Win and loss, daily and practice all pass it. (test: same spec, four cases)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- `20260729-101838` will add a stats card and countdown to this same modal, making it taller and wider. Land this first, or that task inherits the overflow.
