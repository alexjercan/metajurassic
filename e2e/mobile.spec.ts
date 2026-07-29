import { test, expect } from "@playwright/test";

// Mobile viewport coverage (runs on the Pixel 5 project). The player must be
// able to see the primary game surface AND reach the guess input, without the
// info panel covering the control path.
test.describe("mobile game layout", () => {
    test("primary surface and guess input are both usable", async ({
        page,
    }) => {
        await page.goto("/");

        // The arena (tree) is the primary surface and must have real size.
        const arena = page.locator("#arena");
        await expect(arena).toBeVisible();
        const arenaBox = await arena.boundingBox();
        expect(arenaBox?.width ?? 0).toBeGreaterThan(0);
        expect(arenaBox?.height ?? 0).toBeGreaterThan(0);

        // The input must be visible, inside the viewport, and actually
        // clickable (not covered by the auto-opened panel). A trial click
        // fails if another element intercepts the pointer.
        const input = page.locator("#player-input");
        await expect(input).toBeVisible();
        const inputBox = await input.boundingBox();
        const viewport = page.viewportSize();
        expect(inputBox).not.toBeNull();
        if (inputBox && viewport) {
            expect(inputBox.y).toBeGreaterThanOrEqual(0);
            expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(
                viewport.height + 1
            );
        }
        await input.click({ trial: true });
    });

    // Was a test.fixme left by 20260729-092258 and owned by this task: on first
    // load the info panel auto-opened and, on a phone viewport, overlayed the
    // arena exactly (panel and #arena share the same box), so the tree - the
    // primary game surface - was hidden behind the hint card. 20260729-092315
    // stopped the first-load auto-open, so this is now a live regression pin on
    // the "player can see the primary surface" invariant.
    test("primary surface is not occluded by the info panel on first load", async ({
        page,
    }) => {
        await page.goto("/");
        const occluded = await page.evaluate(() => {
            const arena = document.getElementById("arena");
            const panel = document.getElementById("info-panel");
            if (!arena || !panel) return true;
            const r = arena.getBoundingClientRect();
            const top = document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2
            );
            return !!top && panel.contains(top);
        });
        expect(occluded).toBe(false);
    });

    // The 390x844-class first screen from the task's Definition of Done: the
    // panel is closed, and the tree plus the guess input are what the player
    // sees. Guards against a regression that re-opens the panel on load.
    test("first load shows the game, not the info panel", async ({ page }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);

        // The tree is populated and the input is reachable behind no overlay.
        const tree = page.locator("#tree-container");
        await expect(tree).toBeVisible();
        await expect
            .poll(async () => (await tree.innerHTML()).trim().length)
            .toBeGreaterThan(0);
        await page.locator("#player-input").click({ trial: true });

        // The panel must not be covering the viewport: with the panel closed it
        // is translated off-screen, so its box starts at or past the right edge.
        const viewport = page.viewportSize();
        const panelBox = await panel.boundingBox();
        expect(panelBox).not.toBeNull();
        if (panelBox && viewport) {
            expect(panelBox.x).toBeGreaterThanOrEqual(viewport.width - 1);
        }

        // The hint is still one tap away via the always-present pull tab.
        const toggle = page.locator("#open-panel");
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
    });
});
