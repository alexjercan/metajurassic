import type { CladeNode, TreeNode } from "../treeBuilder";
import { GameData } from "../gameData";
import { renderCladeCard, renderSpeciesCard } from "./panel";

type NodeSelectHandler = (node: TreeNode) => void;

type RenderOptions = {
    container: HTMLElement;
    roots: CladeNode[];
    gameData: GameData;
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
        if (node.isTarget && !node.isPlaceholder)
            box.classList.add("node-winner");
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

export function renderTree({
    container,
    roots,
    gameData,
    onSelect,
}: RenderOptions) {
    container.innerHTML = "";
    const ul = el("ul");
    roots.forEach((root) => ul.appendChild(renderNode(root, onSelect)));
    container.appendChild(ul);

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

    if (roots.length > 0) {
        const root = roots[0];
        const autoSelect =
            onSelect ??
            ((node: TreeNode) => {
                if (node.type === "species") {
                    const species = gameData.findSpeciesById(node.speciesId);
                    const clade = species
                        ? gameData.findCladeById(species.clade)
                        : null;
                    if (species) renderSpeciesCard(species, clade || undefined);
                } else {
                    const clade = gameData.findCladeById(node.cladeId);
                    const parent = clade?.parent
                        ? gameData.findCladeById(clade.parent)
                        : null;
                    if (clade) renderCladeCard(clade, parent);
                }
            });
        autoSelect(root);
    }
}
