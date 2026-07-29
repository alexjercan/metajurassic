# Spike: make the hint split the remaining candidates

- DATE: 20260729-160500
- STATUS: RECOMMENDED
- TAGS: spike, gameplay, design

## Question

`20260729-141424` measured the hint as a trap: it costs 3 guesses and returns
less than 3 guesses of progress at every point measured. That task framed the
fix as a binary fork - reveal bottom-up at cost 3, or keep the top-down walk at
a lower price. The user rejected both halves of that framing and asked a better
question:

> keep them top->down + maybe make them cheaper, but unsure ... hint splits the
> remaining guesses in better halves -> let's actually start a research on
> making the hint better to split guesses

So the uncertainty this spike reduces is: **what selection rule and what price
make a hint worth buying, measured in the same currency as a guess?** A
good-enough answer names one selection rule, one price, and shows both against
the alternatives on the real content graph - not on intuition.

## Context

- A guess yields exactly one observable: the deepest clade the guess and the
  target share (the join point drawn in the tree). A hint yields one more: a
  clade in the target's lineage, drawn as a new level above the `?`.
- `findNextHintCladeId` (`src/treeBuilder.ts:47`) walks the target's lineage
  DOWNWARD from the deepest clade already on screen, one level per hint.
- `HINT_COST = 3` (`src/constants.ts`), charged by
  `GameState.numberOfGuesses()` against `MAX_GUESSES = 25`.
- Prior measurement: `tasks/20260729-092435/NOTES.md` F2.2-F2.4 (the playtest
  pass) and `tasks/20260729-141424/TASK.md`.
- New instrumentation for this spike: `scripts/playtest/hint.ts`
  (`npm run playtest:hint`), which imports the shipped `computeLCA`,
  `GameState` and `findNextHintCladeId` rather than re-implementing them. Its
  reproduction of the shipped top-down rule is checked against the real
  function every run (`548/548 agree`), so the policy comparison is
  like-for-like. Every number below is from that script over
  `src/jurassic/index.json` (150 species, 108 clades), at **20 trials per
  target** (3000 rounds per simulation cell). The trial count is the
  `PLAYTEST_TRIALS` env knob and is printed in the report header; the
  recommendation was checked at 5 and at 20 and does not move.

Two caveats to carry into every table below:

- `bitsPerGuess` credits a WINNING guess with the whole remaining set
  (`log2(candidates before)`). That nudges the price of a guess upward, which
  RAISES the bar a hint must clear - the bias runs against this doc's own
  conclusion, so the recommendation is conservative rather than flattered.
- This rig's `read-tree` player is not identical to `difficulty.ts`'s: it
  narrows on the smallest clade currently revealed (which accounts for hints),
  where `difficulty.ts` narrows on the last observed LCA. Absolute means are
  therefore NOT comparable between the two scripts. Every row in a table here
  shares one baseline, so the comparisons within this doc hold.

### The unit that makes the question answerable

Both a guess and a hint do exactly one thing: shrink the set of species still
consistent with the board. So price them in the same unit - **bits**,
`log2(candidates before / candidates after)`:

```
mean bits per GUESS (consistent player): 1.77
  guess 1: 2.13   guess 2: 1.99   guess 3: 1.70   guess 4: 1.46   guess 5: 1.31
```

A hint costing C guesses has to deliver about `C x 1.77` bits to be worth
buying. At `HINT_COST = 3` that is **5.2 bits** - which on a 150-species field
means narrowing to under 5 candidates in one press. That is nearly the answer.
This is the spike's first real finding: **at cost 3 no selection rule can make
the hint fair without making it a solve button.** The price, not only the
reveal order, is load-bearing.

### Why the shipped hint is worth almost nothing

The lineage ladder is extremely uneven. Median share of the whole field, by
depth from the root:

```
level 1: 66%   level 2: 65%   level 3: 25%   level 4: 24%   level 5: 23%
level 6: 15%   level 7: 14%   level 8:  9%   level 9:  8%   level 10: 7%
```

Levels 1-2 and 3-5 are near-duplicates. A rule that advances exactly one level
per hint therefore spends a hint on a step that eliminates nothing, and it is
worse mid-round because the guesses already made pushed the frontier past the
one or two levels that DID cut:

```
bits delivered by one hint, by when it is bought
policy                  after 0  after 1  after 2  after 4  after 6
top-down (shipped)         0.92     0.06     0.15     0.39     0.44
```

**0.06 bits for 3 guesses** after a single guess. The shipped hint is not
merely a bad deal, it is close to an empty one exactly when a player would
press it.

## Options considered

Every option below reveals a TRUE clade of the target, so all are drop-in
replacements for `findNextHintCladeId` and none needs a new tree affordance.
Note the direction of value: because a hint is a true statement, a NARROW clade
is worth MORE, not less. "Split in halves" is the right instinct about pacing
but not about worth - halving caps a hint at 1 bit, which cannot pay 3 guesses
and barely pays 1.

- **Do nothing.** Costs: the button stays a trap that punishes the stuck player
  it is aimed at, and `20260729-092327` (hint copy) has nothing honest to say
  about it. Defensible only if the hint is removed instead, which the user
  explicitly did not want.
- **Bottom-up at cost 3** (option (a) of `20260729-141424`). Delivers 4.98 bits
  cold - it names the target's own family. Round simulation, tree-reading
  player, hint up front: mean total cost 6.5 against a 9.1 no-hint baseline,
  and 4.5 at cost 1. That is not a hint, it is a purchase of the answer for a
  fifth of the budget; the deducing player's cold-board cost drops to 3.1. It
  fixes the arithmetic by deleting the puzzle. Rejected.
- **Nearest-to-half split** - of the unrevealed lineage clades, the one closest
  to halving the candidate set. This is the literal reading of "split in better
  halves". Delivers 0.93-1.16 bits, i.e. about ONE bit by construction, which
  is less than one guess (1.77). It never pays for itself at cost 2 or 3, and
  only barely at cost 1. The literal halving rule is provably the weakest of
  the split family. Rejected, and worth recording because it was the starting
  hypothesis.
- **Threshold split** - the SHALLOWEST unrevealed lineage clade that cuts the
  candidate set to at most a fraction `f` of its current size. Keeps the
  top-down direction and the incremental feel the user asked to keep, and skips
  only the levels that narrow nothing. One tunable, `f`:

  ```
  bits delivered by one hint, by when it is bought
  policy                  after 0  after 1  after 2  after 4  after 6
  split<=1/2                 1.57     1.67     1.30     0.99     0.86
  split<=1/3                 2.29     2.00     1.61     1.12     0.90
  split<=1/4                 2.93     2.23     1.78     1.14     0.93
  ```

  At `f = 1/4` one hint is worth roughly 1.3-1.7 guesses early and about half a
  guess late. Pacing stays bounded: from a cold board the rule offers a median
  of 2 hints (p90 3) before it runs out, against 9 for the one-level-at-a-time
  walk - so there is no ladder to spam.
- **Off-lineage yes/no probe** - ask about a clade the target may NOT be in, so
  the answer can be "no". Guarantees ~1 bit worst-case. Rejected on two counts:
  it is worth less than a threshold split (1 bit vs 2.9), and a "no" has no
  representation in a tree that draws only the target's lineage, so it would
  need a new UI surface. Recorded because it is the standard information-theory
  answer and someone will propose it again.

### The fallback branch, measured

The threshold rule needs a branch for "no unrevealed clade meets the
threshold", and the obvious one - hand over the deepest clade instead - is
exactly the bottom-up behaviour rejected above. That branch is not rare: it
fires on **18.6% of calls**, with a median of 7 candidates still live but a tail
reaching the full 150.

It is nonetheless safe, and by construction rather than by luck. The branch is
only reached when NOTHING met the threshold, including the deepest clade - so
the clade it hands over necessarily holds MORE than `f` of the live field.
Measured: the fallback clade still holds a **minimum of 25% and a median of 67%**
of the candidates. The fallback is the WEAK path, never a solve button; it can
under-deliver, it cannot give away the answer.

The implementing task should still decide deliberately what to do with it, since
about one hint in five lands there: hand it over anyway (simplest, and it is
still the best available narrowing), or refuse to sell a hint that cannot clear
the threshold. This spike leans toward handing it over - a hint that sometimes
refuses is worse than one that sometimes narrows less - but it is a real choice
and belongs in the DECISION.md.

## The price, measured

Round simulation, all 150 targets x 20 trials, at each price and buy point. The
number in brackets is the net cost per hint ACTUALLY bought (the raw mean hides
the price behind rounds that ended before the buy point). **Negative is good** -
the hint saved more than it cost.

Two player models, both from the existing playtest harness: `deduce` holds a
perfect candidate set (the skill ceiling), `read-tree` knows only "the target is
inside the deepest revealed clade" (the player who actually presses the button).

```
                        deduce (baseline 4.6, loss 0%)  read-tree (baseline 9.1, loss 5.5%)
                        up front  after 2  after 4      up front  after 2  after 4
top-down cost=3           +2.5     +2.8     +2.7          +1.8     +1.2     +1.0
top-down cost=1           +0.5     +0.8     +0.7          +0.0     -0.9     -1.0
bottom-up cost=3          +0.4     +1.9     +2.7          -2.6     -1.0     +0.0
split<=1/2 cost=1         +0.1     +0.1     +0.2          -0.7     -1.4     -1.5
split<=1/3 cost=2         +0.8     +1.0     +1.3          -0.8     -1.1     -0.8
split<=1/4 cost=3         +1.6     +2.0     +2.4          -0.6     -0.3     +0.0
split<=1/4 cost=2         +0.6     +1.0     +1.4          -1.5     -1.3     -1.0
split<=1/4 cost=1         -0.4     -0.0     +0.4          -2.6     -2.3     -1.9
```

Read that table as a design statement, not just arithmetic. `split<=1/4` at
cost 2 is the strongest cell that is **negative at every buy point for the
tree-reading player and positive at every buy point for the deducing one**
(`split<=1/3` at cost 2 and `split<=1/2` at cost 1 share the property with
roughly half the effect): it helps the player who
cannot do the deduction, at all three moments they might reach for it, while
staying a bad deal for the player who already knows the answer set. That is what
a hint should be. Cost 1 helps everybody, including the expert (-0.4 up front for a deducing
player), which makes "buy both hints immediately" a mildly dominant opening.
It also drops the tree-reader's loss rate furthest, 5.5% to 3.4%, so it is the
right choice if accessibility outweighs the dominant-opening risk.

## Recommendation

**Selection: threshold split. Price: 2.**

1. Replace the one-level-per-hint walk in `findNextHintCladeId` with: the
   shallowest unrevealed clade in the target's lineage that cuts the current
   candidate set to at most `HINT_SPLIT_FRACTION` of its size, falling back to
   the deepest unrevealed clade when nothing meets the threshold. Keep
   `HINT_SPLIT_FRACTION = 1/4` in `src/constants.ts` as a single tunable, so a
   playtest reversal is a one-line change. See "The fallback branch, measured"
   for why that fallback is safe and why it still needs a deliberate decision.
2. Drop `HINT_COST` from 3 to 2.

This keeps everything the user asked to keep - the reveal still moves top-down,
one clade at a time, the tree renders exactly as it does today - and changes
only which rungs of the ladder are worth stopping at, plus the price.

The candidate set the rule needs is derivable by the game from its own guess
history (a species is still consistent iff its LCA with each past guess matches
the LCA that guess showed), so no new state is stored and nothing about the
target leaks that the hint was not about to reveal anyway.

Runners-up, honestly: `split<=1/3` at cost 2 is the same shape with a smaller
effect (-0.8 to -1.1 for the tree-reader), and `split<=1/4` at cost 1 is
strictly stronger for players but risks a dominant opening. Both are one
constant away from the recommendation, which is why the fraction and the price
are both constants.

## Open questions

- **The DoD in `20260729-141424` contradicts this recommendation and needs the
  user's call.** It requires the hint to lower mean total cost for the
  `consistent` (deducing) player both up front and mid-round. Only cost 1 does
  that. This spike argues the bar itself is wrong: a player holding a perfect
  candidate set does not need a hint, and a hint that pays off for THEM is a
  shortcut, not a hint. Recommendation: rewrite the DoD to require net-negative
  for the `read-tree` player at all three buy points, and net-positive (not
  exploitable) for `deduce`. Recorded as the decision the implementing task must
  confirm before building.
- Whether a first hint at cost 2 feels different in the hand from the measured
  numbers. The sim's `read-tree` player is a floor, not a human; a real player
  reads silhouettes and names too.
- Whether the hint copy (`20260729-092327`) should state the guarantee ("this
  will at least quarter the field") now that there is one to state - and how it
  should read on the ~19% of hints that take the fallback path and cannot make
  that promise.
- Content, not code: levels 1-2 and 3-5 of the ladder are near-duplicate clades.
  Collapsing them would improve the tree for every mechanism, not only hints.
  Out of scope here; worth its own look.

## Next steps

The direction lands in the task that already owns this problem rather than a new
one - `20260729-141424` is rewritten to build this recommendation, and cites
this doc. No further tasks seeded.

- tatr 20260729-141424: rework the hint reveal rule and price (was framed as a
  two-way fork; now carries this spike's measured direction)
