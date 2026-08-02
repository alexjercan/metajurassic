# KISS pass: profile page and stats maths

- PRIORITY: 66
- TAGS: refactor, ui
- KIND: STORY
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE
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

- [x] Record the baseline with the parser rig (method:
      `tasks/20260731-212557/NOTES.md` `## How the population was counted`).
      Measured already, to be re-confirmed on the branch: `profile.ts`
      538/30/30, `gameStats.ts` 395/27/38.
- [x] Write `DECISION.md` before moving code, settling four choices:
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
- [x] Split `src/profile/` into four files, all pure moves:
      `index.ts` keeps `main` and `setupTabs` and the `main()` call;
      `statsPanel.ts` takes `updateStatsUI` and `renderGuessDistribution`;
      `rollingAverageChart.ts` takes `renderRollingAverage`, `showTooltip`,
      `hideTooltip`, `formatDateShort`;
      `dinosaurList.ts` takes `renderGuessedDinosaurs` and `setupCarouselNav`.
      `statsPanel.ts` imports `dinosaurList.ts` per choice (3).
- [x] Update the webpack entry and confirm with `npm run build`. `src/**/*.ts`
      already covers Prettier, ESLint and tsconfig, so no glob work - the same
      finding `src/game/` relied on in 20260731-212610.
- [x] Split `src/rollingAverage.ts` out of `gameStats.ts`: `TimeScale`,
      `RollingAverageDataPoint`, `normalizeDateToScale`, `groupByTimeBucket`,
      `calculateRollingAverage`. `gameStats.ts` keeps `GameStats`,
      `GameResult`, `loadAllGames`, `calculateStreak`, `computeGameStats`.
      `rollingAverage.ts` imports `loadAllGames` and the `GameResult` type;
      confirm no cycle (`gameStats.ts` must not import `rollingAverage.ts`).
      It stays in `src/`, beside `gameStats.ts`, not in `src/profile/`: it is
      stats maths with Jest coverage, not page UI.
- [x] Update importers. Enumerate with an UNFILTERED grep
      (`from ".*gameStats"`, `from ".*profile"`) and read every hit. Known:
      `src/profile/index.ts` and `test/gameStats.test.ts` take
      `calculateRollingAverage` from the new module; `src/game/shareButton.ts`
      imports only `computeGameStats` and needs no edit.
- [x] Compact the comments across the cluster. The child-1 inventory records 30
      narration discards in `profile.ts` (`// Draw line`, `// Create scales`,
      `// Y-axis label`) and 24 in `gameStats.ts` (`// Sort by date`,
      `// Only count wins`, `// Convert to averages`) - the two biggest discard
      clusters in `src/`. Before compacting anything longer, grep `tasks/`
      whole AND read the record found.
- [x] Re-run the rig, fill the before/after tables, then `npm run ci` and
      `npm run build` inside `nix develop`.
- [x] Look at the page. Seed a profile with finished games, open `/profile`,
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

## Close-out

**What and why.** `src/profile.ts` (538) and `src/gameStats.ts` (395) each held
several unrelated jobs, which is the `AGENTS.md` `## File size` split case.
`profile.ts` became `src/profile/` with four files - page bootstrap and tabs in
`index.ts`, stat text and the distribution bars in `statsPanel.ts`, the SVG line
chart and its tooltip in `rollingAverageChart.ts`, the collection and carousel
in `dinosaurList.ts`. The time-series maths left `gameStats.ts` for
`src/rollingAverage.ts`, beside it in `src/` because it is maths with Jest
coverage, not page UI. Every seam is a pure move; the only visibility change is
`GameResult` becoming exported, and the only build-config edit is the webpack
entry.

**The number that moved.** The largest file, 538 -> 245. The split alone raised
the cluster total by 6 (933 -> 939), the shape the two landed siblings predicted;
the comment pass then removed 50 lines, so the net total fell 44 to 889.
Comments went 57 -> 10: 47 discarded, 2 compacted, 8 kept in full.

**Alternatives.** Seven settled in `DECISION.md` before a line moved. The two
that most shaped the result: no shared `charts.ts` (the two charts share zero
code and it would have left a ~300-line file as the largest, defeating the
task), and no barrel re-export from `gameStats.ts` (which would have made this
a zero-importer diff and hidden the seam the epic is paying to expose). Two
behaviour-identical cleanups are deliberately NOT done and recorded as such -
hoisting `renderGuessedDinosaurs` to `main()` (case 3) and replacing
`ReturnType<typeof calculateRollingAverage>` with `RollingAverageDataPoint`
(case 6). Both are restructures, which `## File size` forbids on a split.

**Difficulties and diagnosis.** None in the move itself. The one real diagnosis
was in the manual check: the first rig run seeded practice targets past the end
of the 150-species list, so the practice tab drew its empty states instead of
its charts. Caught by LOOKING at the capture, not by any assertion - the rig
exited green on the parts it did reach. Fixed the indices and re-ran; the
accidental empty-state coverage is recorded in `NOTES.md` rather than discarded.

**Evidence.** `npm run ci` (21 suites / 323 Jest tests, 126 Playwright tests)
and `npm run build` green inside `nix develop`, run twice - once on the pure
move before any comment was touched, once on the final tree. The mechanical
strip-sort-diff over the move removed 13 lines, all of them import fragments or
declarations that gained `export`, and no statement. Both charts, the tooltip
and the carousel were seen rendering in a real browser from a seeded profile.
All Done Means greps return empty as specified.

**Reflection.** The three method warnings inherited from siblings 2 and 3 each
did work. The unfiltered grep confirmed `src/game/shareButton.ts` needed no edit
by reading it rather than by trusting a pattern. The whole-record-tree grep did
NOT do its work first time: its terms came from the words the comments use, not
from their subjects, so it came back empty and licensed all eight keeps as
unrecorded. Review R1.1 re-ran it on the subjects and found
`tasks/20260729-122943/DECISION.md:46` behind the calendar-days block. Review
R2.2 then caught that the first correction had patched only the two keeps R1.1
named and left the other six on the discredited first pass; the subject-term
pass was re-run for all eight. All eight still stay in full, but the
calendar-days one now stands on the `## Comments` defect-shape Keep row rather
than on an absent record; `NOTES.md` records the miss, the re-run, the four
further same-defect hits rejected on KIND, and the method lesson - re-run a
faulted METHOD across every subject, not only across the instances the finding
cites. The near-misses on the streak rule - a `REVIEW.md`, a `TASK.md`, and
a `DECISION.md` that mentions only the symptom - were rejected on KIND and on
content, as 20260731-212611 did for its scroll cluster. The both-polarities doc
sweep found the `AGENTS.md:21` enumeration and answered it explicitly with a
negative rather than silently, which is the gap that produced that task's R1.1.
The per-file counts are all re-derived post-split, and where the child-1
inventory's 24 does not reconcile with this task's 20, `NOTES.md` says so
instead of reporting an agreement that is not there.
