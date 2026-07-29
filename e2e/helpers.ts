import { expect, Page } from "@playwright/test";

// Shared fixtures for the browser E2E suite. See tasks/20260729-092258/DECISION.md
// for why modal state is injected via localStorage keyed off a frozen clock
// rather than the (not-yet-built) seed mode.

// Read the guesses-left counter the game renders, as a number.
async function guessesLeft(page: Page): Promise<number> {
    const text = (await page.locator("#stat-box").textContent()) ?? "";
    const match = text.match(/Guesses Left:\s*(\d+)/);
    return match ? Number(match[1]) : NaN;
}

// Type a query and submit the first suggestion, the way a player guesses.
//
// Two hazards shape this, both from `setupAutocomplete`'s blur handler, which
// hides the suggestion box on a 100ms `setTimeout` whose handle is never
// cleared (a real app defect, filed as task 20260729-130138). Clicking another
// control (the panel toggle, the hint box) and typing again inside that window
// lets the stale timer hide a list that is currently in use, and then:
//
//  - the keydown handler computes `isOpen === false` and ignores ArrowDown and
//    Enter, so keyboard selection silently does nothing; and
//  - that Enter does NOT stop there - it bubbles to the input's own keydown
//    handler (`src/game.ts`), which submits the RAW typed text. `saurus` is not
//    an exact species name, so `makeGuess` throws, an alert is raised (and auto
//    dismissed by Playwright), and `updateUI` clears the input anyway.
//
// So "the input went empty" is NOT evidence a guess landed. Two consequences:
// select by CLICKING the suggestion (its `mousedown` handler calls
// `selectAndSubmit` directly, bypassing the `isOpen` gate entirely, and never
// touches the raw-text path), and make the exit condition the counter actually
// going down. Remove all of this once 20260729-130138 is fixed.
export async function guessFirstSuggestion(
    page: Page,
    query: string
): Promise<void> {
    const input = page.locator("#player-input");
    const box = page.locator("#autocomplete-box");
    const before = await guessesLeft(page);

    await expect(async () => {
        await input.click();
        await input.fill("");
        await input.fill(query);
        // If the stale timer hid the box, this click waits for actionability,
        // times out, and the whole block is retried with a fresh render.
        await box
            .locator(".autocomplete-item")
            .first()
            .click({ timeout: 1000 });
        // Exactly one, not merely fewer: a guess always costs one, so this
        // catches a double-submit here rather than leaving it to whichever
        // caller happens to assert an exact count. Submission is synchronous
        // inside that click handler; the poll only covers the render, and its
        // own timeout keeps a genuinely lost guess from being retried (and thus
        // double-submitted) on a mere slow frame.
        await expect
            .poll(() => guessesLeft(page), { timeout: 1000 })
            .toBe(before - 1);
    }).toPass({ timeout: 10_000 });
}

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
        // Mirror formatPuzzleId's modulus wrap so this stays an exact copy of
        // the app's key even at the residue-99999 edge (unreachable for daily
        // seeds, but the mirror must not silently diverge from source).
        const index = seed % Math.pow(10, 5);
        const display = (index + 1) % Math.pow(10, 5);
        return `gameState-dinosaur-#${display.toString().padStart(5, "0")}`;
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
