# KISS pass: Jest suites and playtest rigs

- STATUS: OPEN
- PRIORITY: 58
- TAGS: refactor,testing
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer reading a Jest suite or a playtest rig, I want its comments to
tell me why the assertion is the assertion, not which task once wanted it, so
that the surviving prose is worth reading.

## Problem

`test/` and `scripts/playtest/` carry the rest of the narrative comments.
`scripts/playtest/hint.ts` (830 lines, 117 comment) documents THREE hint rules -
the pre-`20260729-141424` behaviour, the rejected fork, and the shipped rule -
which is legitimate for a comparison rig but reads as three histories stacked.
`scripts/playtest/difficulty.ts` (571) and `walkthrough.ts` (395) repeat the
playtest-pass framing in their headers.

`test/gameStats.test.ts` (1112) and `test/treeBuilder.test.ts` (875) are large
enough to be worth a describe-block split.

## Steps

- [ ] Follow the rules from the policy task, with the test-comment carve-out:
      why-this-assertion is a KEEP; which-task-asked-for-it is not.
- [ ] Compact the playtest rig headers to what a reader running the rig needs:
      what it simulates, what it prints, what it cross-checks. The alternative
      rules in `hint.ts` stay - they are the rig's subject - but as labelled
      rule implementations, not as a history.
- [ ] Split `test/gameStats.test.ts` and `test/treeBuilder.test.ts` by concern
      if the describe blocks fall apart cleanly. Move tests verbatim; do not
      rewrite them. Leave them whole if the split is artificial, and say so.
- [ ] Compact comments across the remaining `test/` files.
- [ ] Prove no test was weakened: the same number of tests runs before and
      after, with the same names.
      (`LESSONS.md`: a silently dropped test is the failure mode here.)

## Definition of Done

- Test count and full test-name list are identical before and after.
  (cmd: `npx jest --listTests` plus `--verbose` name lists, diffed, recorded)
- Before/after `wc -l` for every file touched. (cmd: `wc -l` table)
- Every playtest rig still runs and prints its summary.
  (cmd: `npm run playtest:difficulty` and `npm run playtest:hint`)
- The `hint.ts` cross-check against `findNextHintCladeId` still passes.
  (cmd: `npm run playtest:hint`)
- `npm run ci` passes. (cmd: `npm run ci`)
