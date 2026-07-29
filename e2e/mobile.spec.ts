import { test, expect } from "@playwright/test";
import {
    expectPullTabInsideViewport,
    guessFirstSuggestion,
    expectTreeNotOccludedByPanel,
} from "./helpers";

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
        await expectTreeNotOccludedByPanel(page);
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

    // The core of task 20260729-141414 (playtest finding F3.5). Before the fix,
    // `renderLastGuess` ended in an unconditional `openPanel()`, and on a phone
    // `.info-panel` is `width: 100%` over `.game-area`, so from guess 1 onward
    // the player was shown a museum card INSTEAD of the tree feedback they had
    // just spent a guess on. On narrow viewports the auto-open is dropped; see
    // tasks/20260729-141414/DECISION.md.
    test("the tree stays visible after the first guess", async ({ page }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);
        await expect(page.locator("#tree-container")).toBeVisible();
        await expectTreeNotOccludedByPanel(page);

        // The card was still RENDERED - it is one tap away, not discarded.
        await expect(
            page.locator("#panel-card-container .card-title")
        ).not.toBeEmpty();
    });

    // Same shape, reached by reloading rather than by guessing (F3.6). Task
    // 20260729-125313 owns the general reload auto-open; this pins the phone
    // consequence, which the narrow-viewport rule fixes whatever triggered the
    // render.
    test("the tree stays visible after a mid-game reload", async ({ page }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        await page.reload();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );

        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);
        await expect(page.locator("#tree-container")).toBeVisible();
        await expectTreeNotOccludedByPanel(page);
    });

    // With no auto-open, the tab has to ANNOUNCE the card, or the player has no
    // way to know the guess produced a description worth reading (F3.3: it was
    // an unlabelled glyph clipped by the viewport edge).
    test("the pull tab is on screen, names the revealed clade, and opens it", async ({
        page,
    }) => {
        await page.goto("/");
        await expectPullTabInsideViewport(page);

        // Before any guess the tab is plain "Info": the starting hint is the
        // same root clade the tree already shows, so flagging it unseen would
        // spend the marker on information the player has not earned and cannot
        // act on.
        const tab = page.locator("#open-panel");
        await expect(tab).not.toHaveClass(/has-unseen/);
        await expect(tab.locator(".panel-pull-label")).toHaveText("Info");

        await guessFirstSuggestion(page, "saurus");

        // The label matches the card that was rendered but not shown, so the
        // player is told which clade the tab holds rather than just "info".
        const cladeName = (
            (await page
                .locator("#panel-card-container .card-title")
                .textContent()) ?? ""
        ).trim();
        expect(cladeName).not.toBe("");
        await expect(tab).toHaveClass(/has-unseen/);
        await expect(tab.locator(".panel-pull-label")).toHaveText(cladeName);
        await expectPullTabInsideViewport(page);

        // One tap shows the card and clears the unseen marker.
        await tab.click();
        await expect(page.locator("#info-panel")).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
        await expect(tab).not.toHaveClass(/has-unseen/);
        await expectPullTabInsideViewport(page);
    });

    // Buying a hint is an explicit request to see something, so it must show
    // something. Dropping the auto-open on phones broke that for the MID-GAME
    // hint specifically: `updateUI()` no longer opens the panel there, and
    // src/game.ts only opened it by hand before the first guess, so three spent
    // guesses bought a tree redraw and nothing else. Found in review round 1
    // (R1.4).
    test("a mid-game hint on a phone still shows its clade", async ({
        page,
    }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        // Precondition for the test to mean anything: the guess itself did NOT
        // open the panel, so the hint below is the only thing that can.
        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);

        const hint = page.locator("#hint-box");
        await expect(hint).not.toHaveClass(/disabled/);
        await hint.click();

        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 21"
        );
        await expect(panel).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
    });

    // F3.9: before the first guess the two-node tree floated mid-arena with
    // large blank bands above and below it. The tree is now anchored near the
    // top, so the empty room is below it (where the tree grows) rather than
    // split around it. Measured as a fraction of the arena's own height so the
    // assertion does not encode one device's pixel count.
    test("the pre-guess tree is anchored near the top of the arena", async ({
        page,
    }) => {
        await page.goto("/");
        const tree = page.locator("#tree-container");
        await expect(tree).toBeVisible();

        const gap = await page.evaluate(() => {
            const arena = document.getElementById("arena");
            const tree = document.getElementById("tree-container");
            if (!arena || !tree) return 1;
            const a = arena.getBoundingClientRect();
            const t = tree.getBoundingClientRect();
            return (t.y - a.y) / a.height;
        });
        // The tab needs clearance above the tree, so this is not zero - but the
        // blank band must not be a large fraction of the play surface.
        expect(gap).toBeLessThan(0.2);
    });
});
