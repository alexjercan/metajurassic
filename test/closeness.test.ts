import { GameState } from "../src/gameState";
import {
    CLOSENESS_CELLS,
    formatGameStateForSharing,
} from "../src/shareText";
import { CLOSENESS_TIER_COUNT, closenessTier } from "../src/closeness";
import {
    buildGuessTree,
    isSpeciesNode,
    type SpeciesNode,
    type TreeNode,
} from "../src/treeBuilder";
import { buildGameData } from "../src/jsonLoader";
import { readFileSync } from "fs";
import { join } from "path";
import rawGameData from "../src/jurassic/index.json";

// The whole point of this task is that the board and the pasted share grid
// speak ONE closeness language, so these run against the REAL content graph
// (`src/jurassic/index.json`) rather than a fixture: a fixture tree would only
// prove the arithmetic agrees with itself. See LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`.
const data = buildGameData(rawGameData);

const TARGET = "tyrannosaurus";

// The same ladder test/share.test.ts pins the grid against: five real species
// whose LCA with Tyrannosaurus sits at a different depth in its 14-clade
// lineage, one per tier. Kept as names only - the tier each one lands in is
// what the tests below DERIVE, not what they restate.
const LADDER = [
    "Stegosaurus",
    "Brachiosaurus",
    "Allosaurus",
    "Guanlong",
    "Albertosaurus",
];

function idFor(name: string): string {
    const species = data.findSpeciesByName(name);
    if (!species) throw new Error(`test fixture species missing: ${name}`);
    return species.id;
}

function playedGame(guessNames: string[]): GameState {
    return new GameState(data, TARGET, new Set(guessNames.map(idFor)));
}

// Every species node in the tree, flattened, keyed by species id.
function speciesNodes(roots: TreeNode[]): Map<string, SpeciesNode> {
    const found = new Map<string, SpeciesNode>();
    const walk = (node: TreeNode): void => {
        if (isSpeciesNode(node)) found.set(node.speciesId, node);
        node.children.forEach(walk);
    };
    roots.forEach(walk);
    return found;
}

// The node the tree drew for a species, or a failure that names it rather than
// an `undefined is not an object` three lines later.
function nodeFor(roots: TreeNode[], speciesId: string): SpeciesNode {
    const node = speciesNodes(roots).get(speciesId);
    if (!node) throw new Error(`no node was drawn for ${speciesId}`);
    return node;
}

// The grid is the third line of the share message: header, sentence, grid.
// Split by code POINT, not by `.split("")` - the cells are astral-plane emoji
// and UTF-16 code units would cut them in half.
function gridCells(state: GameState): string[] {
    return [
        ...formatGameStateForSharing(state, { mode: "daily", seed: 1 }).split(
            "\n"
        )[2],
    ];
}

describe("tree closeness tiers", () => {
    test("a guessed node's tier indexes the same cell the share grid prints", () => {
        // The winning guess goes last so the grid's cells line up with the
        // ladder; `Set` preserves insertion order.
        const state = playedGame([...LADDER, "Tyrannosaurus"]);
        const roots = buildGuessTree(state);
        const cells = gridCells(state);

        // Named per species, so a guess drawn with no tier at all reports
        // WHICH one rather than an undefined halfway down the comparison.
        const tiers = Object.fromEntries(
            LADDER.map((name) => [
                name,
                nodeFor(roots, idFor(name)).closenessTier,
            ])
        );
        expect(tiers).toEqual(
            Object.fromEntries(LADDER.map((name) => [name, expect.any(Number)]))
        );

        const boardCells = LADDER.map(
            (name) => CLOSENESS_CELLS[tiers[name] ?? -1]
        );

        // The ladder's guesses come first in the grid; the winning 🦖 is last.
        expect(boardCells).toEqual(cells.slice(0, LADDER.length));
    });

    test("the ladder walks the scale from coldest to hottest", () => {
        // Without this the parity test above could pass with all five guesses
        // sharing one tier, proving nothing about the scale.
        //
        // It asserts the EXACT tiers rather than "five distinct ascending
        // values", and that difference is load-bearing: a uniform drift
        // (`guessTier(...) - 1` in buildGuessTree, say) still yields five
        // distinct ascending values, so the weaker form let it through - and
        // an off-the-end tier has no `.node-close-N` rule, so it renders as an
        // unstyled node. Exact indices catch both.
        const roots = buildGuessTree(playedGame(LADDER));
        const tiers = LADDER.map(
            (name) => nodeFor(roots, idFor(name)).closenessTier
        );

        expect(tiers).toEqual(
            Array.from({ length: CLOSENESS_TIER_COUNT }, (_, tier) => tier)
        );
        expect(LADDER).toHaveLength(CLOSENESS_TIER_COUNT);
    });

    test("one scale: a cell exists for every tier", () => {
        expect(CLOSENESS_CELLS).toHaveLength(CLOSENESS_TIER_COUNT);
    });

    test("closenessTier stays inside the scale for out-of-range input", () => {
        expect(closenessTier(-1)).toBe(0);
        expect(closenessTier(0)).toBe(0);
        expect(closenessTier(1)).toBe(CLOSENESS_TIER_COUNT - 1);
        expect(closenessTier(99)).toBe(CLOSENESS_TIER_COUNT - 1);
    });
});

describe("the target's node carries no temperature", () => {
    // The share grid spends 🦖 on the correct guess rather than a tier, so the
    // board agrees by giving the target's node no closeness class in ANY of its
    // three states. The gold winner and the red mystery are its own encodings
    // and must not read as points on the warm/cold scale.
    const targetNode = (state: GameState, revealTarget: boolean) =>
        nodeFor(buildGuessTree(state, revealTarget), TARGET);

    test("the unsolved placeholder has no tier", () => {
        const node = targetNode(playedGame(["Stegosaurus"]), false);
        expect(node.name).toBe("?");
        expect(node.closenessTier).toBeUndefined();
    });

    test("the winning node has no tier", () => {
        const node = targetNode(
            playedGame(["Stegosaurus", "Tyrannosaurus"]),
            true
        );
        expect(node.closenessTier).toBeUndefined();
    });

    test("the revealed node after a loss has no tier", () => {
        // A loss reveals the target without it ever having been guessed.
        const node = targetNode(playedGame(["Stegosaurus"]), true);
        expect(node.closenessTier).toBeUndefined();
    });
});

describe("the stylesheet covers the scale", () => {
    // The tier index is only half the feature; a tier with no rule renders as
    // an unstyled node, which looks like a bug rather than a cold guess. This
    // reads the shipped stylesheet so adding a sixth tier without its colour
    // fails here instead of in someone's browser.
    const css = readFileSync(join(__dirname, "..", "src", "style.css"), "utf8");

    test.each(Array.from({ length: CLOSENESS_TIER_COUNT }, (_, tier) => tier))(
        "tier %i has a .node-close rule",
        (tier) => {
            expect(css).toMatch(new RegExp(`\\.node-close-${tier}\\b`));
        }
    );
});
