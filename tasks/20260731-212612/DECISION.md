# Decision: where the profile page and the stats maths split

- DATE: 20260731
- STATUS: ACCEPTED
- TASK: 20260731-212612
- TAGS: refactor, ui

## Context

`src/profile.ts` (538 lines) and `src/gameStats.ts` (395) are the
`## File size` case: several unrelated jobs per file, not one long job.

`profile.ts` holds six. Page bootstrap (`main`, the `main()` call), tab wiring
(`setupTabs`), stat text (`updateStatsUI`), a guess-distribution bar chart
(`renderGuessDistribution`), a rolling-average SVG line chart with its own
tooltip show/hide and date formatting (`renderRollingAverage`, `showTooltip`,
`hideTooltip`, `formatDateShort`), and a dinosaur collection with carousel
navigation (`renderGuessedDinosaurs`, `setupCarouselNav`).

`gameStats.ts` holds two. Time-series maths - `TimeScale`,
`RollingAverageDataPoint`, `normalizeDateToScale`, `groupByTimeBucket`,
`calculateRollingAverage` - which buckets finished games by hour, day or week
and rolls a weighted average over the buckets. And profile-summary stats -
`GameStats`, `GameResult`, `loadAllGames`, `calculateStreak`,
`computeGameStats` - counts, win rate, guess distribution and streaks. The
maths half calls `loadAllGames`; nothing in the summary half calls the maths.

Seven choices decide whether this stays a MOVE, which `## File size` requires,
or turns into a redesign.

## Decision

### 1. `src/profile.ts` becomes the directory `src/profile/`, and webpack's entry moves with it

`src/profile/` takes `index.ts`, `statsPanel.ts`, `rollingAverageChart.ts` and
`dinosaurList.ts`. `webpack.config.js:16` changes from `./src/profile.ts` to
`./src/profile/index.ts`. That is the only build-config edit in this task.

The alternative - four sibling files at `src/` top level
(`profileStatsPanel.ts`, `profileRollingAverageChart.ts`, ...) - keeps the
entry path and needs no config edit at all, but it prefixes every filename with
the directory name it is refusing to create, and `src/game/` already set the
precedent for a page's units living in a directory (20260731-212610).

Nothing else in `webpack.config.js` moves. Its other five `profile` mentions
are the HTML template (`src/profile.html`), the emitted filename
(`profile/index.html`), the chunk NAME (`profile`, unchanged), an asset copy
and a dev-server rewrite - none of them names `./src/profile.ts`. The
`/profile/` URL the e2e suite visits is the emitted filename, so it is
untouched.

`src/**/*.ts` already covers Prettier, ESLint and tsconfig, so the new
directory needs no glob work. Same finding `src/game/` relied on in
20260731-212610.

### 2. The guess-distribution bars go with the stat text, NOT into a shared `charts.ts`

`statsPanel.ts` takes `updateStatsUI` AND `renderGuessDistribution`.

The skeleton plan floated a `charts.ts` holding both charts. Rejected on two
counts. The two charts share ZERO code: `renderGuessDistribution` is a
string-HTML `innerHTML` build of `<div>` bars, `renderRollingAverage` is a
`createElementNS` SVG build with scales, grid lines, a path, hover handlers and
a tooltip. Grouping them would be by MECHANISM ("things that are charts"), not
by job - the same test that put `findBestHintCladeId` with the hint rules in
20260731-212611 case 1.

And `renderGuessDistribution`'s only caller is `updateStatsUI`, twice, once per
mode. A `charts.ts` would also be roughly 300 lines - the largest file in the
cluster after the split, which defeats the task's own goal.

### 3. `renderGuessedDinosaurs` keeps its CURRENT caller inside `updateStatsUI`

`statsPanel.ts` therefore imports `dinosaurList.ts`. `updateStatsUI` ends by
calling `renderGuessedDinosaurs(statsDaily.allGuessedDinosaurs,
statsDaily.discoveredDinosaurs, gameData)`, and that call moves with it.

Hoisting the call up to `main()` would be behaviour-identical - `main` already
holds `statsDaily` and `gameData`, and the call sits last in `updateStatsUI`
with nothing after it - and it is the nicer seam: it would leave `statsPanel.ts`
importing nothing from `dinosaurList.ts` and make the two panels siblings under
`index.ts` rather than one nested inside the other.

It is not done here, deliberately. `AGENTS.md` `## File size`: "A split MOVES
code. It does not generalize it, rename exported symbols, or introduce a
parameter, hook, or config knob on the way." Moving a call site between
functions is a restructure, not a move, and it would put a behaviour-preserving
claim that needs an argument into a diff whose whole value is that it needs
none. Recorded as deliberately not done; a later task may take it.

### 4. `GameResult` becomes exported - the only visibility change in the cluster

`rollingAverage.ts` needs the `GameResult` type for `groupByTimeBucket`'s
parameter and for the `loadAllGames` return it consumes, so `gameStats.ts` must
export the interface it currently declares module-private.

No other symbol changes visibility. Everything that was exported stays
exported, and everything private that stays inside one file stays private:
`normalizeDateToScale` and `groupByTimeBucket` remain unexported inside
`rollingAverage.ts`; `calculateStreak` remains unexported inside
`gameStats.ts`; every `profile/` function is exported only because it is now
called across a file boundary, and none is re-exported anywhere.

Nothing re-exports across a seam. `gameStats.ts` does NOT re-export
`calculateRollingAverage`, so `test/gameStats.test.ts` and
`src/profile/index.ts` import it from `rollingAverage` directly - the
barrel-re-export refusal from `tasks/20260731-212610/DECISION.md`, applied
again. A barrel would have made this task a zero-importer diff, which is
exactly the appearance the epic is trying to stop buying.

### 5. `src/rollingAverage.ts` lives in `src/`, not in `src/profile/`

It is stats maths with its own Jest coverage - eleven `calculateRollingAverage`
cases in `test/gameStats.test.ts` - not page UI. It belongs beside
`gameStats.ts`, which it reads `loadAllGames` and `GameResult` from, and which
is likewise not a page file.

The dependency runs one way only: `rollingAverage.ts` imports from
`gameStats.ts`, and `gameStats.ts` imports nothing from `rollingAverage.ts`.
Both halves of the split were already one-way inside the single file, so no
cycle is introduced.

`src/profile/rollingAverageChart.ts` is the DRAWING, and it stays in the page
directory. Maths and chart are separate files on purpose: the chart consumes
`calculateRollingAverage`'s output but computes none of it.

### 6. `renderRollingAverage` and `showTooltip` keep `ReturnType<typeof calculateRollingAverage>`

Both signatures type their data as `ReturnType<typeof calculateRollingAverage>`
(and `[number]` of it) rather than the exported `RollingAverageDataPoint` /
`RollingAverageDataPoint[]` they resolve to. After the split,
`rollingAverageChart.ts` imports `calculateRollingAverage` purely to keep those
two type expressions spelled as they are.

Writing `RollingAverageDataPoint` instead is type-identical, strictly clearer,
and would drop a value import from a chart file that calls no function from it.
It is still a signature edit, which case 3's rule forbids on a move, and it
would mean the mechanical no-behaviour-change check no longer covers those two
lines. Left alone; it is a one-line cleanup for whoever next has a reason to
edit those signatures.

### 7. Neither new file joins the `AGENTS.md` repository map

`AGENTS.md:21` enumerates core `src/` modules: `game/`, `gameState.ts`,
`gameData.ts`, `treeBuilder.ts`, `hintRule.ts`, `puzzleKey.ts`, `shareText.ts`.
20260731-212611 added `hintRule.ts` to that row late, after review, because the
file it split OUT of - `treeBuilder.ts` - was already named there.

That test is applied here and comes back negative. `gameStats.ts` is not in the
row, so `rollingAverage.ts`, which is its extract, has no stronger claim than
its parent. Nor is any page entry: `index.ts`, `practice.ts` and the old
`profile.ts` are all absent, so `src/profile/` does not join either. The row
lists the game core, and neither new file is in it. Checked, not skipped.

## Alternatives considered

- **A shared `src/profile/charts.ts`.** Rejected in case 2: zero shared code,
  grouping by mechanism, and it would be the largest file left standing.
- **Four `profile*.ts` files at `src/` top level.** Rejected in case 1: it
  avoids the one config edit by spelling the directory name into four
  filenames.
- **A barrel re-export from `gameStats.ts`** so no importer changes. Rejected in
  case 4, on the precedent already set in `tasks/20260731-212610/DECISION.md`.
- **Hoisting `renderGuessedDinosaurs` to `main()`.** Rejected in case 3 as a
  restructure, and recorded as the better seam it is.
- **Putting `rollingAverage.ts` under `src/profile/`.** Rejected in case 5: it
  has Jest coverage and no DOM, and the page directory is for page UI.
- **Splitting `calculateStreak` out too.** Not attempted. It is one job with
  `computeGameStats`, its only caller, and `## File size` does not split for
  length alone.

## Consequences

- The largest file in the cluster drops from 538 to roughly 200. The line TOTAL
  rises, because five new files each pay for their own import block - the
  expected shape, matching +17 in 20260731-212610 and +1 in 20260731-212611.
- Two importers change: `src/profile/index.ts` and `test/gameStats.test.ts`
  take `calculateRollingAverage` from `rollingAverage`.
  `src/game/shareButton.ts` imports only `computeGameStats` and needs no edit.
  The test edit is an import line only; no assertion changes.
- `src/profile/*.ts` uses `../` for every sibling-directory import
  (`../style.css`, `../gameStats`, `../ui/card`), one directory level deeper
  than before.
- Two cleanups are deliberately left undone and recorded above: the
  `renderGuessedDinosaurs` hoist (case 3) and the `ReturnType<...>` signatures
  (case 6). Both are behaviour-identical and both are restructures.
