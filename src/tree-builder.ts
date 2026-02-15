import { Species, Clade } from "./game";
import { TreeNode } from "./tree-visualizer";

export interface Guess {
    species: Species;
    clade: string | null;
    isCorrect: boolean;
}

export interface GameTreeState {
    guesses: Guess[];
    clades: Map<string, Clade>;
}

/**
 * Build a tree structure showing the clade hierarchy with incorrect guesses and the hidden target.
 * - Builds paths to all guess LCAs
 * - Places ??? at the deepest (most specific) guess LCA (best case scenario)
 * - Adds all guesses at their respective LCA nodes
 */
export function buildGameTree(state: GameTreeState): TreeNode {
    const { guesses, clades } = state;

    const rootClade = Array.from(clades.values()).find((c) => !c.parent);
    if (!rootClade) {
        throw new Error("No root clade found");
    }

    const root: TreeNode = {
        name: rootClade.name,
        children: [],
    };

    const incorrectGuesses = guesses.filter((g) => !g.isCorrect);
    if (incorrectGuesses.length === 0) {
        root.children!.push({
            name: "???",
            isTarget: true,
        });
        return root;
    }

    const guessLCAs = incorrectGuesses.map((g) => g.clade || rootClade.name);
    const deepestLCA = findDeepestClade(guessLCAs, clades) || rootClade.name;

    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set(root.name, root);

    incorrectGuesses.forEach((guess) => {
        const lcaClade = guess.clade || rootClade.name;
        const pathToLCA = getCladePathFromRoot(lcaClade, clades);

        let currentNode = root;
        for (const cladeName of pathToLCA) {
            if (cladeName === root.name) continue;

            let cladeNode = nodeMap.get(cladeName);
            if (!cladeNode) {
                cladeNode = {
                    name: cladeName,
                    children: [],
                };
                currentNode.children!.push(cladeNode);
                nodeMap.set(cladeName, cladeNode);
            }

            currentNode = cladeNode;
        }
    });

    const deepestLCANode = nodeMap.get(deepestLCA) || root;
    deepestLCANode.children = deepestLCANode.children || [];
    deepestLCANode.children.push({
        name: "???",
        isTarget: true,
    });

    incorrectGuesses.forEach((guess) => {
        const lcaClade = guess.clade || rootClade.name;
        const parentNode = nodeMap.get(lcaClade);

        if (parentNode) {
            parentNode.children = parentNode.children || [];
            parentNode.children.push({
                name: guess.species.name,
                isGuess: true,
            });
        }
    });

    return root;
}

/**
 * Find the deepest (most specific) clade from a list of clades
 */
function findDeepestClade(
    cladeNames: string[],
    clades: Map<string, Clade>
): string | null {
    if (cladeNames.length === 0) return null;

    let deepest = cladeNames[0];

    for (const cladeName of cladeNames) {
        if (isDescendantOf(cladeName, deepest, clades)) {
            deepest = cladeName;
        }
    }

    return deepest;
}

/**
 * Check if descendantClade is a descendant of ancestorClade
 */
function isDescendantOf(
    descendantClade: string,
    ancestorClade: string,
    clades: Map<string, Clade>
): boolean {
    if (descendantClade === ancestorClade) return false;

    let current = clades.get(descendantClade);
    while (current) {
        if (current.parent === ancestorClade) {
            return true;
        }
        current = current.parent ? clades.get(current.parent) : undefined;
    }

    return false;
}

/**
 * Get the path from root to a specific clade
 */
function getCladePathFromRoot(
    targetClade: string,
    clades: Map<string, Clade>
): string[] {
    const path: string[] = [];
    let current = clades.get(targetClade);

    while (current) {
        path.unshift(current.name);
        current = current.parent ? clades.get(current.parent) : undefined;
    }

    return path;
}
