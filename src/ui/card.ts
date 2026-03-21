import type { Species, Clade } from "../types";
import defaultIcon from "../assets/default_icon.svg";
import { autoShrinkText } from "./autoShrink";

export type CardRarity = "common" | "rare";

/**
 * Build the inner HTML for a locked species card (not yet unlocked).
 * Shows censored/mysterious content.
 */
export function createLockedSpeciesCard(
    species: Species,
    extraClasses: string = ""
): HTMLElement {
    const card = document.createElement("div");
    card.className = `museum-card card-locked${extraClasses ? ` ${extraClasses}` : ""}`;

    const iconSrc = species.icon || defaultIcon;
    let imageHtml = "";
    if (species.image && species.image.endsWith(".svg")) {
        imageHtml = species.image
            ? `<img class="svg-img card-locked-image" src="${species.image}" alt="Locked">`
            : "[ Locked ]";
    } else {
        imageHtml = species.image
            ? `<img class="card-locked-image" src="${species.image}" alt="Locked">`
            : "[ Locked ]";
    }

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <img class="card-icon card-locked-icon" src="${iconSrc}" alt="">
                <h2 class="card-title card-locked-title">???</h2>
                <span class="card-locked-badge">🔒</span>
            </div>
            <div class="card-image-area card-locked-image-area">${imageHtml}</div>
            <div class="card-content">
                <div class="card-stats">
                    <strong>Translation:</strong> <span>???</span><br/>
                    <strong>Clade:</strong> <span>???</span><br/>
                    <strong>Era:</strong> <span>???</span><br/>
                    <strong>Size:</strong> <span>???</span><br/>
                    <strong>Weight:</strong> <span>???</span>
                </div>
                <div class="card-fact">
                    <strong>Museum Fact:</strong> <span>This dinosaur remains a mystery. Play more to unlock!</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

/**
 * Build the inner HTML for a species museum card and return the wrapper element.
 * The caller decides the outer class (e.g. "museum-card" vs "museum-card archive-card").
 */
export function createSpeciesCard(
    species: Species,
    clade?: Clade | null,
    extraClasses: string = "",
    rarity?: CardRarity
): HTMLElement {
    const card = document.createElement("div");
    card.className = `museum-card${extraClasses ? ` ${extraClasses}` : ""}`;

    // Add rarity class if specified
    if (rarity) {
        card.classList.add(`card-rarity-${rarity}`);
    }

    const iconSrc = species.icon || defaultIcon;
    let imageHtml = "";
    if (species.image && species.image.endsWith(".svg")) {
        imageHtml = species.image
            ? `<img class="svg-img" src="${species.image}" alt="${species.species}">`
            : "[ Hologram Render ]";
    } else {
        imageHtml = species.image
            ? `<img src="${species.image}" alt="${species.species}">`
            : "[ Hologram Render ]";
    }

    // Create rarity star HTML
    const rarityStarHtml =
        rarity === "rare" ? '<span class="card-rarity-star">★</span>' : "";

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <img class="card-icon" src="${iconSrc}" alt="">
                <h2 class="card-title">${species.species}</h2>
                ${rarityStarHtml}
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
    extraClasses: string = ""
): HTMLElement {
    const card = document.createElement("div");
    card.className = `museum-card${extraClasses ? ` ${extraClasses}` : ""}`;

    let imageHtml = "";
    if (clade.image && clade.image.endsWith(".svg")) {
        imageHtml = `<img class="svg-img" src="${clade.image}" alt="${clade.name}">`;
    } else if (clade.image) {
        imageHtml = `<img src="${clade.image}" alt="${clade.name}">`;
    } else {
        imageHtml = "[ No Image ]";
    }

    card.innerHTML = `
        <div class="museum-card-inner">
            <div class="card-header">
                <h2 class="card-title">${clade.name}</h2>
            </div>
            <div class="card-image-area">${imageHtml}</div>
            <div class="card-content">
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
