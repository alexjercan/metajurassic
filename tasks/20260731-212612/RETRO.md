# Retro: KISS pass: profile page and stats maths

- TASK: 20260731-212612
- BRANCH: refactor/kiss-profile-stats
- REVIEW ROUNDS: 2

## What went well

The mechanical verification carried the whole source change. Both splits went
in as pure moves, and every one of the four findings across two rounds landed in
the records, never in the code: the rig reproduced the After table exactly, the
independently recomputed strip-sort-diff removed no statement, all Done Means
greps came back as specified, and `npm run ci` / `npm run build` were green on
the first review pass and never re-run because no source moved again.

The three method warnings inherited from siblings 2 and 3 each paid. The
unfiltered importer grep confirmed `src/game/shareButton.ts` needed no edit by
reading the hit rather than trusting the pattern. The both-polarities doc sweep
answered the `AGENTS.md:21` enumeration with an explicit negative rather than
silently, which is the exact gap that produced 20260731-212611's R1.1.
Predicting which number would move - the largest file, 538 -> 245 - before
starting meant the split raising the cluster total by 6 was the expected shape
rather than a surprise to explain afterwards.

Round 2 used an out-of-context reviewer, and it earned its keep immediately: it
found that the round-1 fix had been applied to the two comments the finding
cited rather than to the method the finding faulted. A self-review of one's own
correction would not have caught that, and the exception recorded in round 1
says so.

## What went wrong

**The whole-record-tree grep was run with terms drawn from the comments' WORDS,
not their SUBJECTS.** Eight terms - `daily stats only`, `collection`, `tooltip`,
`weighted`, `windowSize`, `window size`, `Monday`, `bucket` - came back empty,
and that emptiness was written up as a universal negative over all eight keeps.
Not one of those terms can reach a `gameStats.ts` keep, whose subjects are
streak arithmetic; `tasks/20260729-122943/DECISION.md:46` had recorded the exact
spring-forward defect the kept calendar-days block defends, and a `DECISION.md`
is a KIND the comment policy accepts as a compaction target. The decision it
seemed sound to make: the terms were harvested from the comment text on the
theory that a record about the same thing would use the same vocabulary. It does
not - a record names the DEFECT, a comment names the GUARD, and they share
almost no words.

**The correction to that finding repeated the finding's own error.** R1.1 named
two `gameStats.ts` keeps, so the fix re-ran the subject-term pass for those two
and left the other six resting on the discredited first pass. That is what R2.1
and R2.2 caught. A finding that faults a METHOD is not discharged by fixing the
instances it happens to cite; the method has to be re-run across every subject
it covers. Re-run properly, the other six are genuinely unbacked and all eight
keeps stand, so the source was never at risk - but the record asserted a
coverage it had not tested, twice.

**A table's row count was used as a comment count.** `NOTES.md` and `TASK.md`
each said "nine keeps" while the rig-derived figure sat correctly four lines
away in the same file: 47 discarded, 2 compacted, 8 kept in full, 10 surviving.
Nine is the number of ROWS in the table, one of which is a compaction and one of
which covers two comments. The same number appearing twice in the same record
in two different values is the cheapest possible cross-check and it was not run.

## What to improve next time

- Pick grep terms from what a comment is ABOUT, then grep again from what it
  SAYS. The first finds records; the second finds nothing, which is why the
  first pass here read as a clean negative.
- Treat a review finding that faults a method as scoped to the method, not to
  its examples. Re-run it across every subject and record the re-run's terms and
  result, so the next reader can reproduce the negative rather than trust it.
- Before committing a record, grep it for every figure that appears more than
  once and diff the occurrences against each other. Four findings across two
  children have now been record prose; two of them were a number disagreeing
  with itself inside one file.
- Keep the out-of-context reviewer for rounds that verify a FIX. The class of
  defect this epic keeps producing - a record claiming more than it measured -
  is precisely the class the author of the claim cannot see.

## Action items

- Ledger: bumped
  `search-the-whole-record-tree-before-declaring-a-rationale-unrecorded` to x2
  with the subject-versus-wording refinement, `a-correction-is-a-new-claim-
  re-derive-it` to x2 with the fix-the-method-not-the-instances case, and
  `derive-every-number-in-a-table-from-the-same-rig` to x3, which moves it to
  Pending promotions for the user's decision.
- No follow-up task. Both findings were record defects; no source change
  followed from either, and no bug was found while reading.
- For the epic retro: four of four findings across this child and
  20260731-212611 were record defects while every mechanical source check came
  out clean on the first pass. The verification effort is well spent on the code
  and under-spent on the prose that reports it.
