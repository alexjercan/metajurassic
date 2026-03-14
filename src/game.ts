import { GameData } from "./gameData";
import { GameState } from "./gameState";
import { setupAutocomplete } from "./ui";
import {
    renderLastGuess,
    openPanel,
    closePanel,
    isPanelOpen,
    renderCladeCard,
    renderSpeciesCard,
} from "./ui/panel";
import { renderTree } from "./ui/treeVisualizer";
import { buildGuessTree, findNextHintCladeId } from "./treeBuilder";
import { showWinModal, showLossModal } from "./ui/modal";
import { loadGameData } from "./jsonLoader";

declare const __webpack_public_path__: string;

export interface GameOptions {
    data: GameData;
    state: GameState;
    saveState?: (state: GameState) => void;
}

export async function loadData(): Promise<GameData> {
    return await loadGameData();
}

export function initGame({ data, state, saveState }: GameOptions) {
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
            let result = state.makeGuess(guess);
            save();
            console.log("Result:", result);
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
                        const parent = clade.parent
                            ? data.findCladeById(clade.parent)
                            : null;
                        renderCladeCard(clade, parent || undefined);
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
                closePanel();
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

    updateUI();

    if (state.isGameOver()) {
        showGameOverModal();
    }
}
