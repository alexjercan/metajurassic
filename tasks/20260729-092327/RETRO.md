# Retro: Improve in-game onboarding and hint clarity

- TASK: 20260729-092327
- BRANCH: feat/onboarding-brief-hint-copy
- REVIEW ROUNDS: 3 (REQUEST_CHANGES, REQUEST_CHANGES, APPROVE)

## What went well

- **Confirming the ARTIFACT before building bought total product stability.**
  The task itself flagged the in-board-versus-interstitial fork as one to take
  to the user, and naming the constraint that made the candidates exclusive (the
  band is inside a scroll container, so it CANNOT be the always-available
  surface; the top bar can, but only by spending permanent phone room) got a
  decision in one question. Across three review rounds and seven findings, not
  one was "you built the wrong thing" - they were all about layout mechanics.
  The `DECISION.md` also did real work later: R2.1's fix is defensible only
  because the record says what the design values, so the trade could be argued
  rather than guessed.
- **Measuring baselines before touching anything.** Capturing the pre-change
  top bar (68px) and the empty band (239px) meant the copy change could be
  argued in numbers instead of adjectives, and gave the reviewer something
  falsifiable to attack - which it did, correctly, at 360px.
- **Checking port 8080 before running the suite.** A dev server from the main
  checkout was already bound, and `reuseExistingServer` would have pointed the
  whole branch suite at master. The ledger entry existed; reading it first is
  the only reason the run was not silently meaningless.
- **Diagnosing instead of tolerancing.** When the top bar came out 5px over,
  the cause turned out to be `text-transform: uppercase` widening the sentence
  ~25%. Measuring it beat widening the threshold, and the fix made the copy more
  readable rather than less.

## What went wrong

- **R1.1 (the brief was clipped at every size but the tested one).** Root cause:
  I validated the layout at exactly ONE viewport - the Playwright project's
  default - and read "test green" as "layout correct". At 1280x720 the arena had
  literally **0px** of slack; that is a coincidence, and I read it as a pass. I
  picked the sizes my harness already had rather than the sizes that would
  stress the constraint I had just created.
- **R2.1 (the inline error rendered behind the footer).** Root cause: I looked
  at screenshots ONCE, early, and treated that as the visual check for the whole
  task. After changing how the error was positioned I never rendered a real
  message at phone width again - so a fix aimed at layout rigidity made the
  feedback this task exists to add unreadable. The irony is that the first
  screenshot is what caught the clipped hint chip that no test saw; I had
  already been shown the value of looking and then stopped doing it.
- **R2.2 (a comment asserting a verification that never ran).** I wrote "still
  fails the original F3.9 layout" from reasoning about the geometry, not from
  running the revert. It was false: `renderTree` scrolls the arena, so the
  viewport-relative gap I measured already had the auto-scroll subtracted out
  and could not tell the two layouts apart. Same family as the ledger's
  `absence-proving-greps-must-be-run-when-written`, in a comment instead of a
  DoD.
- **R2.3 (a stale verification result reported as current).** I ran the revert
  experiments, then rewrote the helper they depended on, then wrote up the
  earlier numbers. They were true when produced and false when committed.
- **R3.1's follow-on: a media query that had never applied.** Fixing the NIT
  surfaced that the `@media (max-height: 700px)` compaction sat BEFORE the
  `@media (max-width: 768px)` block, so at narrow widths the later block won and
  the compaction never ran on any phone. It went unnoticed because I had only
  ever measured its effect at desktop widths - the axis where it did work.

## What to improve next time

- When a change introduces a size constraint, sweep the sizes that STRESS it
  (short viewports, narrow viewports, the transient states) before believing a
  green suite. A single default viewport is a sample of one.
- Re-render and LOOK after every layout change, not once per task. The cheap
  screenshot is the instrument that catches what geometry assertions cannot.
- Before recording that an experiment passed, check the code it ran against is
  the code being committed. Re-run rather than recall.
- For CSS, verify a media block's EFFECT on both axes it can be overridden on,
  and remember that equal-specificity blocks are resolved by file order.

## Action items

- [x] tatr 20260729-212743: make the hint chip keyboard reachable (filed from
      review round 1's pre-existing observations)
- [x] tatr 20260729-212757: drive the guess budget in markup from `MAX_GUESSES`
      (same)
- [x] Four lessons appended to `LESSONS.md`; `absence-proving-greps-must-be-run-when-written`
      bumped to x2 for the R2.2 variant.
- Two `manual:` DoD items remain for the user at the flow Finish: playtest the
  first minute without opening the FAQ, and inspect the hint affordance on
  desktop and mobile.
