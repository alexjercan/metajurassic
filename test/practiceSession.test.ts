import {
    abandonPracticeRound,
    clearCurrentPracticeRound,
    CURRENT_SEED_KEY,
    MAX_PRACTICE_ENTRIES,
    prunePracticeEntries,
    resolvePracticeSeed,
    startNewPracticeRound,
} from "../src/practiceSession";
import { gameStateKey, PUZZLE_ID_MODULUS } from "../src/gameState";
import { MAX_GUESSES } from "../src/constants";
import { StorageProvider } from "../src/storage";

// The practice-round lifecycle at the storage level: what a reload resumes,
// what an explicit new game throws away, and what keeps localStorage bounded.
// See tasks/20260729-101754/DECISION.md for why each rule is the rule.

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

// An rng that hands out a scripted sequence of seeds, so the collision and
// pruning paths are driven deterministically instead of hoped for. Values are
// SEEDS; they are converted to the [0, 1) floats `Math.random` returns.
function scriptedRng(seeds: number[]): () => number {
    let index = 0;
    return () => {
        const seed = seeds[Math.min(index, seeds.length - 1)];
        index++;
        return seed / PUZZLE_ID_MODULUS;
    };
}

function writeRound(
    storage: StorageProvider,
    seed: number,
    options: {
        targetId?: string;
        guesses?: string[];
        hintClades?: string[];
        createdAt?: string;
    } = {}
) {
    storage.setItem(
        gameStateKey(seed, "practice"),
        JSON.stringify({
            targetId: options.targetId ?? "target-species",
            guesses: options.guesses ?? [],
            hintClades: options.hintClades ?? [],
            createdAt: options.createdAt ?? new Date().toISOString(),
        })
    );
}

function practiceKeys(storage: MemoryStorage): string[] {
    return storage.keys().filter((k) => k.startsWith("gameState-practice-"));
}

describe("resolvePracticeSeed", () => {
    test("resumes the round practice-current points at", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { guesses: ["a", "b"] });

        // The rng would produce a different seed; resuming must not consult it.
        expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(1234);
    });

    test("resumes a round that has been started but not yet guessed in", () => {
        // `startNewPracticeRound` writes the pointer; `saveGameState` only
        // writes the round on the first guess. A reload in between must NOT
        // re-roll, or the bug this task fixes just moves to the first second of
        // the round.
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "4321");

        expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(4321);
    });

    test("rolls a fresh round once the pointed-at one has finished", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, {
            targetId: "trex",
            guesses: ["stego", "trex"], // the target was found: round over
        });

        const seed = resolvePracticeSeed("", storage, scriptedRng([777]));

        expect(seed).toBe(777);
        expect(storage.getItem(CURRENT_SEED_KEY)).toBe("777");
        // The finished round is KEPT - it is a practice stat now.
        expect(storage.getItem(gameStateKey(1234, "practice"))).not.toBeNull();
    });

    test("treats an exhausted guess budget as finished", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, {
            targetId: "trex",
            guesses: Array.from({ length: MAX_GUESSES }, (_, i) => `s${i}`),
        });

        expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(777);
    });

    test("rolls a fresh round when the pointer is corrupt or dangling", () => {
        for (const pointer of ["", "  ", "abc", "1.5", "9007199254740993e3"]) {
            const storage = new MemoryStorage();
            storage.setItem(CURRENT_SEED_KEY, pointer);

            expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(
                777
            );
        }
    });

    test("rolls a fresh round when the saved round is unparseable", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        storage.setItem(gameStateKey(1234, "practice"), "{not json");

        expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(777);
    });

    test("?seed=N wins over the pointer and is not persisted", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { guesses: ["a"] });

        expect(
            resolvePracticeSeed("?seed=42", storage, scriptedRng([777]))
        ).toBe(42);
        // The unseeded round the player had in progress is still the pointer:
        // a one-off repro must not hijack it.
        expect(storage.getItem(CURRENT_SEED_KEY)).toBe("1234");
    });

    test("?seed=N is folded into the residue its storage key represents", () => {
        // Without the fold, `?seed=100042` and `?seed=42` name DIFFERENT
        // targets (`seed mod 150`) while sharing ONE storage key
        // (`seed mod 100000`), so each load resumes whichever wrote last. That
        // is the seed-param half of "practice seeds can collide modulo the key
        // format". After the fold they are simply the same round.
        const storage = new MemoryStorage();

        expect(resolvePracticeSeed("?seed=100042", storage)).toBe(42);
        expect(resolvePracticeSeed("?seed=-3", storage)).toBe(
            PUZZLE_ID_MODULUS - 3
        );
        // In-range seeds - every seed in the docs, the E2E fixtures and the
        // playtests - are untouched: the fold is the identity there.
        expect(resolvePracticeSeed("?seed=42", storage)).toBe(42);
        expect(resolvePracticeSeed("?seed=0", storage)).toBe(0);
        expect(
            resolvePracticeSeed(`?seed=${PUZZLE_ID_MODULUS - 1}`, storage)
        ).toBe(PUZZLE_ID_MODULUS - 1);
    });

    test("never resumes a saved round with no target", () => {
        // `isRoundOver(undefined, ...)` is false, so an entry like this would
        // otherwise look like a live round forever and the page would rebuild
        // a broken board on every load.
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        storage.setItem(
            gameStateKey(1234, "practice"),
            JSON.stringify({ guesses: [], hintClades: [] })
        );

        expect(resolvePracticeSeed("", storage, scriptedRng([777]))).toBe(777);
    });

    test("starts a round and records the pointer when storage is empty", () => {
        const storage = new MemoryStorage();

        const seed = resolvePracticeSeed("", storage, scriptedRng([777]));

        expect(seed).toBe(777);
        expect(storage.getItem(CURRENT_SEED_KEY)).toBe("777");
    });
});

describe("startNewPracticeRound", () => {
    test("draws inside [0, PUZZLE_ID_MODULUS) so seed and key are one-to-one", () => {
        // The old code drew from [0, 1_000_000) while the key is `seed mod
        // 10^5` - a 10:1 fold in which ten seeds shared one key. Anything the
        // rng produces must now land in the range the key can represent.
        const storage = new MemoryStorage();
        const draws = [0, 1, 50_000, PUZZLE_ID_MODULUS - 1];

        for (const draw of draws) {
            const seed = startNewPracticeRound(
                new MemoryStorage(),
                scriptedRng([draw])
            );
            expect(seed).toBe(draw);
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThan(PUZZLE_ID_MODULUS);
        }

        // Even an rng that returns exactly 1.0 (out of Math.random's contract)
        // must not produce an out-of-range seed.
        const seed = startNewPracticeRound(storage, () => 1);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(PUZZLE_ID_MODULUS);
    });

    test("re-draws when the first seed's key is already occupied", () => {
        const storage = new MemoryStorage();
        writeRound(storage, 111, { targetId: "someone-elses-round" });
        writeRound(storage, 222, { targetId: "also-taken" });

        const seed = startNewPracticeRound(
            storage,
            scriptedRng([111, 222, 333])
        );

        expect(seed).toBe(333);
        // Neither occupied round was disturbed by the re-draw.
        expect(storage.getItem(gameStateKey(111, "practice"))).not.toBeNull();
        expect(storage.getItem(gameStateKey(222, "practice"))).not.toBeNull();
    });

    test("never inherits an unrelated round's guesses when every draw collides", () => {
        // The pathological case: the rng keeps handing back one occupied seed.
        // The round is claimed anyway, but the stale entry is cleared first, so
        // the player starts empty rather than mid-way through a stranger's game.
        const storage = new MemoryStorage();
        writeRound(storage, 555, {
            targetId: "stale-target",
            guesses: ["a", "b", "c"],
        });

        const seed = startNewPracticeRound(storage, scriptedRng([555]));

        expect(seed).toBe(555);
        expect(storage.getItem(gameStateKey(555, "practice"))).toBeNull();
    });
});

describe("abandonPracticeRound", () => {
    test("deletes an UNFINISHED round and the pointer", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { guesses: ["a"] });

        abandonPracticeRound(1234, storage);

        expect(storage.getItem(gameStateKey(1234, "practice"))).toBeNull();
        expect(storage.getItem(CURRENT_SEED_KEY)).toBeNull();
    });

    test("KEEPS a finished round - it is a practice stat now", () => {
        // "I won -> New game" is the end of every round, and it runs through
        // here. Deleting the entry would erase the player's own record of the
        // game they just played from the profile page. DECISION.md fork 2.
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { targetId: "trex", guesses: ["trex"] });

        abandonPracticeRound(1234, storage);

        expect(storage.getItem(gameStateKey(1234, "practice"))).not.toBeNull();
        // The pointer still goes, or the finished round would be resumed.
        expect(storage.getItem(CURRENT_SEED_KEY)).toBeNull();
    });

    test("keeps a round lost by exhausting the guess budget", () => {
        const storage = new MemoryStorage();
        writeRound(storage, 1234, {
            targetId: "trex",
            guesses: Array.from({ length: MAX_GUESSES }, (_, i) => `s${i}`),
        });

        abandonPracticeRound(1234, storage);

        expect(storage.getItem(gameStateKey(1234, "practice"))).not.toBeNull();
    });

    test("deletes an unparseable entry rather than hoarding it", () => {
        const storage = new MemoryStorage();
        storage.setItem(gameStateKey(1234, "practice"), "{corrupt");

        abandonPracticeRound(1234, storage);

        expect(storage.getItem(gameStateKey(1234, "practice"))).toBeNull();
    });

    test("leaves a pointer that names a different round alone", () => {
        // Abandoning a `?seed=N` round must not evict the unseeded round the
        // player has in progress underneath it.
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { guesses: ["a"] });
        writeRound(storage, 42, { guesses: ["b"] });

        abandonPracticeRound(42, storage);

        expect(storage.getItem(gameStateKey(42, "practice"))).toBeNull();
        expect(storage.getItem(CURRENT_SEED_KEY)).toBe("1234");
        expect(storage.getItem(gameStateKey(1234, "practice"))).not.toBeNull();
    });
});

describe("clearCurrentPracticeRound", () => {
    test("clears the pointer only when it names the finished round", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");

        clearCurrentPracticeRound(42, storage);
        expect(storage.getItem(CURRENT_SEED_KEY)).toBe("1234");

        clearCurrentPracticeRound(1234, storage);
        expect(storage.getItem(CURRENT_SEED_KEY)).toBeNull();
    });

    test("keeps the finished round's entry on disk for the stats", () => {
        const storage = new MemoryStorage();
        storage.setItem(CURRENT_SEED_KEY, "1234");
        writeRound(storage, 1234, { targetId: "trex", guesses: ["trex"] });

        clearCurrentPracticeRound(1234, storage);

        expect(storage.getItem(gameStateKey(1234, "practice"))).not.toBeNull();
    });
});

describe("prunePracticeEntries", () => {
    const day = (n: number) =>
        new Date(Date.UTC(2026, 0, n, 12, 0, 0)).toISOString();

    test("removes the oldest entries down to the cap", () => {
        const storage = new MemoryStorage();
        for (let i = 1; i <= 5; i++) {
            writeRound(storage, i, { createdAt: day(i) });
        }

        const removed = prunePracticeEntries(storage, 3);

        expect(removed.sort()).toEqual(
            [gameStateKey(1, "practice"), gameStateKey(2, "practice")].sort()
        );
        expect(practiceKeys(storage)).toHaveLength(3);
        expect(storage.getItem(gameStateKey(5, "practice"))).not.toBeNull();
    });

    test("does nothing when the cap is not exceeded", () => {
        const storage = new MemoryStorage();
        for (let i = 1; i <= 3; i++) {
            writeRound(storage, i, { createdAt: day(i) });
        }

        expect(prunePracticeEntries(storage, 3)).toEqual([]);
        expect(practiceKeys(storage)).toHaveLength(3);
    });

    test("keeps the newest round, which is the one being played", () => {
        // There is no "protect the active round" parameter, because pruning
        // only ever runs as a new round is claimed and always takes the OLDEST
        // entries. This pins the property that makes the guard unnecessary.
        const storage = new MemoryStorage();
        for (let i = 1; i <= 5; i++) {
            writeRound(storage, i, { createdAt: day(i) });
        }

        const removed = prunePracticeEntries(storage, 1);

        expect(removed).not.toContain(gameStateKey(5, "practice"));
        expect(practiceKeys(storage)).toEqual([gameStateKey(5, "practice")]);
    });

    test("reaps an entry with a missing or unparseable createdAt first", () => {
        const storage = new MemoryStorage();
        writeRound(storage, 1, { createdAt: day(1) });
        writeRound(storage, 2, { createdAt: day(2) });
        storage.setItem(
            gameStateKey(3, "practice"),
            JSON.stringify({ targetId: "t", guesses: [] }) // no createdAt
        );
        storage.setItem(gameStateKey(4, "practice"), "{corrupt");

        const removed = prunePracticeEntries(storage, 2);

        expect(removed.sort()).toEqual(
            [gameStateKey(3, "practice"), gameStateKey(4, "practice")].sort()
        );
    });

    test("ignores daily rounds and unrelated keys", () => {
        const storage = new MemoryStorage();
        storage.setItem(
            gameStateKey(7, "daily"),
            JSON.stringify({ targetId: "t", guesses: [], createdAt: day(1) })
        );
        storage.setItem("some-other-app-key", "value");
        for (let i = 1; i <= 4; i++) {
            writeRound(storage, i, { createdAt: day(i) });
        }

        prunePracticeEntries(storage, 2);

        expect(storage.getItem(gameStateKey(7, "daily"))).not.toBeNull();
        expect(storage.getItem("some-other-app-key")).toBe("value");
        expect(practiceKeys(storage)).toHaveLength(2);
    });

    test("a long run of rounds stays bounded at MAX_PRACTICE_ENTRIES", () => {
        // The end-to-end property the DoD asks for: play many rounds back to
        // back and localStorage does not grow without bound.
        const storage = new MemoryStorage();
        let draw = 0;
        const rng = () => {
            draw++;
            return (draw % PUZZLE_ID_MODULUS) / PUZZLE_ID_MODULUS;
        };

        for (let round = 0; round < MAX_PRACTICE_ENTRIES * 3; round++) {
            const seed = startNewPracticeRound(storage, rng);
            // Simulate the round being played and finished, which is what puts
            // an entry on disk in the first place.
            writeRound(storage, seed, {
                targetId: "trex",
                guesses: ["trex"],
                createdAt: new Date(
                    Date.UTC(2026, 0, 1, 0, round)
                ).toISOString(),
            });
        }

        expect(practiceKeys(storage).length).toBeLessThanOrEqual(
            MAX_PRACTICE_ENTRIES
        );
    });
});
