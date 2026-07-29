import { GameData } from "./gameData";
import {
    formatGameStateForSharing,
    getTodaySeed,
    GameState,
    ShareContext,
} from "./gameState";
import { setupAutocomplete } from "./ui";
import {
    renderLastGuess,
    openPanel,
    closePanelManually,
    isPanelOpen,
    isNarrowViewport,
    renderCladeCard,
    renderSpeciesCard,
    renderHowToPlayCard,
} from "./ui/panel";
import { buildOnboardingBrief, hintChipCopy } from "./ui/onboarding";
import { renderTree } from "./ui/treeVisualizer";
import { buildGuessTree, findNextHintCladeId } from "./treeBuilder";
import { showWinModal, showLossModal } from "./ui/modal";
import { shareResult } from "./ui/share";
import { loadGameData } from "./jsonLoader";
import { computeGameStats } from "./gameStats";
import { defaultStorage } from "./storage";

declare const __webpack_public_path__: string;

export interface GameOptions {
    data: GameData;
    state: GameState;
    saveState?: (state: GameState) => void;
    // Which puzzle the share button should attribute this round to. Defaults to
    // today's daily; the practice page passes its own seed and mode so seeded
    // rounds share as "Practice" and do not masquerade as the daily.
    share?: ShareContext;
}

export async function loadData(): Promise<GameData> {
    return await loadGameData();
}

export function initGame({ data, state, saveState, share }: GameOptions) {
    const shareContext: ShareContext = share ?? {
        mode: "daily",
        seed: getTodaySeed(),
    };
    const playerInput = document.getElementById(
        "player-input"
    ) as HTMLInputElement;
    const autocompleteBox = document.getElementById(
        "autocomplete-box"
    ) as HTMLDivElement;
    const statBox = document.getElementById("stat-box") as HTMLDivElement;
    const openPanelBtn = document.getElementById(
        "open-panel"
    ) as HTMLButtonElement;
    const hintBox = document.getElementById("hint-box") as HTMLDivElement;
    const inputError = document.getElementById(
        "input-error"
    ) as HTMLParagraphElement | null;
    const arena = document.getElementById("arena");
    const arenaWrapper = document.getElementById("arena-wrapper");
    const modalShareBtn = document.getElementById(
        "modal-share-btn"
    ) as HTMLButtonElement;

    const speciesNames = data.species.map((s) => s.species);

    function save() {
        if (saveState) {
            saveState(state);
        }
    }

    function showGameOverModal() {
        const target = data.findSpeciesById(state.targetId);
        const targetName = target ? target.species : "Unknown";
        if (state.isWin()) {
            showWinModal(targetName, state.numberOfGuesses());
        } else if (state.isLoss()) {
            showLossModal(targetName);
        }
    }

    function disableInput() {
        playerInput.disabled = true;
        playerInput.placeholder = "";
        autocompleteBox.style.display = "none";
    }

    // A guess the game cannot accept - an unknown name, or one already played -
    // is reported next to the input instead of in a browser alert(), which
    // interrupted the round with a system dialog and read as a page error
    // rather than as part of the game.
    function showInputError(message: string) {
        if (!inputError) return;
        inputError.textContent = message;
        inputError.hidden = false;
    }

    function clearInputError() {
        if (!inputError) return;
        inputError.textContent = "";
        inputError.hidden = true;
    }

    function submitGuess(guess: string) {
        if (state.isGameOver()) {
            showGameOverModal();
            return;
        }

        if (!guess.trim()) return;

        let rejection: string | null = null;
        try {
            state.makeGuess(guess);
            save();
        } catch (error) {
            rejection =
                error instanceof Error ? error.message : "Invalid guess";
        } finally {
            updateUI();

            // After updateUI(), which clears the message for the accepted case:
            // a rejected guess must leave its reason on screen, and `finally`
            // runs before the caller can.
            if (rejection) {
                showInputError(rejection);
            }

            if (state.isGameOver()) {
                showGameOverModal();
            }
        }
    }

    function updateHintButton() {
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

    // The pre-guess brief fills the band below the tree that 20260729-141414
    // left empty, and hands it back the moment the round is under way - the
    // tree grows downward into exactly that space. Gated on "no guesses yet"
    // rather than a stored first-visit flag, so the band is filled at the top
    // of every round. See tasks/20260729-092327/DECISION.md.
    function syncOnboardingBrief() {
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

        brief
            .querySelector("#brief-how-to-play")
            ?.addEventListener("click", () => {
                // An explicit request to read something opens the panel on
                // every viewport (tasks/20260729-141414/DECISION.md).
                renderHowToPlayCard();
                openPanel();
            });
    }

    function updateUI() {
        playerInput.value = "";
        clearInputError();

        if (state.isGameOver()) {
            disableInput();
        }

        syncOnboardingBrief();

        if (statBox) {
            statBox.textContent = `Guesses Left: ${state.guessesLeft()}`;
        }

        updateHintButton();
        const roots = buildGuessTree(state, state.isGameOver());
        renderLastGuess(state, data, roots);
        const treeContainer = document.getElementById("tree-container");
        if (treeContainer) {
            renderTree({
                container: treeContainer,
                roots,
                onSelect: (node) => {
                    if (node.type === "species") {
                        const species = data.findSpeciesById(node.speciesId);
                        if (!species) return;
                        const clade = data.findCladeById(species.clade);
                        renderSpeciesCard(species, clade || undefined);
                    } else {
                        const clade = data.findCladeById(node.cladeId);
                        if (!clade) return;
                        renderCladeCard(clade);
                    }
                    openPanel();
                },
            });
        }
    }

    setupAutocomplete({
        inputEl: playerInput,
        autocompleteBox,
        speciesNames,
        isGuessed: (name) => {
            const species = data.species.find((s) => s.species === name);
            if (!species) return false;
            return state.guesses.has(species.id);
        },
        onSelect: (name) => submitGuess(name),
    });

    if (openPanelBtn) {
        openPanelBtn.addEventListener("click", () => {
            if (isPanelOpen()) {
                closePanelManually();
                return;
            }
            if (state.lastGuessId) {
                const roots = buildGuessTree(state, state.isGameOver());
                renderLastGuess(state, data, roots);
            }
            openPanel();
        });
    }

    if (hintBox) {
        hintBox.addEventListener("click", () => {
            if (state.isGameOver()) return;

            const nextCladeId = findNextHintCladeId(state);
            if (!nextCladeId || !state.canUseHint()) return;

            state.useHint(nextCladeId);
            save();
            updateUI();
            // Buying a hint is an explicit request to SEE something, unlike a
            // page load or the feedback that follows a guess, so it opens the
            // panel itself in exactly the cases where the updateUI() above will
            // not have done it - otherwise three spent guesses buy nothing but a
            // tree redraw.
            //
            //  - before the first guess, on any viewport: that branch of
            //    renderLastGuess deliberately does not auto-open
            //    (tasks/20260729-092315/DECISION.md);
            //  - on a narrow viewport at any point in the game: renderLastGuess
            //    never auto-opens there at all
            //    (tasks/20260729-141414/DECISION.md).
            //
            // Outside those two, updateUI() has already opened the panel unless
            // the player closed it by hand, and openPanel() would clear that
            // preference. Clearing it on the narrow path is harmless because the
            // narrow branch of renderLastGuess never consults it.
            if (!state.lastGuessId || isNarrowViewport()) {
                openPanel();
            }

            if (state.isGameOver()) {
                showGameOverModal();
            }
        });
    }

    // Editing the guess is the player answering the rejection, so the message
    // has done its job and should not linger over the next attempt.
    playerInput.addEventListener("input", clearInputError);

    playerInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            if (playerInput.disabled) return;
            const guess = playerInput.value.trim();
            if (!guess) return;
            submitGuess(guess);
        }
    });

    modalShareBtn?.addEventListener("click", () => {
        // Real numbers only: whatever this player has actually banked in this
        // mode. `computeGameStats` reads the same storage the finished round
        // was just saved to, so this game is already counted.
        const stats = computeGameStats(
            data,
            defaultStorage(),
            shareContext.mode
        );
        const shareData = formatGameStateForSharing(state, shareContext, {
            currentStreak: stats.currentStreak,
            averageGuesses: stats.averageGuesses,
            wins: stats.wins,
        });

        shareResult(shareData)
            .then((outcome) => {
                // The native sheet gives its own feedback, and a cancelled
                // share deserves none; only the silent clipboard write needs a
                // confirmation.
                if (outcome !== "copied") return;

                // Change the text to "Copied!" for 2 seconds, then revert back
                const shareBtnSpan = modalShareBtn.querySelector("span");
                if (shareBtnSpan) {
                    const originalText = shareBtnSpan.textContent;
                    shareBtnSpan.textContent = "Copied!";
                    setTimeout(() => {
                        shareBtnSpan.textContent = originalText;
                    }, 2000);
                }
            })
            .catch((err) => {
                console.error("Failed to share game state: ", err);
                alert("Failed to share game state. Please try again.");
            });
    });

    updateUI();

    if (state.isGameOver()) {
        showGameOverModal();
    }
}
