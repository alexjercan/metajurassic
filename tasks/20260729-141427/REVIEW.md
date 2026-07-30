# Review: Fix autocomplete filtering order and prefix ranking

- TASK: 20260729-141427
- BRANCH: fix/autocomplete-match-order

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

The reviewer ran every Definition of Done proof itself rather than taking the
implementation's word for it:

- `E2E_PORT=8181 npm run ci` from the worktree: green. Jest 15 suites / 244
  tests, Playwright 80 passed 1 skipped, with `format:check` and `lint` passing
  earlier in the chain.
- DoD 1 (browser E2E, the exact repro): `e2e/autocomplete.spec.ts:62` passed,
  and it guards that the stimulus fired (`Guesses Left: 17`, one `.node-mystery`
  still on the board, 8 distinct names guessed) before asserting the list is
  still populated.
- DoD 2 and DoD 3 (Jest ranking and truncation): passed.

Two mutation experiments, each quoted verbatim from what was actually run.
Mutation A replaced the partition/concat body with the pre-fix logic:

```ts
    return speciesNames
        .filter((name) => name.toLowerCase().includes(normalized))
        .slice(0, MAX_SUGGESTIONS)
        .filter((name) => !isGuessed(name));
```

giving Jest `4 failed, 4 passed` and Playwright desktop autocomplete
`2 failed, 1 passed`. Mutation B kept filter-before-truncate and deleted only
the prefix tier:

```ts
        if (lowered.includes(normalized)) {
            interior.push(name);
        }
```

giving Jest `2 failed, 6 passed` - exactly the two ranking specs. So the two
halves of the fix are pinned INDEPENDENTLY at their own boundary, not jointly
by one coarse test. The fixture test (150 species, the "tyr" and "saur"
source-order pins) keeps the ordering assertions from going vacuously green
after a content edit.

The doc-surface sweep found no stale "no prefix ranking" or "slice to 8" claims
left outside the append-only `tasks/` tree: `e2e/helpers.ts` and
`scripts/playtest/walkthrough.ts` were the two live surfaces stating the old
behavior and both were updated. No DECISION.md is warranted - the two-tier
ranking is a local choice fully explained in the `findMatches` docstring.

- [x] R1.1 (MINOR) tasks/20260729-141427/TASK.md:3 - `STATUS: CLOSED` was set
  while `FLOW STEP: REVIEWING` and neither REVIEW.md nor RETRO.md existed, so
  the repo's own conformance gate was red: `tatr check` reported
  `closed-missing-review` and `closed-missing-retro`. This is the exact pattern
  LESSONS.md records twice (`close-a-task-with-its-review-and-retro-not-just-the-status`)
  - the status flag is a claim, the artifacts are the evidence. Set it back to
  OPEN and flip to CLOSED only once REVIEW.md carries an APPROVE verdict and
  RETRO.md is on disk, and run `tatr check` alongside `npm run ci`.
  - Response: Confirmed independently by re-running `tatr check --ledger
    LESSONS.md` in the worktree, which reproduced both findings. Status set back
    to OPEN; it flips to CLOSED in the compound step, once this APPROVE and
    RETRO.md are both on disk. `tatr check` added to the task's verification.

No BLOCKER or MAJOR findings. The task has no open `manual:` DoD items, so
there is nothing pending user acceptance.
