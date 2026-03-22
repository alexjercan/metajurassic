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

export interface RollingAverageDataPoint {
    time: Date;
    value: number;
    gamesCount: number;
}

export type TimeScale = "none" | "hourly" | "daily" | "weekly";

/**
 * Normalizes a date to the start of its time bucket based on the scale
 * - "hourly": Start of the hour (e.g., 2024-01-15 14:00:00)
 * - "daily": Start of the day (e.g., 2024-01-15 00:00:00)
 * - "weekly": Start of the week (Monday 00:00:00)
 * - "none": Returns the date unchanged
 */
function normalizeDateToScale(date: Date, scale: TimeScale): Date {
    const normalized = new Date(date);

    switch (scale) {
        case "hourly":
            normalized.setMinutes(0, 0, 0);
            break;
        case "daily":
            normalized.setHours(0, 0, 0, 0);
            break;
        case "weekly": {
            // Set to Monday of the week at 00:00:00
            normalized.setHours(0, 0, 0, 0);
            const day = normalized.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Handle Sunday (0) and make Monday the start
            normalized.setDate(normalized.getDate() + diff);
            break;
        }
        case "none":
            // No normalization
            break;
    }

    return normalized;
}

/**
 * Groups game results by time buckets and calculates the average for each bucket
 */
function groupByTimeBucket(
    results: GameResult[],
    scale: TimeScale
): Map<number, { averageGuesses: number; gamesCount: number; time: Date }> {
    if (scale === "none") {
        // No grouping, return individual results
        const map = new Map<
            number,
            { averageGuesses: number; gamesCount: number; time: Date }
        >();
        results.forEach((result) => {
            map.set(result.date.getTime(), {
                averageGuesses: result.numberOfGuesses,
                gamesCount: 1,
                time: result.date,
            });
        });
        return map;
    }

    const buckets = new Map<
        number,
        { totalGuesses: number; gamesCount: number; time: Date }
    >();

    // Group results into time buckets
    for (const result of results) {
        const bucketTime = normalizeDateToScale(result.date, scale);
        const bucketKey = bucketTime.getTime();

        const existing = buckets.get(bucketKey);
        if (existing) {
            existing.totalGuesses += result.numberOfGuesses;
            existing.gamesCount += 1;
        } else {
            buckets.set(bucketKey, {
                totalGuesses: result.numberOfGuesses,
                gamesCount: 1,
                time: bucketTime,
            });
        }
    }

    // Convert to averages
    const averages = new Map<
        number,
        { averageGuesses: number; gamesCount: number; time: Date }
    >();
    buckets.forEach((bucket, key) => {
        averages.set(key, {
            averageGuesses: bucket.totalGuesses / bucket.gamesCount,
            gamesCount: bucket.gamesCount,
            time: bucket.time,
        });
    });

    return averages;
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

export function calculateRollingAverage(
    gameData: GameData,
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "practice",
    windowSize: number = 7, // Default: 7 data points
    scale: TimeScale = "daily"
): RollingAverageDataPoint[] {
    const results = loadAllGames(gameData, storage, gameMode);

    // Only include wins for the rolling average
    const wins = results.filter((r) => r.isWin);

    if (wins.length === 0) return [];

    // Sort by date
    wins.sort((a, b) => a.date.getTime() - b.date.getTime());

    // First, group games by time buckets if scaling is enabled
    const buckets = groupByTimeBucket(wins, scale);

    // Convert buckets to sorted array
    const bucketArray = Array.from(buckets.entries())
        .map(([timestamp, data]) => ({
            timestamp,
            ...data,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (bucketArray.length === 0) return [];

    const dataPoints: RollingAverageDataPoint[] = [];

    // Ensure windowSize is at least 1
    const effectiveWindowSize = Math.max(1, windowSize);

    // Calculate rolling average for each bucket
    // Each data point represents the average of the last N data points (where N = windowSize)
    for (let i = 0; i < bucketArray.length; i++) {
        const currentBucket = bucketArray[i];

        // Get the last N buckets up to and including the current one
        const windowStart = Math.max(0, i - effectiveWindowSize + 1);
        const bucketsInWindow = bucketArray.slice(windowStart, i + 1);

        if (bucketsInWindow.length > 0) {
            // Calculate weighted average: sum of (average * count) / total count
            const totalWeightedGuesses = bucketsInWindow.reduce(
                (sum, bucket) =>
                    sum + bucket.averageGuesses * bucket.gamesCount,
                0
            );
            const totalGamesCount = bucketsInWindow.reduce(
                (sum, bucket) => sum + bucket.gamesCount,
                0
            );
            const average = totalWeightedGuesses / totalGamesCount;

            dataPoints.push({
                time: new Date(currentBucket.time),
                value: average,
                gamesCount: totalGamesCount,
            });
        }
    }

    return dataPoints;
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

    // All guessed dinosaurs (from all game states in mode)
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
