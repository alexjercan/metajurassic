import { expect, Page } from "@playwright/test";

// Assert two elements' rendered boxes do not intersect. Used to prove added
// guidance sits BESIDE the game loop rather than on top of it; a class or
// visibility check would not catch an element painted over the tree.
export async function expectNoBoxOverlap(
    page: Page,
    selectorA: string,
    selectorB: string
): Promise<void> {
    const a = await page.locator(selectorA).boundingBox();
    const b = await page.locator(selectorB).boundingBox();
    expect(a, `${selectorA} has no box`).not.toBeNull();
    expect(b, `${selectorB} has no box`).not.toBeNull();
    if (!a || !b) return;

    const overlaps =
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height;
    expect(
        overlaps,
        `${selectorA} ${JSON.stringify(a)} overlaps ${selectorB} ${JSON.stringify(b)}`
    ).toBe(false);
}

// Assert an element is wholly visible: inside the viewport AND inside the box
// of the ancestor that clips it.
//
// A viewport check ALONE is not enough and will pass on a broken layout. Both
// `#arena` (`overflow: auto`) and `.game-area` (`overflow: hidden`) clip, so an
// element taller than its container is cut off while `boundingBox()` keeps
// reporting the full layout rect - which still sits inside a 720px viewport.
// The first screen losing its last lines to the fold is exactly the failure
// this has to catch, so measure against the clipping box too.
export async function expectFullyVisibleWithin(
    page: Page,
    selector: string,
    containerSelector: string
): Promise<void> {
    const geometry = await page.evaluate(
        ([sel, containerSel]) => {
            const container = document.querySelector(containerSel);
            const el = document.querySelector(sel);
            if (!container || !el) return null;
            const c = container.getBoundingClientRect();
            const e = el.getBoundingClientRect();
            return {
                top: e.top,
                bottom: e.bottom,
                containerTop: c.top,
                containerBottom: c.bottom,
                viewportHeight: window.innerHeight,
            };
        },
        [selector, containerSelector] as const
    );

    expect(
        geometry,
        `${selector} or ${containerSelector} is absent`
    ).not.toBeNull();
    if (!geometry) return;

    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(
        geometry.bottom,
        `${selector} extends ${Math.round(geometry.bottom - geometry.viewportHeight)}px past the bottom of the viewport`
    ).toBeLessThanOrEqual(geometry.viewportHeight + 1);

    expect(
        geometry.top,
        `${selector} starts ${Math.round(geometry.containerTop - geometry.top)}px above ${containerSelector}`
    ).toBeGreaterThanOrEqual(geometry.containerTop - 1);
    expect(
        geometry.bottom,
        `${selector} is clipped: it extends ${Math.round(geometry.bottom - geometry.containerBottom)}px past the bottom of ${containerSelector}`
    ).toBeLessThanOrEqual(geometry.containerBottom + 1);

    // The rect comparisons above are blind to one whole failure mode: an
    // element scrolled out of an intermediate SCROLL container still reports a
    // layout rect inside the named container. That is exactly how the brief was
    // being cut before it moved out of `#arena`, so without this the checks
    // would go green on the very layout they exist to reject. `toBeInViewport`
    // is an IntersectionObserver test, and the intersection rect is clipped by
    // every ancestor clip box on the way up.
    await expect(
        page.locator(selector),
        `${selector} is not wholly visible - part of it is clipped or scrolled out of an ancestor`
    ).toBeInViewport({ ratio: 1 });
}
