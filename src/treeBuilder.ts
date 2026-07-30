import { GameData } from "./gameData";
import { guessTier } from "./closeness";
import { HINT_SPLIT_FRACTION } from "./constants";
import { consistentCandidates, GameState } from "./gameState";
import type { Species } from "./types";

type NodeBase = {
    id: string;
    name: string;
    parentId?: string;
};

export type TreeNode = CladeNode | SpeciesNode;

export type CladeNode = NodeBase & {
    type: "clade";
    cladeId: string;
    children: TreeNode[];
};

export type SpeciesNode = NodeBase & {
    type: "species";
    speciesId: string;
    isTarget: boolean;
    isPlaceholder: boolean;
    isRevealed: boolean;
    /**
     * How warm this guess was, on the same 0..CLOSENESS_TIER_COUNT-1 scale the
     * share grid's cells are indexed by, so the board and the pasted grid say
     * the same thing about the same guess.
     *
     * Undefined on the TARGET's node in all three of its states - unsolved
     * placeholder, winner, revealed-after-a-loss. The grid spends `🦖` there
     * rather than a tier, and the gold and the red are their own encodings;
     * giving them a temperature too would make them read as points on the
     * warm/cold scale. See tasks/20260729-182255/DECISION.md.
     *
     * The tier lives on the DATA rather than being computed in `renderTree`
     * because jest excludes `src/ui/**` from coverage, and its DEFAULT
     * environment is `testEnvironment: "node"` - jsdom exists since
     * 20260729-092352 but only per file, via an `@jest-environment jsdom`
     * docblock. A tier computed in the renderer would still be the harder
     * thing to pin.
     */
    closenessTier?: number;
    children: [];
};

export function isCladeNode(node: TreeNode): node is CladeNode {
    return node.type === "clade";
}

export function isSpeciesNode(node: TreeNode): node is SpeciesNode {
    return node.type === "species";
}

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

    // Build the current set of revealed clades (same logic as buildGuessTree)
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

    // No revealed clade at all — shouldn't happen (root is always revealed)
    if (deepestRevealedIdx < 0) return null;

    const candidates = consistentCandidates(state);
    const cutoff = Math.max(
        1,
        Math.floor(candidates.length * HINT_SPLIT_FRACTION)
    );

    // Walk from just below the deepest revealed clade toward the most specific
    // clade. Return the first (shallowest) unrevealed clade that cuts the
    // candidate set to the cutoff, remembering the deepest unrevealed clade as
    // the fallback for when none of them does.
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
 * placeholder. This is the deepest revealed clade in the target's lineage —
 * i.e. the best hint the player has uncovered so far.
 * Returns the cladeId, or null if no placeholder exists (e.g. game is won).
 */
export function findBestHintCladeId(roots: CladeNode[]): string | null {
    function walk(node: TreeNode): string | null {
        if (node.type === "species") return null;
        // Check if any direct child is the "?" placeholder
        for (const child of node.children) {
            if (
                child.type === "species" &&
                child.isTarget &&
                child.isPlaceholder
            ) {
                return node.cladeId;
            }
        }
        // Recurse into child clades
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

export function buildGuessTree(
    state: GameState,
    revealTarget = false
): CladeNode[] {
    const { gameData, targetId, guesses } = state;
    const targetSpecies = gameData.findSpeciesById(targetId);
    if (!targetSpecies) return [];

    // Find the root clade (last in the target's lineage)
    const targetLineage = gameData.lineage(targetSpecies.clade);
    if (targetLineage.length === 0) return [];
    const rootCladeId = targetLineage[targetLineage.length - 1];

    // Collect all guessed species (excluding the target itself for LCA computation)
    const guessedSpecies: Species[] = [];
    for (const guessId of guesses) {
        const sp = gameData.findSpeciesById(guessId);
        if (sp) guessedSpecies.push(sp);
    }

    // Determine the set of clades that should be revealed in the tree.
    // A clade is revealed if:
    //   - It is the root clade, OR
    //   - It is the LCA between the target and a guess, OR
    //   - It is on the path between the root and an LCA clade, OR
    //   - It is the lowest common ancestor among guessed species that share a clade
    //   - It was revealed by a hint
    const revealedClades = new Set<string>();
    revealedClades.add(rootCladeId);

    // Add hint-revealed clades
    for (const hintCladeId of state.hintClades) {
        revealedClades.add(hintCladeId);
    }

    if (guessedSpecies.length === 0) {
        // No guesses: just root with a placeholder
        return [
            buildCladeSubtree(
                gameData,
                rootCladeId,
                targetSpecies,
                [],
                revealedClades,
                revealTarget
            ),
        ];
    }

    // Compute LCA between target and each non-target guess
    const lcaClades = new Set<string>();
    for (const guess of guessedSpecies) {
        if (guess.id === targetId) continue;
        const lca = gameData.computeLCA(targetId, guess.id);
        if (lca) lcaClades.add(lca);
    }

    // Add all LCA clades (but NOT intermediate path clades)
    for (const lcaId of lcaClades) {
        revealedClades.add(lcaId);
    }

    // Also find common clades among guessed species to group them
    // For each pair of guessed (non-target) species, compute their LCA
    const nonTargetGuesses = guessedSpecies.filter((s) => s.id !== targetId);
    for (let i = 0; i < nonTargetGuesses.length; i++) {
        for (let j = i + 1; j < nonTargetGuesses.length; j++) {
            const lca = gameData.computeLCA(
                nonTargetGuesses[i].id,
                nonTargetGuesses[j].id
            );
            if (lca) {
                revealedClades.add(lca);
            }
        }
    }

    return [
        buildCladeSubtree(
            gameData,
            rootCladeId,
            targetSpecies,
            guessedSpecies,
            revealedClades,
            revealTarget
        ),
    ];
}

/**
 * Recursively builds a CladeNode subtree for a given clade.
 * Only includes child clades that are in the revealedClades set.
 * Places species leaves where appropriate.
 */
function buildCladeSubtree(
    gameData: GameData,
    cladeId: string,
    targetSpecies: Species,
    guessedSpecies: Species[],
    revealedClades: Set<string>,
    revealTarget: boolean,
    parentId?: string
): CladeNode {
    const clade = gameData.findCladeById(cladeId);
    if (!clade) {
        throw new Error(`Clade ${cladeId} not found`);
    }
    const nodeId = `clade-${cladeId}`;

    const cladeNode: CladeNode = {
        id: nodeId,
        name: clade.name,
        type: "clade",
        cladeId: clade.id,
        parentId,
        children: [],
    };

    // Find which revealed clades are direct children of this clade
    const childClades: string[] = [];
    for (const revCladeId of revealedClades) {
        if (revCladeId === cladeId) continue;
        const revClade = gameData.findCladeById(revCladeId);
        if (!revClade) continue;

        // Check if this revealed clade's nearest revealed ancestor is the current clade
        if (
            getNearestRevealedAncestor(gameData, revCladeId, revealedClades) ===
            cladeId
        ) {
            childClades.push(revCladeId);
        }
    }

    // Find which guessed species belong directly under this clade
    // (i.e., their lineage hits this clade before hitting any child revealed clade)
    const directSpecies: Species[] = [];
    for (const sp of guessedSpecies) {
        const nearestClade = getNearestRevealedClade(
            gameData,
            sp,
            revealedClades
        );
        if (nearestClade === cladeId) {
            directSpecies.push(sp);
        }
    }

    // Check if the target belongs directly under this clade
    const targetNearestClade = getNearestRevealedClade(
        gameData,
        targetSpecies,
        revealedClades
    );
    const targetIsDirectChild = targetNearestClade === cladeId;

    // Build child clade nodes
    for (const childCladeId of childClades) {
        cladeNode.children.push(
            buildCladeSubtree(
                gameData,
                childCladeId,
                targetSpecies,
                guessedSpecies,
                revealedClades,
                revealTarget,
                nodeId
            )
        );
    }

    // Add direct species leaves
    for (const sp of directSpecies) {
        const isTarget = sp.id === targetSpecies.id;
        cladeNode.children.push({
            id: `species-${sp.id}`,
            name: sp.species,
            type: "species",
            speciesId: sp.id,
            isTarget,
            isPlaceholder: false,
            isRevealed: false,
            // The target is the answer, not a temperature; see the field's doc
            // comment on SpeciesNode.
            closenessTier: isTarget
                ? undefined
                : guessTier(gameData, sp.id, targetSpecies.id),
            parentId: nodeId,
            children: [],
        });
    }

    // Add the target placeholder/revealed node if it belongs here
    if (targetIsDirectChild) {
        const targetAlreadyAdded = directSpecies.some(
            (s) => s.id === targetSpecies.id
        );
        if (!targetAlreadyAdded) {
            // Target is not in guessed species, show as placeholder or revealed
            cladeNode.children.push({
                id: `species-${targetSpecies.id}`,
                name: revealTarget ? targetSpecies.species : "?",
                type: "species",
                speciesId: targetSpecies.id,
                isTarget: true,
                isPlaceholder: !revealTarget,
                isRevealed: revealTarget,
                parentId: nodeId,
                children: [],
            });
        }
    }

    return cladeNode;
}

/**
 * Given a clade, find its nearest ancestor that is in the revealed set.
 * Returns undefined if no revealed ancestor is found.
 */
function getNearestRevealedAncestor(
    gameData: GameData,
    cladeId: string,
    revealedClades: Set<string>
): string | undefined {
    const clade = gameData.findCladeById(cladeId);
    if (!clade || !clade.parent) return undefined;

    const lineage = gameData.lineage(clade.parent);
    for (const ancestorId of lineage) {
        if (revealedClades.has(ancestorId)) {
            return ancestorId;
        }
    }
    return undefined;
}

/**
 * Given a species, find the nearest revealed clade in its lineage.
 */
function getNearestRevealedClade(
    gameData: GameData,
    species: Species,
    revealedClades: Set<string>
): string | undefined {
    const lineage = gameData.lineage(species.clade);
    for (const cladeId of lineage) {
        if (revealedClades.has(cladeId)) {
            return cladeId;
        }
    }
    return undefined;
}
