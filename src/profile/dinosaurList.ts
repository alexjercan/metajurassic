import {
    createSpeciesCard,
    createLockedSpeciesCard,
    shrinkCardTitle,
} from "../ui/card";
import { GameData } from "../gameData";

export function renderGuessedDinosaurs(
    guessedIds: Set<string>,
    discoveredIds: Set<string>,
    gameData: GameData
) {
    const carousel = document.getElementById("profile-carousel");
    const toggle = document.getElementById(
        "show-locked-toggle"
    ) as HTMLInputElement;
    if (!carousel || !toggle) return;

    const renderCards = (showLocked: boolean) => {
        carousel.innerHTML = "";

        const allSpecies = [...gameData.species].sort((a, b) =>
            a.species.localeCompare(b.species)
        );

        for (const species of allSpecies) {
            const isUnlocked = guessedIds.has(species.id);

            if (isUnlocked) {
                const clade = gameData.findCladeById(species.clade);
                const isRare = discoveredIds.has(species.id);
                const rarity = isRare ? "rare" : "common";
                const card = createSpeciesCard(
                    species,
                    clade || undefined,
                    "archive-card",
                    rarity
                );
                carousel.appendChild(card);
                shrinkCardTitle(card);
            } else if (showLocked) {
                const card = createLockedSpeciesCard(species, "archive-card");
                carousel.appendChild(card);
                shrinkCardTitle(card);
            }
        }

        setupCarouselNav(carousel);
    };

    renderCards(toggle.checked);

    toggle.addEventListener("change", () => {
        renderCards(toggle.checked);
    });
}

function setupCarouselNav(carousel: HTMLElement) {
    const leftBtn = document.getElementById(
        "profile-carousel-left"
    ) as HTMLButtonElement | null;
    const rightBtn = document.getElementById(
        "profile-carousel-right"
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
