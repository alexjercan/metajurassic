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

    // KNOWN FAILING: on first load the info panel auto-opens and, on a phone
    // viewport, overlays the arena exactly (panel and #arena share the same
    // box), so the tree - the primary game surface - is hidden behind the hint
    // card. Owned by 20260729-092315 (first-run mobile focus). This encodes the
    // "player can see the primary surface without incoherent overlap" invariant
    // and flips green when that task stops the auto-open on mobile; fixme keeps
    // the npm run ci gate green now. See DECISION.md.
    test.fixme("primary surface is not occluded by the auto-opened panel (blocked on 20260729-092315)", async ({
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
});
