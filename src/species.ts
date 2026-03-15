import "./style.css";
import { loadGameData } from "./jsonLoader";
import { createSpeciesCard, shrinkCardTitle } from "./ui/card";

async function main() {
    const data = await loadGameData();
    const carousel = document.getElementById("archive-carousel");
    if (!carousel) return;

    const sorted = [...data.species].sort((a, b) =>
        a.species.localeCompare(b.species)
    );

    for (const species of sorted) {
        const clade = data.findCladeById(species.clade);
        const card = createSpeciesCard(species, clade, "archive-card");
        carousel.appendChild(card);
        shrinkCardTitle(card);
    }

    setupCarouselNav(carousel);
}

function setupCarouselNav(carousel: HTMLElement) {
    const leftBtn = document.getElementById(
        "carousel-left"
    ) as HTMLButtonElement | null;
    const rightBtn = document.getElementById(
        "carousel-right"
    ) as HTMLButtonElement | null;
    if (!leftBtn || !rightBtn) return;

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
}

main();
