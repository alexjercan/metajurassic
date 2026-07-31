# KISS pass: tree pipeline (treeBuilder, treeVisualizer, treeLayout)

- STATUS: OPEN
- PRIORITY: 68
- TAGS: refactor,ui
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
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

- [ ] Follow the rules from the policy task.
- [ ] Split the hint rules out of `treeBuilder.ts`. They are consumed by
      `game.ts` and reproduced by `scripts/playtest/hint.ts`; the guess-tree
      construction is consumed by the renderer. Different readers, different
      files.
- [ ] Split `treeVisualizer.ts` along the render / measure-and-scroll seam:
      `renderNode` and `renderTree` on one side, `pickScrollAnchor`,
      `contentRect`, `focusRect`, `layoutTree`, `scheduleRelayout`,
      `listenForViewportChanges` on the other. Record whether `treeLayout.ts`
      absorbs the geometry half or stays as it is.
- [ ] Compact the comments across the cluster. Browser-quirk notes and the
      scaling constraint from `20260331-154614` are keeps - state the
      constraint, drop the incident narrative.
- [ ] Prove no behaviour moved: `test/treeBuilder.test.ts`,
      `test/treeLayout.test.ts`, `test/hintRule.test.ts`, `test/hintCap.test.ts`,
      `test/closeness.test.ts` and `e2e/tree.spec.ts` are untouched and green.

## Definition of Done

- Before/after `wc -l` recorded for every file in the cluster.
  (cmd: `wc -l` table in the task record)
- No assertion changed in the listed suites. (cmd: `git diff test e2e`)
- `scripts/playtest/hint.ts` still imports the shipped rule and its cross-check
  still passes. (cmd: `npm run playtest:hint`)
- Every surviving inline task reference in the cluster is a pointer or a live
  marker. (cmd: the cluster grep)
- `npm run ci` and `npm run build` pass. (cmd: both)
