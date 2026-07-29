import { GameData } from "./gameData";
import {
    formatGameStateForSharing,
    getTodaySeed,
    GameState,
    ShareContext,
} from "./gameState";
import { setupAutocomplete } from "./ui";
import {
    renderLastGuess,
    openPanel,
    closePanelManually,
    isPanelOpen,
    isNarrowViewport,
    renderCladeCard,
    renderSpeciesCard,
} from "./ui/panel";
import { renderTree } from "./ui/treeVisualizer";
import { buildGuessTree, findNextHintCladeId } from "./treeBuilder";
import { showWinModal, showLossModal } from "./ui/modal";
import { shareResult } from "./ui/share";
import { loadGameData } from "./jsonLoader";
import { computeGameStats } from "./gameStats";
import { defaultStorage } from "./storage";

declare const __webpack_public_path__: string;

export interface GameOptions {
    data: GameData;
    state: GameState;
    saveState?: (state: GameState) => void;
    // Which puzzle the share button should attribute this round to. Defaults to
    // today's daily; the practice page passes its own seed and mode so seeded
    // rounds share as "Practice" and do not masquerade as the daily.
    share?: ShareContext;
}

export async function loadData(): Promise<GameData> {
    return await loadGameData();
}

export function initGame({ data, state, saveState, share }: GameOptions) {
    const shareContext: ShareContext = share ?? {
        mode: "daily",
        seed: getTodaySeed(),
    };
    const playerInput = document.getElementById(
        "player-input"
    ) as HTMLInputElement;
    const autocompleteBox = document.getElementById(
        "autocomplete-box"
    ) as HTMLDivElement;
    const statBox = document.getElementById("stat-box") as HTMLDivElement;
    const openPanelBtn = document.getElementById(
        "open-panel"
    ) as HTMLButtonElement;
    const hintBox = document.getElementById("hint-box") as HTMLDivElement;
    const modalShareBtn = document.getElementById(
        "modal-share-btn"
    ) as HTMLButtonElement;

    const speciesNames = data.species.map((s) => s.species);

    function save() {
        if (saveState) {
            saveState(state);
        }
    }

    function showGameOverModal() {
        const target = data.findSpeciesById(state.targetId);
        const targetName = target ? target.species : "Unknown";
        if (state.isWin()) {
            showWinModal(targetName, state.numberOfGuesses());
        } else if (state.isLoss()) {
            showLossModal(targetName);
        }
    }

    function disableInput() {
        playerInput.disabled = true;
        playerInput.placeholder = "";
        autocompleteBox.style.display = "none";
    }

    function submitGuess(guess: string) {
        if (state.isGameOver()) {
            showGameOverModal();
            return;
        }

        if (!guess.trim()) return;

        try {
            state.makeGuess(guess);
            save();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Invalid guess");
        } finally {
            updateUI();

            if (state.isGameOver()) {
                showGameOverModal();
            }
        }
    }

    function updateHintButton() {
        if (!hintBox) return;

        if (state.isGameOver()) {
            hintBox.classList.remove("disabled");
            hintBox.classList.add("practice");
            const hintText = document.getElementById("hint-text");
            if (hintText) {
                hintText.innerHTML = `<a href="${__webpack_public_path__}practice"><strong>Practice</strong></a>`;
            }
            return;
        }

        const nextCladeId = findNextHintCladeId(state);
        const canHint =
            !state.isGameOver() &&
            nextCladeId !== null &&
            state.canAffordHint();

        if (canHint) {
            hintBox.classList.remove("disabled");
        } else {
            hintBox.classList.add("disabled");
        }
    }

    function updateUI() {
        playerInput.value = "";

        if (state.isGameOver()) {
            disableInput();
        }

        if (statBox) {
            statBox.textContent = `Guesses Left: ${state.guessesLeft()}`;
        }

        updateHintButton();
        const roots = buildGuessTree(state, state.isGameOver());
        renderLastGuess(state, data, roots);
        const treeContainer = document.getElementById("tree-container");
        if (treeContainer) {
            renderTree({
                container: treeContainer,
                roots,
                onSelect: (node) => {
                    if (node.type === "species") {
                        const species = data.findSpeciesById(node.speciesId);
                        if (!species) return;
                        const clade = data.findCladeById(species.clade);
                        renderSpeciesCard(species, clade || undefined);
                    } else {
                        const clade = data.findCladeById(node.cladeId);
                        if (!clade) return;
                        renderCladeCard(clade);
                    }
                    openPanel();
                },
            });
        }
    }

    setupAutocomplete({
        inputEl: playerInput,
        autocompleteBox,
        speciesNames,
        isGuessed: (name) => {
            const species = data.species.find((s) => s.species === name);
            if (!species) return false;
            return state.guesses.has(species.id);
        },
        onSelect: (name) => submitGuess(name),
    });

    if (openPanelBtn) {
        openPanelBtn.addEventListener("click", () => {
            if (isPanelOpen()) {
                closePanelManually();
                return;
            }
            if (state.lastGuessId) {
                const roots = buildGuessTree(state, state.isGameOver());
                renderLastGuess(state, data, roots);
            }
            openPanel();
        });
    }

    if (hintBox) {
        hintBox.addEventListener("click", () => {
            if (state.isGameOver()) return;

            const nextCladeId = findNextHintCladeId(state);
            if (!nextCladeId || !state.canAffordHint()) return;

            state.useHint(nextCladeId);
            save();
            updateUI();
            // Buying a hint is an explicit request to SEE something, unlike a
            // page load or the feedback that follows a guess, so it opens the
            // panel itself in exactly the cases where the updateUI() above will
            // not have done it - otherwise three spent guesses buy nothing but a
            // tree redraw.
            //
            //  - before the first guess, on any viewport: that branch of
            //    renderLastGuess deliberately does not auto-open
            //    (tasks/20260729-092315/DECISION.md);
            //  - on a narrow viewport at any point in the game: renderLastGuess
            //    never auto-opens there at all
            //    (tasks/20260729-141414/DECISION.md).
            //
            // Outside those two, updateUI() has already opened the panel unless
            // the player closed it by hand, and openPanel() would clear that
            // preference. Clearing it on the narrow path is harmless because the
            // narrow branch of renderLastGuess never consults it.
            if (!state.lastGuessId || isNarrowViewport()) {
                openPanel();
            }

            if (state.isGameOver()) {
                showGameOverModal();
            }
        });
    }

    playerInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            if (playerInput.disabled) return;
            const guess = playerInput.value.trim();
            if (!guess) return;
            submitGuess(guess);
        }
    });

    modalShareBtn?.addEventListener("click", () => {
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
                // The native sheet gives its own feedback, and a cancelled
                // share deserves none; only the silent clipboard write needs a
                // confirmation.
                if (outcome !== "copied") return;

                // Change the text to "Copied!" for 2 seconds, then revert back
                const shareBtnSpan = modalShareBtn.querySelector("span");
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
                alert("Failed to share game state. Please try again.");
            });
    });

    updateUI();

    if (state.isGameOver()) {
        showGameOverModal();
    }
}
