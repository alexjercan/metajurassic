# Retro: Write the comment and file-size policy into AGENTS.md

- TASK: 20260731-212557
- BRANCH: docs/comment-policy
- REVIEW ROUNDS: 2

## What went well

**Measuring before ruling changed the rule.** The plan's order - inventory
first, policy second - was not decoration. Two of the four decisions in
`DECISION.md` exist only because the reading produced a surprise:

- Case 2 ("compact only towards an existing record") came from
  `src/gameData.ts:5`, a long rationale with no record behind it. A rule
  written from the epic's tables alone would have compacted it into a pointer
  to a document that does not exist.
- The epic's Fog asked whether `test/` and `e2e/` comment density is a problem
  or a feature. 237 keep against 14 discard in `e2e/` answered it, and the
  rules now say so in as many words, so the two heaviest sibling tasks do not
  arrive expecting to thin those files.

**The wrong measurement was caught by disagreeing with itself.** The first
extraction reported 115 comments in `src/`; the second reported 223. The
tie-break was outside evidence: the epic's own comment-line table, written
before this branch existed, gives `e2e/helpers.ts` 430, `src/treeBuilder.ts`
102 and `src/ui/treeVisualizer.ts` 101, and the second method reproduces all
three exactly. Corroborating against numbers nobody in this session produced
is what made the correction credible rather than self-serving.

**The gate stayed honest for a records-only branch.** `npm run ci` was run
three times, including a final run after the review fixes, and `tatr check`
after every record edit.

## What went wrong

**The TypeScript scanner is not a comment extractor** - root cause of the
count that had to be redone. The first script used `ts.createScanner`, which
resolves `/` without parser context and therefore read `/\.md$/` in
`src/markdownLoader.ts:29` as the start of a comment, swallowing the rest of
that file; separately it hid 14 of the 16 comments in
`src/ui/treeVisualizer.ts`. It looked sound at the time because the scanner is
the API that hands back comment trivia directly, and because the output was
plausible - a smaller number in a file nobody had called comment-heavy raises
no alarm. What exposed it was reading the dump, where a comment ended
mid-sentence in `/**` garbage.

**A seven-clause checklist was ticked with one bulk edit** (R1.1, MAJOR). The
Steps were ticked with a single `- [ ] ` -> `- [x] ` replace across the file.
Step 1 asked for two tables; the record had one. The bulk edit is what made
the miss invisible - there was no moment at which any individual step was
re-read against what had been written. The `work` skill's own rule ("tick a
Step only after re-reading and completing every clause") is exactly this, and
a global replace is the shape that skips it.

**One number in a measured table was written from impression** (R1.2, MINOR).
Every figure in `NOTES.md` came from the extraction rig except the
review-archaeology breakdown, "3 in `test/lintGate.test.ts`, 9 across `e2e/`",
which was recalled from the reading. Measured: 6 in `e2e/`, plus 3 more in
files the sentence did not mention. `DECISION.md` carried the correct total
(12) in the same commit, so the two records shipped disagreeing with each
other.

**`DECISION.md` was authored against a stale neighbour.** A neighbouring
record (`tasks/20260729-141424/DECISION.md`) was opened before writing, which
is the ledger's existing rule - but that file predates the tatr v2 schema
migration (053fe72), so copying its shape produced six `bad-record-schema`
errors. `tatr check` was not run until after the first commit. The reliable
source was `tatr scaffold` in a scratch repo, which prints the current
template; a committed neighbour cannot tell a current convention from a
grandfathered one.

## What to improve next time

- Extract source facts with a parser, not a scanner or a regex, and sanity
  check the extraction against a number produced outside the session before
  building on it.
- Tick steps one at a time, re-reading each clause. Never with a bulk edit
  over the checklist.
- When a record carries a table of measured numbers, every cell in it comes
  from the rig. A hand-counted figure sitting among measured ones inherits
  their authority without earning it.
- Run `tatr scaffold` for the canonical shape of a record kind rather than
  copying a committed sibling, and run `tatr check` before the first commit
  rather than after it.

## Action items

- Ledger: three new entries and one bump in `LESSONS.md` -
  `a-regex-over-source-is-not-a-parse`,
  `tick-a-step-against-its-clauses-not-in-one-bulk-edit`,
  `derive-every-number-in-a-table-from-the-same-rig`, and
  `open-a-neighbouring-record-before-writing-a-new-one` bumped to x3 and moved
  to Pending promotions.
- No follow-up task. The three findings were fixed on the branch, and the
  policy itself - the actual deliverable - drew no findings.

## Diagnosis

**Breadth.** Four files, one of them the deliverable. The diff is small and the
WORK was not: 837 comments read one at a time. That asymmetry is inherent to a
task whose output is a rule derived from evidence, and it did not want
splitting - a separate "inventory" task would have handed the policy task a
table with no reading behind it, which is the failure mode the DoD was built
to avoid.

**Churn.** Two of three findings are in `NOTES.md`; none in the shipped
`AGENTS.md` rule. The plan-time question that would have caught R1.1: Step 1
named two deliverables and the DoD proved only one. Every deliverable a step
names wants its own proof, or the unproved one is the one that goes missing -
the same shape as the ledger's
[[absence-proving-greps-must-be-run-when-written]] one level up, an unproved
clause rather than an unrun proof.

**Context.** No compaction warning and no handoff; the session stayed well
inside its window. The one measured pressure was output size: the `e2e/`
comment dump is 84KB and exceeded the read cap, so it took two reads. Worth
knowing for 20260731-212615 and -212616, which work on those same files and
will hit the same wall - dumping per file rather than per directory avoids it.
