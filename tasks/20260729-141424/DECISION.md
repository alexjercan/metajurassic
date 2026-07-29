# Decision: what a hint reveals, what it costs, and how many you may buy

- DATE: 20260729 (accepted by the user in conversation)
- STATUS: ACCEPTED
- CONTEXT: `tasks/20260729-160500/SPIKE.md`

## The fork

The hint was measured as a bad buy (`20260729-092435`). The original task framed
the fix as reveal-order-versus-price. The spike showed that framing was
incomplete, and the user then rejected the spike's own framing in turn - which
is what settled it.

## What changed the answer: the bar, not the data

The spike optimised for **return on investment**: does a hint save more guesses
than it costs? On that bar the winner was a threshold split at 1/4, priced at 2.

The user rejected the bar itself:

> a hint is supposed to be a bad investment, it's like a desperate move, not
> something that gives you an advantage over someone who knows how to play;
> it's more of a "I have no idea how to play (the blind guy kind of) and I need
> a bit of help" ... basically bring the 80% loss to something like 50% or so
> for the bad players

That is a **rescue** bar, not an ROI bar, and the two rank the options
differently. Re-measured against it (SPIKE.md section 5, "Rescue"), one hint
takes a player who cannot read the tree from 83% loss to:

| rule | 1 hint |
|---|---|
| split<=1/2 | **50%** |
| split<=1/3 | 34% |
| split<=1/4 | 14% |

1/4 - the ROI winner - overshoots the target by a mile: it turns one press into
a near-win, which is exactly the advantage-over-a-good-player the user objects
to. 1/2 lands on the stated target almost exactly.

## Accepted

1. **Reveal rule: threshold split at 1/2.** `findNextHintCladeId` returns the
   shallowest unrevealed clade in the target's lineage that cuts the live
   candidate set to at most `HINT_SPLIT_FRACTION` of its size, falling back to
   the deepest unrevealed clade when nothing qualifies. `HINT_SPLIT_FRACTION`
   is a single constant so a playtest reversal is a one-line change.
2. **Price: unchanged, `HINT_COST = 3`.** Once the fraction is fixed, price
   barely moves rescue (50% / 51% / 55% at cost 1 / 2 / 3) and becomes purely
   the "is this a bad investment" knob. Cost 1 fails that test (an expert pays
   only +0.2 to +0.4 guesses, i.e. nearly free). The user chose 3: it costs an
   expert +2.2 to +2.4 guesses and a tree-reader +0.5 to +1.3, so it is a bad
   buy for anyone who can play at all, while still rescuing the player who
   cannot. Recommendation had been 2; the user's stronger reading of "desperate
   move" won, and it is defensible on the same numbers.
3. **Hint cap: a generic constant, set to uncapped.** The SECOND hint collapses
   the round to ~4% loss at every fraction and every price, because the lumpy
   ladder means hint two usually lands in a clade of a handful of species. Price
   cannot fix it. Ship the mechanism as `MAX_HINTS`, where `-1` means uncapped
   and any positive integer is a per-round cap, and set it to `-1` for now. The
   knob exists so the collapse can be closed after real play without a redesign.

## Rejected

- **Bottom-up reveal at cost 3** (the original task's option (a)): 4.98 bits
  cold, drops a tree-reader's round from 9.1 to 6.5. A purchase of the answer.
- **Threshold split at 1/4** (the spike's recommendation): wins on ROI, fails
  the rescue bar by being far too generous - 14% loss after one hint.
- **Nearest-to-half split** (the literal "split in halves"): capped at about 1
  bit by construction, the weakest rule measured.
- **Cost 1**: nearly free for an expert, so the hint stops being a bad
  investment.
- **Capping at one hint now**: would close the two-hint collapse, but the user
  preferred to keep the knob open and revisit after real play.

## Consequence recorded elsewhere

The rescue only materialises for a player who can act on a clade NAME. The user
declined to put a clade-to-species mapping in the round (`20260729-141425`,
rejected as making the game too easy) and routed it to the species archive as a
filter instead. So the rescue is real but effortful: the player must leave the
round and look the clade up. That is a deliberate design position, not an
oversight - see `tasks/20260729-141425/DECISION.md`.
