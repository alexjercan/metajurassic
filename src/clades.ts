import "./style.css";
import { loadGameData } from "./jsonLoader";
import { autoShrinkText } from "./ui/autoShrink";

async function main() {
    const data = await loadGameData();
    const carousel = document.getElementById("archive-carousel");
    if (!carousel) return;

    const cladeList = Object.values(data.clades).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const clade of cladeList) {
        const parent = clade.parent ? data.findCladeById(clade.parent) : null;

        const card = document.createElement("div");
        card.className = "museum-card archive-card";

        card.innerHTML = `
            <div class="museum-card-inner">
                <div class="card-header">
                    <h2 class="card-title">${clade.name}</h2>
                </div>
                <div class="card-image-area">${clade.image ? `<img src="${clade.image}" alt="${clade.name}">` : "[ Hologram Render ]"}</div>
                <div class="card-content">
                    <div class="card-stats">
                        <strong>Parent:</strong> <span>${parent ? parent.name : "—"}</span>
                    </div>
                    <div class="card-fact">
                        <strong>Description:</strong> <span>${clade.description || "No description."}</span>
                    </div>
                </div>
            </div>
        `;

        carousel.appendChild(card);

        const title = card.querySelector<HTMLElement>(".card-title");
        if (title) autoShrinkText(title);
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
