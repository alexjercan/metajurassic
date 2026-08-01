# Retro: Split e2e/helpers.ts into focused helper modules

- TASK: 20260731-212615
- BRANCH: 20260731-212615
- REVIEW ROUNDS: 9

## What went well

The code was right early and stayed right. The split landed in one commit with
zero non-import, non-comment lines changed in any spec and the 875 non-comment
lines of `helpers.ts` present unchanged across the eight modules - both
machine-checked, both reproduced by the reviewer with its own method every round
after. Of 28 findings across nine rounds, 3 touched code.

Validating the counting rig BOTH ways before using it caught a rig that would
otherwise have poisoned every number in the record. The first build walked with
`forEachChild`, which visits named children but skips punctuation and keyword
tokens, so comments attached to those vanished: the first sibling validation set
came back 889 / 1 / 1 against a known 889 / 10 / 18. The LINE count was already
exact, so `wc -l` agreed with a comment counter that was finding one comment in
ten. Only the known-answer check found it.

The plan's size exception was decided up front rather than discovered.
`modal.ts` was projected at ~445 lines before any code moved, and the reason for
keeping it whole - the three passes are an ordered whole whose ordering
rationale lives in one comment - did not change once the file existed.

## What went wrong

**Claims written at the altitude of what was convenient rather than what was
measured.** This is one defect with six instances, and it is the whole story of
rounds 1-5. R1.6 recorded a proof command containing a literal placeholder and
`git diff --cached`, which prints nothing on a committed branch - evidence that
would have passed for any diff. R2.2 asserted "all 37 task references are record
pointers, constraint first" over a set where 23 are bare IDs and 12 are
ID-first. R3.1 stated a grep result instead of running it, in the cell that
existed *because* R2.4 had faulted the same column. R5.1 said the round-4 fix
moved no other figure without re-running the classifier; two had moved. And a
`SPIKE.md` negative claim named four spike IDs that do not exist - caught while
verifying, before commit, but written in the first place.

Each was individually small and every one was true-in-substance. That is exactly
why they kept happening: the conclusion was right, so the evidence felt like
paperwork.

**One real code defect, found only in round 4.** `touchScrollArena`'s first
paragraph reproduced `tasks/20260729-092339/DECISION.md` `## Fork 3` nearly
clause for clause - a compaction the pass owed under the "rationale reproducing
a `DECISION.md`" rule and missed. The comment cites TWO task IDs; the first,
`20260331-154614`, has no compaction-target record, and clearing the comment on
that basis meant the second was never opened.

**A remedy that reproduced its own disease.** The counts block introduced in
round 6 to end the arithmetic drift shipped with a nesting bug (R7.1) that made
it assert "4 of the 10 changed comments are byte-identical" - self-contradictory,
and contradicted by its own arithmetic line. A single source of truth is only
worth having if it is true.

## What to improve next time

The plan named the rig, the greps and the mutation, and every one of those
executed cleanly. What it did not name was the standard for the RECORD, and the
record is where 25 of 28 findings landed. A plan for a task whose deliverable is
largely a written argument should say how claims in it will be checked - that
every figure quoted in prose is regenerated from the rig at write time, that
every grep shown was run in the shell it is shown in, and that a universal over
a set is verified per member.

Two concrete habits, both cheap:

- Paste command output rather than describing it. Every one of R1.6, R3.1 and
  R5.1 would have been impossible if the record carried the shell output instead
  of a sentence about it.
- After any edit that changes a measured quantity, re-run the measurement rather
  than reasoning about the blast radius. Rounds 5 and 6 exist because the
  round-4 fix reasoned.

On breadth: the diff is large (1409 lines moved, 11 specs touched) but not
splittable - the import churn IS the deliverable, and a barrel to avoid it would
have preserved the property the task exists to remove. The plan called this
correctly.

On churn: nine rounds is far more than the work warranted, and the plan-time
question that would have prevented most of it is `plan/decision.md`'s cold-reader
test applied to the RECORD rather than to the code - would a reader who cannot
run anything be able to check this sentence? For a task whose Definition of Done
is four proof-bearing claims, that question belonged in the plan.

No context pressure was observed or recorded at any point.

## Action items

- Ledger entries below; no follow-up task. The `mobile.spec.ts:189` "task X
  owns ..." comment noted in `NOTES.md` is flagged in place, not deferred to a
  task, because it is one comment in a spec this task only re-imported.
