import type { CladeNode, TreeNode } from "../treeBuilder";
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

    li.appendChild(box);

    if (node.type === "clade" && node.children.length > 0) {
        const ul = el("ul");
        node.children.forEach((child) => {
            ul.appendChild(renderNode(child, onSelect, lastGuessId));
        });
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
    roots.forEach((root) =>
        ul.appendChild(renderNode(root, onSelect, lastGuessId))
    );
    canvas.appendChild(ul);
    container.appendChild(canvas);

    mountTreeScroll(container);
}
