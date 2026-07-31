# Retro: KISS pass: practice session, storage, and content loaders

- TASK: 20260731-212613
- BRANCH: refactor/kiss-practice-storage-loaders
- REVIEW ROUNDS: 2

## What went well

- **The rig was validated in BOTH directions before use.** Against
  `20260731-212612`'s landed 889/10/18 AND against this task's own baseline
  629/28/156. Every number in every record then came from it, and review round
  2 re-derived all of them independently with zero discrepancies. The method
  the epic learned across children 1-4 now costs about two minutes and removes
  a whole finding class.
- **The no-split answer got stronger by being written down.** The plan gave one
  reason (single caller). Writing `DECISION.md` against the actual file found a
  second and better one: `parseSaved` is called on both sides of the proposed
  seam, so the cut would have had to export it purely to cross the new
  boundary. That argument did not exist before the record was written.
- **Reading the loader family as a GROUP paid off in a different file.** The
  dead `markdownLoader.ts` is invisible file by file - it type-checks, it
  lints, it looks like production code. It is only visible as an absence across
  the group, and it turned out to be the reason a comment two modules away was
  asserting a false path.
- **Round 1 to an out-of-context reviewer.** All five findings were record
  defects. R1.1 in particular was a false claim wearing the costume of a
  verified one - a table row with a named grep and a KIND column - which a
  self-review would not have caught, because the author already believed it.

## What went wrong

**R1.1: `NOTES.md` claimed "no record holds `isResumable`'s rationale". It
does.** `20260729-101754/REVIEW.md:123-128` holds it almost verbatim.

The failed decision, and why it seemed sound at the time: the Steps said to
grep `tasks/` with terms from the comment's SUBJECT. The subject here is "a
saved entry with no `targetId`", so the grep run was `targetId`. That grep DOES
hit the record - it returned nine files, the read stopped at the DECISION.md
files, and `REVIEW.md` was scanned as review chatter rather than as content.
The Steps also named `isResumable` explicitly as one of three comments to check
separately, and the literal `grep -rn isResumable tasks/` returns exactly one
hit. It was never run, because the SUBJECT rule was read as forbidding the
wording grep rather than as requiring the subject grep in addition.

Two root causes, both general:

1. **A negative record claim was written from a positive search that came back
   noisy.** "Nothing holds this" is a much stronger statement than "I did not
   find it", and nothing in the pass distinguished them.
2. **The search was scoped to `DECISION.md` in practice** even though `tasks/`
   was grepped whole, because that is where the other eleven comments' answers
   were. The rationale here lived in the same task's `REVIEW.md`.

The code outcome was right anyway - the comment is kept verbatim either way,
since `## Comments` names DECISION/SPIKE/NOTES as compaction targets and a
REVIEW NIT is not one. But the record said the right thing for the wrong
reason, and the whole Close-out Reflection was built on the false negative.

**R1.2-R1.5 were four smaller record slips of the same family:** a
"compacted towards section 4" row whose comment carried no pointer; "about 60
lines" copied from the plan inside a paragraph claiming the figure was measured
from the file (it is 80); a pointer claiming section 4 covers rules 1 AND 3
when it covers 1; and `game/index.ts` described as a webpack entry when it is
reached from two entries. Each is small; together they say the records were
written faster than they were checked.

## What to improve next time

- Before writing "no record holds this", run a SECOND grep on the literal
  SYMBOL NAME, and search the whole record folder rather than stopping at
  `DECISION.md`. A negative claim needs its own evidence, not the absence of a
  positive one.
- Every figure quoted inside a sentence that claims it was measured must
  actually be re-measured in that pass. "About 60 lines" was inherited from the
  plan and sat inside a paragraph whose first line was "Confirmed against the
  file rather than inherited from the plan".
- When a `NOTES.md` row says a comment was "compacted towards X", grep the
  post-pass file for X before committing. Row 149 claimed a pointer the code
  did not have; that is mechanically checkable.

## Diagnose

**Breadth.** The diff is small (three files, comments only, -14 lines) and
matches the plan exactly. Six files were in scope, three were correctly left
untouched. No split was missed: `20260730-120401` already owns the one piece of
real work found (the dead loader), and it was left there rather than absorbed.

**Churn.** Both rounds were record-only. The plan-time question that would have
prevented R1.1 is the cold-reader rationale test in `plan/decision.md`: a cold
reader of the "Records checked" table cannot tell a searched-and-absent row
from a searched-badly row, because the table has no column for HOW hard the
search was. The plan even predicted this exact trap by name ("Do NOT assume the
DECISION.md covers a block because it covers its neighbour... `isResumable`'s
shape-check must be checked against the record separately") - the prediction
was right and the execution still missed, which argues the check belongs in a
tool or a template rather than in prose the worker must remember.

**Context.** No pressure observed. No compaction warning, no handoff, no
checkpoint. The one delegation was the round-1 review, which was deliberate
(epic instruction) rather than context-driven, and it was resumed rather than
re-spawned for round 2, so it verified its own findings with its round-1
context intact.

## Action items

- None new. The ledger carries the follow-up.
  `search-the-whole-record-tree-before-declaring-a-rationale-unrecorded` reached
  its third occurrence here and moved to Pending promotions with a tooling
  proposal; `inherited-figures-do-not-satisfy-a-sentence-that-says-measured` is
  new at x1. The promotion gate is `lessons`', not this retro's.
