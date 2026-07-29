import { MAX_GUESSES, HINT_COST, MAX_HINTS } from "./constants";
import { dateToSeed, GameData, seedToDate } from "./gameData";
import { StorageProvider, defaultStorage } from "./storage";
import { GuessResult, Species } from "./types";

const PADDING_LENGTH = 5;
// Puzzle numbers wrap at this modulus so a key is always PADDING_LENGTH digits.
// `formatPuzzleId` and `parseGameStateKey` are exact inverses over the residue
// ring [0, PUZZLE_ID_MODULUS): parse recovers `seed mod PUZZLE_ID_MODULUS`.
const PUZZLE_ID_MODULUS = Math.pow(10, PADDING_LENGTH);

// Least non-negative residue of `value` modulo `PUZZLE_ID_MODULUS`. JS `%`
// keeps the sign of the dividend, so negative practice seeds (from `?seed=-N`)
// need this normalization to land in [0, PUZZLE_ID_MODULUS).
function puzzleResidue(value: number): number {
    return (
        ((value % PUZZLE_ID_MODULUS) + PUZZLE_ID_MODULUS) % PUZZLE_ID_MODULUS
    );
}

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

// Human-facing puzzle id for a seed. The displayed number is 1-based (the +1
// display offset), and is wrapped by the modulus so it always fits
// PADDING_LENGTH digits: residue 99999 renders "#00000", not a 6-digit key.
function formatPuzzleId(seed: number): string {
    const display = (puzzleResidue(seed) + 1) % PUZZLE_ID_MODULUS;
    return `dinosaur-#${display.toString().padStart(PADDING_LENGTH, "0")}`;
}

export function gameStateKey(
    seed: number,
    gameMode: "daily" | "practice"
): string {
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

    // Exact inverse of formatPuzzleId: undo the +1 display offset and wrap, so
    // the recovered seed is the residue `seed mod PUZZLE_ID_MODULUS`. For daily
    // seeds (far below the modulus) this is the original seed, which is what
    // the profile dating in gameStats relies on.
    const display = parseInt(indexMatch[1], 10);
    const seed = puzzleResidue(display - 1);

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

// Real, player-earned numbers for the share message. The caller computes these
// (`computeGameStats` in gameStats.ts, which needs storage) and passes them in,
// so this module stays storage-free. A stat with no data behind it is DROPPED
// rather than printed as a zero: "Avg. 0.0" on a first-ever share would be
// exactly the fabricated number this format exists to avoid.
export interface ShareStats {
    currentStreak: number;
    averageGuesses: number;
    wins: number;
}

const SHARE_URL = "https://alexjercan.github.io/metajurassic";

// How close a guess landed, as a fraction of the target's lineage: 1.0 means
// the guess shares the target's own clade, ~1/depth means the two only meet at
// the root. Spoiler-free - it reveals how deep the join was, never which clade.
const CLOSENESS_TIERS: { below: number; cell: string }[] = [
    { below: 0.2, cell: "⬛" },
    { below: 0.4, cell: "🟦" },
    { below: 0.6, cell: "🟨" },
    { below: 0.8, cell: "🟧" },
    { below: Infinity, cell: "🟩" },
];
const CORRECT_CELL = "🦖";
const HINT_CELL = "💡";

export function guessCloseness(
    gameData: GameData,
    guessId: string,
    targetId: string
): number {
    const target = gameData.findSpeciesById(targetId);
    if (!target) return 0;

    const lineage = gameData.lineage(target.clade);
    if (lineage.length === 0) return 0;

    const lca = gameData.computeLCA(guessId, targetId);
    if (!lca) return 0;

    // `lineage` runs target-clade-first, so index 0 is the deepest join.
    const index = lineage.indexOf(lca);
    if (index < 0) return 0;

    return (lineage.length - index) / lineage.length;
}

function closenessCell(closeness: number): string {
    const tier = CLOSENESS_TIERS.find((t) => closeness <= t.below);
    return tier ? tier.cell : CLOSENESS_TIERS[CLOSENESS_TIERS.length - 1].cell;
}

// The story of the round: one cell per guess in the order they were made,
// hottest colour for the closest join, plus one bulb per hint bought. Hints
// land after the guesses because the saved state keeps `guesses` and
// `hintClades` as two unordered sets - the moment a hint was bought is not
// recoverable, and inventing a position would be a fabrication of its own.
export function buildShareGrid(state: GameState): string {
    const cells = Array.from(state.guesses).map((guessId) =>
        guessId === state.targetId
            ? CORRECT_CELL
            : closenessCell(
                  guessCloseness(state.gameData, guessId, state.targetId)
              )
    );

    for (let i = 0; i < state.hintClades.size; i++) {
        cells.push(HINT_CELL);
    }

    return cells.join("");
}

function formatStatsLine(
    stats: ShareStats | undefined,
    mode: ShareContext["mode"],
    isWin: boolean
): string {
    if (!stats) return "";

    const parts: string[] = [];
    // The streak counts consecutive DAYS, which only means something for the
    // daily puzzle; practice rounds have no calendar behind them. It is also
    // withheld from a LOSS share: `calculateStreak` counts wins only, so a loss
    // today leaves yesterday's streak standing, and printing it here would
    // brag about a run the very round being shared just failed to extend.
    if (mode === "daily" && isWin && stats.currentStreak > 0) {
        parts.push(`🔥 ${stats.currentStreak} day streak`);
    }
    if (stats.wins > 0 && stats.averageGuesses > 0) {
        parts.push(`Avg. ${stats.averageGuesses.toFixed(1)}`);
    }

    return parts.join(" | ");
}

function shareMessage(
    headline: string,
    sentence: string,
    grid: string,
    statsLine: string
): string {
    const lines = [headline, sentence, grid];
    if (statsLine) lines.push(statsLine);

    return `${lines.join("\n")}\n\n${SHARE_URL}\n#metajurassic`;
}

export function formatGameStateForSharing(
    state: GameState,
    context: ShareContext = { mode: "daily", seed: getTodaySeed() },
    stats?: ShareStats
): string {
    const puzzleId = formatPuzzleId(context.seed);
    const guessCount = state.numberOfGuesses();
    // Practice/seeded rounds are labelled so their share text cannot be
    // mistaken for the daily puzzle. Daily output is unchanged (empty prefix).
    const label = context.mode === "practice" ? "Practice " : "";
    const statsLine = formatStatsLine(stats, context.mode, state.isWin());

    if (state.isWin()) {
        const noun = guessCount === 1 ? "guess" : "guesses";
        // A hint costs HINT_COST guesses but draws a single bulb, so without
        // this the sentence and the grid would give a reader two different
        // numbers. Naming the hints reconciles them, and owns up to the help.
        const hints = state.hintClades.size;
        const help =
            hints > 0 ? ` (${hints} ${hints === 1 ? "hint" : "hints"})` : "";
        return shareMessage(
            `✅ ${label}Dinosaur ${puzzleId} 🦖`,
            `I figured it out in ${guessCount} ${noun}${help}!`,
            buildShareGrid(state),
            statsLine
        );
    } else if (state.isLoss()) {
        return shareMessage(
            `💀 ${label}Dinosaur ${puzzleId} 🦖`,
            `I couldn't figure it out in ${MAX_GUESSES} guesses.`,
            buildShareGrid(state),
            statsLine
        );
    } else {
        throw new Error("Game is not over yet, cannot share results");
    }
}
