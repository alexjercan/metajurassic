// Which node a direction key moves to, and where a keyboard player starts.
//
// Kept DOM-free so Jest covers it under the default `node` environment: the
// traversal table is the hard part of the tree widget, and `src/ui/**` is
// otherwise excluded from coverage. The DOM half - roving tabindex, focus,
// scrolling - lives in `treeKeyboard.ts`. See tasks/20260803-233105/DECISION.md.

import type { CladeNode, TreeNode } from "../treeBuilder";

/**
 * Left and Right are the previous and next SIBLING, not ARIA's collapse and
 * expand: the tree is drawn transposed (children below, siblings across) and
 * has no collapsible state. Revisit this mapping if collapsing is ever added.
 */
export type NavDirection = "up" | "down" | "left" | "right" | "home" | "end";

/** The node with this id, at any depth, or null if the forest has no such node. */
export function findNode(roots: CladeNode[], id: string): TreeNode | null {
    for (const root of roots) {
        const found = findIn(root, id);
        if (found) return found;
    }
    return null;
}

function findIn(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findIn(child, id);
        if (found) return found;
    }
    return null;
}

/**
 * The node a direction key moves focus to, or null when there is nowhere to go
 * - off the end of a sibling row, above a root, below a leaf, or from an id the
 * last render no longer draws. Null means "stay put", never "wrap".
 */
export function nextNodeId(
    roots: CladeNode[],
    currentId: string,
    direction: NavDirection
): string | null {
    const current = findNode(roots, currentId);
    if (!current) return null;
    if (direction === "down") return current.children[0]?.id ?? null;
    // The parent has to be a node the forest actually holds, for the same
    // reason the sibling branch below checks: a `parentId` naming a node that
    // is not there would hand back an id nothing draws.
    if (direction === "up")
        return current.parentId && findNode(roots, current.parentId)
            ? current.parentId
            : null;

    const siblings = siblingsOf(roots, current);
    const index = siblings.findIndex((node) => node.id === current.id);
    // A `parentId` naming a node the forest does not hold: report no sibling
    // rather than fall back to the roots, which would teleport focus.
    if (index < 0) return null;

    switch (direction) {
        case "left":
            return siblings[index - 1]?.id ?? null;
        case "right":
            return siblings[index + 1]?.id ?? null;
        case "home":
            return siblings[0].id;
        case "end":
            return siblings[siblings.length - 1].id;
    }
}

function siblingsOf(roots: CladeNode[], node: TreeNode): TreeNode[] {
    if (!node.parentId) return roots;
    const parent = findNode(roots, node.parentId);
    return parent ? parent.children : [];
}

/**
 * Where focus starts on a board the player has not moved around yet: the
 * target's node, which is what the board is about and what the arena is already
 * anchored on (`pickScrollAnchor` in treeScroll.ts selects the same node from
 * the DOM). Falls back to the first root, and to null for an empty forest.
 */
export function defaultNodeId(roots: CladeNode[]): string | null {
    return findTarget(roots)?.id ?? roots[0]?.id ?? null;
}

function findTarget(nodes: TreeNode[]): TreeNode | null {
    for (const node of nodes) {
        if (node.type === "species" && node.isTarget) return node;
        const found = findTarget(node.children);
        if (found) return found;
    }
    return null;
}
