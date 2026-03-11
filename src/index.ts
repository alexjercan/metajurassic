import "./style.css";
import { MAX_GUESSES } from "./constants";
import { loadGameState, saveGameState } from "./gameState";
import { loadGameData } from "./markdownLoader";
import { setupAutocomplete } from "./ui";
import {
    renderLastGuess,
    openPanel,
    renderCladeCard,
    renderSpeciesCard,
} from "./ui/panel";
import { renderTree } from "./ui/treeVisualizer";
import { buildGuessTree } from "./treeBuilder";
import { showWinModal, showLossModal } from "./ui/modal";

const playerInput = document.getElementById("player-input") as HTMLInputElement;
const autocompleteBox = document.getElementById(
    "autocomplete-box"
) as HTMLDivElement;
const statBox = document.getElementById("stat-box") as HTMLDivElement;
const openPanelBtn = document.getElementById("open-panel") as HTMLButtonElement;

const data = await loadGameData();
const speciesNames = data.species.map((s) => s.species);
const state = loadGameState(data);

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
        saveGameState(state);
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
        if (state.lastGuessId) {
            const roots = buildGuessTree(state, state.isGameOver());
            renderLastGuess(state, data, roots);
        }
        openPanel();
    });
}

function updateUI() {
    playerInput.value = "";

    if (state.isGameOver()) {
        disableInput();
    }

    if (statBox) {
        const guessesLeft = Math.max(0, MAX_GUESSES - state.numberOfGuesses());
        statBox.textContent = `Guesses Left: ${guessesLeft}`;
    }
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

playerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (playerInput.disabled) return;
        const guess = playerInput.value.trim();
        if (!guess) return;
        submitGuess(guess);
    }
});

updateUI();
