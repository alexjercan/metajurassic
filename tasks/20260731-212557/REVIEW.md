# Review: Write the comment and file-size policy into AGENTS.md

- TASK: 20260731-212557
- BRANCH: docs/comment-policy

## Round 1

- REVIEWER: in-session (no executable diff - the branch touches `AGENTS.md`
  and three records only, and every claim in them is re-derivable from the
  repository by command, which is how they were checked below)
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) tasks/20260731-212557/NOTES.md:54 - Step 1 asks for "a
  second table naming every file that carries a task-ID comment", and the
  record has no such table: `## Where the discards are` is a different table
  over a different axis, and the step is ticked. Sibling tasks need the file
  list to find their own task references, and the per-directory totals (21 / 8
  / 12 / 34) do not say which files. Add the table - file, directory, count -
  for the 38 files the recorded grep already lists.
  - Response: Added `## Every file carrying a task-ID comment` - all 38 files
    with their counts, summing to the recorded 75. Two observations came out
    of writing it and are recorded with it: `e2e/mobile.spec.ts` and
    `e2e/helpers.ts` hold 19 of the 75, and a task reference is not a discard
    on sight (most are the case-1 pointers the rules keep).

- [x] R1.2 (MINOR) tasks/20260731-212557/NOTES.md:88 - "3 in
  `test/lintGate.test.ts`, 9 across `e2e/`" is not what is there. Measured
  over the inventory (`/[Rr]eview\b|REVIEW\.md|\bR[0-9]\.[0-9]/`): 12 total -
  6 in `e2e/` (`helpers.ts:967`, `mobile.spec.ts:240,295,661`,
  `onboarding.spec.ts:66,143`), 4 in `test/` (3 of them `lintGate.test.ts`,
  plus `closeness.test.ts:108`), 1 in `src/` (`closeness.ts:3`), 1 in
  `scripts/` (`hint.ts:132`). Replace the two numbers with the measured
  breakdown. `DECISION.md`'s "review archaeology (12)" is already correct, so
  the two records currently disagree.
  - Response: Accepted, the number was asserted rather than measured. Replaced
    with the measured breakdown and the search that produces it, so the 12
    now agrees with `DECISION.md`.

- [x] R1.3 (NIT) tasks/20260731-212557/NOTES.md:92 - "21 in
  `scripts/playtest/`" counts pure dividers, but a mechanical banner search
  finds 26 there (`difficulty.ts` 11, `hint.ts` 9, `walkthrough.ts` 6); the
  other 5 are banners that also carry substance and were bucketed keep. Say
  which is being counted, so 20260731-212616 reproducing the number does not
  read the difference as an error.
  - Response: Said so: "21 pure dividers", with the rule-search count of 26 in
    `scripts/playtest/` plus 1 in `e2e/helpers.ts` and why the 6 differing
    ones are keeps.

### Verified

- `npm run ci` re-run in `nix develop` at `4a0fa77`: exit 0, 126 E2E passed.
- All seven `tatr proofs 20260731-212557` run individually: all green.
  `git diff --name-only master...HEAD` is `AGENTS.md` plus three files under
  `tasks/`, so the epic's no-source-edit constraint holds and no behaviour
  changed.
- The load-bearing claim re-derived independently: the inventory totals.
  Per-file counts from the extraction match the record exactly where the
  record names them - `e2e/helpers.ts` 66 comments over 1409 lines,
  `src/profile.ts` 30, `src/gameStats.ts` 27, `src/treeBuilder.ts` 29,
  `test/gameStats.test.ts` 50, `test/treeBuilder.test.ts` 46,
  `src/ui/modal.ts` 4, `src/ui/card.ts` 7. Every bucket row sums to its
  comment count (223, 87, 264, 263) and the columns sum to the stated totals
  (837 comments, 3103 lines, 620/73/144, 75 task-ref).
- Corroboration from outside this task: the epic's own comment-line table,
  measured before this branch existed, gives `e2e/helpers.ts` 430,
  `src/treeBuilder.ts` 102 and `src/ui/treeVisualizer.ts` 101. The parser used
  here reproduces all three exactly, which is what makes the scanner-versus-
  parser correction in the close-out credible rather than self-serving.
- All four `DECISION.md` examples quoted verbatim and checked at their cited
  `file:line`: `src/practice.ts:35`, `src/gameData.ts:5`,
  `e2e/images.spec.ts:40`, `e2e/postgame.spec.ts:75`. All four match.
- The `## Tracker markers` claim checked: only
  `scripts/playtest/difficulty.ts:291` is a marker inside a comment;
  `walkthrough.ts:337` is inside a template string, which the record already
  says.
- Doc sweep: no other comment or file-size guidance exists in `README.md` or
  elsewhere in `AGENTS.md` to go stale. The `## Conventions` cross-reference
  is the single pointer the global `AGENTS.md` asks for. Step 5's skip
  ("Code comments: docstrings..." lives in the global file, not this one) is
  correct - the string does not appear in the repository `AGENTS.md`.

### Notes

- Process signal: the plan's baseline numbers (603/301/780/1166 lines, 89
  task-ref lines) were wrong, and the task found that itself rather than
  building on them. The correction is recorded in the close-out with the
  mechanism. Worth the retro's attention as evidence that a line grep is not a
  comment count - the eight sibling tasks were all planned against the bad
  number.
- No `manual:` proofs on this task. The epic's Manual Acceptance item ("read a
  sample of each cluster's post-pass files") is not owed by this child.

## Round 2

- REVIEWER: in-session (round-1 exception stands - records-only diff,
  re-derived by command)
- VERDICT: APPROVE

All three round-1 findings verified fixed on the branch at `8638012`.

- R1.1: `## Every file carrying a task-ID comment` holds 38 rows summing to
  75, which matches the `## Population` table's task-ref column exactly. Both
  numbers re-derived from the inventory, not read off the record.
- R1.2: the review-archaeology breakdown now states 12 with the search that
  produces it and names all 12 sites. Re-run: 6 `e2e/`, 4 `test/`, 1 `src/`,
  1 `scripts/`. `NOTES.md` and `DECISION.md` now agree on 12.
- R1.3: "21 pure dividers" says what is being counted, and records the
  rule-search figures (26 in `scripts/playtest/`, 1 in `e2e/helpers.ts`) with
  the reason 6 of them are keeps. 21 + 6 = 27 reconciles against the
  banner-shaped 27 found mechanically.

`npm run ci` re-run in `nix develop` after the fixes: exit 0, 126 E2E passed.
All seven DoD proofs re-run green. The diff still touches `AGENTS.md` and
`tasks/` only.

No new findings. No pending `manual:` items on this task.
