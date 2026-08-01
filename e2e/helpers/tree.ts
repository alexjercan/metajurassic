import { expect, Page } from "@playwright/test";
import { MIN_NODE_FONT_PX } from "../../src/ui/treeLayout";

// The floor the painted node text is asserted against, DERIVED from the shipped
// constant rather than restated as a number. Restating it meant lowering
// `MIN_NODE_FONT_PX` left every spec green, so the Definition of Done's claim
// ("node text never renders below MIN_NODE_FONT_PX") was not actually pinned to
// anything. The half pixel is slack for the float arithmetic in the scale and
// the integer `offsetHeight` the painted size is divided by.
export const MIN_PAINTED_FONT_PX = MIN_NODE_FONT_PX - 0.5;

// Wait until nothing in the tree is still moving, so a geometry measurement
// samples the state the player ends up looking at.
//
// This is not optional bookkeeping. Every `.node-box` runs a `popIn` keyframe
// that scales it up from nothing, so a rect read straight after a guess is a
// frame of an animation rather than a layout. The first draft of the
// readability check measured "Saurischia" at 4.9px for exactly this reason -
// half its real painted size, because popIn was still running. Same trap as
// `waitForPanelToSettle`, different element.
export async function waitForTreeToSettle(page: Page): Promise<void> {
    await page.evaluate(async () => {
        const tree = document.getElementById("tree-container");
        if (!tree) return;
        const running = [tree, ...tree.querySelectorAll("*")]
            .flatMap((el) =>
                typeof el.getAnimations === "function" ? el.getAnimations() : []
            )
            // `.node-mystery` pulses forever (`pulseMystery ... infinite`), so
            // its `finished` never settles and awaiting it hangs the whole
            // helper. Skipping it is safe because that keyframe animates
            // box-shadow only and moves no geometry; anything that DOES move
            // geometry here (popIn) is finite and is still waited for.
            .filter((a) => {
                const timing = a.effect?.getComputedTiming();
                return (
                    timing != null &&
                    timing.iterations !== Infinity &&
                    Number.isFinite(Number(timing.endTime ?? Infinity))
                );
            });
        // A rejected `finished` (an animation cancelled by a re-render) is not
        // an error here: it means that element stopped moving, which is what
        // was being waited for.
        await Promise.all(
            running.map((a) => a.finished.catch(() => undefined))
        );
        await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
        );
    });
}

// A node box selected by its exact rendered name.
export function treeNode(page: Page, name: string) {
    return page
        .locator("#tree-container .node-box")
        .filter({ hasText: new RegExp(`^${name}$`) });
}

// Assert a tree node is wholly inside the arena's visible box: after a guess the
// player must be LOOKING at the node, not merely able to reach it by scrolling.
export async function expectNodeVisibleInArena(
    page: Page,
    nodeSelector: string,
    label: string,
    exactText?: string
): Promise<void> {
    await waitForTreeToSettle(page);
    const geometry = await page.evaluate(
        ([selector, text]) => {
            const arena = document.getElementById("arena");
            const candidates = [...document.querySelectorAll(selector)];
            // Selected in the page rather than with a Playwright text filter,
            // because `document.querySelector` knows nothing about `:has-text`.
            const node = text
                ? candidates.find(
                      (el) => (el.textContent ?? "").trim() === text
                  )
                : candidates[0];
            if (!arena || !node) return null;
            const a = arena.getBoundingClientRect();
            const n = node.getBoundingClientRect();
            return {
                left: n.left - a.left,
                right: a.right - n.right,
                top: n.top - a.top,
                bottom: a.bottom - n.bottom,
            };
        },
        [nodeSelector, exactText] as const
    );

    expect(geometry, `${label} (${nodeSelector}) is absent`).not.toBeNull();
    if (!geometry) return;

    // Each number is the slack on that side; negative means it hangs over.
    expect(
        Math.min(geometry.left, geometry.right, geometry.top, geometry.bottom),
        `${label} is outside the arena: ${JSON.stringify(geometry)} (slack per side, px)`
    ).toBeGreaterThanOrEqual(-1);
}

// The rule the renderer actually promises about the newest guess, asserted as a
// rule rather than as a coincidence of this fixture.
//
// `focusRect` frames the target ALWAYS and the newest guess only when the pair
// fits across the arena together (DECISION.md fork 2 says so explicitly).
// Asserting containment unconditionally therefore claimed a guarantee the code
// does not make - and passed on 5.0px of margin: the deciding quantity is the
// gap between "?" and the last guessed name, which is a sum of text widths, and
// CI's stock Ubuntu Chromium has a different font stack from the local nix one.
// A one percent difference in label metrics flipped a correctly behaving
// renderer to red.
//
// So: measure whether the pair fits, then assert the branch that applies. Both
// branches are real assertions - when the pair does not fit, the guess must
// still be reachable by scrolling, which is the weaker guarantee the original
// bug report was about.
export async function expectNewestGuessFramed(
    page: Page,
    name: string
): Promise<void> {
    await waitForTreeToSettle(page);
    const fits = await page.evaluate((text) => {
        const arena = document.getElementById("arena");
        const target = document.querySelector("#tree-container .node-mystery");
        const latest = [
            ...document.querySelectorAll("#tree-container .node-box"),
        ].find((el) => (el.textContent ?? "").trim() === text);
        if (!arena || !target || !latest) return null;
        const t = target.getBoundingClientRect();
        const l = latest.getBoundingClientRect();
        const union = {
            width: Math.max(t.right, l.right) - Math.min(t.left, l.left),
            height: Math.max(t.bottom, l.bottom) - Math.min(t.top, l.top),
        };
        return {
            fits:
                union.width <= arena.clientWidth &&
                union.height <= arena.clientHeight,
            union,
            arena: { width: arena.clientWidth, height: arena.clientHeight },
        };
    }, name);

    expect(fits, `the mystery target or "${name}" is absent`).not.toBeNull();
    if (!fits) return;

    if (fits.fits) {
        await expectNodeVisibleInArena(
            page,
            "#tree-container .node-box",
            `the newest guess (${name}), whose ${Math.round(fits.union.width)}x${Math.round(fits.union.height)}px union with the target fits the ${fits.arena.width}x${fits.arena.height}px arena`,
            name
        );
        return;
    }

    await expectNodeReachable(page, name, fits.arena);
}

// One node, scrolled to on purpose: after this the player is looking at it.
// Used where framing is not promised, so the guarantee left is that the node
// can be REACHED.
async function expectNodeReachable(
    page: Page,
    name: string,
    context: { width: number; height: number }
): Promise<void> {
    const reached = await page.evaluate(async (text) => {
        const arena = document.getElementById("arena");
        const node = [
            ...document.querySelectorAll("#tree-container .node-box"),
        ].find((el) => (el.textContent ?? "").trim() === text);
        if (!arena || !node) return null;
        const saved = { left: arena.scrollLeft, top: arena.scrollTop };
        node.scrollIntoView({ block: "center", inline: "center" });
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const a = arena.getBoundingClientRect();
        const n = node.getBoundingClientRect();
        const inside =
            n.left >= a.left - 1 &&
            n.right <= a.right + 1 &&
            n.top >= a.top - 1 &&
            n.bottom <= a.bottom + 1;
        arena.scrollLeft = saved.left;
        arena.scrollTop = saved.top;
        return inside;
    }, name);

    expect(
        reached,
        `"${name}" does not fit the frame with the target (arena ${context.width}x${context.height}px) and cannot be scrolled into view either`
    ).toBe(true);
}

// Shrinking the tree to fit is only worth doing while the result is still
// readable. Measured as the PAINTED text size - the computed font size times
// whatever visual scale the node ends up at - so it is blind to how the scaling
// is implemented. The bucket classes 20260729-092339 removed bottomed out at
// 0.6, which painted the phone's 14.4px node text at 8.6px.
export async function expectNodeTextReadable(
    page: Page,
    minFontPx: number
): Promise<void> {
    await waitForTreeToSettle(page);
    const smallest = await page.evaluate(() => {
        const boxes = [
            ...document.querySelectorAll("#tree-container .node-box"),
        ];
        let worst: { px: number; text: string } | null = null;
        for (const el of boxes) {
            const painted = el.getBoundingClientRect().height;
            const laid = (el as HTMLElement).offsetHeight;
            if (!laid) continue;
            const scale = painted / laid;
            const px = parseFloat(getComputedStyle(el).fontSize) * scale;
            if (!worst || px < worst.px)
                worst = { px, text: el.textContent ?? "" };
        }
        return worst;
    });

    expect(smallest, "#tree-container has no nodes to measure").not.toBeNull();
    if (!smallest) return;
    expect(
        smallest.px,
        `"${smallest.text}" is painted at ${smallest.px.toFixed(1)}px`
    ).toBeGreaterThanOrEqual(minFontPx);
}
