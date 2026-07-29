# Keep the tree visible on mobile after a guess

- STATUS: OPEN
- PRIORITY: 92
- TAGS: bug,ui,ux,mobile


## Story

As a player on a phone, I want the tree to stay visible after I guess, so that the feedback I just paid a guess for is the thing I see.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F3.5-F3.7), all ON-SCREEN:

- `20260729-092315` fixed the panel occlusion only for the PRE-FIRST-GUESS screen. From guess 1 onward `renderLastGuess` calls `openPanel()` (`src/ui/panel.ts`), and on a phone the panel is full-width: `03-after-first-guess-mobile.png` shows the Cerapoda card and no tree at all.
- The same happens on a mid-game reload (`07-returning-midgame-mobile.png`, 23 guesses left, tree fully hidden). That reload trigger is tracked separately as `20260729-125313`; this task is about the phone consequence, which persists even once the reload case is fixed.
- The only route back to the tree is the `#open-panel` pull tab, an unlabelled `✧` that is clipped by the viewport edge on both desktop and mobile (`01-first-screen-*.png`).
- The panel card itself is clipped mid-sentence with no scroll affordance on mobile.
- F3.9: on the FIRST screen the opposite problem shows up - the two-node tree floats mid-arena with large blank bands above and below it, so most of the vertical space between the top bar and the input carries nothing (`01-first-screen-mobile.png`). Same surface, same fix window: whatever presentation keeps the tree visible after a guess should also make the pre-guess screen not read as empty.

## Steps

- [ ] Decide the phone behaviour for the info panel after a guess and record it in `DECISION.md`: a non-occluding presentation (sheet/inline card under the tree) or no auto-open on narrow viewports at all. The tree must remain the primary feedback surface either way.
- [ ] Implement it without re-breaking the `manuallyClosedPanel` preference - read the body of any helper before reusing it (`LESSONS.md` `read-the-helper-body-not-its-name-before-reusing-it`).
- [ ] Give the pull tab a visible, un-clipped affordance on both viewports.
- [ ] Let long clade descriptions scroll instead of being cut off.
- [ ] Address the empty first screen (F3.9) while in this layout: the arena's vertical space should not be mostly blank before the first guess.
- [ ] Add mobile E2E coverage asserting the tree container is visible after the first guess and after a mid-game reload.

## Definition of Done

- After the first guess on a phone viewport the tree is still visible. (test: `e2e/mobile.spec.ts`)
- The panel pull tab is fully within the viewport on desktop and mobile. (test: browser E2E bounding-box check)
- A long clade description is reachable in full. (manual: inspect on a phone viewport)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Coordinate with `20260729-125313` (reload auto-open) and `20260729-092327` (onboarding); all three touch the same first-minute surface.
