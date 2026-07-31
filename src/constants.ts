export const MAX_GUESSES = 25;
export const HINT_COST = 3;

// A hint reveals the shallowest clade in the target's lineage that cuts the
// still-possible species to at most this share of the field. Set against a
// RESCUE bar, not a return-on-investment one: 1/2 takes a player who cannot
// read the tree from ~83% loss to ~50%, where 1/3 or 1/4 would take them to
// 34% or 14% - a near-win for one press.
// See tasks/20260729-141424/DECISION.md and tasks/20260729-160500/SPIKE.md.
export const HINT_SPLIT_FRACTION = 0.5;

// Hints allowed per round. -1 means uncapped; any positive integer is a cap.
// Uncapped deliberately: only a cap can close the second-hint collapse, which
// no price fixes, so the mechanism ships ready to become a constant change.
// See tasks/20260729-141424/DECISION.md.
export const MAX_HINTS = -1;
