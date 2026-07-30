import type { CladeNode, TreeNode } from "../treeBuilder";
import type { Rect } from "./treeLayout";
import { computeScrollTarget, computeTreeScale } from "./treeLayout";

type NodeSelectHandler = (node: TreeNode) => void;

type RenderOptions = {
    container: HTMLElement;
    roots: CladeNode[];
    onSelect?: NodeSelectHandler;
    // The species most recently guessed, if any. Only used to decide where the
    // arena comes to rest; see `pickScrollAnchor`.
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

/**
 * The target's node, whatever state the round is in: the mystery placeholder
 * while it is unsolved, and the same species as the winner or as a revealed
 * node once it is over, so the frame follows it rather than jumping when the
 * round ends.
 */
function pickScrollAnchor(canvas: HTMLElement): HTMLElement | null {
    return canvas.querySelector<HTMLElement>(
        ".node-mystery, .node-winner, .node-revealed"
    );
}

/**
 * A node's box in the arena's CONTENT coordinates, built from layout offsets
 * rather than from `getBoundingClientRect`.
 *
 * The distinction is load-bearing. Every node runs a `popIn` keyframe that
 * scales it up from half size, and `layoutTree` runs in the frame right after
 * the render, so client rects read here are mid-animation: measured that way
 * the newest guess ended up 8px off the edge of an arena that had been scrolled
 * to a position computed from where the node was a few frames earlier. Offset
 * geometry is layout, so it is the same whatever the animation is doing.
 *
 * The canvas's OWN rect is safe to read - nothing animates it - so it supplies
 * the origin, and the offsets walk up to it. The walk is a loop rather than a
 * single `offsetLeft` because `.tree ul` and `.tree li` are both positioned, so
 * a node's offsetParent is its `li`, not the canvas.
 *
 * The walk only terminates on the canvas because `.tree-canvas` is
 * `position: absolute` and is therefore always on the offsetParent chain. If
 * that ever stops being true the sum would be taken against the wrong origin
 * and be silently wrong, so a walk that runs off the end falls back to rects
 * instead of returning a plausible lie.
 */
function contentRect(
    node: HTMLElement,
    canvas: HTMLElement,
    origin: { left: number; top: number },
    scale: number
): Rect {
    let left = 0;
    let top = 0;
    let reachedCanvas = false;
    for (
        let el: HTMLElement | null = node;
        el;
        el = el.offsetParent as HTMLElement | null
    ) {
        if (el === canvas) {
            reachedCanvas = true;
            break;
        }
        left += el.offsetLeft;
        top += el.offsetTop;
    }

    if (!reachedCanvas) {
        // Rects are already in painted units, so they are NOT multiplied by
        // the scale the way the offset sums are.
        const canvasRect = canvas.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        return {
            left: origin.left + (nodeRect.left - canvasRect.left),
            top: origin.top + (nodeRect.top - canvasRect.top),
            width: nodeRect.width,
            height: nodeRect.height,
        };
    }

    return {
        left: origin.left + left * scale,
        top: origin.top + top * scale,
        width: node.offsetWidth * scale,
        height: node.offsetHeight * scale,
    };
}

/**
 * The rectangle the arena centres on, in the arena's content coordinates.
 *
 * The target is what the board is about, so it is always in the frame. The
 * newest guess joins it whenever the two fit across the arena together, which
 * is the common case: a guess is drawn on the lineage it shares with the
 * target, so it usually lands nearby. When a guess is far enough away that the
 * pair cannot fit, showing the target beats showing half of each.
 *
 * "Fit" is checked on BOTH axes. A union taller than the arena is centred just
 * as happily as one wider than it, and the result is the target pushed off the
 * top or the bottom - the same failure the horizontal guard exists to prevent,
 * and the arena is much shorter than it is wide on a phone.
 *
 * See tasks/20260729-092339/DECISION.md fork 2.
 */
function focusRect(
    canvas: HTMLElement,
    origin: { left: number; top: number },
    scale: number,
    arenaWidth: number,
    arenaHeight: number
): Rect | null {
    const target = pickScrollAnchor(canvas);
    if (!target) return null;

    const targetRect = contentRect(target, canvas, origin, scale);
    const latest = canvas.querySelector<HTMLElement>(".node-latest");
    if (!latest || latest === target) return targetRect;

    const latestRect = contentRect(latest, canvas, origin, scale);
    const left = Math.min(targetRect.left, latestRect.left);
    const right = Math.max(
        targetRect.left + targetRect.width,
        latestRect.left + latestRect.width
    );
    const top = Math.min(targetRect.top, latestRect.top);
    const bottom = Math.max(
        targetRect.top + targetRect.height,
        latestRect.top + latestRect.height
    );
    if (right - left > arenaWidth || bottom - top > arenaHeight)
        return targetRect;

    return { left, top, width: right - left, height: bottom - top };
}

/**
 * The arena width and scale the current frame was computed from, so a relayout
 * can tell a real size change from a resize event that changed nothing.
 */
let lastLayout: { arenaWidth: number; scale: number } | null = null;

/**
 * Size the tree to the arena and scroll the anchor into the middle of it.
 *
 * The container is a plain box whose width and height are set to the SCALED
 * size of the tree, and the tree itself is drawn inside an absolutely
 * positioned canvas that carries the transform. That arrangement is the whole
 * point: a `transform` does not change the layout box it is applied to, so
 * scaling the tree in place left `#arena` with a scroll range the size of the
 * UNSCALED tree - hundreds of pixels of it empty at each end, with the player
 * dropped in the middle of the emptiness. Sizing the container to what is
 * actually painted makes the scroll range mean what it says.
 *
 * `reanchor` says whether the arena may be scrolled. A fresh render always may.
 * A relayout may only when the picture actually changed size, because a resize
 * is not always the player asking for a new frame: on Android Chrome the URL
 * bar hiding during a drag resizes the layout viewport and fires `resize`, and
 * re-scrolling there would eat the very gesture this task exists to protect.
 */
function layoutTree(container: HTMLElement, reanchor: boolean): void {
    const arena = document.getElementById("arena");
    const canvas = container.querySelector<HTMLElement>(".tree-canvas");
    if (!arena || !canvas) return;

    // Measure unscaled. The canvas is out of flow and unconstrained, so its
    // offset size is the tree's natural size.
    canvas.style.transform = "none";
    container.style.width = "";
    container.style.height = "";
    const naturalWidth = canvas.offsetWidth;
    const naturalHeight = canvas.offsetHeight;

    // The SMALLEST node font, not the first one found. The root node is a point
    // larger than the rest on desktop (`.node-root`), so sampling the first node
    // set the floor against 16.8px text and painted every ordinary 16px node at
    // 10.5px - under the floor the whole constant exists to hold.
    const baseFontPx = [...canvas.querySelectorAll(".node-box")].reduce(
        (smallest, node) => {
            const px = parseFloat(getComputedStyle(node).fontSize);
            return px > 0 && (smallest === 0 || px < smallest) ? px : smallest;
        },
        0
    );

    const arenaWidth = arena.clientWidth;
    const scale = computeTreeScale({
        treeWidth: naturalWidth,
        arenaWidth,
        baseFontPx,
    });

    canvas.style.transform = `scale(${scale})`;
    container.style.width = `${naturalWidth * scale}px`;
    container.style.height = `${naturalHeight * scale}px`;

    // The box above is always resized; only the scroll is conditional. A
    // height-only viewport change (the URL-bar case) leaves both of these
    // equal, so the player keeps the position they scrolled to.
    const resized =
        lastLayout === null ||
        lastLayout.scale !== scale ||
        lastLayout.arenaWidth !== arenaWidth;
    lastLayout = { arenaWidth, scale };
    if (!reanchor && !resized) return;

    const arenaRect = arena.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const origin = {
        left: canvasRect.left - arenaRect.left + arena.scrollLeft,
        top: canvasRect.top - arenaRect.top + arena.scrollTop,
    };
    const focus = focusRect(
        canvas,
        origin,
        scale,
        arena.clientWidth,
        arena.clientHeight
    );
    if (!focus) return;

    const target = computeScrollTarget({
        anchor: focus,
        viewport: { width: arena.clientWidth, height: arena.clientHeight },
        extent: { width: arena.scrollWidth, height: arena.scrollHeight },
    });

    // Instant, not smooth: on Android Chrome an in-flight smooth scroll eats
    // the player's own drag, which is half of what the original bug report
    // (20260331-154614) described.
    try {
        arena.scrollTo({
            top: target.top,
            left: target.left,
            behavior: "instant" as ScrollBehavior,
        });
    } catch {
        arena.scrollTop = target.top;
        arena.scrollLeft = target.left;
    }
}

// The container most recently rendered, so a viewport change can re-run the
// layout against it. Sizing the tree once at render time and never again left
// the arena parked at whatever the old width had computed - after a rotation,
// off the content entirely.
let laidOutContainer: HTMLElement | null = null;
let pendingRelayout = 0;
let listeningForViewportChanges = false;

function scheduleRelayout(): void {
    if (pendingRelayout) cancelAnimationFrame(pendingRelayout);
    pendingRelayout = requestAnimationFrame(() => {
        pendingRelayout = 0;
        // `reanchor: false` - a resize resizes the box, but only a size change
        // moves the player. See `layoutTree`.
        if (laidOutContainer?.isConnected) layoutTree(laidOutContainer, false);
    });
}

// A ResizeObserver on the arena, not just the window events, and for a specific
// reason. A `resize` handler can run before the new viewport's media query has
// been applied: measured on a portrait-to-landscape rotation, the relayout read
// the PHONE node font (14.4px) at a desktop width and scaled the tree to the
// phone floor, leaving the target off screen. The observer fires after layout,
// with the styles the new size actually has, so it corrects that pass. The
// window events stay because they also cover a size change that leaves the
// arena's own box alone.
function listenForViewportChanges(arena: HTMLElement): void {
    if (listeningForViewportChanges) return;
    listeningForViewportChanges = true;
    if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(scheduleRelayout).observe(arena);
    }
    window.addEventListener("resize", scheduleRelayout);
    window.addEventListener("orientationchange", scheduleRelayout);
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

    laidOutContainer = container;
    const arena = document.getElementById("arena");
    if (arena) listenForViewportChanges(arena);
    // The container is unsized for this one frame while the out-of-flow canvas
    // paints; sizing it needs the canvas's natural size, which needs a layout.
    requestAnimationFrame(() => layoutTree(container, true));
}
