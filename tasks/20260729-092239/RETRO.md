# Retro: Restore flow conformance records

- TASK: 20260729-092239
- DATE: 20260729
- OUTCOME: shipped. `tatr check --ledger LESSONS.md` exits 0; the repo now has a
  root LESSONS.md ledger and the once-CLOSED graph-scaling task
  `20260331-154614` has honest backfilled REVIEW.md and RETRO.md. One review
  round, out-of-context, APPROVE.

## What this was

A process-repair task, not a product change. Metajurassic's flow/tatr trail was
red: no `LESSONS.md`, and the first tracked task (`20260331-154614`) had been set
CLOSED with no REVIEW.md or RETRO.md. The fix backfills those records honestly
and seeds the ledger, so future sessions can resume/review/compound/land from
durable files instead of chat memory.

## What went well

- **Reconstruction stayed honest and was verified.** The backfilled REVIEW/RETRO
  label themselves BACKFILL, dated to now, and claim no flow gate that never
  happened. The out-of-context reviewer independently checked every claim about
  commit d684369 line-by-line against `git show` and confirmed the code
  descriptions were accurate, not hand-waved.
- **The ledger was seeded with real, sourced lessons**, not filler: the
  format/parse-seam off-by-one (101747) and the mock-fixtures-hide-real-defects
  finding (092352), each traced to its source task so the summary is checkable.
- **History was preserved append-only.** The historical TASK.md gained only a
  dated "## History" note; the original body is untouched, matching the flow
  rule that the tasks/ trail is verbatim history.

## What went wrong / difficulties

- **`tatr edit --status` rewrote the task file and normalized the TAGS spacing**
  (`process,flow,docs` -> `process, flow, docs`), an incidental cosmetic change
  the reviewer flagged as out of scope (NIT, no action). Worth knowing that
  `tatr edit` is not a surgical field poke; it re-serializes the whole record, so
  it can introduce formatting drift on lines you did not mean to touch.
- **The planning Flow State edit was first made in the main checkout**, which the
  `edit-from-the-worktree-path-not-the-planning-read` lesson warns lands off the
  branch (the worktree cuts from committed HEAD). Caught it early, discarded the
  main-checkout edit, sprouted, and re-applied inside the worktree. The lesson
  from the sibling scufris repo paid off directly here.

## What to do differently next time

- Treat `tatr edit` as a whole-file rewrite: do status changes before hand-tuning
  formatting, or accept that it may re-normalize adjacent fields.
- For any flow work, make the very first TASK.md marker edit inside the worktree
  (or commit it before sprouting), never in the main checkout.

## Lessons (folded into LESSONS.md)

- `close-a-task-with-its-review-and-retro-not-just-the-status` - the root cause
  this task repaired: a CLOSED status is not a finished task.
- `backfilled-records-must-say-so` - reconstructed records are labelled and dated
  honestly, never faking a gate.

(Both were written into LESSONS.md as part of this task's own deliverable, since
the ledger did not exist before; they are the ledger's seed process entries.)

## Follow-ups

- None new. The graph-scaling hardening follow-ups (resize/orientation recompute,
  regression coverage) are already tracked in `20260729-092339`.
