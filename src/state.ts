import { GameData } from "./game";

const MAX_GUESSES = 25;

export interface GuessResult {
    isCorrect: boolean;
    lca: string | null;
}

function formatPuzzleId(gameData: GameData, date: Date = new Date()): string {
    const index = gameData.speciesIndexForDate(date);
    return `animal-#${(index + 1).toString().padStart(3, "0")}`;
}

export function loadGameState(gameData: GameData, date: Date = new Date()): GameState {
    const puzzleId = formatPuzzleId(gameData, date);
    const savedState = localStorage.getItem(`gameState-${puzzleId}`);

    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            return new GameState(
                gameData,
                parsed.targetId,
                new Set(parsed.guesses)
            );
        } catch (error) {
            console.warn("Failed to parse saved game state, starting fresh", error);
        }
    }

    const targetId = gameData.getRandomSpecies(date);
    return new GameState(gameData, targetId);
}

export class GameState {
    constructor(
        public readonly gameData: GameData,
        public readonly targetId: string,
        public guesses: Set<string> = new Set(),
    ) { }

    save(): void {
        const puzzleId = formatPuzzleId(this.gameData);
        const gameState = {
            targetId: this.targetId,
            guesses: Array.from(this.guesses),
        };

        localStorage.setItem(`gameState-${puzzleId}`, JSON.stringify(gameState));
    }

    isGameOver(): boolean {
        return (
            this.guesses.has(this.targetId) || this.guesses.size >= MAX_GUESSES
        );
    }

    isWin(): boolean {
        return this.guesses.has(this.targetId);
    }

    isLoss(): boolean {
        return this.isGameOver() && !this.isWin();
    }

    numberOfGuesses(): number {
        return this.guesses.size;
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
        this.save();

        const isCorrect = guessSpecies.id === this.targetId;
        if (isCorrect) {
            return { isCorrect: true, lca: null };
        }

        const lcaClade = this.gameData.computeLCA(guessSpecies.id, this.targetId);
        return { isCorrect: false, lca: lcaClade };
    }
}
