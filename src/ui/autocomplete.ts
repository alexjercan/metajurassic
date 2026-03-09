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

    const findMatches = (query: string): string[] => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return [];

        return speciesNames
            .filter((name) => name.toLowerCase().includes(normalized))
            .slice(0, 8)
            .filter((name) => !isGuessed(name));
    };

    const renderSuggestions = (query: string) => {
        autocompleteBox.innerHTML = "";
        const matches = findMatches(query);

        if (!matches.length) {
            autocompleteBox.style.display = "none";
            return;
        }

        matches.forEach((name) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = name;

            item.addEventListener("mousedown", (event) => {
                event.preventDefault();
                inputEl.value = name;
                autocompleteBox.style.display = "none";
                onSelect?.(name);
            });

            autocompleteBox.appendChild(item);
        });

        autocompleteBox.style.display = "block";
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
        }, 100);
    });
}
