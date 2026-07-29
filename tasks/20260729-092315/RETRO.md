# Retro: Fix first-run mobile game focus

- TASK: 20260729-092315
- BRANCH: fix/first-run-panel-focus
- REVIEW ROUNDS: 4

## What went well

- The one-line product fork (closed / collapsed / sheet / inline card) was
  settled in DECISION.md BEFORE any code, so the implementation never had to
  double back. The rejected options are recorded with the reason each was
  rejected, which is what a cold reader needs.
- Test-first was real, not ceremonial: the two mobile assertions and the
  inverted panel expectation were written and watched fail (5 failed / 1
  passed) before `renderLastGuess` was touched, and the out-of-context reviewer
  independently re-ran the revert experiment rather than trusting that claim.
- The predecessor task's `test.fixme` did its job. 20260729-092258 left a
  disabled assertion naming this task as its owner; flipping it was the first
  step here, so the invariant was pinned by someone who had never seen this
  session's reasoning.

## What went wrong

- R2.1: the R1.1 fix (open the panel on a hint purchase) was written
  unconditionally, without checking what `openPanel()` does BEYOND opening -
  it also clears `manuallyClosedPanel`. So a fix aimed at the pre-first-guess
  case silently reached into mid-game and undid a preference that this same
  branch's own test pins. Root cause: treated a helper as its name rather than
  reading its body, in a module I had already read once.
- R3.1 is the expensive one, and it was self-inflicted twice over. The new
  mid-game test was flaky, and the flake was diagnosed correctly (a stale
  100ms blur timer hiding the suggestion list). But the fix - retry until the
  input goes empty - was built on an assumption about WHY the input empties,
  never traced. It empties on the failure path too: the ignored Enter bubbles
  to the input's own handler, submits the raw text, throws, alerts, and
  `finally { updateUI() }` clears the box. So the "proof the guess landed" was
  proof of nothing, and I reported "48/48 green" from a harness that could not
  fail. The reviewer reproduced 47/48 on the first try.
- Related: the flake was declared fixed after ONE `--repeat-each=6` run. For a
  race with a ~100ms window, a single clean run is not evidence; the failure
  rate was roughly 1 in 48.

## What to improve next time

- Before using a state-clearing side effect as a test's success signal, ask
  what ELSE sets that state. If the failure path can produce the same
  observable, the signal is worthless. Prefer a monotonic domain counter (here
  guesses-left, and `toBe(before - 1)` rather than "any decrease") over "the
  widget looks reset".
- When a fix calls an existing helper, read the helper's body in the same
  breath - especially one that mutates module-level state. `openPanel()` is
  four lines and one of them was the bug.
- A flaky test is only fixed when the fix is measured against the original
  failure rate. Run enough repeats to have seen the old failure several times
  over (here: 240 repeats), not one clean pass.

## Action items

- [x] tatr 20260729-125313: stop the info panel auto-opening on a mid-game
      reload (scoped out of this task on purpose, recorded in DECISION.md)
- [x] tatr 20260729-130138: autocomplete blur timer swallows a fast re-typed
      guess, and turns it into a spurious "not found" alert (real app defect
      surfaced by this task's tests; the e2e workaround points at it)
- [x] two lessons appended to LESSONS.md
      (`side-effect-cleared-state-is-not-proof-of-success`,
      `read-the-helper-body-not-its-name-before-reusing-it`)
