import { GameData } from "../gameData";
import { GameState } from "../gameState";
import { computeGameStats } from "../gameStats";
import { ShareContext, formatGameStateForSharing } from "../shareText";
import { defaultStorage } from "../storage";
import { clearModalError, showModalError } from "../ui/modal";
import { shareResult } from "../ui/share";

export function wireShareButton(
    button: HTMLButtonElement,
    state: GameState,
    data: GameData,
    shareContext: ShareContext
) {
    button?.addEventListener("click", () => {
        // Real numbers only: whatever this player has actually banked in this
        // mode. `computeGameStats` reads the same storage the finished round
        // was just saved to, so this game is already counted.
        const stats = computeGameStats(
            data,
            defaultStorage(),
            shareContext.mode
        );
        const shareData = formatGameStateForSharing(state, shareContext, {
            currentStreak: stats.currentStreak,
            averageGuesses: stats.averageGuesses,
            wins: stats.wins,
        });

        shareResult(shareData)
            .then((outcome) => {
                // A share that got somewhere clears the previous failure; the
                // line would otherwise still accuse the retry that worked.
                clearModalError();

                // The native sheet gives its own feedback, and a cancelled
                // share deserves none; only the silent clipboard write needs a
                // confirmation.
                if (outcome !== "copied") return;

                const shareBtnSpan = button.querySelector("span");
                if (shareBtnSpan) {
                    const originalText = shareBtnSpan.textContent;
                    shareBtnSpan.textContent = "Copied!";
                    setTimeout(() => {
                        shareBtnSpan.textContent = originalText;
                    }, 2000);
                }
            })
            .catch((err) => {
                console.error("Failed to share game state: ", err);
                showModalError("Failed to share game state. Please try again.");
            });
    });
}
