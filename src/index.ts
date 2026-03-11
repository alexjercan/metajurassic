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

const inputEl = document.getElementById("player-input") as HTMLInputElement;
const autocompleteBox = document.getElementById(
    "autocomplete-box"
) as HTMLDivElement;
const playerInput = document.getElementById("player-input") as HTMLInputElement;
const statBox = document.getElementById("stat-box") as HTMLDivElement;
const openPanelBtn = document.getElementById("open-panel") as HTMLButtonElement;

const data = await loadGameData();
const speciesNames = data.species.map((s) => s.species);
const state = loadGameState(data);

setupAutocomplete({
    inputEl,
    autocompleteBox,
    speciesNames,
    isGuessed: (name) => {
        const species = data.species.find((s) => s.species === name);
        if (!species) return false;
        return state.guesses.has(species.id);
    },
});

if (openPanelBtn) {
    openPanelBtn.addEventListener("click", () => {
        if (state.lastGuessId) {
            const roots = buildGuessTree(state);
            renderLastGuess(state, data, roots);
        }
        openPanel();
    });
}

function updateUI() {
    playerInput.value = "";
    if (statBox) {
        const guessesLeft = Math.max(0, MAX_GUESSES - state.numberOfGuesses());
        statBox.textContent = `Guesses Left: ${guessesLeft}`;
    }
    const roots = buildGuessTree(state);
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
        if (state.isGameOver()) {
            alert("Game over! Please refresh to start a new game.");
            updateUI();
            return;
        }

        const guess = playerInput.value.trim();
        if (!guess) return;

        try {
            let result = state.makeGuess(guess);
            saveGameState(state);
            console.log("Result:", result);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Invalid guess");
        } finally {
            updateUI();
        }
    }
});

updateUI();
