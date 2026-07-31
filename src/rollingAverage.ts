import { GameData } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GameResult, loadAllGames } from "./gameStats";

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
            normalized.setHours(0, 0, 0, 0);
            const day = normalized.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Handle Sunday (0) and make Monday the start
            normalized.setDate(normalized.getDate() + diff);
            break;
        }
        case "none":
            break;
    }

    return normalized;
}

function groupByTimeBucket(
    results: GameResult[],
    scale: TimeScale
): Map<number, { averageGuesses: number; gamesCount: number; time: Date }> {
    if (scale === "none") {
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

export function calculateRollingAverage(
    gameData: GameData,
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "practice",
    windowSize: number = 7, // Default: 7 data points
    scale: TimeScale = "daily"
): RollingAverageDataPoint[] {
    const results = loadAllGames(gameData, storage, gameMode);

    const wins = results.filter((r) => r.isWin);

    if (wins.length === 0) return [];

    wins.sort((a, b) => a.date.getTime() - b.date.getTime());

    const buckets = groupByTimeBucket(wins, scale);

    const bucketArray = Array.from(buckets.entries())
        .map(([timestamp, data]) => ({
            timestamp,
            ...data,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (bucketArray.length === 0) return [];

    const dataPoints: RollingAverageDataPoint[] = [];

    const effectiveWindowSize = Math.max(1, windowSize);

    // Each data point represents the average of the last N data points (where N = windowSize)
    for (let i = 0; i < bucketArray.length; i++) {
        const currentBucket = bucketArray[i];

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
