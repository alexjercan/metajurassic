import { GameData } from "../src/gameData";
import { calculateRollingAverage } from "../src/rollingAverage";
import { MockLocalStorage, clades, species } from "./statsFixtures";

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

        expect(avg).toHaveLength(2);
        expect(avg[0].value).toBe(1);
        expect(avg[1].value).toBe(1.5); // Rolling average of (1 + 2) / 2
    });

    test("groups games by hourly scale", () => {
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: new Date("2026-01-01T10:15:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: new Date("2026-01-01T10:45:00Z").toISOString(),
            seed: 2,
        };

        const game3 = {
            targetId: "species3",
            guesses: ["species1", "species2", "species3"],
            lastGuessId: "species3",
            hintClades: [],
            createdAt: new Date("2026-01-01T11:30:00Z").toISOString(),
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
            7,
            "hourly"
        );

        // Should group game1 and game2 into 10:00 hour, game3 into 11:00 hour
        expect(avg).toHaveLength(2);
        // First hour average: (1 + 2) / 2 = 1.5
        expect(avg[0].value).toBe(1.5);
        expect(avg[0].gamesCount).toBe(2);
        // Second data point is rolling average of both hours
        expect(avg[1].gamesCount).toBe(3);
    });

    test("groups games by weekly scale", () => {
        // Create games across different weeks
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            // Monday Jan 6, 2026
            createdAt: new Date("2026-01-06T12:00:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            // Wednesday Jan 8, 2026 (same week as game1)
            createdAt: new Date("2026-01-08T12:00:00Z").toISOString(),
            seed: 2,
        };

        const game3 = {
            targetId: "species3",
            guesses: ["species1", "species2", "species3"],
            lastGuessId: "species3",
            hintClades: [],
            // Monday Jan 13, 2026 (next week)
            createdAt: new Date("2026-01-13T12:00:00Z").toISOString(),
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
            7,
            "weekly"
        );

        // Should group game1 and game2 into week starting Jan 6, game3 into week starting Jan 13
        expect(avg).toHaveLength(2);
        // First week average: (1 + 2) / 2 = 1.5
        expect(avg[0].value).toBe(1.5);
        expect(avg[0].gamesCount).toBe(2);
        // Second week has 1 game with 3 guesses, rolling avg includes first week
        expect(avg[1].gamesCount).toBe(3);
    });

    test("weekly scale handles Sunday correctly", () => {
        // Sunday should be grouped with the week starting the previous Monday
        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            // Sunday Jan 5, 2026
            createdAt: new Date("2026-01-05T12:00:00Z").toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species3", "species2"],
            lastGuessId: "species2",
            hintClades: [],
            // Monday Jan 13, 2026 (starts new week, different from Jan 5's week)
            createdAt: new Date("2026-01-13T12:00:00Z").toISOString(),
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
            "weekly"
        );

        expect(avg).toHaveLength(2);
        expect(avg[0].value).toBe(1);
        expect(avg[0].gamesCount).toBe(1);
    });
});
