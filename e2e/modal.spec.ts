import { test, expect } from "@playwright/test";
import { loadContent, seedFinishedDailyGame } from "./helpers";

// End-of-game modal smoke coverage. The finished game state is injected into
// localStorage keyed off a frozen clock (see helpers.ts and DECISION.md), so
// the modal renders deterministically without a real playthrough.
test.describe("end-of-game modal", () => {
    test.beforeEach(async ({ page }) => {
        // Freeze time so the daily storage key is stable across the reload.
        await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
        await page.goto("/");
    });

    test("win modal shows on a solved daily game", async ({ page }) => {
        const { speciesIds } = await loadContent(page);
        const target = speciesIds[0];
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: [target],
            lastGuessId: target,
        });
        await page.reload();

        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
        await expect(page.locator("#modal-title")).toHaveText("You found it!");
        await expect(page.locator("#modal-title")).toHaveClass(
            /modal-title-win/
        );
    });

    test("loss modal shows when all guesses are spent", async ({ page }) => {
        const { speciesIds } = await loadContent(page);
        // 25 wrong guesses (none is the target) exhausts MAX_GUESSES.
        const target = speciesIds[0];
        const wrong = speciesIds.slice(1, 26);
        expect(wrong).toHaveLength(25);
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: wrong,
            lastGuessId: wrong[wrong.length - 1],
        });
        await page.reload();

        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
        await expect(page.locator("#modal-title")).toHaveText("Game Over");
        await expect(page.locator("#modal-title")).toHaveClass(
            /modal-title-loss/
        );
    });
});
