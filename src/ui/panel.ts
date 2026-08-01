import { GameData } from "../gameData";
import { GameState } from "../gameState";
import type { CladeNode } from "../treeBuilder";
import { findBestHintCladeId } from "../hintRule";
import { createSpeciesCard, createCladeCard, mountCard } from "./card";
import { buildHowToPlayCard } from "./onboarding";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const cardContainer = document.getElementById("panel-card-container");
const pullTab = document.getElementById("open-panel");
const pullTabLabel = document.getElementById("open-panel-label");

let manuallyClosedPanel = false;

// A card that has been rendered into the panel but not yet shown to the player,
// named by its title. The pull tab advertises it; opening the panel clears it.
let unseenCardTitle: string | null = null;

const DEFAULT_PULL_LABEL = "Info";

// MIRRORS the `@media (max-width: 768px)` block in
// src/partials/responsive.css, where
// `.info-panel` becomes `width: 100%` and overlays the arena instead of
// sitting beside it. Do not move one number without the other: a stale query
// auto-opens the panel over the tree. e2e/mobile.spec.ts (Pixel 5) and
// e2e/panel.spec.ts (Desktop Chrome) pin either side.
// See tasks/20260729-141414/DECISION.md.
const NARROW_VIEWPORT_QUERY = "(max-width: 768px)";

// Queried per call, not cached at module load, so a desktop window narrowed
// mid-game gets the phone behaviour on its next render. Nothing listens for
// the resize event (tasks/20260729-141414/DECISION.md).
export function isNarrowViewport() {
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

function syncPullTab() {
    if (!pullTab) return;
    const open = isPanelOpen();
    if (open) unseenCardTitle = null;

    const unseen = !open && unseenCardTitle !== null;
    pullTab.classList.toggle("has-unseen", unseen);
    if (pullTabLabel) {
        pullTabLabel.textContent = open
            ? "Close"
            : (unseenCardTitle ?? DEFAULT_PULL_LABEL);
    }
    pullTab.setAttribute(
        "aria-label",
        open
            ? "Close info panel"
            : unseen
              ? `Open info panel: ${unseenCardTitle}`
              : "Open info panel"
    );
}

// Only a card rendered into a CLOSED panel is unseen; one rendered into an
// open panel is already in front of the player.
function noteCardRendered(title: string) {
    if (isPanelOpen()) return;
    unseenCardTitle = title;
    syncPullTab();
}

function clearUnseenCard() {
    unseenCardTitle = null;
    syncPullTab();
}

export function closePanel() {
    panel?.classList.remove("active");
    arenaWrapper?.classList.remove("panel-open");
    syncPullTab();
}

export function openPanel() {
    panel?.classList.add("active");
    arenaWrapper?.classList.add("panel-open");
    manuallyClosedPanel = false;
    syncPullTab();
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
        // Before the first guess the card is rendered but the panel stays
        // CLOSED, on every viewport. The #open-panel pull tab is the
        // affordance; nothing here may open the panel.
        // See tasks/20260729-092315/DECISION.md.
        const bestCladeId = findBestHintCladeId(roots);
        if (!bestCladeId) return;
        const clade = data.findCladeById(bestCladeId);
        if (!clade) return;
        renderCladeCard(clade);
        // The starting hint is not NEW information - it is the same root clade
        // the tree's only node already shows - so the tab advertises it as plain
        // "Info" rather than flagging it unseen. The unseen marker is reserved
        // for a card the player's own guess produced.
        clearUnseenCard();
        return;
    }

    if (state.isWin()) {
        const species = data.findSpeciesById(state.targetId);
        if (!species) return;
        const clade = data.findCladeById(species.clade);
        renderSpeciesCard(species, clade || undefined);
    } else {
        const bestCladeId = findBestHintCladeId(roots);
        if (!bestCladeId) return;
        const clade = data.findCladeById(bestCladeId);
        if (!clade) return;
        renderCladeCard(clade);
    }
    // A guess auto-opens the panel on desktop only. On a narrow viewport the
    // panel covers the arena, so opening here would replace the feedback the
    // player just spent a guess on. See tasks/20260729-141414/DECISION.md.
    //
    // Do not rewrite this condition as an early `openPanel()` call: that
    // helper also clears `manuallyClosedPanel`
    // (LESSONS.md read-the-helper-body-not-its-name-before-reusing-it).
    if (!manuallyClosedPanel && !isNarrowViewport()) {
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
    noteCardRendered(species.species);
}

// The deeper onboarding reference mounts in this panel rather than in a
// surface of its own: no second "there is something to read" control.
// See tasks/20260729-092327/DECISION.md.
export function renderHowToPlayCard() {
    if (!cardContainer) return;
    mountCard(cardContainer, buildHowToPlayCard());
    noteCardRendered("How to play");
}

export function renderCladeCard(clade: import("../types").Clade) {
    if (!cardContainer) return;
    const card = createCladeCard(clade);
    mountCard(cardContainer, card);
    noteCardRendered(clade.name);
}
