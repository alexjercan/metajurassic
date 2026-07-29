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

- [x] Decide the phone behaviour for the info panel after a guess and record it in `DECISION.md`. CHOSEN: no auto-open on narrow viewports, plus a labelled pull tab. See `DECISION.md` for the constraint (panel and `#arena` share the same box at 390px) and for why this reverses the "no breakpoint fork" stance of `20260729-092315/DECISION.md`.
- [ ] Add a single narrow-viewport predicate to `src/ui/panel.ts` - one named constant wrapping `matchMedia("(max-width: 768px)")`, commented as mirroring the `@media (max-width: 768px)` block in `src/style.css`. Evaluate it per call, not once at module load, so a resized desktop window behaves correctly.
- [ ] In `renderLastGuess`, skip the tail `openPanel()` on narrow viewports and mark the tab as carrying unseen info instead. Do NOT touch the `manuallyClosedPanel` bookkeeping: `openPanel()` clears that flag as a side effect, so the new branch must not route through it (`LESSONS.md` `read-the-helper-body-not-its-name-before-reusing-it`). The desktop branch stays exactly as it is today.
- [ ] Rework the `#open-panel` pull tab into a real affordance: move it fully inside the viewport (`.panel-pull` is `right: -5px` today, and `:hover` translates it a further 5px), give it a persistent text label, and let it name the newly revealed clade with an unseen marker while a rendered card has not been opened. Opening the panel clears the marker; the `aria-label` tracks the state.
- [ ] Give `.card-content` a visible overflow affordance. It is already `overflow-y: auto`, but the thin scrollbar is invisible on a phone, so a clipped description reads as truncated rather than scrollable (F3.7). A CSS scroll-shadow / bottom fade that appears only when the content overflows is enough; no JS.
- [ ] Fix the empty first screen (F3.9): anchor the tree to the TOP of the arena on narrow viewports instead of centring it under `padding-top: 120px`, so the blank band lands below the tree and the tree stops sliding up on every guess.
- [ ] Extend `e2e/mobile.spec.ts`: tree visible and panel not `active` after the first guess; same after a mid-game reload; the tab names the revealed clade and opening it still shows the card. Extend `e2e/panel.spec.ts` with the desktop tab bounding-box check, and keep its existing auto-open and manual-close tests green unchanged.
- [ ] Re-shoot `01-first-screen-mobile.png` and `03-after-first-guess-mobile.png` via `npm run playtest:walkthrough` to confirm the two ON-SCREEN findings visually, and run `npm run ci`.

## Definition of Done

- After the first guess on a phone viewport the tree is visible and `#info-panel` does not have the `active` class. (test: `e2e/mobile.spec.ts`)
- After a mid-game reload on a phone viewport the tree is visible. (test: `e2e/mobile.spec.ts`)
- Desktop still auto-opens the panel with card content after a guess. (test: `e2e/panel.spec.ts`, existing "auto-opens with card content after a guess")
- The `manuallyClosedPanel` preference still survives a later guess and a mid-game hint. (test: `e2e/panel.spec.ts`, existing two tests, unmodified)
- The panel pull tab is fully within the viewport on desktop and mobile and carries a text label. (test: bounding-box check in `e2e/panel.spec.ts` and `e2e/mobile.spec.ts`)
- After a guess on a phone the tab names the clade that was just revealed. (test: `e2e/mobile.spec.ts`)
- A long clade description is reachable in full and the cut-off is visibly a scroll, not a truncation. (manual: inspect on a phone viewport)
- The pre-guess arena does not read as mostly blank. (manual: re-shot `playtest-shots/01-first-screen-mobile.png`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Coordinate with `20260729-125313` (reload auto-open) and `20260729-092327` (onboarding); all three touch the same first-minute surface.
- This change fixes the reload occlusion on PHONES as a side effect (the phone branch never auto-opens, whatever triggered the render). `20260729-125313` keeps its scope: the desktop reload path and the "page load vs fresh guess" contract change.

## Flow State

- FLOW STEP: PLANNED
- PLAN STATUS: APPROVED
