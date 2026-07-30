import { test, expect } from "@playwright/test";
import { guessFirstSuggestion, loadContent } from "./helpers";

// The guess flow from typing through rendered feedback: type a partial name,
// navigate the suggestion list with the keyboard, submit, and confirm the
// guesses-left control and the tree feedback both update. This is the coverage
// the seam-level Jest tests cannot give (they call state helpers directly).
test.describe("autocomplete guess flow", () => {
    test("typing, navigating and submitting a guess updates guesses left and the tree", async ({
        page,
    }) => {
        await page.goto("/");

        const statBox = page.locator("#stat-box");
        await expect(statBox).toContainText("Guesses Left: 25");

        const treeBefore = await page.locator("#tree-container").innerHTML();

        // "saurus" is a substring of many species names, so the suggestion list
        // is guaranteed non-empty regardless of the daily target.
        const { speciesNames } = await loadContent(page);
        expect(
            speciesNames.some((n) => n.toLowerCase().includes("saurus"))
        ).toBe(true);

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("saurus");

        const box = page.locator("#autocomplete-box");
        const items = box.locator(".autocomplete-item");
        await expect(items.first()).toBeVisible();
        const itemCount = await items.count();
        expect(itemCount).toBeGreaterThan(0);

        // Navigate down one and submit the highlighted suggestion.
        await input.press("ArrowDown");
        await expect(box.locator(".autocomplete-active")).toHaveCount(1);
        await input.press("Enter");

        // Guesses left decremented by exactly one, input cleared, tree changed.
        await expect(statBox).toContainText("Guesses Left: 24");
        await expect(input).toHaveValue("");
        await expect
            .poll(async () => page.locator("#tree-container").innerHTML())
            .not.toBe(treeBefore);
    });
});

// The regression for task 20260729-141427, played the way the bug was reported:
// keep guessing what the box offers and the box must keep offering. `findMatches`
// used to truncate to 8 BEFORE dropping guessed species, so the eight names the
// player had just been handed consumed every slot and the list went EMPTY with
// 75 valid candidates left. Seed 5 is the reported repro; its target
// (Diplodocus) is not among the "saur" suggestions, so the round is still
// running when the assertions execute - which the spec proves rather than
// assumes.
test.describe("autocomplete stays usable deep in a round", () => {
    const SEED = 5;
    const SUGGESTION_LIMIT = 8;

    test("keeps offering suggestions after the whole visible list has been guessed", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${SEED}`);
        await page.waitForSelector("#tree-container .node-box");

        const { speciesNames } = await loadContent(page);
        expect(
            speciesNames.filter((n) => n.toLowerCase().includes("saur")).length
        ).toBeGreaterThan(SUGGESTION_LIMIT * 2);

        const input = page.locator("#player-input");
        const items = page.locator("#autocomplete-box .autocomplete-item");

        // Guess every name the box offers, one full list of them.
        const guessed: string[] = [];
        for (let i = 0; i < SUGGESTION_LIMIT; i++) {
            await input.click();
            await input.fill("saur");
            await expect(items.first()).toBeVisible();
            const first = (await items.first().textContent())?.trim() ?? "";
            expect(first, `suggestion ${i + 1} was blank`).not.toBe("");
            guessed.push(first);
            await guessFirstSuggestion(page, "saur");
        }

        expect(new Set(guessed).size).toBe(SUGGESTION_LIMIT);
        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${25 - SUGGESTION_LIMIT}`
        );
        // None of those guesses was the target, so the board is still playable
        // and the suggestion box below is the live one.
        await expect(page.locator("#tree-container .node-mystery")).toHaveCount(
            1
        );

        // The bug: this list used to be empty.
        await input.click();
        await input.fill("saur");
        await expect(items).toHaveCount(SUGGESTION_LIMIT);

        const offered = await items.allTextContents();
        expect(
            offered.map((t) => t.trim()).filter((n) => guessed.includes(n)),
            "the box re-offered species the player already guessed"
        ).toEqual([]);
    });

    test("offers names starting with the query before names merely containing it", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${SEED}`);
        await page.waitForSelector("#tree-container .node-box");

        const input = page.locator("#player-input");
        await input.click();
        await input.fill("tyr");

        const items = page.locator("#autocomplete-box .autocomplete-item");
        await expect(items.first()).toBeVisible();

        // Source order alone puts both "Tyranno..." names third and fourth,
        // behind Yutyrannus and Styracosaurus. This asserts the rendered order,
        // so it also proves `setupAutocomplete` paints what `findMatches`
        // returns; the exact ranking is pinned in test/autocomplete.test.ts.
        expect((await items.allTextContents()).map((t) => t.trim())).toEqual([
            "Tyrannotitan",
            "Tyrannosaurus",
            "Yutyrannus",
            "Styracosaurus",
            "Nanotyrannus",
        ]);
    });
});
