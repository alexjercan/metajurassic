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

    // The blur hide is delayed, and the handle is kept so that RE-OPENING the
    // box cancels a pending hide. Without the cancel, a stale timer fires
    // after the re-render, hides a list that is in use, and leaves the
    // `keydown` handler below computing `isOpen === false` - so ArrowDown and
    // Enter are ignored. See tasks/20260729-130138/DECISION.md.
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
        // focus, which already cancels. Keeps "at most one armed hide" local
        // to this handler rather than dependent on that reasoning.
        cancelPendingHide();
        // The delay looks like dead weight - items `preventDefault()` on
        // `mousedown`, so clicking one does not blur the input - but no suite
        // covers every touch browser's blur-versus-tap ordering. Removing it
        // is its own change. See tasks/20260729-130138/DECISION.md.
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
            // `stopImmediatePropagation`, not `preventDefault` or
            // `stopPropagation`: `src/game/index.ts` registers a second
            // keydown listener on this SAME input, after this one, and sibling
            // listeners on one element are stopped only by the immediate form.
            // Without it the raw typed text - a partial query like "tyrann" -
            // reaches the exact-match lookup and is rejected as a species that
            // does not exist. Scoped to the highlighted case on purpose: with
            // no list open this branch does not run, so a genuinely bogus
            // guess still gets its rejection message.
            // See tasks/20260729-130138/DECISION.md.
            event.stopImmediatePropagation();
            selectAndSubmit(currentMatches[activeIndex]);
        }
    });
}
