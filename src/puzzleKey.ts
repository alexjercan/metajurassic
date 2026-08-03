import { dateToSeed } from "./gameData";

const PADDING_LENGTH = 5;
// Puzzle numbers wrap at this modulus so a key is always PADDING_LENGTH digits.
// `formatPuzzleId` and `parseGameStateKey` are exact inverses over the residue
// ring [0, PUZZLE_ID_MODULUS): parse recovers `seed mod PUZZLE_ID_MODULUS`.
export const PUZZLE_ID_MODULUS = Math.pow(10, PADDING_LENGTH);

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

// The 1-based puzzle number a seed displays as (the +1 display offset),
// wrapped by the modulus so it always fits PADDING_LENGTH digits: residue
// 99999 displays as 0, not a 6-digit number. Shared by both formatters below
// so the key and the headline can never name different puzzles.
function puzzleDisplayNumber(seed: number): number {
    return (puzzleResidue(seed) + 1) % PUZZLE_ID_MODULUS;
}

// Machine-facing puzzle id for a seed. Zero-padded to PADDING_LENGTH because
// `parseGameStateKey` is its exact inverse over a fixed-width key.
export function formatPuzzleId(seed: number): string {
    const display = puzzleDisplayNumber(seed);
    return `dinosaur-#${display.toString().padStart(PADDING_LENGTH, "0")}`;
}

// Prose-facing puzzle number for the share headline. No `dinosaur-` prefix and
// no padding: nothing parses this back, and "#00211" reads like a serial
// number in the text players paste in public.
export function formatPuzzleNumber(seed: number): string {
    return `#${puzzleDisplayNumber(seed)}`;
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
