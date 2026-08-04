# Review: Make tree nodes keyboard operable

- TASK: 20260803-233105
- BRANCH: feat/tree-keyboard-nav

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) e2e/treeKeyboard.spec.ts:481 - `the tab stop survives a
  guess` Tabs forward to `#player-input` (line 464) before submitting, so
  `captureTreeFocus` records `hadFocusInside === false` and
  `src/ui/treeKeyboard.ts:145` `stop.focus({ preventScroll: true })` never
  runs. The closing `expectNodeVisibleInArena` - which the Step and the DoD
  both call "what pins fork 2's `preventScroll`" - therefore asserts only that
  the ordinary render anchoring worked, with the restore path never executed.
  Re-derived independently: `renderTree` has one caller, `updateUI`
  (`src/game/index.ts:187`), reached from `submitGuess`
  (`src/game/index.ts:152`), the hint chip (`src/game/hintChip.ts:60`) and
  init (`src/game/index.ts:255`) - in every one of those the player has just
  operated a control outside `#tree-container`, so `hadFocusInside` is false
  and the restore looks unreachable in real play, not merely untested. Resolve
  it one way: either find and pin a real path that re-renders with focus still
  inside the tree (adding the delivery guard that focus was restored, e.g.
  assert `document.activeElement` is the tree item straight after the
  re-render), or delete `captureTreeFocus`/`hadFocusInside` and the
  `preventScroll` restore along with the DoD clause they serve. The first half
  of the test - that the tab stop itself survives - is sound and should stay.
  - Response: fixed in d6e5898. Agreed and re-derived a third time: nothing
    re-renders the tree with focus inside it, so `captureTreeFocus` always read
    false. Took the second option - `captureTreeFocus`, `hadFocusInside` and the
    `preventScroll` restore are gone, as is the `captureTreeFocus(container)`
    line in `renderTree`. The DoD clause lost its second half and the test lost
    the `expectNodeVisibleInArena` closer; the first half stays. DECISION.md
    fork 2 and fork 5 are rewritten and the alternatives entry now records that
    the restore was built and then removed.
- [x] R1.2 (MINOR) src/ui/treeKeyboard.ts:108 - the roving `tabindex` desyncs
  from real focus on a pointer click: the browser focuses the nearest focusable
  ancestor, so clicking a node's box focuses that `li` while `rememberedNodeId`
  and `tabindex="0"` stay on the previous node (probed live: clicked
  `clade-dinosauria`, `document.activeElement` became `clade-dinosauria`, the
  tab stop stayed on `species-chasmosaurus`). Tabbing away and back then lands
  somewhere other than where the player was, and a re-render restores to the
  wrong node. Add a delegated `focusin` listener in `mountTreeKeyboard` that
  calls `moveTabStop(container, item)` for the focused `[data-node-id]`.
  - Response: fixed in d6e5898. Delegated `focusin` added in
    `mountTreeKeyboard`, calling `moveTabStop` for the focused
    `[data-node-id]`. New E2E `clicking a node moves the tab stop to it`
    asserts the clicked node has focus, carries `tabindex="0"`, and is the
    only tab stop; it fails with the listener registration removed.
- [x] R1.3 (MINOR) src/ui/treeKeyboard.ts:66 - the direction keys are claimed
  regardless of modifiers, so `Alt+ArrowLeft` (browser Back) and `Ctrl+Home`
  are swallowed while a node has focus. Add
  `if (event.altKey || event.ctrlKey || event.metaKey) return;` before the
  `KEY_DIRECTIONS` lookup.
  - Response: fixed in d6e5898, one line further up than proposed. The guard
    sits right after the item lookup, so it also covers Enter and Space:
    Ctrl+Enter has no more business opening a card than Alt+ArrowLeft has
    moving focus. `shiftKey` deliberately excluded - Shift+Arrow means nothing
    to the browser here, and Shift is what the manual pass presses to arm
    `:focus-visible`. Pinned by `a modified direction key is left to the
    browser`, which also presses the bare key as a delivery guard.
- [x] R1.4 (MINOR) e2e/treeKeyboard.spec.ts:399 - the DoD clause "Space does
  the same, and does not scroll the page instead" is only half proved: the
  parameterised test asserts the card opens but never that the default scroll
  was suppressed, so deleting `event.preventDefault()` at
  `src/ui/treeKeyboard.ts:94` would leave it green. In the `key === " "` case,
  record `#arena`'s `scrollTop`/`scrollLeft` before the press and assert both
  are unchanged after.
  - Response: fixed in d6e5898, but NOT as proposed - the proposed assertion
    is green with `event.preventDefault()` deleted, and so was the next
    attempt. `arrowTo` leaves `#arena` at its maximum scroll, so a default
    page-down had nowhere to go; parking it at 0 first still passed, because
    opening the card relayouts the panel and returns the arena to the offset
    the press started from. The proof now lives in a new `Space does not
    scroll the board`, on the INERT mystery node - `preventDefault` runs ahead
    of the `aria-disabled` guard, so it is the same statement, with nothing
    else touching the arena - and reads the offset after a settle delay,
    because Chromium ANIMATES a keyboard scroll and `waitForTreeToSettle` does
    not cover a smooth scroll. Sabotaged, it fails with `Received: 162`. The
    DoD clause is split in two so each half names the test that proves it.
- [x] R1.5 (NIT) src/ui/treeVisualizer.ts:93 - a `treeitem` that owns a `group`
  should carry `aria-expanded`; every parent node here is permanently open and
  none is marked, so a screen reader does not announce that a clade has
  children. Set `li.setAttribute("aria-expanded", "true")` on the branch that
  appends the group `ul`. DECISION.md:109 mentions `aria-expanded` only as
  something a future collapsible tree could reuse, which is a different point.
  - Response: fixed in d6e5898. `aria-expanded="true"` set on the branch of
    `renderNode` that appends the group `ul`. DECISION.md's Consequences line
    corrected too: a future collapsible tree flips the attribute rather than
    adding it.
- [x] R1.6 (NIT) tasks/20260803-233105/DECISION.md:64 - the record argues the
  Left/Right deviation from ARIA but not Home/End, which are sibling-scoped
  here where ARIA specifies the first/last item of the whole tree. Add one
  sentence to that paragraph recording the Home/End scope and why.
  - Response: fixed in d6e5898. Sentence added to the Left/Right paragraph in
    DECISION.md's Consequences: Home/End are scoped to the current node's
    siblings, not ARIA's first/last item of the whole tree, because siblings
    are drawn across a row and that row's ends are the motion the transposed
    layout makes a player reach for.

Verification, by the in-session pass unless noted:

- `npm run ci` from the worktree: exit 0. Jest 387 tests in 29 suites,
  Playwright 175 passed, coverage 95.37 statements / 81.75 branches / 99.31
  functions / 98.21 lines - every close-out number matches exactly, and no
  floor was lowered to get there.
- `grep -n 'src/ui/treeNav\.ts' jest.config.js` -> `20:`, exit 0, the DoD's
  `cmd:` proof, red on the base as the plan recorded.
- R1.1 re-derived from the call graph independently of the reviewer, which is
  what raised it from "untested" to "looks unreachable".
- All six `e2e/treeKeyboard.spec.ts` declarations ran as seven cases under the
  exact names the DoD lists. `test/treeNav.test.ts` is 13 behavioural tests
  covering the edges, an unknown id and a missing parent. The
  `test/closeness.test.ts` change is purely additive; no existing test was
  weakened or deleted.
- Diff stays inside the plan's surface list. No stale symbol, flag or path
  mentions in README or AGENTS.md; neither documents keyboard behaviour, so no
  reference-doc update is owed.
- Not reproduced: `npm run playtest:walkthrough` exit 0 and the
  `/tmp/focus-shots*` photographs from the close-out. Neither is a `cmd:`
  clause; the ring evidence rests on the pending manual item.

Pending user checks (do not block a verdict):

- `manual:` - the focus ring is visible on all seven node states, arrowing to
  an off-screen node brings it into view without fighting the arena's
  anchoring, and the resting board is unchanged at desktop and at 360px. Step
  10 is correctly left unticked.

## Round 2

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

All six round-1 findings are verified fixed and ticked; three of them
(R1.2, R1.3, R1.4) were re-confirmed by sabotage, each failing exactly the one
test its Response names. No regression came out of the fixes.

- [x] R2.1 (MAJOR) src/ui/treeVisualizer.ts:84 - the ARIA layer this task
  exists to add is unpinned by any test except the mystery node's
  `role="treeitem"`/`aria-disabled` pair. `describeNode`'s output, the outer
  `ul`'s `role="tree"`, the nested `role="group"` and R1.5's `aria-expanded`
  can all be deleted or replaced with a literal and the whole suite stays
  green - reproduced by sabotage (full Jest 387 and the desktop Playwright
  project both pass with `describeNode(node)` replaced by `"x"` and the three
  roles removed), and re-derived independently by grep: `aria-label`,
  `role="tree"`, `role="group"` and `aria-expanded` appear nowhere in `e2e/`
  or `test/` except `e2e/ladder.spec.ts`'s unrelated pull tab. So the Story's
  central clause - "Each item gets an `aria-label` naming it, its kind, and
  its state, so the warm/cold feedback is not colour-only" - ships unproved;
  `test/closeness.test.ts`'s `every tier has a screen-reader label` asserts
  the array's shape and never that a word reaches a node. Add one test to
  `e2e/treeKeyboard.spec.ts` asserting: the outer `ul` has `role="tree"`; a
  clade `li` carries `aria-expanded="true"` and owns a `ul[role="group"]`; and
  the `aria-label` on a guessed species' `li` contains that species' name and
  its `CLOSENESS_LABELS` tier word. Split the DoD's "Node state is announced
  in words" clause so the announcement half names that test.
  - Response: fixed in 9903f97. Agreed, and re-confirmed by the same sabotage
    before writing anything: with `describeNode(node)` replaced by `"x"` and
    the three roles removed, the whole suite stayed green. New E2E `the board
    is announced as a named tree of labelled items` asserts the outer
    `ul[role="tree"]` exists and is named, that the first branching item
    carries `aria-expanded="true"` and owns a `ul[role="group"]` holding
    exactly its children, and that a guessed species' `aria-label` contains
    both its painted name and the `CLOSENESS_LABELS` word for the tier its
    `.node-close-*` class paints. The tier is read off the CLASS, not
    recomputed, so the label has to agree with the colour on screen. Each of
    the six mechanisms was sabotaged separately and each failed on its own
    assertion: `role="tree"` (count 0), the tree's `aria-label` (`""`),
    `aria-expanded` (`""`), `role="group"` (count 0), the whole label (`"x"`),
    and the tier word alone (`"Proceratosaurus, guess"`). The DoD clause is
    split: `test/closeness.test.ts` keeps the array-shape half, and the
    announcement half names the new test.
- [x] R2.2 (MINOR) src/ui/treeNav.ts:48 - `up` returns `current.parentId`
  without confirming the forest holds that node, so on the same malformed data
  the sibling branch three lines below is explicitly hardened against
  (`index < 0` -> null, "would teleport focus"), `up` hands back an id nothing
  draws. `nextNodeId`'s own contract says null means stay put; the caller only
  survives it by `itemFor`'s null check. `test/treeNav.test.ts`'s `a node whose
  parent is missing has no siblings` covers left/right/home/end but not up,
  while the DoD claims the table is "correct in every direction". Return
  `findNode(roots, current.parentId) ? current.parentId : null` and extend that
  test with the `up` case.
  - Response: fixed in 9903f97, as proposed. `up` now returns
    `current.parentId && findNode(roots, current.parentId) ? current.parentId
    : null`, with a comment pointing at the sibling branch it matches. The
    orphan test is extended with the `up` case and renamed `a node whose
    parent is missing has nowhere to go`, since it is no longer only about
    siblings. Sabotaged back to `current.parentId ?? null`, it fails with
    `Received: "clade-missing"`.
- [x] R2.3 (MINOR) tasks/20260803-233105/TASK.md:375 - "178 Playwright tests
  (175 before this branch)" is wrong: master lists 168, and this branch adds
  nine declarations running as ten cases. 175 was the count after the initial
  implementation and before the round-1 fixes, not before the branch. The
  parenthetical understates the branch's contribution as three tests.
  Rewrite as "(168 before this branch, 175 before the round-1 fixes)".
  - Response: fixed in 9903f97, with the wording the finding proposes. The
    arithmetic re-derives: this round's run reports 179, one more than the 178
    the parenthetical was attached to, and the eleven cases on this branch put
    master at 168.
- [x] R2.4 (NIT) tasks/20260803-233105/TASK.md:379 - "eight declarations
  running as ten cases": `grep -c '^\s*test(' e2e/treeKeyboard.spec.ts` is 9,
  one of them parameterised over two keys. Change "eight" to "nine".
  - Response: fixed in 9903f97. That line describes the state at the END of
    round 1, so it reads "nine declarations running as ten cases" and is left
    at those numbers; this round's tenth declaration and eleventh case are
    recorded in the round-2 evidence below it, not backdated into round 1's.
- [x] R2.5 (NIT) src/ui/treeVisualizer.ts:115 - the `role="tree"` element has
  no accessible name, so the board is announced as an unnamed tree. Add
  `ul.setAttribute("aria-label", "guess tree")` beside the role, or point
  `aria-labelledby` at an existing heading.
  - Response: fixed in 9903f97. `aria-label="guess tree"` set beside the
    role; `aria-labelledby` was not available, since there is no on-screen
    heading over the board to point at. Pinned by R2.1's new test, which fails
    with `Received: ""` when the line is removed.

Not accepted, recorded so a later round does not re-raise them:

- The coverage floors (`jest.config.js:28`) sit 1.4-3.8 points below the
  current numbers, so `test/treeNav.test.ts` could be deleted without tripping
  the gate. The gap is pre-existing - the floors and their `Current:` comments
  came from `20260729-092352`, and this branch moves no coverage number - so it
  is a repository problem, not a diff problem. Step 8's condition ("if the new
  pure module moves a floor, raise the floor") did not fire.
- `src/ui/treeKeyboard.ts:95` reading `aria-disabled` off the DOM rather than
  re-deriving `isTarget && isPlaceholder` from the node was proposed as a
  second source of truth. Rejected: reading the announced attribute is what
  makes announced and enforced inertness the same fact, the alternative deletes
  no concept or branch, and `the mystery target is announced but inert` already
  pins both halves on one node.

Verification, by the in-session pass unless noted:

- `npm run ci` from the worktree: exit 0. Jest 387 tests in 29 suites,
  Playwright 178 passed. The out-of-context pass got the same, plus coverage
  95.37 / 81.75 / 99.31 / 98.21, matching the close-out exactly.
- R2.1 re-derived independently of the reviewer's sabotage, by grepping `e2e/`
  and `test/` for every attribute the plan's Step 7 names.
- R2.3 re-derived by arithmetic against the run: 178 now, ten new cases on this
  branch, so 168 on master - which is what `--list` on master reports.
- All ten DoD-named E2E cases exist and pass under the exact names the DoD
  lists.

Process signal:

- Round 1 asked three times whether a negative assertion was green for the
  right reason, and every fix was sabotage-checked. The gap that survived both
  rounds is the opposite shape: a purely additive attribute layer that nothing
  ever reads back. Worth a standing habit - every attribute a plan names gets
  one assertion.

Pending user checks (do not block a verdict):

- `manual:` - the focus ring is visible on all seven node states, arrowing to
  an off-screen node brings it into view without fighting the arena's
  anchoring, and the resting board is unchanged at desktop and at 360px. Step
  10 is correctly left unticked.

## Round 3

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

All five round-2 findings are verified fixed and ticked. R2.1's new test was
re-confirmed by six independent sabotages, each failing on its own assertion,
plus a seventh the reviewer added: indexing `CLOSENESS_LABELS` with a wrong
tier fails with `"..., guess, ice cold"` against a node painted tier 3, so the
label is pinned to the tier and not merely to the array. R2.2's guard fails
with `Received: "clade-missing"` when reverted. No regression came out of any
round-2 fix; the only source changes were the `up` guard and one
`setAttribute`.

- [x] R3.1 (MAJOR) src/ui/treeKeyboard.ts:17 - `Home` and `End` are bound in
  `KEY_DIRECTIONS` but no test in `e2e/` or `test/` ever presses either key,
  so two of the six key bindings Step 6 names are a shipped mechanism nothing
  reads back - the same additive-layer shape R2.1 named, one level up.
  `test/treeNav.test.ts` covers `nextNodeId(..., "home"/"end")`, but that is
  the pure table; nothing pins the table to the KEY. Re-derived independently
  of the reviewer by grep: the only `End` press anywhere in `e2e/` is
  `Control+End` in `a modified direction key is left to the browser`, which
  asserts focus does NOT move, and there is no `Home` press at all.
  Sabotage-confirmed in the recording pass too: with lines 17-18 deleted the
  whole desktop project is green, 122 passed. The keys do work - the reviewer
  drove them live against the same fixture - so this is a missing test, not a
  broken feature. Add two presses to `arrows walk the tree`: from
  `branch.children[0]` press `End` and assert
  `branch.children[branch.children.length - 1]`, then press `Home` and assert
  `branch.children[0]`.
  - Response: fixed in a865ab8, with one addition. `arrows walk the tree`
    now presses End then Home on the sibling row, as proposed. But on the row
    `branchingItem` was returning - the FIRST with two or more children - End
    lands on exactly the node ArrowRight already reaches, so the press would
    have been pinned only by "focus did not stay put". `branchingItem` now
    returns the WIDEST row instead, which on this board is three wide, making
    End a real jump over the middle sibling; its three other callers only ever
    needed two children, so none changes meaning. Sabotaged one binding at a
    time: removing `End` fails on the End assertion
    (`species-proceratosaurus` for `species-struthiomimus`), removing `Home`
    fails on the Home assertion with the pair reversed, and removing both
    leaves the desktop project green before this fix and red after it.

Verification, by the in-session pass unless noted:

- `E2E_PORT=8123 npm run ci` from the worktree: exit 0. Jest 387 tests in 29
  suites, Playwright 179 passed, coverage 95.37 statements / 81.83 branches /
  99.31 functions / 98.21 lines. The out-of-context pass got the same numbers,
  and both match the round-2 evidence in TASK.md exactly. No floor lowered.
- R3.1 re-derived independently by grep before the sabotage, then sabotaged in
  the recording pass: deleting the two `KEY_DIRECTIONS` entries leaves the
  desktop project at 122 passed.
- All 13 `test:`/`cmd:` proofs from `tatr -r . proofs 20260803-233105` run
  against their own criteria. All 11 `e2e/treeKeyboard.spec.ts` cases exist
  and pass under the exact names the DoD lists;
  `grep -n 'src/ui/treeNav\.ts' jest.config.js` -> `20:`, exit 0.
- R2.3's arithmetic re-derived a second time: `--list` reports 179 on the
  branch and 168 on master, eleven cases apart.
- Doc sweep re-run over `keyboard`, `aria-`, `treeitem`, `CLOSENESS_LABELS`,
  `treeNav` and `treeKeyboard`: clean in README.md, AGENTS.md and the shipped
  HTML. Neither doc describes board interaction, so nothing is owed.
- Close-out honesty: no self-ticked `manual:` item, Step 10 correctly
  unticked, and every recorded number reproduced.

Not reproduced:

- `npm run playtest:walkthrough` exit 0 and the `/tmp/focus-shots*`
  photographs from the original close-out. Neither is a `cmd:` clause, and the
  artifacts are throwaway and gone.

Process signal:

- Round 2's own closing lesson - "every attribute a plan names gets one
  assertion" - generalises to every KEY a plan names. The Home/End gap
  survived three rounds because the pure module's coverage read as if the keys
  were tested: `treeNav.test.ts` exercises the `"home"`/`"end"` directions
  thoroughly, and the split that made the traversal cheap to test is exactly
  what hid the untested half of the binding.

Pending user checks (do not block a verdict):

- `manual:` - the focus ring is visible on all seven node states, arrowing to
  an off-screen node brings it into view without fighting the arena's
  anchoring, and the resting board is unchanged at desktop and at 360px. Step
  10 is correctly left unticked.

## Round 4

- REVIEWER: out-of-context
- VERDICT: APPROVE

R3.1 is verified fixed and ticked above. The out-of-context pass sabotaged the
binding three ways, each red on its own assertion: removing `Home: "home"`
fails on the Home assertion, removing `End: "end"` fails on the End assertion,
and remapping `End: "right"` fails with `fukuiraptor` - which independently
proves the `branchingItem` widest-row change did its job, since End is a real
jump past `children[1]` rather than a repeat of what ArrowRight already
reaches. The widest-row change regressed nothing: its three other callers only
ever need two or more children and all pass, and `a modified direction key is
left to the browser` is strictly stronger now, because a deleted modifier guard
would move `Control+End` two nodes instead of one.

- [x] R4.1 (MINOR) tasks/20260803-233105/TASK.md:279 - the "Alternatives
  considered" close-out pins the malformed-parent behaviour on
  `a node whose parent is missing has no siblings`, but R2.2's fix renamed that
  case to `a node whose parent is missing has nowhere to go`, so the record
  names a proof that no longer exists. It is close-out prose, not a `test:`
  clause, so no proof run is affected. Change the backticked name on that line
  to `a node whose parent is missing has nowhere to go`.
  - Response: fixed. TASK.md:279 now cites the live name. Verified by grep:
    `has no siblings` survives only in REVIEW.md's round-2 text, which is
    correctly historical, and `test/treeNav.test.ts:94` is the one definition
    of `a node whose parent is missing has nowhere to go`.

Verification, by the in-session pass unless noted:

- `E2E_PORT=8127 npm run ci` from the worktree: exit 0. Jest 387 tests in 29
  suites, Playwright 179 passed, coverage 95.37 statements / 81.83 branches /
  99.31 functions / 98.21 lines. The out-of-context pass got the same numbers,
  and both match the round-3 evidence exactly. No floor lowered.
- R4.1 re-derived independently of the reviewer: `grep -rn "has no siblings"`
  over `src/`, `test/`, `e2e/` and `tasks/` hits only TASK.md:279 and
  REVIEW.md's round-2 text, which is correctly historical, while
  `test/treeNav.test.ts:94` reads `a node whose parent is missing has nowhere
  to go`. Read at TASK.md:270-282 to confirm it is prose under "Alternatives
  considered", not a Definition of Done clause.
- All 16 proofs from `tatr -r . proofs 20260803-233105` enumerated; the 13
  `test:` clauses and both `cmd:` clauses run green on their own criteria, and
  every `e2e/treeKeyboard.spec.ts` case exists under the exact name the DoD
  lists.
- Doc sweep re-run over `treeNav`, `treeKeyboard`, `CLOSENESS_LABELS`,
  `treeitem`, `aria-`, `keyboard` and `branchingItem` in README.md, AGENTS.md,
  `src/index.html` and `scripts/`: clean.
- Close-out honesty: no self-ticked `manual:` item, Step 10 correctly unticked.
- The worktree is unmodified after every sabotage; `git status` shows only an
  untracked `node_modules`.

Not reproduced:

- `npm run playtest:walkthrough` exit 0 and the `/tmp/focus-shots*`
  photographs from the original close-out. Neither is a `cmd:` clause, and the
  artifacts are throwaway and gone.

Process signal:

- Rounds 2 and 3 both landed the same shape - a mechanism built but never read
  back - and round 3's fix is the first that also strengthened the FIXTURE so
  the new assertion could not be satisfied by an adjacent mechanism. That is
  the durable form of the habit: an assertion is only pinned when the fixture
  makes the wrong mechanism produce a different answer.
- The only round-4 residue is a record-level rename slip. Renaming a test
  should sweep the task record that cites it, the same way renaming a symbol
  sweeps the docs.

Pending user checks (do not block a verdict):

- `manual:` - the focus ring is visible on all seven node states, arrowing to
  an off-screen node brings it into view without fighting the arena's
  anchoring, and the resting board is unchanged at desktop and at 360px. Step
  10 is correctly left unticked.
