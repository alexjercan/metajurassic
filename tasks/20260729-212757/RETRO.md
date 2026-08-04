# Retro: Drive the guess budget in markup from MAX_GUESSES

- TASK: 20260729-212757
- BRANCH: chore/max-guesses-markup
- REVIEW ROUNDS: 2

## What went well

- DECISION.md settled both forks before work started and both premises held in
  the code: `entry.faq` already chunked JS into `faq/index.html`, and
  `briefCopy()` did sit beside DOM builders that reuse would have dragged in.
  No fork reopened during work.
- The DoD grep was narrowed with a recorded reason and run when written, so the
  absence proof was real rather than assumed.
- Both review rounds ran out-of-context, and both earned their keep: round 1
  found a substring assertion that survived its own defect, round 2 forced a
  measurement that corrected the record.

## What went wrong

- NOTES.md designed two guards - the markup-literal Jest test and the
  seed-vs-empty argument for `#stat-box` - and the plan dropped both with no
  recorded reason. Review put the first back (R1.3) and turned the second into
  a CSS floor plus `e2e/topBarChip.spec.ts` (R1.2). Guards designed at
  understanding time were lost at plan time, and only review noticed.
- The deeper root cause is one reversal. NOTES.md chose build-time templating,
  and *because* of that it argued to SEED `#stat-box` with the correct number:
  once the templating channel exists, a correct pre-hydration frame is free.
  DECISION.md then reversed fork 1 to runtime hydration - correctly - but kept
  "empty the chip the way `#hint-text` was emptied" as if it were independent.
  It was not: emptying was only safe under a claim about `.stat-box` being a
  fixed-size chip that nobody re-read the CSS to check. It sets no sizing
  property at all, so the chip collapsed 196px to 42px.
- The layout claim, and later the `em` figure that replaced it, were both
  written as fact from arithmetic rather than read off a rig. `8.02em / 7.99em`
  came from dividing pixel values that had already been rounded; measured
  directly it is 7.999em at both sizes, which inverts the comment's "the floor
  never exceeds the hydrated width" (R2.1, open, MINOR).
- R2.2 re-raises a tradeoff NOTES.md had already weighed and accepted - the
  budget regex matching an innocent `25`. The acceptance never reached the test
  file, so a cold reviewer had to rediscover it as a finding.

## What to improve next time

- Breadth: the diff is small and cohesive; it grew only by the two guards
  review restored. No split was missed.
- Churn: the plan-time question that would have prevented both rounds is the
  cold-reader rationale test in `plan/decision.md`, applied to the reversal
  rather than to the chosen fork. When a decision flips a fork, walk the
  consequences the old fork was carrying and re-derive each one; a consequence
  inherited across a reversal is the cheapest place for an unchecked assumption
  to hide. The from-scratch challenge would separately have kept the
  markup-literal guard the notes had already designed.
- Measure in the unit you intend to write. Deriving `em` from rounded pixels
  inflated the figure past the value it was justifying.
- Carry an accepted tradeoff to the site that pays it. A risk weighed in
  NOTES.md and left there will be re-raised as a review finding.
- Context: no compaction or threshold event recorded. Both review rounds were
  delegated out-of-context as the skill requires; round 2's font claim needed a
  direct browser probe on the recording pass to settle, which is the pattern to
  repeat when a delegated finding rests on an environment nobody can run.

## Action items

- [ ] R2.1 and R2.2 stay open as MINOR/NIT; fold the corrected `7.999em` figure
      and the NOTES.md acceptance of the regex breadth into the next change
      that touches `src/partials/game-shell.css` or
      `test/markupConstants.test.ts`.

## Landing message

```
chore: drive the guess budget in markup from MAX_GUESSES

Both hardcoded copies of the budget are gone. `#stat-box` in `src/index.html`
ships empty and is filled by `updateUI()`; the FAQ's sentence moves to a pure
`guessBudgetAnswer()` in `src/faqCopy.ts`, mounted into an empty span by
`src/faq.ts`. `.stat-box` gains a `min-width` floor so the emptied chip
reserves its hydrated width instead of collapsing.

`test/markupConstants.test.ts` turns the one-shot DoD grep into a standing
guard over every `src/*.html`, with the patterns built from `MAX_GUESSES` and
`HINT_COST` so a reprice moves the guard. `e2e/faq.spec.ts` asserts the board
and the FAQ agree on a number neither test hardcodes, and
`e2e/topBarChip.spec.ts` pins the chip's reserved width at 1280/393/320px.
```
