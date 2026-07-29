import { test, expect } from "@playwright/test";
import {
    playWideTree,
    expectNodeVisibleInArena,
    expectNewestGuessFramed,
    expectNoDeadScrollBand,
    expectEveryNodeReachable,
    expectNodeTextReadable,
    treeNode,
    MIN_PAINTED_FONT_PX,
} from "./helpers";

// Desktop coverage for the many-guess tree (task 20260729-092339). The mobile
// half lives in mobile.spec.ts, because playwright.config.ts binds the phone
// project with `testMatch: /mobile\.spec\.ts/` and this spec would otherwise
// only ever run at one size.
//
// The state under test is a dozen guesses spread across all four branches under
// the root clade, played through the real UI on the seeded practice round. At
// that width the pre-fix renderer scaled the tree with a `transform` whose
// scroll box was still the UNSCALED layout width, and then scrolled to the
// middle of that box - a position with no relation to anything the player cares
// about. Measured before the fix on this viewport: 2693px of scroll range for
// 1280px of arena, 9 of 24 nodes on screen.

// The floor the scaling is allowed to shrink text to comes from
// `MIN_PAINTED_FONT_PX` in ./helpers, which DERIVES it from the shipped
// `MIN_NODE_FONT_PX` rather than restating the number here. Below that floor
// the tree is technically on screen and practically unreadable; the bucket
// classes this task removed painted the phone's node text at 8.6px.

test.describe("many-guess tree on desktop", () => {
    test("the mystery target and the newest guess are both on screen", async ({
        page,
    }) => {
        const newest = await playWideTree(page);

        await expectNodeVisibleInArena(
            page,
            "#tree-container .node-mystery",
            "the mystery target"
        );
        await expect(treeNode(page, newest)).toBeVisible();
        await expectNewestGuessFramed(page, newest);

        // And the player can still act: the input is not covered by anything
        // the wide tree pushed around.
        await page.locator("#player-input").click({ trial: true });
    });

    test("the scroll range holds content, not empty bands", async ({
        page,
    }) => {
        await playWideTree(page);
        await expectNoDeadScrollBand(page);
    });

    test("every node can be scrolled into view", async ({ page }) => {
        await playWideTree(page);
        await expectEveryNodeReachable(page);
    });

    test("nodes stay readable however wide the tree gets", async ({ page }) => {
        await playWideTree(page);
        await expectNodeTextReadable(page, MIN_PAINTED_FONT_PX);
    });

    // The pre-fix renderer sized and scrolled the tree exactly once, in a
    // requestAnimationFrame after render, and never listened for anything. A
    // window resize therefore left the arena parked wherever the old width had
    // put it - which on a shrink is off the content entirely.
    test("resizing the window brings the mystery target back on screen", async ({
        page,
    }) => {
        await playWideTree(page);
        await expectNodeVisibleInArena(
            page,
            "#tree-container .node-mystery",
            "the mystery target"
        );

        await page.setViewportSize({ width: 800, height: 600 });
        // Give the resize handler its frame; the assertion below is what
        // actually decides the outcome.
        await expect
            .poll(
                async () => {
                    const inside = await page.evaluate(() => {
                        const arena = document.getElementById("arena");
                        const node = document.querySelector(".node-mystery");
                        if (!arena || !node) return false;
                        const a = arena.getBoundingClientRect();
                        const n = node.getBoundingClientRect();
                        return (
                            n.left >= a.left - 1 &&
                            n.right <= a.right + 1 &&
                            n.top >= a.top - 1 &&
                            n.bottom <= a.bottom + 1
                        );
                    });
                    return inside;
                },
                { timeout: 3000 }
            )
            .toBe(true);

        await expectNoDeadScrollBand(page);
    });
});
