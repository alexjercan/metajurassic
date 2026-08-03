import { GameData } from "../gameData";
import { GameState } from "../gameState";
import type { CladeNode } from "../treeBuilder";
import { findBestHintCladeId } from "../hintRule";
import { buildRankLadder } from "../rankLadder";
import { createSpeciesCard, createCladeCard, mountCard } from "./card";
import { buildLadderCard } from "./ladderCard";
import { buildHowToPlayCard } from "./onboarding";

const arenaWrapper = document.getElementById("arena-wrapper");
const panel = document.getElementById("info-panel");
const cardContainer = document.getElementById("panel-card-container");
const summaryContainer = document.getElementById("panel-summary-container");
const infoTab = document.getElementById("panel-tab-info");
const summaryTab = document.getElementById("panel-tab-summary");
const pullTab = document.getElementById("open-panel");
const pullTabLabel = document.getElementById("open-panel-label");

let manuallyClosedPanel = false;

// A card that has been rendered into the panel but not yet shown to the player,
// named by its title. The pull tab advertises it; opening the panel clears it.
let unseenCardTitle: string | null = null;

// The card the panel currently holds, named by its title. A repaint that mounts
// the same card again carries no new information, so it must not steal the pane
// back from the summary.
let mountedCardTitle: string | null = null;

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
    const changed = title !== mountedCardTitle;
    mountedCardTitle = title;

    // An unchanged card is a repaint, not new information: updateUI() runs from
    // submitGuess's `finally`, so a rejected guess - and any valid guess that
    // does not deepen the best clade - mounts the same card again. Neither may
    // steal the pane back from the summary, and neither may claim the unseen
    // marker. Both decisions sit behind this ONE gate on purpose: the pull tab
    // advertises the card the panel will open onto, so a pane it does not
    // switch is a card it must not promise.
    // `showCardPane()` covers the explicit "show me that card again" requests.
    if (!changed) return;

    // BEFORE the early return: this card is the one the panel is about to show,
    // whether it is already open or the pull tab advertises it by name. Leaving
    // the pane parked on Summary would mount every later card into a hidden
    // container and open the wrong pane over the card just promised.
    selectTab("info");
    if (isPanelOpen()) return;
    unseenCardTitle = title;
    syncPullTab();
}

function clearUnseenCard() {
    unseenCardTitle = null;
    syncPullTab();
}

// A closed panel is only pushed off-screen by a transform, so its tab buttons
// stay in the tab order unless the subtree is made `inert`. Set here rather than
// in `syncPullTab()`, which early-returns when the pull tab is absent.
export function closePanel() {
    panel?.classList.remove("active");
    if (panel) panel.inert = true;
    arenaWrapper?.classList.remove("panel-open");
    syncPullTab();
}

export function openPanel() {
    panel?.classList.add("active");
    if (panel) panel.inert = false;
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

// The round summary shares the panel with the museum card behind a tab strip:
// the panel already owns the "there is something to read" affordance, so no
// second pull tab and no top-bar control (tasks/20260729-092327/DECISION.md).
//
// Selecting a tab must NOT open the panel. `openPanel()` also clears
// `manuallyClosedPanel` (LESSONS.md
// read-the-helper-body-not-its-name-before-reusing-it), and the tabs are only
// reachable with the panel already open anyway.
function selectTab(tab: "info" | "summary") {
    const showSummary = tab === "summary";
    if (cardContainer) cardContainer.hidden = showSummary;
    if (summaryContainer) summaryContainer.hidden = !showSummary;
    infoTab?.classList.toggle("active", !showSummary);
    summaryTab?.classList.toggle("active", showSummary);
    infoTab?.setAttribute("aria-selected", String(!showSummary));
    summaryTab?.setAttribute("aria-selected", String(showSummary));
}

/**
 * Bring the museum-card pane forward without opening the panel.
 *
 * For a caller that mounted a card the player explicitly asked for - tapping a
 * tree node - where `noteCardRendered`'s changed-card gate would otherwise stay
 * silent because that same card was already mounted.
 */
export function showCardPane() {
    selectTab("info");
}

infoTab?.addEventListener("click", () => selectTab("info"));
summaryTab?.addEventListener("click", () => selectTab("summary"));

/**
 * Repaint the round summary from the tree the board is already showing.
 *
 * Never opens the panel and never flags an unseen card: the summary restates
 * what the player just saw rather than announcing anything new, so advertising
 * it would compete with the museum card the guess actually produced.
 */
export function renderRoundSummary(state: GameState, roots: CladeNode[]) {
    if (!summaryContainer) return;
    // Deliberately NOT `mountCard`: that also auto-shrinks the title, and this
    // pane is `hidden` at every render, where the parent width and the title's
    // scrollWidth both measure 0 so the shrink loop cannot run. There is
    // nothing to shrink anyway - the title is the fixed literal "Round summary",
    // which fits at the maximum size on the narrowest supported viewport
    // (pinned in e2e/ladder.spec.ts). Adding a re-measure on tab switch would
    // also mis-measure: `.ladder-card .card-header` is `flex-direction: column`,
    // so autoShrinkText would subtract the stacked counts line as if it sat
    // beside the title.
    summaryContainer.innerHTML = "";
    summaryContainer.appendChild(
        buildLadderCard(buildRankLadder(state, roots))
    );
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
