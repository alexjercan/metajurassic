# Retro: Pin the daily clock in every e2e spec that opens the daily page

- TASK: 20260804-000316
- BRANCH: fix/pin-daily-clock-e2e
- REVIEW ROUNDS: 1

## What went well

Understanding refused the hypothesis it was handed. TASK.md arrived naming a
commit (`e846885`, the hint-chip work) and a symptom ("element is not visible"
on `#hint-box`). Both were wrong. Reading the actual Playwright error -
`modal-overlay.active intercepts pointer events` - and the saved page snapshot
turned a suspected regression into a date-dependent fixture in one pass, and
the correction was written back into TASK.md's Context so a later reader cannot
re-run the dead investigation.

Taking the class instead of the three instances. Three tests failed; thirteen
spec files had the same exposure. Fixing the three would have left the task to
reopen under different spec names on the next calendar collision.

The durable proof is a source-scanning jest test, not a `cmd:` re-run of the
three specs. The property - "no spec opens the daily page on the real clock" -
is invisible to every runtime test, because the suite is green on the days it
happens to be green. Choosing the runtime proof would have been exactly
`a-guard-no-test-can-fail-is-a-comment`; it was kept as secondary evidence
instead.

Review was one round: APPROVE, three NITs, no BLOCKER or MAJOR.

## What went wrong

The plan picked the wrong edit sites, and the reason is the interesting part:
it inherited the guard's own blind spot. The guard is file-level ("does this
file mention `pinDailyClock`?"), and the plan used that same question to decide
which files needed editing - so `e2e/hintKeyboard.spec.ts` and
`e2e/share.spec.ts`, which install a clock inside one block but hold a
`goto("/")` outside it, were listed as already pinned. Following the plan
literally would have left three unpinned `goto("/")` sites with the guard
reading green: the exact failure the guard exists to prevent.

That seemed sound at plan time because at file granularity the two questions
really do have the same shape, and the five existing literals looked like
in-place folds. Implementation caught it and hoisted every pin to file scope in
all 13 files, which closes the gap by construction at the same cost. The census
that would have prevented it is `grep -c 'goto("/")'` per file - the underlying
fact, not the guard's predicate.

Second, `e2e/mobile.spec.ts`'s pull-tab test still failed after pinning, and the
cause was not the pin. `has-unseen` is only set when a guess deepens the mounted
card past the root; the fixture's Ceratosaurus meets the pinned day's
Pentaceratops at `dinosauria`, the root, so the card never changes. That test
had been passing because the calendar kept handing it a related target - a
luck-passing assertion sitting inside a suite that was nominally green.

## What to improve next time

A guard's granularity is a statement about detection, not about scope. When a
plan enumerates edit sites with the guard's own predicate, the plan can only be
as precise as the guard is, and the two then agree on exactly the sites both
missed. Derive sites from the underlying fact; reserve the coarse question for
the check.

Freezing a date-dependent fixture is a way to FIND luck-passing assertions, not
only a way to stabilise a suite. Budget for the fallout pass. Step 6 asked for
it explicitly and required each new failure be decided on its merits, which is
why the pull-tab test got a fixture that can satisfy its assertion rather than
a weakened assertion.

Breadth: 14 e2e files and one new test for a three-test failure is the class
being fixed, not scope creep, and it is not independently splittable - a
partial sweep leaves the guard unable to go green. Context: no compaction,
handoff, or checkpoint was recorded; the one delegation was the mandatory
out-of-context round-1 reviewer.

## Action items

- None blocking. The three review NITs (`R1.1`-`R1.3`) are recorded in
  REVIEW.md as take-or-leave: the guard's `goto("/")` substring detector, its
  ISO-literal ban being broader than the DoD wording, and the fake clock
  installed in files where only one test opens `/`. No follow-up task - the
  first future spec that trips one of them is the trigger.
- `DECISION.md`'s remaining hole stands and is deliberate: a new `test.describe`
  inside an already-pinned file that skips the `beforeEach` still passes the
  file-level guard.

## Knowledge

Written to `/home/alex/personal/agent-knowledge` (project=metajurassic);
`knowledge check` exit 0. Both are new slugs:

- `testing/pin-ambient-inputs-a-test-reads` - ambient state a test only READS
  is uncontrolled shared state in disguise; pinning it is also the detector for
  assertions that were passing on luck.
- `planning/derive-edit-sites-from-the-fact-not-the-guard` - a guard may be
  coarser than the property it protects, but a plan that enumerates edit sites
  with the guard's predicate inherits its blind spot.

`testing/control-shared-state` was the near neighbour and was left alone: its
body is about restoring state a test MUTATES, and appending an occurrence
requires submitting that body verbatim.

## Landing message

```
fix: pin the daily clock in every e2e spec that opens the daily page

The 13 specs that call `page.goto("/")` played whatever puzzle the real date
seeded, so `npm run ci` was a coin flip on the calendar: on 2026-08-04 the
daily target was Ceratosaurus, which `guessFirstSuggestion(page, "saurus")`
always guesses, so three specs won the round on guess 1 and then timed out
clicking through the win modal.

`e2e/helpers/clock.ts` names the played day once and installs it; all 13 specs
pin from a file-level `beforeEach`, and the 5 repeated date literals fold onto
that one constant. `test/dailyClockPin.test.ts` holds both properties by
reading the sources, since no runtime test can observe a suite that is green
only on lucky days.

`e2e/mobile.spec.ts`'s pull-tab test now guesses Triceratops by name: the
`has-unseen` marker needs a guess that deepens the card past the root, which
the calendar had been supplying by chance. No `src/` change.
```
