import { expect, Page } from "@playwright/test";

// Read the guesses-left counter the game renders, as a number.
async function guessesLeft(page: Page): Promise<number> {
    const text = (await page.locator("#stat-box").textContent()) ?? "";
    const match = text.match(/Guesses Left:\s*(\d+)/);
    return match ? Number(match[1]) : NaN;
}

// Type a query and submit the first suggestion, the way a player guesses:
// keyboard all the way through.
//
// This used to retry the whole type-and-submit and select by CLICKING, to work
// around `setupAutocomplete` hiding the box on an uncancelled 100ms timer -
// a stale timer could hide a live list, and the swallowed Enter then reached
// `src/game.ts` and submitted the raw typed text. 20260729-130138 fixed both
// halves, so the plain keyboard path is reliable again.
//
// What survives from that episode is the exit assertion. "The input went empty"
// was never evidence a guess landed, because the failure path empties it too,
// so the counter is what gets asserted - and EXACTLY one, not merely fewer,
// which is what would catch a double submit from both keydown listeners firing.
export async function guessFirstSuggestion(
    page: Page,
    query: string
): Promise<void> {
    const input = page.locator("#player-input");
    const box = page.locator("#autocomplete-box");
    const before = await guessesLeft(page);

    await input.click();
    await input.fill("");
    await input.fill(query);
    await expect(box.locator(".autocomplete-item").first()).toBeVisible();
    await input.press("Enter");

    await expect.poll(() => guessesLeft(page)).toBe(before - 1);
}

// Submit one named species. Distinct from `guessFirstSuggestion`, which takes
// whatever ranks first: here the species is chosen by EXACT item text. Prefix
// matches now outrank interior ones (task 20260729-141427), so typing
// "Ceratosaurus" does put it ahead of "Proceratosaurus" - but ranking is not a
// guarantee of uniqueness, and one species name can still be a prefix of
// another. A fixture that silently guesses a different animal is not a fixture,
// so it stays pinned to the exact text.
export async function guessNamedSpecies(
    page: Page,
    name: string
): Promise<void> {
    const input = page.locator("#player-input");
    const item = page
        .locator("#autocomplete-box .autocomplete-item")
        .filter({ hasText: new RegExp(`^${name}$`) });
    const before = await guessesLeft(page);

    await input.click();
    await input.fill("");
    await input.fill(name);
    // Click, not Enter: this helper's whole point is picking one UNAMBIGUOUS
    // species, and only the click can target an item by its exact text. Enter
    // takes whatever is highlighted, which is a ranking question, not an
    // identity one. (The retry loop that used to wrap this was the
    // 20260729-130138 blur-timer workaround, and is gone with the defect.)
    await item.click();
    await expect.poll(() => guessesLeft(page)).toBe(before - 1);

    // The tree draws every guessed species, so this proves the species that
    // landed is the one asked for and not a substring neighbour.
    await expect(
        page.locator("#tree-container .node-box").filter({
            hasText: new RegExp(`^${name}$`),
        })
    ).toHaveCount(1);
}
