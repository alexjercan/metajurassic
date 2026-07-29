import { test, expect, Page } from "@playwright/test";
import { seedFinishedDailyGame } from "./helpers";

// The share button, end to end in a real browser: both the native share sheet
// (the mobile affordance) and the clipboard fallback, over a finished daily
// game whose guess ladder is known, so the emoji grid can be asserted exactly.
//
// The ladder below is real taxonomy: against Tyrannosaurus, Stegosaurus meets
// it only at dinosauria, Allosaurus at avetheropoda, Albertosaurus at
// tyrannosauridae. The tier boundaries themselves are pinned in
// test/share.test.ts; here the point is that the shipped page produces this
// text through the shipped wiring.
const TARGET = "tyrannosaurus";
const GUESSES = ["stegosaurus", "allosaurus", "albertosaurus", TARGET];
const EXPECTED_GRID = "⬛🟨🟩🦖";

declare global {
    interface Window {
        __sharePayloads?: { text?: string }[];
        __clipboardWrites?: string[];
    }
}

// Replace the platform's share/clipboard with recorders BEFORE any app script
// runs. `nativeShare: false` deletes navigator.share so the page takes the
// fallback path a desktop browser without a share sheet would take.
async function stubShareApis(page: Page, nativeShare: boolean) {
    await page.addInitScript((withShare) => {
        window.__sharePayloads = [];
        window.__clipboardWrites = [];

        if (withShare) {
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: (data: { text?: string }) => {
                    window.__sharePayloads?.push(data);
                    return Promise.resolve();
                },
            });
        } else {
            Object.defineProperty(navigator, "share", {
                configurable: true,
                value: undefined,
            });
        }

        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                writeText: (text: string) => {
                    window.__clipboardWrites?.push(text);
                    return Promise.resolve();
                },
            },
        });
    }, nativeShare);
}

async function openFinishedGame(page: Page) {
    // Freeze time so the daily storage key is stable across the reload, and so
    // the game dates as "today" for the streak.
    await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
    await page.goto("/");
    await seedFinishedDailyGame(page, {
        targetId: TARGET,
        guesses: GUESSES,
        lastGuessId: TARGET,
    });
    await page.reload();
    await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
}

test.describe("sharing a finished game", () => {
    test("hands the story to the native share sheet when there is one", async ({
        page,
    }) => {
        await stubShareApis(page, true);
        await openFinishedGame(page);

        await page.locator("#modal-share-btn").click();

        await expect
            .poll(() => page.evaluate(() => window.__sharePayloads?.length))
            .toBe(1);
        const text = await page.evaluate(
            () => window.__sharePayloads?.[0]?.text ?? ""
        );

        expect(text).toContain("✅ Dinosaur dinosaur-#");
        expect(text).toContain("I figured it out in 4 guesses!");
        expect(text).toContain(EXPECTED_GRID);
        // Real stats, computed from the storage this very game was saved to.
        expect(text).toMatch(/🔥 \d+ day streak/);
        expect(text).toContain("Avg. 4.0");
        expect(text).not.toContain("5.2");
        expect(text).not.toContain("Avg. Guesses");

        // The OS sheet is its own feedback; the button must not also claim a
        // clipboard copy that never happened.
        expect(
            await page.evaluate(() => window.__clipboardWrites)
        ).toHaveLength(0);
        await expect(page.locator("#modal-share-btn span")).not.toHaveText(
            "Copied!"
        );
    });

    test("falls back to the clipboard, with its confirmation, when there is not", async ({
        page,
    }) => {
        await stubShareApis(page, false);
        await openFinishedGame(page);

        const shareBtn = page.locator("#modal-share-btn");
        const originalLabel = await shareBtn.locator("span").textContent();

        await shareBtn.click();

        await expect
            .poll(() => page.evaluate(() => window.__clipboardWrites?.length))
            .toBe(1);
        const text = await page.evaluate(
            () => window.__clipboardWrites?.[0] ?? ""
        );

        expect(text).toContain(EXPECTED_GRID);
        expect(text).toContain("#metajurassic");
        expect(text).not.toContain("5.2");

        // The silent write is the one that needs a visible confirmation.
        await expect(shareBtn.locator("span")).toHaveText("Copied!");
        await page.clock.fastForward(2500);
        await expect(shareBtn.locator("span")).toHaveText(originalLabel ?? "");
    });
});
