import { GameState } from "../gameState";
import { findNextHintCladeId } from "../hintRule";
import { hintChipCopy } from "../ui/onboarding";
import { isNarrowViewport, openPanel } from "../ui/panel";

export function updateHintButton(
    state: GameState,
    hintBox: HTMLButtonElement | null,
    hintPractice: HTMLAnchorElement | null
) {
    if (!hintBox) return;

    const hintText = document.getElementById("hint-text");

    // The slot holds two elements and shows exactly one. The practice route is
    // markup, not an innerHTML string, so it can be a real link.
    if (state.isGameOver()) {
        hintBox.hidden = true;
        if (hintPractice) hintPractice.hidden = false;
        return;
    }

    hintBox.hidden = false;
    if (hintPractice) hintPractice.hidden = true;

    // Driving the copy from here is what keeps the price out of the markup.
    if (hintText) {
        const { label, detail } = hintChipCopy();
        hintText.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
    }

    const nextCladeId = findNextHintCladeId(state);
    const canHint =
        !state.isGameOver() &&
        nextCladeId !== null &&
        // canUseHint, not canAffordHint: the button must also respect the
        // per-round MAX_HINTS cap, not only the guess budget.
        state.canUseHint();

    hintBox.disabled = !canHint;
}

export function wireHintPurchase(
    state: GameState,
    hintBox: HTMLButtonElement | null,
    save: () => void,
    updateUI: () => void,
    showGameOverModal: () => void
) {
    if (!hintBox) return;

    hintBox.addEventListener("click", () => {
        if (state.isGameOver()) return;

        const nextCladeId = findNextHintCladeId(state);
        if (!nextCladeId || !state.canUseHint()) return;

        state.useHint(nextCladeId);
        save();
        updateUI();
        // Buying a hint opens the panel itself in exactly the two cases
        // `renderLastGuess` deliberately will not: before the first guess on any
        // viewport, and on a narrow viewport at any point. Outside those,
        // updateUI() has already opened it unless the player closed it by hand,
        // and openPanel() would clear that preference - harmless on the narrow
        // path, which never consults it. See tasks/20260729-092315/DECISION.md
        // and tasks/20260729-141414/DECISION.md.
        if (!state.lastGuessId || isNarrowViewport()) {
            openPanel();
        }

        if (state.isGameOver()) {
            showGameOverModal();
        }
    });
}
