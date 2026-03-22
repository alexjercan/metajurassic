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

    test("findSpeciesById returns correct species", () => {
        expect(gameData.findSpeciesById("trex")?.species).toBe(
            "Tyrannosaurus rex"
        );
        expect(gameData.findSpeciesById("allosaurus")?.species).toBe(
            "Allosaurus"
        );
    });

    test("findSpeciesById returns null for non-existent id", () => {
        expect(gameData.findSpeciesById("nonexistent")).toBeNull();
    });

    test("findCladeById returns correct clade", () => {
        expect(gameData.findCladeById("tyrannosauroidea")?.name).toBe(
            "Tyrannosauroidea"
        );
        expect(gameData.findCladeById("theropoda")?.name).toBe("Theropoda");
    });

    test("findCladeById is case-insensitive", () => {
        expect(gameData.findCladeById("TYRANNOSAUROIDEA")?.name).toBe(
            "Tyrannosauroidea"
        );
        expect(gameData.findCladeById("ThErOpOdA")?.name).toBe("Theropoda");
    });

    test("findCladeById returns null for non-existent id", () => {
        expect(gameData.findCladeById("nonexistent")).toBeNull();
    });

    test("lineage handles circular references", () => {
        // The lineage function protects against circular references with a visited set
        const circularClades: Record<string, Clade> = {
            clade1: {
                id: "clade1",
                name: "Clade1",
                parent: "clade2",
                description: "",
            },
            clade2: {
                id: "clade2",
                name: "Clade2",
                parent: "clade1",
                description: "",
            },
        };
        const circularData = new GameData([], circularClades);
        const lineage = circularData.lineage("clade1");
        // Should break the cycle and return a finite lineage
        expect(lineage.length).toBeLessThanOrEqual(2);
    });

    test("computeLCA returns null for non-existent species", () => {
        expect(gameData.computeLCA("trex", "nonexistent")).toBeNull();
        expect(gameData.computeLCA("nonexistent", "trex")).toBeNull();
        expect(gameData.computeLCA("nonexistent1", "nonexistent2")).toBeNull();
    });

    test("getRandomSpecies throws error for empty species array", () => {
        const emptyData = new GameData([], clades);
        expect(() => emptyData.getRandomSpecies(1)).toThrow(
            "No species available in game data"
        );
    });

    test("getRandomSpecies returns species id", () => {
        const speciesId = gameData.getRandomSpecies(1);
        expect(speciesId).toBeDefined();
        expect(gameData.findSpeciesById(speciesId)).toBeDefined();
    });
});

describe("dateToSeed", () => {
    test("converts date to seed correctly", () => {
        const firstDay = new Date(2026, 0, 1); // January 1, 2026
        expect(dateToSeed(firstDay)).toBe(1);
    });

    test("handles dates after first day", () => {
        const secondDay = new Date(2026, 0, 2);
        expect(dateToSeed(secondDay)).toBe(2);

        const tenthDay = new Date(2026, 0, 10);
        expect(dateToSeed(tenthDay)).toBe(10);
    });

    test("handles dates in different months", () => {
        const feb1 = new Date(2026, 1, 1); // February 1, 2026
        const jan1 = new Date(2026, 0, 1);
        const daysDiff = Math.floor(
            (feb1.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(dateToSeed(feb1)).toBe(daysDiff + 1);
    });
});
