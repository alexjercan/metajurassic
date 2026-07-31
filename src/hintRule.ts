import { HINT_SPLIT_FRACTION } from "./constants";
import { consistentCandidates, GameState } from "./gameState";
import type { CladeNode, TreeNode } from "./treeBuilder";
import type { Species } from "./types";

/**
 * Find the next clade in the target's lineage that can be revealed as a hint.
 *
 * Of the clades more specific than anything already on screen, this returns the
 * SHALLOWEST one that cuts the still-possible species to at most
 * `HINT_SPLIT_FRACTION` of their current number - so the reveal still walks
 * top-down, one clade at a time, but skips the rungs that eliminate nothing.
 *
 * That skipping is the whole point. The lineage ladder is lumpy: consecutive
 * levels routinely hold ~66% and ~65% of the field, so advancing exactly one
 * level per hint spends a hint on a step worth almost nothing. Measured on the
 * real graph, the old one-level walk delivered 0.06-0.39 bits mid-round, i.e.
 * close to nothing exactly when a stuck player presses the button.
 *
 * When NO unrevealed clade meets the threshold, the deepest unrevealed one is
 * returned instead. That branch fires on ~19% of calls and is safe by
 * construction: it is only reachable when nothing met the threshold, INCLUDING
 * the deepest clade, so what it hands back necessarily holds more than
 * `HINT_SPLIT_FRACTION` of the field. It can under-deliver; it cannot give away
 * the answer.
 *
 * Returns null if every clade in the target's lineage is already revealed
 * (i.e. no further hints can be given).
 *
 * See tasks/20260729-141424/DECISION.md and tasks/20260729-160500/SPIKE.md.
 */
export function findNextHintCladeId(state: GameState): string | null {
    const { gameData, targetId } = state;
    const targetSpecies = gameData.findSpeciesById(targetId);
    if (!targetSpecies) return null;

    const targetLineage = gameData.lineage(targetSpecies.clade);
    if (targetLineage.length === 0) return null;

    // Reproduces `buildGuessTree`'s reveal set in treeBuilder.ts; the two must
    // agree or a hint names a clade the board does not show.
    const rootCladeId = targetLineage[targetLineage.length - 1];
    const revealedClades = new Set<string>();
    revealedClades.add(rootCladeId);

    for (const hintCladeId of state.hintClades) {
        revealedClades.add(hintCladeId);
    }

    const guessedSpecies: Species[] = [];
    for (const guessId of state.guesses) {
        const sp = gameData.findSpeciesById(guessId);
        if (sp) guessedSpecies.push(sp);
    }

    for (const guess of guessedSpecies) {
        if (guess.id === targetId) continue;
        const lca = gameData.computeLCA(targetId, guess.id);
        if (lca) revealedClades.add(lca);
    }

    // The lineage is ordered [immediate_clade, parent, ..., root].
    // Find the deepest (most specific) clade that is already revealed.
    // A useful hint must be strictly more specific than that clade, so we
    // only consider clades at a lower index.  If no unrevealed clade exists
    // below the current deepest revealed one the hint would be *less*
    // specific than what the player already knows, which is pointless.
    let deepestRevealedIdx = -1;
    for (let i = 0; i < targetLineage.length; i++) {
        if (revealedClades.has(targetLineage[i])) {
            deepestRevealedIdx = i;
            break;
        }
    }

    // No revealed clade at all - shouldn't happen (root is always revealed)
    if (deepestRevealedIdx < 0) return null;

    const candidates = consistentCandidates(state);
    const cutoff = Math.max(
        1,
        Math.floor(candidates.length * HINT_SPLIT_FRACTION)
    );

    let fallback: string | null = null;
    for (let i = deepestRevealedIdx - 1; i >= 0; i--) {
        const cladeId = targetLineage[i];
        if (revealedClades.has(cladeId)) continue;

        fallback = cladeId;

        const inside = candidates.filter((s) =>
            gameData.lineage(s.clade).includes(cladeId)
        ).length;
        if (inside <= cutoff) return cladeId;
    }

    return fallback;
}

/**
 * Walk the tree to find the clade node that is the direct parent of the "?"
 * placeholder. This is the deepest revealed clade in the target's lineage -
 * i.e. the best hint the player has uncovered so far.
 * Returns the cladeId, or null if no placeholder exists (e.g. game is won).
 */
export function findBestHintCladeId(roots: CladeNode[]): string | null {
    function walk(node: TreeNode): string | null {
        if (node.type === "species") return null;
        for (const child of node.children) {
            if (
                child.type === "species" &&
                child.isTarget &&
                child.isPlaceholder
            ) {
                return node.cladeId;
            }
        }
        for (const child of node.children) {
            if (child.type === "clade") {
                const result = walk(child);
                if (result) return result;
            }
        }
        return null;
    }

    for (const root of roots) {
        const result = walk(root);
        if (result) return result;
    }
    return null;
}
