# Retro: KISS pass: tree pipeline (treeBuilder, treeVisualizer, treeLayout)

- TASK: 20260731-212611
- BRANCH: refactor/kiss-tree-pipeline
- REVIEW ROUNDS: 2

## What went well

- **The three inherited method warnings each caught something real, and none
  had to be relearned.** The unfiltered importer grep found
  `test/treeBuilder.test.ts`, which the approved plan had not listed. The
  old-path grep found two comments that would have become stale pointers to a
  function that had left the file (`src/ui/treeLayout.ts:5`,
  `src/style.css:386`) - neither is in this task's cluster, and neither would
  have shown up in a search for the files that GAINED code. The whole-tree
  record grep changed the answer for the entire scroll cluster. Inheriting
  another task's failures as procedure worked exactly as the epic intended.
- **Writing `DECISION.md` before moving a line, again.** Five cases settled
  while reading the code rather than while defending a diff, including the
  inherited `consistentCandidates` question, which was cheap to answer honestly
  before the split existed and would have been much harder afterwards - by then
  `hintRule.ts` would have been sitting there as the obvious home, and the
  locality argument reads much stronger once the file exists.
- **The mechanical move check came back with ZERO removed lines on both
  clusters.** Strip comments and blanks, normalise indentation, sort, diff. That
  turns "did the move change behaviour" from a judgement into a check, and it is
  what let the review state the no-behaviour-change claim as evidence.
- **Refusing a compaction on the record's KIND, not its existence.** The scroll
  cluster's browser-quirk comments do have records behind them - in a
  `REVIEW.md` and a `RETRO.md`, which `AGENTS.md` `## Comments` does not accept.
  `treeScroll.ts` ships with 109 comment lines against 291 code lines and that
  is the policy's answer, not a miss.

## What went wrong

- **A number measured under one scope was reported under another** (review
  R1.2). `NOTES.md` said "15 narration discards in `treeBuilder.ts`", citing the
  child-1 inventory's prediction as confirmation. The 15 is right for the
  cluster; only 12 are in the `treeBuilder.ts` that remains, because 3 sit in
  code that moved to `hintRule.ts`. The inventory counted that file BEFORE the
  hint rules left it, so the two figures were never comparable - and the record
  presented the agreement between them as a cross-check.

  It seemed sound because the number genuinely was measured and genuinely did
  match a prior measurement. What was not re-derived is the only thing the split
  changed: which file the counted things ended up in. The record's own example
  list contained the disproof - it cited `// Recurse into child clades`, one of
  the three that moved.

- **`AGENTS.md`'s repository map was not updated for a new core module**
  (review R1.1). Sibling 20260731-212610 added `puzzleKey.ts` and `shareText.ts`
  to that row when it created them; this task created `src/hintRule.ts` at the
  same level and did not. The doc sweep ran and was aimed at STALE references -
  paths that had ceased to exist or moved - and found the two comment pointers
  it was looking for. A map that is merely incomplete does not answer a grep for
  anything, so nothing surfaced it.

## What to improve next time

- After a split, re-derive every per-FILE number against the post-split tree,
  even when the figure is already measured and already agrees with a prior
  measurement. Agreement with a pre-split baseline is evidence the count is
  right, never evidence the file attribution is.
- A doc sweep needs a second pass with the opposite polarity: not only "does any
  doc name something that moved or died", which greps well, but "does any doc
  ENUMERATE a category this task added a member to", which greps for nothing.
  Repository maps, module tables and index files are the shape at risk. Five
  siblings remain and every one of them creates or deletes a file.
- When compacting a comment towards a record, read the record. The whole-tree
  grep answers "does a record exist"; only reading it answers "does the record
  say what the comment claims it says". Both round-1 findings and the
  `focusRect` find are versions of the same gap: a check ran, and its result was
  taken to answer a question one step wider than the one it asked.

## Diagnosis

**Breadth.** 12 files, and it is inherent rather than a missed split. Two new
modules and two trimmed ones are the 4 substantive files; 6 are one-line import
edits that exist only because `DECISION.md` refuses a barrel re-export, on the
epic's own goal; 2 are one-line comment-path edits in files this task does not
own. No part of it was independently landable: the hint-rule move and the
scroll move share no code, but splitting them into two tasks would have meant
two passes over the same comment inventory and two branch syncs for a 12-file
diff.

**Churn.** Both round-1 findings are record/doc defects, neither touches shipped
behaviour, and both trace to the same plan-time gap: the plan specified WHICH
greps and rigs to run but not the SCOPE each result was licensed to speak for.
`plan`'s from-scratch challenge would not have caught either. The cold-reader
test in `plan/decision.md` would have caught R1.2 - a cold reader of "15
narration discards in `treeBuilder.ts`" alongside a table showing
`treeBuilder.ts` at 8 comments has no way to reconcile the two without knowing
that 3 of the 15 emigrated. R1.1 is not a cold-reader failure; it is the
doc-sweep polarity gap above, and it is the second time in this epic that a
sweep aimed at stale references missed something that was not stale
(20260731-212610 R1.1 was the mirror image - a path that died).

**Context.** No pressure observed. No compaction warning, no checkpoint, no
handoff, no delegation. The largest file read was 443 lines and the cluster fit
one pass. One process deviation worth recording: review round 1 ran in-session
rather than with an out-of-context reviewer, because the session carries a
standing instruction not to spawn agents unless asked. `REVIEW.md` records it as
an exception with the mitigation applied (every load-bearing claim re-derived
from the tree). It is a genuinely weaker round 1 than the skill intends, and
the two findings it did produce were both in the implementation's own record -
which is the class of defect a self-review is least likely to catch, so the
result should not be read as evidence that the exception was harmless.

## Action items

- None requiring a new task. The improvements above are folded into `LESSONS.md`
  and apply directly to the five remaining epic children.
- The `consistentCandidates` question inherited from
  `tasks/20260731-212610/DECISION.md` case 3 is CLOSED, on the merits, in this
  task's `DECISION.md` case 4. No sibling inherits it.
- `tasks/20260729-092339/DECISION.md` fork 2 records a choice the code reversed
  later in that same task. Not amended here: it is an accepted historical
  record, and this task's job was the comment that cited it, which now says what
  fork 2 actually settled. Flagged for the epic in case a later child wants the
  record annotated rather than the pointer corrected.
