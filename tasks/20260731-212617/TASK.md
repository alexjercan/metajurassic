# Decide and, if safe, split src/style.css by surface

- STATUS: OPEN
- PRIORITY: 50
- TAGS: refactor,ui,css
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer changing a layout rule, I want to find the block that owns it
without scrolling 2403 lines, so that a media-query fix lands in the right
place the first time.

## Problem

`src/style.css` is the largest file in the repo at 2403 lines. Every surface -
board, tree, panel, modal, profile, archive - shares one stylesheet with
interleaved media blocks.

This is the riskiest child in the epic and may correctly close as "not worth
it". CSS cascade order is load-bearing here: `LESSONS.md` records
`css-media-blocks-on-different-axes-are-resolved-by-file-order` and
`converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`.
A split that reorders declarations changes rendering, which this epic forbids.

## Steps

- [ ] Decide first, split second. Establish whether an import-partial split can
      preserve byte-for-byte cascade order under the current webpack and
      Tailwind setup. If it cannot, close the task with that finding recorded -
      that is a successful outcome, not a failure.
- [ ] If it can: capture the compiled CSS from `npm run build` on master as the
      baseline artifact BEFORE any edit.
- [ ] Split by surface, moving whole blocks in file order and importing the
      partials in exactly that order. Do not merge, dedupe, or reorder
      declarations - that is a separate task if it is ever wanted.
- [ ] Prove the compiled output is unchanged: diff the built CSS against the
      baseline. A non-empty diff means the split changed the cascade; either
      fix the order or abandon the split.
- [ ] Re-render and look at every surface at desktop, narrow, and short
      viewports - a byte-identical bundle still deserves eyes
      (`LESSONS.md`: `re-render-and-look-after-every-layout-change-not-once-per-task`).

## Definition of Done

- Either: the compiled CSS from `npm run build` is byte-identical to the
  pre-split baseline. (cmd: `diff` of the two built files, recorded)
- Or: the task closes with a recorded finding that the split cannot preserve
  cascade order, naming the mechanism that prevents it. (test: `DECISION.md`)
- Every E2E layout suite passes unchanged. (cmd: `npm run test:e2e`)
- Screens read at desktop, narrow, and short viewports, and compared against
  pre-split captures. (cmd: `npm run playtest:walkthrough`, images reviewed)
- `npm run ci` and `npm run build` pass. (cmd: both)
