import { GameData } from "./gameData";
import { guessTier } from "./closeness";
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

export function buildGuessTree(
    state: GameState,
    revealTarget = false
): CladeNode[] {
    const { gameData, targetId, guesses } = state;
    const targetSpecies = gameData.findSpeciesById(targetId);
    if (!targetSpecies) return [];

    const targetLineage = gameData.lineage(targetSpecies.clade);
    if (targetLineage.length === 0) return [];
    const rootCladeId = targetLineage[targetLineage.length - 1];

    const guessedSpecies: Species[] = [];
    for (const guessId of guesses) {
        const sp = gameData.findSpeciesById(guessId);
        if (sp) guessedSpecies.push(sp);
    }

    // A clade is revealed if it is the root, the LCA of the target and a
    // guess, the LCA of two guesses, or a hint. Clades on the path BETWEEN
    // those are not revealed - the gaps are what the player is deducing.
    const revealedClades = new Set<string>();
    revealedClades.add(rootCladeId);

    for (const hintCladeId of state.hintClades) {
        revealedClades.add(hintCladeId);
    }

    if (guessedSpecies.length === 0) {
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

    const lcaClades = new Set<string>();
    for (const guess of guessedSpecies) {
        if (guess.id === targetId) continue;
        const lca = gameData.computeLCA(targetId, guess.id);
        if (lca) lcaClades.add(lca);
    }

    for (const lcaId of lcaClades) {
        revealedClades.add(lcaId);
    }

    // Pairwise guess LCAs too, so guesses that share a clade are grouped
    // under it rather than listed flat.
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

    const childClades: string[] = [];
    for (const revCladeId of revealedClades) {
        if (revCladeId === cladeId) continue;
        const revClade = gameData.findCladeById(revCladeId);
        if (!revClade) continue;

        if (
            getNearestRevealedAncestor(gameData, revCladeId, revealedClades) ===
            cladeId
        ) {
            childClades.push(revCladeId);
        }
    }

    // "Directly under" means the species' lineage hits this clade before it
    // hits any revealed clade below it.
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

    const targetNearestClade = getNearestRevealedClade(
        gameData,
        targetSpecies,
        revealedClades
    );
    const targetIsDirectChild = targetNearestClade === cladeId;

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

    if (targetIsDirectChild) {
        const targetAlreadyAdded = directSpecies.some(
            (s) => s.id === targetSpecies.id
        );
        if (!targetAlreadyAdded) {
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
