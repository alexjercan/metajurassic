import { GameData } from "../gameData";
import { GameState } from "../gameState";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const panelPull = document.getElementById("open-panel");
const cardTitle = document.getElementById("card-title");
const cardEra = document.getElementById("card-era");
const cardSize = document.getElementById("card-size");
const cardSizeLabel = document.getElementById("card-size-label");
const cardFact = document.getElementById("card-fact");
const cardClade = document.getElementById("card-clade");
const cardImage = document.getElementById("card-image-area");

const speciesCard = document.getElementById("species-card");
const cladeCard = document.getElementById("clade-card");
const cladeTitle = document.getElementById("clade-title");
const cladeParent = document.getElementById("clade-parent");
const cladeDescription = document.getElementById("clade-description");

export function closePanel() {
    panel?.classList.remove("active");
    arenaWrapper?.classList.remove("panel-open");
    panelPull?.classList.remove("hidden");
}

(window as typeof window & { closePanel: () => void }).closePanel = closePanel;

export function openPanel() {
    panel?.classList.add("active");
    arenaWrapper?.classList.add("panel-open");
    panelPull?.classList.add("hidden");
}

export function renderLastGuess(state: GameState, data: GameData) {
    if (!state.lastGuessId) return;
    const species = data.findSpeciesById(state.lastGuessId);
    if (!species) return;
    const clade = data.findCladeById(species.clade);
    renderSpeciesCard(species, clade || undefined);
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
    if (cardEra) cardEra.textContent = species.period || "";
    if (cardSizeLabel)
        cardSizeLabel.textContent = species.size ? "Size" : "Info";
    if (cardSize) cardSize.textContent = species.size || "";
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
}
