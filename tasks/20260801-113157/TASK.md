# Flag a record whose prose figure disagrees with its own table

- STATUS: OPEN
- PRIORITY: 30
- TAGS: process,tooling
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As an author of a record that carries measured figures, I want `tatr check` to
notice when the same quantity appears with two different numbers in one file, so
that a stale prose figure sitting four lines from the correct table is caught
before review.

## Problem

Promoted from `LESSONS.md` `derive-every-number-in-a-table-from-the-same-rig`
(x3): 20260731-212557, 20260731-212611, 20260731-212612. All three hits are the
same shape - a measured table and a disagreeing figure in the prose beside it,
hand-counted, measured under a pre-split scope, and read off the table's ROW
COUNT. Each time the correct number was already in the same file. Prose telling
the author to use the rig cannot catch it, because the author believes they did.

Related, and DEFERRED at the user's decision:
`a-correction-is-a-new-claim-re-derive-it` (x4) points at the same mechanism but
its fourth hit (20260731-212616) was PROSE, not a figure - a rewritten comment
that contradicted a flag documented ten lines below. This task covers the figure
half only; do not claim it closes that lesson.

## Steps

- [ ] Have `tatr check` flag a record where one quantity word ("N keeps",
      "N comments", "N discarded") appears with two different numbers.
- [ ] Decide the false-positive policy - a legitimate before/after pair is two
      numbers for one word - and record it. A check that cries wolf is worse
      than the duplication it replaces.
- [ ] Prove it against the three recorded hits: it must fire on each.
