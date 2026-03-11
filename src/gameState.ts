import { MAX_GUESSES, HINT_COST } from "./constants";
import { GameData } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GuessResult } from "./types";

function formatPuzzleId(gameData: GameData, date: Date = new Date()): string {
    const index = gameData.speciesIndexForDate(date);
    return `animal-#${(index + 1).toString().padStart(3, "0")}`;
}

function gameStateKey(gameData: GameData, date: Date = new Date()): string {
    const puzzleId = formatPuzzleId(gameData, date);
    return `gameState-${puzzleId}`;
}

export function loadGameState(
    gameData: GameData,
    date: Date = new Date(),
    storage: StorageProvider = defaultStorage()
): GameState {
    const key = gameStateKey(gameData, date);
    const savedState = storage.getItem(key);

    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            return new GameState(
                gameData,
                parsed.targetId,
                new Set(parsed.guesses),
                parsed.lastGuessId,
                new Set(parsed.hintClades ?? [])
            );
        } catch (error) {
            console.warn(
                "Failed to parse saved game state, starting fresh",
                error
            );
        }
    }

    const targetId = gameData.getRandomSpecies(date);
    return new GameState(gameData, targetId, new Set());
}

export function saveGameState(
    state: GameState,
    storage: StorageProvider = defaultStorage()
): void {
    const key = gameStateKey(state.gameData);
    const gameState = {
        targetId: state.targetId,
        guesses: Array.from(state.guesses),
        lastGuessId: state.lastGuessId,
        hintClades: Array.from(state.hintClades),
    };

    storage.setItem(key, JSON.stringify(gameState));
}

export class GameState {
    constructor(
        public readonly gameData: GameData,
        public readonly targetId: string,
        public guesses: Set<string> = new Set(),
        public lastGuessId?: string,
        public hintClades: Set<string> = new Set()
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
