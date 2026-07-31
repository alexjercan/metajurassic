import { GameData } from "../gameData";
import { GameState } from "../gameState";
import { loadGameData } from "../jsonLoader";
import { getTodaySeed } from "../puzzleKey";
import { ShareContext } from "../shareText";
import { buildGuessTree } from "../treeBuilder";
import { setupAutocomplete } from "../ui";
import { showLossModal, showWinModal } from "../ui/modal";
import {
    closePanelManually,
    isPanelOpen,
    openPanel,
    renderCladeCard,
    renderLastGuess,
    renderSpeciesCard,
} from "../ui/panel";
import { renderTree } from "../ui/treeVisualizer";
import { updateHintButton, wireHintPurchase } from "./hintChip";
import { syncOnboardingBrief } from "./onboardingBrief";
import { wireShareButton } from "./shareButton";

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
    const inputError = document.getElementById(
        "input-error"
    ) as HTMLParagraphElement | null;
    const arena = document.getElementById("arena");
    const arenaWrapper = document.getElementById("arena-wrapper");
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

    // A rejected guess is reported next to the input, never in a browser
    // alert(): the system dialog interrupted the round and read as a page error
    // rather than as part of the game. See tasks/20260729-092327/DECISION.md.
    function showInputError(message: string) {
        if (!inputError) return;
        inputError.textContent = message;
        inputError.hidden = false;
    }

    function clearInputError() {
        if (!inputError) return;
        inputError.textContent = "";
        inputError.hidden = true;
    }

    function submitGuess(guess: string) {
        if (state.isGameOver()) {
            showGameOverModal();
            return;
        }

        if (!guess.trim()) return;

        let rejection: string | null = null;
        try {
            state.makeGuess(guess);
            save();
        } catch (error) {
            rejection =
                error instanceof Error ? error.message : "Invalid guess";
        } finally {
            updateUI();

            // After updateUI(), which clears the message for the accepted case:
            // a rejected guess must leave its reason on screen, and `finally`
            // runs before the caller can.
            if (rejection) {
                showInputError(rejection);
            }

            if (state.isGameOver()) {
                showGameOverModal();
            }
        }
    }

    function updateUI() {
        playerInput.value = "";
        clearInputError();

        if (state.isGameOver()) {
            disableInput();
        }

        syncOnboardingBrief(state, arena, arenaWrapper);

        if (statBox) {
            statBox.textContent = `Guesses Left: ${state.guessesLeft()}`;
        }

        updateHintButton(state, hintBox);
        const roots = buildGuessTree(state, state.isGameOver());
        renderLastGuess(state, data, roots);
        const treeContainer = document.getElementById("tree-container");
        if (treeContainer) {
            renderTree({
                container: treeContainer,
                roots,
                lastGuessId: state.lastGuessId,
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

    wireHintPurchase(state, hintBox, save, updateUI, showGameOverModal);

    // Editing the guess is the player answering the rejection, so the message
    // has done its job and should not linger over the next attempt.
    playerInput.addEventListener("input", clearInputError);

    playerInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            if (playerInput.disabled) return;
            const guess = playerInput.value.trim();
            if (!guess) return;
            submitGuess(guess);
        }
    });

    wireShareButton(modalShareBtn, state, data, shareContext);

    updateUI();

    if (state.isGameOver()) {
        showGameOverModal();
    }
}
