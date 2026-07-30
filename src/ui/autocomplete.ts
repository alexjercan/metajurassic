// How many suggestions the box shows at once.
export const MAX_SUGGESTIONS = 8;

/**
 * The suggestions to offer for `query`, in the order they should be shown.
 *
 * Two ordering rules, and both matter:
 *
 * - Guessed species are dropped BEFORE the list is truncated. Truncating first
 *   let already-guessed names eat suggestion slots, so a player who guessed the
 *   8 offered "saur" species got an EMPTY box with 75 valid candidates left.
 * - Names STARTING with the query rank above names merely containing it, each
 *   group keeping source order. Without this, typing "tyr" offered
 *   `Tyrannosaurus` fourth, behind `Yutyrannus` and `Styracosaurus`.
 *
 * Exported so the ordering rules are testable without driving the DOM.
 */
export function findMatches(
    speciesNames: string[],
    query: string,
    isGuessed: (name: string) => boolean
): string[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const prefix: string[] = [];
    const interior: string[] = [];

    for (const name of speciesNames) {
        if (isGuessed(name)) continue;

        const lowered = name.toLowerCase();
        if (lowered.startsWith(normalized)) {
            prefix.push(name);
        } else if (lowered.includes(normalized)) {
            interior.push(name);
        }
    }

    return prefix.concat(interior).slice(0, MAX_SUGGESTIONS);
}

type AutocompleteOptions = {
    inputEl: HTMLInputElement;
    autocompleteBox: HTMLDivElement;
    speciesNames: string[];
    isGuessed: (name: string) => boolean;
    onSelect?: (name: string) => void;
};

export function setupAutocomplete(options: AutocompleteOptions) {
    const { inputEl, autocompleteBox, speciesNames, isGuessed, onSelect } =
        options;

    let activeIndex = -1;
    let currentMatches: string[] = [];

    const updateHighlight = () => {
        const items = autocompleteBox.querySelectorAll(".autocomplete-item");
        items.forEach((item, i) => {
            item.classList.toggle("autocomplete-active", i === activeIndex);
        });
    };

    const selectAndSubmit = (name: string) => {
        inputEl.value = name;
        autocompleteBox.style.display = "none";
        activeIndex = -1;
        currentMatches = [];
        onSelect?.(name);
    };

    const renderSuggestions = (query: string) => {
        autocompleteBox.innerHTML = "";
        activeIndex = -1;
        currentMatches = findMatches(speciesNames, query, isGuessed);

        if (!currentMatches.length) {
            autocompleteBox.style.display = "none";
            return;
        }

        currentMatches.forEach((name) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = name;

            item.addEventListener("mousedown", (event) => {
                event.preventDefault();
                selectAndSubmit(name);
            });

            autocompleteBox.appendChild(item);
        });

        activeIndex = 0;
        autocompleteBox.style.display = "block";
        updateHighlight();
    };

    // The blur handler hides the box on a short delay rather than immediately.
    // The handle is kept so that RE-OPENING the box cancels the pending hide:
    // without that, a player who taps another control and comes straight back
    // inside the window gets the stale timer firing AFTER the re-render, which
    // hides a list that is currently in use and makes the `keydown` handler
    // below compute `isOpen === false` and ignore ArrowDown and Enter
    // (20260729-130138).
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const cancelPendingHide = () => {
        if (hideTimer === undefined) return;
        clearTimeout(hideTimer);
        hideTimer = undefined;
    };

    inputEl.addEventListener("input", () => {
        cancelPendingHide();
        renderSuggestions(inputEl.value);
    });

    inputEl.addEventListener("focus", () => {
        cancelPendingHide();
        renderSuggestions(inputEl.value);
    });

    inputEl.addEventListener("blur", () => {
        // Belt and braces: a browser cannot blur twice without an intervening
        // focus, which already cancels, so this cannot fire with a timer
        // pending. It keeps the invariant "at most one armed hide" local to
        // this handler rather than dependent on that reasoning.
        cancelPendingHide();
        hideTimer = setTimeout(() => {
            hideTimer = undefined;
            autocompleteBox.style.display = "none";
            activeIndex = -1;
        }, 100);
    });

    inputEl.addEventListener("keydown", (event) => {
        const isOpen =
            autocompleteBox.style.display !== "none" &&
            currentMatches.length > 0;

        if (!isOpen) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex =
                activeIndex < currentMatches.length - 1 ? activeIndex + 1 : 0;
            updateHighlight();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex =
                activeIndex > 0 ? activeIndex - 1 : currentMatches.length - 1;
            updateHighlight();
        } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            // `preventDefault()` is NOT enough here, and stopPropagation would
            // not be either. `src/game.ts` registers its own keydown listener
            // on this SAME input (after this one), which submits the raw typed
            // text; sibling listeners on one element are only stopped by
            // stopImmediatePropagation. Without it both handlers run for every
            // Enter, and the selection survives only because submitting blanks
            // the input before the second handler reads it - an accident, not a
            // guard. Consuming the event here means a partial query like
            // "tyrann" can never reach the exact-match lookup and be rejected
            // as a species that does not exist (20260729-130138).
            //
            // Scoped to the highlighted case on purpose: with no list open this
            // branch does not run, so a genuinely bogus guess still reaches
            // `src/game.ts` and still gets its rejection message.
            event.stopImmediatePropagation();
            selectAndSubmit(currentMatches[activeIndex]);
        }
    });
}
