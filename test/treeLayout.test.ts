import {
    MIN_NODE_FONT_PX,
    MIN_TREE_SCALE,
    computeScrollTarget,
    computeTreeScale,
} from "../src/ui/treeLayout";

// The arithmetic behind the tree's sizing and resting scroll position. The
// browser specs in e2e/tree.spec.ts and e2e/mobile.spec.ts prove the DOM
// actually ends up where these say; this covers the edges that are awkward to
// stage in a real round.

describe("computeTreeScale", () => {
    // Desktop and phone node text, the two sizes the game actually renders at.
    const DESKTOP_FONT = 16;
    const PHONE_FONT = 14.4;

    it("leaves a tree that already fits alone", () => {
        expect(
            computeTreeScale({
                treeWidth: 600,
                arenaWidth: 1280,
                baseFontPx: DESKTOP_FONT,
            })
        ).toBe(1);
    });

    it("never magnifies a small tree to fill the arena", () => {
        // A two-node opening tree is tiny; blowing it up to arena width would
        // be a different game screen, not a fix.
        expect(
            computeTreeScale({
                treeWidth: 200,
                arenaWidth: 1280,
                baseFontPx: DESKTOP_FONT,
            })
        ).toBe(1);
    });

    it("shrinks a slightly-too-wide tree exactly enough to fit", () => {
        expect(
            computeTreeScale({
                treeWidth: 1600,
                arenaWidth: 1280,
                baseFontPx: DESKTOP_FONT,
            })
        ).toBeCloseTo(0.8, 5);
    });

    it("stops shrinking at the readability floor rather than fitting at any cost", () => {
        // The 12-guess phone case: 2152px of tree in a 393px arena wants 0.18.
        const scale = computeTreeScale({
            treeWidth: 2152,
            arenaWidth: 393,
            baseFontPx: PHONE_FONT,
        });
        expect(scale).toBeCloseTo(MIN_NODE_FONT_PX / PHONE_FONT, 5);
        expect(scale * PHONE_FONT).toBeCloseTo(MIN_NODE_FONT_PX, 5);
    });

    it("keeps the same painted floor at both breakpoints", () => {
        const desktop = computeTreeScale({
            treeWidth: 10000,
            arenaWidth: 1280,
            baseFontPx: DESKTOP_FONT,
        });
        const phone = computeTreeScale({
            treeWidth: 10000,
            arenaWidth: 393,
            baseFontPx: PHONE_FONT,
        });
        // Different scale factors, same painted result - which is the point of
        // expressing the floor in painted pixels instead of as a fixed 0.6.
        expect(desktop).not.toBeCloseTo(phone, 3);
        expect(desktop * DESKTOP_FONT).toBeCloseTo(MIN_NODE_FONT_PX, 5);
        expect(phone * PHONE_FONT).toBeCloseTo(MIN_NODE_FONT_PX, 5);
    });

    it("does not shrink text that is already at or below the floor", () => {
        expect(
            computeTreeScale({
                treeWidth: 4000,
                arenaWidth: 300,
                baseFontPx: MIN_NODE_FONT_PX,
            })
        ).toBe(1);
        expect(
            computeTreeScale({
                treeWidth: 4000,
                arenaWidth: 300,
                baseFontPx: 8,
            })
        ).toBe(1);
    });

    it("does not let a large accessibility font be shrunk away", () => {
        // A player who raised their browser's default font to 24px would, with
        // the painted floor alone, still be shrunk to 11px text (scale 0.458) -
        // their setting buying them nothing, and a WORSE result than the fixed
        // 0.6 bucket this replaces would have given them (14.4px). MIN_TREE_SCALE
        // is the hard floor on the shrink factor that stops that.
        const scale = computeTreeScale({
            treeWidth: 4000,
            arenaWidth: 393,
            baseFontPx: 24,
        });
        expect(scale).toBeCloseTo(MIN_TREE_SCALE, 5);
        expect(scale * 24).toBeGreaterThan(MIN_NODE_FONT_PX);
    });

    it("keeps the painted floor binding at the sizes the game renders at", () => {
        // Both breakpoints sit above MIN_TREE_SCALE (0.688 and 0.764), so the
        // hard floor above changes nothing for the common case.
        for (const font of [DESKTOP_FONT, PHONE_FONT]) {
            expect(MIN_NODE_FONT_PX / font).toBeGreaterThan(MIN_TREE_SCALE);
        }
    });

    it("honours an explicit floor, down to the hard scale floor", () => {
        expect(
            computeTreeScale({
                treeWidth: 2000,
                arenaWidth: 1400,
                baseFontPx: 20,
                minFontPx: 5,
            })
        ).toBeCloseTo(0.7, 5);
        // ...but MIN_TREE_SCALE is absolute: an explicit floor cannot shrink
        // the tree past it either.
        expect(
            computeTreeScale({
                treeWidth: 2000,
                arenaWidth: 400,
                baseFontPx: 20,
                minFontPx: 5,
            })
        ).toBeCloseTo(MIN_TREE_SCALE, 5);
    });

    it("falls back to 1 when there is nothing to measure", () => {
        // Called before layout, or on an empty tree: no scaling is better than
        // a division by zero making its way into a transform.
        expect(
            computeTreeScale({
                treeWidth: 0,
                arenaWidth: 1280,
                baseFontPx: 16,
            })
        ).toBe(1);
        expect(
            computeTreeScale({
                treeWidth: 1000,
                arenaWidth: 0,
                baseFontPx: 16,
            })
        ).toBe(1);
        // An unmeasurable font means there is no node box to measure, i.e.
        // nothing on screen to shrink. Scaling blind would be guessing at how
        // small the labels are allowed to get, so the tree is left at 1.
        expect(
            computeTreeScale({
                treeWidth: 1000,
                arenaWidth: 500,
                baseFontPx: 0,
            })
        ).toBe(1);
    });
});

describe("computeScrollTarget", () => {
    const viewport = { width: 400, height: 300 };
    const extent = { width: 2000, height: 1000 };

    it("centres the anchor in the viewport", () => {
        expect(
            computeScrollTarget({
                anchor: { left: 900, top: 400, width: 100, height: 40 },
                viewport,
                extent,
            })
        ).toEqual({ left: 750, top: 270 });
    });

    it("clamps at the near edge instead of asking for a negative scroll", () => {
        expect(
            computeScrollTarget({
                anchor: { left: 10, top: 5, width: 100, height: 40 },
                viewport,
                extent,
            })
        ).toEqual({ left: 0, top: 0 });
    });

    it("clamps at the far edge instead of scrolling past the content", () => {
        expect(
            computeScrollTarget({
                anchor: { left: 1950, top: 980, width: 40, height: 20 },
                viewport,
                extent,
            })
        ).toEqual({ left: 1600, top: 700 });
    });

    it("centres an anchor bigger than the viewport, overflowing it evenly", () => {
        // Documents what happens when the caller asks for the impossible. The
        // renderer avoids reaching here - `focusRect` falls back to the target
        // alone when the target-plus-newest-guess union does not fit on EITHER
        // axis - but the arithmetic still has to be defined, and "centred, so
        // it overflows equally at both ends" is the least surprising answer.
        expect(
            computeScrollTarget({
                anchor: { left: 800, top: 400, width: 600, height: 500 },
                viewport,
                extent,
            })
        ).toEqual({ left: 900, top: 500 });
    });

    it("asks for no scroll at all when the content fits", () => {
        // The opening tree: smaller than the arena in both directions, so the
        // only correct answer is the origin.
        expect(
            computeScrollTarget({
                anchor: { left: 120, top: 40, width: 40, height: 40 },
                viewport,
                extent: { width: 300, height: 200 },
            })
        ).toEqual({ left: 0, top: 0 });
    });
});
