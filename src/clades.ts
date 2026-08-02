import "./style.css";
import { loadGameData } from "./jsonLoader";
import { createCladeCard, shrinkCardTitle } from "./ui/card";
import { Clade } from "./types";

declare const __webpack_public_path__: string;

async function main() {
    const data = await loadGameData();
    const carousel = document.getElementById("archive-carousel");
    if (!carousel) return;

    const cladeList = Object.values(data.clades).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const clade of cladeList) {
        const card = createCladeCard(clade, "archive-card");
        // Appended here, not inside `createCladeCard`: that builder is shared
        // with the in-round clade panel, which must not offer a route to the
        // clade's members (`tasks/20260729-141425/DECISION.md`).
        card.appendChild(createMembersLink(clade));
        carousel.appendChild(card);
        shrinkCardTitle(card);
    }

    setupCarouselNav(carousel);
}

function createMembersLink(clade: Clade): HTMLElement {
    const link = document.createElement("a");
    link.className = "clade-card-members-link";
    link.href = `${__webpack_public_path__}species/?clade=${encodeURIComponent(clade.id)}`;
    link.textContent = `See species in ${clade.name}`;
    return link;
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
