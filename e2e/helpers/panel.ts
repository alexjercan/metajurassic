import { expect, Page } from "@playwright/test";

// Identify what is actually painted over the centre of the arena. A real hit
// test rather than a check of the `active` class, so it stays honest about what
// the CSS renders on the viewport under test - and it names the offending
// element, because "expected false, received true" does not say whether the
// panel covered the tree or the arena had not laid out yet.
export function topElementOverArena(page: Page): Promise<string> {
    return page.evaluate(() => {
        const describe = (el: Element | null) =>
            el
                ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
                      typeof el.className === "string" && el.className
                          ? `.${el.className.trim().split(/\s+/).join(".")}`
                          : ""
                  }`
                : "nothing";

        const arena = document.getElementById("arena");
        const panel = document.getElementById("info-panel");
        if (!arena || !panel) return "#arena or #info-panel is absent";

        const r = arena.getBoundingClientRect();
        const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2
        );
        const where = `${describe(top)} (panel left=${Math.round(
            panel.getBoundingClientRect().left
        )}, viewport width=${window.innerWidth})`;
        return panel.contains(top) ? `inside #info-panel -> ${where}` : where;
    });
}

// Wait until the info panel has stopped moving, so a hit test samples the state
// the player ends up looking at.
//
// Two things move it. `.info-panel` opens and closes over `transform 0.4s`, and
// the app has no extracted stylesheet (webpack.config.js pipes CSS through
// `style-loader`, injected from the JS bundle), so there is also a frame after
// load in which no `transform: translateX(105%)` has been applied yet and the
// panel still sits over `#arena`.
//
// Settling matters more than it sounds: an `expect.poll(...).not` resolves on
// the FIRST sample that satisfies it, so polling a moving panel passes on the
// opening animation's first frame and proves nothing at all.
async function waitForPanelToSettle(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                const panel = document.getElementById("info-panel");
                if (!panel) return resolve();
                const deadline = performance.now() + 3000;
                let previous = panel.getBoundingClientRect().left;
                let stableFrames = 0;
                const tick = () => {
                    const left = panel.getBoundingClientRect().left;
                    stableFrames =
                        Math.abs(left - previous) < 0.5 ? stableFrames + 1 : 0;
                    previous = left;
                    // Roughly 100ms of no movement, or give up and let the
                    // caller's assertion report whatever is actually there.
                    if (stableFrames >= 6 || performance.now() > deadline) {
                        return resolve();
                    }
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            })
    );
}

// The tree, not the panel, must be the thing painted at the centre of the play
// surface once everything has come to rest. This is the assertion that pins
// playtest findings F3.5 and F3.6 on its own: it fails whether the panel was
// opened by a class change or is merely parked over the arena by layout.
export async function expectTreeNotOccludedByPanel(page: Page): Promise<void> {
    await waitForPanelToSettle(page);
    expect(await topElementOverArena(page)).not.toContain("#info-panel");
}

// The `#open-panel` pull tab is the only route back to the info panel, so it has
// to be wholly on screen to be tappable. It used to sit at `right: -5px` with a
// `:hover` transform pushing it a further 5px out (playtest finding F3.3).
export async function expectPullTabInsideViewport(page: Page): Promise<void> {
    const tab = page.locator("#open-panel");
    await expect(tab).toBeVisible();
    const box = await tab.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}
