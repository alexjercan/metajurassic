import { MAX_GUESSES, HINT_COST, MAX_HINTS } from "./constants";
import { GameData, seedToDate } from "./gameData";
import { gameStateKey, getTodaySeed } from "./puzzleKey";
import { StorageProvider, defaultStorage } from "./storage";
import { GuessResult, Species } from "./types";

// The JSON shape a round is persisted as. `loadGameState`, `loadAllGames` and
// `practiceSession` all parse this, so it is named once, here.
export interface SavedGameState {
    createdAt?: string;
    seed?: number;
    targetId: string;
    guesses: string[];
    lastGuessId?: string;
    hintClades?: string[];
}

// Whether a round is finished, answerable from the SAVED shape alone - no
// GameData, no graph. `GameState.isGameOver` delegates here so that
// `practiceSession` can ask the question about a round sitting in localStorage
// without rebuilding the species graph, and so the two answers cannot drift
// into a hand-copied mirror of each other.
export function isRoundOver(
    targetId: string,
    guesses: Iterable<string>,
    hintCount: number
): boolean {
    const guessed = guesses instanceof Set ? guesses : new Set(guesses);
    return (
        guessed.has(targetId) ||
        guessed.size + hintCount * HINT_COST >= MAX_GUESSES
    );
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
            const parsed = JSON.parse(savedState) as SavedGameState;
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
        return isRoundOver(this.targetId, this.guesses, this.hintClades.size);
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

    // Hints still allowed by the per-round cap, ignoring the guess budget.
    // MAX_HINTS = -1 means uncapped, which is the shipped setting.
    hintsRemaining(): number {
        if (MAX_HINTS < 0) return Infinity;
        return Math.max(0, MAX_HINTS - this.hintClades.size);
    }

    // The gate the UI should ask: a hint must be both affordable AND allowed.
    // `canAffordHint` deliberately stays budget-only so the two reasons a hint
    // is unavailable can be told apart (and reported) separately.
    canUseHint(): boolean {
        return this.canAffordHint() && this.hintsRemaining() > 0;
    }

    useHint(cladeId: string): void {
        if (this.hintsRemaining() <= 0) {
            throw new Error("No hints left this round");
        }
        if (!this.canAffordHint()) {
            throw new Error("Not enough guesses left to use a hint");
        }
        if (this.hintClades.has(cladeId)) {
            throw new Error("This clade has already been revealed by a hint");
        }
        this.hintClades.add(cladeId);
    }

    makeGuess(species: string): GuessResult {
        // These two messages are PLAYER-FACING: src/game/ renders them into
        // #input-error next to the guess box, so they say what the player did
        // and what to do next rather than naming the data structure that
        // missed. See tasks/20260729-092327/DECISION.md.
        const guessSpecies = this.gameData.findSpeciesByName(species);
        if (!guessSpecies) {
            throw new Error(
                `No dinosaur called "${species}" - check the spelling, or pick one from the list.`
            );
        }

        if (this.guesses.has(guessSpecies.id)) {
            throw new Error(`You have already guessed "${species}".`);
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

// Every species still consistent with everything the board shows: it has not
// been guessed, it lies inside every clade a hint has revealed, and for each
// past guess it would have produced the SAME join clade the player actually
// saw. This is the deduction the game asks the player to perform, computed from
// the guess history alone - no new state is stored, and it tells the caller
// nothing about the target that the board has not already shown.
export function consistentCandidates(state: GameState): Species[] {
    const { gameData, targetId } = state;

    // What the player saw for each guess, computed once rather than per
    // candidate.
    const observed = new Map<string, string | null>();
    for (const guessId of state.guesses) {
        if (guessId === targetId) continue;
        observed.set(guessId, gameData.computeLCA(guessId, targetId));
    }

    return gameData.species.filter((candidate) => {
        if (state.guesses.has(candidate.id)) return false;

        if (state.hintClades.size > 0) {
            const lineage = gameData.lineage(candidate.clade);
            for (const hintCladeId of state.hintClades) {
                if (!lineage.includes(hintCladeId)) return false;
            }
        }

        for (const [guessId, join] of observed) {
            if (gameData.computeLCA(guessId, candidate.id) !== join) {
                return false;
            }
        }

        return true;
    });
}
