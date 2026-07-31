import { isRoundOver, SavedGameState } from "./gameState";
import {
    gameStateKey,
    parseGameStateKey,
    parseSeedParam,
    PUZZLE_ID_MODULUS,
} from "./puzzleKey";
import { StorageProvider, defaultStorage } from "./storage";

// The practice-round lifecycle: which round the practice page is playing, when
// a new one starts, and what happens to the old ones.
//
// Storage-only on purpose - no DOM, no GameData - so the whole lifecycle is
// unit-testable with a fake StorageProvider and a fake rng. `src/practice.ts`
// is the page wiring over this.
//
// The lifecycle rules below - pointer semantics, retention on abandon, the
// entry cap, the seed range - are fixed by
// tasks/20260729-101754/DECISION.md; changing one changes that decision.

// Points at the seed of the round currently being played. Its presence is what
// makes a reload resume instead of re-roll; clearing it is what makes the next
// load start something new.
export const CURRENT_SEED_KEY = "practice-current";

// How many `gameState-practice-*` entries survive pruning. Finished rounds are
// the practice stats the profile page reads, so they are kept but not forever
// (tasks/20260729-101754/DECISION.md section 3).
export const MAX_PRACTICE_ENTRIES = 50;

// Bounded re-draws when a random seed lands on a key that is already taken.
// With a 50-entry cap against PUZZLE_ID_MODULUS (100000) possible keys, the
// chance of even one collision is under 0.1%, so this is a guard, not a loop
// the common path ever takes.
const MAX_SEED_DRAWS = 20;

// Same contract as Math.random: a float in [0, 1). Injectable so the collision
// and pruning paths can be driven deterministically from a test.
export type Rng = () => number;

// Seeds are drawn from [0, PUZZLE_ID_MODULUS) so that seed <-> storage key is a
// bijection; a wider range folds distinct seeds onto one key
// (tasks/20260729-101754/DECISION.md section 4).
function drawSeed(rng: Rng): number {
    // The fold also guards a misbehaving rng returning exactly 1, which would
    // otherwise land one past the end of the range.
    return normalizePracticeSeed(Math.floor(rng() * PUZZLE_ID_MODULUS));
}

interface StoredRound {
    key: string;
    seed: number;
    // Milliseconds since epoch. A missing or unparseable `createdAt` sorts as
    // the OLDEST possible round, so a corrupt entry is reaped first rather than
    // pinned at the front of the queue forever.
    createdAt: number;
}

function parseSaved(raw: string | null): SavedGameState | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SavedGameState;
    } catch {
        return null;
    }
}

// Every practice round on disk, newest first. Keys are collected in one pass
// before anything is removed - `storage.key(i)` is index-based, and deleting
// while iterating would skip entries.
function practiceRounds(storage: StorageProvider): StoredRound[] {
    const rounds: StoredRound[] = [];

    const length = storage.length();
    for (let i = 0; i < length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        const parsed = parseGameStateKey(key);
        if (!parsed || parsed.gameMode !== "practice") continue;

        const saved = parseSaved(storage.getItem(key));
        const timestamp = saved?.createdAt
            ? new Date(saved.createdAt).getTime()
            : NaN;

        rounds.push({
            key,
            seed: parsed.seed,
            createdAt: Number.isNaN(timestamp)
                ? Number.NEGATIVE_INFINITY
                : timestamp,
        });
    }

    rounds.sort((a, b) => b.createdAt - a.createdAt);

    return rounds;
}

// Keep at most `keep` practice entries, dropping the oldest first. Returns the
// keys actually removed, so a caller (or a test) can see what was reaped.
//
// There is deliberately no "protect the active round" parameter: pruning runs
// only from `startNewPracticeRound` and always takes the OLDEST entries, so the
// round just played cannot be a victim
// (tasks/20260729-101754/DECISION.md section 3).
export function prunePracticeEntries(
    storage: StorageProvider = defaultStorage(),
    keep: number = MAX_PRACTICE_ENTRIES
): string[] {
    const rounds = practiceRounds(storage);
    const excess = rounds.length - Math.max(0, keep);
    if (excess <= 0) return [];

    // `practiceRounds` is newest-first, so the tail is the oldest; take as many
    // as the overflow demands.
    const victims = rounds.slice(-excess);

    for (const victim of victims) {
        storage.removeItem(victim.key);
    }

    return victims.map((victim) => victim.key);
}

// Begin a fresh round: prune, claim an unused seed, and point `practice-current`
// at it. The round itself is not written here - `saveGameState` does that on the
// first guess - which is why `resolvePracticeSeed` treats a pointer with no
// entry behind it as a live, not-yet-played round rather than a dead one.
export function startNewPracticeRound(
    storage: StorageProvider = defaultStorage(),
    rng: Rng = Math.random
): number {
    // One below the cap, so that once this round is saved the total is at most
    // MAX_PRACTICE_ENTRIES rather than one over it.
    prunePracticeEntries(storage, MAX_PRACTICE_ENTRIES - 1);

    let seed = drawSeed(rng);
    for (
        let draw = 1;
        draw < MAX_SEED_DRAWS &&
        storage.getItem(gameStateKey(seed, "practice")) !== null;
        draw++
    ) {
        seed = drawSeed(rng);
    }

    // Either the key was free (a no-op) or every draw collided; removing it
    // unconditionally is what stops a new round from silently inheriting an
    // unrelated round's guesses (tasks/20260729-101754/DECISION.md section 4).
    storage.removeItem(gameStateKey(seed, "practice"));
    storage.setItem(CURRENT_SEED_KEY, String(seed));

    return seed;
}

// Only clears the pointer when it actually names `seed`. A `?seed=N` round
// never owns the pointer, so finishing one must not evict the unseeded round in
// progress underneath it (tasks/20260729-101754/DECISION.md section 4).
export function clearCurrentPracticeRound(
    seed: number,
    storage: StorageProvider = defaultStorage()
): void {
    if (storage.getItem(CURRENT_SEED_KEY) === String(seed)) {
        storage.removeItem(CURRENT_SEED_KEY);
    }
}

// Stop playing a round on purpose, and stop resuming it.
//
// An UNFINISHED round is DELETED; a FINISHED round is KEPT and only the pointer
// is dropped, because finished rounds ARE the practice stats the profile page
// reads and "I won -> New game" is the normal end of every round. Both halves
// are load-bearing: tasks/20260729-101754/DECISION.md section 2.
export function abandonPracticeRound(
    seed: number,
    storage: StorageProvider = defaultStorage()
): void {
    const key = gameStateKey(seed, "practice");
    const saved = parseSaved(storage.getItem(key));

    // An unparseable or absent entry is not a stat worth keeping, so it goes.
    const keepForStats =
        saved !== null &&
        typeof saved.targetId === "string" &&
        Array.isArray(saved.guesses) &&
        isRoundOver(
            saved.targetId,
            saved.guesses,
            (saved.hintClades ?? []).length
        );

    if (!keepForStats) {
        storage.removeItem(key);
    }

    clearCurrentPracticeRound(seed, storage);
}

// Fold a requested seed into the residue its storage key already represents.
//
// `gameStateKey` folds a seed through `seed mod PUZZLE_ID_MODULUS` but the
// TARGET is `seed mod species.length` - two moduli, so `?seed=42` and
// `?seed=100042` share one storage key while naming DIFFERENT dinosaurs.
// Folding at the boundary makes seed, key and target agree, and it is the
// IDENTITY on [0, PUZZLE_ID_MODULUS), so every seed in the docs, the E2E
// fixtures and the playtests is unaffected
// (tasks/20260729-101754/DECISION.md section 4).
export function normalizePracticeSeed(seed: number): number {
    return ((seed % PUZZLE_ID_MODULUS) + PUZZLE_ID_MODULUS) % PUZZLE_ID_MODULUS;
}

// Whether a saved entry describes a round worth resuming. The shape check is
// not paranoia: an entry with no `targetId` makes `isRoundOver` return false
// forever, so without this the page would resume a broken board on every load
// with no way out but the New game button.
function isResumable(saved: SavedGameState): boolean {
    if (typeof saved.targetId !== "string" || !saved.targetId) return false;
    if (!Array.isArray(saved.guesses)) return false;

    return !isRoundOver(
        saved.targetId,
        saved.guesses,
        (saved.hintClades ?? []).length
    );
}

function parseStoredSeed(raw: string | null): number | null {
    if (raw === null) return null;

    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;

    const seed = Number(trimmed);
    return Number.isSafeInteger(seed) ? seed : null;
}

// Which round the practice page should play on this load.
//
//   1. `?seed=N`, folded through `normalizePracticeSeed`, and never persisted.
//   2. Otherwise the round `practice-current` names, unless it has already
//      finished. A pointer with NO saved entry behind it IS resumed: that is a
//      round started but not yet guessed in, and re-rolling it would make a
//      reload-before-the-first-guess lose the round all over again.
//   3. Otherwise start a new one.
//
// Rule 1 is tasks/20260729-101754/DECISION.md section 4.
export function resolvePracticeSeed(
    search: string,
    storage: StorageProvider = defaultStorage(),
    rng: Rng = Math.random
): number {
    const seedParam = parseSeedParam(search);
    if (seedParam !== null) return normalizePracticeSeed(seedParam);

    const seed = parseStoredSeed(storage.getItem(CURRENT_SEED_KEY));
    if (seed !== null) {
        const raw = storage.getItem(gameStateKey(seed, "practice"));
        if (raw === null) return seed;

        const saved = parseSaved(raw);
        if (saved && isResumable(saved)) return seed;
    }

    return startNewPracticeRound(storage, rng);
}
