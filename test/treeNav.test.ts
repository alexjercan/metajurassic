import { buildGuessTree } from "../src/treeBuilder";
import type { CladeNode } from "../src/treeBuilder";
import { defaultNodeId, findNode, nextNodeId } from "../src/ui/treeNav";
import { makeState } from "./treeFixtures";

// The board the traversal is walked over is built by the real `buildGuessTree`
// from the synthetic fixture, not hand-written, so the shape under test is one
// the renderer can actually be handed:
//
//   clade-cladea
//     clade-cladeb
//       species-species1    a guess
//       species-species2    the target, still a placeholder
//     clade-cladee
//       species-species3    a guess
//       species-species4    a guess
const roots = buildGuessTree(
    makeState("species2", ["species1", "species3", "species4"])
);

const ROOT = "clade-cladea";
const LEFT_CLADE = "clade-cladeb";
const RIGHT_CLADE = "clade-cladee";
const GUESS = "species-species1";
const TARGET = "species-species2";
const RIGHT_FIRST = "species-species3";
const RIGHT_LAST = "species-species4";

describe("the fixture board", () => {
    // Every assertion below names ids in this shape, so the shape is pinned
    // once here rather than assumed five times. A content or builder change
    // that reshapes it fails HERE, saying so, instead of failing as a
    // traversal bug.
    test("has the shape the traversal tests assume", () => {
        const ids = (nodes: { id: string }[]) => nodes.map((n) => n.id);
        expect(ids(roots)).toEqual([ROOT]);
        expect(ids(roots[0].children)).toEqual([LEFT_CLADE, RIGHT_CLADE]);
        expect(ids(roots[0].children[0].children)).toEqual([GUESS, TARGET]);
        expect(ids(roots[0].children[1].children)).toEqual([
            RIGHT_FIRST,
            RIGHT_LAST,
        ]);
    });
});

describe("nextNodeId", () => {
    test("down is the first child, and nothing at a leaf", () => {
        expect(nextNodeId(roots, ROOT, "down")).toBe(LEFT_CLADE);
        expect(nextNodeId(roots, RIGHT_CLADE, "down")).toBe(RIGHT_FIRST);
        expect(nextNodeId(roots, TARGET, "down")).toBeNull();
    });

    test("up is the parent, and nothing at a root", () => {
        expect(nextNodeId(roots, TARGET, "up")).toBe(LEFT_CLADE);
        expect(nextNodeId(roots, LEFT_CLADE, "up")).toBe(ROOT);
        expect(nextNodeId(roots, ROOT, "up")).toBeNull();
    });

    test("left and right are the siblings, and nothing off either end", () => {
        expect(nextNodeId(roots, LEFT_CLADE, "right")).toBe(RIGHT_CLADE);
        expect(nextNodeId(roots, RIGHT_CLADE, "left")).toBe(LEFT_CLADE);
        expect(nextNodeId(roots, LEFT_CLADE, "left")).toBeNull();
        expect(nextNodeId(roots, RIGHT_CLADE, "right")).toBeNull();
    });

    test("a sideways move stays among one parent's children", () => {
        // Not the previous/next node in document order: species-species2 and
        // species-species3 are adjacent when the tree is flattened, and are in
        // different subtrees.
        expect(nextNodeId(roots, TARGET, "right")).toBeNull();
        expect(nextNodeId(roots, RIGHT_FIRST, "left")).toBeNull();
    });

    test("home and end are the first and last sibling", () => {
        expect(nextNodeId(roots, TARGET, "home")).toBe(GUESS);
        expect(nextNodeId(roots, GUESS, "end")).toBe(TARGET);
    });

    test("home and end on an only child are that child", () => {
        // The single root is the only-child case that always exists. Returning
        // null here instead would make Home/End dead keys on a fresh board.
        expect(nextNodeId(roots, ROOT, "home")).toBe(ROOT);
        expect(nextNodeId(roots, ROOT, "end")).toBe(ROOT);
    });

    test("an unknown id moves nowhere", () => {
        // The id comes off the DOM, so a stale one is reachable: a key pressed
        // on a node the last render removed must not throw or guess.
        expect(nextNodeId(roots, "species-nonesuch", "up")).toBeNull();
        expect(nextNodeId(roots, "species-nonesuch", "down")).toBeNull();
        expect(nextNodeId(roots, "species-nonesuch", "home")).toBeNull();
    });

    test("a node whose parent is missing has nowhere to go", () => {
        // `parentId` is a plain string, so a malformed forest can name a node
        // that is not there. The sideways moves must report no sibling rather
        // than fall back to the roots, which would teleport focus, and `up`
        // must not hand back an id nothing draws.
        const orphaned: CladeNode[] = [
            {
                id: "clade-orphan",
                name: "Orphan",
                type: "clade",
                cladeId: "orphan",
                parentId: "clade-missing",
                children: [],
            },
        ];
        expect(nextNodeId(orphaned, "clade-orphan", "up")).toBeNull();
        expect(nextNodeId(orphaned, "clade-orphan", "left")).toBeNull();
        expect(nextNodeId(orphaned, "clade-orphan", "right")).toBeNull();
        expect(nextNodeId(orphaned, "clade-orphan", "home")).toBeNull();
        expect(nextNodeId(orphaned, "clade-orphan", "end")).toBeNull();
    });
});

describe("findNode", () => {
    test("finds a node at any depth and nothing for an unknown id", () => {
        expect(findNode(roots, ROOT)?.name).toBe("CladeA");
        expect(findNode(roots, TARGET)?.id).toBe(TARGET);
        expect(findNode(roots, "species-nonesuch")).toBeNull();
    });
});

describe("defaultNodeId", () => {
    test("is the target's node", () => {
        // The target is what the board is about and what the arena is already
        // anchored on, so it is where a keyboard player starts.
        expect(defaultNodeId(roots)).toBe(TARGET);
    });

    test("falls back to the first root when no target is drawn", () => {
        const targetless: CladeNode[] = [
            {
                id: "clade-first",
                name: "First",
                type: "clade",
                cladeId: "first",
                children: [],
            },
            {
                id: "clade-second",
                name: "Second",
                type: "clade",
                cladeId: "second",
                children: [],
            },
        ];
        expect(defaultNodeId(targetless)).toBe("clade-first");
    });

    test("is nothing for an empty forest", () => {
        // `buildGuessTree` returns [] when the target's species or lineage is
        // missing, and `renderTree` is called with whatever it returns.
        expect(defaultNodeId([])).toBeNull();
    });
});
