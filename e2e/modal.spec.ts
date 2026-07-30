import { test, expect } from "@playwright/test";
import {
    loadContent,
    seedFinishedDailyGame,
    expectActionsOnOneRow,
} from "./helpers";

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

// The desktop side of the phone-overflow fix (tasks/20260729-141428). Making
// `.modal-actions` wrap is what guarantees the row can never hang off a narrow
// screen again - but the three buttons at their old 40px padding needed 421.6px
// against the modal's 420px content box, so they had been overflowing it by
// 1.6px on the DESKTOP too, invisibly absorbed by the padding. With `wrap` that
// hairline became a wrapped second row at 1280px. The padding was cut to 32px to
// give the row honest room, and this pins the outcome: on a desktop viewport the
// actions are one row, with the margin stated rather than assumed.
test.describe("end-of-game modal on desktop", () => {
    test("the actions sit on a single row", async ({ page }) => {
        await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
        await page.goto("/");
        const { speciesIds } = await loadContent(page);
        const target = speciesIds[0];
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: [target],
            lastGuessId: target,
        });
        await page.reload();

        await expectActionsOnOneRow(page);
    });
});
