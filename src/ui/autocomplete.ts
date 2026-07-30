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

    inputEl.addEventListener("input", () => {
        renderSuggestions(inputEl.value);
    });

    inputEl.addEventListener("focus", () => {
        renderSuggestions(inputEl.value);
    });

    inputEl.addEventListener("blur", () => {
        setTimeout(() => {
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
            selectAndSubmit(currentMatches[activeIndex]);
        }
    });
}
