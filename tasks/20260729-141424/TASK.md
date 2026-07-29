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

## Steps

- [ ] Confirm the build-shape fork with the user and record it in `DECISION.md`. The two candidates are mutually exclusive: (a) reveal from the BOTTOM of the unknown lineage, most specific first, keeping cost 3; or (b) keep the top-down walk and drop the price to 1. They cannot both hold - (a) makes one hint decisive and worth 3, (b) makes each hint cheap and incremental.
- [ ] Implement the chosen shape in `findNextHintCladeId` and/or `HINT_COST`.
- [ ] Re-run `npm run playtest:difficulty` and confirm the hint now pays for itself in BOTH sections: total cost with 1 hint up front below total cost with 0, and the same for one hint bought mid-round. Fixing only the up-front case would leave the stuck player, who is the one who actually presses the button, no better off.
- [ ] Update the hint affordance copy so it names what a hint does, not only its price (coordinate with `20260729-092327`).
- [ ] Test the reveal order and the affordability edge (a hint must not be purchasable into an unwinnable state).

## Definition of Done

- Buying one hint lowers mean total cost versus buying none, both up front and mid-round. (cmd: `npm run playtest:difficulty`)
- The reveal order matches the decision. (test: Jest test over the real payload)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Do NOT change `MAX_GUESSES`. The same pass measured 25 as non-binding (0% loss for a deducing player, 5.8% for a tree-reader); the difficulty problem is the hint, not the budget.
