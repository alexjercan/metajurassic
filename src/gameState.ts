import { MAX_GUESSES, HINT_COST } from "./constants";
import { dateToSeed, GameData, seedToDate } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GuessResult } from "./types";

const PADDING_LENGTH = 5;

export function getTodaySeed(): number {
    return dateToSeed(new Date());
}

// Identifies which puzzle a share message is for. Daily rounds use today's
// seed; practice/seeded rounds carry their own seed and a "practice" mode so
// the share text is labelled distinctly and never masquerades as the daily.
export interface ShareContext {
    mode: "daily" | "practice";
    seed: number;
}

// Parse a `?seed=` query string into an integer seed, or null when absent or
// malformed. Kept pure (takes the raw search string) so it is unit-testable
// without a DOM; `src/practice.ts` passes `window.location.search`. Only whole
// integers are accepted - a non-integer or garbage value falls back to null so
// the caller can roll a random practice seed instead.
export function parseSeedParam(search: string): number | null {
    const raw = new URLSearchParams(search).get("seed");
    if (raw === null) return null;

    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;

    const seed = Number(trimmed);
    if (!Number.isSafeInteger(seed)) return null;

    return seed;
}

function formatPuzzleId(seed: number): string {
    const index = seed % Math.pow(10, PADDING_LENGTH);
    return `dinosaur-#${(index + 1).toString().padStart(PADDING_LENGTH, "0")}`;
}

function gameStateKey(seed: number, gameMode: "daily" | "practice"): string {
    const puzzleId = formatPuzzleId(seed);
    if (gameMode === "practice") {
        return `gameState-practice-${puzzleId}`;
    }

    return `gameState-${puzzleId}`;
}

export function parseGameStateKey(
    key: string
): { puzzleId: string; seed: number; gameMode: "daily" | "practice" } | null {
    const match = key.match(
        new RegExp(`^gameState-(practice-)?(dinosaur-#\\d{${PADDING_LENGTH}})$`)
    );
    if (!match) return null;

    const practiceMode = !!match[1];
    const gameMode = practiceMode ? "practice" : "daily";

    const puzzleId = match[2];
    const indexMatch = puzzleId.match(
        new RegExp(`^dinosaur-#(\\d{${PADDING_LENGTH}})$`)
    );
    if (!indexMatch) return null;

    const index = parseInt(indexMatch[1], 10) - 1;
    const seed = index + 1; // since index is 0-based and seed is 1-based

    return { puzzleId, seed, gameMode };
}

export function createNewGameState(
    gameData: GameData,
    seed: number = getTodaySeed()
): GameState {
    const targetId = gameData.getRandomSpecies(seed);
    return new GameState(gameData, targetId, new Set());
}

export function loadGameState(
    gameData: GameData,
    seed: number = getTodaySeed(),
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "daily"
): GameState {
    const key = gameStateKey(seed, gameMode);
    const savedState = storage.getItem(key);

    if (savedState) {
        try {
            const parsed = JSON.parse(savedState) as {
                createdAt?: string;
                seed?: number;
                targetId: string;
                guesses: string[];
                lastGuessId?: string;
                hintClades?: string[];
            };
            const createdAtRaw = parsed.createdAt
                ? new Date(parsed.createdAt)
                : new Date();
            const createdAt =
                gameMode === "daily"
                    ? seedToDate(parsed.seed ?? seed)
                    : createdAtRaw;

            return new GameState(
                gameData,
                parsed.targetId,
                new Set(parsed.guesses),
                parsed.lastGuessId,
                new Set(parsed.hintClades ?? []),
                createdAt
            );
        } catch (error) {
            console.warn(
                "Failed to parse saved game state, starting fresh",
                error
            );
        }
    }

    const targetId = gameData.getRandomSpecies(seed);
    return new GameState(gameData, targetId, new Set());
}

export function saveGameState(
    state: GameState,
    seed: number = getTodaySeed(),
    storage: StorageProvider = defaultStorage(),
    gameMode: "daily" | "practice" = "daily"
): void {
    const key = gameStateKey(seed, gameMode);
    const date = gameMode === "daily" ? seedToDate(seed) : new Date();

    const gameState = {
        targetId: state.targetId,
        guesses: Array.from(state.guesses),
        lastGuessId: state.lastGuessId,
        hintClades: Array.from(state.hintClades),
        createdAt: date.toISOString(),
    };

    storage.setItem(key, JSON.stringify(gameState));
}

export class GameState {
    constructor(
        public readonly gameData: GameData,
        public readonly targetId: string,
        public guesses: Set<string> = new Set(),
        public lastGuessId?: string,
        public hintClades: Set<string> = new Set(),
        public readonly createdAt: Date = new Date()
    ) {}

    isGameOver(): boolean {
        return (
            this.guesses.has(this.targetId) ||
            this.numberOfGuesses() >= MAX_GUESSES
        );
    }

    isWin(): boolean {
        return this.guesses.has(this.targetId);
    }

    isLoss(): boolean {
        return this.isGameOver() && !this.isWin();
    }

    numberOfGuesses(): number {
        return this.guesses.size + this.hintClades.size * HINT_COST;
    }

    guessesLeft(): number {
        return Math.max(0, MAX_GUESSES - this.numberOfGuesses());
    }

    canAffordHint(): boolean {
        return this.guessesLeft() >= HINT_COST;
    }

    useHint(cladeId: string): void {
        if (!this.canAffordHint()) {
            throw new Error("Not enough guesses left to use a hint");
        }
        if (this.hintClades.has(cladeId)) {
            throw new Error("This clade has already been revealed by a hint");
        }
        this.hintClades.add(cladeId);
    }

    makeGuess(species: string): GuessResult {
        const guessSpecies = this.gameData.findSpeciesByName(species);
        if (!guessSpecies) {
            throw new Error(`Species "${species}" not found in game data`);
        }

        if (this.guesses.has(guessSpecies.id)) {
            throw new Error(`Species "${species}" has already been guessed`);
        }
        this.guesses.add(guessSpecies.id);
        this.lastGuessId = guessSpecies.id;

        const isCorrect = guessSpecies.id === this.targetId;
        if (isCorrect) {
            return { isCorrect: true, lca: null };
        }

        const lcaClade = this.gameData.computeLCA(
            guessSpecies.id,
            this.targetId
        );
        return { isCorrect: false, lca: lcaClade };
    }
}

export function formatGameStateForSharing(
    state: GameState,
    context: ShareContext = { mode: "daily", seed: getTodaySeed() }
): string {
    const puzzleId = formatPuzzleId(context.seed);
    const guessCount = state.numberOfGuesses();
    // Practice/seeded rounds are labelled so their share text cannot be
    // mistaken for the daily puzzle. Daily output is unchanged (empty prefix).
    const label = context.mode === "practice" ? "Practice " : "";

    if (state.isWin()) {
        return (
            `✅ ${label}Dinosaur ${puzzleId} 🦖\n` +
            `I figured it out in ${guessCount} guesses!\n` +
            `${"🟩".repeat(guessCount)}\n🔥 ${guessCount} | Avg. Guesses: 5.2\n\n` +
            `https://alexjercan.github.io/metajurassic\n#metajurassic`
        );
    } else if (state.isLoss()) {
        return (
            `💀 ${label}Dinosaur ${puzzleId} 🦖\n` +
            `I couldn't figure it out in ${MAX_GUESSES} guesses.\n` +
            `${"⬛".repeat(MAX_GUESSES)}\n🔥 ${MAX_GUESSES} | Avg. Guesses: 5.2\n\n` +
            `https://alexjercan.github.io/metajurassic\n#metajurassic`
        );
    } else {
        throw new Error("Game is not over yet, cannot share results");
    }
}
