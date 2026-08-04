# Make tree nodes keyboard operable

- PRIORITY: 45
- TAGS: a11y, ux
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a keyboard or screen-reader player, I want to select a node in the guess
tree without a mouse, so that the board itself is operable, not just the
controls around it.

## Finding

Deferred deliberately from `20260729-212743` (hint chip -> real `<button>`),
which fixed the one control that was a swap away from correct.
`src/ui/treeVisualizer.ts` attaches `onSelect` as a click listener on plain
`div` node boxes: no `tabindex`, no role, no key handling. Unlike the hint chip
this is not a tag swap - a rendered phylogeny wants roving-`tabindex` focus
management and a `role="tree"`/`role="treeitem"` structure, with an answer for
how focus survives a re-render after each guess and how a scrolled-out node is
brought into view when focused.

## What changes

The tree becomes one ARIA tree widget: `ul role="tree"`, `li role="treeitem"`
per node, `ul role="group"` per nested list, one roving `tabindex="0"`, arrows
to move, Enter/Space to open the card through the existing `onSelect`. Each
item gets an `aria-label` naming it, its kind, and its state, so the warm/cold
feedback is not colour-only. A `:focus-visible` ring paints on the focused
box. The pure traversal table lives in a DOM-free `src/ui/treeNav.ts` so Jest
can cover it.

Unchanged: every painted pixel in the resting state, every existing CSS
selector, pointer behaviour, and the card/panel wiring in `src/game/index.ts`.

Six forks are settled in `DECISION.md`: `li[role=treeitem]` over a `<button>`
per node (a `group` must nest INSIDE its `treeitem`); focus restore does not
scroll while arrow moves do; the focus-ring convention is the 2px/2px SHAPE and
the hue is per surface; the mystery placeholder stays an announced
`aria-disabled` item; one remembered node id serves both the tab stop and focus
survival; tier words come from one exported `CLOSENESS_LABELS`. `NOTES.md` has
the surface survey.

## Steps

- [ ] Write the failing Jest proofs first, in a new `test/treeNav.test.ts`,
      over the synthetic tree in `test/treeFixtures.ts`. Import nothing from
      `src/ui/treeVisualizer.ts` - this file must stay DOM-free and run under
      Jest's default `node` environment. Cover: `down` from a clade is its
      first child and `null` from a leaf; `up` is `parentId` and `null` at a
      root; `left`/`right` are the previous/next sibling and `null` at each
      end; `home`/`end` are the first/last sibling (and are the node itself
      when it is an only child); an unknown `currentId` is `null`;
      `defaultNodeId` returns the target species' node id, falling back to the
      first root's id when the roots hold no target.
- [ ] Write the failing E2E proofs, in a new `e2e/treeKeyboard.spec.ts`. Pin
      the daily clock with `pinDailyClock` from `e2e/helpers/clock.ts` in a
      `beforeEach` (every spec that opens the daily page does; see
      `tasks/20260804-000316/DECISION.md`). Use `playWideTree` from
      `e2e/helpers/rounds.ts` for the multi-node board and
      `waitForTreeToSettle` from `e2e/helpers/tree.ts` before any geometry
      read. Five tests, all red on this base:
      (a) `the tree is a single tab stop` - sweep Tab a bounded number of times
      recording `document.activeElement`'s `data-node-id`, assert exactly ONE
      press landed inside `#tree-container` while other controls also took
      focus (the delivery guard that the presses ran);
      (b) `arrows walk the tree` - focus the tree's tab stop, press
      ArrowDown/ArrowUp/ArrowLeft/ArrowRight, assert `data-node-id` on
      `document.activeElement` changes to the expected relative node each time
      and that a move off the end leaves focus where it was;
      (c) `Enter and Space open the focused node's card` - parameterised over
      both keys: arrow onto a named species node, press the key, assert the
      panel is open and the card names that species (the same end state a
      click produces);
      (d) `the mystery target is announced but inert` - assert the
      placeholder's `li` carries `role="treeitem"` and `aria-disabled="true"`,
      arrow onto it, press Enter, assert no card pane opened;
      (e) `the tab stop survives a guess` - arrow to a node, Shift+Tab back to
      `#player-input`, submit one more guess, Tab forward to the tree, assert
      the same `data-node-id` has focus and that the mystery target is still
      framed in the arena (`expectNodeVisibleInArena` from
      `e2e/helpers/tree.ts`) - the second half is what pins fork 2's
      `preventScroll`.
- [ ] Extend `test/closeness.test.ts`'s existing per-tier sync block: assert
      `CLOSENESS_LABELS` has length `CLOSENESS_TIER_COUNT` and that every entry
      is a non-empty string, exactly as it already asserts for
      `CLOSENESS_CELLS` (`test/closeness.test.ts:126`).
- [ ] `src/closeness.ts`: export `CLOSENESS_LABELS`, a five-entry cold-first
      array of screen-reader words for the tiers, placed next to
      `CLOSENESS_TIER_COUNT` with a comment pointing at `CLOSENESS_CELLS` in
      `src/shareText.ts` and `.node-close-*` in `src/partials/tree.css` as the
      other two per-tier arrays it must stay in step with.
- [ ] `src/ui/treeNav.ts` (new, DOM-free). Export
      `type NavDirection = "up" | "down" | "left" | "right" | "home" | "end"`,
      `nextNodeId(roots: CladeNode[], currentId: string, direction: NavDirection): string | null`,
      and `defaultNodeId(roots: CladeNode[]): string | null`. Walk the
      `CladeNode[]` directly; `NodeBase.parentId` already gives the up edge and
      `children` the down edge, so no index needs building and no new field
      goes on `TreeNode`. Nothing here reads the DOM or a placeholder's
      inertness - fork 4 keeps the placeholder in the traversal precisely so
      this table has no special case.
- [ ] `src/ui/treeKeyboard.ts` (new, DOM half). Export
      `captureTreeFocus(container: HTMLElement): void` - records whether
      `document.activeElement` is inside the container; it must be called
      BEFORE `renderTree` wipes `innerHTML`. Export
      `mountTreeKeyboard(container, roots, onSelect?)` - resolves the tab stop
      (the remembered node id while its `[data-node-id]` still exists, else
      `defaultNodeId(roots)`, else the first root), sets `tabIndex = 0` on it
      and `-1` on the rest, attaches ONE delegated `keydown` on the container,
      and re-focuses with `{ preventScroll: true }` when the capture saw focus
      inside. The keydown maps the six keys through `nextNodeId`, moves the
      roving `tabindex`, focuses the new node and calls
      `scrollIntoView({ block: "nearest", inline: "nearest" })`; Enter and
      Space call `onSelect` for the node unless it is the placeholder; every
      handled key calls `preventDefault` (Space would otherwise scroll the
      page). Module-level state for the remembered id, in the same shape as
      `laidOutContainer` in `src/ui/treeScroll.ts`.
- [ ] `src/ui/treeVisualizer.ts`: `renderNode` sets `role="treeitem"`,
      `tabIndex = -1`, `dataset.nodeId = node.id` and an `aria-label` on the
      `li`; the nested `ul` gets `role="group"`. Add a `describeNode` helper
      building the label from the node's name plus its kind and state - clade,
      or guess plus `CLOSENESS_LABELS[node.closenessTier]`, or the target's
      three states. The placeholder's `li` also gets `aria-disabled="true"`.
      `renderTree` gets `role="tree"` on the outer `ul`, calls
      `captureTreeFocus(container)` BEFORE `container.innerHTML = ""`, and
      calls `mountTreeKeyboard(container, roots, onSelect)` after the rebuild
      and before `mountTreeScroll(container)`. The click listener and every
      class stay exactly as they are.
- [ ] `src/partials/tree.css`: after the `.tree li` rules, add
      `.tree li:focus-visible { outline: none; }` and
      `.tree li:focus-visible > .node-box { outline: 2px solid #fff;
      outline-offset: 2px; }`, with a comment recording why the hue is white
      and not the chip's amber (fork 3: amber IS `.node-clade`'s border
      colour). Nothing else in the file changes.
- [ ] `jest.config.js`: add `"src/ui/treeNav.ts"` to `collectCoverageFrom`
      immediately after the existing `src/ui/treeLayout.ts` exception, with the
      same one-line justification. `src/ui/treeKeyboard.ts` stays excluded by
      `!src/ui/**/*.ts`; it is the DOM half and is proved by the E2E spec.
      Re-run `npm run test:coverage` and confirm the four thresholds still
      pass; if the new pure module moves a floor, raise the floor rather than
      lowering it.
- [ ] Confirm in a real browser at desktop and at 360px, on a played-out board:
      the focus ring is visible on a clade node, a species node at each end of
      the tier scale, the mystery target and a winner node; arrowing to an
      off-screen node scrolls it into view without fighting the arena; and the
      resting board is pixel-identical to before. `npm run
      playtest:walkthrough` already drives a wide board and shoots it.

## Definition of Done

- The traversal table is correct in every direction and at every edge of the
  tree, and is unit-tested without a DOM. (test: `test/treeNav.test.ts`)
- The tree is exactly one tab stop no matter how many guesses are on it.
  (test: `e2e/treeKeyboard.spec.ts` `the tree is a single tab stop`)
- Arrow keys move focus between nodes along the drawn structure. (test:
  `e2e/treeKeyboard.spec.ts` `arrows walk the tree`)
- Enter and Space each open the focused node's card through the same
  `onSelect` path a click uses. (test: `e2e/treeKeyboard.spec.ts`
  `Enter and Space open the focused node's card`)
- The mystery target is announced as a disabled tree item and does nothing when
  fired. (test: `e2e/treeKeyboard.spec.ts`
  `the mystery target is announced but inert`)
- The tab stop survives the re-render a guess causes, and restoring it does not
  disturb the arena's anchoring. (test: `e2e/treeKeyboard.spec.ts`
  `the tab stop survives a guess`)
- Node state is announced in words, from one array kept in step with the other
  two per-tier arrays. (test: `test/closeness.test.ts`
  `every tier has a screen-reader label`)
- The pure navigation module is inside the coverage gate rather than excluded
  with the rest of `src/ui`. (cmd: `grep -n 'src/ui/treeNav\.ts'
  jest.config.js`)
- The focus ring is visible on all seven node states, arrowing to an off-screen
  node brings it into view without fighting the arena's anchoring, and the
  resting board is unchanged at desktop and at 360px. (manual: user judgement)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Proof colour on this base, verified at plan time: `grep -n
  'src/ui/treeNav\.ts' jest.config.js` returns no hits, exit 1 (red as
  required). `test/treeNav.test.ts`, `e2e/treeKeyboard.spec.ts` and the
  `CLOSENESS_LABELS` assertions all reference modules and exports that do not
  exist, so they fail to compile on this base - red for the intended missing
  change, not for an unrelated reason.
- Node ids are already unique and stable: `clade-<cladeId>` and
  `species-<speciesId>` (`src/treeBuilder.ts:153,216,239`). They are the
  identity written to `data-node-id`, read back on keydown, and used as the
  restore key. No new field on `TreeNode`.
- `defaultNodeId` can stay pure because `pickScrollAnchor`'s DOM query
  (`.node-mystery, .node-winner, .node-revealed` in
  `src/ui/treeScroll.ts:17`) is exactly the node with `isTarget === true` in
  all three of its states, which is data.
- `scrollIntoView` is used where `treeScroll.ts` deliberately avoids client
  rects. The hazard there is measuring during `popIn` in the frame right after
  a render (`src/ui/treeScroll.ts:26-43`); an arrow move is user-driven, well
  after that 0.3s keyframe, and the post-render restore uses `preventScroll` so
  it never enters that window at all. If CI proves otherwise, the fallback is
  `computeScrollTarget` from `src/ui/treeLayout.ts` - deliberately NOT built
  now (DECISION.md, alternatives).
- The white ring sits at a 2px offset, so it is painted over the page
  background `--bg-dark` `#0a0c10` rather than over any node fill: one contrast
  ratio for all seven states.
- `.node-mystery` sets `pointer-events: none`, which stops a pointer and
  nothing else - the same wrong-guard trap `20260729-212743` hit on
  `.hint-box.disabled`. `aria-disabled` plus the handler's own check is what
  actually makes it inert here.
- Left/Right map to previous/next SIBLING, not ARIA's collapse/expand, because
  this tree is drawn transposed (children below, siblings across) and has no
  collapsible state. Recorded in DECISION.md as the thing to revisit if
  collapsing is ever added.
