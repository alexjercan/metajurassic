import { GameData, seedToDate } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GameState, parseGameStateKey } from "./gameState";

export interface GameStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    averageGuesses: number;
    guessDistribution: Map<number, number>;
    currentStreak: number;
    longestStreak: number;
    uniqueDinosaursDiscovered: number;
    discoveredDinosaurs: Set<string>;
    allGuessedDinosaurs: Set<string>;
}

interface GameResult {
    date: Date;
    seed: number;
    puzzleId: string;
    isWin: boolean;
    numberOfGuesses: number;
    targetId: string;
}

export function loadAllGames(
    gameData: GameData,
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "daily"
): GameResult[] {
    const results: GameResult[] = [];

    // Fallback to localStorage directly if available
    if (typeof localStorage === "undefined") return results;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const parsed = parseGameStateKey(key);
        if (!parsed) continue;
        if (parsed.gameMode !== gameMode) continue;

        const savedState = storage.getItem(key);
        if (!savedState) continue;

        try {
            const data = JSON.parse(savedState);
            const state = new GameState(
                gameData,
                data.targetId,
                new Set(data.guesses),
                data.lastGuessId,
                new Set(data.hintClades ?? []),
                data.createdAt ? new Date(data.createdAt) : new Date()
            );

            if (!state.isGameOver()) continue;

            const date = seedToDate(parsed.seed);
            results.push({
                date,
                seed: parsed.seed,
                puzzleId: parsed.puzzleId,
                isWin: state.isWin(),
                numberOfGuesses: state.numberOfGuesses(),
                targetId: state.targetId,
            });
        } catch (error) {
            console.warn(
                `Failed to parse game state for key ${key}`,
                error
            );
        }
    }

    results.sort((a, b) => a.date.getTime() - b.date.getTime());

    return results;
}

function calculateStreak(results: GameResult[]): {
    current: number;
    longest: number;
} {
    if (results.length === 0) return { current: 0, longest: 0 };

    // Only count wins
    const wins = results.filter((r) => r.isWin);
    if (wins.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const result of wins) {
        const resultDate = new Date(result.date);
        resultDate.setHours(0, 0, 0, 0);

        if (lastDate === null) {
            tempStreak = 1;
        } else {
            const daysDiff = Math.floor(
                (resultDate.getTime() - lastDate.getTime()) /
                    (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 1) {
                // Consecutive day
                tempStreak++;
            } else {
                // Streak broken
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
        lastDate = resultDate;
    }

    // Current streak only counts if the last win was today or yesterday
    if (lastDate) {
        const daysSinceLastWin = Math.floor(
            (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastWin <= 1) {
            currentStreak = tempStreak;
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

export function computeGameStats(
    gameData: GameData,
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "daily"
): GameStats {
    const results = loadAllGames(gameData, storage, gameMode);

    const gamesPlayed = results.length;
    const wins = results.filter((r) => r.isWin).length;
    const losses = results.filter((r) => !r.isWin).length;

    // Calculate average guesses (only for wins)
    const winResults = results.filter((r) => r.isWin);
    const totalGuesses = winResults.reduce(
        (sum, r) => sum + r.numberOfGuesses,
        0
    );
    const averageGuesses =
        winResults.length > 0 ? totalGuesses / winResults.length : 0;

    // Calculate guess distribution (only for wins)
    const guessDistribution = new Map<number, number>();
    for (const result of winResults) {
        const count = guessDistribution.get(result.numberOfGuesses) || 0;
        guessDistribution.set(result.numberOfGuesses, count + 1);
    }

    // Calculate streaks
    const streaks = calculateStreak(results);

    // Unique dinosaurs discovered (won)
    const discoveredDinosaurs = new Set(
        results.filter((r) => r.isWin).map((r) => r.targetId)
    );

    // All guessed dinosaurs (from all game states)
    const allGuessedDinosaurs = new Set<string>();

    // Handle storage providers that don't implement length/key
    const storageLength =
        storage.length?.() ??
        (typeof localStorage !== "undefined" ? localStorage.length : 0);
    const getKey =
        storage.key ??
        ((i: number) =>
            typeof localStorage !== "undefined" ? localStorage.key(i) : null);

    for (let i = 0; i < storageLength; i++) {
        const key = getKey(i);
        if (!key) continue;

        const parsed = parseGameStateKey(key);
        if (!parsed) continue;

        const savedState = storage.getItem(key);
        if (!savedState) continue;

        try {
            const data = JSON.parse(savedState);
            // Add all guesses from this game state
            if (data.guesses && Array.isArray(data.guesses)) {
                data.guesses.forEach((guessId: string) => {
                    allGuessedDinosaurs.add(guessId);
                });
            }
        } catch (error) {
            console.warn(`Failed to parse game state for key ${key}`, error);
        }
    }

    return {
        gamesPlayed,
        wins,
        losses,
        averageGuesses,
        guessDistribution,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        uniqueDinosaursDiscovered: discoveredDinosaurs.size,
        discoveredDinosaurs,
        allGuessedDinosaurs,
    };
}
