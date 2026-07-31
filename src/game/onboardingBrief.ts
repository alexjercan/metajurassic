import { GameState } from "../gameState";
import { buildOnboardingBrief } from "../ui/onboarding";
import { openPanel, renderHowToPlayCard } from "../ui/panel";

// The pre-guess brief fills the band below the tree and hands it back the
// moment the round is under way - the tree grows downward into exactly that
// space. Gated on "no guesses yet" rather than a stored first-visit flag, so
// the band is filled at the top of every round.
// See tasks/20260729-092327/DECISION.md.
export function syncOnboardingBrief(
    state: GameState,
    arena: HTMLElement | null,
    arenaWrapper: HTMLElement | null
) {
    if (!arena || !arenaWrapper) return;

    const wanted = state.numberOfGuesses() === 0 && !state.isGameOver();
    const existing = document.getElementById("onboarding-brief");

    if (!wanted) {
        existing?.remove();
        arena.classList.remove("has-brief");
        return;
    }
    if (existing) return;

    const brief = buildOnboardingBrief();
    // Mounted as a SIBLING of #arena, after it - inside the wrapper, NOT
    // inside the scroll container. Visually it still sits below the tree
    // and above the input, which is the band this fills, but it is not
    // subject to #arena's `overflow: auto`.
    //
    // Inside the arena, the brief's height competed with the tree's for the
    // arena's fixed height, and the brief lost: on a 1440x660 window its
    // last line and the How to play button were sliced off, and at 1280x720
    // merely showing #input-error grew .bottom-bar enough to put the arena
    // into 30px of overflow. As a flex sibling the brief takes its natural
    // height and #arena - which flex-grows, and is a scroll container, so
    // it may shrink - gives up the room instead.
    arenaWrapper.appendChild(brief);
    arena.classList.add("has-brief");

    brief.querySelector("#brief-how-to-play")?.addEventListener("click", () => {
        // An explicit request to read something opens the panel on every
        // viewport (tasks/20260729-141414/DECISION.md).
        renderHowToPlayCard();
        openPanel();
    });
}
