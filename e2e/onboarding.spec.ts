import { test, expect } from "@playwright/test";
import { guessFirstSuggestion } from "./helpers/guessing";
import {
    expectNoBoxOverlap,
    expectFullyVisibleWithin,
} from "./helpers/viewport";
import { MAX_GUESSES, HINT_COST } from "../src/constants";

// Desktop coverage for the in-board onboarding brief and the hint chip copy.
// See tasks/20260729-092327/DECISION.md for why the explanation lives in the
// arena's pre-guess band rather than on an interstitial or in the top bar.
test.describe("onboarding brief", () => {
    test("states the objective, the ? node, the tree rule and the budget", async ({
        page,
    }) => {
        await page.goto("/");

        const brief = page.locator("#onboarding-brief");
        await expect(brief).toBeVisible();

        // The four facts a first-timer is missing (playtest F3.1). Asserted as
        // four separate elements rather than one blob so a regression names
        // which fact went missing.
        await expect(page.locator("#brief-objective")).toContainText(
            /find the mystery dinosaur/i
        );
        await expect(page.locator("#brief-mystery")).toContainText(/\?/);
        await expect(page.locator("#brief-feedback")).toContainText(
            /clade|shares/i
        );
        // Derived from the constant, not typed here: this asserts the rendered
        // board agrees with MAX_GUESSES, which a literal would not.
        await expect(page.locator("#brief-budget")).toContainText(
            String(MAX_GUESSES)
        );
    });

    test("is fully on screen and clear of the tree and the input", async ({
        page,
    }) => {
        await page.goto("/");

        const brief = page.locator("#onboarding-brief");
        await expect(brief).toBeVisible();

        // Readable without a scroll. Measured against the clipping ancestor as
        // well as the viewport: .game-area is `overflow: hidden`, so a brief
        // that has outgrown its room is still "in the viewport" while its last
        // lines are cut off.
        await expectFullyVisibleWithin(page, "#onboarding-brief", ".game-area");

        // And it must not sit on top of either half of the game loop.
        await expectNoBoxOverlap(page, "#onboarding-brief", ".tree");
        await expectNoBoxOverlap(page, "#onboarding-brief", ".bottom-bar");
    });

    // The default 1280x720 project viewport had exactly ZERO slack, so the
    // "fully on screen" check above passed while the layout was one short
    // window away from slicing the brief. These are the sizes that actually
    // failed before the brief was moved out of #arena's scroll box: it hung
    // 13px past the arena at 1440x660 and 20px at 1366x600.
    for (const size of [
        { width: 1440, height: 660 },
        { width: 1366, height: 600 },
        { width: 1280, height: 620 },
        // The shortest viewport in the sweep, and the tightest: it had 1px of
        // slack, so the height an inline error adds to .bottom-bar was enough to
        // slice the How to play button in half.
        { width: 320, height: 568 },
    ]) {
        for (const withError of [false, true]) {
            test(`is not clipped at ${size.width}x${size.height}${withError ? " with the inline error showing" : ""}`, async ({
                page,
            }) => {
                await page.setViewportSize(size);
                await page.goto("/");

                if (withError) {
                    const input = page.locator("#player-input");
                    await input.click();
                    await input.fill("Micropachycephalosaurusrex");
                    await input.press("Enter");
                    await expect(page.locator("#input-error")).toBeVisible();
                }

                await expect(page.locator("#onboarding-brief")).toBeVisible();
                await expectFullyVisibleWithin(
                    page,
                    "#onboarding-brief",
                    ".game-area"
                );
                // The button is the last thing in the brief, so it is what a
                // bottom-edge clip takes first.
                await expect(page.locator("#brief-how-to-play")).toBeInViewport(
                    { ratio: 1 }
                );
            });
        }
    }

    // Adding the brief takes room from #arena, and #arena already overflowed on
    // master at short window heights (measured on the master build: 19px at
    // 1440x660, 84px at 1366x600 - the pre-guess tree was already scrolled
    // there). The `@media (max-height: 700px)` compaction exists so this task
    // does not make that worse; measured on this branch it is strictly better
    // than master at every size swept. This pins the size where the branch
    // turns a pre-existing 19px overflow into none at all.
    test("does not push the pre-guess tree out of the arena at 1440x660", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 660 });
        await page.goto("/");
        await expect(page.locator("#onboarding-brief")).toBeVisible();

        const overflow = await page.evaluate(() => {
            const arena = document.getElementById("arena");
            if (!arena) return -1;
            return arena.scrollHeight - arena.clientHeight;
        });
        expect(
            overflow,
            `#arena overflows by ${overflow}px, so the pre-guess tree is partly scrolled out`
        ).toBeLessThanOrEqual(1);
    });

    // Showing the inline error grows .bottom-bar, which takes height from the
    // game area. That alone used to push the arena into 30px of overflow at the
    // tested 1280x720 - the branch's own new element breaking its own layout.
    test("is not clipped while the inline error is showing", async ({
        page,
    }) => {
        await page.goto("/");

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("Notadinosaurus");
        await input.press("Enter");
        await expect(page.locator("#input-error")).toBeVisible();

        await expectFullyVisibleWithin(page, "#onboarding-brief", ".game-area");
        await expectNoBoxOverlap(page, "#onboarding-brief", ".bottom-bar");

        // The message itself must be readable. It is in normal flow, so it
        // grows .bottom-bar rather than being drawn over the footer - the
        // opposite trade from the first attempt, which kept the board rigid and
        // hid the text.
        await expectFullyVisibleWithin(page, "#input-error", ".bottom-bar");
    });

    test("is gone once the round is under way", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("#onboarding-brief")).toBeVisible();

        await guessFirstSuggestion(page, "Tyrannosaurus");

        // The band it occupied belongs to the tree from here on: the tree grows
        // downward into it (tasks/20260729-141414/DECISION.md).
        await expect(page.locator("#onboarding-brief")).toBeHidden();
    });

    test("How to play opens the deeper card in the existing panel", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);

        await page.locator("#brief-how-to-play").click();

        await expect(panel).toHaveClass(/active/);
        await expect(panel.locator(".card-title")).toContainText(
            /how to play/i
        );
    });
});

test.describe("hint chip copy", () => {
    // The chip stated its price and never its product (playtest F3.2). The
    // wording is bounded by two facts recorded in DECISION.md: it must not
    // claim the hint halves the field (~19% of presses narrow less), and it
    // must read as a rescue rather than an edge.
    test("names its product and its price", async ({ page }) => {
        await page.goto("/");

        const hint = page.locator("#hint-box");
        await expect(hint).toBeVisible();
        await expect(hint).toContainText(/stuck\?/i);
        await expect(hint).toContainText(
            new RegExp(`spend ${HINT_COST} guesses to reveal a clade`, "i")
        );
    });

    test("makes no claim about how much the reveal narrows", async ({
        page,
    }) => {
        await page.goto("/");

        // A guard on the specific lie the fallback branch would make of the
        // copy, not a general style check.
        const text = (await page.locator("#hint-box").textContent()) ?? "";
        expect(text).not.toMatch(/half|halve|narrow the field by/i);
    });
});

test.describe("invalid guess feedback", () => {
    test("reports inline near the input, with no browser dialog", async ({
        page,
    }) => {
        let dialogFired = false;
        page.on("dialog", async (dialog) => {
            dialogFired = true;
            await dialog.dismiss();
        });

        await page.goto("/");

        const error = page.locator("#input-error");
        await expect(error).toBeHidden();

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("Notadinosaurus");
        await input.press("Enter");

        await expect(error).toBeVisible();
        await expect(error).toContainText(/notadinosaurus/i);

        // The whole point of the change: an alert() breaks the game feel.
        expect(dialogFired).toBe(false);

        // A rejected guess is not a guess: the budget must be untouched.
        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${MAX_GUESSES}`
        );
    });

    // The other rejection branch. Rendered as well as the unknown-name one
    // because a message only read in a diff is a message nobody has read
    // (LESSONS.md: render-every-branch-of-a-message-side-by-side).
    test("reports a repeated guess inline too", async ({ page }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "Tyrannosaurus");

        const before = await page.locator("#stat-box").textContent();

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("Tyrannosaurus");
        await input.press("Enter");

        const error = page.locator("#input-error");
        await expect(error).toBeVisible();
        await expect(error).toContainText(/already guessed/i);
        // Rejected, so it must not have cost a second guess.
        await expect(page.locator("#stat-box")).toHaveText(before ?? "");
    });

    test("clears when the player types again", async ({ page }) => {
        await page.goto("/");

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("Notadinosaurus");
        await input.press("Enter");
        await expect(page.locator("#input-error")).toBeVisible();

        await input.fill("Tyr");
        await expect(page.locator("#input-error")).toBeHidden();
    });
});
