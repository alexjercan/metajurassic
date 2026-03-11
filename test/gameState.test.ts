import { GameData } from "../src/gameData";
import { GameState } from "../src/gameState";
import { Clade, Species } from "../src/types";
import { HINT_COST } from "../src/constants";

const makeGameData = () => {
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

    return new GameData(species, clades);
};

describe("GameState", () => {
    test("wins when guessing target", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set());

        const result = state.makeGuess("Tyrannosaurus rex");

        expect(result.isCorrect).toBe(true);
        expect(state.isWin()).toBe(true);
        expect(state.isGameOver()).toBe(true);
        expect(state.lastGuessId).toBe("trex");
    });

    test("tracks guesses and LCA when incorrect", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set());

        const result = state.makeGuess("Allosaurus");

        expect(result.isCorrect).toBe(false);
        expect(result.lca).toBe("theropoda");
        expect(state.guesses.has("allosaurus")).toBe(true);
        expect(state.lastGuessId).toBe("allosaurus");
        expect(state.isWin()).toBe(false);
        expect(state.isGameOver()).toBe(false);
    });

    test("prevents duplicate guesses", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set());

        state.makeGuess("Allosaurus");
        expect(() => state.makeGuess("Allosaurus")).toThrow(
            /already been guessed/i
        );
    });

    test("useHint adds clade to hintClades and costs guesses", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set());

        expect(state.numberOfGuesses()).toBe(0);
        state.useHint("theropoda");
        expect(state.hintClades.has("theropoda")).toBe(true);
        expect(state.numberOfGuesses()).toBe(HINT_COST);
        expect(state.guessesLeft()).toBe(25 - HINT_COST);
    });

    test("useHint prevents duplicate hints", () => {
        const data = makeGameData();
        const state = new GameState(data, "trex", new Set());

        state.useHint("theropoda");
        expect(() => state.useHint("theropoda")).toThrow(
            /already been revealed/i
        );
    });

    test("canAffordHint returns false when not enough guesses left", () => {
        const data = makeGameData();
        // Fill up most of the guesses budget with hints
        // MAX_GUESSES = 25, each hint costs 3
        // 8 hints = 24 guesses used, leaving 1 (< HINT_COST)
        const state = new GameState(
            data,
            "trex",
            new Set(),
            undefined,
            new Set([
                "hint1",
                "hint2",
                "hint3",
                "hint4",
                "hint5",
                "hint6",
                "hint7",
                "hint8",
            ])
        );
        expect(state.canAffordHint()).toBe(false);
    });

    test("useHint throws when cannot afford", () => {
        const data = makeGameData();
        const state = new GameState(
            data,
            "trex",
            new Set(),
            undefined,
            new Set([
                "hint1",
                "hint2",
                "hint3",
                "hint4",
                "hint5",
                "hint6",
                "hint7",
                "hint8",
            ])
        );
        expect(() => state.useHint("newclade")).toThrow(/not enough guesses/i);
    });

    test("hints count toward game over", () => {
        const data = makeGameData();
        // 8 hints = 24, + 1 guess = 25 => game over
        const state = new GameState(
            data,
            "trex",
            new Set(),
            undefined,
            new Set([
                "hint1",
                "hint2",
                "hint3",
                "hint4",
                "hint5",
                "hint6",
                "hint7",
                "hint8",
            ])
        );
        expect(state.isGameOver()).toBe(false);

        state.makeGuess("Allosaurus");
        expect(state.isGameOver()).toBe(true);
        expect(state.isLoss()).toBe(true);
    });
});
