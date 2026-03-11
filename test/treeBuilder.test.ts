import { GameData } from "../src/gameData";
import { GameState } from "../src/gameState";
import { Clade, Species } from "../src/types";
import {
    buildGuessTree,
    findNextHintCladeId,
    isCladeNode,
    isSpeciesNode,
} from "../src/treeBuilder";

// Tree structure from the comment:
//
//                    CladeA
//                    /    \
//                   v      v
//                 CladeB  CladeC
//                 /  \       \
//                v    v       v
//          Species1  CladeD    CladeE
//                      |        |    \
//                      v        v     v
//                  Species2  Species3  Species4
//
// Lineages:
//   Species1 -> CladeB -> CladeA
//   Species2 -> CladeD -> CladeB -> CladeA
//   Species3 -> CladeE -> CladeC -> CladeA
//   Species4 -> CladeE -> CladeC -> CladeA

const species: Species[] = [
    {
        id: "species1",
        species: "Species1",
        clade: "cladeb",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species2",
        species: "Species2",
        clade: "claded",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species3",
        species: "Species3",
        clade: "cladee",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species4",
        species: "Species4",
        clade: "cladee",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
];

const clades: Record<string, Clade> = {
    cladea: {
        id: "cladea",
        name: "CladeA",
        description: "",
    },
    cladeb: {
        id: "cladeb",
        name: "CladeB",
        parent: "cladea",
        description: "",
    },
    cladec: {
        id: "cladec",
        name: "CladeC",
        parent: "cladea",
        description: "",
    },
    claded: {
        id: "claded",
        name: "CladeD",
        parent: "cladeb",
        description: "",
    },
    cladee: {
        id: "cladee",
        name: "CladeE",
        parent: "cladec",
        description: "",
    },
};

function makeGameData(): GameData {
    return new GameData(species, clades);
}

function makeState(
    targetId: string,
    guessIds: string[] = [],
    hintCladeIds: string[] = []
): GameState {
    return new GameState(
        makeGameData(),
        targetId,
        new Set(guessIds),
        undefined,
        new Set(hintCladeIds)
    );
}

describe("buildGuessTree", () => {
    // ================================================================
    // INITIAL CASE (no guesses)
    // ================================================================

    test("target=Species1, no guesses => CladeA with ? child", () => {
        // Expected:
        //   CladeA
        //     |
        //     ?
        const state = makeState("species1");
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.cladeId).toBe("cladea");
        expect(root.children).toHaveLength(1);

        const child = root.children[0];
        expect(isSpeciesNode(child)).toBe(true);
        if (isSpeciesNode(child)) {
            expect(child.isTarget).toBe(true);
            expect(child.isPlaceholder).toBe(true);
            expect(child.name).toBe("?");
        }
    });

    test("target=Species4, no guesses => CladeA with ? child", () => {
        // Expected:
        //   CladeA
        //     |
        //     ?
        const state = makeState("species4");
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.cladeId).toBe("cladea");
        expect(root.children).toHaveLength(1);

        const child = root.children[0];
        expect(isSpeciesNode(child)).toBe(true);
        if (isSpeciesNode(child)) {
            expect(child.isTarget).toBe(true);
            expect(child.isPlaceholder).toBe(true);
            expect(child.name).toBe("?");
        }
    });

    // ================================================================
    // SINGLE GUESS cases
    // ================================================================

    test("target=Species1, guessed Species4 => CladeA with ? and Species4", () => {
        // LCA(Species1, Species4) = CladeA
        // Expected:
        //     CladeA
        //     /    \
        //    ?    Species4
        const state = makeState("species1", ["species4"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(2);

        // One child should be the target placeholder, the other the guess
        const targetChild = root.children.find(
            (c) => isSpeciesNode(c) && c.isTarget && c.isPlaceholder
        );
        const guessChild = root.children.find(
            (c) => isSpeciesNode(c) && c.speciesId === "species4"
        );

        expect(targetChild).toBeDefined();
        expect(guessChild).toBeDefined();
        if (isSpeciesNode(guessChild!)) {
            expect(guessChild!.name).toBe("Species4");
            expect(guessChild!.isPlaceholder).toBe(false);
        }
    });

    test("target=Species1, guessed Species2 => CladeA > CladeB with ? and Species2", () => {
        // LCA(Species1, Species2) = CladeB
        // Expected:
        //     CladeA
        //       |
        //     CladeB
        //     /    \
        //    ?    Species2
        const state = makeState("species1", ["species2"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(1);

        const cladeB = root.children[0];
        expect(isCladeNode(cladeB)).toBe(true);
        if (isCladeNode(cladeB)) {
            expect(cladeB.name).toBe("CladeB");
            expect(cladeB.children).toHaveLength(2);

            const targetChild = cladeB.children.find(
                (c) => isSpeciesNode(c) && c.isTarget && c.isPlaceholder
            );
            const guessChild = cladeB.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species2"
            );
            expect(targetChild).toBeDefined();
            expect(guessChild).toBeDefined();
        }
    });

    // ================================================================
    // MULTIPLE GUESS cases
    // ================================================================

    test("target=Species1, guessed Species2 and Species3 => CladeA with CladeB and Species3", () => {
        // LCA(Species1, Species2) = CladeB
        // LCA(Species1, Species3) = CladeA
        // Expected:
        //       CladeA
        //       /    \
        //    CladeB  Species3
        //    /    \
        //   ?    Species2
        const state = makeState("species1", ["species2", "species3"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(2);

        // One child is CladeB, the other is Species3
        const cladeB = root.children.find(
            (c) => isCladeNode(c) && c.cladeId === "cladeb"
        );
        const species3 = root.children.find(
            (c) => isSpeciesNode(c) && c.speciesId === "species3"
        );

        expect(cladeB).toBeDefined();
        expect(species3).toBeDefined();

        if (isCladeNode(cladeB!)) {
            expect(cladeB!.children).toHaveLength(2);
            const targetChild = cladeB!.children.find(
                (c) => isSpeciesNode(c) && c.isTarget && c.isPlaceholder
            );
            const species2 = cladeB!.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species2"
            );
            expect(targetChild).toBeDefined();
            expect(species2).toBeDefined();
        }
    });

    test("target=Species1, guessed Species2, Species3, and Species4 => full tree revealed", () => {
        // LCA(Species1, Species2) = CladeB
        // LCA(Species1, Species3) = CladeA
        // LCA(Species1, Species4) = CladeA
        // Species3 and Species4 share CladeE
        // Expected:
        //          CladeA
        //         /      \
        //      CladeB   CladeE
        //      /   \     /    \
        //     ?  Species2 Species3 Species4
        const state = makeState("species1", [
            "species2",
            "species3",
            "species4",
        ]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(2);

        const cladeB = root.children.find(
            (c) => isCladeNode(c) && c.cladeId === "cladeb"
        );
        const cladeE = root.children.find(
            (c) => isCladeNode(c) && c.cladeId === "cladee"
        );

        expect(cladeB).toBeDefined();
        expect(cladeE).toBeDefined();

        if (isCladeNode(cladeB!)) {
            expect(cladeB!.children).toHaveLength(2);
            const targetChild = cladeB!.children.find(
                (c) => isSpeciesNode(c) && c.isTarget
            );
            const species2 = cladeB!.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species2"
            );
            expect(targetChild).toBeDefined();
            expect(species2).toBeDefined();
        }

        if (isCladeNode(cladeE!)) {
            expect(cladeE!.children).toHaveLength(2);
            const species3 = cladeE!.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species3"
            );
            const species4 = cladeE!.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species4"
            );
            expect(species3).toBeDefined();
            expect(species4).toBeDefined();
        }
    });

    // ================================================================
    // DEEPER NESTING
    // ================================================================

    test("target=Species2, guessed Species1 => CladeA > CladeB with Species1 and ?", () => {
        // LCA(Species2, Species1) = CladeB
        // Expected:
        //     CladeA
        //       |
        //     CladeB
        //     /    \
        //  Species1  ?
        const state = makeState("species2", ["species1"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(1);

        const cladeB = root.children[0];
        expect(isCladeNode(cladeB)).toBe(true);
        if (isCladeNode(cladeB)) {
            expect(cladeB.name).toBe("CladeB");
            expect(cladeB.children).toHaveLength(2);
            const targetChild = cladeB.children.find(
                (c) => isSpeciesNode(c) && c.isTarget && c.isPlaceholder
            );
            const species1 = cladeB.children.find(
                (c) => isSpeciesNode(c) && c.speciesId === "species1"
            );
            expect(targetChild).toBeDefined();
            expect(species1).toBeDefined();
        }
    });

    test("target=Species3, guessed Species4 => CladeA > CladeE with ? and Species4", () => {
        // LCA(Species3, Species4) = CladeE
        // Expected:
        //     CladeA
        //       |
        //     CladeE
        //     /    \
        //    ?   Species4
        //
        // CladeC is between CladeA and CladeE in the full hierarchy,
        // but only LCA clades are revealed (not intermediates).
        const state = makeState("species3", ["species4"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(1);

        const cladeE = root.children[0];
        expect(isCladeNode(cladeE)).toBe(true);
        if (isCladeNode(cladeE)) {
            expect(cladeE.cladeId).toBe("cladee");
            expect(cladeE.children).toHaveLength(2);
        }
    });

    // ================================================================
    // EDGE CASES
    // ================================================================

    test("target=Species3, no guesses => CladeA with ?", () => {
        const state = makeState("species3");
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        expect(roots[0].name).toBe("CladeA");
        expect(roots[0].children).toHaveLength(1);
        const child = roots[0].children[0];
        expect(isSpeciesNode(child)).toBe(true);
        if (isSpeciesNode(child)) {
            expect(child.isTarget).toBe(true);
            expect(child.isPlaceholder).toBe(true);
        }
    });

    test("target guessed correctly shows target revealed (not placeholder)", () => {
        // When the target has been guessed, it should appear as a
        // non-placeholder node.
        const state = makeState("species1", ["species1"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];

        // Find the target node somewhere in the tree
        function findTarget(nodes: any[]): any {
            for (const n of nodes) {
                if (isSpeciesNode(n) && n.speciesId === "species1") return n;
                if (isCladeNode(n)) {
                    const found = findTarget(n.children);
                    if (found) return found;
                }
            }
            return null;
        }

        const target = findTarget(root.children);
        expect(target).toBeDefined();
        expect(target.isTarget).toBe(true);
        expect(target.isPlaceholder).toBe(false);
        expect(target.name).toBe("Species1");
    });

    test("each node has an id and correct parentId relationships", () => {
        const state = makeState("species1", ["species2"]);
        const roots = buildGuessTree(state);

        // Root has no parentId
        const root = roots[0];
        expect(root.parentId).toBeUndefined();

        // All children should have parentId set to their parent's id
        function checkParentIds(node: any, expectedParentId?: string) {
            expect(node.parentId).toBe(expectedParentId);
            if (isCladeNode(node)) {
                for (const child of node.children) {
                    checkParentIds(child, node.id);
                }
            }
        }
        checkParentIds(root, undefined);
    });

    test("target=Species4, guessed Species3 => sibling in same clade", () => {
        // LCA(Species4, Species3) = CladeE (same parent clade)
        // Expected:
        //     CladeA
        //       |
        //     ... (chain to CladeE)
        //     CladeE
        //     /    \
        //    ?   Species3
        const state = makeState("species4", ["species3"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);

        // Find CladeE somewhere in the tree
        function findClade(nodes: any[], cladeId: string): any {
            for (const n of nodes) {
                if (isCladeNode(n) && n.cladeId === cladeId) return n;
                if (isCladeNode(n)) {
                    const found = findClade(n.children, cladeId);
                    if (found) return found;
                }
            }
            return null;
        }

        const cladeE = findClade(roots, "cladee");
        expect(cladeE).toBeDefined();
        expect(cladeE.children).toHaveLength(2);

        const targetChild = cladeE.children.find(
            (c: any) => isSpeciesNode(c) && c.isTarget && c.isPlaceholder
        );
        const guessChild = cladeE.children.find(
            (c: any) => isSpeciesNode(c) && c.speciesId === "species3"
        );
        expect(targetChild).toBeDefined();
        expect(guessChild).toBeDefined();
    });

    test("multiple guesses in the same LCA clade are grouped together", () => {
        // target=Species1, guessed Species3 and Species4
        // LCA(Species1, Species3) = CladeA
        // LCA(Species1, Species4) = CladeA
        // Species3 and Species4 both belong to CladeE
        // Expected:
        //       CladeA
        //       /    \
        //      ?    CladeE
        //           /    \
        //       Species3 Species4
        const state = makeState("species1", ["species3", "species4"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(2);

        const targetChild = root.children.find(
            (c) => isSpeciesNode(c) && c.isTarget
        );
        const cladeE = root.children.find(
            (c) => isCladeNode(c) && c.cladeId === "cladee"
        );

        expect(targetChild).toBeDefined();
        expect(cladeE).toBeDefined();

        if (isCladeNode(cladeE!)) {
            expect(cladeE!.children).toHaveLength(2);
        }
    });
});

// ================================================================
// HINT FUNCTIONALITY
// ================================================================

describe("findNextHintCladeId", () => {
    test("no guesses: returns the clade one step below root in target lineage", () => {
        // Species1 lineage: CladeB -> CladeA
        // Root = CladeA (revealed). Next hint = CladeB.
        const state = makeState("species1");
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("cladeb");
    });

    test("target with deeper lineage: returns clade just below root", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Root = CladeA (revealed). Next hint = CladeB (one step down from root).
        const state = makeState("species2");
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("cladeb");
    });

    test("after a guess that reveals an intermediate clade, skips it", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Guess Species1 => LCA(Species2, Species1) = CladeB (revealed)
        // Now revealed: CladeA, CladeB. Next hint = CladeD.
        const state = makeState("species2", ["species1"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("claded");
    });

    test("returns null when all clades in target lineage are revealed", () => {
        // Species1 lineage: CladeB -> CladeA
        // If CladeB is revealed (by a guess), all clades are revealed.
        const state = makeState("species1", ["species2"]);
        // LCA(Species1, Species2) = CladeB => both CladeA and CladeB revealed
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });

    test("after one hint, returns the next clade down", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hint reveals CladeB. Next should be CladeD.
        const state = makeState("species2", [], ["cladeb"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBe("claded");
    });

    test("after all hints used, returns null", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hints: CladeB, CladeD => all revealed.
        const state = makeState("species2", [], ["cladeb", "claded"]);
        const nextHint = findNextHintCladeId(state);
        expect(nextHint).toBeNull();
    });
});

describe("buildGuessTree with hints", () => {
    test("hint reveals a clade in the tree", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hint: CladeB. Expected tree:
        //     CladeA
        //       |
        //     CladeB
        //       |
        //       ?
        const state = makeState("species2", [], ["cladeb"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(1);

        const cladeB = root.children[0];
        expect(isCladeNode(cladeB)).toBe(true);
        if (isCladeNode(cladeB)) {
            expect(cladeB.cladeId).toBe("cladeb");
            expect(cladeB.children).toHaveLength(1);

            const placeholder = cladeB.children[0];
            expect(isSpeciesNode(placeholder)).toBe(true);
            if (isSpeciesNode(placeholder)) {
                expect(placeholder.isTarget).toBe(true);
                expect(placeholder.isPlaceholder).toBe(true);
            }
        }
    });

    test("two hints reveal nested clades", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Hints: CladeB, CladeD. Expected tree:
        //     CladeA
        //       |
        //     CladeB
        //       |
        //     CladeD
        //       |
        //       ?
        const state = makeState("species2", [], ["cladeb", "claded"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(1);

        const cladeB = root.children[0];
        expect(isCladeNode(cladeB)).toBe(true);
        if (isCladeNode(cladeB)) {
            expect(cladeB.cladeId).toBe("cladeb");
            expect(cladeB.children).toHaveLength(1);

            const cladeD = cladeB.children[0];
            expect(isCladeNode(cladeD)).toBe(true);
            if (isCladeNode(cladeD)) {
                expect(cladeD.cladeId).toBe("claded");
                expect(cladeD.children).toHaveLength(1);

                const placeholder = cladeD.children[0];
                expect(isSpeciesNode(placeholder)).toBe(true);
                if (isSpeciesNode(placeholder)) {
                    expect(placeholder.isTarget).toBe(true);
                    expect(placeholder.isPlaceholder).toBe(true);
                }
            }
        }
    });

    test("hint combined with guess", () => {
        // Species2 lineage: CladeD -> CladeB -> CladeA
        // Guess Species3 (LCA with Species2 = CladeA)
        // Hint: CladeB
        // Expected tree:
        //       CladeA
        //       /    \
        //    CladeB  Species3
        //      |
        //      ?
        const state = makeState("species2", ["species3"], ["cladeb"]);
        const roots = buildGuessTree(state);

        expect(roots).toHaveLength(1);
        const root = roots[0];
        expect(root.name).toBe("CladeA");
        expect(root.children).toHaveLength(2);

        const cladeB = root.children.find(
            (c) => isCladeNode(c) && c.cladeId === "cladeb"
        );
        const species3 = root.children.find(
            (c) => isSpeciesNode(c) && c.speciesId === "species3"
        );

        expect(cladeB).toBeDefined();
        expect(species3).toBeDefined();

        if (isCladeNode(cladeB!)) {
            expect(cladeB!.children).toHaveLength(1);
            const placeholder = cladeB!.children[0];
            expect(isSpeciesNode(placeholder)).toBe(true);
            if (isSpeciesNode(placeholder)) {
                expect(placeholder.isTarget).toBe(true);
                expect(placeholder.isPlaceholder).toBe(true);
            }
        }
    });
});
