# Retro: Spike - make the hint split the remaining candidates

- DATE: 20260729
- TASK: 20260729-160500 (CLOSED, review APPROVE)

## What went well

- **Finding the common unit was the whole spike.** The question arrived as a
  design argument ("hints feel like a bad deal", "split in better halves") and
  design arguments do not converge. Converting both sides to bits of
  candidate-set reduction turned it into arithmetic: a guess is worth 1.77 bits,
  therefore a hint at cost 3 must return 5.2, therefore the price is
  load-bearing and no reveal rule can rescue it alone. That conclusion was not
  reachable from the original framing, which treated the price as a tiebreaker
  between two reveal orders.
- **Measuring the user's own hypothesis rather than routing around it.** The ask
  was "split in better halves". Literal halving turned out to be the WEAKEST rule
  in the family, because a hint is a true statement and truth is worth more when
  it is narrow. Measuring it explicitly and reporting why it loses is what makes
  the recommendation trustworthy; quietly substituting a better rule would have
  looked like the ask was ignored.
- **The rig checks itself against the shipped function.** `hint.ts` reproduces
  `findNextHintCladeId` so alternatives can be compared like-for-like, and
  asserts 548/548 agreement with the real one on every run. `LESSONS.md` already
  has a lesson about hand-copied mirrors rotting; here the mirror was mandatory,
  so the fix was to make the rot detectable rather than to avoid the copy.
- **The spike rewrote an existing task instead of seeding a new one.** The
  problem already had an owner (`20260729-141424`); a second task would have
  split the record.

## What went wrong

- **A branch of the recommended rule went unmentioned until self-review.** The
  threshold split falls back to the deepest unrevealed clade when nothing meets
  the threshold - which looks exactly like the bottom-up behaviour the doc
  spends a paragraph rejecting. The first draft recommended the rule without
  noting the branch existed. Instrumenting it produced two surprises in
  opposite directions: it fires on 18.6% of calls (far more than assumed), and
  it is safe by construction (the clade it returns necessarily holds MORE than
  the threshold share, measured at min 25% / median 67%), so it can only
  under-deliver, never give away the answer. Both the worry and the reassurance
  were guesses until measured - and the reassurance is a proof about the code,
  which is exactly the kind of claim that is cheap to check and embarrassing to
  assert wrongly.
- **Numbers were quoted to a precision the sample did not support.** Every table
  ran at 5 trials per target, and the doc compared cells differing by 0.2 as if
  that were signal. Re-running at 20 trials confirmed the headline gaps hold,
  but the right order is: state the sample, then decide which digits are
  allowed to matter.
- **The review was in-context, not out-of-context.** `/flow` asks for a round-1
  reviewer with no memory of writing the thing; this session is configured
  without subagents, so the author reviewed their own work. It did catch two
  real defects, but its blind spots are by construction the author's blind
  spots. Recorded in REVIEW.md rather than presented as an ordinary review.

## Lessons

- `price-a-mechanic-in-the-same-unit-as-what-it-costs`: when a game mechanic is
  argued about in feel ("hints are a bad deal"), find the unit that both the
  cost and the benefit are denominated in - here bits of candidate-set
  reduction - before proposing changes. It turns an unwinnable design argument
  into arithmetic and can reframe the question entirely: the fix here was not
  the reveal order both sides were arguing about, it was the price neither had
  measured.
- `measure-the-fallback-branch-of-a-rule-you-recommend`: the threshold split's
  "nothing qualified" path looks like the exact policy the doc rejects, and
  fires on a fifth of calls. Instrumenting it showed the rate was higher than
  assumed AND that the branch is harmless by construction. Before recommending
  a rule with a fallback, measure the fallback: the intuition about it was
  wrong in both directions, and neither error was visible from reading the
  happy path.
- `state-the-sample-before-quoting-the-tenths`: a simulation table with no
  stated trial count invites comparing cells that are noise. Print the sample
  size in the report header and make it a knob, so a claim that rests on a
  small gap can be re-run rather than argued about.
