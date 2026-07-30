# Review: Autocomplete blur timer swallows a fast re-typed guess

- TASK: 20260729-130138
- BRANCH: fix/autocomplete-blur-timer

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

- [x] R1.1 (MAJOR) tasks/20260729-130138/NOTES.md:82 - The section "The reported
  panel.spec flake did NOT reproduce" is false, and the DoD line it justifies
  (TASK.md:191-193, "it cannot fail either way") is false with it. The flake
  reproduces readily on the unfixed source once the helper workarounds are
  removed: `-g "resurrect" --repeat-each=40` gave 17 failed / 23 passed, and
  `--repeat-each=10` gave 1 failed / 9 passed with exactly the defect's
  signature. The same command on the branch source is 40/40 passed. The
  implementer's 60/60 number came from `--repeat-each=10` over the whole FILE,
  which runs the one relevant test only 10 times - the same underpowered
  measurement the task's own step warned about. The stated explanation, "The
  spec has changed since the flake was reported", is also wrong: the test body
  is byte-identical at d0b3707 and on the branch. Rewrite that NOTES section
  with the real measurement and restore the `e2e/panel.spec.ts` DoD line to a
  second discriminating proof. The code needs no change; only the record does.
  - Response: Correct on both counts, and both re-verified here independently
    before adopting rather than taken on the reviewer's word. Re-ran the
    reviewer's command on the unfixed source: 12 failed / 28 passed at
    `--repeat-each=40` (the reviewer got 17/40; a flake rate, not a fixed
    number), failing on
    `Locator: locator('#autocomplete-box').locator('.autocomplete-item').first()
    Expected: visible` - the stale timer hiding the box, which is the defect
    itself. Fixed source, same command: 40 passed. The "spec has changed" story
    is likewise false; it was falsifiable in one diff and I never ran it.
    NOTES.md section rewritten with the real numbers and a subsection naming
    both errors: the whole-file repeat count that looked like a big sample and
    was not, and the explanation invented to fit a null result. DoD line
    restored to a second discriminating proof (12/40 -> 0/40).

- [x] R1.2 (MINOR) tasks/20260729-130138/TASK.md:168 - This DoD line's proof
  command is unmet as written. `grep -n "20260729-130138\|toPass" e2e/helpers.ts`
  returns 2 lines (31 and 371), both historical provenance citations in the new
  comments. The `toPass` half is genuinely clean; the task-id half can never go
  clean for the same reason the other DoD grep was explicitly narrowed. Narrow
  this one to `grep -n "toPass" e2e/helpers.ts` and record the same reason.
  - Response: Fixed. Narrowed to `grep -n "toPass" e2e/helpers.ts`, with the
    reason recorded inline. Worth noting against myself: I narrowed the sibling
    grep on exactly this reasoning an hour earlier and did not carry it to this
    one, which is the more interesting half of the finding.

- [x] R1.3 (MINOR) tasks/20260729-130138/TASK.md:3 - `tatr check` is dirty on
  this branch and clean on master: `closed-missing-review` and
  `closed-missing-retro`. STATUS is CLOSED while `FLOW STEP: REVIEWING` and no
  REVIEW.md/RETRO.md exists yet. Leave STATUS as OPEN until the review is
  approved and the retro is written, then close.
  - Response: Accepted as an accurate observation of the moment it was taken,
    but not changed, and the reviewer could not have known why: the flow skill
    prescribes exactly this ordering - `/work` sets CLOSED, `/review` then runs,
    `/compound` writes RETRO.md, and only then does the branch land. So both
    findings are transient states of a task mid-cycle, and they clear as the
    cycle completes rather than by reverting STATUS. Re-run of `tatr check` with
    REVIEW.md and RETRO.md present is recorded below the verdict; if it is not
    clean at that point this becomes a real finding.

- [x] R1.4 (NIT) src/ui/autocomplete.ts:127 - The `cancelPendingHide()` at the
  top of the `blur` handler is unreachable in a real browser: a hide is armed
  only on blur, and reaching blur again requires a focus, which already cancels
  it. If kept, a half-line comment saying so would stop a future reader hunting
  for the double-blur path it implies.
  - Response: Kept, comment added. The reasoning is right, and that is the
    point: the call keeps "at most one armed hide" true from inside the handler
    instead of resting on a chain of reasoning about focus ordering that a
    future edit could invalidate silently.

### What the reviewer verified independently

Recorded because it is the useful part of the round. The reviewer confirmed by
MUTATION, not by reading, that both halves of the fix are separately pinned:

- reverting only the timer machinery: 3 jsdom cases red plus the new e2e case;
- reverting only `stopImmediatePropagation`: exactly the second-listener jsdom
  case red, while the full 88-test browser suite stays GREEN.

That second result is the whole reason that jsdom assertion had to exist - no
browser test in the repo can catch that half, because the accidental
`updateUI()`-blanks-the-input guard hides it. It is the DECISION.md's prediction
confirmed from the outside.

The reviewer also checked there is no other keydown listener on `#player-input`
or any ancestor that `stopImmediatePropagation` could starve (`src/game.ts:329`
is the only one), that neither simplified helper lost what it proved, and that
the doc sweep is clean.

The R1 checkboxes above are ticked on the Round 2 reviewer's confirmation,
recorded below.

## Round 2

- VERDICT: APPROVE
- REVIEWER: out-of-context

All four Round 1 findings confirmed resolved against `ced40c1..bcaf1af`, which
is comment-and-record only apart from the R1.4 comment - no new source
behaviour. No new findings.

R1.3 was withdrawn by the reviewer as transient rather than fixed: the flow
ordering is `/work` closes -> `/review` -> `/compound` writes RETRO.md -> land,
so a task mid-cycle is expected to trip `closed-*` conformance errors, and
`closed-missing-review` had already cleared once REVIEW.md existed. The
reviewer attached one condition, which stands as a gate on this task:
`tatr check` must come back CLEAN after RETRO.md is written, and a remaining
error at that point is a real finding rather than a transient state.

The reviewer took a third independent sample of the flake measurement: 19/40
fail on the unfixed source, against 12/40 and 17/40 from the two earlier runs.
The rate varies; the discrimination does not (0/40 fixed, every time).

One prose note, adopted: NOTES.md said the "spec has changed" claim was
falsifiable by `git diff d0b3707 -- e2e/panel.spec.ts` showing the test body
byte-identical. The FILE diff is not empty (24 insertions, the pull-tab test
from c862ae2); what is byte-identical is the flaky test's body. Wording
tightened in NOTES.md.

No `manual:` DoD items on this task, so there are no pending user checks.
