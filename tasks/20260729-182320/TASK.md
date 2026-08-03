# Rank-ladder summary of what the guesses have narrowed

- PRIORITY: 58
- TAGS: feature, ux, gameplay
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a player mid-round, I want a compact summary of what my guesses have established, so that I can see how far the answer still is instead of re-reading the tree each turn.

## Review Findings

- REFERENCE (`tasks/20260729-092452/NOTES.md`, section 1.7): Metazooa ships a `Show table` toggle that swaps the tree for a table over the answer's rank ladder - columns `Rank`, `Name`, `Guesses`, `Hints`, orderings `Summary` and `Chronological`, and a `Return to tree` link. Its ladder ends in a `???` species row, so the player can see how many ranks still separate them from the answer.
- Metajurassic has no equivalent. The tree shows the revealed chain, so a player can see WHERE they are but not HOW FAR is left.
- The information is not free. Depth-to-target is real difficulty information: `20260729-092435` F1.3 measured the candidate field collapsing to a median of 3 by guess 3 for a deducing player, and showing remaining depth would speed that further.

## Steps

- [x] DECIDE FIRST, and record it in a `DECISION.md` before building: should Metajurassic give the player depth-to-target at all? DONE 20260803 - the user chose option B, the ladder over the REVEALED lineage only. `DECISION.md` also fixes the second fork (rows are the target's chain only; every guess is attributed to its join clade). `NOTES.md` holds the build plan the steps below execute.
- [ ] Write `test/rankLadder.test.ts` FIRST against `test/treeFixtures.ts`'s synthetic tree (node env, no DOM): row order root -> deepest, per-row guess buckets, per-row provenance (`root` / guesses / hint), the header counts, a guess whose tree bucket is an off-chain pairwise LCA rolling up to its nearest chain ancestor, and the invariant that NO clade outside the revealed chain and NO unrevealed clade ever appears.
- [ ] Add `src/rankLadder.ts`: `buildRankLadder(state: GameState, roots: CladeNode[]) -> LadderRow[]`. Pure, no DOM, no new state. Walks the `CladeNode[]` `buildGuessTree` already returned rather than re-traversing the graph; carries each guess's existing `SpeciesNode.closenessTier` through untouched so the card, the board and the share grid cannot disagree.
- [ ] Add `src/ui/ladderCard.ts`: `buildLadderCard(rows) -> HTMLElement`, mirroring `createCladeCard`'s shape in `src/ui/card.ts` and mounted with the existing `mountCard`. Keep it dumb - jest excludes `src/ui/**` from coverage, so every decision belongs in `rankLadder.ts` (same argument as `SpeciesNode.closenessTier`'s doc comment).
- [ ] Add the `Info` / `Summary` tab strip to `#info-panel` in `src/index.html`, above `#panel-card-container`. NOTE: `webpack.config.js` registers this template twice, as the daily page and as `/practice/`; the summary is valid in both, so it ships active rather than `hidden`.
- [ ] Wire the tabs in `src/ui/panel.ts`: tab state plus `renderLadderCard(state, data, roots)`, defaulting to `Info` so a player who never taps `Summary` sees today's game unchanged. Do NOT route through `openPanel()` - it also clears `manuallyClosedPanel` (LESSONS.md read-the-helper-body-not-its-name-before-reusing-it), the exact trap `renderLastGuess` already documents.
- [ ] Call the summary render from `updateUI()` in `src/game/index.ts`, reusing the `roots` already built there for `renderLastGuess` and `renderTree`. One `buildGuessTree` call per update, as today.
- [ ] Style the tab strip and the ladder rows in `src/partials/panel.css`. No new partial, so `src/style.css` stays untouched; touch `src/partials/responsive.css` only if the strip needs a narrow-viewport height, and keep it last in the cascade.
- [ ] Add `e2e/ladder.spec.ts` (Pixel 5, alongside `e2e/mobile.spec.ts`): seed a round with the existing `e2e/helpers/` round helpers, open the panel, switch to `Summary`, and assert the card does not occlude the tree and that its deepest row is a revealed clade with no `???` row present.
- [ ] One ordering only (`Summary`); `Chronological` stays out of scope (`20260729-092452` NOTES section 5). No `Return to tree` link - the tree is never replaced.

## Definition of Done

- A `DECISION.md` records the depth-to-target fork and the user's call. (cmd: `test -s tasks/20260729-182320/DECISION.md`) - already green as of 20260803.
- The ladder never leaks depth-to-target: no unrevealed clade, no `???` row, no remaining-rank count on the surface. (test: `test/rankLadder.test.ts` invariant case; red on base - the module does not exist)
- A guess bucketed under an off-chain pairwise LCA still appears exactly once, under its join clade. (test: `test/rankLadder.test.ts` roll-up case)
- The summary mounts in the existing panel behind the `Info` / `Summary` tabs, with `Info` still the default. (cmd: `grep -q 'panel-tab' src/index.html`; red on base)
- The surface does not occlude the tree on a phone. (test: `e2e/ladder.spec.ts` on Pixel 5; red on base - the spec does not exist)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Filed by `20260729-092452` (Metazooa alignment) at LOW priority on purpose: it is the least certain of the alignment findings, and closing it as "decided not to build, here is why" is a legitimate outcome.
- Related: `20260729-141425` (clade membership) is the other "give the player more information" decision. They should be decided consistently - both trade difficulty for legibility.
