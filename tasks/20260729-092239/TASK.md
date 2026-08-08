# Restore flow conformance records

- STATUS: CLOSED
- PRIORITY: 100
- TAGS: process, flow, docs

## Story

As a maintainer, I want Metajurassic's task trail to satisfy the flow/tatr lifecycle rules, so that future sessions can resume, review, compound, and land work from durable records instead of chat memory.

## Review Findings

- `tatr check --ledger LESSONS.md` is currently red.
- `tasks/20260331-154614/TASK.md` is `CLOSED`, but the folder has no `REVIEW.md` and no `RETRO.md`.
- The repo has no `LESSONS.md`, so the ledger check reports `ledger: unreadable: 'LESSONS.md'`.
- Compared to `~/personal/scufris`, this repo has a much thinner flow trail. Scufris tasks usually keep implementation notes, verification evidence, review verdicts, and retros next to each task.

## Steps

- [x] Create the repository lessons ledger in the expected location and seed it with the project-level guidance needed for future Metajurassic work.
- [x] Backfill a review artifact for `tasks/20260331-154614` that honestly records what can be verified now and what was missing from the original closeout.
- [x] Backfill a retro artifact for `tasks/20260331-154614` that records the process miss and what to do differently next time.
- [x] Decide whether any historical task text needs non-destructive append-only notes, without rewriting history to pretend the original flow happened.
- [x] Run the tatr conformance check and fix remaining process findings.

## Definition of Done

- `tatr check --ledger LESSONS.md` exits 0. (cmd: `tatr check --ledger LESSONS.md`)
- `tasks/20260331-154614/REVIEW.md` has a machine-readable `- VERDICT: APPROVE` or `- VERDICT: REQUEST_CHANGES` line. (cmd: `rg -n "^- VERDICT: (APPROVE|REQUEST_CHANGES)$" tasks/20260331-154614/REVIEW.md`)
- `tasks/20260331-154614/RETRO.md` exists and records what changed, what went wrong, and what to improve next time. (cmd: `test -s tasks/20260331-154614/RETRO.md`)
- Future flow work has an explicit place to record lessons. (cmd: `test -s LESSONS.md`)

## Notes

- This is a process repair task, not a product rewrite.
- Keep the record honest: do not add fake `PLAN STATUS: APPROVED` markers for work that did not actually pass a flow gate.
- Pairs with `20260729-101744` (AGENTS.md): backfill and orientation can land together, but keep the records separate.
- Candidate seed lessons for the new ledger, from the 2026-07-29 out-of-context review: unit tests that never cross a format/parse seam can encode bugs (see `20260729-101747`), and mock-only fixtures hid that 150/150 real `icon` fields were malformed (see `20260729-092352`).
