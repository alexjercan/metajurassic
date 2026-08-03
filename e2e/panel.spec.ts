import { test, expect } from "@playwright/test";
import { guessFirstSuggestion } from "./helpers/guessing";
import { loadContent } from "./helpers/content";
import { expectPullTabInsideViewport } from "./helpers/panel";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle. `guessFirstSuggestion(page, "saurus")` below always
// guesses Ceratosaurus, so on a real-calendar day whose target IS
// Ceratosaurus this fixture WINS on guess 1 and the win modal swallows every
// later click. Load-bearing, not boilerplate - see
// tasks/20260804-000316/DECISION.md.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

// The info panel can be opened and closed, shows clade/species card content,
// and closing it leaves the control path (the guess input) usable. Runs on the
// desktop project, so the first test doubles as the desktop first-load check.
test.describe("info panel", () => {
    test("stays closed on first load and opens on demand with the hint card", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const card = page.locator("#panel-card-container");
        const toggle = page.locator("#open-panel");
        const input = page.locator("#player-input");

        // First load belongs to the game, not the panel: the panel is closed
        // but its starting-clade card is already rendered behind it, so the
        // pull tab reveals the hint in one tap. See 20260729-092315/DECISION.md.
        await expect(panel).not.toHaveClass(/active/);
        await expect(page.locator("#arena")).toBeVisible();
        await expect(input).toBeVisible();
        await expect(input).toBeEditable();
        await expect(card).not.toBeEmpty();

        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await expect(card.locator(".card-title")).toBeVisible();

        await toggle.click();
        await expect(panel).not.toHaveClass(/active/);
        await expect(input).toBeVisible();
        await expect(input).toBeEditable();

        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await expect(card.locator(".card-title")).toBeVisible();
    });

    // Dropping the first-load auto-open must not disable the auto-open that
    // carries guess feedback - that one is the intended behavior and is why the
    // fix is scoped to the no-last-guess branch of renderLastGuess.
    test("auto-opens with card content after a guess", async ({ page }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const card = page.locator("#panel-card-container");
        await expect(panel).not.toHaveClass(/active/);

        // "saurus" matches many species names, so a suggestion exists whatever
        // the daily target is.
        const { speciesNames } = await loadContent(page);
        expect(
            speciesNames.some((n) => n.toLowerCase().includes("saurus"))
        ).toBe(true);

        await guessFirstSuggestion(page, "saurus");

        // The guess feedback opens the panel by itself.
        await expect(panel).toHaveClass(/active/);
        await expect(card.locator(".card-title")).toBeVisible();
    });

    // Buying a hint before the first guess goes through the SAME no-last-guess
    // branch of renderLastGuess that stopped auto-opening, so without an
    // explicit open the player would spend three guesses for no visible card.
    test("opens when a hint is bought before the first guess", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const hint = page.locator("#hint-box");
        await expect(panel).not.toHaveClass(/active/);
        await expect(hint).not.toBeDisabled();

        await hint.click();

        // The hint costs three guesses and reveals its clade in the panel.
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 22"
        );
        await expect(panel).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
    });

    // The desktop half of the pull-tab fix (F3.3): it sat at `right: -5px` and
    // was clipped by the viewport edge on BOTH viewports, and its only content
    // was an unlabelled glyph. The mobile half is in e2e/mobile.spec.ts.
    test("the pull tab is labelled and fully within the viewport", async ({
        page,
    }) => {
        await page.goto("/");
        await expectPullTabInsideViewport(page);

        const label = page.locator("#open-panel .panel-pull-label");
        await expect(label).toBeVisible();
        await expect(label).not.toBeEmpty();

        // Still on screen once opened, when it acts as the close control.
        await page.locator("#open-panel").click();
        await expect(page.locator("#info-panel")).toHaveClass(/active/);
        await expectPullTabInsideViewport(page);
    });

    // A player who dismisses the panel mid-game should not have it shoved back
    // over the tree by the next guess.
    test("respects a manual close for the guess that follows it", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const toggle = page.locator("#open-panel");

        // Open it, then close it manually.
        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await toggle.click();
        await expect(panel).not.toHaveClass(/active/);

        await guessFirstSuggestion(page, "saurus");

        // The guess registers, but the manually dismissed panel stays shut.
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );
        await expect(panel).not.toHaveClass(/active/);
    });

    // The hint-purchase open must not become a back door that clears the manual
    // close: openPanel() resets manuallyClosedPanel, so an unconditional open
    // here would silently re-enable the auto-open for every later guess.
    test("a mid-game hint does not resurrect the panel for later guesses", async ({
        page,
    }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        const toggle = page.locator("#open-panel");

        // Make a guess (the panel auto-opens), then dismiss it by hand.
        await guessFirstSuggestion(page, "saurus");
        await expect(panel).toHaveClass(/active/);
        await toggle.click();
        await expect(panel).not.toHaveClass(/active/);

        // Buy a hint mid-game: the preference stands.
        const hint = page.locator("#hint-box");
        await expect(hint).not.toBeDisabled();
        await hint.click();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 21"
        );
        await expect(panel).not.toHaveClass(/active/);

        // And it still stands for the guess after it.
        await guessFirstSuggestion(page, "saurus");
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 20"
        );
        await expect(panel).not.toHaveClass(/active/);
    });
});
