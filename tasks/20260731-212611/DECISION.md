# Decision: where the tree pipeline splits

- DATE: 20260731
- STATUS: ACCEPTED
- TASK: 20260731-212611
- TAGS: refactor, ui

## Context

`src/treeBuilder.ts` (443 lines) and `src/ui/treeVisualizer.ts` (358) are the
`## File size` case: several unrelated jobs per file, not one long job.

`treeBuilder.ts` holds two. The tree MODEL - node types, type guards,
`buildGuessTree`, `buildCladeSubtree` and the two ancestor walks. And the HINT
RULE - `findNextHintCladeId`, which decides which clade a hint reveals, and
`findBestHintCladeId`, which reports the deepest one already revealed. The rule
consumes the model's types but nothing in the model calls the rule.

`treeVisualizer.ts` holds two. Rendering - `el`, `renderNode`, `renderTree`,
the option types. And SCROLL/LAYOUT - anchor selection, the two rect
computations, `layoutTree`, the relayout scheduler, the viewport listeners, and
four module-level mutables that only that half touches.

Four choices decide whether this stays a MOVE, which `## File size` requires,
or turns into a redesign.

## Decision

### 1. Both hint rules move to `src/hintRule.ts`, including `findBestHintCladeId`

`src/hintRule.ts` takes `findNextHintCladeId` and `findBestHintCladeId`.
`treeBuilder.ts` keeps `TreeNode`, `CladeNode`, `SpeciesNode`, `isCladeNode`,
`isSpeciesNode`, `buildGuessTree`, `buildCladeSubtree`,
`getNearestRevealedAncestor`, `getNearestRevealedClade`.

`findBestHintCladeId` is the arguable one. By MECHANISM it is a tree walk over
`CladeNode[]` and looks like it belongs beside the other walks. By JOB it is a
hint rule: it exists to answer "what is the best hint the player has uncovered
so far", its only caller is `src/ui/panel.ts` rendering the hint chip, and it
is meaningless to a reader who is not thinking about hints. The two ancestor
walks it superficially resembles are private helpers of `buildCladeSubtree` and
are not exported at all. Job wins over mechanism, which is the same rule that
put `shareText.ts` beside `gameState.ts` rather than inside it in
20260731-212610.

The dependency runs one way: `hintRule.ts` imports the node types and
`GameState`; `treeBuilder.ts` imports nothing from `hintRule.ts`. No cycle.

No barrel re-export from `treeBuilder.ts`, on 20260731-212610 case 2's
reasoning: a file that still exports the hint rule is, to every reader and
every grep, still the file that holds the hint rule.

### 2. `treeVisualizer.ts` sheds `src/ui/treeScroll.ts`, and `treeLayout.ts` is untouched

`src/ui/treeScroll.ts` takes `pickScrollAnchor`, `contentRect`, `focusRect`,
`layoutTree`, `scheduleRelayout`, `listenForViewportChanges`, and the four
mutables (`lastLayout`, `laidOutContainer`, `pendingRelayout`,
`listeningForViewportChanges`). `treeVisualizer.ts` keeps `el`, `renderNode`,
`renderTree`, `NodeSelectHandler`, `RenderOptions`.

The seam is clean in both directions. After the move `treeVisualizer.ts`
imports NOTHING from `treeLayout.ts` - `Rect`, `computeTreeScale` and
`computeScrollTarget` are used only by the moved functions - so the render file
loses its geometry dependency entirely rather than merely shrinking.

`treeLayout.ts` does NOT absorb the DOM half, and this is settled, not
reopened: its header states it is kept DOM-free so the arithmetic can be tested
directly, `test/treeLayout.test.ts` runs it in the node environment, and
`tasks/20260729-092339/DECISION.md` `## Consequences` records the extraction
("so they are unit-testable without a browser"). The half being moved is
entirely DOM - `offsetParent` walks, `getBoundingClientRect`, `ResizeObserver`,
`scrollTo`. Putting it there would break a recorded property to save a file.

The three-file result is the shape the record already describes: pure
arithmetic (`treeLayout.ts`), the DOM that measures and applies it
(`treeScroll.ts`), and the DOM that draws the nodes (`treeVisualizer.ts`).

### 3. `renderTree`'s tail becomes one exported function in `treeScroll.ts`

`renderTree` ends with four lines that belong to the scroll module: assigning
`laidOutContainer`, looking up `#arena`, calling `listenForViewportChanges`,
and scheduling the first `layoutTree` in a `requestAnimationFrame`. They move
into `mountTreeScroll(container)`, exported from `treeScroll.ts` and called as
the last line of `renderTree`.

The alternative is exporting `laidOutContainer` as a mutable binding, or
exporting `layoutTree` and `listenForViewportChanges` separately and leaving
the assignment in `renderTree`. Both leak the module's private state across the
seam and would mean the file that owns the mutable is not the only file that
writes it.

`mountTreeScroll` has exactly one caller and is not an abstraction - it takes
no options, no callbacks and no defaults, and its body is the four lines that
were already there. It is the same distinction 20260731-212610 case 4 drew: a
seam that exists because moved code needs a value it used to close over is part
of the move; a seam that exists so a future caller could vary behaviour is what
`## File size` forbids.

### 4. `consistentCandidates` stays in `gameState.ts`, now on the merits

20260731-212610 case 3 left this open, having decided it on cluster boundaries
rather than on the merits. Decided here: it stays.

The case for moving it is single-caller locality. Its only `src/` caller is
`findNextHintCladeId`, so after this split `hintRule.ts` is its sole consumer,
and `test/hintRule.test.ts` already holds its `describe` block.

It stays anyway, because it is a QUERY over `GameState` - it reads `guesses`,
`hintClades`, `targetId` and the LCA history and returns the species still
consistent with them - and not a rule for choosing a clade. Its docstring says
so: "the deduction the game asks the player to perform". `hintRule.ts`'s job is
picking the clade to reveal; the candidate set is an input to that job, not
part of it. Moving it would give `hintRule.ts` two jobs, which is the exact
`## File size` trigger this epic exists to remove, and would trade a clean
one-job file for a locality that only the current single caller argues for.

The test-file placement is not evidence either way. `test/hintRule.test.ts`
holds the block because the hint rule is what exercises it; where Jest suites
live is sibling 20260731-212616's question, and this task may not move
assertions regardless.

Consequence: `treeBuilder.ts` stops importing `consistentCandidates` (the
import goes with `findNextHintCladeId`) and keeps importing `GameState` for
`buildGuessTree`. `gameState.ts` is not touched by this task.

### 5. Two comment pointers are corrected rather than compacted

Checked against the whole `tasks/` tree, not the records the comments name.

The scroll cluster's browser-quirk comments - the `popIn` mid-animation rect in
`contentRect`, the Android URL bar in `layoutTree`, the
ResizeObserver-vs-`resize` media query in `listenForViewportChanges`, the
instant-not-smooth scroll, and the `laidOutContainer` note - are recorded ONLY
in `tasks/20260729-092339/REVIEW.md`, `RETRO.md` and `TASK.md`. `AGENTS.md`
`## Comments` names `DECISION.md`, `SPIKE.md` and `NOTES.md` as the record
kinds a comment may be compacted towards; a review round and a retro are not
among them, on the same reading that kept the brief-mount essay in full in
20260731-212610. **They are kept in full.** They move to `treeScroll.ts`
verbatim.

`focusRect`'s pointer is a different case and is CORRECTED. It reads "See
tasks/20260729-092339/DECISION.md fork 2", but fork 2 chose to centre the
mystery node and explicitly REJECTED "fit a box containing both", noting that
adopting it later would be a change to `computeScrollTarget` alone. The union
was adopted inside that same task, at review, and the DECISION was never
amended. So the pointer sends a reader to a record that documents the opposite
of what ships - the `## Comments` "actively misleading" case, at pointer scale.
The fix states what fork 2 actually settled (the anchor) and that the union
came later, which is one line and no loss of rationale. The union's own
rationale stays in full: it has no accepted record behind it.

`findNextHintCladeId`'s docstring keeps its pointers as they are - both
`tasks/20260729-141424/DECISION.md` and `tasks/20260729-160500/SPIKE.md` are
accepted kinds and do hold the threshold rationale - and the `closenessTier`
docstring keeps `tasks/20260729-182255/DECISION.md`.

## Alternatives considered

**Leave `findBestHintCladeId` in `treeBuilder.ts` as a tree walk.** Rejected as
case 1: it would split the hint rule across two files so that the smaller half
could sit next to functions it does not call and that are not exported.

**Fold `treeScroll.ts` into `treeLayout.ts`.** Rejected as case 2. It puts DOM
into a file whose DOM-freedom is a recorded, tested property.

**Split `treeVisualizer.ts` three ways** - rendering, rect geometry, and the
relayout/listener scheduling. Rejected as over-splitting: the rect functions
exist only to feed `layoutTree`, and the scheduler exists only to re-run it.
That is one job - put the drawn tree where it belongs and keep it there - and
the mutables are shared across all three parts, so splitting them would export
state that is currently private.

**Re-export the moved symbols from `treeBuilder.ts` and `treeVisualizer.ts`.**
Rejected on 20260731-212610 case 2's reasoning, unchanged here.

**Move `consistentCandidates` to `hintRule.ts`.** Rejected as case 4.

**Compact the browser-quirk comments towards `tasks/20260729-092339/`.**
Rejected as case 5: the records that hold them are a REVIEW.md and a RETRO.md,
which the policy does not accept as compaction targets.

## Consequences

- Two new files, `src/hintRule.ts` and `src/ui/treeScroll.ts`. No symbol is
  renamed and no exported signature changes; `mountTreeScroll` is the only new
  export, and it is the four lines it replaces.
- Import-line edits in `src/ui/panel.ts`, `src/game/hintChip.ts`,
  `scripts/playtest/hint.ts`, `scripts/playtest/difficulty.ts`,
  `test/hintRule.test.ts` and `test/treeBuilder.test.ts`. The last was NOT in
  the plan's list; the unfiltered grep found it. `test/closeness.test.ts`
  imports only stay-behind symbols and is untouched.
- `src/ui/index.ts` is unchanged: it re-exports `renderTree`, which stays.
- Two comments outside the cluster name a moved symbol and would go stale:
  `src/ui/treeLayout.ts:5` (names `treeVisualizer.ts` as its caller) and
  `src/style.css:386` (names `layoutTree` in `src/ui/treeVisualizer.ts`). Both
  get the new path. `src/style.css` is sibling 20260731-212617's file and gets
  a comment-path edit only.
- The cluster's line TOTAL is expected to RISE - each new file pays for its own
  import block. The number this task moves is the LARGEST file: 443 down.
