# Review: Spike - make the hint split the remaining candidates

- DATE: 20260729
- ROUND: 1
- VERDICT: APPROVE (after M1 and M2 were addressed in-round)
- REVIEWER: in-context (see Caveat)

## Caveat

This is an IN-CONTEXT review by the session that produced the spike, not the
out-of-context round-1 review `/flow` normally requires (this session is
configured not to spawn subagents). It is recorded honestly as such: a
self-review catches arithmetic and unstated assumptions, but it cannot catch
what the author did not think to question. The deliverable is a research doc
whose numbers are reproducible with one command, which limits the damage - a
later session can re-run `npm run playtest:hint` and check every figure quoted
in SPIKE.md.

## What was reviewed

- `scripts/playtest/hint.ts` - the measurement rig
- `tasks/20260729-160500/SPIKE.md` - the research doc and its recommendation
- `tasks/20260729-141424/TASK.md` - the rewritten implementing task
- `AGENTS.md`, `package.json` - the surfaces that make the rig discoverable

## Findings

### M1 (MAJOR, addressed) - the split rule's fallback branch was unmeasured

`splitThreshold` returns the deepest unrevealed clade when NOTHING meets the
threshold. That branch is exactly the bottom-up policy the spike rejects as a
solve button, so the recommendation contained an unexamined path back to the
thing it argues against. The doc did not mention it at all.

Addressed, and the measurement corrected the reviewer as well as the author.
The rig now reports both how often the branch fires (18.6% of calls, with a
tail where the whole 150-species field is still live) and what it hands over
(a clade holding a minimum of 25% and a median of 67% of the live field). So
the branch is safe by CONSTRUCTION, not by luck: it is only reached when
nothing met the threshold, including the deepest clade, so whatever it returns
necessarily holds more than the threshold share. It is the weak path, not a
solve button.

That is the opposite of the concern that prompted the finding - and it is still
a finding, because "one hint in five under-delivers" is a real property of the
recommendation that the doc claimed nothing about. Both the rate and the reason
are now in SPIKE.md, and the implementing task must choose deliberately between
handing the fallback over and refusing the sale.

### M2 (MAJOR, addressed) - the trial count was not stated and not stress-tested

Every table was produced at 5 trials per target (750 rounds per cell) with no
statement of how much of a cell is noise. The recommendation turns on gaps of
about 1.0-1.5 guesses, which comfortably clears sampling noise at that n, but
the doc asserted tenths (`-1.2` vs `-1.0`) as if they were solid.

Addressed: trials are now a `PLAYTEST_TRIALS` env knob, the header prints the
value used, and the headline table was re-run at 20 trials per target (3000
rounds per cell) to confirm the recommendation does not move.

### m3 (MINOR, accepted as-is) - `bitsPerGuess` credits a winning guess with the whole remaining set

A guess that wins is counted as `log2(candidates before)` bits. That is
defensible (it did resolve the set) but it nudges the mean bits-per-guess
upward, which RAISES the bar a hint must clear. The bias therefore runs against
the spike's own conclusion, so the recommendation is conservative rather than
flattered. Left as is, and now stated in the doc.

### m4 (MINOR, accepted as-is) - this rig's `read-tree` player is not identical to `difficulty.ts`'s

`difficulty.ts` narrows on the last observed LCA; this rig narrows on the
smallest clade currently revealed, which also accounts for hints. The baselines
therefore differ (8.9 here) and the two scripts' absolute means are not
comparable. Every row in a table shares one baseline, so the comparisons within
this doc hold. Stated in SPIKE.md rather than papered over; a future task that
wants one player model across both scripts should unify them deliberately.

### m5 (MINOR, addressed) - the doc originally under-served the user's own framing

The user asked for "split in better halves". The first draft went straight to
the winning rule and could have read as ignoring the ask. The doc now measures
the literal halving rule explicitly, reports that it is the WEAKEST of the split
family (~1 bit by construction), and explains why - so the reasoning behind
rejecting the starting hypothesis is on the record instead of assumed.

## What was checked and found sound

- The rig checks its reproduction of `findNextHintCladeId` against the shipped
  function every run (548/548 agree), so the "shipped policy" row is not a stale
  hand-copy. This directly honours `LESSONS.md`
  `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`.
- Game logic is imported from `src/`, never re-implemented; only the policies
  and the PRNG are new.
- The candidate set the recommended rule needs is derivable from the guess
  history, so the recommendation does not require new persisted state or leak
  anything the hint was not about to reveal. Checked against `GameState`.
- The rig deliberately does not call `state.useHint()` (it hardcodes
  `HINT_COST`), and says so at the call site - otherwise every cost=1 and cost=2
  row would have been silently wrong.
- `npm run ci` passes; lint and format are clean on the new file.
- The spike seeds no duplicate task: it rewrites `20260729-141424`, which
  already owned the problem.
- The open fork (this task's old DoD demands the hint pay off for a deducing
  player, which only cost 1 achieves) is surfaced for the user rather than
  silently resolved, per the flow guideline on load-bearing build-shape forks.

## Verdict

APPROVE. M1 and M2 were fixed in-round and re-verified; m3-m5 are recorded
limitations stated in the doc rather than hidden. The spike answers the question
it set out to answer, names the alternatives it rejected and why, and leaves the
one genuinely user-owned decision to the user.
