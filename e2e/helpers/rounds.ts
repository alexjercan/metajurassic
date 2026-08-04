import { expect, Page } from "@playwright/test";
import { MAX_GUESSES } from "../../src/constants";
import { guessFirstSuggestion, guessNamedSpecies } from "./guessing";
import { loadContent } from "./content";
import { waitForTreeToSettle } from "./tree";

// Played rounds, built out of the SEEDED PRACTICE ROUND rather than a
// hand-written DOM fixture, so what the assertions measure is the tree the game
// actually renders (task 20260729-092339). The tree only misbehaves once it is
// much wider than the arena, which takes a dozen guesses spread across the
// taxonomy.

// Seed 42 is the same round e2e/seed.spec.ts walks through. None of the guesses
// below is its target, so the round is still running when the fixture ends -
// `playWideTree` asserts exactly that rather than trusting it.
export const WIDE_TREE_SEED = 42;

// The same seed 42 round, guessed so that all five closeness tiers land on the
// board at once: seed 42 resolves to Camarasaurus, whose 10-clade lineage has
// real species at every rung. Coldest to hottest; derived from the shipped
// src/jurassic/index.json by running `guessTier` over every species against
// that target, so a content change that moves one of them fails in
// e2e/closeness.spec.ts and says which rung it was.
//
// Shared rather than written twice because two callers need the SAME board:
// e2e/closeness.spec.ts asserts the tiers paint apart, and
// scripts/playtest/walkthrough.ts photographs that board in greyscale as the
// evidence that they stay apart without hue (task 20260730-094852). A drifted
// copy would photograph a different board than the one under test
// (LESSONS.md: hand-copied-logic-mirrors-rot).
export const CLOSENESS_LADDER = [
    { name: "Ankylosaurus", tier: 0 }, // meets the target only at dinosauria
    { name: "Allosaurus", tier: 1 },
    { name: "Plateosaurus", tier: 2 },
    { name: "Mamenchisaurus", tier: 3 },
    { name: "Apatosaurus", tier: 4 }, // a neosauropod, like the target
];

// Twelve species covering all four branches under the root clade
// (eusaurischia, genasauria, herrerasauridae, ornithischia) at a spread of
// lineage depths, chosen to make the tree WIDE rather than deep. Derived from
// src/jurassic/index.json; if the content graph changes enough that these stop
// spanning the tree, the width assertion in `playWideTree` fails and says so.
export const WIDE_TREE_GUESSES = [
    "Ceratosaurus",
    "Edmontosaurus",
    "Herrerasaurus",
    "Heterodontosaurus",
    "Saltriovenator",
    "Pachyrhinosaurus",
    "Staurikosaurus",
    "Proceratosaurus",
    "Nodosaurus",
    "Fukuiraptor",
    "Stegosaurus",
    "Saltasaurus",
];

// Load the seeded practice round and play the wide-tree guess list. Returns the
// name of the last species guessed, which is the newest-guess anchor the
// specs assert on.
export async function playWideTree(page: Page): Promise<string> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    for (const name of WIDE_TREE_GUESSES) {
        await guessNamedSpecies(page, name);
    }

    // The round must still be running: a fixture that accidentally guessed the
    // target renders a finished board, and every geometry assertion after it
    // would be measuring the wrong screen.
    await expect(page.locator("#tree-container .node-mystery")).toHaveCount(1);

    // And the tree must actually overflow, or the assertions prove nothing
    // about the case this fixture exists for.
    await waitForTreeToSettle(page);
    const overflow = await page.evaluate(() => {
        const arena = document.getElementById("arena");
        return arena ? arena.scrollWidth / arena.clientWidth : 0;
    });
    expect(
        overflow,
        `the wide-tree fixture only reached ${overflow.toFixed(2)}x the arena width`
    ).toBeGreaterThan(1.2);

    return WIDE_TREE_GUESSES[WIDE_TREE_GUESSES.length - 1];
}

// The species name for a species id, read from the real served payload.
async function speciesNameById(page: Page, id: string): Promise<string> {
    return page.evaluate(async (speciesId) => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        return raw.species[speciesId]?.species ?? "";
    }, id);
}

// The target of the practice round currently in localStorage.
//
// Practice CANNOT be seeded the way the daily is: `src/practice.ts` always
// calls `createNewGameState` and never restores a save, so a finished round
// written into localStorage is simply ignored. The only way to reach the
// practice game-over modal is to play a round out - and the only way to know
// which species to guess is to spend one guess, which is what makes the app
// persist the state this reads. The key is found by prefix rather than
// recomputed from the seed, so the padding formula living in two places cannot
// silently drift (LESSONS.md: hand-copied-logic-mirrors-rot).
async function practiceTargetName(page: Page): Promise<string> {
    const targetId = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) =>
            k.startsWith("gameState-practice-")
        );
        if (!key) return "";
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as { targetId: string }).targetId : "";
    });
    expect(targetId, "no practice game state was persisted").not.toBe("");

    const name = await speciesNameById(page, targetId);
    expect(name, `no species named by id ${targetId}`).not.toBe("");
    return name;
}

// Play the seeded practice round to a WIN, and return the target's name.
export async function playSeededPracticeToWin(page: Page): Promise<string> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    // One guess to make the app persist the round, so the target can be read.
    // "saurus" is an interior match of many species names, so the list is
    // non-empty whatever the target is (same trick as e2e/seed.spec.ts).
    await guessFirstSuggestion(page, "saurus");
    await expect(
        page.locator("#modal-overlay"),
        "the throwaway guess hit the target, so this is not the 2-guess win it claims to be"
    ).not.toHaveClass(/active/);

    const target = await practiceTargetName(page);
    await guessNamedSpecies(page, target);

    await expect(page.locator("#modal-title")).toHaveText("You found it!");
    return target;
}

// Play the seeded practice round to a LOSS: every guess spent, none of them the
// target. The wrong guesses are taken from the served payload at run time and
// filtered against the target read after the first one, so no hand-kept list
// can rot into an accidental win.
export async function playSeededPracticeToLoss(page: Page): Promise<void> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    const { speciesNames } = await loadContent(page);
    const first = speciesNames[0];
    await guessNamedSpecies(page, first);

    const target = await practiceTargetName(page);
    expect(
        first,
        "the first guess was the target, so this round cannot lose"
    ).not.toBe(target);

    const wrong = speciesNames
        .filter((name) => name !== target && name !== first)
        .slice(0, MAX_GUESSES - 1);
    expect(
        wrong,
        `the payload has too few species to spend ${MAX_GUESSES} guesses`
    ).toHaveLength(MAX_GUESSES - 1);
    for (const name of wrong) {
        await guessNamedSpecies(page, name);
    }

    await expect(page.locator("#stat-box")).toContainText("Guesses Left: 0");
    await expect(page.locator("#modal-title")).toHaveText("Game Over");
}
