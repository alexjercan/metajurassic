import "./style.css";
import { loadGameData } from "./jsonLoader";

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
            <div class="card-header">
                <h2 class="card-title">${clade.name}</h2>
            </div>
            <div class="card-image-area">[ Hologram Render ]</div>
            <div class="card-content">
                <div class="card-stats">
                    <strong>Parent:</strong> <span>${parent ? parent.name : "—"}</span>
                </div>
                <div class="card-fact">
                    <strong>Description:</strong> <span>${clade.description || "No description."}</span>
                </div>
            </div>
        `;

        carousel.appendChild(card);
    }
}

main();
