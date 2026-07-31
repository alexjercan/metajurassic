# KISS pass: profile page and stats maths

- STATUS: OPEN
- PRIORITY: 66
- TAGS: refactor, ui
- KIND: STORY
- FLOW STEP: PLANNING
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer touching the profile page, I want the stats maths and the chart
drawing in separate files, so that a rendering tweak does not require reading
streak arithmetic.

## Problem

`src/profile.ts` (538 lines, 30 comments) is the largest `src/` file: page
bootstrap, tab wiring, stat text, a guess-distribution chart, a rolling-average
chart with its own tooltip show/hide and date formatting, a guessed-dinosaur
list, and carousel navigation. Six unrelated jobs in one script entry point.

`src/gameStats.ts` (395 lines, 27 comments) mixes time-bucket normalization,
rolling-average computation, streak arithmetic, and the storage read that feeds
them.

Measured on the branch point with the parser rig: `profile.ts` 538/30/30,
`gameStats.ts` 395/27/38 (lines/comments/comment lines).

## Steps

Rules come from `AGENTS.md` `## Comments` and `## File size`; worked examples
from `tasks/20260731-212557/DECISION.md`. Do not re-derive them. Siblings
20260731-212610 and 20260731-212611 are landed; their method warnings apply -
grep as widely as possible and filter the OUTPUT by reading it, grep `tasks/`
WHOLE before declaring a rationale unrecorded AND read the record found rather
than only confirming it exists, grep the OLD path after any move, sweep docs
for enumerations this task adds a member to as well as for stale references,
and expect a split to RAISE the line total.

- [ ] Record the baseline with the parser rig (method:
      `tasks/20260731-212557/NOTES.md` `## How the population was counted`).
      Measured already, to be re-confirmed on the branch: `profile.ts`
      538/30/30, `gameStats.ts` 395/27/38.
- [ ] Write `DECISION.md` before moving code, settling four choices:
      (1) `src/profile.ts` becomes the directory `src/profile/`, which needs the
      webpack entry updated from `./src/profile.ts` to `./src/profile/index.ts`
      - the one build-config edit in this task; (2) the guess-distribution bars
      go with the stat text rather than into a shared `charts.ts`, because
      their only caller is `updateStatsUI` and a "charts" file would group by
      mechanism, not job; (3) `renderGuessedDinosaurs` keeps its CURRENT caller
      inside `updateStatsUI` rather than being hoisted to `main()` - hoisting
      would be behaviour-identical but is a restructure, which `## File size`
      forbids on a split; (4) `GameResult` becomes exported, the only
      visibility change in the cluster.
- [ ] Split `src/profile/` into four files, all pure moves:
      `index.ts` keeps `main` and `setupTabs` and the `main()` call;
      `statsPanel.ts` takes `updateStatsUI` and `renderGuessDistribution`;
      `rollingAverageChart.ts` takes `renderRollingAverage`, `showTooltip`,
      `hideTooltip`, `formatDateShort`;
      `dinosaurList.ts` takes `renderGuessedDinosaurs` and `setupCarouselNav`.
      `statsPanel.ts` imports `dinosaurList.ts` per choice (3).
- [ ] Update the webpack entry and confirm with `npm run build`. `src/**/*.ts`
      already covers Prettier, ESLint and tsconfig, so no glob work - the same
      finding `src/game/` relied on in 20260731-212610.
- [ ] Split `src/rollingAverage.ts` out of `gameStats.ts`: `TimeScale`,
      `RollingAverageDataPoint`, `normalizeDateToScale`, `groupByTimeBucket`,
      `calculateRollingAverage`. `gameStats.ts` keeps `GameStats`,
      `GameResult`, `loadAllGames`, `calculateStreak`, `computeGameStats`.
      `rollingAverage.ts` imports `loadAllGames` and the `GameResult` type;
      confirm no cycle (`gameStats.ts` must not import `rollingAverage.ts`).
      It stays in `src/`, beside `gameStats.ts`, not in `src/profile/`: it is
      stats maths with Jest coverage, not page UI.
- [ ] Update importers. Enumerate with an UNFILTERED grep
      (`from ".*gameStats"`, `from ".*profile"`) and read every hit. Known:
      `src/profile/index.ts` and `test/gameStats.test.ts` take
      `calculateRollingAverage` from the new module; `src/game/shareButton.ts`
      imports only `computeGameStats` and needs no edit.
- [ ] Compact the comments across the cluster. The child-1 inventory records 30
      narration discards in `profile.ts` (`// Draw line`, `// Create scales`,
      `// Y-axis label`) and 24 in `gameStats.ts` (`// Sort by date`,
      `// Only count wins`, `// Convert to averages`) - the two biggest discard
      clusters in `src/`. Before compacting anything longer, grep `tasks/`
      whole AND read the record found.
- [ ] Re-run the rig, fill the before/after tables, then `npm run ci` and
      `npm run build` inside `nix develop`.
- [ ] Look at the page. Seed a profile with finished games, open `/profile`,
      and capture both tabs plus the tooltip and the carousel. `LESSONS.md`
      `re-render-and-look-after-every-layout-change-not-once-per-task`: the
      charts are drawn with hand-built SVG and string HTML, which type-checks
      and unit-tests green while rendering wrong.

## Definition of Done

- Before/after `wc -l` and comment counts recorded for every file in the
  cluster.
  (cmd: rig table in `tasks/20260731-212612/NOTES.md`; red on base, where
  `profile.ts` is 538 and `gameStats.ts` 395 and neither `src/profile/` nor
  `src/rollingAverage.ts` exists)
- The splits hold and nothing re-exports across a seam.
  (cmd: `grep -nE 'calculateRollingAverage|normalizeDateToScale|groupByTimeBucket|export \*' src/gameStats.ts`
  returns no declarations and no re-exports; `ls src/profile/` is exactly
  `index.ts`, `statsPanel.ts`, `rollingAverageChart.ts`, `dinosaurList.ts`)
- No cycle: `gameStats.ts` does not import `rollingAverage.ts`.
  (cmd: `grep -n 'rollingAverage' src/gameStats.ts` is empty)
- No assertion changed in `test/` or `e2e/`. (cmd: `git diff master -- test e2e`
  shows import-path lines only, each listed; `e2e/` expected empty)
- The move preserved behaviour mechanically. (cmd: strip comments and blank
  lines from both sides, normalise indentation, sort, diff; residue is only
  imports, new signatures and call sites, recorded in `NOTES.md`)
- Every surviving inline task reference in the cluster is a one-line record
  pointer or a live tracker marker.
  (cmd: `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/profile
  src/gameStats.ts src/rollingAverage.ts`, each hit justified)
- The profile page still renders both charts, the tooltip, and the carousel in
  a real browser, checked by LOOKING, not only by tests
  (`LESSONS.md`: `re-render-and-look-after-every-layout-change-not-once-per-task`).
  (cmd: screenshots of both tabs, the rolling-average tooltip and the carousel,
  captured from a seeded profile and viewed; paths recorded in `NOTES.md`)
- `npm run ci` and `npm run build` pass inside `nix develop`. (cmd: both)
