export const MAX_GUESSES = 25;
export const HINT_COST = 3;

// A hint reveals the shallowest clade in the target's lineage that cuts the
// still-possible species to at most this share of the field. Measured against a
// RESCUE bar rather than a return-on-investment one: one hint takes a player who
// cannot read the tree from ~83% loss to ~50%, which is the intent - a hint is a
// desperate move, not an edge. Tightening it to 1/3 or 1/4 takes that player to
// 34% or 14%, i.e. a near-win for one press, which is why this is 1/2.
// See tasks/20260729-141424/DECISION.md and tasks/20260729-160500/SPIKE.md.
export const HINT_SPLIT_FRACTION = 0.5;

// Hints allowed per round. -1 means uncapped; any positive integer is a cap.
//
// Uncapped for now, deliberately: the SECOND hint collapses the round to ~4%
// loss at every fraction and every price, because the lineage ladder is lumpy
// enough that hint two usually lands in a clade of a handful of species. No
// price fixes that - only a cap does. The mechanism ships now so closing the
// collapse after real play is a constant change rather than a redesign.
export const MAX_HINTS = -1;
