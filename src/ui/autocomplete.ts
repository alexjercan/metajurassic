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

    const findMatches = (query: string): string[] => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return [];

        return speciesNames
            .filter((name) => name.toLowerCase().includes(normalized))
            .slice(0, 8)
            .filter((name) => !isGuessed(name));
    };

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
        currentMatches = findMatches(query);

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
