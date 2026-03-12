import { dateToSeed, GameData } from "../src/gameData";
import { Clade, Species } from "../src/types";

const species: Species[] = [
    {
        id: "trex",
        species: "Tyrannosaurus rex",
        translation: "Tyrant Lizard King",
        clade: "tyrannosauroidea",
        period: "Cretaceous",
        size: "12 m",
        weight: "8 t",
        description: "",
    },
    {
        id: "allosaurus",
        species: "Allosaurus",
        translation: "Different Lizard",
        clade: "theropoda",
        period: "Jurassic",
        size: "8.5 m",
        weight: "2 t",
        description: "",
    },
];

const clades: Record<string, Clade> = {
    tyrannosauroidea: {
        id: "tyrannosauroidea",
        name: "Tyrannosauroidea",
        parent: "theropoda",
        description: "",
    },
    theropoda: {
        id: "theropoda",
        name: "Theropoda",
        parent: "dinosauria",
        description: "",
    },
    dinosauria: {
        id: "dinosauria",
        name: "Dinosauria",
        description: "",
    },
};

describe("GameData", () => {
    const gameData = new GameData(species, clades);

    test("finds species by name case-insensitively", () => {
        expect(gameData.findSpeciesByName("tyrannosaurus rex")?.id).toBe(
            "trex"
        );
        expect(gameData.findSpeciesByName("ALLOSAURUS")?.id).toBe("allosaurus");
        expect(gameData.findSpeciesByName("unknown")).toBeNull();
    });

    test("computes lineage from clade to root", () => {
        expect(gameData.lineage("tyrannosauroidea")).toEqual([
            "tyrannosauroidea",
            "theropoda",
            "dinosauria",
        ]);
    });

    test("computes lowest common ancestor between species", () => {
        expect(gameData.computeLCA("trex", "allosaurus")).toBe("theropoda");
    });

    test("returns deterministic daily index", () => {
        const date = new Date("2024-01-15T00:00:00Z");
        const seed = dateToSeed(date);
        const idx = gameData.speciesIndexForDate(seed);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(species.length);
        expect(gameData.speciesIndexForDate(seed)).toBe(idx);
    });
});
