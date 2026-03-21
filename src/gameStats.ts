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
    storage: StorageProvider = defaultStorage()
): GameResult[] {
    const results: GameResult[] = [];
    for (let i = 0; i < storage.length(); i++) {
        const key = storage.key(i);

        const parsed = parseGameStateKey(key);
        if (!parsed) continue;

        const savedState = storage.getItem(key);
        if (!savedState) continue;

        try {
            const data = JSON.parse(savedState);
            const state = new GameState(
                gameData,
                data.targetId,
                new Set(data.guesses),
                data.lastGuessId,
                new Set(data.hintClades ?? [])
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
            console.warn(`Failed to parse game state for key ${key}`, error);
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
    storage: StorageProvider = defaultStorage()
): GameStats {
    const results = loadAllGames(gameData, storage);

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

    // Unique dinosaurs discovered
    const discoveredDinosaurs = new Set(
        results.filter((r) => r.isWin).map((r) => r.targetId)
    );

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
    };
}
