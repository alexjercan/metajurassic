import { Clade, Species } from "./types";

const FIRST_DAY = new Date(2026, 0, 1); // January 1, 2026

// Fixed salt for the daily shuffle. The adjacency guarantee (consecutive days
// never land on array-adjacent species positions) is a purely positional
// property of the permutation, so it depends only on the species count and
// this salt. This value (the golden-ratio hashing constant) yields zero
// adjacent pairs for the shipped count of 150; gameData.test.ts pins that
// against the real list. Changing it reshuffles the whole schedule, so keep it
// stable.
const DAILY_SHUFFLE_SALT = 0x9e3779b9;

// mulberry32: a tiny deterministic 32-bit PRNG. Pure, no global state, so the
// same seed produces the same stream on every device and offline.
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Deterministic Fisher-Yates permutation of [0, n) seeded by `salt`.
function seededPermutation(n: number, salt: number): number[] {
    const perm = Array.from({ length: n }, (_, i) => i);
    const rand = mulberry32(salt);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm;
}

export function dateToSeed(date: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;

    return Math.floor((date.getTime() - FIRST_DAY.getTime()) / msPerDay) + 1;
}

export function seedToDate(seed: number): Date {
    const msPerDay = 1000 * 60 * 60 * 24;

    return new Date(FIRST_DAY.getTime() + (seed - 1) * msPerDay);
}

export class GameData {
    // Lazily built, then cached: the seeded permutation of the species list
    // that maps a daily seed to a species index.
    private dailyOrder?: number[];

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

    speciesIndexForDate(seed: number): number {
        const n = this.species.length;
        if (n === 0) return 0;

        if (!this.dailyOrder) {
            this.dailyOrder = seededPermutation(n, DAILY_SHUFFLE_SALT);
        }

        // Normalize the seed into [0, n) before the permutation lookup so that
        // negative or out-of-range seeds still map deterministically.
        const slot = ((seed % n) + n) % n;
        return this.dailyOrder[slot];
    }

    getRandomSpecies(seed: number): string {
        if (this.species.length === 0) {
            throw new Error("No species available in game data");
        }

        const index = this.speciesIndexForDate(seed);
        return this.species[index].id;
    }
}
