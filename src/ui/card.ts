import type { Species, Clade } from "../types";
import defaultIcon from "../assets/default_icon.svg";
import { autoShrinkText } from "./autoShrink";

/**
 * Build the inner HTML for a species museum card and return the wrapper element.
 * The caller decides the outer class (e.g. "museum-card" vs "museum-card archive-card").
 */
export function createSpeciesCard(
    species: Species,
    clade?: Clade | null,
    extraClasses: string = ""
): HTMLElement {
    const card = document.createElement("div");
    card.className = `museum-card${extraClasses ? ` ${extraClasses}` : ""}`;

    const iconSrc = species.icon || defaultIcon;
    const imageHtml = species.image
        ? `<img src="${species.image}" alt="${species.species}">`
        : "[ Hologram Render ]";

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <img class="card-icon" src="${iconSrc}" alt="">
                <h2 class="card-title">${species.species}</h2>
            </div>
            <div class="card-image-area">${imageHtml}</div>
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

    return card;
}

/**
 * Build the inner HTML for a clade museum card and return the wrapper element.
 */
export function createCladeCard(
    clade: Clade,
    parent?: Clade | null,
    extraClasses: string = ""
): HTMLElement {
    const card = document.createElement("div");
    card.className = `museum-card${extraClasses ? ` ${extraClasses}` : ""}`;

    const imageHtml = clade.image
        ? `<img src="${clade.image}" alt="${clade.name}">`
        : "[ Hologram Render ]";

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <h2 class="card-title">${clade.name}</h2>
            </div>
            <div class="card-image-area">${imageHtml}</div>
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

    return card;
}

/**
 * Mount a card element into a container, replacing any existing content,
 * then auto-shrink the title. Use for single-card containers like the info panel.
 */
export function mountCard(
    container: HTMLElement,
    card: HTMLElement
): HTMLElement {
    container.innerHTML = "";
    container.appendChild(card);
    shrinkCardTitle(card);
    return card;
}

/**
 * Auto-shrink the title inside a card element.
 * Use after appending a card to the DOM so measurements are available.
 */
export function shrinkCardTitle(card: HTMLElement): void {
    const title = card.querySelector<HTMLElement>(".card-title");
    if (title) autoShrinkText(title);
}
