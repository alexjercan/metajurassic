import "./style.css";
import { loadGameData } from "./loader";
import { loadGameState } from "./state";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const inputEl = document.getElementById("player-input") as HTMLInputElement;
const autocompleteBox = document.getElementById(
    "autocomplete-box"
) as HTMLDivElement;
const playerInput = document.getElementById("player-input") as HTMLInputElement;

const data = await loadGameData();
const speciesNames = data.species.map((s) => s.species);
const state = loadGameState(data);

const findMatches = (query: string): string[] => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return speciesNames
        .filter((name) => name.toLowerCase().includes(normalized))
        .slice(0, 8);
};

const renderSuggestions = (query: string) => {
    autocompleteBox.innerHTML = "";
    const matches = findMatches(query).filter((name) => {
        const species = data.species.find((s) => s.species === name);
        if (!species) return true;
        return !state.guesses.has(species.id);
    });

    if (!matches.length) {
        autocompleteBox.style.display = "none";
        return;
    }

    matches.forEach((name) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = name;

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            inputEl.value = name;
            autocompleteBox.style.display = "none";
        });

        autocompleteBox.appendChild(item);
    });

    autocompleteBox.style.display = "block";
};

inputEl.addEventListener("input", () => {
    renderSuggestions(inputEl.value);
});

inputEl.addEventListener("focus", () => {
    renderSuggestions(inputEl.value);
});

inputEl.addEventListener("blur", () => {
    setTimeout(() => {
        autocompleteBox.style.display = "none";
    }, 100);
});

export function closePanel() {
    panel.classList.remove("active");
    arenaWrapper.classList.remove("panel-open");
}

(window as typeof window & { closePanel: () => void }).closePanel = closePanel;

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
