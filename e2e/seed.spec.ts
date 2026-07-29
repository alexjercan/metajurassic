import { test, expect } from "@playwright/test";

// Runnable example: "play a fixed round". Loading the practice page with
// `?seed=42` produces a known, reproducible target, which is the primitive E2E
// fixtures and manual playtests build on. This spec drives the real screen the
// way a fixture would - it is the executable walkthrough referenced by
// tasks/20260729-101819.

const SEED = 42;
// Practice rounds are keyed `gameState-practice-dinosaur-#<seed+1, padded>`;
// for seed 42 that is #00043. Distinct from the daily key by the `practice-`
// prefix, which is what isolates seeded rounds from the real daily state.
const PRACTICE_KEY = "gameState-practice-dinosaur-#00043";

// Force a save so the chosen target lands in localStorage where the walkthrough
// can read it. The app persists on the first guess; "saurus" is a substring of
// many species names, so the suggestion list is non-empty for any target.
async function playOneGuess(page: import("@playwright/test").Page) {
    const input = page.locator("#player-input");
    await input.click();
    await input.fill("saurus");
    await expect(
        page.locator("#autocomplete-box .autocomplete-item").first()
    ).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(page.locator("#stat-box")).toContainText("Guesses Left: 24");
}

async function readTarget(
    page: import("@playwright/test").Page
): Promise<string> {
    return page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as { targetId: string }).targetId : "";
    }, PRACTICE_KEY);
}

test.describe("seeded practice round", () => {
    test("the same seed yields the same target across independent loads", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${SEED}`);
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );
        await playOneGuess(page);
        const first = await readTarget(page);
        expect(first).not.toBe("");

        // A fresh load of the same seed reconstructs the same target from the
        // seed alone (practice never restores saved state), proving repro.
        await page.goto(`/practice/?seed=${SEED}`);
        await playOneGuess(page);
        const second = await readTarget(page);

        expect(second).toBe(first);
    });

    test("a seeded round leaves the daily state untouched", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${SEED}`);
        await playOneGuess(page);

        const keys = await page.evaluate(() => Object.keys(localStorage));
        // The only game-state key written is the practice-prefixed one; no
        // daily `gameState-dinosaur-#...` key was created (other app keys such
        // as preferences are irrelevant to daily isolation).
        const gameStateKeys = keys.filter((k) => k.startsWith("gameState-"));
        expect(gameStateKeys).toEqual([PRACTICE_KEY]);
    });
});
