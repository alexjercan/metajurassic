import "./style.css";
import { loadGameState } from "./gameState";
import { loadGameData } from "./markdownLoader";
import { setupAutocomplete } from "./ui";

const inputEl = document.getElementById("player-input") as HTMLInputElement;
const autocompleteBox = document.getElementById(
    "autocomplete-box"
) as HTMLDivElement;
const playerInput = document.getElementById("player-input") as HTMLInputElement;

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

function updateUI() {
    playerInput.value = "";
    // TODO: Create a nice graph with the LCA and stuff
}

playerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (state.isGameOver()) return;

        const guess = playerInput.value.trim();
        if (!guess) return;

        try {
            let result = state.makeGuess(guess);
            console.log("Result:", result);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Invalid guess");
            return;
        } finally {
            updateUI();
        }
    }
});
