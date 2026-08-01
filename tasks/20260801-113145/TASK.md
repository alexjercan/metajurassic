# Require plan-time output inline for every DoD cmd: proof

- STATUS: OPEN
- PRIORITY: 32
- TAGS: process
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a reviewer reading a Definition of Done, I want every `cmd:` proof to carry
the output it returned when it was written, so that a proof which can never come
back clean is visibly incomplete rather than merely optimistic.

## Problem

Promoted from `LESSONS.md` `absence-proving-greps-must-be-run-when-written`
(x3): 20260729-101823, 20260729-092327, 20260729-130138. Three DoDs shipped an
absence proof that could not go clean. The third time, one of TWO such greps in
the same DoD was narrowed while its sibling four lines away was not - so the
check has to be per-DoD, not per-item. The plan skill's prose already says "run
it when you write it".

## Steps

- [ ] Change the `plan` skill so a DoD `cmd:` proof records its plan-time output
      inline: the count it returned and why that count is the expected one.
- [ ] Make the requirement per-DoD, so a DoD with two proofs cannot have one
      answered and one not.
- [ ] Decide whether `tatr check` can see the omission, or whether it stays a
      review-time read; record the reason.
