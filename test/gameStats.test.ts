import { GameData, dateToSeed, seedToDate } from "../src/gameData";
import { expectPinnedZone } from "./timeZone";
import { computeGameStats, loadAllGames } from "../src/gameStats";
import { GameState, saveGameState } from "../src/gameState";
import { gameStateKey } from "../src/puzzleKey";
import { MockLocalStorage, clades, species } from "./statsFixtures";

describe("loadAllGames", () => {
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

        // Keys are derived from the real format so key and stored seed agree,
        // as they do in production. Hand-writing "#0000N" here paired with
        // seed N is the inconsistency that hid the off-by-one.
        storage.setItem(gameStateKey(3, "daily"), JSON.stringify(game1));
        storage.setItem(gameStateKey(1, "daily"), JSON.stringify(game2));
        storage.setItem(gameStateKey(2, "daily"), JSON.stringify(game3));

        const games = loadAllGames(gameData, storage, "daily");

        expect(games).toHaveLength(3);
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

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("Failed to parse game state"),
            expect.any(Error)
        );

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

        storage.setItem(
            "gameState-practice-dinosaur-#00001",
            JSON.stringify(game)
        );

        const stats = computeGameStats(gameData, storage, "practice");

        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(1);
    });

    test("tracks longest streak even when current streak is broken", () => {
        // Use practice mode where dates come from createdAt
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0);

        const fourDaysAgo = new Date(fiveDaysAgo);
        fourDaysAgo.setDate(fourDaysAgo.getDate() + 1);

        const threeDaysAgo = new Date(fourDaysAgo);
        threeDaysAgo.setDate(threeDaysAgo.getDate() + 1);

        // Gap here - no game for 2 days

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const game1 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: fiveDaysAgo.toISOString(),
            seed: 1,
        };

        const game2 = {
            targetId: "species2",
            guesses: ["species2"],
            lastGuessId: "species2",
            hintClades: [],
            createdAt: fourDaysAgo.toISOString(),
            seed: 2,
        };

        const game3 = {
            targetId: "species3",
            guesses: ["species3"],
            lastGuessId: "species3",
            hintClades: [],
            createdAt: threeDaysAgo.toISOString(),
            seed: 3,
        };

        const game4 = {
            targetId: "species1",
            guesses: ["species1"],
            lastGuessId: "species1",
            hintClades: [],
            createdAt: today.toISOString(),
            seed: 4,
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
        storage.setItem(
            "gameState-practice-dinosaur-#00004",
            JSON.stringify(game4)
        );

        const stats = computeGameStats(gameData, storage, "practice");

        // Current streak is 1 (only today)
        expect(stats.currentStreak).toBe(1);
        // Longest streak was 3 (5, 4, 3 days ago)
        expect(stats.longestStreak).toBe(3);
    });
});

// Regression coverage for the puzzle-key round-trip bug: a daily game saved
// under its real key must be read back dated to the day it was played, so
// profile dates and the current-streak check are correct. These cross the
// format/parse seam via the production writer `saveGameState`, rather than
// hand-writing a key that silently disagrees with its stored seed.
describe("daily profile dating and streaks (round-trip regression)", () => {
    // These assertions are only meaningful in a zone that shifts: run them in
    // UTC and the DST streak cases pass without ever crossing a transition.
    beforeAll(() => {
        expectPinnedZone();
    });

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

    const saveDailyWin = (seed: number, targetId: string) => {
        const state = new GameState(
            gameData,
            targetId,
            new Set([targetId]),
            targetId
        );
        saveGameState(state, seed, storage, "daily");
    };

    // The daily seed whose PROFILE date (seedToDate(seed), which is exactly how
    // loadAllGames/calculateStreak read it) is `today` offset by `deltaDays`.
    // This used to need a correction loop, because seedToDate and dateToSeed
    // were not clean inverses at local midnight across a DST boundary; they now
    // are, pinned by test/dstSeedDate.test.ts.
    const daySeed = (deltaDays: number) => {
        const target = new Date();
        target.setDate(target.getDate() + deltaDays);
        return dateToSeed(target);
    };

    test("a game saved for seed N is dated seedToDate(N) in the profile", () => {
        saveDailyWin(7, "species1");

        const games = loadAllGames(gameData, storage, "daily");

        expect(games).toHaveLength(1);
        expect(games[0].seed).toBe(7);
        expect(games[0].date.getTime()).toBe(seedToDate(7).getTime());
    });

    test("a win today is a current streak", () => {
        saveDailyWin(daySeed(0), "species1");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.currentStreak).toBe(1);
        expect(stats.longestStreak).toBe(1);
    });

    test("a win yesterday is still a current streak", () => {
        saveDailyWin(daySeed(-1), "species1");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.currentStreak).toBe(1);
    });

    test("a win two days ago is not a current streak", () => {
        saveDailyWin(daySeed(-2), "species1");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(1);
    });

    test("consecutive wins yesterday and today form a streak of two", () => {
        saveDailyWin(daySeed(-1), "species1");
        saveDailyWin(daySeed(0), "species2");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.currentStreak).toBe(2);
        expect(stats.longestStreak).toBe(2);
    });

    test("a streak survives the night the clocks go forward", () => {
        // 2026-03-29 is the spring-forward Sunday in the suite's pinned zone,
        // so the local midnights of the 29th and the 30th are 23h apart. Diffed
        // as elapsed milliseconds that floors to zero days and reads as "same
        // day", breaking the streak; as calendar days it is 1.
        saveDailyWin(dateToSeed(new Date(2026, 2, 29)), "species1");
        saveDailyWin(dateToSeed(new Date(2026, 2, 30)), "species2");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.longestStreak).toBe(2);
    });

    test("a streak survives the night the clocks go back", () => {
        // The fall-back Sunday's midnight-to-midnight gap is 25h. The elapsed
        // milliseconds version happened to get this direction right; the test
        // pins it so a correction for the 23h night cannot overshoot into it.
        saveDailyWin(dateToSeed(new Date(2026, 9, 25)), "species1");
        saveDailyWin(dateToSeed(new Date(2026, 9, 26)), "species2");

        const stats = computeGameStats(gameData, storage, "daily");

        expect(stats.longestStreak).toBe(2);
    });

    test("a win two days ago is stale even when a DST night is in between", () => {
        // The other half of the same arithmetic: "is the last win today or
        // yesterday" was also an elapsed-hours division. Two calendar days back
        // across the spring-forward night is 47h, which floors to 1 and used to
        // keep a dead streak alive.
        jest.useFakeTimers({ now: new Date(2026, 2, 31, 10, 0) });
        try {
            saveDailyWin(dateToSeed(new Date(2026, 2, 29)), "species1");

            const stats = computeGameStats(gameData, storage, "daily");

            expect(stats.currentStreak).toBe(0);
            expect(stats.longestStreak).toBe(1);
        } finally {
            jest.useRealTimers();
        }
    });
});
