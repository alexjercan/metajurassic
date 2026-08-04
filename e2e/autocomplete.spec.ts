import { test, expect } from "@playwright/test";
import { guessFirstSuggestion } from "./helpers/guessing";
import { loadContent } from "./helpers/content";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle so this file's verdict is a property of the content
// rather than of the calendar. See tasks/20260804-000316/DECISION.md.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

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

        await input.press("ArrowDown");
        await expect(box.locator(".autocomplete-active")).toHaveCount(1);
        await input.press("Enter");

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

    // The regression for task 20260729-130138, played the way a player hits it:
    // tap another control, go straight back to the input, and keep typing.
    //
    // `setupAutocomplete` hid the box on an uncancelled 100ms `setTimeout`, so
    // the stale timer fired AFTER the re-render and hid a live list. The
    // keydown handler then computed `isOpen === false` and ignored ArrowDown
    // and Enter - and that Enter did not stop there, it reached `src/game.ts`'s
    // own handler, which submitted the RAW typed text. "tyrann" is not a
    // species, so the player got "not found in game data" for a perfectly good
    // prefix and an emptied input that looked like a guess had been taken.
    //
    // The deterministic pin for the timer itself is `test/autocompleteBlur.test.ts`
    // (fake timers step the 100ms exactly); this test is the player-altitude
    // proof that the whole path holds in a real browser. It was run against the
    // unfixed source and fails there - see tasks/20260729-130138/NOTES.md.
    test("submits a guess typed straight after tapping another control", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${SEED}`);
        await page.waitForSelector("#tree-container .node-box");

        // The old failure raised a browser dialog before 20260729-092327 moved
        // it to the inline `#input-error`. Playwright auto-dismisses dialogs,
        // so without this listener the alert would come back unnoticed.
        const dialogs: string[] = [];
        page.on("dialog", (dialog) => {
            dialogs.push(dialog.message());
            void dialog.dismiss();
        });

        const input = page.locator("#player-input");
        const items = page.locator("#autocomplete-box .autocomplete-item");

        await input.click();
        await input.fill("tyrann");
        await expect(items.first()).toBeVisible();

        // Tap another control. This blurs the input and arms the 100ms hide.
        await page.locator("#open-panel").click();
        // Tap straight back in. `focus` re-renders the list, so the box is open
        // again - and the armed timer is still pending against it. Nothing may
        // fire an `input` event after this point: re-typing would re-render and
        // paper over the very defect under test (an earlier draft of this test
        // did exactly that and passed against the unfixed source, 10/10).
        await input.click();
        await expect(items.first()).toBeVisible();

        // Sit past the stale timer's deadline before touching the keyboard.
        // This is not a tolerance hiding a race - it is the opposite, and it
        // makes the test deterministic in BOTH directions: unfixed, the timer
        // has certainly fired and hidden a live list, so the guess below
        // certainly fails; fixed, the timer was cancelled on focus, so there is
        // nothing left to fire and the wait changes nothing. A player pausing a
        // beat before hitting Enter is the ordinary case, not a contrived one.
        await page.waitForTimeout(150);

        await input.press("ArrowDown");
        await input.press("Enter");

        // Exactly one guess spent. Not "the input went empty" - the FAILURE
        // path empties it too (LESSONS.md:
        // `side-effect-cleared-state-is-not-proof-of-success`, this defect's
        // own lesson), and not "fewer than before", which would miss a double
        // submit from both keydown listeners firing.
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );
        // The species that landed is the one the highlighted suggestion named,
        // so this also proves the raw text was not what got submitted.
        await expect(
            page.locator("#tree-container .node-box").filter({
                hasText: /^Tyrannotitan$/,
            })
        ).toHaveCount(1);

        // A valid prefix must never be rejected as a species.
        await expect(page.locator("#input-error")).toBeHidden();
        expect(dialogs, "a dialog was raised").toEqual([]);
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
        // behind Nanotyrannus and Styracosaurus. This asserts the rendered
        // order, so it also proves `setupAutocomplete` paints what
        // `findMatches` returns; the exact ranking is pinned in
        // test/autocomplete.test.ts.
        expect((await items.allTextContents()).map((t) => t.trim())).toEqual([
            "Tyrannosaurus",
            "Tyrannotitan",
            "Nanotyrannus",
            "Styracosaurus",
            "Yutyrannus",
        ]);
    });
});
