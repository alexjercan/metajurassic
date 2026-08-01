# Refuse a CLOSED transition without an APPROVE review

- STATUS: OPEN
- PRIORITY: 40
- TAGS: process,tooling
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a maintainer closing a task, I want `tatr` to refuse CLOSED until the review
says APPROVE, so that the mistake `tatr check` keeps catching after the fact
becomes impossible instead of merely detectable.

## Problem

Promoted from `LESSONS.md`
`close-a-task-with-its-review-and-retro-not-just-the-status` (x3):
20260729-092239, 20260729-092339, 20260729-141427. Three sessions flipped
STATUS to CLOSED before the REVIEW/RETRO artifacts existed. Prose has not held
it; the ledger's proposal is a CLI guard.

## Steps

- [ ] Refuse the transition to CLOSED unless `REVIEW.md` exists and its LATEST
      round carries `- VERDICT: APPROVE`.
- [ ] Add `--force` for the deliberate exception, and say in the refusal message
      what is missing and that `--force` exists.
- [ ] Decide whether RETRO.md is part of the guard or stays a `tatr check`
      finding, and record the reason.
