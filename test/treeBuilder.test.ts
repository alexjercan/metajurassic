import { GameData } from "../src/gameData";
import { GameState } from "../src/gameState";
import {
    squashLinearClades,
    buildGuessTree,
    CladeNode,
    SpeciesNode,
} from "../src/treeBuilder";

const findClade = (node: CladeNode, id: string): CladeNode | undefined => {
    if (node.id === id) return node;
    for (const child of node.children) {
        if (child.type === "clade") {
            const found = findClade(child, id);
            if (found) return found;
        }
    }
    return undefined;
};

const findSpeciesNode = (
    node: CladeNode,
    predicate: (s: SpeciesNode) => boolean
): SpeciesNode | undefined => {
    for (const child of node.children) {
        if (child.type === "species" && predicate(child)) return child;
        if (child.type === "clade") {
            const found = findSpeciesNode(child, predicate);
            if (found) return found;
        }
    }
    return undefined;
};

const makeGameData = () => {
    const species = [
        {
            id: "trex",
            species: "Tyrannosaurus Rex",
            clade: "tyrannosauroidea",
            period: "Cretaceous",
            size: "12 m",
            weight: "8 t",
            description: "",
        },
        {
            id: "allosaurus",
            species: "Allosaurus",
            clade: "theropoda",
            period: "Jurassic",
            size: "8.5 m",
            weight: "2 t",
            description: "",
        },
    ];

    const clades = {
        tyrannosauroidea: {
            id: "tyrannosauroidea",
            name: "Tyrannosauroidea",
            parent: "coelurosauria",
            description: "",
        },
        coelurosauria: {
            id: "coelurosauria",
            name: "Coelurosauria",
            parent: "theropoda",
            description: "",
        },
        theropoda: {
            id: "theropoda",
            name: "Theropoda",
            parent: "saurischia",
            description: "",
        },
        saurischia: {
            id: "saurischia",
            name: "Saurischia",
            parent: "dinosauria",
            description: "",
        },
        dinosauria: {
            id: "dinosauria",
            name: "Dinosauria",
            description: "",
        },
    } as const;

    return new GameData(species, clades);
};

describe("buildGuessTree", () => {
    test("places target as placeholder at hint clade when not guessed", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set(["allosaurus"]));

        const roots = buildGuessTree(state);
        expect(roots).toHaveLength(1);
        const dinosauria = roots[0];
        expect(dinosauria.cladeId).toBe("dinosauria");

        // Should have Theropoda branch with placeholder target ("?") and guess
        const theropoda = findClade(dinosauria, "theropoda");
        expect(theropoda).toBeDefined();

        const speciesLeaves = theropoda?.children.filter(
            (c): c is SpeciesNode => c.type === "species"
        );
        expect(speciesLeaves?.some((s) => s.isPlaceholder && s.isTarget)).toBe(
            true
        );
        expect(
            speciesLeaves?.some((s) => !s.isPlaceholder && !s.isTarget)
        ).toBe(true);
    });

    test("reveals target at its exact clade when guessed", () => {
        const data = makeGameData();
        const state = new GameState(
            data,
            "trex",
            new Set(["allosaurus", "trex"])
        );

        const roots = buildGuessTree(state);
        const dinosauria = roots[0];
        const theropoda = findClade(dinosauria, "theropoda");
        const targetLeaf = theropoda
            ? findSpeciesNode(theropoda, (s) => s.isTarget)
            : undefined;
        expect(targetLeaf).toBeDefined();
        expect(targetLeaf && targetLeaf.isPlaceholder).toBe(false);
    });
});

describe("squashLinearClades", () => {
    test("collapses single-child clade chains", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set(["allosaurus"]));
        const roots = buildGuessTree(state);

        const squashed = squashLinearClades(roots);
        const root = squashed[0];

        // Expect Dinosauria -> Theropoda (Saurischia collapsed away)
        const theropoda = findClade(root, "theropoda");
        expect(theropoda).toBeDefined();
        expect(findClade(root, "saurischia")).toBeUndefined();
    });

    test("keeps branching clades", () => {
        // Construct a simple branching tree manually
        const root: CladeNode = {
            id: "root",
            name: "Root",
            cladeId: "root",
            type: "clade",
            children: [
                {
                    id: "a",
                    name: "A",
                    cladeId: "a",
                    type: "clade",
                    children: [
                        {
                            id: "b",
                            name: "B",
                            cladeId: "b",
                            type: "clade",
                            children: [
                                {
                                    id: "sp1",
                                    name: "sp1",
                                    speciesId: "sp1",
                                    isTarget: false,
                                    isPlaceholder: false,
                                    type: "species",
                                    children: [],
                                    parentId: "b",
                                },
                            ],
                            parentId: "a",
                        },
                        {
                            id: "c",
                            name: "C",
                            cladeId: "c",
                            type: "clade",
                            children: [
                                {
                                    id: "sp2",
                                    name: "sp2",
                                    speciesId: "sp2",
                                    isTarget: false,
                                    isPlaceholder: false,
                                    type: "species",
                                    children: [],
                                    parentId: "c",
                                },
                            ],
                            parentId: "a",
                        },
                    ],
                    parentId: "root",
                },
            ],
        };

        const squashed = squashLinearClades([root]);
        const top = squashed[0];

        // The first clade "a" has two children, so it should NOT be collapsed
        const aNode = findClade(top, "a");
        expect(aNode).toBeDefined();
        expect(
            aNode?.children.some((c) => c.type === "clade" && c.id === "b")
        ).toBe(true);
        expect(
            aNode?.children.some((c) => c.type === "clade" && c.id === "c")
        ).toBe(true);
    });
});
