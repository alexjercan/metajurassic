# Review: KISS pass: profile page and stats maths

- TASK: 20260731-212612
- BRANCH: refactor/kiss-profile-stats

## Round 1

- REVIEWER: in-session (session instructions forbid spawning subagents unless
  the user asks; same exception 20260731-212611 recorded)
- VERDICT: REQUEST_CHANGES

Mitigation for the in-session round, as in 20260731-212611: every claim below
was re-derived from the tree rather than read off the implementation summary -
the rig was re-run over the six post-split files, the strip-sort-diff was
recomputed from `git show master:` sources, all four Done Means greps were
re-run, `npm run ci` and `npm run build` were re-run with exit codes preserved,
and the tooltip capture was opened and compared against the row `NOTES.md`
claims for it. Both findings are defects in the task's own records, which is
the class this exception is weakest against; they were found by re-deriving the
whole-record-tree grep independently, not by re-reading the record.

- [x] R1.1 (MAJOR) tasks/20260731-212612/NOTES.md:93 - "Nothing in the tree
  backs any of the nine keeps. So none of them could be compacted toward a
  record even in principle" is false. `tasks/20260729-122943/DECISION.md:46`
  (`## Follow-on`) records exactly the defect the kept `gameStats.ts:114-116`
  calendar-days block defends: "`calculateStreak` held the same
  elapsed-milliseconds arithmetic in both of its day comparisons, so it broke a
  streak across the spring-forward night". That is a `DECISION.md`, a KIND
  `## Comments` accepts as a compaction target. The eight search terms the same
  paragraph lists (`daily stats only`, `collection`, `tooltip`, `weighted`,
  `windowSize`, `window size`, `Monday`, `bucket`) contain no term that could
  reach it, so the universal negative was never tested for either `gameStats.ts`
  keep - the `search-the-whole-record-tree-before-declaring-a-rationale-unrecorded`
  failure mode, in the record rather than in the code. The keep itself still
  stands on the `## Comments` "defect shape the code still defends" row, so no
  source change is required. Rewrite the paragraph to name the record found,
  state that the keep stands on the defect-shape row rather than on the absence
  of a record, and list the terms that actually cover the two `gameStats.ts`
  keeps.
  - Response: Accepted; the finding is correct and the miss is the one the
    epic's method warning names. `tasks/20260729-122943/DECISION.md` was read
    in full before rewriting, and its `## Follow-on` does record the defect.
    `NOTES.md` `## What was kept, and why` now reports the first grep's terms
    AS the miss (drawn from the comments' wording, not their subjects), gives
    the re-run terms taken from the subjects - `calculateStreak`,
    `calendarDaysBetween`, `streak`, `spring-forward`, `DST`, `summer time`,
    `86400000`, `today or yesterday`, `daysSinceLastWin` - names the record
    found, and states that the calendar-days keep stands on the `## Comments`
    "defect shape the code still defends" Keep row rather than on an absent
    record, with the reason it is not the "rationale reproducing a
    `DECISION.md`" Discard row (the comment states the invariant; the record
    states the history). The re-run also surfaced
    `tasks/20260729-101747/DECISION.md:16` for the OTHER `gameStats.ts` keep;
    it was read and rejected on content - it mentions the current-streak check
    only as a symptom of the puzzle-key round-trip defect and nowhere states
    why the rule is `daysSinceLastWin <= 1`. That keep is therefore still
    unbacked and still stands on the no-record rule. No source change; the
    claim was rewritten, not deleted. `TASK.md` `## Close-out` `**Reflection.**`
    was corrected in the same way, since it repeated the empty-grep claim.
    Commit d485835.

- [x] R1.2 (MINOR) tasks/20260731-212612/NOTES.md:93 - "the nine keeps" and
  "all nine stay in full" (line 94) contradict the same file's authoritative
  count at line 66, "47 discarded, 2 compacted, **8 kept in full**", which the
  rig confirms: 10 comments survive, 2 of them compacted. Nine is the number of
  ROWS in the table above it, and one of those rows is a compaction, not a keep.
  `TASK.md:170` repeats the error ("licensed keeping nine comments in full")
  while `TASK.md:140` states 8 correctly. Change both to eight kept in full.
  - Response: Accepted. Both prose sites now say eight kept in full, matching
    the rig-confirmed `NOTES.md:66` and `TASK.md:140`: 47 discarded, 2
    compacted, 8 kept in full, 10 surviving. The rewritten `NOTES.md`
    paragraph splits the eight as 2 `gameStats.ts` keeps plus 6 in
    `rollingAverage.ts` and `rollingAverageChart.ts` (see R2.2 for the terms
    those six were tested with), which reconciles against the table once the
    `Approximate` row is counted as the two comments it covers and the two
    compaction rows are excluded. `grep -rn nine tasks/20260731-212612/NOTES.md
    tasks/20260731-212612/TASK.md` is now empty. Commit d485835.

Verified, and passing:

- `npm run ci` rc=0 - 21 Jest suites / 323 tests, 126 Playwright tests.
  `npm run build` rc=0 - webpack compiled with the `./src/profile/index.ts`
  entry, `asset profile.js 127 KiB`.
- The rig re-run over the post-split tree reproduces the After table exactly:
  54/0/0, 119/1/1, 245/2/2, 96/0/0, 216/2/4, 159/5/11 - total 889/10/18.
  Largest file 538 -> 245, the number the plan said it would move.
- The strip-sort-diff, recomputed independently from `git show master:`, removes
  only import fragments, declarations that gained `export`, and discarded
  comment text. No statement, expression or branch is removed on either side.
- All four Done Means greps return empty as specified, and
  `git diff master -- test e2e` is the two import lines in
  `test/gameStats.test.ts` with no assertion touched and `e2e/` empty.
- Doc sweep spot-checked in both polarities: outside the exempt `tasks/` tree,
  the only live `src/profile.ts` reference was `webpack.config.js:16`, edited;
  `AGENTS.md:21` enumerates core `src/` modules and correctly gains no member,
  per `DECISION.md` case 7.
- `/tmp/profile-look/3-tooltip.png` opened and read: `Jul 20`, `Avg: 5.1`,
  `Games: 7`, Y labels 2.0-7.0, X labels `Jul 12` / `Jul 22` / `Jul 31` - the
  row `NOTES.md` records for it, seen rather than asserted.
- Every Step's literal text re-read against the diff. All nine hold.

Not verified: the "comment count is conserved at 57 across the move itself"
intermediate (`NOTES.md:60`) - that tree no longer exists on the branch, and
the endpoints it connects both re-derive correctly.

Process signal: both findings are in the records, not the code. That is the
second consecutive child where the review's whole yield is record defects
(20260731-212611 R1.1 and R1.2 likewise), which is worth the epic retro's
attention: the source moves are being verified mechanically and are coming out
clean, while the prose that reports them is where the errors land.

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

Scope: verify the two round-1 Responses and add findings only for regressions
the fixes introduced. The out-of-context reviewer received only the task ID, the
branch, the worktree path, the default branch, the review dimensions and this
format; round 1 was read off the branch, not handed over as narrative. The
in-session primary then re-derived both findings independently before accepting
them - the R2.1 hit list by re-running `86400000`, `elapsed-millisecond` and
`spring-forward` over the four scopes, and the R2.2 negative by running all
seven `normalizeDateToScale` subject terms - and confirmed
`git diff 423a934 HEAD --stat` touches `NOTES.md` and `TASK.md` only. No source
changed since round 1, so the check suite was not re-run; round 1's rc=0 for
`npm run ci` and `npm run build` stands.

Both round-1 findings are fixed. Both round-2 findings are residue of the R1.1
fix and were fixed in the same round, verified by the primary who re-derived
them; the ticks below record that verification, not the fix's own claim.

- [x] R2.1 (MINOR) tasks/20260731-212612/NOTES.md:90 - the heading "the one
  record it found" and the single-record bullet under-reported the re-run's
  yield. Over the declared scope the subject terms also hit
  `tasks/20260729-122943/TASK.md:52-55`, `.../RETRO.md:15-16`,
  `.../REVIEW.md:22` and `LESSONS.md:410-411`, all describing the same defect.
  The keep's disposition is unaffected, but the record should name them and
  state that none is a KIND `## Comments` accepts, so only the `DECISION.md`
  hit was weighed.
  - Response: Accepted and re-derived independently -
    `grep -rniE '86400000|elapsed-millisecond|elapsed millisecond|spring-forward'`
    over `tasks/`, `LESSONS.md`, `README.md` and `AGENTS.md` returns exactly
    those four beyond the `DECISION.md`. The heading is now "the record it
    found" and a paragraph under the calendar-days bullet names all four, gives
    their KINDs, and states why only the `DECISION.md` could have licensed a
    compaction.

- [x] R2.2 (MINOR) tasks/20260731-212612/NOTES.md:123 - "the remaining six
  keeps ... covered by the first-pass terms" repeats the wording-vs-subject
  conflation R1.1 faulted, now for the other six: the `normalizeDateToScale`
  docstring's subjects appear in neither pass. State the subject terms actually
  run and their result instead of asserting first-pass coverage.
  - Response: Accepted; this is the sharper reading of R1.1 and the fix should
    have re-run the method for all eight keeps, not for the two R1.1 named. The
    seven subject terms - `TimeScale`, `normalizeDateToScale`,
    `groupByTimeBucket`, `calculateRollingAverage`, `rollingAverage`,
    `rolling average`, `time scale` - were run over the same four scopes by the
    primary; every one returns zero hits outside `tasks/20260731-212612/`, so
    the conclusion holds and is now recorded with the terms that establish it.
    `NOTES.md` also gains the method lesson explicitly.

Verified this round:

- `git diff 423a934 HEAD --stat` is `NOTES.md` and `TASK.md` only. No source
  file, no test, no config. The check suite was correctly not re-run.
- R1.2: `grep -rn nine` over `NOTES.md` and `TASK.md` is empty. `NOTES.md:66`,
  `TASK.md:140` and both corrected prose sites now agree on 47 discarded, 2
  compacted, 8 kept in full, 10 surviving. The table reconciles to eight once
  the `Approximate` row is counted as the two comments it covers and the two
  compaction rows are excluded.
- R1.1: `tasks/20260729-122943/DECISION.md:46` is `## Follow-on` and its quote
  at :48-51 matches the record verbatim. `tasks/20260729-101747/DECISION.md:16`
  re-read and confirmed symptom-only - it names the current-streak check as a
  consequence of the puzzle-key round-trip defect and nowhere states why the
  rule is `daysSinceLastWin <= 1`, so the today-or-yesterday keep is correctly
  still recorded as unbacked.
- Both `gameStats.ts` keeps re-read at the site: the calendar-days block states
  the invariant, not the decision's history, so the Discard row "rationale
  reproducing a `DECISION.md`" does not reach it.

Process signal: three consecutive rounds on this branch whose entire yield is
record prose rather than code (R1.1, R1.2, R2.1, R2.2), and both round-2
findings are residue of the round-1 fix - the correction was applied to the two
comments R1.1 cited rather than to the METHOD R1.1 faulted. Two lessons for the
epic retro. First, the source moves are being verified mechanically and coming
out clean while the prose reporting them is where the errors land, which is now
a four-finding pattern across two children. Second, when a finding faults a
method, the fix must re-run that method across every subject it covers, not
patch the instances the finding happens to name; the out-of-context reviewer
caught that and a self-review of the fix would not have.
