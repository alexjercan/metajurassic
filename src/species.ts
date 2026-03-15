import "./style.css";
import { loadGameData } from "./jsonLoader";

async function main() {
    const data = await loadGameData();
    const carousel = document.getElementById("archive-carousel");
    if (!carousel) return;

    const sorted = [...data.species].sort((a, b) =>
        a.species.localeCompare(b.species)
    );

    for (const species of sorted) {
        const clade = data.findCladeById(species.clade);

        const card = document.createElement("div");
        card.className = "museum-card archive-card";

        card.innerHTML = `
            <div class="museum-card-inner">
                <div class="card-header">
                    <h2 class="card-title">${species.species}</h2>
                </div>
                <div class="card-image-area">${species.image ? `<img src="${species.image}" alt="${species.species}">` : "[ Hologram Render ]"}</div>
                <div class="card-content">
                    <div class="card-stats">
                        <strong>Translation:</strong> <span>${species.translation || "—"}</span><br/>
                        <strong>Clade:</strong> <span>${clade ? clade.name : "—"}</span><br/>
                        <strong>Era:</strong> <span>${species.period || "—"}</span><br/>
                        <strong>${species.size ? "Size" : "Info"}:</strong> <span>${species.size || "—"}</span><br/>
                        <strong>Weight:</strong> <span>${species.weight || "—"}</span>
                    </div>
                    <div class="card-fact">
                        <strong>Museum Fact:</strong> <span>${species.description || "—"}</span>
                    </div>
                </div>
            </div>
        `;

        carousel.appendChild(card);
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
}

main();
