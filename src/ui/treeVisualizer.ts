import type { CladeNode, TreeNode } from "../treeBuilder";

type NodeSelectHandler = (node: TreeNode) => void;

type RenderOptions = {
    container: HTMLElement;
    roots: CladeNode[];
    onSelect?: NodeSelectHandler;
};

const el = (tag: string, className?: string, text?: string): HTMLElement => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

function renderNode(node: TreeNode, onSelect?: NodeSelectHandler): HTMLElement {
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
        if (node.isTarget && !node.isPlaceholder && !node.isRevealed)
            box.classList.add("node-winner");
        if (node.isRevealed) box.classList.add("node-revealed");
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
            ul.appendChild(renderNode(child, onSelect));
        });
        li.appendChild(ul);
    }

    return li;
}

export function renderTree({ container, roots, onSelect }: RenderOptions) {
    container.innerHTML = "";
    const ul = el("ul");
    roots.forEach((root) => ul.appendChild(renderNode(root, onSelect)));
    container.appendChild(ul);

    const arena = document.getElementById("arena");
    if (arena) {
        requestAnimationFrame(() => {
            // Calculate scaling based on tree width vs viewport
            const treeWidth = container.scrollWidth;
            const viewportWidth = arena.clientWidth;

            // Remove any existing scale classes
            container.classList.remove(
                "tree-scale-90",
                "tree-scale-80",
                "tree-scale-70",
                "tree-scale-60"
            );

            // Apply scaling if tree is too wide
            // Scale down in increments based on how much overflow there is
            if (treeWidth > viewportWidth * 1.8) {
                container.classList.add("tree-scale-60");
            } else if (treeWidth > viewportWidth * 1.5) {
                container.classList.add("tree-scale-70");
            } else if (treeWidth > viewportWidth * 1.2) {
                container.classList.add("tree-scale-80");
            } else if (treeWidth > viewportWidth) {
                container.classList.add("tree-scale-90");
            }

            // Use instant scrolling instead of smooth to avoid conflicts with manual scrolling
            // especially on Android Chrome where smooth scrolling can prevent manual scrolling
            const targetLeft = Math.max(
                0,
                (arena.scrollWidth - arena.clientWidth) / 2
            );
            const targetTop = arena.scrollHeight;

            // Try scrollTo with instant behavior first
            try {
                arena.scrollTo({
                    top: targetTop,
                    left: targetLeft,
                    behavior: "instant" as ScrollBehavior,
                });
            } catch (e) {
                // Fallback for browsers that don't support "instant"
                arena.scrollTop = targetTop;
                arena.scrollLeft = targetLeft;
            }
        });
    }
}
