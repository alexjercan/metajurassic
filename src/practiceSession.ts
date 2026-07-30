import {
    gameStateKey,
    isRoundOver,
    parseGameStateKey,
    parseSeedParam,
    PUZZLE_ID_MODULUS,
    SavedGameState,
} from "./gameState";
import { StorageProvider, defaultStorage } from "./storage";

// The practice-round lifecycle: which round the practice page is playing, when
// a new one starts, and what happens to the old ones.
//
// It is storage-only on purpose - no DOM, no GameData - so the whole lifecycle
// is unit-testable with a fake StorageProvider and a fake rng, the same way
// gameState.ts takes its storage as a parameter. `src/practice.ts` is left as
// thin page wiring over this.
//
// Decisions recorded in tasks/20260729-101754/DECISION.md.

// Points at the seed of the round currently being played. Its presence is what
// makes a reload resume instead of re-roll; clearing it is what makes the next
// load start something new.
export const CURRENT_SEED_KEY = "practice-current";

// How many `gameState-practice-*` entries are kept. Finished rounds are the
// practice stats the profile page reads, so they are kept - but not forever.
export const MAX_PRACTICE_ENTRIES = 50;

// Bounded re-draws when a random seed lands on a key that is already taken.
// With a 50-entry cap against PUZZLE_ID_MODULUS (100000) possible keys, the
// chance of even one collision is under 0.1%, so this is a guard, not a loop
// the common path ever takes.
const MAX_SEED_DRAWS = 20;

// Same contract as Math.random: a float in [0, 1). Injectable so the collision
// and pruning paths can be driven deterministically from a test.
export type Rng = () => number;

// A practice seed is drawn from [0, PUZZLE_ID_MODULUS) rather than the old
// [0, 1_000_000). `gameStateKey` folds a seed through `seed mod 10^5`, so the
// wider range was a 10:1 fold in which ten distinct seeds shared one storage
// key - the "seeds collide modulo the key format" defect. Drawing from the
// modulus makes seed <-> key a bijection, so the fold disappears entirely.
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
// There is deliberately no "protect the active round" parameter. Pruning runs
// at exactly one moment - `startNewPracticeRound`, as the round being replaced
// is handed over - and it always takes the OLDEST entries, so the round that
// was just being played is the newest and cannot be a victim. A guard for a
// case no caller can reach would be a comment pretending to be code
// (LESSONS.md `a-guard-no-test-can-fail-is-a-comment`).
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

    // Either the key was free (a no-op) or every draw collided and this one is
    // being claimed deliberately. Removing it unconditionally is what stops a
    // new round from silently inheriting an unrelated round's guesses.
    storage.removeItem(gameStateKey(seed, "practice"));
    storage.setItem(CURRENT_SEED_KEY, String(seed));

    return seed;
}

// Only clears the pointer when it actually names `seed`. A round played from
// `?seed=N` never owns the pointer, so finishing one must not evict the
// unseeded round the player has in progress underneath it.
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
// An UNFINISHED round is deleted: `loadAllGames` already skips games where
// `!isGameOver()`, so it contributes nothing to the stats either way, and
// deleting it bounds storage at the source instead of leaning on the cap.
//
// A FINISHED round is KEPT, and only the pointer is dropped. Finished rounds
// ARE the practice stats the profile page reads (games played, wins, average,
// distribution, discovered dinosaurs), and "I won -> New game" is the normal
// end of every round - deleting there would quietly erase the player's record
// as they played it. Both halves are DECISION.md fork 2; the delete-everything
// version of this function got that fork exactly backwards.
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
// `gameStateKey` folds a seed through `seed mod PUZZLE_ID_MODULUS`, but the
// TARGET is `seed mod species.length` - two different moduli. So `?seed=42` and
// `?seed=100042` share one storage key (`dinosaur-#00043`) while naming
// DIFFERENT dinosaurs: the two rounds fight over one entry, and a load of
// either resumes whichever wrote last. That is finding 3 of the task, on the
// seed-param side.
//
// Folding at the boundary makes `?seed=100042` mean `?seed=42` outright: one
// seed, one key, one target, and the puzzle id in the share text finally names
// the round actually being played. In-range seeds - every seed in the docs,
// the E2E fixtures and the playtests - are unaffected, because the fold is the
// identity on [0, PUZZLE_ID_MODULUS).
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
//   1. `?seed=N` always wins, and is NOT persisted - the URL already carries
//      the round, and storing it would make a one-off repro sticky after the
//      param is dropped. It IS folded into the puzzle-id residue first: see
//      `normalizePracticeSeed`.
//   2. Otherwise resume the round `practice-current` names, unless it has
//      already finished. A pointer with no saved entry behind it IS resumed:
//      that is a round started but not yet guessed in, and re-rolling it would
//      make a reload-before-the-first-guess lose the round all over again.
//   3. Otherwise start a new one.
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
