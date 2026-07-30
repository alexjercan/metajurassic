# Retro: Fix autocomplete filtering order and prefix ranking

- TASK: 20260729-141427
- BRANCH: fix/autocomplete-match-order
- REVIEW ROUNDS: 1 (APPROVE, one MINOR)

## What went well

- The extract-then-test-then-fix ordering paid off. `findMatches` was a closure
  inside `setupAutocomplete`, so the first move was a behavior-PRESERVING
  extraction to an exported function. That made the new Jest suite go red
  against the real bug (`Received length: 0`, and the "tyr" list in source
  order) instead of red against a missing import - the difference between a
  test that reproduces and a test that merely fails.

- Splitting the fix into two independently-pinned halves was worth doing on
  purpose. The out-of-context reviewer ran a second mutation this session had
  not: deleting only the prefix tier while keeping filter-before-truncate. It
  failed exactly the two ranking specs and nothing else, proving each half is
  pinned at its own boundary rather than jointly by one coarse assertion.

- The fixture pin (`speciesNames` length 150, the exact "tyr" and "saur"
  source-order lists) was added because the ordering assertions name specific
  species. A content edit now fails the pin loudly instead of quietly
  invalidating what the ordering tests claim to prove - the
  `assert-the-exact-values-not-a-property-they-happen-to-have` lesson applied
  forward rather than re-learned.

- The doc-surface sweep found two live surfaces asserting the OLD behavior, and
  one of them (`scripts/playtest/walkthrough.ts`) was the probe that originally
  demonstrated the bug. Rewriting it to guess what the box actually offers, plus
  a "BUG: the box re-offered already-guessed species" alarm, turned a probe that
  described a fixed bug into one that would catch its return.

## What went wrong

- R1.1: STATUS was flipped to CLOSED at the end of the work phase, before
  REVIEW.md or RETRO.md existed, leaving `tatr check` red on
  `closed-missing-review` and `closed-missing-retro`. Root cause: `tatr check`
  was not run as part of the work phase's own verification. `npm run ci` was
  treated as "the gate" because AGENTS.md calls it the source of truth for
  green - but it is the source of truth for the CODE, and the task record has a
  separate gate that was simply never invoked. This is the THIRD occurrence of
  the same close-out pattern in this repo's ledger.

## What to improve next time

- Run `tatr check` in the same breath as `npm run ci` when closing out a work
  phase. Two gates, two commands; passing one says nothing about the other.

- Set STATUS to CLOSED at the COMPOUND step, not the work step. The work phase
  ends at "checks green and committed"; CLOSED is a claim about the whole
  record, and the record is not complete until the verdict and the retro are
  beside it.

## Action items

- [x] Ledger bumped: `close-a-task-with-its-review-and-retro-not-just-the-status`
      to x3, which moves it to Pending promotions with a concrete tool proposal
      (a `tatr` guard refusing the CLOSED transition without an APPROVE in
      REVIEW.md) rather than more prose.
- [x] `scripts/playtest/walkthrough.ts` endurance scenario retargeted so it
      measures the fixed behavior instead of narrating the old bug.
- No follow-up code tasks. `20260729-130138` (the blur-timer bug in the same
  file) was deliberately left untouched, per this task's own sequencing note;
  `e2e/helpers.ts` still documents that hazard and still works around it.
