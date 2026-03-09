import { GameData, Clade, Species } from "../src/game";

const clades: Record<string, Clade> = {
    theropoda: {
        id: "theropoda",
        name: "Theropoda",
        description: "",
        parent: "saurischia",
    },
    saurischia: {
        id: "saurischia",
        name: "Saurischia",
        description: "",
        parent: "dinosauria",
    },
    dinosauria: { id: "dinosauria", name: "Dinosauria", description: "" },
};

const species: Species[] = [
    {
        id: "trex",
        species: "T. rex",
        clade: "theropoda",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "allosaurus",
        species: "Allosaurus",
        clade: "theropoda",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
];

const gameData = new GameData(species, clades);

const expectEqual = (actual: unknown, expected: unknown, message: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
            `${message}\nExpected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`
        );
    }
};

const expectTruthy = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
};

const runTest = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}`);
        throw error;
    }
};

runTest("findSpeciesByName returns matching species regardless of case", () => {
    const found = gameData.findSpeciesByName("t. REX");
    expectTruthy(found, "Species should be found");
    expectEqual(found?.id, "trex", "Species id should match");
});

runTest("lineage returns clade path from leaf to root", () => {
    const path = gameData.lineage("theropoda");
    expectEqual(
        path,
        ["theropoda", "saurischia", "dinosauria"],
        "Lineage should walk up to root"
    );
});

runTest("computeLCA returns lowest common ancestor of two species", () => {
    const lca = gameData.computeLCA("trex", "allosaurus");
    expectEqual(lca, "theropoda", "LCA should be the shared clade");
});

runTest("getRandomSpecies deterministically maps date to species id", () => {
    const fixedDate = new Date("2024-01-15T00:00:00Z");
    const id1 = gameData.getRandomSpecies(fixedDate);
    const id2 = gameData.getRandomSpecies(fixedDate);
    expectEqual(id1, id2, "Same date should yield same species");
    expectTruthy(
        ["trex", "allosaurus"].includes(id1),
        "Result should be one of the species ids"
    );
});

runTest("getRandomSpecies throws when no species exist", () => {
    const emptyData = new GameData([], {});
    let threw = false;
    try {
        emptyData.getRandomSpecies();
    } catch (error) {
        threw = true;
    }
    expectTruthy(threw, "Should throw when no species available");
});
