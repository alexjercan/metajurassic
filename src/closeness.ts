import { GameData } from "./gameData";

/**
 * How close a guess landed, as a fraction of the target's lineage: 1.0 means
 * the guess shares the target's own clade, ~1/depth means the two only meet at
 * the root. Spoiler-free - it reveals how deep the join was, never which clade.
 *
 * Deliberately NOT exported: `guessTier` is the only caller, and keeping the
 * raw fraction inside the module means "the tier boundaries live here and
 * nowhere else" is enforced by the module boundary rather than by this comment
 * - nothing outside can bucket a closeness its own way. Found in review, R1.4.
 */
function guessCloseness(
    gameData: GameData,
    guessId: string,
    targetId: string
): number {
    const target = gameData.findSpeciesById(targetId);
    if (!target) return 0;

    const lineage = gameData.lineage(target.clade);
    if (lineage.length === 0) return 0;

    const lca = gameData.computeLCA(guessId, targetId);
    if (!lca) return 0;

    // `lineage` runs target-clade-first, so index 0 is the deepest join.
    const index = lineage.indexOf(lca);
    if (index < 0) return 0;

    return (lineage.length - index) / lineage.length;
}

/**
 * The upper bound of each tier, cold first. THIS ARRAY IS THE SCALE - it is the
 * only place the boundaries are written down, so the share grid's cells
 * (`CLOSENESS_CELLS` in gameState.ts) and the board's colours (`.node-close-*`
 * in style.css) cannot drift apart: both index what `closenessTier` returns.
 * Adding a tier here without a cell or a CSS rule fails test/closeness.test.ts.
 */
const TIER_UPPER_BOUNDS = [0.2, 0.4, 0.6, 0.8, Infinity];

export const CLOSENESS_TIER_COUNT = TIER_UPPER_BOUNDS.length;

/**
 * Which tier a closeness falls in: 0 is the coldest (the guess met the target
 * only near the root), CLOSENESS_TIER_COUNT - 1 the hottest. Anything above the
 * last finite bound - including a nonsensically large input - lands in the top
 * tier rather than off the end of the scale.
 */
export function closenessTier(closeness: number): number {
    const tier = TIER_UPPER_BOUNDS.findIndex((bound) => closeness <= bound);
    return tier < 0 ? CLOSENESS_TIER_COUNT - 1 : tier;
}

/**
 * The tier a guess earns against the target. The one call both surfaces make:
 * `buildGuessTree` for the node's colour, `buildShareGrid` for the cell.
 */
export function guessTier(
    gameData: GameData,
    guessId: string,
    targetId: string
): number {
    return closenessTier(guessCloseness(gameData, guessId, targetId));
}
