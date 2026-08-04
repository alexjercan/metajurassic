import { test, expect } from "@playwright/test";
import { pinDailyClock } from "./helpers/clock";

// `#stat-box` ships EMPTY and is filled by `updateUI()`, so between first paint
// and hydration the chip holds no text. `.stat-box` sets no width of its own,
// so without the `min-width` floor in `src/partials/game-shell.css` the chip
// paints collapsed and jumps to full width on hydration - and `.top-bar` is
// `justify-content: space-around`, so the hint chip shifts with it. Measured
// with the floor removed: 196px -> 42px at 1280 and 141px -> 26px at 393.
//
// A guard, not the measurement (LESSONS.md:
// a-guard-no-test-can-fail-is-a-comment). The CSS carries a number, and nothing
// else notices if a later change drops it or if the label grows past what it
// reserves. `.hint-box`'s `min-height` is the same guard for the same reason,
// one element over.
//
// Emptying the hydrated chip rather than racing first paint: the property is
// "the chip's box does not depend on its text", and that is exactly what a
// with-text/without-text comparison asserts. Under the dev server CSS arrives
// via style-loader, so a `javaScriptEnabled: false` frame has no styles at all
// and cannot answer the question.
test.describe("the emptied top bar chip", () => {
    for (const width of [1280, 393, 320]) {
        test(`reserves its filled width at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 });
            await pinDailyClock(page);
            await page.goto("/");

            const box = page.locator("#stat-box");
            await expect(box).toContainText(/Guesses Left: \d+/);

            const filled = await box.evaluate(
                (el) => (el as HTMLElement).offsetWidth
            );
            const emptied = await box.evaluate((el) => {
                el.textContent = "";
                return (el as HTMLElement).offsetWidth;
            });

            expect(emptied).toBe(filled);
        });
    }
});
