import { GameState } from "../gameState";
import { findNextHintCladeId } from "../treeBuilder";
import { hintChipCopy } from "../ui/onboarding";
import { isNarrowViewport, openPanel } from "../ui/panel";

declare const __webpack_public_path__: string;

export function updateHintButton(
    state: GameState,
    hintBox: HTMLDivElement | null
) {
    if (!hintBox) return;

    const hintText = document.getElementById("hint-text");

    if (state.isGameOver()) {
        hintBox.classList.remove("disabled");
        hintBox.classList.add("practice");
        if (hintText) {
            hintText.innerHTML = `<a href="${__webpack_public_path__}practice"><strong>Practice</strong></a>`;
        }
        return;
    }

    // Set in BOTH branches, not only at game over: the chip has to change
    // back if this function ever runs again on a live round, and driving it
    // from here is what keeps the price out of the markup.
    if (hintText) {
        const { label, detail } = hintChipCopy();
        hintText.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
    }
    hintBox.classList.remove("practice");

    const nextCladeId = findNextHintCladeId(state);
    const canHint =
        !state.isGameOver() &&
        nextCladeId !== null &&
        // canUseHint, not canAffordHint: the button must also respect the
        // per-round MAX_HINTS cap, not only the guess budget.
        state.canUseHint();

    if (canHint) {
        hintBox.classList.remove("disabled");
    } else {
        hintBox.classList.add("disabled");
    }
}

export function wireHintPurchase(
    state: GameState,
    hintBox: HTMLDivElement | null,
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
