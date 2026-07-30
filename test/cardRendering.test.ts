/**
 * @jest-environment jsdom
 */

// Museum cards against MISSING optional media.
//
// `src/ui/card.ts` interpolates `species.icon`, `species.image` and
// `clade.image` straight into an `img src`, and the `Species`/`Clade` types
// mark all three optional. Every one of the 150 species and 108 clades shipped
// today has all of them, so no route in the game renders a media-less card and
// no browser test can reach this path - the input has to be constructed, which
// makes it a unit test rather than an e2e one (tasks/20260729-092352/DECISION.md
// choice 4). What it pins is that an absent value produces a DELIBERATE
// fallback (the bundled default icon, a text placeholder) rather than
// `<img src="">`, which browsers resolve against the page URL and re-request.
//
// The rest of the suite runs in the `node` environment; the docblock above
// scopes jsdom to this file.

import {
    createCladeCard,
    createLockedSpeciesCard,
    createSpeciesCard,
} from "../src/ui/card";
import { Clade, Species } from "../src/types";

// Must match test/assetStub.js, which stands in for the webpack asset import.
const DEFAULT_ICON = "assets/default_icon.svg";

function makeSpecies(overrides: Partial<Species> = {}): Species {
    return {
        id: "trex",
        species: "Tyrannosaurus rex",
        translation: "Tyrant Lizard King",
        clade: "tyrannosauridae",
        period: "Late Cretaceous",
        size: "12 meters",
        weight: "8,000 kilograms",
        description: "A very large theropod.",
        image: "https://example.com/species/trex.png",
        icon: "https://example.com/clades/tyrannosauridae.svg",
        ...overrides,
    };
}

function makeClade(overrides: Partial<Clade> = {}): Clade {
    return {
        id: "tyrannosauridae",
        name: "Tyrannosauridae",
        parent: "tyrannosauroidea",
        description: "Big-headed theropods.",
        image: "https://example.com/clades/tyrannosauridae.svg",
        ...overrides,
    };
}

function srcs(card: HTMLElement): (string | null)[] {
    return Array.from(card.querySelectorAll("img")).map((img) =>
        img.getAttribute("src")
    );
}

describe("species card media fallbacks", () => {
    it("renders the supplied icon and image when both are present", () => {
        const species = makeSpecies();
        const card = createSpeciesCard(species, makeClade());

        expect(card.querySelector(".card-icon")?.getAttribute("src")).toBe(
            species.icon
        );
        expect(
            card.querySelector(".card-image-area img")?.getAttribute("src")
        ).toBe(species.image);
    });

    it("falls back to the default icon when the icon is missing", () => {
        const card = createSpeciesCard(
            makeSpecies({ icon: undefined }),
            makeClade()
        );

        expect(card.querySelector(".card-icon")?.getAttribute("src")).toBe(
            DEFAULT_ICON
        );
    });

    it("shows a placeholder instead of an empty img when the image is missing", () => {
        const card = createSpeciesCard(
            makeSpecies({ image: undefined }),
            makeClade()
        );

        expect(card.querySelector(".card-image-area")?.textContent).toContain(
            "Hologram Render"
        );
        expect(card.querySelector(".card-image-area img")).toBeNull();
    });

    it("never emits an empty img src, whatever media is absent", () => {
        const card = createSpeciesCard(
            makeSpecies({ icon: undefined, image: undefined }),
            null
        );

        expect(srcs(card).filter((src) => !src)).toEqual([]);
    });

    it("renders an em-dash placeholder for a missing clade rather than 'undefined'", () => {
        const card = createSpeciesCard(makeSpecies(), null);

        expect(card.textContent).not.toContain("undefined");
        expect(card.textContent).not.toContain("null");
    });

    it("marks an svg image so it gets the svg sizing class", () => {
        const card = createSpeciesCard(
            makeSpecies({ image: "https://example.com/species/trex.svg" }),
            makeClade()
        );

        expect(card.querySelector(".card-image-area img")?.className).toContain(
            "svg-img"
        );
    });
});

describe("locked species card media fallbacks", () => {
    it("falls back to the default icon and the locked placeholder", () => {
        const card = createLockedSpeciesCard(
            makeSpecies({ icon: undefined, image: undefined })
        );

        expect(card.querySelector(".card-icon")?.getAttribute("src")).toBe(
            DEFAULT_ICON
        );
        expect(card.querySelector(".card-image-area")?.textContent).toContain(
            "Locked"
        );
        expect(srcs(card).filter((src) => !src)).toEqual([]);
    });

    it("keeps the species name hidden even when media is present", () => {
        const species = makeSpecies();
        const card = createLockedSpeciesCard(species);

        expect(card.textContent).not.toContain(species.species);
        expect(card.querySelector(".card-title")?.textContent).toBe("???");
    });
});

describe("clade card media fallbacks", () => {
    it("renders the supplied image", () => {
        const clade = makeClade();
        const card = createCladeCard(clade);

        expect(
            card.querySelector(".card-image-area img")?.getAttribute("src")
        ).toBe(clade.image);
    });

    it("shows a placeholder instead of an empty img when the image is missing", () => {
        const card = createCladeCard(makeClade({ image: undefined }));

        expect(card.querySelector(".card-image-area")?.textContent).toContain(
            "No Image"
        );
        expect(srcs(card).filter((src) => !src)).toEqual([]);
    });

    it("falls back to a description placeholder rather than an empty block", () => {
        const card = createCladeCard(makeClade({ description: "" }));

        expect(card.querySelector(".card-fact")?.textContent).toContain(
            "No description."
        );
    });
});
