import { Species, Clade } from "./game";
import { TreeNode } from "./tree-visualizer";

export interface GameTreeState {
    target: Species;
    guesses: Array<{ species: Species; isCorrect: boolean }>;
    clades: Map<string, Clade>;
}

/**
 * Build a tree structure showing the clade hierarchy with incorrect guesses and the hidden target
 */
export function buildGameTree(state: GameTreeState): TreeNode {
    const { target, guesses, clades } = state;

    // Find root clade
    const rootClade = Array.from(clades.values()).find((c) => !c.parent);
    if (!rootClade) {
        throw new Error("No root clade found");
    }

    const root: TreeNode = {
        name: rootClade.name,
        children: [],
    };

    // Get incorrect guesses only (not correct ones)
    const incorrectGuesses = guesses.filter((g) => !g.isCorrect);

    // If no guesses yet, just show ??? under root
    if (incorrectGuesses.length === 0) {
        root.children!.push({
            name: "???",
            isTarget: true,
        });
        return root;
    }

    // Find the most specific common clade between target and all guesses
    const allSpecies = [target, ...incorrectGuesses.map((g) => g.species)];
    const commonClades = findCommonClades(allSpecies.map((s) => s.clade));
    const mostSpecificCommonClade =
        commonClades.length > 0 ? commonClades[commonClades.length - 1] : rootClade.name;

    // Build tree from root down to the most specific common clade
    let currentNode = root;
    let currentCladeName = rootClade.name;

    // Walk through the clade hierarchy until we reach the most specific common clade
    while (currentCladeName !== mostSpecificCommonClade) {
        // Find the next clade in the path to the target
        const nextClade = Array.from(clades.values()).find(
            (c) => c.parent === currentCladeName && allSpecies.some((s) => s.clade.includes(c.name))
        );

        if (!nextClade) {
            break;
        }

        const cladeNode: TreeNode = {
            name: nextClade.name,
            children: [],
        };
        currentNode.children!.push(cladeNode);
        currentNode = cladeNode;
        currentCladeName = nextClade.name;
    }

    // At the most specific common clade, add ??? and incorrect guesses
    const unknownNode: TreeNode = {
        name: "???",
        isTarget: true,
    };
    currentNode.children!.push(unknownNode);

    // Add incorrect guesses as siblings to ???
    incorrectGuesses.forEach((guess) => {
        const guessNode: TreeNode = {
            name: guess.species.name,
            isGuess: true,
        };
        currentNode.children!.push(guessNode);
    });

    return root;
}

/**
 * Find common clades across multiple species clade paths
 */
function findCommonClades(cladePaths: string[][]): string[] {
    if (cladePaths.length === 0) return [];

    const commonClades: string[] = [];
    const minLength = Math.min(...cladePaths.map((c) => c.length));

    for (let i = 0; i < minLength; i++) {
        const cladeAtIndex = cladePaths[0][i];
        if (cladePaths.every((path) => path[i] === cladeAtIndex)) {
            commonClades.push(cladeAtIndex);
        } else {
            break;
        }
    }

    return commonClades;
}
