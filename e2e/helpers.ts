import { expect, Page } from "@playwright/test";

// Shared fixtures for the browser E2E suite. See tasks/20260729-092258/DECISION.md
// for why modal state is injected via localStorage keyed off a frozen clock
// rather than the (not-yet-built) seed mode.

// Read the guesses-left counter the game renders, as a number.
async function guessesLeft(page: Page): Promise<number> {
    const text = (await page.locator("#stat-box").textContent()) ?? "";
    const match = text.match(/Guesses Left:\s*(\d+)/);
    return match ? Number(match[1]) : NaN;
}

// Type a query and submit the first suggestion, the way a player guesses.
//
// Two hazards shape this, both from `setupAutocomplete`'s blur handler, which
// hides the suggestion box on a 100ms `setTimeout` whose handle is never
// cleared (a real app defect, filed as task 20260729-130138). Clicking another
// control (the panel toggle, the hint box) and typing again inside that window
// lets the stale timer hide a list that is currently in use, and then:
//
//  - the keydown handler computes `isOpen === false` and ignores ArrowDown and
//    Enter, so keyboard selection silently does nothing; and
//  - that Enter does NOT stop there - it bubbles to the input's own keydown
//    handler (`src/game.ts`), which submits the RAW typed text. `saurus` is not
//    an exact species name, so `makeGuess` throws, an alert is raised (and auto
//    dismissed by Playwright), and `updateUI` clears the input anyway.
//
// So "the input went empty" is NOT evidence a guess landed. Two consequences:
// select by CLICKING the suggestion (its `mousedown` handler calls
// `selectAndSubmit` directly, bypassing the `isOpen` gate entirely, and never
// touches the raw-text path), and make the exit condition the counter actually
// going down. Remove all of this once 20260729-130138 is fixed.
export async function guessFirstSuggestion(
    page: Page,
    query: string
): Promise<void> {
    const input = page.locator("#player-input");
    const box = page.locator("#autocomplete-box");
    const before = await guessesLeft(page);

    await expect(async () => {
        await input.click();
        await input.fill("");
        await input.fill(query);
        // If the stale timer hid the box, this click waits for actionability,
        // times out, and the whole block is retried with a fresh render.
        await box
            .locator(".autocomplete-item")
            .first()
            .click({ timeout: 1000 });
        // Exactly one, not merely fewer: a guess always costs one, so this
        // catches a double-submit here rather than leaving it to whichever
        // caller happens to assert an exact count. Submission is synchronous
        // inside that click handler; the poll only covers the render, and its
        // own timeout keeps a genuinely lost guess from being retried (and thus
        // double-submitted) on a mere slow frame.
        await expect
            .poll(() => guessesLeft(page), { timeout: 1000 })
            .toBe(before - 1);
    }).toPass({ timeout: 10_000 });
}

// Recompute the daily storage key the app uses, inside the browser, so it is
// derived from the SAME frozen `new Date()` the app sees. Mirrors
// getTodaySeed()/gameStateKey() in src/gameState.ts and dateToSeed() in
// src/gameData.ts. Must be called after page.clock has fixed the time.
export function computeDailyKey(page: Page): Promise<string> {
    return page.evaluate(() => {
        const FIRST_DAY = new Date(2026, 0, 1);
        const msPerDay = 1000 * 60 * 60 * 24;
        const seed =
            Math.floor(
                (new Date().getTime() - FIRST_DAY.getTime()) / msPerDay
            ) + 1;
        // Mirror formatPuzzleId's modulus wrap so this stays an exact copy of
        // the app's key even at the residue-99999 edge (unreachable for daily
        // seeds, but the mirror must not silently diverge from source).
        const index = seed % Math.pow(10, 5);
        const display = (index + 1) % Math.pow(10, 5);
        return `gameState-dinosaur-#${display.toString().padStart(5, "0")}`;
    });
}

// Read the real served content graph from the browser. Uses the actual payload
// (src/jurassic/index.json copied to /jurassic/index.json) rather than a mock,
// per the repo lesson mock-fixtures-hide-real-data-defects.
export function loadContent(
    page: Page
): Promise<{ speciesIds: string[]; speciesNames: string[] }> {
    return page.evaluate(async () => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        const speciesIds = Object.keys(raw.species);
        const speciesNames = speciesIds.map((id) => raw.species[id].species);
        return { speciesIds, speciesNames };
    });
}

type FinishedGame = {
    targetId: string;
    guesses: string[];
    lastGuessId?: string;
    hintClades?: string[];
};

// Write a finished daily game into localStorage so the next load renders the
// end-of-game modal deterministically. loadGameState() reads targetId straight
// from storage, so the chosen target does not have to match the real daily pick.
export async function seedFinishedDailyGame(
    page: Page,
    game: FinishedGame
): Promise<void> {
    const key = await computeDailyKey(page);
    await page.evaluate(
        ([storageKey, payload]) => {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    targetId: payload.targetId,
                    guesses: payload.guesses,
                    lastGuessId: payload.lastGuessId,
                    hintClades: payload.hintClades ?? [],
                    createdAt: new Date().toISOString(),
                })
            );
        },
        [key, game] as const
    );
}

// Identify what is actually painted over the centre of the arena. A real hit
// test rather than a check of the `active` class, so it stays honest about what
// the CSS renders on the viewport under test - and it names the offending
// element, because "expected false, received true" does not say whether the
// panel covered the tree or the arena had not laid out yet.
export function topElementOverArena(page: Page): Promise<string> {
    return page.evaluate(() => {
        const describe = (el: Element | null) =>
            el
                ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
                      typeof el.className === "string" && el.className
                          ? `.${el.className.trim().split(/\s+/).join(".")}`
                          : ""
                  }`
                : "nothing";

        const arena = document.getElementById("arena");
        const panel = document.getElementById("info-panel");
        if (!arena || !panel) return "#arena or #info-panel is absent";

        const r = arena.getBoundingClientRect();
        const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2
        );
        const where = `${describe(top)} (panel left=${Math.round(
            panel.getBoundingClientRect().left
        )}, viewport width=${window.innerWidth})`;
        return panel.contains(top) ? `inside #info-panel -> ${where}` : where;
    });
}

// Wait until the info panel has stopped moving, so a hit test samples the state
// the player ends up looking at.
//
// Two things move it. `.info-panel` opens and closes over `transform 0.4s`, and
// the app has no extracted stylesheet (webpack.config.js pipes CSS through
// `style-loader`, injected from the JS bundle), so there is also a frame after
// load in which no `transform: translateX(105%)` has been applied yet and the
// panel still sits over `#arena`.
//
// Settling matters more than it sounds: an `expect.poll(...).not` resolves on
// the FIRST sample that satisfies it, so polling a moving panel passes on the
// opening animation's first frame and proves nothing at all.
async function waitForPanelToSettle(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                const panel = document.getElementById("info-panel");
                if (!panel) return resolve();
                const deadline = performance.now() + 3000;
                let previous = panel.getBoundingClientRect().left;
                let stableFrames = 0;
                const tick = () => {
                    const left = panel.getBoundingClientRect().left;
                    stableFrames =
                        Math.abs(left - previous) < 0.5 ? stableFrames + 1 : 0;
                    previous = left;
                    // Roughly 100ms of no movement, or give up and let the
                    // caller's assertion report whatever is actually there.
                    if (stableFrames >= 6 || performance.now() > deadline) {
                        return resolve();
                    }
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            })
    );
}

// The tree, not the panel, must be the thing painted at the centre of the play
// surface once everything has come to rest. This is the assertion that pins
// playtest findings F3.5 and F3.6 on its own: it fails whether the panel was
// opened by a class change or is merely parked over the arena by layout.
export async function expectTreeNotOccludedByPanel(page: Page): Promise<void> {
    await waitForPanelToSettle(page);
    expect(await topElementOverArena(page)).not.toContain("#info-panel");
}

// The `#open-panel` pull tab is the only route back to the info panel, so it has
// to be wholly on screen to be tappable. It used to sit at `right: -5px` with a
// `:hover` transform pushing it a further 5px out (playtest finding F3.3).
export async function expectPullTabInsideViewport(page: Page): Promise<void> {
    const tab = page.locator("#open-panel");
    await expect(tab).toBeVisible();
    const box = await tab.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

// A URL src is "structurally valid" if it is a non-empty http(s) URL. The known
// species-icon bug stores a stringified Python list ("['https://...svg']"),
// which fails this check without needing the external CDN. See DECISION.md
// choice 4 and task 20260729-092352.
export function isStructurallyValidImageSrc(src: string | null): boolean {
    if (!src) return false;
    if (src.trim().startsWith("[")) return false;
    return (
        /^https?:\/\/.+/.test(src) ||
        src.startsWith("/") ||
        src.startsWith("data:")
    );
}
