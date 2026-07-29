import { GameData } from "../gameData";
import { GameState } from "../gameState";
import type { CladeNode } from "../treeBuilder";
import { findBestHintCladeId } from "../treeBuilder";
import { createSpeciesCard, createCladeCard, mountCard } from "./card";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const cardContainer = document.getElementById("panel-card-container");

let manuallyClosedPanel = false;

export function closePanel() {
    panel?.classList.remove("active");
    arenaWrapper?.classList.remove("panel-open");
}

export function openPanel() {
    panel?.classList.add("active");
    arenaWrapper?.classList.add("panel-open");
    manuallyClosedPanel = false;
}

export function closePanelManually() {
    closePanel();
    manuallyClosedPanel = true;
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
        // Before the first guess, render the root-clade hint into the panel but
        // leave the panel CLOSED: the first screen belongs to the tree and the
        // input, not to a card the player has not asked for. On a phone the
        // panel is full-width and overlays the arena exactly, which hid the game
        // itself on first load. The card sits ready behind the always-visible
        // #open-panel pull tab, so the hint is one tap away.
        // See tasks/20260729-092315/DECISION.md.
        const bestCladeId = findBestHintCladeId(roots);
        if (!bestCladeId) return;
        const clade = data.findCladeById(bestCladeId);
        if (!clade) return;
        renderCladeCard(clade);
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
        renderCladeCard(clade);
    }
    if (!manuallyClosedPanel) {
        openPanel();
    }
}

export function renderSpeciesCard(
    species: import("../types").Species,
    clade?: import("../types").Clade | null
) {
    if (!cardContainer) return;
    const card = createSpeciesCard(species, clade);
    mountCard(cardContainer, card);
}

export function renderCladeCard(clade: import("../types").Clade) {
    if (!cardContainer) return;
    const card = createCladeCard(clade);
    mountCard(cardContainer, card);
}
