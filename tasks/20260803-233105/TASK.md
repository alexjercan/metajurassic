# Make tree nodes keyboard operable

- PRIORITY: 45
- TAGS: a11y, ux
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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
per node (a `group` must nest INSIDE its `treeitem`); a render restores the tab
stop rather than focus, and only arrow moves scroll; the focus-ring convention
is the 2px/2px SHAPE and the hue is per surface; the mystery placeholder stays
an announced `aria-disabled` item; one remembered node id is the tab stop, and
both the keyboard and the pointer write it; tier words come from one exported
`CLOSENESS_LABELS`. `NOTES.md` has the surface survey.

## Steps

- [x] Write the failing Jest proofs first, in a new `test/treeNav.test.ts`,
      over the synthetic tree in `test/treeFixtures.ts`. Import nothing from
      `src/ui/treeVisualizer.ts` - this file must stay DOM-free and run under
      Jest's default `node` environment. Cover: `down` from a clade is its
      first child and `null` from a leaf; `up` is `parentId` and `null` at a
      root; `left`/`right` are the previous/next sibling and `null` at each
      end; `home`/`end` are the first/last sibling (and are the node itself
      when it is an only child); an unknown `currentId` is `null`;
      `defaultNodeId` returns the target species' node id, falling back to the
      first root's id when the roots hold no target.
- [x] Write the failing E2E proofs, in a new `e2e/treeKeyboard.spec.ts`. NO
      clock pin: `pinDailyClock` is for specs that open the DAILY page
      (`tasks/20260804-000316/DECISION.md`), and `playWideTree` opens the
      seeded PRACTICE round, which is why `e2e/tree.spec.ts` - the other
      consumer of the same fixture - has none either. Corrected at
      implementation time; the plan's clause named the wrong page.
      Use `playWideTree` from
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
      (e) `the tab stop survives a guess` - arrow to a node, Tab out to
      `#player-input`, submit one more guess, Tab forward to the tree, assert
      the same `data-node-id` has focus. The planned second half - that the
      mystery target is still framed in the arena, pinning fork 2's
      `preventScroll` - was dropped in review round 1 along with the restore it
      guarded; see R1.1 and DECISION.md fork 2.
      A sixth test,
      `the board is announced as a named tree of labelled items`, was added in
      review round 2 (R2.1): the ARIA layer this task exists to add was
      otherwise read back by nothing, so every role and label could be deleted
      with the suite still green.
      Test (b) gained an End and a Home press in review round 3 (R3.1), for
      the same reason: the two bindings could be deleted from `KEY_DIRECTIONS`
      with the suite still green.
- [x] Extend `test/closeness.test.ts`'s existing per-tier sync block: assert
      `CLOSENESS_LABELS` has length `CLOSENESS_TIER_COUNT` and that every entry
      is a non-empty string, exactly as it already asserts for
      `CLOSENESS_CELLS` (`test/closeness.test.ts:126`).
- [x] `src/closeness.ts`: export `CLOSENESS_LABELS`, a five-entry cold-first
      array of screen-reader words for the tiers, placed next to
      `CLOSENESS_TIER_COUNT` with a comment pointing at `CLOSENESS_CELLS` in
      `src/shareText.ts` and `.node-close-*` in `src/partials/tree.css` as the
      other two per-tier arrays it must stay in step with.
- [x] `src/ui/treeNav.ts` (new, DOM-free). Export
      `type NavDirection = "up" | "down" | "left" | "right" | "home" | "end"`,
      `nextNodeId(roots: CladeNode[], currentId: string, direction: NavDirection): string | null`,
      and `defaultNodeId(roots: CladeNode[]): string | null`. Walk the
      `CladeNode[]` directly; `NodeBase.parentId` already gives the up edge and
      `children` the down edge, so no index needs building and no new field
      goes on `TreeNode`. Nothing here reads the DOM or a placeholder's
      inertness - fork 4 keeps the placeholder in the traversal precisely so
      this table has no special case. `up` confirms the forest holds the
      `parentId` before returning it (R2.2), for the same reason the sibling
      lookup does.
- [x] `src/ui/treeKeyboard.ts` (new, DOM half). Export
      `mountTreeKeyboard(container, roots, onSelect?)` - resolves the tab stop
      (the remembered node id while its `[data-node-id]` still exists, else
      `defaultNodeId(roots)`, else the first root), sets `tabIndex = 0` on it
      and `-1` on the rest, and attaches ONE delegated `keydown` plus one
      delegated `focusin` on the container. The keydown maps the six keys
      through `nextNodeId`, moves the roving `tabindex`, focuses the new node
      and calls `scrollIntoView({ block: "nearest", inline: "nearest" })`;
      Enter and Space call `onSelect` for the node unless it is the
      placeholder; every handled key calls `preventDefault` (Space would
      otherwise scroll the page); a key held with Alt, Ctrl or Meta is left to
      the browser (R1.3). The focusin moves the roving `tabindex` to a node
      that took focus by pointer, which never reaches the keydown (R1.2).
      Module-level state for the remembered id, in the same shape as
      `laidOutContainer` in `src/ui/treeScroll.ts`. The planned
      `captureTreeFocus` export and the `{ preventScroll: true }` re-focus were
      removed in review round 1 as unreachable; see R1.1.
- [x] `src/ui/treeVisualizer.ts`: `renderNode` sets `role="treeitem"`,
      `aria-expanded="true"` on every node that owns a `group` (R1.5),
      `tabIndex = -1`, `dataset.nodeId = node.id` and an `aria-label` on the
      `li`; the nested `ul` gets `role="group"`. Add a `describeNode` helper
      building the label from the node's name plus its kind and state - clade,
      or guess plus `CLOSENESS_LABELS[node.closenessTier]`, or the target's
      three states. The placeholder's `li` also gets `aria-disabled="true"`.
      `renderTree` gets `role="tree"` plus `aria-label="guess tree"` (R2.5) on
      the outer `ul` and calls
      `mountTreeKeyboard(container, roots, onSelect)` after the rebuild and
      before `mountTreeScroll(container)`. The click listener and every
      class stay exactly as they are.
- [x] `src/partials/tree.css`: after the `.tree li` rules, add
      `.tree li:focus-visible { outline: none; }` and
      `.tree li:focus-visible > .node-box { outline: 2px solid #fff;
      outline-offset: 2px; }`, with a comment recording why the hue is white
      and not the chip's amber (fork 3: amber IS `.node-clade`'s border
      colour). Nothing else in the file changes.
- [x] `jest.config.js`: add `"src/ui/treeNav.ts"` to `collectCoverageFrom`
      immediately after the existing `src/ui/treeLayout.ts` exception, with the
      same one-line justification. `src/ui/treeKeyboard.ts` stays excluded by
      `!src/ui/**/*.ts`; it is the DOM half and is proved by the E2E spec.
      Re-run `npm run test:coverage` and confirm the four thresholds still
      pass; if the new pure module moves a floor, raise the floor rather than
      lowering it.
- [x] Confirm in a real browser at desktop and at 360px, on a played-out board:
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
- Enter opens the focused node's card through the same `onSelect` path a click
  uses. (test: `e2e/treeKeyboard.spec.ts`
  `Enter opens the focused node's card`)
- Space opens the card the same way. (test: `e2e/treeKeyboard.spec.ts`
  `Space opens the focused node's card`)
- Space does not scroll the board instead. (test: `e2e/treeKeyboard.spec.ts`
  `Space does not scroll the board`)
- A deliberate arrow move brings the node it lands on into view. (test:
  `e2e/treeKeyboard.spec.ts` `an arrow move brings the focused node into view`)
- The mystery target is announced as a disabled tree item and does nothing when
  fired. (test: `e2e/treeKeyboard.spec.ts`
  `the mystery target is announced but inert`)
- The tab stop survives the re-render a guess causes. (test:
  `e2e/treeKeyboard.spec.ts` `the tab stop survives a guess`)
- The roving `tabindex` follows a pointer click, not only the arrows. (test:
  `e2e/treeKeyboard.spec.ts` `clicking a node moves the tab stop to it`)
- A direction key held with Alt, Ctrl or Meta is left to the browser. (test:
  `e2e/treeKeyboard.spec.ts` `a modified direction key is left to the browser`)
- The tier words come from one array kept in step with the other two per-tier
  arrays. (test: `test/closeness.test.ts` `every tier has a screen-reader
  label`)
- The board is announced as a named tree, each clade an expanded item owning a
  group, and a guessed species' label carries its name and its tier word, so
  the warm/cold feedback is not colour-only. (test:
  `e2e/treeKeyboard.spec.ts`
  `the board is announced as a named tree of labelled items`)
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
  after that 0.3s keyframe, and nothing else in the widget scrolls at all. If
  CI proves otherwise, the fallback is
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

## Close-out

### What and why

The board is one ARIA tree widget. `renderNode` puts `role="treeitem"`, an
`aria-label`, `tabindex="-1"` and `data-node-id` on each `li`; the nested `ul`s
get `role="group"` and the outer one `role="tree"`. `treeNav.ts` holds the
traversal table with no DOM in it, so Jest covers the hard part under the
default `node` environment; `treeKeyboard.ts` holds the roving `tabindex` and
the delegated `keydown` and `focusin`. `CLOSENESS_LABELS` makes the
warm/cold feedback a word, so the board's answer is not colour-only.

Plan followed as written except for two corrections, both recorded above or
below:

- Step 2's clock-pin clause named the wrong page. The fixture is the seeded
  PRACTICE round, so `pinDailyClock` does not apply; `e2e/tree.spec.ts`, the
  other consumer of `playWideTree`, has no pin either. Corrected in the Step.
- The spec has SIX tests, not five. The extra one, `an arrow move brings the
  focused node into view`, was split out of `the tab stop survives a guess`:
  that test's second half was asserting two unrelated things (the restore does
  NOT scroll, and a deliberate move DOES), and a failure could not say which.

### Alternatives considered during implementation

- **`scrollIntoView` on the `li` rather than its `> .node-box`.** Rejected on
  measurement: an `li`'s box spans its whole SUBTREE, so scrolling the item
  frames the subtree's edge instead of the node the player is looking at - 34px
  of horizontal difference arrowing to the root on the wide board. Both land
  legally, so no test caught it; the comment at `src/ui/treeKeyboard.ts:82`
  carries the reason.
- **Falling back to the roots when a node's `parentId` names a node the forest
  does not hold.** Rejected: it teleports focus across the tree on malformed
  data. `nextNodeId` reports no sibling instead, pinned by
  `a node whose parent is missing has nowhere to go`.
- **`computeScrollTarget` for the focus scroll** stayed unbuilt, as DECISION.md
  planned. CI did not prove it necessary.

### Difficulties and diagnosis

- Arming `:focus-visible` for the manual photographs. Chromium follows the last
  input modality, so a programmatic `.focus()` after a mouse-driven page load
  paints no ring at all. First attempt nudged focus with ArrowRight/ArrowLeft,
  which armed the ring but MOVED focus off every leaf node - four of the eight
  shots were of the wrong node, and the log line printing `focus landed on X
  (wanted Y)` is what caught it. Fixed by pressing an unhandled key (`Shift`)
  to set the modality, then focusing.
- The manual shots also had to be viewport screenshots, not element
  screenshots: at 360px `#tree-container` is a scroll port, and an element shot
  silently crops to its top-left corner rather than following the scroll.

### Evidence

- `npm run ci`: exit 0. 387 Jest tests in 29 suites, 175 Playwright tests, all
  four coverage thresholds pass. That count includes the thirteen new Jest tests
  in `test/treeNav.test.ts` and the six new E2E declarations in
  `e2e/treeKeyboard.spec.ts`, which run as seven cases because Enter and Space
  are parameterised.
- `grep -n 'src/ui/treeNav\.ts' jest.config.js` -> `20:` , exit 0 (was exit 1
  on the base).
- Coverage moved up on every axis with the new module inside the gate:
  branches 79.06 -> 81.75, functions 99 -> 99.31, lines 97.79 -> 98.21,
  statements 94.4 -> 95.37. Floors left where they were rather than raised,
  since nothing forced one.
- `npm run playtest:walkthrough`: exit 0, all five closeness tiers painted the
  expected classes on both viewports - the resting board is unchanged.
- Focus ring photographed on all seven node states at 1920x1000 and at 360x740.
  Ring visible on the root clade, an inner clade, every tier from ice cold to
  scorching, the winner node and the mystery placeholder. Every `aria-label`
  read back as intended (`Dinosauria, clade`; `Stegosaurus, guess, ice cold`;
  `the mystery dinosaur, not found yet`; ...). Shots are in `/tmp/focus-shots`
  and `/tmp/focus-shots2` - throwaway, not committed, and the DoD clause stays
  `manual:` for the user's own judgement.

### Reflection

The split into a DOM-free traversal module and a DOM shell paid for itself
twice: the nine unit tests cover edges (missing parent, unknown id, only-child
Home/End) that would each have cost a browser round trip, and the E2E spec is
left asserting only what a browser can uniquely prove. Worth repeating whenever
`src/ui/**`'s coverage exclusion would otherwise swallow real logic.

The near-miss worth remembering is the `li`-versus-`.node-box` scroll target.
Both choices pass every automated assertion, and only looking at the board
found it. A widget whose whole point is where the player's eye goes needs a
human to look at least once, which is what the `manual:` clause is for.

### Review round 1

Six findings, all addressed; the numbers in Evidence above are the round-1
run and are superseded by the ones at the end of this section.

- **R1.1 (MAJOR), the focus restore.** Deleted `captureTreeFocus`,
  `hadFocusInside` and the `focus({ preventScroll: true })` call, plus the
  `captureTreeFocus(container)` line in `renderTree`. The reviewer's call-graph
  argument holds: `renderTree`'s only caller is `updateUI`, reached from
  `submitGuess`, the hint-chip click and init, and in all three the player has
  just operated a control outside `#tree-container`, so the capture always read
  false. `the tab stop survives a guess` keeps its first half, which is the
  reachable requirement and was already sound, and loses the
  `expectNodeVisibleInArena` closer that was asserting the ordinary render
  anchoring under the restore's name. DECISION.md fork 2 and fork 5 rewritten,
  and the "restore focus WITH scrolling" alternative became "restore focus at
  all - built, then removed".
- **R1.2 (MINOR), the tab stop desyncing on a click.** Added the delegated
  `focusin` in `mountTreeKeyboard`. Pinned by `clicking a node moves the tab
  stop to it`, which fails without the listener.
- **R1.3 (MINOR), modifier chords swallowed.** Guarded on
  `altKey || ctrlKey || metaKey`, placed before the direction lookup so it
  covers Enter and Space too - Ctrl+Enter has no more business opening a card
  than Alt+ArrowLeft has moving focus. Pinned by `a modified direction key is
  left to the browser`.
- **R1.4 (MINOR), Space's suppressed scroll unproved.** Fixed, but not where
  the finding proposed, and the first fix was itself green under sabotage
  twice. See Difficulties below.
- **R1.5 (NIT), `aria-expanded`.** Set to `"true"` on the branch of
  `renderNode` that appends the group `ul`.
- **R1.6 (NIT), Home/End scope.** One sentence added to DECISION.md's
  Consequences, next to the Left/Right paragraph.

### Difficulties in round 1: proving Space does not scroll

Three attempts, the first two of which passed with `event.preventDefault()`
deleted from the source:

1. Record `#arena`'s offsets before the press and assert they are unchanged
   after, as R1.4 proposed. Green under sabotage. `arrowTo` leaves the arena at
   its MAXIMUM scroll (162 of 162 on this board), so a default page-down had
   nowhere to go and the assertion was about the geometry, not the handler.
2. Park the arena at `scrollTop = 0` first, with a headroom guard, and press on
   a species node. Still green under sabotage: opening the card relayouts the
   panel and the arena comes back to the offset the press started from, so the
   default scroll is invisible on any node that opens a card.
3. Press on the INERT mystery node, where `preventDefault` still runs (it is
   ahead of the `aria-disabled` guard) but nothing else touches the arena - and
   read the offset after a settle delay, because Chromium ANIMATES a keyboard
   scroll and `waitForTreeToSettle` does not cover it: a smooth scroll is not a
   Web Animation, so the tick after the press still reads 0. This one fails
   with the source sabotaged, `Received: 162`.

Each attempt was found by deleting the mechanism and re-running, not by reading
the test. A negative assertion - "X did not happen" - is green for the right
reason and for every wrong one, and this one had two wrong ones stacked.

### Round 1 evidence

- `npm run ci`: exit 0. 387 Jest tests in 29 suites, 178 Playwright tests (168
  before this branch, 175 before the round-1 fixes), coverage unchanged at
  95.37 statements / 81.75 branches
  / 99.31 functions / 98.21 lines. `treeKeyboard.ts` is DOM-half code excluded
  from the gate, so the deletion moves no number.
- `e2e/treeKeyboard.spec.ts` is now nine declarations running as ten cases.
- `grep -n 'src/ui/treeNav\.ts' jest.config.js` -> `20:`, exit 0.
- Sabotage, one mechanism at a time, restored from a scratch copy each time:
  removing the Space `preventDefault` fails `Space does not scroll the board`;
  removing the modifier guard fails `a modified direction key is left to the
  browser`; removing the `focusin` registration fails `clicking a node moves
  the tab stop to it`. All three were green before their fix's test existed.
- The `manual:` clause stays pending and Step 10 unticked. The round-1
  photographs are still valid for the ring and the labels: nothing in this
  round changes a painted pixel or an `aria-label`. `aria-expanded` and the
  `focusin` sync are not visible in a screenshot.

### Review round 2

Five findings, all addressed. The numbers above are superseded by the round-2
evidence at the end of this section.

- **R2.1 (MAJOR), the ARIA layer was read back by nothing.** The task's whole
  point - roles, `aria-expanded`, and the labels that make warm/cold not
  colour-only - was purely additive: every attribute could be deleted or
  replaced with a literal and 387 Jest tests and the desktop Playwright
  project stayed green. Added `the board is announced as a named tree of
  labelled items`, which asserts the named `ul[role="tree"]`, a branching
  item's `aria-expanded="true"` and its own `ul[role="group"]` holding exactly
  its children, and that a guessed species' label carries its painted name and
  the tier word for the `.node-close-*` class it is painted in. The tier is
  read off the CLASS rather than recomputed, so the assertion is that the
  announcement agrees with the colour on screen. The DoD clause is split in
  two, so each half names the test that proves it.
- **R2.2 (MINOR), `up` past a missing parent.** `nextNodeId` now confirms the
  forest holds `parentId` before returning it, matching the sibling branch
  that was already hardened. The orphan unit test gains the `up` case and is
  renamed to say it is about every direction, not only siblings.
- **R2.5 (NIT), the unnamed tree.** `aria-label="guess tree"` on the outer
  `ul`. No heading exists over the board, so `aria-labelledby` was not an
  option.
- **R2.3, R2.4 (record fixes).** The Playwright count parenthetical now reads
  "(168 before this branch, 175 before the round-1 fixes)", and round 1's
  declaration count is corrected to nine.

### Round 2 evidence

- `npm run ci`: exit 0. 387 Jest tests in 29 suites, 179 Playwright tests
  (168 before this branch). Coverage 95.37 statements / 81.83 branches / 99.31
  functions / 98.21 lines - branches up 0.08 from the `up` guard, the rest
  unchanged. No floor moved.
- `grep -n 'src/ui/treeNav\.ts' jest.config.js` -> `20:`, exit 0.
- Sabotage, one mechanism at a time, restored from a scratch copy each time.
  Six separate runs, each failing on its own assertion: removing `role="tree"`
  (count 0), the tree's `aria-label` (`""`), `aria-expanded` (`""`),
  `role="group"` (count 0); replacing the whole label with `"x"`; and dropping
  only the tier word from `describeNode` (`"Proceratosaurus, guess"`).
  Reverting `up` to `current.parentId ?? null` fails the unit test with
  `Received: "clade-missing"`.
- `e2e/treeKeyboard.spec.ts` is now ten declarations running as eleven cases.
- The `manual:` clause stays pending and Step 10 unticked. Nothing this round
  changes a painted pixel; `role`, `aria-expanded` and the tree's own label
  are invisible in a screenshot.

### Reflection on round 2

The gap both earlier rounds missed has a shape worth naming: an ADDITIVE
attribute layer. Round 1's whole effort went into asking whether a negative
assertion ("Space did not scroll") was green for the right reason - three
attempts, two of them false. Nobody asked the easier question about the
positive ones, because there were none: the roles and labels were written and
never read. Every attribute a plan names deserves one assertion, and the cheap
check is the reviewer's - replace the value with a literal and see whether
anything goes red.

### Review round 3

One finding, addressed.

- **R3.1 (MAJOR), Home and End bound but never pressed.** Two of the six
  bindings in `KEY_DIRECTIONS` were a shipped mechanism nothing read back:
  `test/treeNav.test.ts` covers the `"home"`/`"end"` DIRECTIONS thoroughly, but
  nothing tied a direction to its key, and the whole desktop project stayed
  green with both lines deleted. `arrows walk the tree` now presses End and
  Home on the sibling row. The proposed fix needed one addition to be worth
  anything: on the first two-wide row, End lands where ArrowRight already
  went, so `branchingItem` now returns the WIDEST row - three wide here -
  making End a jump over the middle sibling rather than a repeat of the
  previous assertion. Its three other callers only need two children, so none
  changes meaning.

### Round 3 evidence

- `npm run ci`: exit 0. 387 Jest tests in 29 suites, 179 Playwright tests,
  coverage unchanged at 95.37 / 81.83 / 99.31 / 98.21. The new presses are in
  an existing declaration, so the case count does not move.
- Sabotage, one binding at a time: removing `End: "end"` fails the End
  assertion (`species-proceratosaurus` for `species-struthiomimus`); removing
  `Home: "home"` fails the Home assertion with the pair reversed; removing
  both was green before this fix (122 passed on the desktop project) and is
  red after it.
- The row width was measured rather than assumed, with a throwaway spec
  against the same fixture: eleven rows are two wide and `clade-coelurosauria`
  is three, which is the row `branchingItem` now returns.
- The `manual:` clause stays pending and Step 10 unticked. This round adds two
  key presses to a test and changes no painted pixel.

### Reflection on round 3

Two rounds in a row found the same shape: something the plan named, built and
never read back. Round 2 was the ARIA attributes, round 3 the Home and End
bindings. Both hid behind coverage that looked adequate one level away - the
tier words had a unit test for the ARRAY, the direction table had a unit test
for the DIRECTIONS - and in both cases the honest check is the same one
sentence: delete the mechanism and see whether anything goes red. The split
into a pure module and a DOM shell, which paid for itself in round 1, is
exactly what made this easy to miss twice: the pure half is cheap to cover, so
its coverage stands in for the binding it does not touch.
