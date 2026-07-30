# Retro - 20260729-092504

Two review rounds, one MAJOR finding, and one assertion deleted rather than
fixed. A test-only task, so the whole value was discrimination - and the
interesting result is that the branch's own mutation discipline still missed the
one assertion that could not fail.

## What changed and why

`e2e/postgame.spec.ts` (new) pins the daily post-game journey; `e2e/share.spec.ts`
gains a loss share and a rejecting clipboard write; `e2e/helpers.ts` gains
`wrongGuessIds`. `src/game.ts`'s `initGame` had no test at any level, so post-game
input disabling and the hint chip's swap to a Practice link were uncovered.
No production code changed - the one UX defect found (`alert()` on a failed
share) is filed as `20260730-165921` rather than fixed here, which is what the
user chose at the plan gate.

The journey maps and every mutation are in `NOTES.md`. The task's own Review
Findings turned out partly stale (three later tasks had landed coverage they
call missing), so the plan opened with a coverage audit rather than taking them
at face value - that audit is what made the real gaps visible.

## What went well

- **The plan gate earned its keep.** Auditing before planning turned "add
  browser tests for win/loss modals" (already covered) into five genuinely
  uncovered legs. Reading `TASK.md` as context rather than authority is exactly
  what the flow skill asks for, and here it changed the whole scope.
- **Mutating before believing.** Nine mutations were run before the first review,
  each with its verbatim string recorded. The mutate script asserted
  single-occurrence and caught a two-match string (M3) that would have silently
  patched the wrong call site.
- **The out-of-context review found what the author could not.** Round 1's MAJOR
  was invisible from inside the session: the assertion sat next to two that DID
  fail under mutation, so the group read as verified.

## What went wrong

- **Nine mutations and I still shipped an unfalsifiable assertion.** The gap was
  systematic, not careless: I mutated to falsify assertions I had thought about,
  and the autocomplete line was one I had written on autopilot as part of a
  three-assertion group. The lesson is that a mutation pass must be driven from
  the ASSERTION list, not from the author's sense of what is interesting -
  one mutation per assertion, enumerated, or the ones nobody wondered about are
  exactly the ones left unproven.
- **The first fix for that finding was also wrong, and only a mutation showed
  it.** Playing the 25th guess in-page with the list open looked like "reaching
  the branch", and it passed under the same mutation. `selectAndSubmit` hides the
  box before the game hears about the guess. Had I not re-run the reviewer's
  mutation against my own fix, I would have reported a fix that fixed nothing -
  a false verification about a finding whose whole subject was false
  verification.
- **Stale figures were committed into the task record.** `125 passed` and "eight
  mutations" stayed in TASK.md after round 2 changed the specs; the reviewer
  caught it. The ledger already has this entry
  (`a-verification-result-expires-when-the-code-it-ran-against-changes`) and I
  had even cited a sibling lesson in the same file. Reading a lesson is not
  applying it.
- **The plan was written in the main checkout before the sprout was cut**, so it
  never reached the branch and the worktree's `TASK.md` silently had no Flow
  State section. My "set FLOW STEP: WORKING" edit matched nothing and I did not
  read the result. Caught only when a later read showed a 38-line file.

## Lessons to record

- `enumerate-assertions-not-hunches-when-mutating`: a mutation pass driven by
  what the author finds interesting leaves the autopilot assertions unproven.
  List every assertion the change adds and pair each with a mutation, or say
  which ones are unpinned and why.
- `re-run-the-reviewers-mutation-against-your-own-fix`: a fix for "this test
  cannot fail" is itself a claim that can be false. The only proof is the
  original mutation against the new test - which here revealed the assertion was
  unfalsifiable in principle, not merely untested.
- `an-edit-you-believe-you-made-is-a-hypothesis`: existing ledger entry, new
  variant - a string replace that matches NOTHING is a silent no-op. The
  planning edits went to the main checkout and the branch never had them.

## What to do differently next time

1. Sprout FIRST, then write the plan inside the worktree - or diff the worktree's
   copy of the task against the main checkout's immediately after sprouting.
2. Before asking for review on a test-only change, write out the assertion list
   and mark each one with the mutation that reddens it. Any assertion without one
   is either unpinned (say so) or unfalsifiable (delete it and explain).
3. Re-derive recorded figures from the tree being committed, not from the last
   run. A number in a task record should be pasted from a command run against
   HEAD.
