import { GameData } from "../src/gameData";
import { GameState } from "../src/gameState";
import { Clade, Species } from "../src/types";

const createMemoryStorage = () => {
    const store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
    };
};

const makeGameData = () => {
    const species: Species[] = [
        {
            id: "trex",
            species: "Tyrannosaurus rex",
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

    return new GameData(species, clades);
};

describe("GameState", () => {
    test("wins when guessing target", () => {
        const data = makeGameData();
        const storage = createMemoryStorage();
        const state = new GameState(data, "trex", new Set(), storage);

        const result = state.makeGuess("Tyrannosaurus rex");

        expect(result.isCorrect).toBe(true);
        expect(state.isWin()).toBe(true);
        expect(state.isGameOver()).toBe(true);
    });

    test("tracks guesses and LCA when incorrect", () => {
        const data = makeGameData();
        const storage = createMemoryStorage();
        const state = new GameState(data, "trex", new Set(), storage);

        const result = state.makeGuess("Allosaurus");

        expect(result.isCorrect).toBe(false);
        expect(result.lca).toBe("theropoda");
        expect(state.guesses.has("allosaurus")).toBe(true);
        expect(state.isWin()).toBe(false);
        expect(state.isGameOver()).toBe(false);
    });

    test("prevents duplicate guesses", () => {
        const data = makeGameData();
        const storage = createMemoryStorage();
        const state = new GameState(data, "trex", new Set(), storage);

        state.makeGuess("Allosaurus");
        expect(() => state.makeGuess("Allosaurus")).toThrow(
            /already been guessed/i
        );
    });
});
