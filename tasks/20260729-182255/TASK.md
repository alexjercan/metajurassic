# Colour the tree by guess closeness

- STATUS: OPEN
- PRIORITY: 78
- TAGS: feature,ux,gameplay

## Story

As a player reading the tree, I want a guess that landed close to the answer to LOOK closer than one that only met it at the root, so that the board teaches me the same closeness language I paste in the share message.

## Review Findings

- `renderTree` (`src/ui/treeVisualizer.ts:23-32`) tags nodes `node-clade`, `node-root`, `node-species`, `node-mystery`, `node-winner`, `node-revealed`, and `src/style.css` colours those by node KIND. Every guessed species renders the same blue whether it joined the target at the root or one rank away.
- The game already HAS a closeness metric and a five-tier scale: `20260729-101823` built one for the share grid from `computeLCA` over the target's lineage (`(lineage.length - idx) / lineage.length`), sampled over the real content graph.
- REFERENCE (`tasks/20260729-092452/NOTES.md`): Metazooa runs a single green-to-red closeness scale keyed on taxonomic distance across its graph, its summary table AND its share squares. Metajurassic speaks that language only in the share text, so the grid a player pastes uses an encoding the board never taught them.

## Steps

- [ ] Extract the share grid's closeness computation into a reusable function so the tree and the share text cannot drift apart (currently inside `src/gameState.ts`).
- [ ] Apply a closeness class or custom property to guessed species nodes in `renderTree`, using the same tier boundaries as the share grid.
- [ ] Choose a palette that survives the existing dark board. Get the direction right: `CLOSENESS_TIERS` (`src/gameState.ts`) runs COLD `⬛`/`🟦` through `🟨`/`🟧` to HOT `🟩` - green is the closest tier, and there is no red anywhere in the Metajurassic grid (Metazooa is oriented the same way - green at distance 0 - and differs only at the cold end, which is red there; the grid is the thing the tree must agree with). The collision to watch is therefore the green hot end against `node-winner` gold, plus keeping `node-mystery` red legible as "the unknown target" rather than as a temperature.
- [ ] Decide whether clade nodes get the treatment too, or only guessed species (the share grid is per-guess, so species-only is the faithful mapping).
- [ ] Jest: the tier of a rendered node matches the tier of the same guess in the share grid, over the real `src/jurassic/index.json`.
- [ ] E2E: a seeded round where two guesses of different closeness render different classes.

## Definition of Done

- Guessed species nodes are coloured by closeness, using the same tiers as the share grid. (test: Jest tier-parity test over the real payload)
- The tree and share tiers come from ONE function; a change to the tiers moves both. (test: Jest; cmd: the extracted function has both call sites)
- The mystery node and the winning node stay visually distinct from the closeness scale. (manual: inspect desktop and mobile)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Filed by `20260729-092452` (Metazooa alignment). Full reasoning and the reference capture are in `tasks/20260729-092452/NOTES.md`, section 2 "after the first guess".
- This is the highest-value alignment change the note found: it makes the board itself say "warmer/colder", which is the thing the tree currently cannot say.
- Sequencing: independent of the onboarding task, but if both land, the onboarding copy can lean on the colour instead of explaining it.
