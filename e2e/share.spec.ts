import { test, expect, Page } from "@playwright/test";
import {
    computeDailyKey,
    seedFinishedDailyGame,
    wrongGuessIds,
} from "./helpers/content";
import { MAX_GUESSES } from "../src/constants";

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
// fallback path a desktop browser without a share sheet would take;
// `clipboardFails: true` makes that fallback REJECT, the way a browser denying
// clipboard permission or an insecure context does.
async function stubShareApis(
    page: Page,
    nativeShare: boolean,
    clipboardFails = false
) {
    await page.addInitScript(
        ([withShare, failCopy]) => {
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
                        // A rejected write is still RECORDED, so a test can
                        // tell "the copy was attempted and failed" apart from
                        // "the copy was never attempted".
                        window.__clipboardWrites?.push(text);
                        return failCopy
                            ? Promise.reject(
                                  new Error("Clipboard write not allowed")
                              )
                            : Promise.resolve();
                    },
                },
            });
        },
        [nativeShare, clipboardFails] as const
    );
}

async function openFinishedGame(page: Page, guesses: string[] = GUESSES) {
    // Freeze time so the daily storage key is stable across the reload, and so
    // the game dates as "today" for the streak.
    await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
    await page.goto("/");
    await seedFinishedDailyGame(page, {
        targetId: TARGET,
        guesses,
        lastGuessId: guesses[guesses.length - 1],
    });
    await page.reload();
    await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
}

// Bank a WIN dated the day before the frozen clock, so a loss today has a live
// streak to suppress. The key is derived from today's by decrementing its
// counter: the daily keys are consecutive by construction (one per calendar
// day), and the frozen clock is nowhere near the modulus wrap.
async function seedPreviousDayWin(page: Page): Promise<void> {
    const todayKey = await computeDailyKey(page);
    const digits = todayKey.match(/#(\d{5})$/);
    if (!digits) throw new Error(`unexpected daily key shape: ${todayKey}`);
    const counter = String(Number(digits[1]) - 1).padStart(5, "0");
    const yesterday = `gameState-dinosaur-#${counter}`;

    await page.evaluate(
        ([key, target]) => {
            localStorage.setItem(
                key,
                JSON.stringify({
                    targetId: target,
                    guesses: [target],
                    lastGuessId: target,
                    hintClades: [],
                    createdAt: new Date().toISOString(),
                })
            );
        },
        [yesterday, TARGET] as const
    );
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

    test("does not claim a copy for a clipboard write that failed", async ({
        page,
    }) => {
        // A denied clipboard is the one path where the button could lie: the
        // write is silent, so the label is the ONLY signal the player gets, and
        // "Copied!" over a failed write sends them to paste nothing.
        await stubShareApis(page, false, true);
        await openFinishedGame(page);

        const shareBtn = page.locator("#modal-share-btn");
        const originalLabel = await shareBtn.locator("span").textContent();

        // The shipped failure handler raises a system alert (src/game.ts). That
        // choice is contested - guesses moved off `alert()` to the inline
        // `#input-error` for exactly this reason, and 20260730-165921 owns the
        // change - so this pins the CURRENT behaviour rather than blessing it.
        // Capturing the dialog also proves the failure branch actually ran:
        // Playwright would auto-dismiss it and the test could not tell.
        const dialogs: string[] = [];
        page.on("dialog", (dialog) => {
            dialogs.push(dialog.message());
            void dialog.dismiss();
        });

        await shareBtn.click();

        // The write was attempted...
        await expect
            .poll(() => page.evaluate(() => window.__clipboardWrites?.length))
            .toBe(1);
        // ...it failed, and the player was told something.
        await expect.poll(() => dialogs.length).toBe(1);
        expect(dialogs[0]).toContain("Failed to share");

        // The label must never have said "Copied!". Asserted after the alert
        // has been observed, so the confirmation window has already passed:
        // a `toHaveText` poll alone would resolve on the first sample and could
        // step over a flash of the wrong label.
        await expect(shareBtn.locator("span")).toHaveText(originalLabel ?? "");
    });
});

test.describe("sharing a lost game", () => {
    // The loss branch through the shipped page. test/share.test.ts pins the
    // wording at unit level; what only a browser can show is that the button's
    // own `computeGameStats` call feeds the branch real stats - and that the
    // streak suppression survives the wiring.
    test("tells the story without bragging about the streak it just broke", async ({
        page,
    }) => {
        await stubShareApis(page, true);
        await page.goto("/");
        const wrong = await wrongGuessIds(page, TARGET);

        // A win banked YESTERDAY, so the current streak is genuinely 1 while
        // today's round is a loss. Without it `currentStreak` would be 0 and the
        // suppression this test exists for would pass vacuously - the branch is
        // guarded on `isWin` AND `currentStreak > 0` (src/gameState.ts).
        await openFinishedGame(page, wrong);
        await seedPreviousDayWin(page);
        await page.reload();
        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);

        // Prove the fixture before relying on it. `calculateStreak` only counts
        // a streak whose last win is today or yesterday, so if the derived key
        // ever stops meaning "yesterday" this reads 0 and fails HERE - rather
        // than leaving the suppression assertion below to pass vacuously.
        await page.goto("/profile/");
        await expect(page.locator("#current-streak-daily")).toHaveText("1");
        await page.goto("/");
        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);

        await page.locator("#modal-share-btn").click();

        await expect
            .poll(() => page.evaluate(() => window.__sharePayloads?.length))
            .toBe(1);
        const text = await page.evaluate(
            () => window.__sharePayloads?.[0]?.text ?? ""
        );

        expect(text).toContain("💀 Dinosaur dinosaur-#");
        expect(text).toContain(
            `I couldn't figure it out in ${MAX_GUESSES} guesses.`
        );
        // Every guess is gridded and none of them is the answer: the win cell
        // must be absent, and the grid must be as long as the round was.
        const grid = text.split("\n")[2] ?? "";
        expect([...grid]).toHaveLength(MAX_GUESSES);
        expect(grid).not.toContain("🦖");

        // The banked streak IS 1, read off the profile above, and the prior win
        // is the only win in storage - so the exact average pins that it was
        // counted here too. The loss share still refuses to print the streak.
        expect(text).toContain("Avg. 1.0");
        expect(text).not.toMatch(/day streak/);
        expect(text).not.toContain("🔥");
    });
});
