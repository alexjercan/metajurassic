import { guessTier } from "./closeness";
import { MAX_GUESSES } from "./constants";
import { GameState } from "./gameState";
import { formatPuzzleId, getTodaySeed } from "./puzzleKey";

// Identifies which puzzle a share message is for. Daily rounds use today's
// seed; practice/seeded rounds carry their own seed and a "practice" mode so
// the share text is labelled distinctly and never masquerades as the daily.
export interface ShareContext {
    mode: "daily" | "practice";
    seed: number;
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

// Duplicated by SITE_URL in webpack.config.js (which builds og:url and
// og:image) and in e2e/social.spec.ts. Kept in sync by hand: importing build
// config into the runtime bundle would be the worse coupling. See
// tasks/20260729-101751/DECISION.md.
const SHARE_URL = "https://alexjercan.github.io/metajurassic";

// One cell per tier, cold first, INDEXED BY `closenessTier`. The tier
// boundaries live in src/closeness.ts and only there; the board's node colours
// (`.node-close-*`) index the same tier, which is what keeps the grid a player
// pastes and the tree they read from drifting apart.
export const CLOSENESS_CELLS = ["⬛", "🟦", "🟨", "🟧", "🟩"];
const CORRECT_CELL = "🦖";
const HINT_CELL = "💡";

// The story of the round: one cell per guess in the order they were made,
// hottest colour for the closest join, plus one bulb per hint bought. Hints
// land after the guesses because the saved state keeps `guesses` and
// `hintClades` as two unordered sets - the moment a hint was bought is not
// recoverable, and inventing a position would be a fabrication of its own.
export function buildShareGrid(state: GameState): string {
    const cells = Array.from(state.guesses).map((guessId) =>
        guessId === state.targetId
            ? CORRECT_CELL
            : CLOSENESS_CELLS[
                  guessTier(state.gameData, guessId, state.targetId)
              ]
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
