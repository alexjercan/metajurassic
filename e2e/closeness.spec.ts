import { test, expect } from "@playwright/test";
import { guessNamedSpecies, treeNode, WIDE_TREE_SEED } from "./helpers";

// The board says warmer/colder (task 20260729-182255). Jest pins the TIER a
// guess earns, over the real content graph; what only a browser can prove is
// that the tier reaches the DOM as a class AND that the class actually repaints
// the node - `.node-close-*` and `.node-species` match at the same specificity,
// so the whole feature hangs on stylesheet ORDER, which no unit test sees.

// Seed 42 (the practice seed the wide-tree specs already use) resolves to
// Struthiomimus, whose 11-clade lineage has real species in all five tiers.
// This ladder runs coldest to hottest; derived from the shipped
// src/jurassic/index.json by running `guessTier` over every species against
// that target, so a content change that moves one of them fails here and says
// which rung it was.
const LADDER = [
    { name: "Stegosaurus", tier: 0 }, // meets the target only at dinosauria
    { name: "Apatosaurus", tier: 1 },
    { name: "Ceratosaurus", tier: 2 },
    { name: "Yutyrannus", tier: 3 },
    { name: "Gallimimus", tier: 4 }, // an ornithomimid, like the target
];

// The classes on a node box, as the browser has them.
async function classesOf(
    page: import("@playwright/test").Page,
    name: string
): Promise<string[]> {
    const raw = (await treeNode(page, name).getAttribute("class")) ?? "";
    return raw.trim().split(/\s+/);
}

test.describe("the tree is coloured by guess closeness", () => {
    test("guesses of different closeness paint differently", async ({
        page,
    }) => {
        await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
        await page.waitForSelector("#tree-container .node-box");

        for (const { name } of LADDER) {
            await guessNamedSpecies(page, name);
        }

        // The round must still be running - a fixture that guessed the target
        // renders a finished board with no mystery node to check.
        await expect(page.locator("#tree-container .node-mystery")).toBeVisible(
            { timeout: 5000 }
        );

        // 1. Each guess carries its tier, and exactly one tier.
        for (const { name, tier } of LADDER) {
            const classes = await classesOf(page, name);
            const closeness = classes.filter((c) =>
                c.startsWith("node-close-")
            );
            expect(closeness, `${name} should carry exactly one tier`).toEqual([
                `node-close-${tier}`,
            ]);
        }

        // 2. The classes actually PAINT, and paint five different things. This
        //    is the assertion the stylesheet order has to survive: with the
        //    `.node-close-*` block written before `.node-species` instead of
        //    after it, every one of these reads back as the same species blue
        //    and the set collapses to one.
        const borders = await Promise.all(
            LADDER.map(({ name }) =>
                treeNode(page, name).evaluate(
                    (el) => getComputedStyle(el).borderTopColor
                )
            )
        );
        expect(
            new Set(borders).size,
            `the five tiers painted ${JSON.stringify(borders)}`
        ).toBe(LADDER.length);

        // 3. The target's node is the answer, not a temperature: the mystery
        //    placeholder never joins the scale.
        const mysteryClasses =
            (await page
                .locator("#tree-container .node-mystery")
                .getAttribute("class")) ?? "";
        expect(mysteryClasses).not.toMatch(/node-close-/);
    });
});
