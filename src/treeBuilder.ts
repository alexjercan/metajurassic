import { GameState } from "./gameState";
import type { Clade, Species } from "./types";

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

export function squashLinearClades(roots: CladeNode[]): CladeNode[] {
    const containsTarget = (node: TreeNode): boolean => {
        if (node.type === "species") return node.isTarget;
        return node.children.some(containsTarget);
    };

    const collapse = (node: CladeNode): CladeNode => {
        node.children = node.children.map((child) =>
            child.type === "clade" ? collapse(child) : child
        );

        while (
            node.children.length === 1 &&
            node.children[0].type === "clade" &&
            node.children[0].children.length === 1
        ) {
            const middle = node.children[0] as CladeNode;
            const grandchild = middle.children[0];
            grandchild.parentId = node.id;
            node.children = [grandchild];
        }

        const flattened: TreeNode[] = [];
        const cladeChildCount = node.children.filter(
            (c) => c.type === "clade"
        ).length;
        for (const child of node.children) {
            if (child.type === "clade") {
                if (cladeChildCount > 1) {
                    flattened.push(child);
                    continue;
                }

                const hasSubClades = child.children.some(
                    (c) => c.type === "clade"
                );
                const hasTarget = containsTarget(child);
                const isOnlySpecies = !hasSubClades;

                if (isOnlySpecies && !hasTarget) {
                    for (const grand of child.children) {
                        grand.parentId = node.id;
                        flattened.push(grand);
                    }
                    continue;
                }
            }
            flattened.push(child);
        }
        node.children = flattened;

        const cladeChildren = node.children.filter((c) => c.type === "clade");
        const speciesChildren = node.children.filter(
            (c) => c.type === "species"
        );
        if (
            speciesChildren.length === 0 &&
            cladeChildren.length === 1 &&
            !containsTarget(node)
        ) {
            const onlyClade = cladeChildren[0] as CladeNode;
            onlyClade.parentId = node.parentId;
            return onlyClade;
        }

        return node;
    };

    return roots.map((root) => collapse(root));
}

export function buildGuessTree(state: GameState): CladeNode[] {
    const { gameData, guesses, targetId } = state;

    const cladeNodes = new Map<string, CladeNode>();

    const targetSpecies = gameData.findSpeciesById(targetId);
    if (!targetSpecies) {
        throw new Error(
            `Target species id "${targetId}" not found in game data`
        );
    }

    const targetLineage = gameData.lineage(targetSpecies.clade);
    if (targetLineage.length === 0) {
        throw new Error(
            `Missing lineage for target clade "${targetSpecies.clade}"`
        );
    }

    const rootCladeId = targetLineage[targetLineage.length - 1];

    const depthInTarget = new Map<string, number>();
    targetLineage.forEach((id, idx) => depthInTarget.set(id, idx));

    const targetGuessed = guesses.has(targetId);

    let bestHintCladeId = rootCladeId;
    let bestHintDepth = targetLineage.length - 1;

    if (!targetGuessed) {
        for (const guessId of guesses) {
            if (guessId === targetId) continue;
            const lca = gameData.computeLCA(guessId, targetId);
            if (!lca) continue;
            const depth = depthInTarget.get(lca);
            if (depth !== undefined && depth < bestHintDepth) {
                bestHintCladeId = lca;
                bestHintDepth = depth;
            }
        }
    } else {
        bestHintCladeId = targetSpecies.clade;
        bestHintDepth = 0;
    }

    const getCladeNode = (clade: Clade, parentId?: string): CladeNode => {
        const existing = cladeNodes.get(clade.id);
        if (existing) {
            if (!existing.parentId && parentId) {
                existing.parentId = parentId;
            }
            return existing;
        }

        const node: CladeNode = {
            id: clade.id,
            cladeId: clade.id,
            name: clade.name,
            parentId,
            type: "clade",
            children: [],
        };
        cladeNodes.set(clade.id, node);
        return node;
    };

    const addSpeciesToTree = (
        species: Species,
        opts: { isTarget?: boolean; isPlaceholder?: boolean } = {}
    ) => {
        const lineage = gameData.lineage(species.clade);
        if (lineage.length === 0) {
            throw new Error(`Missing clade lineage for species ${species.id}`);
        }

        const cladesInOrder = [...lineage].reverse();
        let parentNode: CladeNode | undefined;

        for (const cladeId of cladesInOrder) {
            const clade = gameData.findCladeById(cladeId);
            if (!clade) {
                throw new Error(`Unknown clade id "${cladeId}" in lineage`);
            }

            const cladeNode = getCladeNode(clade, parentNode?.id);
            if (parentNode && !parentNode.children.includes(cladeNode)) {
                parentNode.children.push(cladeNode);
            }
            parentNode = cladeNode;
        }

        if (!parentNode) return;

        const speciesNode: SpeciesNode = {
            id: species.id,
            speciesId: species.id,
            name: species.species,
            parentId: parentNode.id,
            type: "species",
            isTarget: opts.isTarget === true,
            isPlaceholder: opts.isPlaceholder === true,
            children: [],
        };

        const alreadyPresent = parentNode.children.some(
            (child) => child.type === "species" && child.id === speciesNode.id
        );
        if (!alreadyPresent) {
            parentNode.children.push(speciesNode);
        }
    };

    const targetForTree: Species = targetGuessed
        ? targetSpecies
        : {
              id: targetSpecies.id,
              species: "?",
              clade: bestHintCladeId,
              period: targetSpecies.period,
              size: targetSpecies.size,
              weight: targetSpecies.weight,
              description: targetSpecies.description,
          };

    addSpeciesToTree(targetForTree, {
        isTarget: true,
        isPlaceholder: !targetGuessed,
    });

    for (const guessId of guesses) {
        const species = gameData.findSpeciesById(guessId);
        if (!species) {
            throw new Error(`Species id "${guessId}" not found in game data`);
        }
        addSpeciesToTree(species, {
            isTarget: species.id === targetId,
            isPlaceholder: false,
        });
    }

    const tree = Array.from(cladeNodes.values()).filter(
        (node) => !node.parentId
    );
    return squashLinearClades(tree);
}
