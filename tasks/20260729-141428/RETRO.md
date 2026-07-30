# Retro: Fix game-over modal overflow on phone viewports

- TASK: 20260729-141428
- BRANCH: fix/modal-mobile-overflow
- REVIEW ROUNDS: 2 (round 1 REQUEST_CHANGES with 2 MAJOR, round 2 APPROVE with 1 MINOR)

## What went well

- Writing the assertion before the CSS paid immediately: it failed on the real
  cause (`.modal starts 5px left of the 393px viewport`) and the measured
  overshoot per width came out of the failing run rather than out of arithmetic.
- Chasing an anomaly instead of explaining it away found a second real defect.
  Three successive samples of the same layout read 31.0px, 28.9px and 23.9px of
  button padding. Four wrong theories got written down (stale bundle, page zoom,
  media query not matching, Tailwind preflight) before the direct probe showed
  `.modal-btn` carried `transition: 0.2s` - i.e. `all` - so padding ANIMATED
  across the breakpoint. That is a defect neither the task nor the review asked
  about, and it was upstream of every measurement being taken.
- Comparing against master by rendering it (`git show master:src/style.css`)
  rather than reasoning about it caught my own bad experiment: the first attempt
  used `git stash push` on an already-committed file, so both "before" and
  "after" runs measured the same CSS and printed identical numbers. The identical
  numbers were the tell.

## What went wrong

- R1.2 (48px tablet widening) is the significant miss. Root cause: I converted
  `max-width` from a content width to an outer width and checked the conversion
  at the DESKTOP padding only, then wrote a comment asserting "the desktop modal
  keeps the size it has always had". The rule I had just changed reads a
  different padding below 768px, so the cap had to be restated per padding step.
  I verified the claim at the width I was thinking about and generalised it to
  all widths in prose.
- R1.1 and R1.3 are one root cause: I proved the fix as a WHOLE discriminated
  (revert everything -> red) and treated that as proving the parts did. Three of
  the four changes were individually revertible with the suite still green. Worse,
  my own `min-width: 0` was what made one of them unfalsifiable - a knob added
  speculatively ("in case a label gets long") that let the pills shrink below
  their labels instead of spilling, i.e. it silenced the exact failure the task
  existed to catch. I did catch and remove that one myself, from the same
  experiment; what I did not do is run the other single-change reverts.
- R1.4: I ticked a step claiming a narrow AND short viewport sweep while all
  three swept sizes were tall portrait ones, so the vertical half of my own
  helper could not fail anywhere in the set. The word "short" was in my plan and
  never became a number.
- R1.5: I recorded a discrimination figure (12px) from a mutation that quietly
  kept part of the fix in place. The number was real; the label on it was not.

## What to improve next time

- When a fix has N independent parts, revert them ONE AT A TIME and record what
  each mutation prints. "Revert everything -> red" is one experiment, not N, and
  it is the weakest of the N+1 available.
- When a CSS declaration is converted between coordinate systems (content-box to
  border-box, px to relative), grep the same property inside every media block
  before writing what changed - the conversion has to be restated wherever the
  inputs differ.
- A speculative CSS knob (`min-width: 0`, a tolerance, an `!important`) added
  "just in case" next to a test that is meant to fail is a suspect. Ask what it
  makes impossible to observe.
- Turn every axis word in a plan ("short", "narrow", "slow") into a number in
  the swept set before ticking the step that claims it.

## Action items

- [x] tatr 20260730-111003 filed: the modal has no vertical escape hatch and
      clips top and bottom at 568x320, pre-existing on master, found by the
      round-1 reviewer while checking a horizontal fix.
- [x] Four lessons appended to LESSONS.md (one bumping an existing entry).
- [ ] Not done here, noted by the round-2 reviewer as prose: a 768px tablet now
      gets the compact phone pills because the padding trim rides the modal's
      existing breakpoint. Nothing overflows; if the airier look matters at
      tablet widths, the trim wants its own narrower query.
