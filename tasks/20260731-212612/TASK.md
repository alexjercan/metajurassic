# KISS pass: profile page and stats maths

- STATUS: OPEN
- PRIORITY: 66
- TAGS: refactor,ui
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer touching the profile page, I want the stats maths and the chart
drawing in separate files, so that a rendering tweak does not require reading
streak arithmetic.

## Problem

`src/profile.ts` (538 lines) is the largest `src/` file: page bootstrap, tab
wiring, stat text, a guess-distribution chart, a rolling-average chart with its
own tooltip show/hide and date formatting, a guessed-dinosaur list, and
carousel navigation. Six unrelated jobs in one script entry point.

`src/gameStats.ts` (394 lines) mixes time-bucket normalization, rolling-average
computation, streak arithmetic, and the storage read that feeds them.

## Steps

- [ ] Follow the rules from the policy task.
- [ ] Split `profile.ts` into the page entry point plus the render units it
      calls: the two charts (including tooltip and short-date helpers), the
      guessed-dinosaur list with its carousel, and the stat text. Entry point
      keeps the bootstrap and the tab wiring.
- [ ] Split `gameStats.ts` along the compute seam: bucket/scale normalization
      and rolling average on one side, the game-result load plus streak and
      aggregate stats on the other. Record the boundary chosen.
- [ ] Compact the comments across the cluster.
- [ ] Prove no behaviour moved: `test/gameStats.test.ts` (1112 lines) is
      untouched and green - it is the strongest evidence in the repo that this
      split is safe.

## Definition of Done

- Before/after `wc -l` recorded for every file in the cluster.
  (cmd: `wc -l` table in the task record)
- No assertion changed in `test/gameStats.test.ts`. (cmd: `git diff test`)
- The profile page still renders both charts, the tooltip, and the carousel on
  a real browser, checked by looking, not only by tests
  (`LESSONS.md`: `re-render-and-look-after-every-layout-change-not-once-per-task`).
  (cmd: `npm run serve`, open `/profile`, screenshot both tabs)
- `npm run ci` and `npm run build` pass. (cmd: both)
