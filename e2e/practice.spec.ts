import { test, expect, Page } from "@playwright/test";
import rawGameData from "../src/jurassic/index.json";
import { guessNamedSpecies } from "./helpers";

// The practice round lifecycle, driven through the real screen: a reload brings
// the round back, starting a new one is an explicit mid-round action, and a
// round the player FINISHED survives as a practice stat.
//
// The persistence specs play an UNSEEDED round on purpose. `?seed=N`
// reconstructs the target from the seed on every load, so a seeded round LOOKS
// like it survives a reload even when nothing is restored - which is exactly
// how this bug hid from `e2e/seed.spec.ts`. Only an unseeded round can tell
// "the saved game came back" apart from "the seed rebuilt the same target".
// See tasks/20260729-101754.

// The shipped payload, used to turn a saved ID back into the name the board
// paints and to pick guesses that cannot end a round by accident. Read from the
// REAL content graph rather than a fixture, per LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`.
const RAW = rawGameData as {
    species: Record<string, { species: string }>;
};

function speciesName(id: string): string {
    return RAW.species[id]?.species ?? "";
}

const ALL_SPECIES = Object.values(RAW.species).map((s) => s.species);

interface SavedRound {
    key: string;
    targetId: string;
    guesses: string[];
}

// Every `gameState-practice-*` key currently on disk.
function practiceKeys(page: Page): Promise<string[]> {
    return page.evaluate(() =>
        Object.keys(localStorage)
            .filter((k) => k.startsWith("gameState-practice-"))
            .sort()
    );
}

function pointer(page: Page): Promise<string | null> {
    return page.evaluate(() => localStorage.getItem("practice-current"));
}

function rawRound(page: Page, key: string): Promise<string | null> {
    return page.evaluate((k) => localStorage.getItem(k), key);
}

// The single saved practice round. Asserts there is exactly one rather than
// picking the first of several: a spec that has quietly accumulated two rounds
// would otherwise read whichever the key order happened to yield.
async function readOnlyRound(page: Page): Promise<SavedRound> {
    const keys = await practiceKeys(page);
    expect(keys, "expected exactly one saved practice round").toHaveLength(1);

    const raw = await rawRound(page, keys[0]);
    const parsed = JSON.parse(raw) as {
        targetId: string;
        guesses: string[];
    };

    return { key: keys[0], targetId: parsed.targetId, guesses: parsed.guesses };
}

// The game-over modal covers the whole viewport, including the top bar, so it
// has to go before anything up there can be clicked.
async function closeModal(page: Page) {
    const overlay = page.locator("#modal-overlay");
    if (await overlay.evaluate((el) => el.classList.contains("active"))) {
        await page.locator("#modal-close-btn").click();
        await expect(overlay).not.toHaveClass(/active/);
    }
}

// Open a fresh practice round and spend one guess in it, returning what was
// guessed and what the round's target turned out to be.
//
// The round is UNSEEDED, so its target is random and the opening guess could BE
// it - which would end the round and leave the spec guessing into a disabled
// input. Rather than tolerate a ~1-in-150 flake, this retries. Every LATER
// guess a spec makes is chosen against the target read here, so only the
// opening guess can end a round by accident.
//
// The retry DELETES the accidental round first. Pressing New game alone would
// not: that round is FINISHED, and a finished round is deliberately kept as a
// practice stat, so the next iteration would find two saved rounds and
// `readOnlyRound` would fail on the wrong thing entirely. The round is an
// artefact of the retry rather than something the spec played on purpose, so it
// is not a stat worth keeping here.
async function openRoundWithOneGuess(
    page: Page,
    startAt = "/practice/"
): Promise<{ guessed: string; target: string; key: string }> {
    await page.goto(startAt);
    await expect(page.locator("#stat-box")).toContainText("Guesses Left: 25");

    for (let attempt = 0; attempt < 5; attempt++) {
        const guessed = ALL_SPECIES[0];
        await guessNamedSpecies(page, guessed);

        const round = await readOnlyRound(page);
        const target = speciesName(round.targetId);
        expect(target).not.toBe("");

        if (target !== guessed) {
            return { guessed, target, key: round.key };
        }

        await page.evaluate((k) => localStorage.removeItem(k), round.key);
        await closeModal(page);
        await page.locator("#new-game-btn").click();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );
        expect(await practiceKeys(page)).toEqual([]);
    }

    throw new Error(
        "five consecutive fresh rounds all had the opening guess as their target"
    );
}

// A species that is neither the target nor already guessed, so guessing it
// spends a guess and cannot end the round.
function safeGuess(target: string, taken: string[]): string {
    const name = ALL_SPECIES.find((s) => s !== target && !taken.includes(s));
    if (!name) throw new Error("the payload has no unguessed non-target left");
    return name;
}

// Play an unseeded round through to a win. Unseeded matters: only a round the
// practice page STARTED owns the `practice-current` pointer, so this is the
// only way to exercise what happens to that pointer when a round ends.
async function winUnseededRound(page: Page): Promise<SavedRound> {
    const { target } = await openRoundWithOneGuess(page);
    await guessNamedSpecies(page, target);
    await expect(page.locator("#modal-title")).toHaveText("You found it!");

    return readOnlyRound(page);
}

test.describe("practice round persistence", () => {
    test("a reload restores the same unseeded round", async ({ page }) => {
        const { guessed, target } = await openRoundWithOneGuess(page);
        await guessNamedSpecies(page, safeGuess(target, [guessed]));
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 23"
        );

        const before = await readOnlyRound(page);
        expect(before.guesses).toHaveLength(2);

        await page.reload();

        // The round is BACK, not rebuilt: same target, same guesses, and the
        // counter still reflects the two guesses already spent.
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 23"
        );
        const after = await readOnlyRound(page);
        expect(after.key).toBe(before.key);
        expect(after.targetId).toBe(before.targetId);
        expect(after.guesses.sort()).toEqual(before.guesses.sort());
    });

    test("the restored round is the one on the board, not just in storage", async ({
        page,
    }) => {
        const { guessed } = await openRoundWithOneGuess(page);

        await page.reload();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );

        // Painted on the board, not merely counted: the restored guess is a
        // node on the tree the reload rebuilt.
        await expect(
            page
                .locator("#tree-container .node-box")
                .filter({ hasText: new RegExp(`^${guessed}$`) })
        ).toHaveCount(1);

        // And it is in the live GameState, not just the render. `findMatches`
        // drops already-guessed names, and the `isGuessed` predicate that
        // `src/game.ts` hands it reads `state.guesses` directly - so the
        // species being unofferable is a read straight through the UI into the
        // restored state, which storage holding the right bytes cannot prove.
        //
        // Absent FROM the list rather than an empty list: a species name can be
        // a substring of a longer one ("Ceratosaurus" inside
        // "Proceratosaurus"), so demanding zero suggestions would fail for
        // reasons that have nothing to do with the restore.
        const input = page.locator("#player-input");
        await input.click();
        await input.fill(guessed);
        const suggestions = await page
            .locator("#autocomplete-box .autocomplete-item")
            .allTextContents();
        expect(suggestions.map((s) => s.trim())).not.toContain(guessed);
    });

    test("New game is available mid-round and discards the round it replaces", async ({
        page,
    }) => {
        const { key } = await openRoundWithOneGuess(page);

        const newGame = page.locator("#new-game-btn");
        await expect(newGame).toBeVisible();
        await newGame.click();

        // A brand new round: full guess budget, and the abandoned UNFINISHED
        // round is gone from storage rather than left behind to accumulate.
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );
        expect(await rawRound(page, key)).toBeNull();
        expect(await practiceKeys(page)).toEqual([]);
    });

    test("the new round survives a reload too", async ({ page }) => {
        await openRoundWithOneGuess(page);
        await page.locator("#new-game-btn").click();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );

        const { target, key } = await openRoundWithOneGuess(page);

        await page.reload();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );
        const after = await readOnlyRound(page);
        expect(after.key).toBe(key);
        expect(speciesName(after.targetId)).toBe(target);
    });
});

test.describe("finished practice rounds", () => {
    test("a win stops being the current round but stays on disk", async ({
        page,
    }) => {
        const finished = await winUnseededRound(page);

        // The pointer goes the moment the round ends, so nothing holds a
        // finished game open...
        expect(await pointer(page)).toBeNull();

        // ...and a reload therefore starts something new rather than
        // re-opening the win.
        await page.reload();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );

        // The finished round is still there: it is a game played, a win, a
        // guess count and a discovered dinosaur on the profile page.
        expect(await rawRound(page, finished.key)).not.toBeNull();
    });

    test("New game after a win KEEPS the finished round", async ({ page }) => {
        // The end of every round: win, then start another. An earlier revision
        // of this branch deleted the entry here, which silently erased the
        // player's own record of the game as they played it. DECISION.md fork
        // 2 says finished rounds are kept; this is where that is decided.
        const finished = await winUnseededRound(page);

        await closeModal(page);
        await page.locator("#new-game-btn").click();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );

        const kept = await rawRound(page, finished.key);
        expect(kept).not.toBeNull();
        expect((JSON.parse(kept) as { targetId: string }).targetId).toBe(
            finished.targetId
        );
    });

    test("the modal's own new-game action keeps it too", async ({ page }) => {
        // The practice page retargets the game-over modal's Practice link onto
        // the same action, so it takes the same guarantee - and that link is
        // the one a player actually reaches for, because the modal is covering
        // the top bar when the round ends.
        const finished = await winUnseededRound(page);

        await page.locator(".modal-btn-practice").click();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );

        expect(await rawRound(page, finished.key)).not.toBeNull();
    });
});

test.describe("practice new game and seed mode", () => {
    test("New game from a seeded round starts a fresh one, not an older round", async ({
        page,
    }) => {
        // Leave a half-played unseeded round behind, so `practice-current`
        // names something resumable...
        const stale = await openRoundWithOneGuess(page);

        // ...then play a seeded round and press New game from it. Abandoning
        // the seeded round does not clear that pointer (it names a different
        // seed), so a "New game" that merely reloaded would resume the stale
        // round and hand back a game already in progress.
        await page.goto("/practice/?seed=42");
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );
        await page.locator("#new-game-btn").click();

        // Wait for the navigation FIRST. The seeded round also showed
        // "Guesses Left: 25", so asserting the counter straight after the click
        // matches the page being navigated away from and proves nothing - that
        // is exactly how an earlier version of this spec passed against a build
        // where New game resumed the stale round.
        await page.waitForURL((url) => !url.search);
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 25"
        );

        // The decisive read: the stale round's guess is NOT on this board, so
        // the round that loaded is not the one the pointer used to name.
        await expect(
            page
                .locator("#tree-container .node-box")
                .filter({ hasText: new RegExp(`^${stale.guessed}$`) })
        ).toHaveCount(0);

        // The pointer now names a round that is neither the stale one nor the
        // seeded one, and the stale round has been left behind.
        const current = await pointer(page);
        expect(current).not.toBeNull();
        expect(await practiceKeys(page)).toEqual([stale.key]);
        // Seed 42 keys as #00043 (the +1 display offset), same as in
        // e2e/seed.spec.ts. It must not have been written: the seeded round was
        // never guessed in, and New game did not adopt it either.
        expect(
            await rawRound(page, "gameState-practice-dinosaur-#00043")
        ).toBeNull();
    });

    test("the daily page ships the button inert", async ({ page }) => {
        await page.goto("/");
        // The daily and practice pages render the SAME template
        // (webpack.config.js registers src/index.html twice), so the button
        // exists in the daily DOM. `src/index.ts` never unhides it, and the
        // daily round must keep its single-puzzle-a-day meaning.
        //
        // ATTACHED is asserted first on purpose: `toBeHidden` also passes for
        // an element that does not exist, so on its own it would go green
        // against a template that never gained the button at all.
        await expect(page.locator("#new-game-btn")).toBeAttached();
        await expect(page.locator("#new-game-btn")).toBeHidden();
    });
});
