import { test, expect } from "@playwright/test";
import { loadContent } from "./helpers";

// The guess flow from typing through rendered feedback: type a partial name,
// navigate the suggestion list with the keyboard, submit, and confirm the
// guesses-left control and the tree feedback both update. This is the coverage
// the seam-level Jest tests cannot give (they call state helpers directly).
test.describe("autocomplete guess flow", () => {
    test("typing, navigating and submitting a guess updates guesses left and the tree", async ({
        page,
    }) => {
        await page.goto("/");

        const statBox = page.locator("#stat-box");
        await expect(statBox).toContainText("Guesses Left: 25");

        const treeBefore = await page.locator("#tree-container").innerHTML();

        // "saurus" is a substring of many species names, so the suggestion list
        // is guaranteed non-empty regardless of the daily target.
        const { speciesNames } = await loadContent(page);
        expect(
            speciesNames.some((n) => n.toLowerCase().includes("saurus"))
        ).toBe(true);

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("saurus");

        const box = page.locator("#autocomplete-box");
        const items = box.locator(".autocomplete-item");
        await expect(items.first()).toBeVisible();
        const itemCount = await items.count();
        expect(itemCount).toBeGreaterThan(0);

        // Navigate down one and submit the highlighted suggestion.
        await input.press("ArrowDown");
        await expect(box.locator(".autocomplete-active")).toHaveCount(1);
        await input.press("Enter");

        // Guesses left decremented by exactly one, input cleared, tree changed.
        await expect(statBox).toContainText("Guesses Left: 24");
        await expect(input).toHaveValue("");
        await expect
            .poll(async () => page.locator("#tree-container").innerHTML())
            .not.toBe(treeBefore);
    });
});
