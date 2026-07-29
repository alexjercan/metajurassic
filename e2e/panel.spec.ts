import { test, expect } from "@playwright/test";

// The info panel can be opened and closed, shows clade/species card content,
// and closing it leaves the control path (the guess input) usable.
test.describe("info panel", () => {
    test("opens and closes and shows card content without trapping the input", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const card = page.locator("#panel-card-container");
        const toggle = page.locator("#open-panel");
        const input = page.locator("#player-input");

        // On first load the panel auto-opens showing the best-hint clade card.
        await expect(panel).toHaveClass(/active/);
        await expect(card).not.toBeEmpty();
        await expect(card.locator(".card-title")).toBeVisible();

        // Toggle closed: panel is dismissed and the input remains usable.
        await toggle.click();
        await expect(panel).not.toHaveClass(/active/);
        await expect(input).toBeVisible();
        await expect(input).toBeEditable();

        // Toggle open again: card content is shown once more.
        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await expect(card.locator(".card-title")).toBeVisible();
    });
});
