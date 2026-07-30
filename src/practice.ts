import "./style.css";
import { loadGameState, saveGameState } from "./gameState";
import {
    abandonPracticeRound,
    clearCurrentPracticeRound,
    resolvePracticeSeed,
    startNewPracticeRound,
} from "./practiceSession";
import { loadData, initGame } from "./game";
import { defaultStorage, StorageProvider } from "./storage";

// Stop playing this round and load a fresh one.
//
// The new round is CLAIMED here rather than left to the next load's fallback.
// Relying on the fallback broke the seeded case: abandoning a `?seed=N` round
// leaves any older `practice-current` pointer standing (it names a different
// seed), so the reload would resume that half-played round and a button saying
// "New game" would hand back an old game.
//
// The pathname is navigated to rather than the page merely reloaded so the
// `?seed=N` param is dropped on the way out - otherwise the param would win
// over the round just claimed. `replace` keeps the abandoned URL out of the
// history stack.
function startAnotherRound(seed: number, storage: StorageProvider) {
    abandonPracticeRound(seed, storage);
    startNewPracticeRound(storage);
    window.location.replace(window.location.pathname);
}

function wireNewGame(seed: number, storage: StorageProvider) {
    const newGameBtn = document.getElementById(
        "new-game-btn"
    ) as HTMLButtonElement;
    if (newGameBtn) {
        // Ships hidden in the SHARED template - the daily page renders the same
        // file and leaves it hidden. See tasks/20260729-101754/DECISION.md.
        newGameBtn.hidden = false;
        newGameBtn.addEventListener("click", () =>
            startAnotherRound(seed, storage)
        );
    }

    // The game-over modal's "Practice" link used to start a new round purely
    // because loading /practice/ re-randomized. Now that a load RESUMES, the
    // link would hand a finished round back unchanged, so on this page it
    // becomes the same explicit new-game action. On the daily page it is
    // untouched and still navigates to practice.
    const practiceLink = document.querySelector<HTMLAnchorElement>(
        ".modal-btn-practice"
    );
    if (practiceLink) {
        practiceLink.textContent = "New game";
        practiceLink.addEventListener("click", (event) => {
            event.preventDefault();
            startAnotherRound(seed, storage);
        });
    }
}

async function main() {
    const data = await loadData();
    const storage = defaultStorage();

    // Which round to play: `?seed=N` if given, else the one already in progress,
    // else a fresh one. Resolving this instead of always rolling a random seed
    // is the fix for tasks/20260729-101754 - the round was always being SAVED,
    // it was just never read back, so a reload silently abandoned it.
    const seed = resolvePracticeSeed(window.location.search, storage);
    const state = loadGameState(data, seed, storage, "practice");

    initGame({
        data,
        state,
        saveState: (s) => {
            saveGameState(s, seed, storage, "practice");
            // Resume only UNTIL the round finishes. The entry stays on disk -
            // finished rounds are the practice stats the profile page reads -
            // but the pointer goes, so the next load starts something new
            // rather than re-opening a game that is already over.
            if (s.isGameOver()) {
                clearCurrentPracticeRound(seed, storage);
            }
        },
        share: { mode: "practice", seed },
    });

    wireNewGame(seed, storage);
}

main();
