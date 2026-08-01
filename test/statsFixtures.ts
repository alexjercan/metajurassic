import { StorageProvider } from "../src/storage";
import { Clade, Species } from "../src/types";

export const species: Species[] = [
    {
        id: "species1",
        species: "Species1",
        translation: "",
        clade: "cladea",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species2",
        species: "Species2",
        translation: "",
        clade: "cladea",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species3",
        species: "Species3",
        translation: "",
        clade: "cladea",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
];

export const clades: Record<string, Clade> = {
    cladea: {
        id: "cladea",
        name: "CladeA",
        description: "",
    },
};

export class MockLocalStorage implements StorageProvider {
    private store: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this.store.get(key) || null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    length(): number {
        return this.store.size;
    }

    key(index: number): string | null {
        const keys = Array.from(this.store.keys());
        return keys[index] || null;
    }

    clear(): void {
        this.store.clear();
    }
}
