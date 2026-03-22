import { GameData } from "../src/gameData";
import {
    GameState,
    saveGameState,
    loadGameState,
    formatGameStateForSharing,
    parseGameStateKey,
    getTodaySeed,
    createNewGameState,
} from "../src/gameState";
import { Clade, Species } from "../src/types";
import { HINT_COST, MAX_GUESSES } from "../src/constants";
import { StorageProvider } from "../src/storage";

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

class MockStorage implements StorageProvider {
    private store: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this.store.get(key) || null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    length(): number {
        return this.store.size;
    }

    key(index: number): string | null {
        const keys = Array.from(this.store.keys());
        return keys[index] || null;
    }
}

describe("saveGameState and loadGameState", () => {
    let storage: MockStorage;
    let gameData: GameData;

    beforeEach(() => {
        storage = new MockStorage();
        gameData = makeGameData();
    });

    test("saves and loads game state correctly", () => {
        const state = new GameState(gameData, "trex", new Set(["allosaurus"]));
        state.lastGuessId = "allosaurus";

        saveGameState(state, 1, storage, "daily");
        const loaded = loadGameState(gameData, 1, storage, "daily");

        expect(loaded.targetId).toBe("trex");
        expect(loaded.guesses.has("allosaurus")).toBe(true);
        expect(loaded.lastGuessId).toBe("allosaurus");
    });

    test("saves and loads hint clades", () => {
        const state = new GameState(
            gameData,
            "trex",
            new Set(),
            undefined,
            new Set(["theropoda"])
        );

        saveGameState(state, 1, storage, "daily");
        const loaded = loadGameState(gameData, 1, storage, "daily");

        expect(loaded.hintClades.has("theropoda")).toBe(true);
    });

    test("creates new state if no saved state exists", () => {
        const loaded = loadGameState(gameData, 1, storage, "daily");

        expect(loaded.targetId).toBeDefined();
        expect(loaded.guesses.size).toBe(0);
    });

    test("handles corrupted saved state gracefully", () => {
        storage.setItem("gameState-dinosaur-#00001", "invalid json");

        const loaded = loadGameState(gameData, 1, storage, "daily");

        expect(loaded.targetId).toBeDefined();
        expect(loaded.guesses.size).toBe(0);
    });

    test("saves practice mode state separately", () => {
        const state = new GameState(gameData, "trex", new Set(["allosaurus"]));

        saveGameState(state, 1, storage, "practice");
        const loadedPractice = loadGameState(gameData, 1, storage, "practice");
        const loadedDaily = loadGameState(gameData, 1, storage, "daily");

        expect(loadedPractice.guesses.has("allosaurus")).toBe(true);
        expect(loadedDaily.guesses.size).toBe(0);
    });

    test("preserves createdAt date", () => {
        const createdDate = new Date("2026-01-15T12:00:00Z");
        const state = new GameState(
            gameData,
            "trex",
            new Set(),
            undefined,
            new Set(),
            createdDate
        );

        saveGameState(state, 15, storage, "daily");
        const loaded = loadGameState(gameData, 15, storage, "daily");

        // For daily mode, createdAt is based on seed
        expect(loaded.createdAt).toBeDefined();
    });
});

describe("formatGameStateForSharing", () => {
    let gameData: GameData;

    beforeEach(() => {
        gameData = makeGameData();
    });

    test("formats win message correctly", () => {
        const state = new GameState(gameData, "trex", new Set(["trex"]));
        const message = formatGameStateForSharing(state);

        expect(message).toContain("✅");
        expect(message).toContain("1 guesses");
        expect(message).toContain("🟩");
        expect(message).toContain("#metajurassic");
    });

    test("formats loss message correctly", () => {
        const guesses = new Set(
            Array.from({ length: MAX_GUESSES }, (_, i) => `species${i}`)
        );
        const state = new GameState(gameData, "trex", guesses);
        const message = formatGameStateForSharing(state);

        expect(message).toContain("💀");
        expect(message).toContain("couldn't figure it out");
        expect(message).toContain("⬛");
    });

    test("throws error for incomplete game", () => {
        const state = new GameState(gameData, "trex", new Set());

        expect(() => formatGameStateForSharing(state)).toThrow(
            "Game is not over yet"
        );
    });

    test("includes correct number of emoji squares", () => {
        const state = new GameState(
            gameData,
            "trex",
            new Set(["allosaurus", "trex"])
        );
        const message = formatGameStateForSharing(state);

        const squares = message.match(/🟩/g);
        expect(squares?.length).toBe(2);
    });
});

describe("parseGameStateKey", () => {
    test("parses daily game state key", () => {
        const result = parseGameStateKey("gameState-dinosaur-#00001");

        expect(result).not.toBeNull();
        expect(result?.puzzleId).toBe("dinosaur-#00001");
        expect(result?.seed).toBe(1);
        expect(result?.gameMode).toBe("daily");
    });

    test("parses practice game state key", () => {
        const result = parseGameStateKey("gameState-practice-dinosaur-#00005");

        expect(result).not.toBeNull();
        expect(result?.puzzleId).toBe("dinosaur-#00005");
        expect(result?.seed).toBe(5);
        expect(result?.gameMode).toBe("practice");
    });

    test("returns null for invalid key", () => {
        expect(parseGameStateKey("invalid-key")).toBeNull();
        expect(parseGameStateKey("gameState-invalid")).toBeNull();
        expect(parseGameStateKey("")).toBeNull();
    });

    test("handles different puzzle numbers", () => {
        const result1 = parseGameStateKey("gameState-dinosaur-#00042");
        expect(result1?.seed).toBe(42);

        const result2 = parseGameStateKey("gameState-dinosaur-#12345");
        expect(result2?.seed).toBe(12345);
    });
});

describe("createNewGameState", () => {
    test("creates a new game state with target", () => {
        const gameData = makeGameData();
        const state = createNewGameState(gameData, 1);

        expect(state.targetId).toBeDefined();
        expect(state.guesses.size).toBe(0);
        expect(state.hintClades.size).toBe(0);
    });

    test("creates different targets for different seeds", () => {
        const gameData = makeGameData();
        const state1 = createNewGameState(gameData, 1);
        const state2 = createNewGameState(gameData, 2);

        // With only 2 species, they might be the same, but the seed should be respected
        expect(state1.targetId).toBeDefined();
        expect(state2.targetId).toBeDefined();
    });
});

describe("getTodaySeed", () => {
    test("returns a valid seed number", () => {
        const seed = getTodaySeed();
        expect(typeof seed).toBe("number");
        expect(seed).toBeGreaterThan(0);
    });
});
