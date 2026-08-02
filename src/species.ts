import "./style.css";
import { loadGameData } from "./jsonLoader";
import { GameData } from "./gameData";
import { createSpeciesCard, shrinkCardTitle } from "./ui/card";
import { speciesInClade, cladeFilterOptions } from "./cladeFilter";

const ALL_CLADES = "";

async function main() {
    const data = await loadGameData();
    const carousel = document.getElementById("archive-carousel");
    if (!carousel) return;

    const filter = document.getElementById(
        "clade-filter"
    ) as HTMLSelectElement | null;

    // The nav listeners bind to the carousel element, not to its cards, so they
    // are attached ONCE here and survive every re-render. Re-running this from
    // inside the render stacks a duplicate listener set per change, which is
    // what `src/profile/dinosaurList.ts` does; do not copy it.
    const refreshNav = setupCarouselNav(carousel);

    if (!filter) {
        renderCards(carousel, data, ALL_CLADES, refreshNav);
        return;
    }

    populateFilter(filter, data);
    filter.value = cladeFromUrl(data);
    renderCards(carousel, data, filter.value, refreshNav);

    filter.addEventListener("change", () => {
        renderCards(carousel, data, filter.value, refreshNav);
        syncUrl(filter.value);
    });
}

/**
 * The `?clade=` value if it resolves to a real clade, else `ALL_CLADES`.
 * An unknown id falls back to the full list rather than an empty page.
 */
function cladeFromUrl(data: GameData): string {
    const raw = new URLSearchParams(location.search).get("clade");
    if (!raw) return ALL_CLADES;

    const id = raw.trim().toLowerCase();
    return data.findCladeById(id) ? id : ALL_CLADES;
}

// Keeps the URL honest after a change, so the `/clades` deep link that brought
// the player here does not go stale in the address bar or on a reload.
function syncUrl(cladeId: string) {
    const url = new URL(location.href);
    if (cladeId === ALL_CLADES) {
        url.searchParams.delete("clade");
    } else {
        url.searchParams.set("clade", cladeId);
    }
    history.replaceState(null, "", url);
}

function populateFilter(filter: HTMLSelectElement, data: GameData) {
    const all = document.createElement("option");
    all.value = ALL_CLADES;
    all.textContent = `All clades (${data.species.length})`;
    filter.appendChild(all);

    for (const option of cladeFilterOptions(data)) {
        const el = document.createElement("option");
        el.value = option.id;
        el.textContent = `${option.name} (${option.count})`;
        filter.appendChild(el);
    }
}

function renderCards(
    carousel: HTMLElement,
    data: GameData,
    cladeId: string,
    refreshNav: () => void
) {
    const members =
        cladeId === ALL_CLADES ? data.species : speciesInClade(data, cladeId);

    const sorted = [...members].sort((a, b) =>
        a.species.localeCompare(b.species)
    );

    carousel.innerHTML = "";
    for (const species of sorted) {
        const clade = data.findCladeById(species.clade);
        const card = createSpeciesCard(species, clade, "archive-card");
        carousel.appendChild(card);
        shrinkCardTitle(card);
    }

    // Start the new list at its beginning. Emptying the carousel does NOT
    // reliably do this: the scroll position survives a wipe and re-append in one
    // tick unless a layout is flushed while the box is empty, which here only
    // happens by way of `shrinkCardTitle`. Do not lean on that.
    // Assigning 0 fires no `scroll` event when the position was already 0, and
    // the button state depends on the new `scrollWidth` regardless, so the nav
    // is refreshed explicitly rather than through the event.
    carousel.scrollLeft = 0;
    refreshNav();
}

/** Wire the carousel nav once and return the button-state refresher. */
function setupCarouselNav(carousel: HTMLElement): () => void {
    const leftBtn = document.getElementById(
        "carousel-left"
    ) as HTMLButtonElement | null;
    const rightBtn = document.getElementById(
        "carousel-right"
    ) as HTMLButtonElement | null;
    if (!leftBtn || !rightBtn) return () => {};

    const scrollAmount = 370;

    const updateButtons = () => {
        leftBtn.disabled = carousel.scrollLeft <= 0;
        rightBtn.disabled =
            carousel.scrollLeft + carousel.clientWidth >=
            carousel.scrollWidth - 1;
    };

    leftBtn.addEventListener("click", () => {
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });

    rightBtn.addEventListener("click", () => {
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });

    carousel.addEventListener("scroll", updateButtons);
    updateButtons();

    carousel.addEventListener(
        "wheel",
        (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            carousel.scrollBy({ left: e.deltaY });
        },
        { passive: false }
    );

    return updateButtons;
}

main();
