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
// The new round is CLAIMED here rather than left to the next load's fallback:
// abandoning a `?seed=N` round leaves any older `practice-current` pointer
// standing, so the fallback would hand back that half-played round
// (tasks/20260729-101754/DECISION.md section 4).
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

    // Now that a load RESUMES, the game-over modal's "Practice" link would hand
    // the finished round straight back, so on this page it becomes the same
    // explicit new-game action. The daily page renders the same template and
    // leaves the link navigating to practice.
    // See tasks/20260729-101754/DECISION.md section 1.
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
