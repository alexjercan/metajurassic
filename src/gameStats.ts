import { calendarDaysBetween, GameData, seedToDate } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GameState } from "./gameState";
import { parseGameStateKey } from "./puzzleKey";

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

export interface GameResult {
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

    const storageLength = storage.length();
    for (let i = 0; i < storageLength; i++) {
        const key = storage.key(i);
        if (!key) continue;

        const parsed = parseGameStateKey(key);
        if (!parsed) continue;
        if (parsed.gameMode !== gameMode) continue;

        const savedState = storage.getItem(key);
        if (!savedState) continue;

        try {
            const data = JSON.parse(savedState) as {
                createdAt?: string;
                targetId: string;
                guesses: string[];
                lastGuessId?: string;
                hintClades?: string[];
            };
            const createdAtRaw = data.createdAt
                ? new Date(data.createdAt)
                : new Date();
            const createdAt =
                gameMode === "daily" ? seedToDate(parsed.seed) : createdAtRaw;

            const state = new GameState(
                gameData,
                data.targetId,
                new Set(data.guesses),
                data.lastGuessId,
                new Set(data.hintClades ?? []),
                createdAt
            );

            if (!state.isGameOver()) continue;

            results.push({
                date: createdAt,
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

    const wins = results.filter((r) => r.isWin);
    if (wins.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const result of wins) {
        const resultDate = new Date(result.date);
        resultDate.setHours(0, 0, 0, 0);

        if (lastDate === null) {
            tempStreak = 1;
        } else {
            // Calendar days, not elapsed hours: the night a zone enters summer
            // time is 23h long, and dividing that by 86400000 rounds to zero -
            // which used to break a streak that spanned it.
            const daysDiff = calendarDaysBetween(lastDate, resultDate);

            if (daysDiff === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
        lastDate = resultDate;
    }

    // Current streak only counts if the last win was today or yesterday
    if (lastDate) {
        const daysSinceLastWin = calendarDaysBetween(lastDate, today);

        if (daysSinceLastWin <= 1) {
            currentStreak = tempStreak;
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

// The two figures with a rule attached, rather than a plain `toString()`: a
// win rate rounded to whole percent, and an average that is only meaningful
// once something has been won. Shared by the profile panel and the game-over
// modal so the same round cannot read differently in the two places.
export function formatWinRate(stats: GameStats): string {
    const rate =
        stats.gamesPlayed > 0
            ? Math.round((stats.wins / stats.gamesPlayed) * 100)
            : 0;
    return `${rate}%`;
}

export function formatAverageGuesses(stats: GameStats): string {
    return stats.wins > 0 ? stats.averageGuesses.toFixed(1) : "0";
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

    const winResults = results.filter((r) => r.isWin);
    const totalGuesses = winResults.reduce(
        (sum, r) => sum + r.numberOfGuesses,
        0
    );
    const averageGuesses =
        winResults.length > 0 ? totalGuesses / winResults.length : 0;

    const guessDistribution = new Map<number, number>();
    for (const result of winResults) {
        const count = guessDistribution.get(result.numberOfGuesses) || 0;
        guessDistribution.set(result.numberOfGuesses, count + 1);
    }

    const streaks = calculateStreak(results);

    const discoveredDinosaurs = new Set(
        results.filter((r) => r.isWin).map((r) => r.targetId)
    );

    const allGuessedDinosaurs = new Set<string>();

    const storageLength = storage.length();
    for (let i = 0; i < storageLength; i++) {
        const key = storage.key(i);
        if (!key) continue;

        const parsed = parseGameStateKey(key);
        if (!parsed) continue;
        if (parsed.gameMode !== gameMode) continue;

        const savedState = storage.getItem(key);
        if (!savedState) continue;

        try {
            const data = JSON.parse(savedState) as {
                guesses?: unknown;
            };
            if (data.guesses && Array.isArray(data.guesses)) {
                (data.guesses as string[]).forEach((guessId: string) => {
                    allGuessedDinosaurs.add(guessId);
                });
            }
        } catch (error) {
            console.warn(
                `Failed to parse game state for key ${key} when computing guessed dinosaurs`,
                error
            );
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
