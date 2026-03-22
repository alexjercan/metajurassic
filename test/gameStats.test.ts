import { GameData } from "../src/gameData";
import {
    computeGameStats,
    calculateRollingAverage,
    loadAllGames,
} from "../src/gameStats";
import { StorageProvider } from "../src/storage";
import { Clade, Species } from "../src/types";

const species: Species[] = [
    {
        id: "species1",
        species: "Species1",
        translation: "",
        clade: "cladea",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species2",
        species: "Species2",
        translation: "",
        clade: "cladea",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species3",
        species: "Species3",
        translation: "",
        clade: "cladea",
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
};

class MockLocalStorage implements StorageProvider {
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

    clear(): void {
        this.store.clear();
    }
}

describe("loadAllGames", () => {
    let gameData: GameData;
    let storage: MockLocalStorage;
    let originalLocalStorage: any;

    beforeEach(() => {
        gameData = new GameData(species, clades);
        storage = new MockLocalStorage();
        originalLocalStorage = global.localStorage;
        // Mock localStorage for loadAllGames to work
        // @ts-ignore
        global.localStorage = storage;
    });

    afterEach(() => {
        // @ts-ignore
        global.localStorage = originalLocalStorage;
    });

    test("returns empty array when no games saved", () => {
        const games = loadAllGames(gameData, storage, "daily");
        expect(games).toEqual([]);
    });

    test("loads completed games from storage", () => {
        const gameState1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        storage.setItem(
            "gameState-dinosaur-#00001",
            JSON.stringify(gameState1)
        );

        const games = loadAllGames(gameData, storage, "daily");

        expect(games).toHaveLength(1);
        expect(games[0].targetId).toBe("species1");
        expect(games[0].isWin).toBe(true);
        expect(games[0].numberOfGuesses).toBe(1);
    });

    test("filters by game mode", () => {
        const dailyState = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        const practiceState = {
            targetId: "species2",
            guesses: ["species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 2,
        };

        storage.setItem(
            "gameState-dinosaur-#00001",
            JSON.stringify(dailyState)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00002",
            JSON.stringify(practiceState)
        );

        const dailyGames = loadAllGames(gameData, storage as any, "daily");
        const practiceGames = loadAllGames(gameData, storage, "practice");

        expect(dailyGames).toHaveLength(1);
        expect(dailyGames[0].targetId).toBe("species1");

        expect(practiceGames).toHaveLength(1);
        expect(practiceGames[0].targetId).toBe("species2");
    });

    test("ignores incomplete games", () => {
        const incompleteState = {
            targetId: "species1",
            guesses: [],
            lastGuessId: undefined,
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        storage.setItem(
            "gameState-dinosaur-#00001",
            JSON.stringify(incompleteState)
        );

        const games = loadAllGames(gameData, storage, "daily");
        expect(games).toEqual([]);
    });

    test("sorts games by date", () => {
        // For daily mode, the dates come from seedToDate, not createdAt
        // So we just need to ensure they're sorted by seed
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-03T00:00:00.000Z").toISOString(),
            seed: 3,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            seed: 1,
        };

        const game3 = {
            targetId: "species3",
            guesses: ["species3"],
            lastGuessId: "species3",
            hintClades: [],
            createdAt: new Date("2026-01-02T00:00:00.000Z").toISOString(),
            seed: 2,
        };

        storage.setItem("gameState-dinosaur-#00003", JSON.stringify(game1));
        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(game2));
        storage.setItem("gameState-dinosaur-#00002", JSON.stringify(game3));

        const games = loadAllGames(gameData, storage, "daily");

        expect(games).toHaveLength(3);
        // Games should be sorted by date (which comes from seed)
        expect(games[0].seed).toBe(1);
        expect(games[1].seed).toBe(2);
        expect(games[2].seed).toBe(3);
    });

    test("handles invalid JSON gracefully", () => {
        // Suppress console.warn for this test since we expect it
        const originalWarn = console.warn;
        console.warn = jest.fn();

        storage.setItem("gameState-dinosaur-#00001", "invalid json");

        const games = loadAllGames(gameData, storage, "daily");
        expect(games).toEqual([]);

        // Verify that console.warn was called
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("Failed to parse game state"),
            expect.any(Error)
        );

        // Restore console.warn
        console.warn = originalWarn;
    });
});

describe("computeGameStats", () => {
    let gameData: GameData;
    let storage: MockLocalStorage;
    let originalLocalStorage: any;

    beforeEach(() => {
        gameData = new GameData(species, clades);
        storage = new MockLocalStorage();
        originalLocalStorage = global.localStorage;
        // @ts-ignore
        global.localStorage = storage;
    });

    afterEach(() => {
        // @ts-ignore
        global.localStorage = originalLocalStorage;
    });

    test("returns zeros for no games", () => {
        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.gamesPlayed).toBe(0);
        expect(stats.wins).toBe(0);
        expect(stats.losses).toBe(0);
        expect(stats.averageGuesses).toBe(0);
        expect(stats.guessDistribution.size).toBe(0);
        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(0);
        expect(stats.uniqueDinosaursDiscovered).toBe(0);
    });

    test("calculates stats for wins", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-02").toISOString(),
            seed: 2,
        };

        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(game1));
        storage.setItem("gameState-dinosaur-#00002", JSON.stringify(game2));

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.gamesPlayed).toBe(2);
        expect(stats.wins).toBe(2);
        expect(stats.losses).toBe(0);
        expect(stats.averageGuesses).toBe(1.5);
        expect(stats.guessDistribution.get(1)).toBe(1);
        expect(stats.guessDistribution.get(2)).toBe(1);
    });

    test("calculates stats for losses", () => {
        // Create a loss by using 25 different wrong guesses (MAX_GUESSES)
        const wrongGuesses = Array.from({ length: 25 }, (_, i) => `wrong${i}`);

        const lossGame = {
            targetId: "species1",
            guesses: wrongGuesses,
            lastGuessId: "wrong24",
            hintClades: [],
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            seed: 1,
        };

        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(lossGame));

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.gamesPlayed).toBe(1);
        expect(stats.wins).toBe(0);
        expect(stats.losses).toBe(1);
        expect(stats.averageGuesses).toBe(0); // Only wins count towards average
    });

    test("tracks unique discovered dinosaurs", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-02").toISOString(),
            seed: 2,
        };

        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(game1));
        storage.setItem("gameState-dinosaur-#00002", JSON.stringify(game2));

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.uniqueDinosaursDiscovered).toBe(2);
        expect(stats.discoveredDinosaurs.has("species1")).toBe(true);
        expect(stats.discoveredDinosaurs.has("species2")).toBe(true);
    });

    test("tracks all guessed dinosaurs across games", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species2", "species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-02").toISOString(),
            seed: 2,
        };

        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(game1));
        storage.setItem("gameState-dinosaur-#00002", JSON.stringify(game2));

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.allGuessedDinosaurs.size).toBe(3);
        expect(stats.allGuessedDinosaurs.has("species1")).toBe(true);
        expect(stats.allGuessedDinosaurs.has("species2")).toBe(true);
        expect(stats.allGuessedDinosaurs.has("species3")).toBe(true);
    });

    test("calculates current streak for consecutive daily wins", () => {
        // Use practice mode where dates come from createdAt, not seedToDate
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: yesterday.toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: today.toISOString(),
            seed: 2,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game1)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00002",
            JSON.stringify(game2)
        );

        const stats = computeGameStats(gameData, storage, "practice");

        expect(stats.currentStreak).toBe(2);
        expect(stats.longestStreak).toBe(2);
    });

    test("resets current streak for broken streak", () => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const game = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: threeDaysAgo.toISOString(),
            seed: 1,
        };

        storage.setItem("gameState-dinosaur-#00001", JSON.stringify(game));

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(1);
    });
});

describe("calculateRollingAverage", () => {
    let gameData: GameData;
    let storage: MockLocalStorage;
    let originalLocalStorage: any;

    beforeEach(() => {
        gameData = new GameData(species, clades);
        storage = new MockLocalStorage();
        originalLocalStorage = global.localStorage;
        // @ts-ignore
        global.localStorage = storage;
    });

    afterEach(() => {
        // @ts-ignore
        global.localStorage = originalLocalStorage;
    });

    test("returns empty array for no games", () => {
        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            7,
            "daily"
        );
        expect(avg).toEqual([]);
    });

    test("returns empty array for no wins", () => {
        const wrongGuesses = Array.from({ length: 25 }, (_, i) => `wrong${i}`);

        const lossGame = {
            targetId: "species1",
            guesses: wrongGuesses,
            lastGuessId: "wrong24",
            hintClades: [],
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            seed: 1,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(lossGame)
        );

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            7,
            "daily"
        );
        expect(avg).toEqual([]);
    });

    test("calculates rolling average for single win", () => {
        const game = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01T12:00:00Z").toISOString(),
            seed: 1,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game)
        );

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            7,
            "daily"
        );

        expect(avg).toHaveLength(1);
        expect(avg[0].value).toBe(1);
        expect(avg[0].gamesCount).toBe(1);
    });

    test("calculates rolling average for multiple wins", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01T12:00:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-02T12:00:00Z").toISOString(),
            seed: 2,
        };

        const game3 = {
            targetId: "species3",
            guesses: ["species1", "species2", "species3"],
            lastGuessId: "species3",
            hintClades: [],
            createdAt: new Date("2026-01-03T12:00:00Z").toISOString(),
            seed: 3,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game1)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00002",
            JSON.stringify(game2)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00003",
            JSON.stringify(game3)
        );

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            2,
            "daily"
        );

        expect(avg.length).toBeGreaterThan(0);
        // Last data point should be average of last 2 games: (2 + 3) / 2 = 2.5
        expect(avg[avg.length - 1].value).toBe(2.5);
    });

    test("respects window size", () => {
        const games = [];
        for (let i = 0; i < 10; i++) {
            // Create unique guesses for each game to get the right count
            const numGuesses = i + 1;
            const guessesArray = Array.from(
                { length: numGuesses - 1 },
                (_, j) => `wrong${i}_${j}` // Unique wrong guesses per game
            );
            guessesArray.push("species1"); // Last guess is correct

            games.push({
                targetId: "species1",
                guesses: guessesArray,
                lastGuessId: "species1",
                hintClades: [],
                createdAt: new Date(
                    `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`
                ).toISOString(),
                seed: i + 1,
            });
        }

        games.forEach((game, i) => {
            storage.setItem(
                `gameState-practice-dinosaur-#${String(i + 1).padStart(5, "0")}`,
                JSON.stringify(game)
            );
        });

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            3,
            "daily"
        );

        // The last data point should use the last 3 games: (8 + 9 + 10) / 3 = 9
        expect(avg[avg.length - 1].value).toBe(9);
    });

    test("groups games by daily scale", () => {
        // Two games on the same day
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2", "species1"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-01T14:00:00Z").toISOString(),
            seed: 2,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game1)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00002",
            JSON.stringify(game2)
        );

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            7,
            "daily"
        );

        // Should group both games into one data point with average (1 + 3) / 2 = 2
        expect(avg).toHaveLength(1);
        expect(avg[0].value).toBe(2);
        expect(avg[0].gamesCount).toBe(2);
    });

    test("handles 'none' scale without grouping", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-01T14:00:00Z").toISOString(),
            seed: 2,
        };

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game1)
        );
        storage.setItem(
            "gameState-practice-dinosaur-#00002",
            JSON.stringify(game2)
        );

        const avg = calculateRollingAverage(
            gameData,
            storage,
            "practice",
            7,
            "none"
        );

        // Should have 2 separate data points
        expect(avg).toHaveLength(2);
        expect(avg[0].value).toBe(1);
        expect(avg[1].value).toBe(1.5); // Rolling average of (1 + 2) / 2
    });
});
