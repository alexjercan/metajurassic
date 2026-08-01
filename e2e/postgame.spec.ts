import { test, expect, Page } from "@playwright/test";
import rawGameData from "../src/jurassic/index.json";
import { MAX_GUESSES } from "../src/constants";
import { seedFinishedDailyGame, wrongGuessIds } from "./helpers/content";

// The post-game journey on the DAILY page: what the player can still do once the
// round is over. `e2e/modal.spec.ts` pins that the right modal APPEARS; this
// pins what its three actions do, that the board is closed to further guesses,
// that the hint slot has become the practice route, and that the finished round
// reaches the profile page. The journey map behind it is in
// tasks/20260729-092504/NOTES.md.
//
// `src/game.ts`'s `initGame` is imported by no unit test - the wiring is all
// DOM - so this file is the only coverage those branches have.

const RAW = rawGameData as { species: Record<string, { species: string }> };

// The ladder from e2e/share.spec.ts, so the two files describe the same round:
// against Tyrannosaurus, Stegosaurus meets it only at dinosauria, Allosaurus at
// avetheropoda, Albertosaurus at tyrannosauridae.
const TARGET = "tyrannosaurus";
const WIN_GUESSES = ["stegosaurus", "allosaurus", "albertosaurus", TARGET];

function speciesName(id: string): string {
    return RAW.species[id]?.species ?? "";
}

// Freeze the clock so the daily storage key is stable across the reload and the
// round dates as "today" for the streak, exactly as the sibling specs do.
async function openDaily(page: Page) {
    await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
    await page.goto("/");
}

async function seedAndReload(page: Page, guesses: string[]) {
    await seedFinishedDailyGame(page, {
        targetId: TARGET,
        guesses,
        lastGuessId: guesses[guesses.length - 1],
    });
    await page.reload();
    await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
}

// How many guesses the saved daily round holds. The domain counter, not the
// state of the input box: a swallowed guess empties the input too, so cleared
// state is never evidence (LESSONS.md
// side-effect-cleared-state-is-not-proof-of-success).
async function savedGuessCount(page: Page): Promise<number> {
    return page.evaluate(() => {
        const key = Object.keys(localStorage).find(
            (k) => k.startsWith("gameState-") && !k.includes("practice")
        );
        if (!key) return -1;
        const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as {
            guesses?: string[];
        };
        return raw.guesses?.length ?? -1;
    });
}

test.describe("post-game daily journey after a win", () => {
    test.beforeEach(async ({ page }) => {
        await openDaily(page);
        await seedAndReload(page, WIN_GUESSES);
    });

    test("the input is closed and takes no further guess", async ({ page }) => {
        const input = page.locator("#player-input");

        // The visible half, and the one a single deleted line falsifies: drop
        // `playerInput.disabled = true` from `disableInput()` and this reddens.
        await expect(input).toBeDisabled();
        await expect(input).toHaveAttribute("placeholder", "");
        // `disableInput` also hides the suggestion box, but asserting that HERE
        // could not fail: `.autocomplete-box` is `display: none` in the
        // stylesheet and this fixture reloads into a finished round, so the box
        // was never open. The test below opens it on a live round first, which
        // is the only way to tell the stylesheet's hiding from the game's.

        // The outcome half. A disabled input cannot be focused, so the Enter is
        // dispatched synthetically - a real player has no way in at all, which
        // is the point. Note this outcome is defended TWICE (the `disabled`
        // early-return in the keydown handler, and `submitGuess`'s own
        // game-over early-return), so it survives removing either one: it pins
        // the guarantee, while the assertion above pins the mechanism.
        const before = await savedGuessCount(page);
        expect(before).toBe(WIN_GUESSES.length);

        const unplayed = speciesName("triceratops");
        expect(WIN_GUESSES).not.toContain("triceratops");
        await page.evaluate((name) => {
            const el = document.getElementById(
                "player-input"
            ) as HTMLInputElement;
            el.value = name;
            el.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
            );
        }, unplayed);

        await expect.poll(() => savedGuessCount(page)).toBe(WIN_GUESSES.length);
        await expect(
            page
                .locator("#tree-container .node-box")
                .filter({ hasText: new RegExp(`^${unplayed}$`) })
        ).toHaveCount(0);
    });

    test("all three next-step actions are offered", async ({ page }) => {
        const actions = page.locator(".modal-actions > *");
        await expect(actions).toHaveCount(3);

        await expect(page.locator("#modal-close-btn")).toBeEnabled();
        await expect(page.locator(".modal-btn-practice")).toBeVisible();
        await expect(page.locator("#modal-share-btn")).toBeEnabled();
    });

    test("OK dismisses the modal and leaves the board readable", async ({
        page,
    }) => {
        const overlay = page.locator("#modal-overlay");
        await page.locator("#modal-close-btn").click();

        await expect(overlay).not.toHaveClass(/active/);
        // The round stays on screen behind it - the tree is what a player reads
        // after closing, and the guessed species are still painted on it.
        await expect(
            page.locator("#tree-container .node-box").first()
        ).toBeVisible();
        await expect(
            page
                .locator("#tree-container .node-box")
                .filter({ hasText: new RegExp(`^${speciesName(TARGET)}$`) })
        ).toHaveCount(1);
    });

    test("the hint slot has become the practice route, not a dead hint", async ({
        page,
    }) => {
        await page.locator("#modal-close-btn").click();

        const chip = page.locator("#hint-box");
        // Promoted, not greyed out: `updateHintButton` drops `.disabled` and
        // adds `.practice` at game over. This is the step-3 question in
        // TASK.md - a player cannot read it as a disabled hint, because no hint
        // wording survives in it.
        await expect(chip).toHaveClass(/practice/);
        await expect(chip).not.toHaveClass(/disabled/);

        const text = (await page.locator("#hint-text").textContent()) ?? "";
        expect(text.trim()).toBe("Practice");
        expect(text).not.toMatch(/hint/i);

        const link = page.locator("#hint-text a");
        await expect(link).toHaveAttribute("href", /practice$/);

        // And it is a route a player can actually take, not just an href:
        // `.hint-box.disabled` sets `pointer-events: none`, so "reachable" is a
        // separate property from "has a link".
        await link.click();
        await page.waitForURL(/\/practice\/?$/);
        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${MAX_GUESSES}`
        );
    });

    test("the Practice action opens a playable practice round", async ({
        page,
    }) => {
        await page.locator(".modal-btn-practice").click();

        // The URL first. Asserting the counter straight after a click that
        // NAVIGATES can match the document being navigated away from
        // (LESSONS.md a-mutation-must-reach-the-branch-it-claims-to-test).
        await page.waitForURL(/\/practice\/?$/);
        await expect(page.locator("#stat-box")).toContainText(
            `Guesses Left: ${MAX_GUESSES}`
        );
        // A playable round, not the finished one carried across: the practice
        // page opens with no game-over modal and an input that accepts a guess.
        await expect(page.locator("#modal-overlay")).not.toHaveClass(/active/);
        await expect(page.locator("#player-input")).toBeEnabled();
    });

    test("the finished round shows up on the profile page", async ({
        page,
    }) => {
        await page.goto("/profile/");

        // The retention payoff leg: the same storage the round was saved to is
        // what `computeGameStats` reads for the profile, so a win banked here
        // must be visible there without any further action.
        await expect(page.locator("#games-played-daily")).toHaveText("1");
        await expect(page.locator("#total-wins-daily")).toHaveText("1");
        await expect(page.locator("#total-losses-daily")).toHaveText("0");
        await expect(page.locator("#current-streak-daily")).toHaveText("1");
        await expect(page.locator("#win-rate-daily")).toHaveText("100%");
        await expect(page.locator("#avg-guesses-daily")).toHaveText(
            WIN_GUESSES.length.toFixed(1)
        );
        // Every species guessed is a dinosaur discovered, including the target.
        await expect(page.locator("#unique-dinos-daily")).toHaveText(
            `${WIN_GUESSES.length}/${Object.keys(RAW.species).length}`
        );
    });
});

test.describe("the round ending in-page", () => {
    // The one path no other spec here drives: the round ending from a LIVE
    // board, with the suggestion list open, rather than being reloaded as an
    // already-finished game.
    //
    // Note what this does and does not pin. The list being closed afterwards is
    // guaranteed TWICE, and the stronger of the two is not `disableInput()`:
    // `selectAndSubmit` hides the box itself before it ever calls back into the
    // game (src/ui/autocomplete.ts:67), and the blur handler arms a 100ms hide
    // for the click-away case. So `disableInput`'s own
    // `autocompleteBox.style.display = "none"` is redundant on every reachable
    // path - deleting it leaves this test green, which was checked, not assumed
    // (see NOTES.md, mutation E2). This test pins the player-visible guarantee -
    // last guess in, board closed, list gone, modal up - and the task record
    // says plainly that the redundant line is not pinned by anything.
    test("the last guess ends the round in-page, closing the input and the list", async ({
        page,
    }) => {
        await openDaily(page);
        const wrong = await wrongGuessIds(page, TARGET);

        // One guess left: the round is LIVE.
        await seedFinishedDailyGame(page, {
            targetId: TARGET,
            guesses: wrong.slice(0, MAX_GUESSES - 1),
            lastGuessId: wrong[MAX_GUESSES - 2],
        });
        await page.reload();
        await expect(page.locator("#modal-overlay")).not.toHaveClass(/active/);
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 1"
        );

        const input = page.locator("#player-input");
        const box = page.locator("#autocomplete-box");
        const last = speciesName(wrong[MAX_GUESSES - 1]);
        expect(last).not.toBe("");

        await input.click();
        await input.fill(last);
        await expect(box.locator(".autocomplete-item").first()).toBeVisible();
        await expect(box).toBeVisible();

        await input.press("Enter");

        await expect(page.locator("#modal-title")).toHaveText("Game Over");
        await expect(box).toBeHidden();
        await expect(input).toBeDisabled();
    });
});

test.describe("post-game daily journey after a loss", () => {
    async function seedLoss(page: Page): Promise<string[]> {
        const wrong = await wrongGuessIds(page, TARGET);
        await seedAndReload(page, wrong);
        return wrong;
    }

    test.beforeEach(async ({ page }) => {
        await openDaily(page);
    });

    test("the modal names the answer and how the round ended", async ({
        page,
    }) => {
        await seedLoss(page);

        await expect(page.locator("#modal-message")).toHaveText(
            `The answer was ${speciesName(TARGET)}`
        );
        await expect(page.locator("#modal-stats")).toHaveText(
            `You used all ${MAX_GUESSES} guesses`
        );
        await expect(page.locator("#modal")).toHaveClass(/modal-loss/);
    });

    test("the board reveals the answer instead of the mystery node", async ({
        page,
    }) => {
        await seedLoss(page);
        await page.locator("#modal-close-btn").click();

        // `buildGuessTree(state, revealTarget)` renames the "?" placeholder to
        // the target's own name at game over. Both halves are asserted: the
        // revealed node exists AND no mystery node is left, because a tree that
        // rendered both would satisfy either check alone.
        const revealed = page.locator("#tree-container .node-revealed");
        await expect(revealed).toHaveCount(1);
        await expect(revealed).toHaveText(speciesName(TARGET));
        await expect(page.locator("#tree-container .node-mystery")).toHaveCount(
            0
        );
    });

    test("the same three retention actions are offered", async ({ page }) => {
        await seedLoss(page);

        // A loss is the case where practice matters most, and the modal is the
        // only exit from it.
        await expect(page.locator(".modal-actions > *")).toHaveCount(3);
        await expect(page.locator("#modal-close-btn")).toBeEnabled();
        await expect(page.locator(".modal-btn-practice")).toBeVisible();
        await expect(page.locator("#modal-share-btn")).toBeEnabled();

        await page.locator("#modal-close-btn").click();
        await expect(page.locator("#hint-box")).toHaveClass(/practice/);
        await expect(page.locator("#player-input")).toBeDisabled();
    });
});
