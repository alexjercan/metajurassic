# Make the hint chip keyboard reachable

- STATUS: OPEN
- PRIORITY: 55
- TAGS: a11y,ux
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a keyboard or screen-reader user, I want to buy a hint without a mouse, so
that the rescue mechanic is available to me at all.

## Finding

Raised as a pre-existing observation during the out-of-context review of
`20260729-092327` (see that task's `REVIEW.md`, round 1 prose notes). Not a
blocker on that branch because it predates it and is untouched by it.

`#hint-box` (`src/index.html`) is a `<div>` with a click listener
(`src/game.ts`). It has no `role="button"`, no `tabindex`, and no keydown
handler, so it cannot be focused or activated from the keyboard and is not
announced as a control. `20260729-092327` made the chip finally state what it
does ("Stuck? / Spend 3 guesses to reveal a clade"), which makes it more
obviously worth reaching.

## Steps

- [ ] Make the chip a real control: prefer an actual `<button>` over
      `role="button"` plus `tabindex` plus a keydown handler, and check the
      existing `.hint-box` styling survives the element change (it is a flex
      container with a gradient and a thick bottom border).
- [ ] Keep the disabled state honest: `.hint-box.disabled` currently only sets
      `pointer-events: none`, which does not stop keyboard activation.
- [ ] Check the game-over branch, where `#hint-text` is replaced by a Practice
      link nested inside the chip - a link inside a button is invalid and would
      need restructuring.
- [ ] Audit the other click-only surfaces in the same pass and say which are in
      scope: the `#open-panel` pull tab is already a `<button>`, but tree nodes
      (`src/ui/treeVisualizer.ts` `onSelect`) are not.

## Definition of Done

- The hint can be bought with the keyboard alone. (test: browser E2E tabbing to
  the chip and activating it with Enter and with Space, asserting the guess
  count drops by `HINT_COST`)
- A disabled hint cannot be activated by keyboard either. (test: browser E2E)
- `npm run ci` passes. (cmd: `npm run ci`)
