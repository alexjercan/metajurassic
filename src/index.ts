import "./style.css";
import {
    Species,
    Clade,
    getRandomSpecies,
    findSpeciesByName,
    checkGuess,
    isAlreadyGuessed,
    formatPuzzleId,
    getDayOfYear
} from './game';

declare const require: {
    context(path: string, deep: boolean, filter: RegExp): {
        (key: string): any;
        keys(): string[];
    };
};

// Game state
let species: Species[] = [];
let clades: Map<string, Clade> = new Map();
let target: Species | null = null;
let guessesUsed: number = 0;
let maxGuesses: number = 20;
let guessedSpecies: Set<string> = new Set();
let guessHistory: Array<{ name: string; clade: string | null; isCorrect: boolean }> = [];
let currentLCA: string | null = null; // Track the most recent LCA for hint display

async function loadGameData(): Promise<void> {
    const speciesList: Species[] = [];
    const cladeList: Clade[] = [];
    const cladeVisited: Set<string> = new Set();

    const speciesContext = require.context('./jurassic/species', false, /\.md$/);
    const cladesContext = require.context('./jurassic/clades', false, /\.md$/);

    const response = await fetch('./jurassic/_index.json');
    const data = await response.json();

    for (const spec of data) {
        console.log(`Loading species: ${spec}`);
        const id: string = spec.id;
        const name: string = spec.name;
        const cladeArray: string[] = spec.clade;

        try {
            const speciesKey = `./${id}.md`;
            const module = speciesContext(speciesKey);
            const description = module.default;

            speciesList.push({ id, name, clade: cladeArray, description });

            let cladeParent = null;
            for (const cladeName of cladeArray) {
                if (!cladeVisited.has(cladeName)) {
                    cladeVisited.add(cladeName);
                    const cladeId = cladeName.toLowerCase().replace(/\s+/g, '-');
                    const cladeKey = `./${cladeId}.md`;
                    try {
                        const cladeModule = cladesContext(cladeKey);
                        const cladeDescription = cladeModule.default;
                        cladeList.push({ name: cladeName, parent: cladeParent, description: cladeDescription });
                    } catch (error) {
                        console.warn(`Clade markdown not found for ${cladeName}`);
                        cladeList.push({ name: cladeName, parent: cladeParent, description: "Description not available." });
                    }
                }
                cladeParent = cladeName;
            }
        } catch (error) {
            console.error(`Failed to load ${id}:`, error);
        }
    }

    species = speciesList;
    clades = new Map(cladeList.map(c => [c.name, c]));
}

function generatePuzzleNumber(): string {
    return formatPuzzleId(getDayOfYear());
}

function startNewGame(): void {
    if (species.length === 0) {
        throw new Error("No species available to start the game.");
    }
    // Pass current date to ensure same species for all players on the same day
    target = getRandomSpecies(species, new Date());
    guessesUsed = 0;
    guessedSpecies.clear();
    guessHistory = [];
    currentLCA = null;
}

function makeGuess(guessName: string): { isCorrect: boolean; clade: string | null } {
    if (!target) {
        throw new Error("Game has not been started.");
    }

    if (guessesUsed >= maxGuesses) {
        throw new Error(`Maximum number of guesses (${maxGuesses}) has been reached.`);
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

    // Update puzzle number
    const puzzleNumber = document.getElementById('puzzleNumber');
    if (puzzleNumber) {
        puzzleNumber.textContent = generatePuzzleNumber();
    }

    // Update remaining guesses
    const remainingGuesses = document.getElementById('remainingGuesses');
    if (remainingGuesses) {
        const remaining = maxGuesses - guessesUsed;
        remainingGuesses.textContent = `(${remaining} remaining)`;
    }

    // Update guess count
    const guessCount = document.getElementById('guessCount');
    if (guessCount) {
        guessCount.textContent = `${guessesUsed} / ${maxGuesses}`;
    }

    // Update hint section
    updateHintSection();

    // Update guess history
    updateGuessHistory();
}

function updateHintSection(): void {
    const hintContent = document.getElementById('hintContent');
    if (!hintContent) return;

    if (!currentLCA) {
        // Initial state: show hint to make first guess
        hintContent.innerHTML = '<p class="hint-empty">Make your first guess to reveal clues!</p>';
    } else {
        // Show the current LCA clade name and its description
        const clade = clades.get(currentLCA);
        const cladeDescription = clade?.description || "Description not available.";

        hintContent.innerHTML = `
            <div class="hint-clade">📊 ${currentLCA}</div>
            <p class="hint-description">${cladeDescription}</p>
        `;
    }
}

function updateGuessHistory(): void {
    const guessHistoryContainer = document.getElementById('guessHistory');
    if (!guessHistoryContainer) return;

    if (guessHistory.length === 0) {
        guessHistoryContainer.innerHTML = '<div class="empty-state">No guesses yet...</div>';
        return;
    }

    guessHistoryContainer.innerHTML = guessHistory.map((guess, index) => {
        const iconEmoji = guess.isCorrect ? '✅' : '❌';
        const itemClass = guess.isCorrect ? 'correct' : 'incorrect';
        const cladeText = guess.clade ? `<div class="guess-clade">→ ${guess.clade}</div>` : '';

        return `
            <div class="guess-item ${itemClass}">
                <div class="guess-name">
                    <span class="guess-icon">${iconEmoji}</span>${guess.name}
                </div>
                ${cladeText}
            </div>
        `;
    }).join('');
}

function handleGuess(): void {
    const input = document.getElementById('guessInput') as HTMLInputElement;
    const guessName = input.value.trim();

    if (!guessName) {
        alert('Please enter a species name');
        return;
    }

    if (isAlreadyGuessed(guessName, guessedSpecies)) {
        alert('You already guessed that species!');
        input.value = '';
        return;
    }

    try {
        const result = makeGuess(guessName);
        guessedSpecies.add(guessName.toLowerCase());
        guessHistory.push({
            name: guessName,
            clade: result.clade,
            isCorrect: result.isCorrect
        });

        input.value = '';

        if (result.isCorrect) {
            updateUI();
            alert(`🎉 Correct! The answer was ${target?.name}!`);
        } else {
            updateUI();
        }
    } catch (error) {
        alert(`Error: ${(error as Error).message}`);
        input.value = '';
    }
}

async function initGame(): Promise<void> {
    try {
        await loadGameData();
        console.log(`Loaded ${species.length} species and ${clades.size} clades`);

        startNewGame();

        // Set up event listeners
        const guessButton = document.getElementById('guessButton');
        const guessInput = document.getElementById('guessInput') as HTMLInputElement;

        if (guessButton) {
            guessButton.addEventListener('click', handleGuess);
        }

        if (guessInput) {
            guessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleGuess();
                }
            });
        }

        updateUI();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to load game data. Check the console for details.');
    }
}

// Start the game when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
