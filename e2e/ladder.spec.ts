import { test, expect } from "@playwright/test";
import { guessNamedSpecies } from "./helpers/guessing";
import { CLOSENESS_LADDER, WIDE_TREE_SEED } from "./helpers/rounds";
import { expectTreeNotOccludedByPanel } from "./helpers/panel";

// The round summary, on a phone. Runs on the mobile project (see
// playwright.config.ts) because the occlusion rule is a phone rule: the panel
// is `width: 100%` under `(max-width: 768px)` and overlays the arena, so a
// surface that opened itself would replace the board the player is reading.
// See tasks/20260729-182320/DECISION.md and tasks/20260729-141414/DECISION.md.

const SUMMARY_GUESSES = CLOSENESS_LADDER.slice(0, 3).map((rung) => rung.name);

async function playAndOpenSummary(page: import("@playwright/test").Page) {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    for (const name of SUMMARY_GUESSES) {
        await guessNamedSpecies(page, name);
    }

    // The panel must still be closed after three guesses, on its own: the
    // summary renders on every update, and rendering it may not open anything.
    await expectTreeNotOccludedByPanel(page);

    await page.locator("#open-panel").click();
    await page.locator("#panel-tab-summary").click();
}

test.describe("round summary", () => {
    test("opens behind the Summary tab without occluding the tree", async ({
        page,
    }) => {
        await playAndOpenSummary(page);

        const summary = page.locator("#panel-summary-container");
        await expect(summary.locator(".ladder-card")).toBeVisible();
        await expect(page.locator("#panel-card-container")).toBeHidden();

        // The card is mounted WITHOUT autoShrinkText (see renderRoundSummary),
        // so its fixed title has to fit unaided on the narrowest viewport.
        const overflow = await summary
            .locator(".card-title")
            .evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);

        // One chip per guess spent, and the counts agree with them.
        await expect(summary.locator(".ladder-guess")).toHaveCount(
            SUMMARY_GUESSES.length
        );
        await expect(summary.locator(".ladder-counts")).toHaveText(
            `${SUMMARY_GUESSES.length} guesses`
        );

        // Back to Info leaves the museum card exactly where it was.
        await page.locator("#panel-tab-info").click();
        await expect(page.locator("#panel-card-container")).toBeVisible();
        await expect(summary).toBeHidden();
    });

    // The pull tab advertises the museum card a guess produced BY NAME, so the
    // pane it opens has to be the one it named. Without this, a player who ever
    // tapped `Summary` was parked there for the rest of the round and every
    // later card mounted into a hidden pane.
    test("a later guess brings the panel back to the card the tab promises", async ({
        page,
    }) => {
        await playAndOpenSummary(page);
        await page.locator("#open-panel").click();
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);

        await guessNamedSpecies(page, CLOSENESS_LADDER[3].name);

        const pullTab = page.locator("#open-panel");
        await expect(pullTab).toHaveClass(/has-unseen/);
        const promised =
            (await pullTab.getAttribute("aria-label")) ??
            "no aria-label on the pull tab";
        expect(promised).toMatch(/^Open info panel: .+/);

        await pullTab.click();
        await expect(page.locator("#panel-summary-container")).toBeHidden();
        const card = page.locator("#panel-card-container");
        await expect(card).toBeVisible();
        await expect(card.locator(".card-title")).toHaveText(
            promised.replace("Open info panel: ", "")
        );
        await expect(page.locator("#panel-tab-info")).toHaveAttribute(
            "aria-selected",
            "true"
        );
    });

    // The tab strip is the first focusable control ever placed inside
    // #info-panel, and a closed panel is only pushed off-screen by a transform
    // (src/partials/panel.css) - which leaves it in the tab order. Without
    // `inert` a keyboard player tabs into two invisible buttons on every load
    // and silently swaps a pane they cannot see.
    test("keeps the tabs out of reach while the panel is closed", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
        await page.waitForSelector("#tree-container .node-box");
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);

        for (const id of ["panel-tab-info", "panel-tab-summary"]) {
            const focused = await page.evaluate((tabId) => {
                const tab = document.getElementById(tabId);
                tab?.focus();
                return document.activeElement === tab;
            }, id);
            expect(focused).toBe(false);
        }

        // And the same controls work once the panel is actually open.
        await page.locator("#open-panel").click();
        const focusedWhenOpen = await page.evaluate(() => {
            const tab = document.getElementById("panel-tab-summary");
            tab?.focus();
            return document.activeElement === tab;
        });
        expect(focusedWhenOpen).toBe(true);
    });

    // updateUI() runs from submitGuess's `finally`, so a REJECTED guess
    // repaints the same museum card. Pulling the pane back to Info there would
    // yank a player off Summary with nothing new behind the switch.
    test("a rejected guess leaves the player on Summary", async ({ page }) => {
        await playAndOpenSummary(page);

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("Notadinosaurus");
        await input.press("Enter");

        await expect(page.locator("#input-error")).toBeVisible();
        await expect(page.locator("#panel-summary-container")).toBeVisible();
        await expect(page.locator("#panel-tab-summary")).toHaveAttribute(
            "aria-selected",
            "true"
        );
    });

    // The gate above is on the card CHANGING, so a VALID guess that does not
    // deepen the best clade repaints the same card too. The pull tab must not
    // advertise it: what the tab promises and what the panel opens onto are the
    // same decision, so they are made in one place.
    //
    // Tyrannosaurus is a theropod, so its LCA with the target sits above the
    // plateosauria card Plateosaurus already revealed - unlike
    // CLOSENESS_LADDER[3], which deepens it and is why the case above passes
    // either way.
    test("a non-deepening guess does not advertise a card behind Summary", async ({
        page,
    }) => {
        await playAndOpenSummary(page);
        const before =
            (await page
                .locator("#panel-card-container .card-title")
                .textContent()) ?? "";
        expect(before).not.toBe("");

        await page.locator("#open-panel").click();
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);

        await guessNamedSpecies(page, "Tyrannosaurus");

        // The premise: this guess really did leave the museum card alone.
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toHaveText(before);

        const pullTab = page.locator("#open-panel");
        await expect(pullTab).not.toHaveClass(/has-unseen/);
        await expect(pullTab).toHaveAttribute("aria-label", "Open info panel");

        await pullTab.click();
        await expect(page.locator("#panel-summary-container")).toBeVisible();
        await expect(page.locator("#panel-card-container")).toBeHidden();
    });

    // The gate above is on the card CHANGING, so an explicit request for the
    // card already mounted must still bring its pane forward.
    test("a tree tap on the mounted card still shows the card pane", async ({
        page,
    }) => {
        await playAndOpenSummary(page);

        const title =
            (await page
                .locator("#panel-card-container .card-title")
                .textContent()) ?? "";
        expect(title).not.toBe("");

        // The panel is `width: 100%` on a phone, so the tree is only reachable
        // with it closed - which is the real shape of this scenario anyway.
        await page.locator("#open-panel").click();
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);

        await page
            .locator("#tree-container .node-box")
            .filter({ hasText: new RegExp(`^${title}$`) })
            .first()
            .click();

        await expect(page.locator("#panel-card-container")).toBeVisible();
        await expect(page.locator("#panel-summary-container")).toBeHidden();
    });

    test("ends at a revealed clade and never counts the rungs left", async ({
        page,
    }) => {
        await playAndOpenSummary(page);

        const rows = page.locator("#panel-summary-container .ladder-row");
        await expect(rows.first()).toBeVisible();

        // The deepest row is a clade the BOARD is already showing - which is
        // what "no depth-to-target" means concretely: the ladder stops where the
        // tree stops.
        const deepest =
            (await rows.last().locator(".ladder-clade-name").textContent()) ??
            "";
        expect(deepest).not.toBe("");
        await expect(
            page.locator("#tree-container .node-box").filter({
                hasText: new RegExp(`^${deepest}$`),
            })
        ).toHaveCount(1);

        // And nothing on the card stands in for an unrevealed rung.
        const text =
            (await page.locator("#panel-summary-container").textContent()) ??
            "";
        expect(text).not.toContain("?");
    });
});
