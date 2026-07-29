# Rework hint reveal order and price

- STATUS: OPEN
- PRIORITY: 88
- TAGS: bug,gameplay,design


## Story

As a player who is stuck, I want a hint that is worth what it costs, so that spending guesses on it is a real choice rather than a trap.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F2.2-F2.4), all MEASURED over the real content graph by `scripts/playtest/difficulty.ts`:

- `findNextHintCladeId` (`src/treeBuilder.ts:47`) walks the target's lineage DOWNWARD from the root, so the first hint offered on a fresh board is the second-least-specific clade there is (the root, Dinosauria, is already on screen) - and costs the same 3 guesses as the last.
- Traced: Tyrannosaurus hint 1 reveals `saurischia` (99 of 150 species inside); hint 2 `eusaurischia` (97). Six guesses, a quarter of the budget, to eliminate 53 candidates.
- Buying hints up front never pays for itself. Mean total cost, `consistent` policy: 0 hints 4.7, 1 hint 7.2, 2 hints 10.2, 3 hints 12.7.
- Nor does buying one MID-ROUND, which is the hint's best case (by then the revealed frontier has moved down, so the clade offered is more specific). One hint bought after n guesses, `consistent`: never 4.7, after 1 guess 7.5, after 2 6.8, after 4 5.3, after 6 4.8 - and dividing by the share of rounds that lasted long enough to buy it gives a net **+2.5 to +2.9 guesses per hint actually bought**, out of the 3 it costs.
- The one measured benefit: for the weaker `tree-reader` player a late hint is close to break-even (+0.7 net) and lowers the loss rate from 5.8% to 4.6%. So the hint is a bad buy at every point measured, ruinous up front, and only approaches break-even when a weak player buys one late.
- Hinting down to the target's own clade costs `3 x lineage depth`: median 27 guesses against a 25-guess budget. Only 63/150 targets (42%) are reachable at all; worst is Corythosaurus at 45.

## User Input (20260729)

Recorded verbatim, because it re-framed the task:

> I personally agree with the fact that hints are bad choice, but I wouldn't
> really change them -> keep them top->down + maybe make them cheaper, but
> unsure; I would personally defer this task but record my input for it; or if
> possible but needs a spike/exploration -> hint splits the remaining guesses in
> better halves -> let's actually start a research on making the hint better to
> split guesses

So: the reveal stays top-down, the price is open, and the two-way fork below was
the wrong question. The research ran as `20260729-160500`.

## Direction (from the spike)

`tasks/20260729-160500/SPIKE.md` answers it with numbers from
`scripts/playtest/hint.ts` over the real graph:

- A guess is worth 1.74 bits, so a hint at cost 3 must deliver 5.2 bits - i.e.
  cut 150 species to under 5. Nothing can do that and still be a hint. The price
  is load-bearing.
- The shipped hint delivers 0.92 bits cold and **0.06-0.39 bits mid-round**: it
  is close to empty exactly when a player presses it.
- Literal halving is the WEAKEST split rule (capped at ~1 bit). The winner is a
  threshold split: the shallowest unrevealed lineage clade that cuts the
  candidate set to <= 1/4. It delivers 2.9 bits cold, 1.1 late, offers a median
  of 2 hints per round, and keeps the top-down feel.
- Recommended shape: threshold split at `HINT_SPLIT_FRACTION = 1/4` plus
  `HINT_COST = 2`. Only that combination is net-negative for the tree-reading
  player at every buy point while staying a bad deal for a player who can
  already deduce.

## Steps

- [ ] Confirm with the user, and record in `DECISION.md`, the one fork the spike
      could not settle: this task's old Definition of Done demanded the hint pay
      off for the DEDUCING player, which only cost 1 achieves. Cost 2 helps the
      tree-reader at every buy point and stays a bad deal for the expert. The
      two cannot both hold - accepting cost 2 means rewriting that DoD line
      (SPIKE.md "Open questions").
- [ ] Decide, in the same `DECISION.md`, what a hint does when NO clade meets
      the threshold. That branch fires on ~19% of calls. It is safe by
      construction (what it hands over necessarily holds more than the threshold
      share - measured min 25%, median 67% of the live field), so the choice is
      between handing over the best available narrowing anyway and refusing the
      sale. The spike leans toward handing it over.
- [ ] Implement the threshold split in `findNextHintCladeId`, with the fraction
      as a single constant in `src/constants.ts`, plus the agreed `HINT_COST`.
      The candidate set is derived from the guess history (a species is still
      consistent iff its LCA with each past guess matches what that guess
      showed); no new persisted state.
- [ ] Re-run `npm run playtest:hint` and confirm the agreed break-even bar at
      all three buy points (up front, after 2, after 4), not just up front - the
      stuck player is the one who presses the button.
- [ ] Update the hint affordance copy so it names what a hint does, not only its
      price (coordinate with `20260729-092327`) - there is now a guarantee to
      state.
- [ ] Test the reveal order and the affordability edge (a hint must not be
      purchasable into an unwinnable state).

## Definition of Done

- The hint clears the break-even bar agreed in `DECISION.md`, at all three buy
  points. (cmd: `npm run playtest:hint`)
- The reveal rule matches the decision, over the real payload. (test: Jest test
  that a hint never reveals a clade holding more than the agreed fraction of the
  live candidate set when a qualifying one exists)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Do NOT change `MAX_GUESSES`. The same pass measured 25 as non-binding (0% loss for a deducing player, 5.8% for a tree-reader); the difficulty problem is the hint, not the budget.
- Superseded framing: the original Steps offered a fork between (a) bottom-up at
  cost 3 and (b) top-down at cost 1. The spike measured (a) as a solve button
  (4.98 bits, drops a tree-reader's round from 8.9 to 6.5) and rejected it.
- Spike: `tasks/20260729-160500/SPIKE.md`.
