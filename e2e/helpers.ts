import { Page } from "@playwright/test";

// Shared fixtures for the browser E2E suite. See tasks/20260729-092258/DECISION.md
// for why modal state is injected via localStorage keyed off a frozen clock
// rather than the (not-yet-built) seed mode.

// Recompute the daily storage key the app uses, inside the browser, so it is
// derived from the SAME frozen `new Date()` the app sees. Mirrors
// getTodaySeed()/gameStateKey() in src/gameState.ts and dateToSeed() in
// src/gameData.ts. Must be called after page.clock has fixed the time.
export function computeDailyKey(page: Page): Promise<string> {
    return page.evaluate(() => {
        const FIRST_DAY = new Date(2026, 0, 1);
        const msPerDay = 1000 * 60 * 60 * 24;
        const seed =
            Math.floor(
                (new Date().getTime() - FIRST_DAY.getTime()) / msPerDay
            ) + 1;
        const index = seed % Math.pow(10, 5);
        return `gameState-dinosaur-#${(index + 1).toString().padStart(5, "0")}`;
    });
}

// Read the real served content graph from the browser. Uses the actual payload
// (src/jurassic/index.json copied to /jurassic/index.json) rather than a mock,
// per the repo lesson mock-fixtures-hide-real-data-defects.
export function loadContent(
    page: Page
): Promise<{ speciesIds: string[]; speciesNames: string[] }> {
    return page.evaluate(async () => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        const speciesIds = Object.keys(raw.species);
        const speciesNames = speciesIds.map((id) => raw.species[id].species);
        return { speciesIds, speciesNames };
    });
}

type FinishedGame = {
    targetId: string;
    guesses: string[];
    lastGuessId?: string;
    hintClades?: string[];
};

// Write a finished daily game into localStorage so the next load renders the
// end-of-game modal deterministically. loadGameState() reads targetId straight
// from storage, so the chosen target does not have to match the real daily pick.
export async function seedFinishedDailyGame(
    page: Page,
    game: FinishedGame
): Promise<void> {
    const key = await computeDailyKey(page);
    await page.evaluate(
        ([storageKey, payload]) => {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    targetId: payload.targetId,
                    guesses: payload.guesses,
                    lastGuessId: payload.lastGuessId,
                    hintClades: payload.hintClades ?? [],
                    createdAt: new Date().toISOString(),
                })
            );
        },
        [key, game] as const
    );
}

// A URL src is "structurally valid" if it is a non-empty http(s) URL. The known
// species-icon bug stores a stringified Python list ("['https://...svg']"),
// which fails this check without needing the external CDN. See DECISION.md
// choice 4 and task 20260729-092352.
export function isStructurallyValidImageSrc(src: string | null): boolean {
    if (!src) return false;
    if (src.trim().startsWith("[")) return false;
    return (
        /^https?:\/\/.+/.test(src) ||
        src.startsWith("/") ||
        src.startsWith("data:")
    );
}
