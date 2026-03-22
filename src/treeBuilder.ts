import { GameData } from "./gameData";
import { GameState } from "./gameState";
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
 * Walks the lineage from the target's immediate clade up to the root and
 * returns the deepest clade that is not yet in the revealedClades set.
 *
 * The revealedClades set should contain all clades currently visible in the
 * tree (root, LCA clades, and previously hinted clades).
 *
 * Returns null if every clade in the target's lineage is already revealed
 * (i.e. no further hints can be given).
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

    // Walk from just below the deepest revealed clade toward the most
    // specific clade, and return the first unrevealed one we find.
    for (let i = deepestRevealedIdx - 1; i >= 0; i--) {
        if (!revealedClades.has(targetLineage[i])) {
            return targetLineage[i];
        }
    }

    return null;
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
