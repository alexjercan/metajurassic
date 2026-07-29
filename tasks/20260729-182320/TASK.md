# Rank-ladder summary of what the guesses have narrowed

- STATUS: OPEN
- PRIORITY: 58
- TAGS: feature,ux,gameplay

## Story

As a player mid-round, I want a compact summary of what my guesses have established, so that I can see how far the answer still is instead of re-reading the tree each turn.

## Review Findings

- REFERENCE (`tasks/20260729-092452/NOTES.md`, section 1.7): Metazooa ships a `Show table` toggle that swaps the tree for a table over the answer's rank ladder - columns `Rank`, `Name`, `Guesses`, `Hints`, orderings `Summary` and `Chronological`, and a `Return to tree` link. Its ladder ends in a `???` species row, so the player can see how many ranks still separate them from the answer.
- Metajurassic has no equivalent. The tree shows the revealed chain, so a player can see WHERE they are but not HOW FAR is left.
- The information is not free. Depth-to-target is real difficulty information: `20260729-092435` F1.3 measured the candidate field collapsing to a median of 3 by guess 3 for a deducing player, and showing remaining depth would speed that further.

## Steps

- [ ] DECIDE FIRST, and record it in a `DECISION.md` before building: should Metajurassic give the player depth-to-target at all? The options are not interchangeable - a ladder that shows unrevealed ranks as `???` rows hands out a number the tree deliberately withholds, while a ladder over only the REVEALED lineage is a restatement of the tree and may not be worth a surface. Confirm the artifact with the user.
- [ ] If it proceeds: build the chosen surface, reusing the lineage the tree already computes (`src/treeBuilder.ts`) rather than a second traversal.
- [ ] One ordering only to start; the second ordering is deliberately out of scope (`20260729-092452` NOTES section 5).
- [ ] Decide the placement against the existing panel/pull-tab vocabulary - the note warns against introducing a second competing "there is something to read" affordance.
- [ ] Tests for the summary contents over a seeded round.

## Definition of Done

- A `DECISION.md` records the depth-to-target fork and the user's call. (cmd: `test -s tasks/<id>/DECISION.md`)
- If built: the surface matches the decision and does not occlude the tree on a phone. (test: browser E2E layout test)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Filed by `20260729-092452` (Metazooa alignment) at LOW priority on purpose: it is the least certain of the alignment findings, and closing it as "decided not to build, here is why" is a legitimate outcome.
- Related: `20260729-141425` (clade membership) is the other "give the player more information" decision. They should be decided consistently - both trade difficulty for legibility.
