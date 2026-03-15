import { Clade, Species } from "./types";
import { GameData } from "./gameData";

interface RawSpecies {
    species: string;
    translation: string;
    clade: string;
    period: string;
    size: string;
    weight: string;
    description: string;
    image?: string;
    icon?: string;
}

interface RawClade {
    clade: string;
    parent?: string;
    description: string;
    image?: string;
}

interface RawGameData {
    species: Record<string, RawSpecies>;
    clades: Record<string, RawClade>;
}

export async function loadGameData(): Promise<GameData> {
    const url = require("./jurassic/index.json") as string;
    const response = await fetch(url);
    const raw: RawGameData = await response.json();

    const species: Species[] = Object.entries(raw.species).map(([id, s]) => ({
        id,
        species: s.species || "",
        translation: s.translation || "",
        clade: s.clade || "",
        period: s.period || "",
        size: s.size || "",
        weight: s.weight || "",
        description: s.description || "",
        image: s.image || undefined,
        icon: s.icon || undefined,
    }));

    const cladesMap: Record<string, Clade> = {};
    for (const [id, c] of Object.entries(raw.clades)) {
        const clade: Clade = {
            id,
            name: c.clade || "",
            parent: c.parent ? c.parent.toLowerCase() : undefined,
            description: c.description || "",
            image: c.image || undefined,
        };
        cladesMap[clade.name.toLowerCase()] = clade;
    }

    return new GameData(species, cladesMap);
}
