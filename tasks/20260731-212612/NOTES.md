# Notes: KISS pass: profile page and stats maths

- TASK: 20260731-212612
- BRANCH: refactor/kiss-profile-stats

## The number this task intended to move

The LARGEST file, not the total. Stated before starting, per the epic's
inherited expectation that a split RAISES the line count because each new file
pays for its own import block (20260731-212610: +17 overall, largest 440 ->
230; 20260731-212611: +1 overall, largest 443 -> 291).

Here the split alone came in at +6 (933 -> 939) and the comment compaction then
took 50 lines back out, so the net total FELL by 44. Both numbers are below;
the +6 is the one comparable to the siblings.

| | before | after split (pure move) | after compaction |
|-|-|-|-|
| Largest file | 538 | 264 | **245** |
| Cluster total | 933 | 939 (+6) | 889 (-44) |

## The rig

Rebuilt from `tasks/20260731-212557/NOTES.md` `## How the population was
counted`: the TypeScript PARSER over `getLeadingCommentRanges` /
`getTrailingCommentRanges` per token, deduped by position, with consecutive
standalone `//` lines FUSED into one comment. Not the scanner (it reads a regex
literal as a comment) and not a line grep (a run of `//` lines is one comment).

Run inside `nix develop` with `NODE_PATH=$PWD/node_modules`; the sprout worktree
needed `node_modules` symlinked in before it would resolve `typescript`. The
symlink was removed before landing.

**Cross-check.** Before touching anything, the rebuilt rig reproduced the
baseline `TASK.md` already recorded, exactly: `src/profile.ts` 538/30/30 and
`src/gameStats.ts` 395/27/38 (lines / comments / comment lines).

## Before and after, per file

Every number below is from the same rig against the POST-split tree.
20260731-212611 R1.2 reported a cluster-scoped count under a file's name; the
per-file attribution here is re-derived, not inherited.

| File | lines | comments | comment lines |
|-|-|-|-|
| **Before** | | | |
| `src/profile.ts` | 538 | 30 | 30 |
| `src/gameStats.ts` | 395 | 27 | 38 |
| total | 933 | 57 | 68 |
| **After** | | | |
| `src/profile/index.ts` | 54 | 0 | 0 |
| `src/profile/statsPanel.ts` | 119 | 1 | 1 |
| `src/profile/rollingAverageChart.ts` | 245 | 2 | 2 |
| `src/profile/dinosaurList.ts` | 96 | 0 | 0 |
| `src/gameStats.ts` | 216 | 2 | 4 |
| `src/rollingAverage.ts` | 159 | 5 | 11 |
| total | 889 | 10 | 18 |

Comment count is conserved across the move itself: the six post-move files held
exactly 57 comments, the same 57 the two source files held, which is the check
that the move dropped none of them. The 57 -> 10 drop is entirely the
compaction pass that followed.

## What was kept, and why

Of the 57, **47 discarded, 2 compacted, 8 kept in full** - 10 survive, which is
what the rig reports. The two compactions survive shortened and are marked as
such in the table (the `Approximate` row covers two comments, one per
dimension):

| Site | Kept as | Rule |
|-|-|-|
| `gameStats.ts` calendar-days block (3 lines) | full | defect shape the code still defends - the 23h DST night that rounds to zero |
| `gameStats.ts` `// Current streak only counts if the last win was today or yesterday` | full | the rule behind `daysSinceLastWin <= 1`, which the expression does not state |
| `rollingAverage.ts` `normalizeDateToScale` docstring (7 lines) | full | the contract for the four `TimeScale` values; `weekly` = Monday 00:00 is not recoverable from the code |
| `rollingAverage.ts` `// Handle Sunday (0) and make Monday the start` | full | explains `day === 0 ? -6 : 1 - day` |
| `rollingAverage.ts` `// Default: 7 data points` | full | units guard: 7 BUCKETS, not 7 days, which the `scale` parameter beside it invites misreading |
| `rollingAverage.ts` `// Each data point represents the average of the last N data points...` | compacted from 2 lines to 1 | the narration line above it went; this line states the window is in buckets |
| `rollingAverage.ts` `// Calculate weighted average: sum of (average * count) / total count` | full | why the reduce multiplies by `gamesCount` - buckets are weighted by games, not equal |
| `rollingAverageChart.ts` `// Approximate tooltip width` / `// Approximate tooltip height` | full | guards two magic values as APPROXIMATIONS of a measured box |
| `statsPanel.ts` collection call | compacted | see below |

**The second compaction.** `// Render dinosaur collection (using daily stats
only)` became `// Daily stats only: practice guesses do not unlock collection
cards.` The first clause narrated the call name; the parenthetical is the
constraint, and a reader could otherwise take the daily-only argument list for
a bug. No record was compacted TOWARD - the constraint is stated in full at the
site, which is what `## Comments` requires when no record backs it.

**The whole-record-tree grep, and the record it found.** `tasks/`,
`LESSONS.md`, `README.md` and `AGENTS.md` were grepped. The first pass used
terms drawn from the words the comments happen to use - `daily stats only`,
`collection`, `tooltip`, `weighted`, `windowSize`, `window size`, `Monday`,
`bucket` - and came back empty. Review R1.1 caught that none of those eight
terms can reach either `gameStats.ts` keep, whose SUBJECTS are streak
arithmetic, so the negative was never tested for them. Re-run with terms taken
from the subject - `calculateStreak`, `calendarDaysBetween`, `streak`,
`spring-forward`, `DST`, `summer time`, `86400000`, `today or yesterday`,
`daysSinceLastWin` - it is not empty:

- **The calendar-days block IS backed by a record.**
  `tasks/20260729-122943/DECISION.md:46` (`## Follow-on`) records the exact
  defect: "`calculateStreak` (`src/gameStats.ts`) held the same
  elapsed-milliseconds arithmetic in both of its day comparisons, so it broke a
  streak across the spring-forward night and kept a dead one alive across it in
  the other direction." That is a `DECISION.md`, a KIND `## Comments` accepts as
  a compaction target, and it was READ, not merely found. The keep therefore
  does NOT stand on the absence of a record; it stands on the `## Comments` Keep
  row "a defect shape, value, or invariant the code still defends", at the site.
  The three-line block states the shape (a 23h night divided by 86400000 rounds
  to zero) that `calendarDaysBetween` still defends against, which is what a
  reader of the `if (daysDiff === 1)` branch cannot recover. Compacting it to a
  pointer would satisfy the Discard row "rationale reproducing a `DECISION.md`"
  only if the comment reproduced the decision; it does not - it states the
  invariant, and the record states the history.

  The same subject terms hit four MORE places describing the same defect:
  `tasks/20260729-122943/TASK.md:52-55`, `.../RETRO.md:15-16`,
  `.../REVIEW.md:22` and `LESSONS.md:410-411`
  (`fix-the-arithmetic-class-not-the-reported-callsite`). Each was read; none is
  a KIND `## Comments` accepts as a compaction target - `TASK.md`, `RETRO.md`,
  `REVIEW.md` and `LESSONS.md` are all outside `DECISION.md` / `SPIKE.md` /
  `NOTES.md` - so the `20260729-122943/DECISION.md` hit is the only one that was
  weighed, and it is the only one whose KIND could have licensed a compaction.
- **The today-or-yesterday keep is not backed.** The hits on that rule are
  `tasks/20260729-092504/REVIEW.md:46` and `tasks/20260729-101747/TASK.md:18`,
  neither a KIND `## Comments` accepts. `tasks/20260729-101747/DECISION.md:16`
  mentions the current-streak check, but only as a SYMPTOM of the puzzle-key
  round-trip defect that decision settles; it nowhere states why the rule is
  `daysSinceLastWin <= 1`. Read, and rejected on content as well as on KIND.

The remaining six keeps are `rollingAverage.ts` and `rollingAverageChart.ts`
sites. Review R2.2 caught that the first-pass terms do not cover their subjects
either - the `normalizeDateToScale` docstring is a `TimeScale` contract, and no
first-pass term reaches it. So the same subject-term pass was run for them over
the same four scopes: `TimeScale`, `normalizeDateToScale`, `groupByTimeBucket`,
`calculateRollingAverage`, `rollingAverage`, `rolling average` and `time scale`.
All seven return zero hits outside `tasks/20260731-212612/` itself. Nothing in
the tree backs those six, so they stay in full under `## Comments`: "If the
rationale has no `DECISION.md`, `SPIKE.md` or `NOTES.md` behind it, the comment
is its only copy: keep it in full." All eight keeps stand, on two different
rules, and no source change follows from the correction.

The method lesson, which is what R1.1 actually faulted: pick grep terms from
what the comment is ABOUT, and re-run the whole pass on every keep, not only on
the ones a finding happens to name. The first correction patched the two sites
R1.1 cited and left the other six on the discredited first pass, which is why
R2.2 exists.

**The child-1 prediction was NOT reused as a per-file count.**
`tasks/20260731-212557/NOTES.md:118` records 24 narration discards for
`src/gameStats.ts`, measured when that file still held the rolling-average
maths. This task's own read of the same territory discards 8 comments from the
`gameStats.ts` that remains and 12 from `rollingAverage.ts`, plus 1 compaction
in `rollingAverage.ts` - 20 discards over the two files, not 24.

The two figures are NOT reconciled here, and the difference is not evidence of
an error in either: they are different reads under different scopes, taken
months apart in the epic, and the child-1 inventory bucketed the undivided file
while this one buckets two. What matters is that no number in the table above
is inherited - every one is re-derived from this rig against the post-split
tree. 20260731-212611 R1.2 was exactly the failure of citing a pre-split
inventory as confirmation of a post-split per-file count, and it is not
repeated by reporting agreement that does not exist.

## Call sites and importers

Enumerated with an UNFILTERED grep across every `*.ts`, `*.js`, `*.mjs`,
`*.json`, `*.html` and `*.md` in the tree (`grep -rn 'gameStats'` and
`grep -rn 'profile'`), then filtered by READING the output rather than by
writing an exclusion pattern - 20260731-212611 found an unlisted importer this
way.

| Hit | Action |
|-|-|
| `src/profile.ts:6` | becomes `src/profile/index.ts`; takes `calculateRollingAverage` from `../rollingAverage` |
| `test/gameStats.test.ts:7` | import line split in two; `calculateRollingAverage` now from `../src/rollingAverage`. No assertion touched. |
| `src/game/shareButton.ts:3` | imports only `computeGameStats`. NO EDIT. |
| `webpack.config.js:16` | entry `./src/profile.ts` -> `./src/profile/index.ts`. The one build-config edit. |
| `webpack.config.js:56,57,58,69,116` | template, emitted filename, chunk name, asset copy, dev-server rewrite. None names `./src/profile.ts`. NO EDIT. |
| `src/puzzleKey.ts:80`, `src/shareText.ts:15` | comments naming `gameStats` concepts. Both name `loadAllGames`/`computeGameStats`, which STAY in `gameStats.ts`. NO EDIT. |
| `src/practiceSession.ts:26,179`, `src/practice.ts:77` | comments about "the profile page" as a surface, not a path. NO EDIT. |
| `e2e/*.spec.ts` `/profile/` | the EMITTED filename (`profile/index.html`), unchanged by the source move. NO EDIT. |
| `test/*.ts`, `tasks/**`, `LESSONS.md` | prose and history. NO EDIT. |

### Sibling-owned files touched

Per the epic rule that no sibling's files are touched beyond mechanical
import-line edits, and every such edit is listed:

- `test/gameStats.test.ts` (20260731-212616): one import statement split into
  two. Import lines only; `git diff master -- test e2e` shows nothing else, and
  `e2e/` is empty in that diff.

Nothing else. `src/gameStats.ts` and `src/profile*` are this task's own.

## Doc sweep, both polarities

**Stale references (paths that moved or died).** `src/profile.ts` no longer
exists. Grepped for it across docs and records: the only live reference was
`webpack.config.js:16`, edited. Every other hit is inside a `tasks/` record
describing history, which stays as written.

**Incomplete enumerations (a category this task added a member to).** The
polarity 20260731-212611 missed. `AGENTS.md:21` enumerates core `src/` modules.
Checked explicitly, and neither new file joins it - reasoning in `DECISION.md`
case 7: `gameStats.ts` is itself absent from that row, so its extract
`rollingAverage.ts` has no stronger claim, and no page entry (`index.ts`,
`practice.ts`, the old `profile.ts`) is listed either, so `src/profile/` does
not join. `AGENTS.md:22` covers `src/*.html` and `src/style.css`, untouched
here. No other doc enumerates `src/` modules.

## The move preserved behaviour, mechanically

Strip block and line comments, drop blank lines, normalise indentation, sort,
diff - run over the two `master` files against the six branch files. Result:

- **13 lines removed, 19 added, and NO removed line is a statement.** All 13
  are import-block fragments (`import {`, `} from "./gameStats";`, `GameStats,`,
  `calculateRollingAverage,`, `computeGameStats,`, `} from "./ui/card";`, the
  four relative-path imports) or one of the four declarations that gained an
  `export` keyword (`function updateStatsUI(`, `function renderRollingAverage(`,
  `function renderGuessedDinosaurs(`, `interface GameResult {`).
- The 19 additions are the same four declarations with `export`, plus the new
  per-file import blocks and the `../` path rewrites.
- No call site, no expression, no branch appears on either side.

That is the whole residue the check licenses: imports, new signatures, call
sites - and no removed lines.

## Looking at it

`LESSONS.md`
`re-render-and-look-after-every-layout-change-not-once-per-task`. Both charts
are hand-built - one `innerHTML` string of `<div>` bars, one `createElementNS`
SVG - so they type-check and unit-test green while rendering wrong. Type checks
and 323 Jest tests cannot see either.

A throwaway Playwright rig seeded 14 finished daily games and 20 finished
practice games straight into `localStorage` via the production `gameStateKey`
and `dateToSeed`, then captured the page. The rig was deleted after use rather
than retained: `AGENTS.md` `## Agent workflow` names `e2e/seed.spec.ts` and
`scripts/playtest/` as the retention homes, and neither is a profile-render
harness - adding one is new work, not this refactor. Its source is kept at
`/tmp/profile-look/rig.spec.ts.txt` alongside the captures.

Captures at `/tmp/profile-look/`: `1-daily-tab.png`, `2-practice-tab.png`,
`3-tooltip.png`, `4-carousel.png`, `5-carousel-scrolled.png`. What was seen,
looking, not asserting:

| Surface | Observed |
|-|-|
| Daily tab | four stat tiles (12 played, 100%, streak 5 / 5), performance table, unlocked-dinosaurs bar filled to 36/150, distribution rows 1-7 with correct bar widths and counts |
| Practice tab | 20 played, avg 5.3, distribution rows 1-9 including the zero-count row 1 drawn as an empty bar |
| Rolling-average chart | 20 points, connecting path, 6 grid lines with Y labels 2.0-7.0, X labels `Jul 12` / `Jul 22` / `Jul 31`, rotated "Avg Guesses" title and "Time" title |
| Tooltip | hovering point 9 shows `Jul 20`, `Avg: 5.1`, `Games: 7`, offset from the cursor and inside the container |
| Carousel | 150 cards, unlocked cards with image and facts, locked cards with the padlock placeholder; right arrow scrolls and the left arrow becomes enabled |

An earlier run of the same rig seeded practice targets past the end of the
150-species list, so the practice tab rendered its EMPTY states - "No wins yet!"
and "Play some practice games to see your weekly progress!". Both empty paths
were therefore also seen rendering correctly, by accident. Recorded because it
is real coverage, not because it was planned.

## Checks

Run inside `nix develop`, on the final tree:

- `npm run ci` - 21 Jest suites / 323 tests passed, 126 Playwright tests passed.
- `npm run build` - webpack compiled successfully with the new
  `./src/profile/index.ts` entry.
- `npx prettier --check` over every touched file - clean. `src/**/*.ts` already
  covers Prettier, ESLint and tsconfig, so `src/profile/` needed no glob work,
  the same finding `src/game/` relied on in 20260731-212610.
- `grep -nE 'calculateRollingAverage|normalizeDateToScale|groupByTimeBucket|export \*' src/gameStats.ts` - empty. No declarations left behind, no re-export.
- `grep -n 'rollingAverage' src/gameStats.ts` - empty. No cycle.
- `ls src/profile/` - exactly `index.ts`, `statsPanel.ts`, `rollingAverageChart.ts`, `dinosaurList.ts`.
- `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/profile src/gameStats.ts src/rollingAverage.ts` - empty. No inline task references survive in the cluster, so none needs justifying.

`npm run ci` and `npm run build` were run twice: once on the pure move before
any comment was touched, and again on the final tree. Both green both times,
which separates "the move is sound" from "the compaction is sound".
