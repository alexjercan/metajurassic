import { test, expect } from "@playwright/test";
import { loadContent, seedFinishedDailyGame } from "./helpers/content";
import {
    expectActionsOnOneRow,
    expectModalNeedsNoScroll,
} from "./helpers/modal";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle so this file's verdict is a property of the content
// rather than of the calendar (tasks/20260804-000316/DECISION.md). Here it
// also keeps the daily storage key stable across the seed-then-reload, and
// dates the seeded round as "today" for the streak.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

// End-of-game modal smoke coverage. The finished game state is injected into
// localStorage keyed off a frozen clock (see e2e/helpers/content.ts and
// tasks/20260729-092258/DECISION.md), so the modal renders deterministically
// without a real playthrough.
test.describe("end-of-game modal", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("win modal shows on a solved daily game", async ({ page }) => {
        const { speciesIds } = await loadContent(page);
        const target = speciesIds[0];
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: [target],
            lastGuessId: target,
        });
        await page.reload();

        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
        await expect(page.locator("#modal-title")).toHaveText("You found it!");
        await expect(page.locator("#modal-title")).toHaveClass(
            /modal-title-win/
        );
    });

    test("loss modal shows when all guesses are spent", async ({ page }) => {
        const { speciesIds } = await loadContent(page);
        // 25 wrong guesses (none is the target) exhausts MAX_GUESSES.
        const target = speciesIds[0];
        const wrong = speciesIds.slice(1, 26);
        expect(wrong).toHaveLength(25);
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: wrong,
            lastGuessId: wrong[wrong.length - 1],
        });
        await page.reload();

        await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
        await expect(page.locator("#modal-title")).toHaveText("Game Over");
        await expect(page.locator("#modal-title")).toHaveClass(
            /modal-title-loss/
        );
    });
});

// The desktop side of the phone-overflow fix (tasks/20260729-141428). Making
// `.modal-actions` wrap is what guarantees the row can never hang off a narrow
// screen again - but the three buttons at their old 40px padding needed 421.6px
// against the modal's 420px content box, so they had been overflowing it by
// 1.6px on the DESKTOP too, invisibly absorbed by the padding. With `wrap` that
// hairline became a wrapped second row at 1280px. The padding was cut to 32px to
// give the row honest room, and this pins the outcome: on a desktop viewport the
// actions are one row, with the margin stated rather than assumed.
test.describe("end-of-game modal on desktop", () => {
    test("the actions sit on a single row", async ({ page }) => {
        await page.goto("/");
        const { speciesIds } = await loadContent(page);
        const target = speciesIds[0];
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: [target],
            lastGuessId: target,
        });
        await page.reload();

        await expectActionsOnOneRow(page);
    });

    // The OTHER axis of the 20260730-160720 compaction, and the case without
    // which that change would be untested where it is hardest. 900px is wide
    // enough that `@media (max-width: 768px)` does NOT apply, so the modal is at
    // its DESKTOP padding step (40px 48px, not 28px 24px) while the height block
    // trims it - which is the only place the height block has to stand on its
    // own. Every short size in e2e/mobile.spec.ts is also narrow, so all of them
    // get both blocks and a trim that silently depended on the width block would
    // pass the whole mobile sweep (LESSONS.md:
    // css-media-blocks-on-different-axes-are-resolved-by-file-order).
    test("the whole modal is visible in a short desktop window", async ({
        page,
    }) => {
        await page.goto("/");
        const { speciesIds } = await loadContent(page);
        const target = speciesIds[0];
        await seedFinishedDailyGame(page, {
            targetId: target,
            guesses: [target],
            lastGuessId: target,
        });
        // Before the reload, so the modal is laid out at the size under test and
        // never at the project's default - a modal measured after a resize has
        // been through a reflow the player never performs.
        await page.setViewportSize({ width: 900, height: 400 });
        await page.reload();
        await expect(page.locator("#modal-title")).toHaveText("You found it!");

        await expectModalNeedsNoScroll(page);
    });
});
