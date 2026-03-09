import { Clade, Species } from "./types";

export class GameData {
    constructor(
        public readonly species: Species[],
        public readonly clades: Record<string, Clade>
    ) {}

    findSpeciesByName(name: string): Species | null {
        const normalized = name.trim().toLowerCase();
        if (!normalized) return null;

        return (
            this.species.find((s) => s.species.toLowerCase() === normalized) ||
            null
        );
    }

    findSpeciesById(id: string): Species | null {
        return this.species.find((s) => s.id === id) || null;
    }

    findCladeById(id: string): Clade | null {
        return this.clades[id.toLowerCase()] || null;
    }

    lineage(cladeId: string): string[] {
        const path: string[] = [];
        const visited = new Set<string>();
        let current = cladeId.toLowerCase();

        while (current && !visited.has(current)) {
            const clade = this.clades[current];
            if (!clade) break;

            path.push(clade.id);
            visited.add(current);
            current = clade.parent ? clade.parent.toLowerCase() : undefined;
        }

        return path;
    }

    computeLCA(species1Id: string, species2Id: string): string | null {
        const species1 = this.findSpeciesById(species1Id);
        const species2 = this.findSpeciesById(species2Id);

        if (!species1 || !species2) return null;

        const lineage1 = this.lineage(species1.clade);
        const lineage2 = this.lineage(species2.clade);

        const set2 = new Set(lineage2);

        for (const clade of lineage1) {
            if (set2.has(clade)) {
                return clade;
            }
        }

        return null;
    }

    speciesIndexForDate(date: Date): number {
        const msPerDay = 1000 * 60 * 60 * 24;

        return (
            Math.floor(
                (date.getTime() -
                    new Date(date.getFullYear(), 0, 0).getTime()) /
                    msPerDay
            ) % this.species.length
        );
    }

    getRandomSpecies(date: Date = new Date()): string {
        if (this.species.length === 0) {
            throw new Error("No species available in game data");
        }

        const index = this.speciesIndexForDate(date);
        return this.species[index].id;
    }
}
