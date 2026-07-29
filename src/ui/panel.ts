import { GameData } from "../gameData";
import { GameState } from "../gameState";
import type { CladeNode } from "../treeBuilder";
import { findBestHintCladeId } from "../treeBuilder";
import { createSpeciesCard, createCladeCard, mountCard } from "./card";

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

// MIRRORS the `@media (max-width: 768px)` block in src/style.css, where
// `.info-panel` becomes `width: 100%` and stops sitting BESIDE the arena,
// overlaying it instead. Keep the two numbers in step: if the stylesheet
// breakpoint moves and this does not, the panel will auto-open onto viewports
// where it covers the tree, which is the bug this constant exists to prevent.
// e2e/mobile.spec.ts (Pixel 5) and e2e/panel.spec.ts (Desktop Chrome) pin the
// behaviour on either side of it.
const NARROW_VIEWPORT_QUERY = "(max-width: 768px)";

// Queried per call, not cached at module load, so a desktop window narrowed
// mid-game gets the phone behaviour on its next render.
export function isNarrowViewport() {
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

// Keep the pull tab describing its own current job: close the panel, open an
// unseen card (named), or open the panel generally.
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

// Called after a card is mounted. A card rendered while the panel is open is
// already in front of the player; one rendered while it is closed is the thing
// the tab has to advertise.
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
        // The starting hint is not NEW information - it is the same root clade
        // the tree's only node already shows - so the tab advertises it as plain
        // "Info" rather than flagging it unseen. The unseen marker is reserved
        // for a card the player's own guess produced.
        clearUnseenCard();
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
    // On a narrow viewport `.info-panel` is `width: 100%` and painted over the
    // arena, so auto-opening here would replace the tree - the feedback the
    // player just spent a guess on - with a museum card (playtest finding F3.5).
    // The card is still rendered above; the pull tab now names it and is one tap
    // away. Desktop keeps the auto-open: there the panel sits BESIDE the tree.
    // See tasks/20260729-141414/DECISION.md.
    //
    // Note this branch deliberately does NOT route through openPanel() on the
    // narrow path: that helper also clears `manuallyClosedPanel`
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

export function renderCladeCard(clade: import("../types").Clade) {
    if (!cardContainer) return;
    const card = createCladeCard(clade);
    mountCard(cardContainer, card);
    noteCardRendered(clade.name);
}
