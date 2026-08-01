# Retro: KISS pass: Jest suites and playtest rigs

- TASK: 20260731-212616
- BRANCH: refactor/kiss-jest-playtest
- REVIEW ROUNDS: 2

## What went well

Capturing the sorted test-name list on the base commit as Step 1, before any
edit, turned every later move into a seconds-long check. It also let the
out-of-context reviewer reproduce the whole central claim independently - it
built its own `master` worktree, got the same 323 names and the same md5, and
cleared move fidelity mechanically by line-multiset comparison rather than by
reading the diff. A move-only refactor whose proof is a checksum is cheap for
both sides.

Both splits landed on real seams. `treeBuilder.test.ts` had a `// ====` banner
that the repository's own file-size policy calls a boundary that has not
happened yet, and `gameStats.test.ts` changed which `src/` module it was
testing halfway down. Neither split needed an argument about line counts.

## What went wrong

**A comment rewritten to be honest introduced a fresh dishonesty (R1.1,
MAJOR).** The new `hint.ts` header asserts "Cross-checks on every run", and ten
lines below it documents `PLAYTEST_ONLY=rescue` - a flag that returns from
`main()` before `sanityCheck` ever runs. Both sentences were written in the same
edit, from the same reading of the same function.

Why it seemed sound: the old header's fault was archaeology, so attention went
to what to DELETE. The replacement prose was treated as a summary of code
already understood rather than as a new claim needing its own derivation. The
`PLAYTEST_ONLY` branch had been read minutes earlier - it is why the flag got
documented at all - and still did not get checked against the sentence three
lines up. Running the rig both ways, which is what caught it in review, costs
about a minute.

**Line counts in the record went stale the moment the review fixes landed.**
NOTES.md carried `treeFixtures.ts` 116, `hint.ts` 834 and a 7709 total; the
round-1 fixes changed all three, and each had to be hunted down and corrected
by hand. Same shape as the census problem in 20260731-212615, one task earlier:
the figures were transcribed into prose in several places instead of measured
once in a block with its command.

**A flow-state edit landed in the wrong tree.** `tatr flow` was run from the
main checkout while the branch's TASK.md lived in the sprout worktree, so the
two copies drifted (main went PLANNED -> WORKING against a stale file). Caught
and reverted before it reached a commit. The rule is simply that once a sprout
exists, every `tatr` call belongs inside it.

## What to improve next time

- Treat a rewritten comment as a claim under test: name the code path it
  describes and exercise it. Here that was one `PLAYTEST_ONLY=rescue` run.
- When a record's numbers describe the working tree, re-measure them AFTER the
  last edit, not when the section is written.
- After `sprout new`, run every `tatr` command from the worktree.

## Action items

- None requiring a task. `npm run format` not covering `test/` is recorded in
  NOTES.md as a note for a future pass; widening the glob would reformat every
  existing test file and is not this task's scope.
