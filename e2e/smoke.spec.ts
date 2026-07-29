import { test, expect } from "@playwright/test";

// First-load smoke test for the daily game on a desktop viewport: every primary
// control is present and the main surface is not blank.
test.describe("daily game first screen", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("shows the header title", async ({ page }) => {
        await expect(page.locator("header .game-title")).toHaveText(
            "Metajurassic"
        );
    });

    test("shows the guesses-left control", async ({ page }) => {
        const statBox = page.locator("#stat-box");
        await expect(statBox).toBeVisible();
        await expect(statBox).toContainText("Guesses Left");
    });

    test("shows the hint control", async ({ page }) => {
        await expect(page.locator("#hint-box")).toBeVisible();
    });

    test("renders a non-empty tree area (no blank primary surface)", async ({
        page,
    }) => {
        const tree = page.locator("#tree-container");
        await expect(tree).toBeVisible();
        // The tree is populated on load even before the first guess.
        await expect
            .poll(async () => (await tree.innerHTML()).trim().length)
            .toBeGreaterThan(0);
        const box = await page.locator("#arena").boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(0);
        expect(box?.height ?? 0).toBeGreaterThan(0);
    });

    test("shows the guess input", async ({ page }) => {
        const input = page.locator("#player-input");
        await expect(input).toBeVisible();
        await expect(input).toBeEditable();
    });

    test("shows footer links (GitHub, FAQ)", async ({ page }) => {
        await expect(
            page.locator("footer a", { hasText: "GitHub" })
        ).toBeVisible();
        await expect(
            page.locator("footer a", { hasText: "FAQ" })
        ).toBeVisible();
    });
});
