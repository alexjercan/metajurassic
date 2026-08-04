import type { CladeNode, TreeNode } from "../treeBuilder";
import { CLOSENESS_LABELS } from "../closeness";
import { mountTreeKeyboard } from "./treeKeyboard";
import { mountTreeScroll } from "./treeScroll";

type NodeSelectHandler = (node: TreeNode) => void;

type RenderOptions = {
    container: HTMLElement;
    roots: CladeNode[];
    onSelect?: NodeSelectHandler;
    // The species most recently guessed, if any. Painted as `.node-latest`,
    // which is all `focusRect` in treeScroll.ts reads it for: it decides where
    // the arena comes to rest.
    lastGuessId?: string;
};

const el = (tag: string, className?: string, text?: string): HTMLElement => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

/**
 * What a screen reader says about a node: its name, its kind, and its state.
 * The warm/cold feedback a sighted player reads as a colour is a word here, so
 * the board's answer is not colour-only.
 */
function describeNode(node: TreeNode): string {
    if (node.type === "clade") return `${node.name}, clade`;
    if (node.isTarget) {
        if (node.isPlaceholder) return "the mystery dinosaur, not found yet";
        if (node.isRevealed) return `${node.name}, the answer, revealed`;
        return `${node.name}, the answer, found`;
    }
    // The target's node is the only species without a tier; see `closenessTier`
    // on SpeciesNode.
    return node.closenessTier === undefined
        ? `${node.name}, guess`
        : `${node.name}, guess, ${CLOSENESS_LABELS[node.closenessTier]}`;
}

function renderNode(
    node: TreeNode,
    onSelect?: NodeSelectHandler,
    lastGuessId?: string
): HTMLElement {
    const li = el("li");
    const box = el("div", "node-box");

    if (node.type === "clade") {
        box.classList.add("node-clade");
        if (!node.parentId) box.classList.add("node-root");
        box.textContent = node.name;
    } else {
        box.classList.add("node-species");
        // Warm/cold, on the same tier scale the share grid's cells index.
        // `buildGuessTree` decides the tier and leaves it off the target's
        // node; the renderer only paints what the data says.
        if (node.closenessTier !== undefined)
            box.classList.add(`node-close-${node.closenessTier}`);
        if (node.isTarget && node.isPlaceholder)
            box.classList.add("node-mystery");
        if (node.isTarget && !node.isPlaceholder && !node.isRevealed)
            box.classList.add("node-winner");
        if (node.isRevealed) box.classList.add("node-revealed");
        if (lastGuessId && node.speciesId === lastGuessId)
            box.classList.add("node-latest");
        box.textContent = node.name;
    }

    const isPlaceholder =
        node.type === "species" && node.isTarget && node.isPlaceholder;
    if (!isPlaceholder) {
        box.addEventListener("click", () => onSelect?.(node));
    }

    // The `li` carries `treeitem`, not the box: a treeitem's child `group` has
    // to nest INSIDE it, and the nested `ul` is the box's sibling.
    // `aria-disabled` is what makes the placeholder inert to the keyboard -
    // `.node-mystery`'s `pointer-events: none` only stops a pointer.
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-label", describeNode(node));
    if (isPlaceholder) li.setAttribute("aria-disabled", "true");
    li.tabIndex = -1;
    li.dataset.nodeId = node.id;

    li.appendChild(box);

    if (node.type === "clade" && node.children.length > 0) {
        const ul = el("ul");
        ul.setAttribute("role", "group");
        node.children.forEach((child) => {
            ul.appendChild(renderNode(child, onSelect, lastGuessId));
        });
        // Every clade on this board is permanently open. Unmarked, a screen
        // reader announces no children at all rather than an expanded parent.
        li.setAttribute("aria-expanded", "true");
        li.appendChild(ul);
    }

    return li;
}

export function renderTree({
    container,
    roots,
    onSelect,
    lastGuessId,
}: RenderOptions) {
    container.innerHTML = "";
    const canvas = el("div", "tree-canvas");
    const ul = el("ul");
    ul.setAttribute("role", "tree");
    // A tree with no accessible name is announced as just "tree". There is no
    // on-screen heading over the board to point `aria-labelledby` at.
    ul.setAttribute("aria-label", "guess tree");
    roots.forEach((root) =>
        ul.appendChild(renderNode(root, onSelect, lastGuessId))
    );
    canvas.appendChild(ul);
    container.appendChild(canvas);

    mountTreeKeyboard(container, roots, onSelect);
    mountTreeScroll(container);
}
