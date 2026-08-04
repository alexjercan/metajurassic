// The DOM half of the tree widget: which item is the board's single tab stop,
// what the direction keys do to focus, and how the tab stop survives the
// `innerHTML` wipe every guess causes. The traversal table itself is in the
// DOM-free `treeNav.ts`. See tasks/20260803-233105/DECISION.md.

import type { CladeNode, TreeNode } from "../treeBuilder";
import type { NavDirection } from "./treeNav";
import { defaultNodeId, findNode, nextNodeId } from "./treeNav";

type NodeSelectHandler = (node: TreeNode) => void;

const KEY_DIRECTIONS: Record<string, NavDirection> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Home: "home",
    End: "end",
};

// The node the player is standing on: the item that takes `tabindex="0"`, and
// the id the tab stop is restored to after the wipe every guess causes.
let rememberedNodeId: string | null = null;

// The board the mounted listeners read, refreshed on every render. They are
// attached once per container, the same shape as `laidOutContainer` in
// treeScroll.ts: the container element outlives the nodes inside it, so
// re-attaching per render would stack a listener per guess.
let mountedContainer: HTMLElement | null = null;
let mountedRoots: CladeNode[] = [];
let mountedOnSelect: NodeSelectHandler | undefined;

function itemFor(container: HTMLElement, nodeId: string): HTMLElement | null {
    return (
        [...container.querySelectorAll<HTMLElement>("[data-node-id]")].find(
            (item) => item.dataset.nodeId === nodeId
        ) ?? null
    );
}

function moveTabStop(container: HTMLElement, item: HTMLElement): void {
    for (const other of container.querySelectorAll<HTMLElement>(
        "[data-node-id]"
    )) {
        other.tabIndex = other === item ? 0 : -1;
    }
    rememberedNodeId = item.dataset.nodeId ?? null;
}

function onKeyDown(event: KeyboardEvent): void {
    const container = mountedContainer;
    if (!container) return;
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-node-id]"
    );
    const nodeId = item?.dataset.nodeId;
    if (!item || !nodeId) return;

    // A widget that claims its keys unconditionally swallows the browser's own
    // chords: Alt+ArrowLeft is Back, Ctrl+Home is document-start. None of the
    // six directions nor Enter/Space means anything here with a modifier down.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
        // Claimed whether or not the move lands: at the edges of the tree the
        // key means "stay here", and letting it through would scroll the arena
        // out from under a player who is already at the end of a row.
        event.preventDefault();
        const targetId = nextNodeId(mountedRoots, nodeId, direction);
        if (!targetId) return;
        const target = itemFor(container, targetId);
        if (!target) return;
        moveTabStop(container, target);
        target.focus();
        // The one place the widget scrolls, and it is user-driven, long after
        // the `popIn` keyframe whose mid-flight geometry treeScroll.ts is
        // careful to avoid measuring.
        //
        // The BOX, not the `li`: an `li`'s box spans its whole SUBTREE, so
        // scrolling the item frames the subtree's edge rather than the node the
        // player is looking at. Measured on the wide board, arrowing to the
        // root: 34px of horizontal difference, both landing legally.
        const box = target.querySelector(":scope > .node-box") ?? target;
        box.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        // Space's default is to scroll the page, so it is claimed even when the
        // node turns out to be inert.
        event.preventDefault();
        // `.node-mystery` sets `pointer-events: none`, which stops a pointer
        // and nothing else; the keyboard needs its own guard.
        if (item.getAttribute("aria-disabled") === "true") return;
        const node = findNode(mountedRoots, nodeId);
        if (node) mountedOnSelect?.(node);
    }
}

function onFocusIn(event: FocusEvent): void {
    const container = mountedContainer;
    if (!container) return;
    // A pointer click never reaches `onKeyDown`, and the browser focuses the
    // nearest focusable ancestor - the `li`. Without this the roving
    // `tabindex` stays on whatever node the arrows last visited, so Tab comes
    // back somewhere the player has not been.
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-node-id]"
    );
    if (item) moveTabStop(container, item);
}

/**
 * Hand a freshly rendered tree to the keyboard machinery: resolve the board's
 * single tab stop and attach the delegated listeners.
 */
export function mountTreeKeyboard(
    container: HTMLElement,
    roots: CladeNode[],
    onSelect?: NodeSelectHandler
): void {
    mountedRoots = roots;
    mountedOnSelect = onSelect;
    if (mountedContainer !== container) {
        mountedContainer = container;
        container.addEventListener("keydown", onKeyDown);
        container.addEventListener("focusin", onFocusIn);
    }

    const items = [
        ...container.querySelectorAll<HTMLElement>("[data-node-id]"),
    ];
    if (items.length === 0) return;

    const fallbackId = defaultNodeId(roots);
    const stop =
        (rememberedNodeId && itemFor(container, rememberedNodeId)) ||
        (fallbackId && itemFor(container, fallbackId)) ||
        items[0];
    moveTabStop(container, stop);
}
