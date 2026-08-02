# Retro: Replace the share-failure alert with inline feedback

- TASK: 20260730-165921
- BRANCH: fix/inline-share-failure
- REVIEW ROUNDS: 1

## What went well

Test-first held. The plan named the pinning test that already asserted the old
`alert()` behaviour, so the rewrite had a red state to reach before `src/`
moved, and the reviewer could reproduce it by restoring `src/` to `master` and
leaving `e2e/` on the branch. Round 1 APPROVEd with no BLOCKER or MAJOR.

Breadth: three source files plus a test, one behaviour. No split was missed.

## What went wrong

The plan told the worker to look `#modal-error` up in `src/game/shareButton.ts`,
which was wrong: `src/ui/modal.ts` already owns every modal element and
`showModal()` had to clear the line anyway, so following the Step literally
would have split ownership of one node across two modules. The Step read sound
at plan time because `src/game/index.ts` does exactly that for `#input-error` -
the pattern was copied from the neighbour without checking that the neighbour's
element has no `src/ui/` owner and this one does. Corrected during work and
recorded in DECISION.md rather than followed.

Churn: none. The correction landed before review, so it cost no round.

## What to improve next time

Before a Step names the module that will `getElementById` a node, check whether
a `src/ui/` module already holds that node's siblings. The DOM-ownership
question is a one-grep check at plan time and a mid-implementation departure
otherwise.

Review left two non-blocking findings. R1.2 (NIT, a close-out grep count of six
where the real number is eight) was corrected and ticked during compounding,
because a wrong number in a record that becomes history is worse than the edit.
R1.1 (MINOR, a CSS comment that reproduces DECISION.md rationale instead of
pointing at it) ships open: it is a comment, and the next touch of `modal.css`
can carry it.

Context: no pressure observed. No compaction, no checkpoint, no delegation; the
review ran in a fresh session that started at REVIEWING, which supplied the
out-of-context reviewer for free.

## Action items

- R1.1 stays open and needs no task; fold the comment compaction into the next
  edit of `src/partials/modal.css`.
- Central knowledge: added
  `planning/a-copied-pattern-carries-its-preconditions` (new), `knowledge check`
  clean. R1.2's lesson - a count in a record must come from the output, not from
  reasoning about what changed - stays here: the nearest central slug,
  `verification/existence-is-not-cardinality`, is about event multiplicity in a
  design and would have needed its body rewritten to take the occurrence.
