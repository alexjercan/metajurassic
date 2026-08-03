# Notes: Make the hint chip keyboard reachable

## What changes

Before: `#hint-box` is a `<div>` with a click listener. It is not focusable,
not announced as a control, and its disabled state is only
`pointer-events: none`. A keyboard or screen-reader player cannot buy a hint at
all, so the rescue mechanic is mouse/touch-only.

After: during a live round the chip is a real `<button>`. Tab reaches it, Enter
and Space buy the hint, a screen reader announces it as a button with the copy
already there ("Stuck? / Spend 3 guesses to reveal a clade"), and when a hint
is unaffordable or capped the button is natively `disabled`, so neither mouse
nor keyboard can fire it. At game over the same slot is a real `<a>` to
`/practice`, which is keyboard-reachable for free. Focus gets a visible ring.

Visual appearance, size, position and copy are unchanged in every state.

## Surfaces

| File | Why |
|------|-----|
| `src/index.html` | `#hint-box` div becomes `<button type="button">`; a sibling `<a id="hint-practice">` is added for the game-over state, `hidden` by default. |
| `src/game/hintChip.ts` | `updateHintButton` toggles the two elements instead of rewriting an anchor into `#hint-text`; drives native `disabled` instead of the `.disabled` class. |
| `src/game/index.ts` | `#hint-box` is cast to `HTMLButtonElement`; looks up the new practice anchor and passes it through. |
| `src/partials/game-shell.css` | `.hint-box` gains button resets (font/colour/text-align/width) and `:focus-visible`; `.hint-box.disabled` becomes `.hint-box:disabled`; hover excludes the disabled state. |
| `e2e/postgame.spec.ts` | Game-over assertions move from `#hint-box`/`#hint-text a` to `#hint-practice`. |
| `e2e/panel.spec.ts`, `e2e/mobile.spec.ts` | `not.toHaveClass(/disabled/)` becomes `not.toBeDisabled()`; otherwise they silently assert nothing. |
| new e2e keyboard spec (or a block in `postgame.spec.ts`) | The DoD proofs: Tab to the chip, Enter and Space each spend `HINT_COST`; a disabled chip stays inert under both keys. |

Out of scope, stated deliberately (TASK.md step 4): tree nodes
(`src/ui/treeVisualizer.ts:55`, a click listener on a plain `div`). Making a
rendered phylogeny keyboard-operable is a roving-`tabindex` / `role="tree"`
problem with its own focus-management design, not a chip swap; it deserves its
own task. `#open-panel` and `#new-game-btn` are already real buttons; the panel
tabs and modal controls were spot-checked and are not part of the hint path.

## Data and interfaces

```ts
// src/game/hintChip.ts - signatures widen by one element, types tighten
export function updateHintButton(
    state: GameState,
    hintBox: HTMLButtonElement | null,
    hintPractice: HTMLAnchorElement | null
): void;

export function wireHintPurchase(
    state: GameState,
    hintBox: HTMLButtonElement | null,
    save: () => void,
    updateUI: () => void,
    showGameOverModal: () => void
): void;
```

No game-state, storage or hint-rule types change. `findNextHintCladeId`,
`state.canUseHint()` and `HINT_COST` keep their current meaning; only who is
allowed to fire the purchase changes.

## Sketches

Illustrative only.

```html
<!-- src/index.html -->
-<div class="hint-box" id="hint-box">
-    <div class="hint-text" id="hint-text"></div>
-</div>
+<button type="button" class="hint-box" id="hint-box">
+    <div class="hint-text" id="hint-text"></div>
+</button>
+<!-- Game-over swaps the slot to a real link, not a link nested in a
+     button (invalid, and unreachable by keyboard in practice). -->
+<a
+    class="hint-box practice"
+    id="hint-practice"
+    href="<%= htmlWebpackPlugin.options.basePath %>practice"
+    hidden
+><div class="hint-text"><strong>Practice</strong></div></a>
```

```ts
// src/game/hintChip.ts
 if (state.isGameOver()) {
-    hintBox.classList.remove("disabled");
-    hintBox.classList.add("practice");
-    hintText.innerHTML = `<a href="...">...</a>`;
+    hintBox.hidden = true;
+    if (hintPractice) hintPractice.hidden = false;
     return;
 }
+hintBox.hidden = false;
+if (hintPractice) hintPractice.hidden = true;
 ...
-hintBox.classList.toggle("disabled", !canHint);
+hintBox.disabled = !canHint;
```

```css
/* src/partials/game-shell.css */
 .hint-box {
+    font: inherit;
+    color: inherit;
+    text-align: left;
     ...
 }
-.hint-box:hover { ... }
+.hint-box:hover:not(:disabled) { ... }
+.hint-box:focus-visible {
+    outline: 2px solid var(--amber-glow);
+    outline-offset: 2px;
+}
-.hint-box.disabled {
+.hint-box:disabled {
     opacity: 0.5;
-    pointer-events: none;
+    cursor: default;
     border-bottom: 4px solid #444;
 }
```

## Shape

```
.top-bar
+-------------+-----------------------------+---------------+
| #stat-box   |  hint slot (one of two)     | #new-game-btn |
+-------------+-----------------------------+---------------+
                       |
       live round      |      game over
       ---------------- ----------------
       <button #hint-box>        <a #hint-practice href=".../practice">
         .hint-text                .hint-text > strong "Practice"
         disabled <- !canHint    (hidden while the round is live)

  updateHintButton(state, hintBox, hintPractice)
      isGameOver ------------------> hide button, show anchor
      else --> copy from hintChipCopy()
               canHint = nextClade && state.canUseHint()
               hintBox.disabled = !canHint

  wireHintPurchase: click on #hint-box -> useHint -> save -> updateUI
      (Enter/Space now reach this path for free: it is a <button>)
```

## Consequences and open questions

- Two elements share one visual slot. They must carry identical layout classes
  or the top bar shifts at game over; the existing `.top-bar` and responsive
  rules (`flex: 1 1 auto; min-width: 0`) apply to `.hint-box`, so both get it.
  The mobile specs that pin the bar to one row already guard this in the live
  state; the game-over geometry is not currently pinned and will not be.
- Native `disabled` is the honest fix, but a `disabled` button is removed from
  the tab order and is not announced. That is the standard trade and matches
  the visual "greyed out"; `aria-disabled` plus a swallowed handler would keep
  it announceable at the cost of a focusable dead control. Assumption recorded:
  take native `disabled`.
- `.hint-box.disabled` disappears as a hook. Three specs assert
  `not.toHaveClass(/disabled/)`; left alone they would pass vacuously forever,
  so they move to `not.toBeDisabled()` in the same change.
- The practice href moves from runtime `__webpack_public_path__` to the
  template's `basePath`, matching `_header.html` / `_footer.html`. Both pages
  are built from this one template, so /practice/'s own game-over chip keeps
  pointing at /practice as it does today.
- UA button styling is the main visual risk: `font`, `color`, `text-align`,
  `width` and `white-space` on `<button>` differ from `<div>`. The change is
  not done until the chip is compared in a browser at desktop and at ~360px,
  which the existing `mobile.spec.ts` overflow and one-row guards partly cover.
- Open: whether the focus ring should be the amber glow or a neutral high
  contrast outline. Amber matches the chip's own accent and is proposed;
  nothing else in the app defines a focus style to copy, so this sets the
  first one. Flagging rather than blocking.
- Not answered here: tree-node keyboard access, and whether the app wants a
  global `:focus-visible` convention. Both are follow-up tasks.
