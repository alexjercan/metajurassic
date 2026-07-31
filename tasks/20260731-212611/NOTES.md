# Tree pipeline: before/after measurements

## The rig

Same method as `tasks/20260731-212557/NOTES.md` `## How the population was
counted` and rebuilt the same way sibling 20260731-212610 rebuilt it: the
TypeScript PARSER (not the scanner, which reads `/\.md$/` as a comment; not a
line grep, which counts a run of `//` lines as N comments instead of one).
Consecutive standalone `//` lines fuse into one comment.

Script lives in this session's scratchpad, not the repo. It needs the repo's
`typescript`:

```sh
NODE_PATH="$PWD/node_modules" node scratchpad/comments.js src/treeBuilder.ts ...
```

Columns are `file`, `wc -l`, comments, comment lines.

The baseline reproduced `TASK.md`'s independently recorded numbers exactly -
443/29/102, 358/16/101, 106/5/47, 66/5/28 - which is the cross-check that the
rebuilt rig is the same rig.

## Before (branch point, 2741c23)

| File | Lines | Comments | Comment lines |
|------|------:|---------:|--------------:|
| `src/treeBuilder.ts` | 443 | 29 | 102 |
| `src/ui/treeVisualizer.ts` | 358 | 16 | 101 |
| `src/ui/treeLayout.ts` | 106 | 5 | 47 |
| `src/closeness.ts` | 66 | 5 | 28 |
| **Total** | **973** | **55** | **278** |

## After

| File | Lines | Comments | Comment lines |
|------|------:|---------:|--------------:|
| `src/treeBuilder.ts` | 291 | 8 | 39 |
| `src/hintRule.ts` | 133 | 5 | 41 |
| `src/ui/treeVisualizer.ts` | 87 | 2 | 6 |
| `src/ui/treeScroll.ts` | 291 | 16 | 109 |
| `src/ui/treeLayout.ts` | 106 | 5 | 47 |
| `src/closeness.ts` | 66 | 5 | 28 |
| **Total** | **974** | **41** | **270** |

Per cluster:

| Cluster | Before | After | Largest file after |
|---------|-------:|------:|-------------------:|
| `treeBuilder.ts` -> 2 files | 443 | 424 over 2 files | 291 |
| `treeVisualizer.ts` -> 2 files | 358 | 378 over 2 files | 291 |
| Comment lines, whole cluster | 278 | 270 | - |

**The number this task set out to move was the LARGEST file, and it moved 443
-> 291.** The cluster total is 973 -> 974, up by 1, which is the expected shape:
a split buys seams, not fewer lines, and each new file pays for its own import
block. `treeBuilder.ts`'s half came out 19 lines lighter only because that is
where the cluster's 15 narration discards were; the render/scroll split went UP
20 lines with no comment deleted at all.

`treeVisualizer.ts` at 87 lines is the one genuinely large drop, and it is real
rather than an artefact: after the move it imports nothing from `treeLayout.ts`
either, so what is left is exactly `el`, `renderNode`, `renderTree` and the
option types.

## Comment decisions worth naming

- **Every browser-quirk comment in the scroll half was KEPT IN FULL and moved
  verbatim.** The `popIn` mid-animation rect, the Android URL bar, the
  ResizeObserver-vs-`resize` media query, the instant-not-smooth scroll, the
  `laidOutContainer` note. Grepping `tasks/` WHOLE (not the records the
  comments name) finds their rationale in `tasks/20260729-092339/REVIEW.md`,
  `RETRO.md` and `TASK.md` - and `AGENTS.md` `## Comments` accepts only
  `DECISION.md`, `SPIKE.md` and `NOTES.md` as compaction targets. Same reading
  that kept the brief-mount essay in full in 20260731-212610. This is why
  `treeScroll.ts` has 109 comment lines against 291 code lines and that is the
  correct result, not a miss.
- **`focusRect`'s POINTER was corrected, and this is the find worth passing
  on.** It read "See tasks/20260729-092339/DECISION.md fork 2". Fork 2 chose to
  centre the mystery node and explicitly REJECTED "fit a box containing both",
  adding that adopting it later would be a change to `computeScrollTarget`
  alone. The union ships. It was adopted at review inside that same task
  (`REVIEW.md` findings on `focusRect`) and the DECISION was never amended, so
  the pointer sent a reader to a record documenting the opposite of the code.
  Corrected to say what fork 2 actually settled (the anchor) and that the union
  came later; the union's own rationale stays in full, having no accepted
  record behind it. `DECISION.md` case 5.

  **Siblings: a pointer can go stale in a way the rationale beside it does
  not.** Checking that a record EXISTS is not the same as checking it says what
  the comment claims. The whole-tree grep answers the first question; only
  reading the record answers the second.
- **15 narration discards across the treeBuilder cluster** - 12 in the
  `treeBuilder.ts` that remains, 3 in code that moved to `hintRule.ts`
  (`// Walk from just below the deepest revealed clade...`, `// Check if any
  direct child is the "?" placeholder`, `// Recurse into child clades`). The
  15 matches the count the child-1 inventory predicted for the file, but the
  inventory counted the file BEFORE the hint rules left it, so only the
  cluster figure is comparable. Discards from `treeBuilder.ts` itself:
  `// Find the root clade`, `// Add hint-revealed clades`, `// Build child
  clade nodes`, `// Add direct species leaves`, and the rest of that family.

  Enumerated with `git diff master -- src/treeBuilder.ts | grep -E '^-\s*//'`
  and classified by reading each hit, not by subtracting rig totals - the rig's
  comment COUNT nets discards against compactions and moves, so it cannot
  answer this question on its own.
- **One comment was actively misleading and its false clause was deleted.**
  `buildGuessTree`'s reveal-set block listed "It is on the path between the
  root and an LCA clade" as a reveal condition, while the code eleven lines
  below said "Add all LCA clades (but NOT intermediate path clades)". The
  parenthetical was the true one. The block is rewritten to state the rule
  once, including that the gaps are what the player is deducing. No behaviour
  changed - only the comment was wrong.
- `// Collect all guessed species (excluding the target itself for LCA
  computation)` also described what the loop below does NOT do (it pushes every
  guess; the target is excluded later). Discarded rather than corrected: the
  loop is three lines and says so itself.
- KEPT: the lineage-ordering block in `findNextHintCladeId` (a non-obvious
  index dependency), the `// No revealed clade at all` invariant guard, the
  `SpeciesNode.closenessTier` docstring with its `20260729-182255` pointer, the
  `// The target is the answer, not a temperature` pointer, and the scaling
  floors in `treeLayout.ts` (untouched file).
- COMPACTED, both towards the code rather than towards a record: `// Build the
  current set of revealed clades (same logic as buildGuessTree)` now names
  `treeBuilder.ts` and states the constraint (the two must agree or a hint
  names a clade the board does not show) - the duplication it flags now spans
  two FILES, so the comment got more load-bearing, not less. And the pairwise
  LCA pair of comments compacted to the one line that says why (grouping).
- One em dash in a moved comment (`shouldn't happen — root is always
  revealed`) became `-` per `AGENTS.md` ASCII punctuation. Pre-existing, in a
  line this task was already moving.

## Verifying the move preserved behaviour

Mechanical, not by reading: strip block and line comments, drop blanks,
normalise indentation, sort, diff before-side against after-side.

| Cluster | Residue |
|---------|---------|
| `treeBuilder.ts` -> `+ hintRule.ts` | 3 added import lines. No removed lines. |
| `treeVisualizer.ts` -> `+ treeScroll.ts` | 1 added import line, `mountTreeScroll`'s signature and closing brace, its 1 call site. No removed lines. |

Zero removed lines on both sides is the claim worth stating: every line of code
that was there is still there.

## Importers, enumerated by UNFILTERED grep

The lesson from 20260731-212610. The grep was `treeBuilder` and
`treeVisualizer` with NO symbol filter, and every hit was read:

| Hit | Action |
|-----|--------|
| `src/ui/panel.ts:4` | import line -> `../hintRule` |
| `src/game/hintChip.ts:2` | import line -> `../hintRule` |
| `scripts/playtest/difficulty.ts:27` | import line -> `../../src/hintRule` |
| `scripts/playtest/hint.ts:26` | import line -> `../../src/hintRule` |
| `test/hintRule.test.ts:11` | import line -> `../src/hintRule` |
| `test/treeBuilder.test.ts:4-10` | import block split in two |
| `test/closeness.test.ts:8-12` | **no edit** - imports only stay-behind symbols |
| `src/ui/panel.ts:3`, `src/ui/treeVisualizer.ts:1` | `type CladeNode` etc, stay |
| `src/game/index.ts:6,17` | `buildGuessTree`, `renderTree`, both stay |
| `src/ui/index.ts:3` | re-exports `renderTree`, stays |
| `src/ui/treeLayout.ts:5` | comment naming its caller -> `treeScroll.ts` |
| `src/style.css:386` | comment naming `layoutTree`'s file -> `treeScroll.ts` |

`test/treeBuilder.test.ts` was NOT in the plan's list of importers. The
unfiltered grep found it; a grep filtered by the stay-behind symbols would have
had to be right about `findNextHintCladeId` appearing in a file named after the
module it was leaving.

The last two rows are the other 20260731-212610 lesson: after moving a symbol,
grep for the OLD location across docs and styles, not only for the new one.
Both would have become stale pointers to a function that had left the file.

## Sibling-owned files touched

Comment or import lines only:

- `scripts/playtest/hint.ts`, `scripts/playtest/difficulty.ts`
  (20260731-212616): one import line each.
- `src/style.css` (20260731-212617): one comment line, the path in a CSS
  comment that explains the two-element sizing box.
- `src/game/hintChip.ts` (landed 20260731-212610), `src/ui/panel.ts`
  (20260731-212614): one import line each.

## test/ and e2e/ diff

`e2e/` is untouched - zero files. `test/` is 2 files, +2/-3, and every changed
line is an import line:

| File | Change |
|------|--------|
| `test/hintRule.test.ts` | `findNextHintCladeId` -> `../src/hintRule` |
| `test/treeBuilder.test.ts` | both hint rules -> `../src/hintRule`, block split |

No assertion moved, and no `describe` or `it` block changed. `git diff master
-- test e2e` is four content lines in total, all inside import blocks.

## Done Means proofs

| Proof | Result |
|-------|--------|
| Before/after tables | above, from the rig |
| `grep -nE 'findNextHintCladeId\|findBestHintCladeId\|export \*' src/treeBuilder.ts` | no hits |
| `grep -nE 'layoutTree\|focusRect\|contentRect\|pickScrollAnchor\|export \*' src/ui/treeVisualizer.ts` | 1 hit, `treeVisualizer.ts:11` - a COMMENT naming `focusRect` in `treeScroll.ts`, not a declaration, call or re-export |
| `treeLayout.ts` DOM-free | 1 hit, `treeLayout.ts:78` - the WORD "offset" in prose ("a negative offset the browser would ignore"). No DOM identifier. File is byte-identical apart from one comment path. |
| `git diff master -- test e2e` | import lines only, listed above |
| `npm run playtest:hint` | exit 0; `sanity: reproduced split<=0.5 policy vs shipped findNextHintCladeId: 548/548 agree` |
| Inline task references | 7 in the cluster, each a one-line record pointer or a defect-shape reference; enumerated below |
| `npm run ci`, `npm run build` | both pass in `nix develop` (126 E2E passed; build exit 0) |

The 7 surviving task references:

| Site | Kind |
|------|------|
| `src/hintRule.ts:30` | pointer, `DECISION.md` + `SPIKE.md` |
| `src/treeBuilder.ts:35` | pointer, in the `closenessTier` docstring |
| `src/treeBuilder.ts:40` | constraint - why the tier is on the data (jest jsdom setup, `20260729-092352`) |
| `src/ui/treeLayout.ts:6` | pointer, DOM-free rationale |
| `src/ui/treeScroll.ts:6` | pointer, same, on the new file's header |
| `src/ui/treeScroll.ts:102` | pointer, corrected this task |
| `src/ui/treeScroll.ts:230` | defect shape - the Android drag bug the instant scroll defends |
