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
    children: [];
};

export function isCladeNode(node: TreeNode): node is CladeNode {
    return node.type === "clade";
}

export function isSpeciesNode(node: TreeNode): node is SpeciesNode {
    return node.type === "species";
}

export function buildGuessTree(state: GameState): CladeNode[] {
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
    const revealedClades = new Set<string>();
    revealedClades.add(rootCladeId);

    if (guessedSpecies.length === 0) {
        // No guesses: just root with a placeholder
        return [
            buildCladeSubtree(
                gameData,
                rootCladeId,
                targetSpecies,
                [],
                revealedClades
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
            revealedClades
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
    parentId?: string
): CladeNode {
    const clade = gameData.findCladeById(cladeId)!;
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
            // Target is not in guessed species, show as placeholder
            cladeNode.children.push({
                id: `species-${targetSpecies.id}`,
                name: "?",
                type: "species",
                speciesId: targetSpecies.id,
                isTarget: true,
                isPlaceholder: true,
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
