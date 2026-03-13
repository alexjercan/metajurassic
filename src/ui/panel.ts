import { GameData } from "../gameData";
import { GameState } from "../gameState";
import type { CladeNode } from "../treeBuilder";
import { findBestHintCladeId } from "../treeBuilder";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const cardTitle = document.getElementById("card-title");
const cardTranslation = document.getElementById("card-translation");
const cardEra = document.getElementById("card-era");
const cardSize = document.getElementById("card-size");
const cardSizeLabel = document.getElementById("card-size-label");
const cardWeight = document.getElementById("card-weight");
const cardFact = document.getElementById("card-fact");
const cardClade = document.getElementById("card-clade");
const cardImage = document.getElementById("card-image-area");

const speciesCard = document.getElementById("species-card");
const cladeCard = document.getElementById("clade-card");
const cladeTitle = document.getElementById("clade-title");
const cladeParent = document.getElementById("clade-parent");
const cladeDescription = document.getElementById("clade-description");
const cladeImage = document.getElementById("clade-image-area");

export function closePanel() {
    panel?.classList.remove("active");
    arenaWrapper?.classList.remove("panel-open");
}

export function openPanel() {
    panel?.classList.add("active");
    arenaWrapper?.classList.add("panel-open");
}

export function isPanelOpen() {
    return panel?.classList.contains("active") ?? false;
}

export function renderLastGuess(
    state: GameState,
    data: GameData,
    roots: CladeNode[]
) {
    if (!state.lastGuessId) {
        // If there is no last guess, show the root clades as hint
        const bestCladeId = findBestHintCladeId(roots);
        if (!bestCladeId) return;
        const clade = data.findCladeById(bestCladeId);
        if (!clade) return;
        renderCladeCard(clade);
        openPanel();
        return;
    }

    if (state.isWin()) {
        // Correct guess: show the target species
        const species = data.findSpeciesById(state.targetId);
        if (!species) return;
        const clade = data.findCladeById(species.clade);
        renderSpeciesCard(species, clade || undefined);
    } else {
        // Incorrect guess: show the best hint clade (direct parent of "?")
        const bestCladeId = findBestHintCladeId(roots);
        if (!bestCladeId) return;
        const clade = data.findCladeById(bestCladeId);
        if (!clade) return;
        const parent = clade.parent ? data.findCladeById(clade.parent) : null;
        renderCladeCard(clade, parent || undefined);
    }
    openPanel();
}

export function renderSpeciesCard(
    species: import("../types").Species,
    clade?: import("../types").Clade | null
) {
    if (speciesCard && cladeCard) {
        speciesCard.style.display = "block";
        cladeCard.style.display = "none";
    }
    if (cardTitle) cardTitle.textContent = species.species || "Unknown";
    if (cardTranslation)
        cardTranslation.textContent = species.translation || "";
    if (cardEra) cardEra.textContent = species.period || "";
    if (cardSizeLabel)
        cardSizeLabel.textContent = species.size ? "Size" : "Info";
    if (cardSize) cardSize.textContent = species.size || "";
    if (cardWeight) cardWeight.textContent = species.weight || "";
    if (cardFact) cardFact.textContent = species.description || "";
    if (cardClade) cardClade.textContent = clade ? clade.name : "";
    if (cardImage) cardImage.textContent = "[ Hologram Render ]";
}

export function renderCladeCard(
    clade: import("../types").Clade,
    parent?: import("../types").Clade | null
) {
    if (speciesCard && cladeCard) {
        speciesCard.style.display = "none";
        cladeCard.style.display = "block";
    }
    if (cladeTitle) cladeTitle.textContent = clade.name || "Unknown";
    if (cladeParent) cladeParent.textContent = parent ? parent.name : "—";
    if (cladeDescription)
        cladeDescription.textContent = clade.description || "No description.";
    if (cladeImage) cladeImage.textContent = "[ Hologram Render ]";
}
