import { expect, Page } from "@playwright/test";
import { waitForTreeToSettle } from "./tree";

// Arena geometry: what the scroll range holds, and whether a finger can move
// it. `tree.ts` next door asks the other question, about individual nodes.

// The arena's scroll extent must be the content, not the content plus a band of
// nothing. The `transform: scale()` 20260729-092339 replaced left the SCROLL box
// at the unscaled layout width while the transform painted a much smaller
// picture, so a third of the scroll range at each end was empty - which is what
// dumps the player in front of a blank arena, and the most plausible source of
// the original "cannot scroll left on android" report.
//
// Stated EXACTLY, with no tolerance to tune: the scroll range may be the
// painted tree plus the arena's own padding, and nothing else. The first draft
// measured the gap in front of the leftmost `.node-box` instead and allowed
// `max(96px, 8% of the range)` for the tree's internal padding - which passed
// only because this fixture's band happened to be 96.25px against a floor of
// 96. That band is `.tree-canvas` padding times the scale, so it GROWS as the
// scale approaches 1 while the proportional term shrinks with the tree: a
// slightly narrower tree (scale ~0.95) would have failed a perfectly honest
// layout. The form below has no such window, because the tree's own padding is
// inside the painted box on both sides of the comparison.
//
// The pre-fix numbers this rejects by a mile: 2152px of range for ~1291px of
// painted tree on a phone, 2693px for ~1615px on desktop.
export async function expectNoDeadScrollBand(page: Page): Promise<void> {
    await waitForTreeToSettle(page);
    const band = await page.evaluate(() => {
        const arena = document.getElementById("arena");
        const tree = document.getElementById("tree-container");
        if (!arena || !tree) return null;
        const style = getComputedStyle(arena);
        const painted = tree.getBoundingClientRect();
        const a = arena.getBoundingClientRect();
        const boxes = [...arena.querySelectorAll(".node-box")];
        if (!boxes.length) return null;
        const lefts = boxes.map(
            (el) => el.getBoundingClientRect().left - a.left + arena.scrollLeft
        );
        return {
            scrollWidth: arena.scrollWidth,
            scrollHeight: arena.scrollHeight,
            // The painted tree plus the arena's own padding is the most the
            // scroll range is allowed to be. `clientWidth` covers the case
            // where the tree is NARROWER than the arena, when the range is
            // simply the viewport.
            allowedWidth:
                Math.max(painted.width, arena.clientWidth) +
                parseFloat(style.paddingLeft) +
                parseFloat(style.paddingRight),
            allowedHeight:
                Math.max(painted.height, arena.clientHeight) +
                parseFloat(style.paddingTop) +
                parseFloat(style.paddingBottom),
            // Diagnostic only: how far into the range the first node sits.
            firstNodeAt: Math.min(...lefts),
        };
    });

    expect(band, "#arena has no nodes to measure").not.toBeNull();
    if (!band) return;

    // A pixel of slack for the sub-pixel rounding between a fractional painted
    // width and the integer scrollWidth.
    expect(
        band.scrollWidth,
        `#arena scrolls ${band.scrollWidth}px for ${Math.round(band.allowedWidth)}px of painted tree, so ${Math.round(band.scrollWidth - band.allowedWidth)}px of the range is empty (first node at ${Math.round(band.firstNodeAt)}px)`
    ).toBeLessThanOrEqual(band.allowedWidth + 1);
    expect(
        band.scrollHeight,
        `#arena scrolls ${band.scrollHeight}px vertically for ${Math.round(band.allowedHeight)}px of painted tree`
    ).toBeLessThanOrEqual(band.allowedHeight + 1);
}

// Sweep the whole scroll range and report any node that never comes fully into
// view. "Reachable" is the weaker guarantee the original bug report was about:
// a node the player can get to by scrolling, even if it is not on screen now.
export async function expectEveryNodeReachable(page: Page): Promise<void> {
    await waitForTreeToSettle(page);
    const result = await page.evaluate(async () => {
        const arena = document.getElementById("arena");
        if (!arena) return null;
        const boxes = [...arena.querySelectorAll(".node-box")];
        const seen = new Set<number>();
        const frame = () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve())
            );
        const maxLeft = arena.scrollWidth - arena.clientWidth;
        const maxTop = arena.scrollHeight - arena.clientHeight;
        const savedLeft = arena.scrollLeft;
        const savedTop = arena.scrollTop;
        // The sweep MUST include the far end of each axis, not just a stride
        // that happens to land near it. A plain `for (l = 0; l <= max; l +=
        // max/12)` stops one stride short whenever the stride does not divide
        // the range, and the node the player reaches by scrolling all the way
        // right is then reported as unreachable - which is exactly what this
        // helper claimed about "Heterodontosaurus" on its first run, on a
        // layout where it was perfectly reachable.
        const positions = (max: number): number[] => {
            const stops: number[] = [];
            const step = Math.max(1, Math.ceil(max / 12));
            for (let p = 0; p < max; p += step) stops.push(p);
            stops.push(max);
            return stops;
        };

        for (const l of positions(maxLeft)) {
            for (const t of positions(maxTop)) {
                arena.scrollLeft = l;
                arena.scrollTop = t;
                await frame();
                const a = arena.getBoundingClientRect();
                boxes.forEach((el, i) => {
                    const r = el.getBoundingClientRect();
                    if (
                        r.left >= a.left - 1 &&
                        r.right <= a.right + 1 &&
                        r.top >= a.top - 1 &&
                        r.bottom <= a.bottom + 1
                    )
                        seen.add(i);
                });
            }
        }

        arena.scrollLeft = savedLeft;
        arena.scrollTop = savedTop;
        return {
            total: boxes.length,
            unreachable: boxes
                .map((el, i) => ({ i, text: el.textContent ?? "" }))
                .filter(({ i }) => !seen.has(i))
                .map(({ text }) => text),
        };
    });

    expect(result, "#arena has no nodes to measure").not.toBeNull();
    if (!result) return;
    expect(
        result.unreachable,
        `${result.unreachable.length} of ${result.total} nodes cannot be scrolled into view`
    ).toEqual([]);
}

// Scroll the arena with a real touch gesture rather than by assigning
// scrollLeft: the reported symptom (20260331-154614) is touch scrolling
// specifically, so the pin has to go through Chromium's touch pipeline, and
// real-device confirmation stays a manual acceptance item
// (tasks/20260729-092339/DECISION.md fork 3).
//
// `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` looked like
// the obvious tool and is NOT one: measured on this suite it moves the arena by
// exactly zero, while the same call with a mouse source scrolls fine. A test
// built on it would have asserted "touch scrolling is broken" on every layout,
// including working ones. Dispatching the touch sequence by hand does work
// (measured: 0 -> 172px), so that is what runs here.
//
// `fingerDx` is the finger's own displacement: dragging the finger LEFT
// (negative) pulls the content left, which increases scrollLeft.
export async function touchScrollArena(
    page: Page,
    fingerDx: number
): Promise<number> {
    const client = await page.context().newCDPSession(page);
    const at = await page.evaluate(() => {
        const arena = document.getElementById("arena");
        if (!arena) return null;
        const r = arena.getBoundingClientRect();
        return {
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2),
        };
    });
    expect(at, "#arena is absent").not.toBeNull();
    if (!at) return NaN;

    const steps = 10;
    await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: at.x, y: at.y }],
    });
    for (let i = 1; i <= steps; i++) {
        await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
                { x: Math.round(at.x + (fingerDx * i) / steps), y: at.y },
            ],
        });
    }
    await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await client.detach();

    // A touch scroll can coast after the finger lifts, so read the position the
    // player is left at rather than the first frame after touchEnd.
    return page.evaluate(
        () =>
            new Promise<number>((resolve) => {
                const arena = document.getElementById("arena");
                if (!arena) return resolve(NaN);
                const deadline = performance.now() + 2000;
                let previous = arena.scrollLeft;
                let stable = 0;
                const tick = () => {
                    const left = arena.scrollLeft;
                    stable = Math.abs(left - previous) < 0.5 ? stable + 1 : 0;
                    previous = left;
                    if (stable >= 6 || performance.now() > deadline) {
                        return resolve(arena.scrollLeft);
                    }
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            })
    );
}
