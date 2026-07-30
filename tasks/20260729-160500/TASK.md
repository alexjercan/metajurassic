# Spike: make the hint split the remaining candidates

- STATUS: CLOSED
- PRIORITY: 88
- TAGS: spike,gameplay,design
- KIND: SPIKE
- FLOW STEP: DONE
- PLAN STATUS: APPROVED


## Question

`20260729-141424` measured the hint as a bad buy and framed the fix as a
two-way fork (bottom-up at cost 3, or top-down cheaper). The user rejected that
framing and asked for research instead: keep the top-down reveal, maybe make it
cheaper, and find out whether a hint can be made to SPLIT the remaining
candidates well rather than advance one lineage level at a time.

## Result

RECOMMENDED. See `SPIKE.md` for the full research.

- A guess is worth 1.74 bits on the real graph, so a hint at cost 3 must
  deliver 5.2 bits - i.e. narrow 150 species to under 5. No selection rule can
  do that without being a solve button, so the PRICE is load-bearing, not only
  the reveal order.
- The shipped hint delivers 0.92 bits cold and 0.06-0.39 bits mid-round,
  because the lineage ladder has near-duplicate levels and the guesses already
  made push the frontier past the rungs that cut.
- Literal halving is the weakest split rule (about 1 bit by construction).
  A threshold split - shallowest lineage clade that cuts the field to <= 1/4 -
  delivers 2.9 bits cold and 1.1 late, offers a median of 2 hints per round, and
  keeps the top-down feel.
- Recommendation: threshold split at `HINT_SPLIT_FRACTION = 1/4` plus
  `HINT_COST = 2`. That is the only combination measured that helps the
  tree-reading player at every buy point while staying a bad deal for a player
  who can already deduce.

## Evidence

`scripts/playtest/hint.ts` (`npm run playtest:hint`), added by this spike. It
imports the shipped `computeLCA`, `GameState` and `findNextHintCladeId`, and
verifies its reproduction of the shipped rule against the real function on every
run (548/548 agree).

## Notes

- Follow-up lives in `20260729-141424`, rewritten to carry this direction.
- One open fork needs the user: that task's Definition of Done currently demands
  the hint pay off for the DEDUCING player, which only cost 1 achieves. See
  SPIKE.md "Open questions".
