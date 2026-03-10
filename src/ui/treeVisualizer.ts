import type { CladeNode, SpeciesNode, TreeNode } from "../treeBuilder";

type RenderOptions = {
    container: HTMLElement;
    roots: CladeNode[];
};

const el = (tag: string, className?: string, text?: string): HTMLElement => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

function renderNode(node: TreeNode): HTMLElement {
    const li = el("li");
    const box = el("div", "node-box");

    if (node.type === "clade") {
        box.classList.add("node-clade");
        if (!node.parentId) box.classList.add("node-root");
        box.textContent = node.name;
    } else {
        box.classList.add("node-species");
        if (node.isTarget && node.isPlaceholder)
            box.classList.add("node-mystery");
        if (node.isTarget && !node.isPlaceholder)
            box.classList.add("node-winner");
        box.textContent = node.name;
    }

    li.appendChild(box);

    if (node.type === "clade" && node.children.length > 0) {
        const ul = el("ul");
        node.children.forEach((child) => {
            ul.appendChild(renderNode(child));
        });
        li.appendChild(ul);
    }

    return li;
}

export function renderTree({ container, roots }: RenderOptions) {
    container.innerHTML = "";
    const ul = el("ul");
    roots.forEach((root) => ul.appendChild(renderNode(root)));
    container.appendChild(ul);

    // Auto-scroll to center/bottom to keep latest nodes visible
    const arena = document.getElementById("arena");
    if (arena) {
        requestAnimationFrame(() => {
            arena.scrollTo({
                top: arena.scrollHeight,
                left: Math.max(0, (arena.scrollWidth - arena.clientWidth) / 2),
                behavior: "smooth",
            });
        });
    }
}
