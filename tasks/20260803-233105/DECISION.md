# Decision: Make tree nodes keyboard operable

- DATE: 20260804-090832
- STATUS: ACCEPTED
- TASK: 20260803-233105
- TAGS: a11y, ux

## Context

`renderTree` (src/ui/treeVisualizer.ts) paints `li > div.node-box` and attaches
a `click` listener to the box. No `tabindex`, no role, no key handling: the
board is pointer-only, and a screen reader gets an unlabelled run of text with
no structure. `tasks/20260729-212743/DECISION.md` fixed the neighbouring hint
chip by making it a native `<button>` and explicitly rejected
`role=... + tabindex + keydown`, so a custom widget here has to be argued rather
than assumed.

Four forces shape the answer. The tree is a COMPOSITE widget, so ARIA's tree
pattern (one tab stop, arrows inside) applies whatever element carries focus.
`src/ui/treeScroll.ts` already owns the arena's scroll position and is
documented as delicate - instant scrolls, offset-not-rect geometry read one
frame after render while `popIn` is still animating, and the Android URL-bar
resize case - so anything that scrolls on focus can regress a shipped fix.
`renderTree` wipes `innerHTML` on every guess, so any focus or tab-stop state
must be re-established after each render. And the target's node is
`pointer-events: none` with no handler while it is the mystery placeholder.

## Decision

**Fork 1 - `li[role=treeitem]`, not a `<button>` per node.** ARIA requires a
`treeitem`'s child `group` to be INSIDE that `treeitem`. The nested `<ul>` is a
sibling of `.node-box` and a child of the `li`, so only the `li` can carry
`treeitem` without inventing `aria-owns` plumbing. That constraint - not
selector convenience - is what settles it. Enter and Space are therefore
hand-rolled; this diverges from 20260729-212743 because a native button would
NOT have removed the custom key handling (arrows and roving `tabindex` are
required either way), it would only have added a structural problem.

**Fork 2 - focus restore does not scroll; arrow moves do.** After a re-render
the tab stop is restored with `focus({ preventScroll: true })`, leaving
`layoutTree`'s anchoring untouched, so the frame the guess produces is the
frame the player keeps. A deliberate arrow move calls
`scrollIntoView({ block: "nearest", inline: "nearest" })`. `scrollIntoView` is
safe here where `treeScroll` avoids client rects: the hazard there is measuring
mid-`popIn` in the frame after render, and an arrow move is user-driven, long
after that 0.3s keyframe.

**Fork 3 - the focus ring's SHAPE is the convention, the hue is per surface.**
`2px solid` at `2px` offset, as 20260729-212743 introduced, but white rather
than amber: amber is `.node-clade`'s own border colour and would vanish on half
the board. The ring sits at an offset, so it is painted over the page
background (`--bg-dark`, `#0a0c10`) in all seven node states, not over the node
fill - one contrast ratio to check, not seven. `outline: none` on the `li` puts
the ring on the box rather than around the connector padding.

**Fork 4 - the mystery placeholder stays a `treeitem`.** It is announced and
arrow-reachable, marked `aria-disabled="true"`, and inert on Enter/Space. A
tree with a hole where the answer is would be worse than an announced
unavailable node, and skipping it would put a special case in the pure nav
table.

**Fork 5 - one remembered node id serves both the tab stop and focus
survival.** `treeKeyboard.ts` keeps the last node the player moved to. After a
render, that id (when it still exists) takes `tabindex="0"`; otherwise the
target's node, otherwise the first root. If focus was inside the container
before the wipe, the same id is re-focused. Preserving the TAB STOP is the
reachable requirement - arrow to a node, Shift-Tab to the input, guess, Tab
back - and focus survival falls out of it for one `contains` check.

**Fork 6 - tier words come from one exported array.** `CLOSENESS_LABELS` in
`src/closeness.ts`, next to `CLOSENESS_TIER_COUNT`, in the same shape as
`CLOSENESS_CELLS` in shareText.ts and held to length by the existing
`test/closeness.test.ts` sync check. Without it the board's warm/cold feedback
is colour-only for a screen-reader player, which is the same gap in a different
modality.

## Alternatives considered

- **`<button class="node-box">` per node.** Gives native Enter/Space and the
  `button` role for free, and keeps every `.node-box` selector and the
  `getComputedStyle` font sampling in `layoutTree` working. Rejected on the
  group-nesting constraint above: with the button as `treeitem`, the child
  `ul role=group` is its SIBLING, which the pattern does not allow. Arrows and
  roving `tabindex` would still be hand-written, so the trade buys one
  behaviour and costs the structure.
- **Every node in the tab order (no roving `tabindex`).** Simplest possible
  change - one attribute - and needs no nav module at all. Rejected: a
  twelve-guess board is 24+ nodes, so Tab from the hint chip to the input would
  cross the whole tree, and the tab order would grow with every guess. This is
  the case the tree pattern exists for.
- **Restore focus WITH scrolling** (plain `focus()`). Rejected: it runs in the
  same beat as `layoutTree`'s anchoring and can push the target out of frame
  exactly when the guess lands.
- **Compute the focus scroll with `computeScrollTarget`** instead of
  `scrollIntoView`. Rejected as unrequired machinery: a second stateful reader
  of the arena's scroll position is precisely the regression risk, and the
  `popIn` hazard does not apply to a user-driven arrow move. Reversible in one
  function if CI proves otherwise.
- **Skip the placeholder in the nav table.** Rejected: a gap in the traversal
  where the answer is, plus a DOM-state special case inside the pure module.
- **Do nothing.** The board - the game's main surface - stays pointer-only,
  which is the finding this task exists for.

## Consequences

Easier: the board becomes one predictable tab stop whose size does not grow
with the round; the pure `treeNav.ts` makes the traversal table unit-testable
under Jest's node environment, so the hard part is not stuck behind the
`src/ui/**` coverage exclusion; `aria-expanded` for a future collapsible tree
drops onto the same `treeitem`s.

Harder: Enter/Space are hand-rolled, so Space's default page-scroll must be
suppressed explicitly and the two keys can drift from native semantics. Node
state is now described in words in a THIRD place (the share grid and the
`.node-close-*` comment being the others), so a tier rename has one more site -
mitigated by `CLOSENESS_LABELS` being the single source and length-checked. The
nav table maps Left/Right to previous/next SIBLING, which is the transposed
layout's mapping and not ARIA's (Left = collapse); adopting collapse later
means revisiting it. And `treeVisualizer.ts` now hands the tree to two mount
functions instead of one, with an ordering requirement between them (capture
before the wipe).
