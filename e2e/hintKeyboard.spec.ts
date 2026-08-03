import { test, expect, Page } from "@playwright/test";
import { HINT_COST, MAX_GUESSES } from "../src/constants";
import { seedFinishedDailyGame, wrongGuessIds } from "./helpers/content";

// The hint chip is the round's rescue mechanic. It was a <div> with a click
// listener, so it existed for a mouse and for nothing else. This file pins the
// keyboard path end to end: Tab reaches the chip, Enter and Space each spend
// HINT_COST, and an unaffordable chip is inert to the keyboard rather than
// merely to the pointer. See tasks/20260729-212743/DECISION.md.

// Enough presses to cross the header and the board's controls without being an
// unbounded loop; the sweep asserts what it reached, so a too-small bound fails
// loudly rather than silently passing.
const TAB_BUDGET = 40;

const TARGET = "tyrannosaurus";

function activeDescriptor(page: Page): Promise<string> {
    return page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "";
        return el.id ? `#${el.id}` : el.tagName.toLowerCase();
    });
}

// Tab forward until the chip has focus, returning the descriptors seen on the
// way so a failure says where the sweep actually went.
async function tabUntilHintChip(
    page: Page
): Promise<{ reached: boolean; seen: string[] }> {
    const seen: string[] = [];
    for (let i = 0; i < TAB_BUDGET; i++) {
        await page.keyboard.press("Tab");
        const descriptor = await activeDescriptor(page);
        seen.push(descriptor);
        if (descriptor === "#hint-box") return { reached: true, seen };
    }
    return { reached: false, seen };
}

test.describe("buying a hint from the keyboard", () => {
    for (const key of ["Enter", " "] as const) {
        const keyName = key === " " ? "Space" : key;

        test(`buys a hint with ${keyName}`, async ({ page }) => {
            await page.goto("/");
            await expect(page.locator("#stat-box")).toContainText(
                `Guesses Left: ${MAX_GUESSES}`
            );

            const { reached, seen } = await tabUntilHintChip(page);
            expect(
                reached,
                `Tab never reached #hint-box in ${TAB_BUDGET} presses; saw ${seen.join(", ")}`
            ).toBe(true);

            await page.keyboard.press(key);

            await expect(page.locator("#stat-box")).toContainText(
                `Guesses Left: ${MAX_GUESSES - HINT_COST}`
            );
        });
    }

    test("an unaffordable chip is out of the tab order and cannot be fired", async ({
        page,
    }) => {
        await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
        await page.goto("/");

        // One guess more than the hint costs would leave: the round is still
        // live (MAX_HINTS is uncapped, so the guess budget is the only thing
        // that can make the chip unaffordable).
        const spent = MAX_GUESSES - HINT_COST + 1;
        const wrong = await wrongGuessIds(page, TARGET);
        const guesses = wrong.slice(0, spent);
        expect(guesses).toHaveLength(spent);

        await seedFinishedDailyGame(page, {
            targetId: TARGET,
            guesses,
            lastGuessId: guesses[guesses.length - 1],
        });
        await page.reload();

        const left = MAX_GUESSES - spent;
        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${left}`
        );
        await expect(page.locator("#hint-box")).toBeDisabled();

        const seen: string[] = [];
        for (let i = 0; i < TAB_BUDGET; i++) {
            await page.keyboard.press("Tab");
            const descriptor = await activeDescriptor(page);
            seen.push(descriptor);
            // Firing whatever the sweep lands on is not the point; reaching the
            // chip at all already fails the assertion below.
            expect(descriptor).not.toBe("#hint-box");
        }

        // The presses were delivered: focus moved onto real controls, it just
        // never included the chip. Without this the test would pass on a page
        // where Tab did nothing at all.
        expect(
            seen.filter((d) => d !== ""),
            `no control took focus during the sweep; saw ${seen.join(", ")}`
        ).not.toHaveLength(0);

        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${left}`
        );
    });
});
