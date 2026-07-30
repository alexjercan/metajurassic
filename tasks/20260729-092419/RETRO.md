# Retro: 20260729-092419 - Tighten CI signal and remove warning drift

- DATE: 2026-07-30
- BRANCH: chore/strict-lint-gate
- REVIEW ROUNDS: 2 (round 1 REQUEST_CHANGES with one MAJOR, round 2 APPROVE)

## What the task turned out to be

Three of the five planned steps were already done by later tasks. The
`treeVisualizer.ts` unused catch binding named in the story was already a
bindingless `} catch {`, browser E2E was already in `ci`, and the `&&` chain
already propagated exit codes. Checking that FIRST - before writing any plan -
is what kept this from becoming a cleanup of nothing: the actual remaining gap
was that no warning could ever fail the gate, so the clean lint state was a
coincidence rather than an invariant.

Worth generalising: a task written weeks ago describes the repo as it WAS. The
five-minute audit of each step against the current tree is the difference
between fixing the stated problem and fixing the real one.

## What went well

- **The gate was falsified two ways, not asserted.** The load-bearing evidence
  was the counterfactual pair: the same planted warning exits 1 with
  `--max-warnings=0` and exits **0** without it. One run alone would only have
  shown that a warning fails; the pair shows the FLAG is what made it fail.
- **The ledger changed the plan mid-cycle, as designed.** I presented the plan
  gate proposing a one-off hand falsification and explicitly no permanent rig.
  Then step 4.1 of the cycle - read `LESSONS.md` before working - surfaced
  `a-guard-no-test-can-fail-is-a-comment`, whose exact words are that a hand-run
  `cmd:` proof is "evidence for one moment, not a guard". Deleting the flag
  would have left all 322 tests green. I revised to add `test/lintGate.test.ts`
  and said so. The ledger paid for itself in the same session it was read.
- **Test-first was real.** The spec was written before the flag and observed
  failing for the right reason (`Received string:` the unflagged script), with
  the other 8 assertions passing - which incidentally proved the three
  already-done steps mechanically rather than by my reading of package.json.

## What went wrong

- **The MAJOR: `toContain("npm run lint")` also matches `npm run lint:fix`.**
  My guard had a hole exactly the shape of the decision it guarded. `lint:fix`
  is the one script this branch deliberately leaves non-strict, and the reviewer
  rewired `ci` to call it: all 9 specs stayed green while `--max-warnings=0` had
  stopped running entirely. The spec's own comment claimed to prevent this.
  Lesson: when a test asserts that a name is used, and a LONGER name with the
  same prefix exists and means something different, substring matching is
  wrong. Especially when the sibling name is one the same change introduced a
  policy distinction for.
- **I wrote a comment about an artifact I did not assert.** The spec reasoned in
  prose about `.github/workflows/ci.yml` inheriting the flag while only reading
  `package.json`. A comment that states a fact about another file is a claim the
  test does not make; the fix was to read the workflow and assert it.
- **I briefly wrote `VERDICT: APPROVE` into REVIEW.md before running the
  verification that would justify it.** Caught and reverted to "pending" within
  the same minute, but it is the same error the ledger records as
  `the marker is a CLAIM, the artifact is the evidence`. A verdict is written
  AFTER its evidence exists, never in the same pass as the fixes.
- **Counted three rules as four** in the task's own analysis section. Trivial,
  but it was a number stated without recounting the config.

## Lessons for the ledger

- `substring-assertions-break-when-a-longer-sibling-name-exists`: pin script and
  command names with a word-boundary regex, not `toContain` / `in` / `includes`.
  `npm run lint` is a substring of `npm run lint:fix`, `test` of `test:e2e`,
  `build` of `build:prod`. The bug is invisible in the passing direction and
  only shows up under mutation - which is the argument for mutation-testing a
  new guard rather than merely watching it go red once on the case you had in
  mind.
- `a-guard-no-test-can-fail-is-a-comment` earns a second occurrence, in a new
  layer: not Python this time but the BUILD CONFIGURATION. Policy encoded in
  `package.json` or a CI workflow is invisible to a suite that runs inside it,
  so the suite has to reach up and read the config as data. Ask the ledger's own
  question - "if I delete this guard, what turns red?" - about npm scripts and
  workflow files too, not just about code.
- `verify-a-guard-fix-with-the-attack-that-defeated-it`: round 2 re-ran the
  reviewer's exact mutations (9 passed -> 2 failed; nothing red -> 1 failed)
  rather than just re-running the suite clean. A fix to a guard is only proven
  by the attack it previously failed; a green clean run says nothing about the
  hole.

## What to do differently next time

1. Mutation-test every new guard in at least two directions before calling the
   work done - delete the thing it protects, AND swap it for a plausible
   near-miss (the sibling script, the renamed flag). I did the first and missed
   the second; the reviewer found it in one attempt.
2. Audit a stale task's steps against the current tree before planning, and say
   in the plan gate which steps are already satisfied and how that was checked.
   This worked well here and is cheap enough to be routine.
3. Write review verdicts only after the verification command has exited.
