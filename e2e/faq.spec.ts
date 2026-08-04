import { test, expect } from "@playwright/test";
import { pinDailyClock } from "./helpers/clock";

// The board and the FAQ must state the SAME guess budget.
//
// Neither number is written here: the board's is parsed out of `#stat-box` on
// first render and the FAQ's is asserted to contain it. So this spec fails when
// the two surfaces disagree, and stays green through a reprice - which is the
// property, since the defect it guards is a hand-copied literal going stale.
test.describe("guess budget across surfaces", () => {
    test("the FAQ states the budget the board enforces", async ({ page }) => {
        await pinDailyClock(page);

        await page.goto("/");
        const statBox = page.locator("#stat-box");
        await expect(statBox).toContainText(/Guesses Left: \d+/);
        const boardText = (await statBox.textContent()) ?? "";
        const budget = /Guesses Left: (\d+)/.exec(boardText)?.[1] ?? "";
        expect(budget).not.toBe("");

        await page.goto("/faq/");
        // Whole-shape, NOT `toContainText(budget)`: a substring match survives
        // the exact defect this spec exists to kill, because budgets collide as
        // substrings of each other. Reprice to 5 and a re-hardcoded "You have
        // 25 attempts" still contains "5", so the two surfaces disagree while
        // the assertion passes. Same trap as `test/lintGate.test.ts`'s
        // "npm run lint" inside "npm run lint:fix".
        await expect(page.locator("#faq-guess-budget")).toContainText(
            new RegExp(`You have ${budget} attempts`)
        );
    });

    test("the FAQ states the hint price the board charges", async ({
        page,
    }) => {
        await pinDailyClock(page);

        await page.goto("/");
        // The board's price lives in the hint chip, written by
        // `hintChipCopy()` through `updateHintButton()`.
        const hintText = page.locator("#hint-text");
        await expect(hintText).toContainText(/Spend \d+ guesses/);
        const chipText = (await hintText.textContent()) ?? "";
        const price = /Spend (\d+) guesses/.exec(chipText)?.[1] ?? "";
        expect(price).not.toBe("");

        await page.goto("/faq/");
        // Whole-shape for the same reason the budget assertion is: prices
        // collide as substrings, so a bare `toContainText(price)` would pass
        // against a re-hardcoded stale number.
        await expect(page.locator("#faq-hint-cost")).toContainText(
            new RegExp(`A hint costs ${price} guesses`)
        );
    });
});
