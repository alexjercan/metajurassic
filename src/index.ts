import "./style.css";
import {
    Species,
    Clade,
    getRandomSpecies,
    findSpeciesByName,
    checkGuess,
    isAlreadyGuessed,
    formatPuzzleId,
    getDayOfYear,
} from "./game";

import { TreeVisualizer } from "./tree-visualizer";
import { buildGameTree, GameTreeState, Guess } from "./tree-builder";
import confetti from "canvas-confetti";
import { marked } from "marked";

let species: Species[] = [];
let clades: Map<string, Clade> = new Map();
let target: Species | null = null;
let guessesUsed: number = 0;
let maxGuesses: number = 20;
let guessedSpecies: Set<string> = new Set();
let guessHistory: Array<{
    name: string;
    clade: string | null;
    isCorrect: boolean;
}> = [];
let currentLCA: string | null = null;
let selectedNode: string | null = null;
let treeVisualizer: TreeVisualizer | null = null;
let gameWon: boolean = false;

/**
 * Get the localStorage key for today's puzzle
 */
function getSavedGameKey(): string {
    return `metajurassic-puzzle-${generatePuzzleNumber()}`;
}

/**
 * Save current game state to localStorage
 */
function saveGameState(): void {
    if (!target) return;

    const gameState = {
        puzzleNumber: generatePuzzleNumber(),
        targetId: target.id,
        guessesUsed,
        guessHistory,
        currentLCA,
        gameWon,
        selectedNode,
    };

    try {
        localStorage.setItem(getSavedGameKey(), JSON.stringify(gameState));
    } catch (error) {
        console.warn("Failed to save game state:", error);
    }
}

/**
 * Load game state from localStorage for today's puzzle
 * Returns true if successfully loaded, false if no save or invalid
 */
function loadGameState(): boolean {
    try {
        const key = getSavedGameKey();
        const saved = localStorage.getItem(key);

        if (!saved) {
            return false;
        }

        const gameState = JSON.parse(saved);

        if (gameState.puzzleNumber !== generatePuzzleNumber()) {
            return false;
        }

        target = species.find((s) => s.id === gameState.targetId) || null;
        if (!target) {
            return false;
        }

        guessesUsed = gameState.guessesUsed;
        guessHistory = gameState.guessHistory;
        currentLCA = gameState.currentLCA;
        gameWon = gameState.gameWon;
        selectedNode = gameState.selectedNode;

        guessedSpecies.clear();
        guessHistory.forEach((guess) => {
            guessedSpecies.add(guess.name.toLowerCase());
        });

        return true;
    } catch (error) {
        console.warn("Failed to load game state:", error);
        return false;
    }
}

async function loadGameData(): Promise<void> {
    const speciesList: Species[] = [];
    const cladeList: Clade[] = [];
    const cladeVisited: Set<string> = new Set();

    const response = await fetch("./jurassic/_index.json");
    const data = await response.json();

    for (const spec of data) {
        const id: string = spec.id;
        const name: string = spec.name;
        const cladeArray: string[] = spec.clade;

        try {
            const speciesResponse = await fetch(`./jurassic/species/${id}.md`);
            if (!speciesResponse.ok) {
                throw new Error(
                    `Failed to fetch species markdown: ${speciesResponse.status}`
                );
            }
            const description = await speciesResponse.text();

            speciesList.push({ id, name, clade: cladeArray, description });

            let cladeParent = null;
            for (const cladeName of cladeArray) {
                if (!cladeVisited.has(cladeName)) {
                    cladeVisited.add(cladeName);
                    const cladeId = cladeName
                        .toLowerCase()
                        .replace(/\s+/g, "-");

                    try {
                        const cladeResponse = await fetch(
                            `./jurassic/clades/${cladeId}.md`
                        );
                        let cladeDescription = "Description not available.";

                        if (cladeResponse.ok) {
                            cladeDescription = await cladeResponse.text();
                        } else {
                            console.warn(
                                `Clade markdown not found for ${cladeName}`
                            );
                        }

                        cladeList.push({
                            name: cladeName,
                            parent: cladeParent,
                            description: cladeDescription,
                        });
                    } catch (error) {
                        console.warn(
                            `Failed to fetch clade markdown for ${cladeName}:`,
                            error
                        );
                        cladeList.push({
                            name: cladeName,
                            parent: cladeParent,
                            description: "Description not available.",
                        });
                    }
                }
                cladeParent = cladeName;
            }
        } catch (error) {
            console.error(`Failed to load ${id}:`, error);
        }
    }

    species = speciesList;
    clades = new Map(cladeList.map((c) => [c.name, c]));
}

function generatePuzzleNumber(): string {
    return formatPuzzleId(getDayOfYear());
}

function startNewGame(): void {
    if (species.length === 0) {
        throw new Error("No species available to start the game.");
    }

    target = getRandomSpecies(species, new Date());
    guessesUsed = 0;
    guessedSpecies.clear();
    guessHistory = [];
    currentLCA = null;
    selectedNode = null;
    gameWon = false;
}

function makeGuess(guessName: string): {
    isCorrect: boolean;
    clade: string | null;
} {
    if (!target) {
        throw new Error("Game has not been started.");
    }

    if (guessesUsed >= maxGuesses) {
        throw new Error(
            `Maximum number of guesses (${maxGuesses}) has been reached.`
        );
    }

    const guessedSpec = findSpeciesByName(guessName, species);
    if (!guessedSpec) {
        throw new Error(`Species '${guessName}' not found in the dataset.`);
    }

    guessesUsed++;

    const result = checkGuess(guessedSpec, target);
    if (!result.isCorrect && result.clade) {
        currentLCA = result.clade;
    }

    return result;
}

function updateUI(): void {
    if (!target) return;

    const puzzleNumber = document.getElementById("puzzleNumber");
    if (puzzleNumber) {
        if (gameWon) {
            puzzleNumber.textContent = `${generatePuzzleNumber()} - ${target.name}`;
            puzzleNumber.style.color = "#22c55e";
        } else {
            puzzleNumber.textContent = generatePuzzleNumber();
            puzzleNumber.style.color = "";
        }
    }

    const remainingGuesses = document.getElementById("remainingGuesses");
    if (remainingGuesses) {
        const remaining = maxGuesses - guessesUsed;
        remainingGuesses.textContent = `(${remaining} remaining)`;
    }

    const guessCount = document.getElementById("guessCount");
    if (guessCount) {
        guessCount.textContent = `${guessesUsed} / ${maxGuesses}`;
    }

    updateHintSection();
    updateTreeVisualization();
}

function updateHintSection(): void {
    const hintContent = document.getElementById("hintContent");
    if (!hintContent) return;

    let displayName = "";
    let description = "";

    if (selectedNode) {
        displayName = selectedNode;

        const clade = clades.get(selectedNode);
        if (clade) {
            description = clade.description;
        } else {
            const spec = species.find((s) => s.name === selectedNode);
            if (spec) {
                description = spec.description;
            } else {
                description = "Description not available.";
            }
        }
    } else {
        if (!currentLCA) {
            const rootClade = Array.from(clades.values()).find((c) => !c.parent);
            if (rootClade) {
                displayName = rootClade.name;
                description = rootClade.description;
            } else {
                hintContent.innerHTML =
                    '<p class="hint-empty">Make your first guess to reveal clues!</p>';
                return;
            }
        } else {
            const clade = clades.get(currentLCA);
            displayName = currentLCA;
            description = clade?.description || "Description not available.";
        }
    }

    const htmlDescription = marked(description);
    hintContent.innerHTML = `
        <div class="hint-clade">🧬 ${displayName}</div>
        <div class="hint-description">${htmlDescription}</div>
    `;
}

function onNodeClick(nodeName: string): void {
    selectedNode = nodeName;
    updateHintSection();
}

function updateTreeVisualization(): void {
    const treeVizContainer = document.getElementById("treeVisualization");
    if (!treeVizContainer) return;

    treeVizContainer.innerHTML = "";

    const guessArray: Guess[] = guessHistory.map((guess) => {
        const guessSpecies = findSpeciesByName(guess.name, species);
        return {
            species: guessSpecies!,
            clade: guess.clade,
            isCorrect: guess.isCorrect,
        };
    });

    const treeState: GameTreeState = {
        guesses: guessArray,
        clades,
    };

    const treeData = buildGameTree(treeState);

    treeVisualizer = new TreeVisualizer({
        containerId: "treeVisualization",
        width: 600,
        height: 400,
        nodeRadius: 25,
        animationDuration: 300,
        onNodeClick: onNodeClick,
    });

    treeVisualizer.render(treeData);
}

function triggerConfetti(): void {
    if (typeof confetti !== "undefined") {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
        });

        setTimeout(() => {
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.5 },
            });
        }, 250);

        setTimeout(() => {
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.4 },
            });
        }, 500);
    }
}

function showWinModal(): void {
    triggerConfetti();

    const winModal = document.getElementById("winModal");
    const winCreatureName = document.getElementById("winCreatureName");
    const winGuessCount = document.getElementById("winGuessCount");

    if (winModal && winCreatureName && winGuessCount && target) {
        winCreatureName.textContent = target.name;
        winGuessCount.textContent = `You found it in ${guessesUsed} ${guessesUsed === 1 ? "guess" : "guesses"}!`;
        winModal.classList.remove("hidden");
    }
}

function handleGuess(): void {
    const input = document.getElementById("guessInput") as HTMLInputElement;
    const guessName = input.value.trim();

    if (!guessName) {
        alert("Please enter a species name");
        return;
    }

    if (isAlreadyGuessed(guessName, guessedSpecies)) {
        alert("You already guessed that species!");
        input.value = "";
        return;
    }

    try {
        const result = makeGuess(guessName);
        guessedSpecies.add(guessName.toLowerCase());
        guessHistory.push({
            name: guessName,
            clade: result.clade,
            isCorrect: result.isCorrect,
        });

        input.value = "";
        closeAutocomplete();

        selectedNode = null;
        saveGameState();

        if (result.isCorrect) {
            gameWon = true;
            saveGameState();
            updateUI();
            setTimeout(showWinModal, 300);
        } else {
            updateUI();
        }
    } catch (error) {
        alert(`Error: ${(error as Error).message}`);
        input.value = "";
    }
}

function updateAutocomplete(inputValue: string): void {
    const autocompleteList = document.getElementById("autocompleteList") as HTMLUListElement;

    if (!inputValue.trim()) {
        closeAutocomplete();
        return;
    }

    const filtered = species.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    if (filtered.length === 0) {
        autocompleteList.innerHTML = '<li class="autocomplete-no-results">No matches found</li>';
        autocompleteList.classList.add("active");
        return;
    }

    autocompleteList.innerHTML = filtered
        .slice(0, 10)
        .map((s) => `<li class="autocomplete-item">${s.name}</li>`)
        .join("");

    autocompleteList.classList.add("active");

    const items = autocompleteList.querySelectorAll(".autocomplete-item");
    items.forEach((item) => {
        item.addEventListener("click", () => {
            const input = document.getElementById("guessInput") as HTMLInputElement;
            input.value = item.textContent || "";
            closeAutocomplete();
            handleGuess();
        });
    });
}

function closeAutocomplete(): void {
    const autocompleteList = document.getElementById("autocompleteList");
    if (autocompleteList) {
        autocompleteList.classList.remove("active");
        autocompleteList.innerHTML = "";
    }
}

async function initGame(): Promise<void> {
    try {
        await loadGameData();
        console.log(
            `Loaded ${species.length} species and ${clades.size} clades`
        );

        const loadedSavedGame = loadGameState();

        if (!loadedSavedGame) {
            startNewGame();
        } else {
            console.log("Resuming saved game");
        }

        const guessButton = document.getElementById("guessButton");
        const guessInput = document.getElementById(
            "guessInput"
        ) as HTMLInputElement;
        const nextGameButton = document.getElementById("nextGameButton");

        if (nextGameButton) {
            nextGameButton.addEventListener("click", () => {
                const winModal = document.getElementById("winModal");
                if (winModal) {
                    winModal.classList.add("hidden");
                }
            });
        }

        if (guessButton) {
            guessButton.addEventListener("click", handleGuess);
        }

        if (guessInput) {
            guessInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    handleGuess();
                }
            });

            guessInput.addEventListener("input", (e) => {
                const value = (e.target as HTMLInputElement).value;
                updateAutocomplete(value);
            });

            guessInput.addEventListener("blur", () => {
                setTimeout(() => closeAutocomplete(), 200);
            });
        }

        updateUI();
    } catch (error) {
        console.error("Failed to initialize game:", error);
        alert("Failed to load game data. Check the console for details.");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
} else {
    initGame();
}
