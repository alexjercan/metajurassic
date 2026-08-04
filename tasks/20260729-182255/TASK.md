# Colour the tree by guess closeness

- PRIORITY: 78
- TAGS: feature, ux, gameplay
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player reading the tree, I want a guess that landed close to the answer to LOOK closer than one that only met it at the root, so that the board teaches me the same closeness language I paste in the share message.

## Review Findings

- `renderTree` (`src/ui/treeVisualizer.ts:23-32`) tags nodes `node-clade`, `node-root`, `node-species`, `node-mystery`, `node-winner`, `node-revealed`, and `src/style.css` colours those by node KIND. Every guessed species renders the same blue whether it joined the target at the root or one rank away.
- The game already HAS a closeness metric and a five-tier scale: `20260729-101823` built one for the share grid from `computeLCA` over the target's lineage (`(lineage.length - idx) / lineage.length`), sampled over the real content graph.
- REFERENCE (`tasks/20260729-092452/NOTES.md`): Metazooa runs a single green-to-red closeness scale keyed on taxonomic distance across its graph, its summary table AND its share squares. Metajurassic speaks that language only in the share text, so the grid a player pastes uses an encoding the board never taught them.

## Steps

- [x] Create `src/closeness.ts` as the single source of the closeness scale: move `guessCloseness` there out of `src/gameState.ts`, and add `closenessTier(closeness): number` returning a 0..4 tier index plus a `CLOSENESS_TIER_COUNT` export. The tier BOUNDARIES live here and nowhere else.
- [x] Re-point `src/gameState.ts` at it: `CLOSENESS_TIERS` becomes a `CLOSENESS_CELLS` array indexed BY tier, and `closenessCell` becomes `CLOSENESS_CELLS[closenessTier(x)]`. Re-export `guessCloseness` from `gameState.ts` only if an existing caller needs it (grep first); prefer moving the callers.
- [x] Carry the tier on the tree DATA, not in the renderer: add `closenessTier?: number` to `SpeciesNode` and set it in `buildGuessTree`/`buildCladeSubtree` for guessed, non-target species. `renderTree` then mechanically maps it to a class. This is why: jest runs `testEnvironment: "node"` with no jsdom, and `src/ui/**` is excluded from coverage, so a tier computed in the renderer could not be pinned by a Jest test at all.
- [x] `renderTree` (`src/ui/treeVisualizer.ts`) adds `node-close-<tier>` to a species box when `closenessTier` is set. The target's node never carries one, in any of its three states (mystery placeholder, winner, revealed) - the share grid spends `🦖` on the correct guess, not a tier, so the board agrees by giving it no temperature either.
- [x] Palette (DECIDED, see DECISION.md): mirror the share-grid emoji hues so the board and the paste are literally the same five colours. tier 0 grey `#6b7280`, tier 1 blue `#5b7199` (today's `node-species` blue), tier 2 yellow `#d8c04a`, tier 3 orange `#e08a3c`, tier 4 green `#4ca86a`. Each tier is a solid border + `rgba(hue, 0.14)` tint fill + a lightened hue for the text. The tint fill is the mitigation for the one collision this creates: tier-3 orange sits near `--amber-glow` `#e6a861`, and clade nodes keep the flat dark `--node-bg`, so kind stays readable.
- [x] CSS placement: the `.node-close-*` block goes AFTER `.node-species` (equal specificity, so file order decides) and BEFORE `.node-mystery`/`.node-winner`/`.node-revealed`, which must keep winning. Check the `@media (max-width: 768px)` block too - see `LESSONS.md` `css-media-blocks-on-different-axes-are-resolved-by-file-order`.
- [x] Scope (DECIDED): guessed species only. Clade nodes keep their amber - the share grid is one cell per guess, and the amber is what keeps clade-vs-species readable once species start wearing hues.
- [x] Jest tier parity, over the real `src/jurassic/index.json`: for the `test/share.test.ts` LADDER (Stegosaurus/Brachiosaurus/Allosaurus/Guanlong/Albertosaurus vs Tyrannosaurus, one per tier), the `closenessTier` on the node `buildGuessTree` produces indexes the SAME cell the share grid prints for that guess. Assert `CLOSENESS_CELLS.length === CLOSENESS_TIER_COUNT` so adding a tier without a cell fails.
- [x] Jest: the target's node carries no tier in all three states - unsolved placeholder, `revealTarget` on a win, `revealTarget` on a loss.
- [x] Jest: every tier index has a `.node-close-N` rule in `src/style.css` (read the file, loop `0..CLOSENESS_TIER_COUNT-1`), so a sixth tier cannot ship uncoloured.
- [x] E2E (`e2e/tree.spec.ts` or a new `closeness.spec.ts`): a seeded practice round where two guesses of known different closeness render different `node-close-*` classes, and the mystery node carries none. Pick the seed by running the real game data, not by guessing.
- [x] Screenshot desktop AND phone after the CSS lands and LOOK - the tinted species against the amber clades, the mystery red, and a won board's gold. `LESSONS.md` `re-render-and-look-after-every-layout-change-not-once-per-task`.

## Definition of Done

- Guessed species nodes are coloured by closeness, using the same tiers as the share grid. (test: Jest tier-parity test over the real payload)
- The tree and share tiers come from ONE function; a change to the tiers moves both. (test: Jest tier-parity + `CLOSENESS_CELLS.length === CLOSENESS_TIER_COUNT`; cmd: `grep -rn "guessTier" src/ --include=*.ts | grep -v "^src/closeness.ts"` shows exactly the two call sites, `src/gameState.ts` and `src/treeBuilder.ts`)
- The target's node never carries a closeness class, in any of its three states. (test: Jest)
- Every tier index has a CSS rule. (test: Jest reads `src/style.css`)
- Two guesses of different closeness render different classes in the real browser. (test: Playwright, seeded practice round)
- The mystery node and the winning node stay visually distinct from the closeness scale. (manual: desktop and phone screenshots, inspected)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Verification

Run on the branch, against the code being committed.

- `E2E_PORT=8181 nix develop -c npm run ci`: green. 236 Jest tests in 14 suites, 78 Playwright tests (1 pre-existing `test.fixme` skipped), format and lint clean. The 8181 port is the parallel-worktree escape hatch from AGENTS.md; 8080 was checked free first with `ss -ltnp`.
- Absence-proving greps, EXECUTED (not reasoned):
  - `grep -rn "guessTier" src/ --include=*.ts | grep -v "^src/closeness.ts"` -> `src/gameState.ts:1,340` and `src/treeBuilder.ts:2,375`. Exactly the two surfaces, one function.
  - The originally planned `grep -n "below\|0\.2" src/gameState.ts` was NARROWED after being run: it hits an unrelated comment at `gameState.ts:91` about the puzzle-id modulus, so it can never go clean and is not a proof. Replaced with the caller grep above, which can. (LESSONS.md `absence-proving-greps-must-be-run-when-written`.)
- The two new tests were shown to DISCRIMINATE, by running them against the thing they must reject (mutations restored from copies, not `git checkout`):
  - Moved the `.node-close-*` block ABOVE `.node-species` in `style.css`. `e2e/closeness.spec.ts` failed with `the five tiers painted ["rgb(91, 113, 153)","rgb(91, 113, 153)","rgb(91, 113, 153)","rgb(91, 113, 153)","rgb(91, 113, 153)"]` - all five collapsed to the species blue, which is exactly the claim the spec's comment makes about stylesheet order.
  - Drifted the board's tier one step from the grid's, `Math.max(0, guessTier(...) - 1)` in `buildGuessTree`. `test/closeness.test.ts` failed on the parity test and the ladder test; the other 10 stayed green, so the failure is specific.
  - CORRECTED IN ROUND 1 (R1.1): the line above originally described the mutation as the UNCLAMPED `guessTier(...) - 1`, which is not what was run. The distinction turned out to matter. The clamp collapses tiers 0 and 1 onto the same value, which is what tripped the ladder test's old set-size check; the unclamped shift keeps five distinct ascending values and slipped past it (re-run here: 1 failed, 11 passed). The ladder test now asserts the EXACT tiers `[0..CLOSENESS_TIER_COUNT-1]`, so both forms of drift fail, and the unclamped mutation was re-run against the strengthened test to confirm it.
- Manual look (desktop 1280x720 and Pixel 5), mid-round and won, on the seed-42 practice round:
  - The tint fill does the job DECISION.md assigned it. Clade nodes (Averostra, Coelurosauria, Ornithomimidae) are amber on the flat dark `--node-bg`; tier-3 Yutyrannus is amber-adjacent in hue but sits on a warm brown fill, so kind reads at a glance even where hue nearly matches.
  - Winner: `Struthiomimus` renders as solid filled gold with its glow, immediately beside tier-4 green `Gallimimus`. Filled-bright vs outline-plus-tint - no chance of reading the winner as a point on the scale.
  - Mystery: dashed red with the pulse, unchanged, and there is no red anywhere in the closeness scale for it to compete with.
  - The screenshot rig was a throwaway spec, deleted before commit; the standing browser proof is `e2e/closeness.spec.ts`.

## Notes

- Filed by `20260729-092452` (Metazooa alignment). Full reasoning and the reference capture are in `tasks/20260729-092452/NOTES.md`, section 2 "after the first guess".
- This is the highest-value alignment change the note found: it makes the board itself say "warmer/colder", which is the thing the tree currently cannot say.
- Sequencing: independent of the onboarding task, but if both land, the onboarding copy can lean on the colour instead of explaining it.
