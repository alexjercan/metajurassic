# Notes: Make tree nodes keyboard operable

Goal in one line: the guess tree becomes one focusable widget whose nodes can
be reached with arrow keys and opened with Enter or Space, instead of a pile of
click-only `div`s.

## What changes

Before: `#tree-container` renders `li > div.node-box`. The box has a `click`
listener and nothing else - no `tabindex`, no role, no key handling. A keyboard
player tabs straight past the board from the hint chip to the panel pull; a
screen reader reads a run of unlabelled text with no structure and no hint that
any of it is operable. The only way to open a species or clade card is a
pointer.

After:

- The tree is a single tab stop. Tab from the hint chip lands on one node; Tab
  again leaves the board. The tree never grows the tab order, no matter how
  many guesses are on it.
- Inside the tree, arrows move: Down to a child, Up to the parent, Left/Right
  to the previous/next sibling. Home/End go to the first/last sibling.
- Enter or Space on the focused node opens exactly the card a click opens, and
  brings the panel forward, through the same `onSelect` path.
- Focusing a node scrolls it into the arena if it is out of view.
- After a guess re-renders the tree, focus returns to the node the player was
  on (it survives `renderTree`), or to the scroll anchor if that node is gone.
- The tree is announced as a tree: `role="tree"` on the outer list, `treeitem`
  per node, `group` per nested list, each item named with its own text plus its
  kind and state ("Velociraptor, guess, very close") rather than with the
  concatenated text of everything under it.
- A visible focus ring on the focused node, in the `:focus-visible` shape
  `20260729-212743` started.

Unchanged: every painted pixel in the resting state, every existing CSS
selector, pointer behaviour, and the card/panel wiring in `src/game/index.ts`.

## Surfaces

| File | Why |
|------|-----|
| `src/ui/treeVisualizer.ts` | Emits the roles, `data-node-id`, the roving `tabindex`, and the per-item `aria-label`; hands the rendered tree to the keyboard module the way it already hands it to `mountTreeScroll`. |
| `src/ui/treeKeyboard.ts` (new) | DOM half: delegated `keydown`, roving-`tabindex` bookkeeping, focus capture/restore across a re-render, scroll-into-view on move. |
| `src/ui/treeNav.ts` (new) | Pure half: node id + direction -> next node id, over the `CladeNode[]` the renderer already has. DOM-free so Jest can cover it. |
| `src/partials/tree.css` | `:focus-visible` ring on the focused node; `outline: none` on the `li` itself so the ring sits on the box, not around the connector padding. |
| `jest.config.js` | Add `src/ui/treeNav.ts` to `collectCoverageFrom`, exactly as `src/ui/treeLayout.ts` is already excepted from the `src/ui/**` exclusion. |
| `test/treeNav.test.ts` (new) | Unit proofs for the navigation table, on `test/treeFixtures.ts`. |
| `e2e/treeKeyboard.spec.ts` (new) | The behavioural proofs: one tab stop, arrow traversal, Enter/Space opens the card, focus survives a guess. |
| `src/ui/treeScroll.ts` | Read, probably not edited. It owns the arena's scroll position, and focus restore must not fight it. |
| `src/game/index.ts` | Read only. `onSelect` stays the single activation path; the keyboard route reuses it rather than duplicating card logic. |

## Data and interfaces

```ts
// src/ui/treeNav.ts - pure
export type NavDirection = "up" | "down" | "left" | "right" | "home" | "end";

/** The node a direction moves to, or null when the move runs off the tree. */
export function nextNodeId(
    roots: CladeNode[],
    currentId: string,
    direction: NavDirection
): string | null;

// src/ui/treeKeyboard.ts - DOM
export function mountTreeKeyboard(
    container: HTMLElement,
    roots: CladeNode[],
    onSelect?: (node: TreeNode) => void
): void;

/** The focused node's id, if focus is inside this container. Called by
 *  renderTree BEFORE it wipes innerHTML. */
export function captureTreeFocus(container: HTMLElement): string | null;
```

`NodeBase.id` (`src/treeBuilder.ts`) is the identity used throughout - written
to the DOM as `data-node-id`, read back on keydown, and used as the restore
key. No new field on `TreeNode`; `renderNode` already receives the whole node.

## Sketches

Illustrative only.

```diff
 function renderNode(node: TreeNode, ...): HTMLElement {
     const li = el("li");
+    li.setAttribute("role", "treeitem");
+    li.tabIndex = -1;                       // roving; one node gets 0
+    li.dataset.nodeId = node.id;
+    li.setAttribute("aria-label", describeNode(node));
     const box = el("div", "node-box");
```

```diff
 export function renderTree({ container, roots, onSelect, lastGuessId }) {
+    const focusedId = captureTreeFocus(container);
     container.innerHTML = "";
     ...
+    mountTreeKeyboard(container, roots, onSelect);
+    restoreTreeFocus(container, focusedId, { preventScroll: true });
     mountTreeScroll(container);
 }
```

```diff
+/* Amber is the chip's accent and is the CLADE node's own border colour, so it
+   would vanish on half the board. The convention 20260729-212743 started is
+   the 2px ring at 2px offset, not the hue. */
+.tree li:focus-visible { outline: none; }
+.tree li:focus-visible > .node-box { outline: 2px solid #fff; outline-offset: 2px; }
```

## Shape

```
                 Tab                       Arrow / Home / End
  hint chip ---------> [ tree ] <----------------------------.
                          |  one roving tabindex=0            |
                          v                                   |
   ul role=tree                                               |
     li role=treeitem  data-node-id  aria-label ---------------'
       div.node-box            (paint only: classes, text, click)
       ul role=group
         li role=treeitem ...

  keydown (delegated on the tree root)
     |
     +-- arrows -> treeNav.nextNodeId(roots, id, dir) -> pure
     |                |
     |                v
     |          move tabindex 0, focus(), scrollIntoView(nearest)
     |
     +-- Enter/Space -> onSelect(node)  ==  the click path
                             |
                             v
                 renderSpeciesCard / renderCladeCard -> showCardPane, openPanel

  re-render after a guess
     captureTreeFocus -> innerHTML = "" -> rebuild -> restore (preventScroll)
                                                   -> mountTreeScroll anchors
```

## Consequences and open questions

Costs. Two new modules and a second stateful thing reading the arena's scroll
position; `treeScroll.ts` already owns it and is documented as delicate
(instant scrolls, offset-not-rect geometry, the Android URL-bar case), so
focus-driven scrolling is the one place this change can regress a shipped fix.
The per-item `aria-label` is a second place node state is described in words -
the share grid and the `.node-close-*` comment being the others - so a tier
rename now has one more site.

Forecloses. A collapsible tree later would want `aria-expanded` on the same
`treeitem`s; nothing here blocks that, but the nav table (Left = previous
sibling) is the transposed-layout mapping, not the ARIA-standard one
(Left = collapse), and adopting collapse later means revisiting it.

Open, and for `DECISION.md` in planning:

1. `li role="treeitem"` versus a `<button>` per node. Leaning `li`: it keeps
   `.node-box` a `div`, so every e2e selector, the `getComputedStyle` font
   sampling in `layoutTree`, and the connector CSS are untouched, and the
   `treeitem -> group` hierarchy nests without `aria-owns`. The cost is
   hand-rolled Enter/Space instead of native activation - which is exactly what
   `20260729-212743`'s DECISION rejected for the chip, so this fork must be
   argued, not assumed.
2. Focus versus the game's own anchoring after a guess. Leaning: restore with
   `preventScroll`, let `layoutTree` keep framing the target, and only scroll
   on a deliberate arrow move. The alternative pulls the focused node into view
   and can push the target out of frame on the same beat the guess lands.
3. The focus-ring colour. Amber is unreadable against `.node-clade`'s amber
   border, so the answer is probably "the convention is the 2px/2px ring shape,
   the hue is per surface". Needs a contrast check against all seven node
   states, not just the two clade ones.
4. The mystery placeholder. It has `pointer-events: none` and no handler.
   Leaning: keep it a `treeitem` so it is announced and arrow-reachable, marked
   `aria-disabled="true"` and inert on Enter - a tree with a hole where the
   answer is would be worse. Rejecting that means the nav table must skip it.
5. Where the single tab stop sits on a fresh load, and whether it follows the
   last-focused node or resets. Leaning: the last-focused node id while it
   still exists, else `treeScroll`'s scroll anchor (mystery/winner/revealed),
   else the first root - so Tab lands the player where the board is pointing.
6. Whether `scrollIntoView` behaves under the canvas's `scale()` transform
   across the CI browser. `treeScroll.ts` deliberately avoids
   `getBoundingClientRect` mid-animation for a related reason; if
   `scrollIntoView` proves unreliable here, the fallback is to compute the
   target with the existing `computeScrollTarget` instead.
