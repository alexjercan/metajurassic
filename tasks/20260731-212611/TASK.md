# KISS pass: tree pipeline (treeBuilder, treeVisualizer, treeLayout)

- STATUS: CLOSED
- PRIORITY: 68
- TAGS: refactor, ui
- KIND: STORY
- FLOW STEP: DONE
- PLAN STATUS: APPROVED
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer working on the tree, I want the tree's model, its layout maths,
and its DOM rendering in files that do one of those each, so that a hint-rule
change does not sit next to scroll-anchor geometry.

## Problem

`src/treeBuilder.ts` (443 lines, 102 comment) holds the node types, the two
hint-selection rules (`findNextHintCladeId`, `findBestHintCladeId`), and the
guess-tree construction with its ancestor walks.

`src/ui/treeVisualizer.ts` (358 lines, 101 comment) mixes node rendering with
scroll-anchor selection, rect maths, relayout scheduling, and viewport
listeners - the highest comment ratio in `src/`, much of it explaining browser
behaviour that is worth keeping in compacted form.

`src/ui/treeLayout.ts` (106 lines) and `src/closeness.ts` complete the cluster.

## Steps

Rules come from `AGENTS.md` `## Comments` and `## File size`; worked examples
from `tasks/20260731-212557/DECISION.md`. Do not re-derive them. Sibling
20260731-212610 is landed; its `NOTES.md` carries three method warnings this
task honours: grep as widely as possible and filter the OUTPUT by reading it,
search `tasks/` whole before declaring a rationale unrecorded, and expect a
split to RAISE the line total.

- [x] Record the baseline with the parser rig (method:
      `tasks/20260731-212557/NOTES.md` `## How the population was counted`).
      Measured already, to be re-confirmed on the branch: `treeBuilder.ts`
      443/29/102, `treeVisualizer.ts` 358/16/101, `treeLayout.ts` 106/5/47,
      `closeness.ts` 66/5/28 (lines/comments/comment lines).
- [x] Write `DECISION.md` before moving code, settling three choices:
      (1) both hint rules move, including `findBestHintCladeId`, which is a
      tree walk by mechanism but a hint rule by job; (2) `treeLayout.ts` does
      NOT absorb the DOM geometry - see the next step for the evidence;
      (3) how `renderTree`'s tail hands off to the scroll module without
      exporting mutable state.
- [x] Split `src/hintRule.ts` out of `treeBuilder.ts`: `findNextHintCladeId`
      and `findBestHintCladeId`. `treeBuilder.ts` keeps the node types, the
      type guards, `buildGuessTree`, `buildCladeSubtree`,
      `getNearestRevealedAncestor`, `getNearestRevealedClade`. `hintRule.ts`
      imports the node types from `treeBuilder.ts`; confirm no cycle
      (`treeBuilder.ts` must not import `hintRule.ts`).
- [x] Split `src/ui/treeScroll.ts` out of `treeVisualizer.ts`:
      `pickScrollAnchor`, `contentRect`, `focusRect`, `layoutTree`,
      `scheduleRelayout`, `listenForViewportChanges` and the four module-level
      mutables (`lastLayout`, `laidOutContainer`, `pendingRelayout`,
      `listeningForViewportChanges`). `treeVisualizer.ts` keeps `el`,
      `renderNode`, `renderTree` and the option types.
      `treeLayout.ts` stays as it is: its own header comment states it is kept
      DOM-free so the arithmetic can be unit-tested, `test/treeLayout.test.ts`
      runs it in the node environment, and the half being moved is entirely
      DOM (`offsetParent` walks, `ResizeObserver`, `scrollTo`). Absorbing it
      would put DOM into a file whose purity is a recorded decision
      (`tasks/20260729-092339/DECISION.md`).
- [x] Move `renderTree`'s last four lines - the `laidOutContainer` assignment,
      the `listenForViewportChanges` call and the `requestAnimationFrame`
      layout - into one exported function in `treeScroll.ts`, so the mutable
      stays private to the module that owns it. It is a move seam with one
      caller, not an abstraction; record it as such.
- [x] Update importers. `src/game/hintChip.ts` and `src/ui/panel.ts` are
      import-line edits; `scripts/playtest/hint.ts` and
      `scripts/playtest/difficulty.ts` are sibling 20260731-212616's files and
      get import-line edits only; `test/hintRule.test.ts` likewise. Enumerate
      with an UNFILTERED grep (`from ".*treeBuilder"`) and read every hit -
      the filtered kind is what cost sibling 20260731-212610 a broken build.
- [x] Compact the comments across the cluster. `treeBuilder.ts` carries 15
      narration discards per the child-1 inventory (`// Recurse into child
      clades`, `// Add hint-revealed clades`, `// Find the root clade`).
      KEEPS, in compacted form where they carry story: the browser-quirk notes
      in `treeVisualizer.ts` (the `popIn` mid-animation rect, the Android URL
      bar, the ResizeObserver-vs-resize media query, the instant-not-smooth
      scroll), the `SpeciesNode.closenessTier` docstring, and the scaling
      floors in `treeLayout.ts`. Before compacting any of them, check whether a
      record actually holds the rationale - grep `tasks/` whole, not just the
      `DECISION.md` a comment names.
- [x] Re-run the rig, fill the before/after tables, then `npm run ci`,
      `npm run build` and `npm run playtest:hint` inside `nix develop`.

## Definition of Done

- Before/after `wc -l` and comment counts recorded for every file in the
  cluster.
  (cmd: rig table in `tasks/20260731-212611/NOTES.md`; red on base, where
  `treeBuilder.ts` is 443 and `treeVisualizer.ts` 358 and neither
  `src/hintRule.ts` nor `src/ui/treeScroll.ts` exists)
- The two new modules hold the split, and nothing re-exports across the seam.
  (cmd: `grep -nE 'findNextHintCladeId|findBestHintCladeId|export \*' src/treeBuilder.ts`
  and `grep -nE 'layoutTree|focusRect|contentRect|pickScrollAnchor|export \*' src/ui/treeVisualizer.ts`
  return only calls into the new modules, no declarations and no re-exports)
- `treeLayout.ts` is still DOM-free. (cmd: `grep -nE
  'document|window|HTMLElement|ResizeObserver|getBoundingClientRect|offset'
  src/ui/treeLayout.ts` is empty)
- No assertion changed in `test/` or `e2e/`. (cmd: `git diff master -- test
  e2e` shows import-path lines only, each listed; `e2e/` expected empty)
- `scripts/playtest/hint.ts` still imports the shipped rule and its
  cross-check passes. (cmd: `npm run playtest:hint`)
- Every surviving inline task reference in the cluster is a one-line record
  pointer or a live tracker marker.
  (cmd: `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/treeBuilder.ts
  src/hintRule.ts src/ui/treeVisualizer.ts src/ui/treeScroll.ts
  src/ui/treeLayout.ts src/closeness.ts`, each hit justified)
- `npm run ci` and `npm run build` pass inside `nix develop`. (cmd: both)

## Close-out

**What and why.** Two splits, both pure moves. `src/hintRule.ts` takes the two
hint-selection rules out of `src/treeBuilder.ts`, leaving the tree model alone;
`src/ui/treeScroll.ts` takes the scroll and layout half out of
`src/ui/treeVisualizer.ts`, leaving the renderer alone. No symbol renamed, no
exported signature changed, one new export (`mountTreeScroll`) which is the
four lines of `renderTree`'s tail that wrote the scroll module's private
mutable. `src/ui/treeLayout.ts` is untouched apart from one comment path.

The largest file went 443 -> 291, which is the number this task said it would
move. The cluster total went 973 -> 974: a split buys seams, not lines.

**Alternatives.** All in `DECISION.md`: leaving `findBestHintCladeId` behind as
a tree walk (rejected - job beats mechanism), folding the scroll half into
`treeLayout.ts` (rejected - it would put DOM into a file whose DOM-freedom is
recorded and tested), splitting `treeVisualizer.ts` three ways (rejected as
over-splitting - the rect functions exist only to feed `layoutTree`), barrel
re-exports (rejected on 20260731-212610 case 2), and moving
`consistentCandidates` to `hintRule.ts` (rejected - it is a query over
`GameState`, not a rule for choosing a clade).

**The inherited open question is closed.** `consistentCandidates` stays in
`gameState.ts`, now decided on the merits rather than on cluster boundaries.
`DECISION.md` case 4.

**Difficulties.** One real find, and it was a pointer rather than a rationale:
`focusRect`'s comment cited `tasks/20260729-092339/DECISION.md` fork 2 as its
backing, but fork 2 chose to centre the mystery node and explicitly rejected
the union of target and newest guess that actually ships. The union was adopted
at review inside that same task and the DECISION was never amended. Checking
that a record exists is not checking that it says what the comment claims; only
reading it answers that. The pointer is corrected and the union's own rationale
kept in full, since no accepted record holds it.

Otherwise the whole-tree `tasks/` grep changed the answer for the entire scroll
cluster: its browser-quirk comments are recorded only in a `REVIEW.md`, a
`RETRO.md` and a `TASK.md`, none of which `AGENTS.md` `## Comments` accepts as a
compaction target, so all of them moved verbatim. `treeScroll.ts` carries 109
comment lines and that is the correct result.

The unfiltered importer grep found `test/treeBuilder.test.ts`, which the plan
had not listed, and the old-path grep found two comments that would have gone
stale (`src/ui/treeLayout.ts:5`, `src/style.css:386`). Both are 20260731-212610
lessons applied rather than relearned.

**Evidence.** `NOTES.md` holds the rig tables, the mechanical move check
(strip comments and blanks, normalise, sort, diff: residue is imports, one new
signature and one call site, with ZERO removed lines on both sides), the
importer enumeration, and every Done Means proof. `npm run ci` and `npm run
build` pass in `nix develop`; `npm run playtest:hint` reports 548/548 agreement
between the rig's reproduction and the shipped rule.

**Reflection.** The method warnings inherited from 20260731-212610 all paid
off, and each caught something: the unfiltered grep caught a test file, the
old-path grep caught two stale pointers, and the whole-tree record grep caught
the compaction that should not happen. The one thing they did not cover is the
`focusRect` case - a record that exists but disagrees with the code - which is
worth carrying to the five remaining children.
