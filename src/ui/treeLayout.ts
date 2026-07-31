// Geometry for the taxonomy tree: how far to shrink it, and where to leave the
// arena scrolled once it has been drawn.
//
// Kept as pure functions with no DOM so the arithmetic can be tested directly;
// `treeScroll.ts` measures the real elements, calls these, and writes the
// answers back. See tasks/20260729-092339/DECISION.md.

/**
 * The smallest painted node text the tree is allowed to shrink to.
 *
 * The fixed `.tree-scale-60` bucket this replaces went below it: on a phone,
 * whose node text is 0.9rem, it painted labels at 8.6px, and on desktop at
 * 9.6px. Shrinking past the point of legibility does not make the tree usable,
 * it just makes it small, so the fit stops here and scrolling takes over.
 */
export const MIN_NODE_FONT_PX = 11;

/**
 * A floor on the SHRINK FACTOR itself, independent of the font floor above.
 *
 * `MIN_NODE_FONT_PX` alone is an absolute target, so a player who has raised
 * their browser's default font for accessibility would still be shrunk all the
 * way down to 11px - the bigger font buys them nothing, and they end up worse
 * off than under the fixed 0.6 bucket this replaces (which would have painted a
 * 24px base at 14.4px). Keeping 0.6 as a hard floor preserves that guarantee.
 *
 * At the default 16px base, and at the phone's 14.4px, the font floor is the
 * binding one (0.688 and 0.764), so this changes nothing for the common case;
 * it only stops the shrink running away for a base above ~18.3px.
 */
export const MIN_TREE_SCALE = 0.6;

export type Size = { width: number; height: number };

export type Rect = { left: number; top: number; width: number; height: number };

const clamp = (value: number, low: number, high: number): number =>
    Math.min(high, Math.max(low, value));

/**
 * The scale factor to draw the tree at: shrink it to fit the arena, but never
 * past the point where its labels stop being readable, and never magnify it.
 *
 * `baseFontPx` is the computed font size of the smallest node, so the floor is
 * expressed once as a target painted size and holds at every breakpoint rather
 * than being re-tuned per viewport. A `baseFontPx` already at or below the
 * floor cannot be shrunk at all, so the tree is drawn at 1. `MIN_TREE_SCALE`
 * caps how far the font floor may shrink a large base font.
 */
export function computeTreeScale({
    treeWidth,
    arenaWidth,
    baseFontPx,
    minFontPx = MIN_NODE_FONT_PX,
}: {
    treeWidth: number;
    arenaWidth: number;
    baseFontPx: number;
    minFontPx?: number;
}): number {
    if (!(treeWidth > 0) || !(arenaWidth > 0)) return 1;

    const minScale =
        baseFontPx > 0
            ? Math.min(1, Math.max(minFontPx / baseFontPx, MIN_TREE_SCALE))
            : 1;

    return clamp(arenaWidth / treeWidth, minScale, 1);
}

/**
 * Where to leave the arena scrolled: with `anchor` centred in the viewport,
 * clamped to the scrollable range.
 *
 * `anchor` is in the arena's CONTENT coordinates (its position within the
 * scrollable area, not on the screen), and so are the results. The clamping is
 * what makes an anchor near an edge behave: asking to centre the leftmost node
 * yields a scroll of 0 rather than a negative offset the browser would ignore
 * or, worse, a position that leaves the anchor off screen anyway.
 */
export function computeScrollTarget({
    anchor,
    viewport,
    extent,
}: {
    anchor: Rect;
    viewport: Size;
    extent: Size;
}): { left: number; top: number } {
    const centre = (
        anchorStart: number,
        anchorSize: number,
        viewportSize: number,
        extentSize: number
    ) =>
        clamp(
            anchorStart + anchorSize / 2 - viewportSize / 2,
            0,
            Math.max(0, extentSize - viewportSize)
        );

    return {
        left: centre(anchor.left, anchor.width, viewport.width, extent.width),
        top: centre(anchor.top, anchor.height, viewport.height, extent.height),
    };
}
