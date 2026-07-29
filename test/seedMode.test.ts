import { GameData } from "../src/gameData";
import { Species } from "../src/types";
import {
    createNewGameState,
    formatGameStateForSharing,
    parseSeedParam,
    saveGameState,
    GameState,
} from "../src/gameState";
import { StorageProvider } from "../src/storage";
import rawGameData from "../src/jurassic/index.json";

// Seed mode - the deterministic practice primitive. These tests exercise the
// contract that E2E fixtures and playtests depend on: a chosen seed reproduces
// the same MAPPED target every load, seeded rounds never touch the daily
// storage key, and their share text cannot masquerade as the daily.

// Build GameData from the REAL served payload (not a mock) so reproducibility
// is pinned against the shipped species list, per the repo lesson
// mock-fixtures-hide-real-data-defects-test-the-real-payload.
const species: Species[] = Object.entries(rawGameData.species).map(
    ([id, s]) => ({
        id,
        species: s.species || "",
        translation: s.translation || "",
        clade: s.clade || "",
        period: s.period || "",
        size: s.size || "",
        weight: s.weight || "",
        description: s.description || "",
    })
);
const realData = new GameData(species, {});

class MemoryStorage implements StorageProvider {
    private store = new Map<string, string>();
    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
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
        return Array.from(this.store.keys())[index] ?? null;
    }
    keys(): string[] {
        return Array.from(this.store.keys());
    }
}

describe("parseSeedParam", () => {
    test("reads an integer seed from the query string", () => {
        expect(parseSeedParam("?seed=42")).toBe(42);
        expect(parseSeedParam("?foo=1&seed=7")).toBe(7);
        expect(parseSeedParam("?seed=0")).toBe(0);
        expect(parseSeedParam("?seed=-3")).toBe(-3);
        expect(parseSeedParam("?seed=%2012345%20")).toBe(12345); // trimmed
    });

    test("returns null when absent or malformed", () => {
        expect(parseSeedParam("")).toBeNull();
        expect(parseSeedParam("?other=1")).toBeNull();
        expect(parseSeedParam("?seed=")).toBeNull();
        expect(parseSeedParam("?seed=abc")).toBeNull();
        expect(parseSeedParam("?seed=4.2")).toBeNull();
        expect(parseSeedParam("?seed=1e3")).toBeNull();
        // Overflows Number.isSafeInteger - the guard for the "huge" edge case
        // the task called out. All-digits, so the regex passes; the safe-integer
        // check is what rejects it.
        expect(parseSeedParam("?seed=99999999999999999999")).toBeNull();
    });
});

describe("seeded target reproducibility on the real payload", () => {
    test("the same seed yields the same target every time", () => {
        for (const seed of [0, 1, 42, 149, 1000, 999999]) {
            const a = createNewGameState(realData, seed).targetId;
            const b = createNewGameState(realData, seed).targetId;
            expect(a).toBe(b);
            expect(species.some((s) => s.id === a)).toBe(true);
        }
    });

    test("the seed reproduces the MAPPED target, not the raw modulo pick", () => {
        // getRandomSpecies routes through the daily permutation, so the target
        // for seed 42 is the permuted species, not species[42 % n]. Guarding
        // this keeps seed mode composed with the randomized daily mapping.
        const seed = 42;
        const mapped = species[realData.speciesIndexForDate(seed)].id;
        expect(createNewGameState(realData, seed).targetId).toBe(mapped);
    });
});

describe("seeded rounds are isolated from daily storage", () => {
    test("saving a seeded practice round never writes the daily key", () => {
        const storage = new MemoryStorage();
        const seed = 42;

        // Pre-seed a real daily round for the same seed so a leaky key prefix
        // would collide and clobber it.
        const dailyKey = "gameState-dinosaur-#00043";
        const daily = new GameState(realData, "daily-target", new Set(["a"]));
        saveGameState(daily, seed, storage, "daily");
        expect(storage.keys()).toContain(dailyKey); // guards the key shape
        const dailyBefore = storage.getItem(dailyKey);

        const practice = createNewGameState(realData, seed);
        practice.guesses.add(species[0].id);
        saveGameState(practice, seed, storage, "practice");

        // The daily value is byte-for-byte untouched, and the practice write
        // landed under its own prefixed key.
        expect(storage.getItem(dailyKey)).toBe(dailyBefore);
        expect(storage.keys()).toContain("gameState-practice-dinosaur-#00043");
    });
});

describe("seeded share text does not masquerade as the daily", () => {
    test("practice mode labels the share as Practice for the chosen seed", () => {
        const target = species[realData.speciesIndexForDate(42)].id;
        const won = new GameState(realData, target, new Set([target]));

        const message = formatGameStateForSharing(won, {
            mode: "practice",
            seed: 42,
        });

        expect(message).toContain("Practice Dinosaur");
        expect(message).toContain("dinosaur-#00043"); // reflects the seed
    });

    test("daily mode output is unchanged (no Practice label)", () => {
        const won = new GameState(realData, "x", new Set(["x"]));
        const message = formatGameStateForSharing(won, {
            mode: "daily",
            seed: 1,
        });

        expect(message).not.toContain("Practice");
        expect(message).toContain("✅ Dinosaur dinosaur-#00002");
    });
});
