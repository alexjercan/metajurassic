import { expect, Page } from "@playwright/test";
import { MIN_NODE_FONT_PX } from "../src/ui/treeLayout";
import { MAX_GUESSES } from "../src/constants";
import { dailyKeyForNow } from "./dailyKeyMirror";

// Shared fixtures for the browser E2E suite. See tasks/20260729-092258/DECISION.md
// for why modal state is injected via localStorage keyed off a frozen clock
// rather than the (not-yet-built) seed mode.

// The floor the painted node text is asserted against, DERIVED from the shipped
// constant rather than restated as a number. Restating it meant lowering
// `MIN_NODE_FONT_PX` left every spec green, so the Definition of Done's claim
// ("node text never renders below MIN_NODE_FONT_PX") was not actually pinned to
// anything. The half pixel is slack for the float arithmetic in the scale and
// the integer `offsetHeight` the painted size is divided by.
export const MIN_PAINTED_FONT_PX = MIN_NODE_FONT_PX - 0.5;

// Read the guesses-left counter the game renders, as a number.
async function guessesLeft(page: Page): Promise<number> {
    const text = (await page.locator("#stat-box").textContent()) ?? "";
    const match = text.match(/Guesses Left:\s*(\d+)/);
    return match ? Number(match[1]) : NaN;
}

// Type a query and submit the first suggestion, the way a player guesses:
// keyboard all the way through.
//
// This used to retry the whole type-and-submit and select by CLICKING, to work
// around `setupAutocomplete` hiding the box on an uncancelled 100ms timer -
// a stale timer could hide a live list, and the swallowed Enter then reached
// `src/game.ts` and submitted the raw typed text. 20260729-130138 fixed both
// halves, so the plain keyboard path is reliable again.
//
// What survives from that episode is the exit assertion. "The input went empty"
// was never evidence a guess landed, because the failure path empties it too,
// so the counter is what gets asserted - and EXACTLY one, not merely fewer,
// which is what would catch a double submit from both keydown listeners firing.
export async function guessFirstSuggestion(
    page: Page,
    query: string
): Promise<void> {
    const input = page.locator("#player-input");
    const box = page.locator("#autocomplete-box");
    const before = await guessesLeft(page);

    await input.click();
    await input.fill("");
    await input.fill(query);
    await expect(box.locator(".autocomplete-item").first()).toBeVisible();
    await input.press("Enter");

    await expect.poll(() => guessesLeft(page)).toBe(before - 1);
}

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

// Recompute the daily storage key the app uses, inside the browser, so it is
// derived from the SAME frozen `new Date()` the app sees. Must be called after
// page.clock has fixed the time. The mirror itself lives in
// `dailyKeyMirror.ts`, where a Jest test holds it to the real functions.
export function computeDailyKey(page: Page): Promise<string> {
    return page.evaluate(dailyKeyForNow);
}

// Read the real served content graph from the browser. Uses the actual payload
// (src/jurassic/index.json copied to /jurassic/index.json) rather than a mock,
// per the repo lesson mock-fixtures-hide-real-data-defects.
export function loadContent(
    page: Page
): Promise<{ speciesIds: string[]; speciesNames: string[] }> {
    return page.evaluate(async () => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        const speciesIds = Object.keys(raw.species);
        const speciesNames = speciesIds.map((id) => raw.species[id].species);
        return { speciesIds, speciesNames };
    });
}

type FinishedGame = {
    targetId: string;
    guesses: string[];
    lastGuessId?: string;
    hintClades?: string[];
};

// Write a finished daily game into localStorage so the next load renders the
// end-of-game modal deterministically. loadGameState() reads targetId straight
// from storage, so the chosen target does not have to match the real daily pick.
export async function seedFinishedDailyGame(
    page: Page,
    game: FinishedGame
): Promise<void> {
    const key = await computeDailyKey(page);
    await page.evaluate(
        ([storageKey, payload]) => {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    targetId: payload.targetId,
                    guesses: payload.guesses,
                    lastGuessId: payload.lastGuessId,
                    hintClades: payload.hintClades ?? [],
                    createdAt: new Date().toISOString(),
                })
            );
        },
        [key, game] as const
    );
}

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

// A URL src is "structurally valid" if it is a non-empty http(s) URL. The
// species-icon defect repaired by 20260729-092352 stored a stringified Python
// list ("['https://...svg']"); the leading-"[" guard is what keeps that shape
// failing, without needing the external CDN. See DECISION.md choice 4.
export function isStructurallyValidImageSrc(src: string | null): boolean {
    if (!src) return false;
    if (src.trim().startsWith("[")) return false;
    return (
        /^https?:\/\/.+/.test(src) ||
        src.startsWith("/") ||
        src.startsWith("data:")
    );
}

// ---------------------------------------------------------------------------
// Wide-tree fixture and arena geometry (task 20260729-092339).
//
// The tree only misbehaves once it is much wider than the arena, which takes a
// dozen guesses spread across the taxonomy. Everything below builds that state
// out of the SEEDED PRACTICE ROUND rather than a hand-written DOM fixture, so
// what the assertions measure is the tree the game actually renders.
// ---------------------------------------------------------------------------

// Seed 42 is the same round e2e/seed.spec.ts walks through. None of the guesses
// below is its target, so the round is still running when the fixture ends -
// `playWideTree` asserts exactly that rather than trusting it.
export const WIDE_TREE_SEED = 42;

// Twelve species covering all four branches under the root clade
// (eusaurischia, genasauria, herrerasauridae, ornithischia) at a spread of
// lineage depths, chosen to make the tree WIDE rather than deep. Derived from
// src/jurassic/index.json; if the content graph changes enough that these stop
// spanning the tree, the width assertion in `playWideTree` fails and says so.
export const WIDE_TREE_GUESSES = [
    "Ceratosaurus",
    "Edmontosaurus",
    "Herrerasaurus",
    "Heterodontosaurus",
    "Saltriovenator",
    "Pachyrhinosaurus",
    "Staurikosaurus",
    "Proceratosaurus",
    "Nodosaurus",
    "Fukuiraptor",
    "Stegosaurus",
    "Saltasaurus",
];

// Submit one named species. Distinct from `guessFirstSuggestion`, which takes
// whatever ranks first: here the species is chosen by EXACT item text. Prefix
// matches now outrank interior ones (task 20260729-141427), so typing
// "Ceratosaurus" does put it ahead of "Proceratosaurus" - but ranking is not a
// guarantee of uniqueness, and one species name can still be a prefix of
// another. A fixture that silently guesses a different animal is not a fixture,
// so it stays pinned to the exact text.
export async function guessNamedSpecies(
    page: Page,
    name: string
): Promise<void> {
    const input = page.locator("#player-input");
    const item = page
        .locator("#autocomplete-box .autocomplete-item")
        .filter({ hasText: new RegExp(`^${name}$`) });
    const before = await guessesLeft(page);

    await input.click();
    await input.fill("");
    await input.fill(name);
    // Click, not Enter: this helper's whole point is picking one UNAMBIGUOUS
    // species, and only the click can target an item by its exact text. Enter
    // takes whatever is highlighted, which is a ranking question, not an
    // identity one. (The retry loop that used to wrap this was the
    // 20260729-130138 blur-timer workaround, and is gone with the defect.)
    await item.click();
    await expect.poll(() => guessesLeft(page)).toBe(before - 1);

    // The tree draws every guessed species, so this proves the species that
    // landed is the one asked for and not a substring neighbour.
    await expect(
        page.locator("#tree-container .node-box").filter({
            hasText: new RegExp(`^${name}$`),
        })
    ).toHaveCount(1);
}

// Load the seeded practice round and play the wide-tree guess list. Returns the
// name of the last species guessed, which is the newest-guess anchor the
// specs assert on.
export async function playWideTree(page: Page): Promise<string> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    for (const name of WIDE_TREE_GUESSES) {
        await guessNamedSpecies(page, name);
    }

    // The round must still be running: a fixture that accidentally guessed the
    // target renders a finished board, and every geometry assertion after it
    // would be measuring the wrong screen.
    await expect(page.locator("#tree-container .node-mystery")).toHaveCount(1);

    // And the tree must actually overflow, or the assertions prove nothing
    // about the case this task exists for.
    await waitForTreeToSettle(page);
    const overflow = await page.evaluate(() => {
        const arena = document.getElementById("arena");
        return arena ? arena.scrollWidth / arena.clientWidth : 0;
    });
    expect(
        overflow,
        `the wide-tree fixture only reached ${overflow.toFixed(2)}x the arena width`
    ).toBeGreaterThan(1.2);

    return WIDE_TREE_GUESSES[WIDE_TREE_GUESSES.length - 1];
}

// Wait until nothing in the tree is still moving, so a geometry measurement
// samples the state the player ends up looking at.
//
// This is not optional bookkeeping. Every `.node-box` runs a `popIn` keyframe
// that scales it up from nothing, so a rect read straight after a guess is a
// frame of an animation rather than a layout. The first draft of the
// readability check measured "Saurischia" at 4.9px for exactly this reason -
// half its real painted size, because popIn was still running. Same trap as
// `waitForPanelToSettle` above, different element.
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

// Assert a tree node is wholly inside the arena's visible box. This is the
// heart of the task: after a guess the player must be LOOKING at the node, not
// merely able to reach it by scrolling.
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

// The arena's scroll extent must be the content, not the content plus a band of
// nothing. The `transform: scale()` this task replaces left the SCROLL box at
// the unscaled layout width while the transform painted a much smaller picture,
// so a third of the scroll range at each end was empty - which is what dumps
// the player in front of a blank arena, and the most plausible source of the
// original "cannot scroll left on android" report.
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

// Shrinking the tree to fit is only worth doing while the result is still
// readable. Measured as the PAINTED text size - the computed font size times
// whatever visual scale the node ends up at - so it is blind to how the scaling
// is implemented. The bucket classes this task removes bottomed out at 0.6,
// which painted the phone's 14.4px node text at 8.6px.
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

// Scroll the arena with a real touch gesture rather than by assigning
// scrollLeft, so what is proven is that Chromium's touch pipeline scrolls this
// element - the closest this harness gets to the Android Chrome behaviour the
// original bug report (20260331-154614) described. A real device remains a
// manual acceptance item on task 20260729-092339.
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

// Wait until the end-of-game modal has stopped moving.
//
// Not optional bookkeeping, and the direction of the error matters: `.modal`
// runs a `modalIn` keyframe that starts at `scale(0.8) translateY(20px)`, so a
// rect read straight after the overlay goes `active` reports a box up to 20%
// NARROWER and 20px lower than the layout. For an assertion about a row
// spilling past the viewport edge that is the dangerous direction - the broken
// layout measures as fitting. Wait for the animation to reach rest and read
// once. Same trap as `waitForTreeToSettle` and `waitForPanelToSettle`, third
// element.
//
// `subtree: true` because the row's controls animate too, not just the modal
// box: `.modal-btn` used to carry `transition: 0.2s` - which is `all`, padding
// included - so crossing the 768px breakpoint left the buttons at a padding
// belonging to neither layout for 0.2s. That transition is now narrowed to the
// three properties :hover actually changes, but reading the subtree keeps this
// honest against the next transition someone adds, and a measurement taken
// while a control is still resizing is not a measurement of the layout.
export async function waitForModalToSettle(page: Page): Promise<void> {
    await expect(page.locator("#modal-overlay")).toHaveClass(/active/);
    await page.locator("#modal").evaluate((el) => {
        // Force style and layout first: a transition started by a viewport
        // change does not exist as an Animation until the styles are
        // recalculated, and collecting before that would find nothing to wait
        // for and return immediately.
        el.getBoundingClientRect();
        return Promise.all(
            el
                .getAnimations({ subtree: true })
                // A resize that supersedes a running transition REJECTS its
                // finished promise. Settling is the goal, not completion.
                .map((a) => a.finished.catch(() => undefined))
        ).then(() => undefined);
    });
}

type MeasuredBox = {
    name: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
};

type ScrolledControl = {
    before: number;
    after: number;
    top: number;
    bottom: number;
    clipTop: number;
    clipBottom: number;
};

// Scroll `#modal` so the nth control in its action row is inside the container's
// clip box, and report the offset it took together with where the control landed.
// The clip box of an `overflow: auto` element is its PADDING box, so the borders
// come off the border box and the padding stays in - a control level with the
// padding is not clipped.
//
// The caller reads all six numbers: the offsets say whether the scroll was
// load-bearing, and the post-scroll rect against the clip box is the vertical
// containment assertion (see `expectActionsReachable`).
async function scrollModalTo(
    page: Page,
    index: number
): Promise<ScrolledControl> {
    return page.evaluate((i) => {
        const empty = {
            before: 0,
            after: 0,
            top: 0,
            bottom: 0,
            clipTop: 0,
            clipBottom: 0,
        };
        const modal = document.getElementById("modal");
        const control = modal?.querySelector(".modal-actions")?.children[i];
        if (!modal || !control) return empty;

        const before = modal.scrollTop;
        const box = modal.getBoundingClientRect();
        const cs = getComputedStyle(modal);
        const px = (v: string) => parseFloat(v || "0");
        const clipTop = box.top + px(cs.borderTopWidth);
        const clipBottom = box.bottom - px(cs.borderBottomWidth);

        const r = control.getBoundingClientRect();
        // Math.ceil, because Chromium snaps `scrollTop` to whole pixels while
        // this layout is fractional: assigning the exact 15.188px the control
        // needed landed on 15 and left 0.188px of it over the clip edge, at every
        // control and every short size (intersectionRatio 0.9955). Rounding UP is
        // rounding towards revealing more, and it is available - the offset used
        // is 16 of an available 43. It cannot mask a real failure: where nothing
        // scrolls, or the container is too short to hold the control, the offset
        // is inert or clamped and the assertion that follows still fails.
        if (r.bottom > clipBottom) {
            modal.scrollTop += Math.ceil(r.bottom - clipBottom);
        } else if (r.top < clipTop) {
            modal.scrollTop -= Math.ceil(clipTop - r.top);
        }

        // Re-read after the scroll: this is where the control ACTUALLY ended up,
        // which is the only position worth asserting about.
        const moved = control.getBoundingClientRect();
        return {
            before,
            after: modal.scrollTop,
            top: moved.top,
            bottom: moved.bottom,
            clipTop,
            clipBottom,
        };
    }, index);
}

// Every control in the action row can be brought WHOLLY on screen.
//
// This is the vertical half of `expectModalFitsViewport`'s promise, and it is a
// reachability claim rather than a visibility one because `.modal` scrolls its
// own content on a short viewport (see that helper's comment, and
// tasks/20260730-111003/DECISION.md).
//
// Three things make it discriminating rather than decorative:
//
//  - the overflow must be one a PLAYER can scroll, asserted separately from the
//    scrolling. This is the hole review round 1 found (R1.1): the pass writes
//    `scrollTop` itself, and in Chromium an `overflow: hidden` box IS
//    programmatically scrollable while being scrollable by neither touch nor
//    wheel. Changing this rule's `overflow-y: auto` to `hidden` therefore left
//    every action clipped 15px below the card at all five short viewports with
//    the whole modal suite GREEN - the assertion's own scroll manufactured the
//    pass. So wherever the modal has overflow at all, the computed `overflow-y`
//    is checked to be a value that gives the player a scroll. That also fails on
//    the pre-fix `visible`, for the same honest reason.
//  - the control must land inside the container's CLIP box, not merely inside
//    the viewport (R1.2). Reachability alone says nothing about containment, so
//    with the cap kept and `overflow` back to `visible` the three pills were
//    drawn straddling the card's bottom border, half on the backdrop, and
//    568x320 and 480x320 stayed green. A scroll container promises its contents
//    stay inside it; that is the vertical analogue of the horizontal
//    inner-box assertions in `expectModalFitsViewport`.
//  - `toBeInViewport({ ratio: 1 })` is an IntersectionObserver test, and the
//    intersection rect is clipped by every ancestor clip box on the way up. A
//    rect comparison is blind to an intermediate scroll container: a control
//    scrolled out of `.modal` still reports a layout rect inside the viewport,
//    which is the same trap `expectFullyVisibleWithin` documents for `#arena`.
//    Without this the whole check would go green on a modal whose buttons are
//    permanently below the fold.
//
// The scroll is computed from the geometry rather than delegated to
// `scrollIntoViewIfNeeded`, and it rounds UP. That is not preference. Chromium
// snaps `scrollTop` to whole pixels while this layout is fractional, so the
// offset a control needs - 15.188px at 568x320 - is not a position the container
// can hold: it lands on 15 and leaves 0.188px of the control over the clip edge
// (intersectionRatio 0.9955, at every control and every short size). The
// alternative was `ratio: 0.99`, i.e. a tolerance that would equally pass a
// control clipped by a real bug (LESSONS.md:
// never-add-a-tolerance-to-silence-an-undiagnosed-failure). Scrolling one whole
// pixel further keeps the question exact: does a scroll position exist at which
// the control is WHOLLY on screen? See `scrollModalTo`.
async function expectActionsReachable(page: Page): Promise<void> {
    const controls = page.locator(".modal-actions > *");
    const count = await controls.count();
    // A loop over nothing passes every assertion inside it, so the row's
    // population is asserted before it is walked.
    expect(count, "the modal action row rendered no controls").toBeGreaterThan(
        0
    );

    const modal = page.locator("#modal");
    const overflow = await modal.evaluate((el) => ({
        entryScrollTop: el.scrollTop,
        overflowing: el.scrollHeight > el.clientHeight,
        hidden: el.scrollHeight - el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
    }));

    // The escape hatch has to be a hatch. `hidden` and `clip` are scroll
    // containers a script can scroll and a finger cannot, and `visible` (the
    // pre-fix state) just spills the content somewhere unreachable.
    if (overflow.overflowing) {
        expect(
            ["auto", "scroll", "overlay"],
            `#modal has ${Math.round(overflow.hidden)}px of content past its own box but \`overflow-y: ${overflow.overflowY}\`, so a player cannot scroll to it - only this test can`
        ).toContain(overflow.overflowY);
    }

    for (let i = 0; i < count; i++) {
        const control = controls.nth(i);
        const label =
            ((await control.textContent()) ?? "").trim() || `child ${i + 1}`;
        const scrolled = await scrollModalTo(page, i);

        // One pixel of slack, as everywhere else here; the overflows under test
        // are tens of pixels.
        expect(
            scrolled.bottom,
            `the "${label}" action still hangs ${Math.round(scrolled.bottom - scrolled.clipBottom)}px below the modal's own box after scrolling it as far as it goes, so it is drawn outside the card`
        ).toBeLessThanOrEqual(scrolled.clipBottom + 1);
        expect(
            scrolled.top,
            `the "${label}" action still sits ${Math.round(scrolled.clipTop - scrolled.top)}px above the modal's own box after scrolling it as far as it goes, so it is drawn outside the card`
        ).toBeGreaterThanOrEqual(scrolled.clipTop - 1);

        await expect(
            control,
            `the "${label}" action cannot be brought wholly on screen: after scrolling the modal as far as it goes, part of it is still outside the viewport or clipped by an ancestor`
        ).toBeInViewport({ ratio: 1 });
    }

    // Put the scroll back where it was found - the value read on entry, not a
    // literal 0. The rect pass that follows and `expectActionsOnOneRow` both read
    // positions, and a scroll left behind here would move them: a measurement of
    // a state the player was never in.
    await modal.evaluate((el, top) => {
        el.scrollTop = top;
    }, overflow.entryScrollTop);
}

// Assert the game-over modal fits the viewport and EVERY control in its action
// row can be reached.
//
// The two axes make DIFFERENT promises, and the difference is deliberate:
//
//  - HORIZONTALLY nothing may overflow. The row wraps instead
//    (`.modal-actions` has `flex-wrap`), so a control outside the box or the
//    screen is always a bug. `overflow-y: auto` does compute `overflow-x` to
//    `auto` as well, so the modal can technically scroll sideways, but that is a
//    side effect of the vertical hatch and not a promise: nothing is allowed to
//    need it, and these assertions are what say so.
//  - VERTICALLY the promise is REACHABILITY, not visibility. Since
//    20260730-111003 `.modal` is capped at `calc(100% - 32px)` and scrolls its
//    own content, so on a landscape phone the action row legitimately starts
//    below the fold of that scroll container. "Every control is on screen right
//    now" is therefore unsatisfiable by design; "every control can be brought
//    wholly on screen" is what the player actually needs and what is asserted.
//
// The three passes run in a deliberate order, because each one aborts the test
// and the first to fire is the whole diagnosis the next reader gets:
//
//  1. the HORIZONTAL rects, which name the pixels and the container ("starts
//     14px left of the 393px viewport"). A horizontal overflow is unconditional
//     and always the most specific thing to say. It has to precede reachability:
//     `overflow-y: auto` computes `overflow-x` to `auto` as well, so a row too
//     wide for the modal is now clipped by the scroll container, and
//     `toBeInViewport` catches it as "cannot be brought wholly on screen" - true
//     but far less useful than the measured overflow. Verified by re-running the
//     20260729-141428 attack with every part of that fix reverted and the cap in
//     place: with this ordering it reports the 14px, not the vague message.
//  2. REACHABILITY, the player-facing vertical claim.
//  3. the `.modal` box's own vertical fit. Last, because at a size where a
//     control is genuinely out of reach the clipped box is a symptom and the
//     unreachable button is the bug: before this ordering all five short
//     viewports reported the same `.modal` clipping and the share button hanging
//     1.6px below the fold at 360x320 was never named.
//
// TWO containers for the horizontal pass, and both are load-bearing:
//
//  - the viewport, because the modal box itself was wider than the screen
//    (`width: 90%` on a content-box with 48px of padding either side), which a
//    check nested inside `.modal` could never have seen; and
//  - `.modal`'s own padding box, because the viewport check ALONE does not
//    discriminate the second overflow. At 320px the un-wrapped row measures
//    [17.2, 302.8] - inside a 320px viewport, so green - while the modal's
//    content box is [41.0, 279.0]: the controls sit 24px out over the modal's
//    padding and rounded border on each side. That is the "row wider than the
//    box" defect this task exists to fix, passing a viewport-only assertion.
//
// Every child of `.modal-actions` is measured, not a hand-listed pair, so a
// control added to the row later is covered without touching this helper. The
// two ids are then asserted PRESENT, so an empty or half-rendered row fails
// here instead of vacuously passing a loop over nothing.
export async function expectModalFitsViewport(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const measured = await page.evaluate(() => {
        const boxes: MeasuredBox[] = [];
        const record = (name: string, el: Element | null) => {
            if (!el) return;
            const r = el.getBoundingClientRect();
            boxes.push({
                name,
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
            });
        };

        const modal = document.getElementById("modal");
        record(".modal", modal);
        const row = document.querySelector(".modal-actions");
        record(".modal-actions", row);

        const controls: MeasuredBox[] = [];
        for (const child of Array.from(row?.children ?? [])) {
            const label = (child.textContent ?? "").trim() || "unlabelled";
            const name = child.id
                ? `#${child.id}`
                : `.modal-actions "${label}"`;
            record(name, child);
            const r = child.getBoundingClientRect();
            controls.push({
                name,
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
            });
        }

        // The modal's padding box: where its own content is allowed to be, i.e.
        // inside the border but including the padding the row must not spill
        // across.
        let inner = null;
        if (modal) {
            const r = modal.getBoundingClientRect();
            const cs = getComputedStyle(modal);
            const px = (v: string) => parseFloat(v || "0");
            inner = {
                left: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
                right: r.right - px(cs.borderRightWidth) - px(cs.paddingRight),
            };
        }

        return {
            boxes,
            controls,
            inner,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };
    });

    const names = measured.boxes.map((b) => b.name);
    expect(names, "the modal action row rendered no OK button").toContain(
        "#modal-close-btn"
    );
    expect(names, "the modal action row rendered no Share button").toContain(
        "#modal-share-btn"
    );

    const { viewportWidth: vw, viewportHeight: vh } = measured;
    for (const box of measured.boxes) {
        // One pixel of slack for subpixel layout, matching the other geometry
        // helpers here. The overflows under test are tens of pixels wide, so
        // this cannot be the difference between a pass and a fail.
        expect(
            box.left,
            `${box.name} starts ${Math.round(-box.left)}px left of the ${vw}px viewport`
        ).toBeGreaterThanOrEqual(-1);
        expect(
            box.right,
            `${box.name} extends ${Math.round(box.right - vw)}px past the right edge of the ${vw}px viewport`
        ).toBeLessThanOrEqual(vw + 1);
    }

    expect(measured.inner, "#modal is absent").not.toBeNull();
    if (!measured.inner) return;
    const inner = measured.inner;
    for (const control of measured.controls) {
        expect(
            control.left,
            `${control.name} starts ${Math.round(inner.left - control.left)}px left of the modal's own content box`
        ).toBeGreaterThanOrEqual(inner.left - 1);
        expect(
            control.right,
            `${control.name} extends ${Math.round(control.right - inner.right)}px past the right of the modal's own content box`
        ).toBeLessThanOrEqual(inner.right + 1);
    }

    // Pass 2: the vertical promise for the CONTENTS - reachability, not
    // visibility. After the horizontal rects, so a row too wide for the modal is
    // reported as the overflow it is rather than as a control the scroll
    // container clips.
    await expectActionsReachable(page);

    // Pass 3: vertically, the modal BOX. Its contents may sit outside it - that
    // is what the scroll container is for, and the pass above is what holds them
    // to being reachable. The box itself may not: capping it at
    // `calc(100% - 32px)` is the whole mechanism, so this is the assertion that
    // the cap is in force. Before the cap it read [-5.6, 325.6] against a 320px
    // viewport - clipped at both ends, with no way to scroll to either.
    //
    // Measured before the reachability pass, and safe to assert after it:
    // scrolling the modal's content does not move the modal's own box, and the
    // pass restores `scrollTop` regardless.
    const modalBox = measured.boxes.find((b) => b.name === ".modal");
    expect(modalBox, "#modal is absent").toBeDefined();
    if (!modalBox) return;
    expect(
        modalBox.top,
        `.modal starts ${Math.round(-modalBox.top)}px above the ${vh}px viewport, so its top edge is cut off with nothing able to scroll to it`
    ).toBeGreaterThanOrEqual(-1);
    expect(
        modalBox.bottom,
        `.modal extends ${Math.round(modalBox.bottom - vh)}px below the ${vh}px viewport, so its bottom edge is cut off with nothing able to scroll to it`
    ).toBeLessThanOrEqual(vh + 1);
}

// Assert the modal's actions are on a SINGLE row, with the margin stated.
//
// Separate from `expectModalFitsViewport` because it is not true at every size:
// the row deliberately wraps below ~393px, where three pills genuinely do not
// fit a phone. It is the promise made at the sizes where they DO fit - the
// desktop, and the 393px phone the reported overflow was measured on - and
// without it nothing distinguishes "fits" from "wrapped to two lines", so the
// button-padding trims that buy the single row are unguarded.
export async function expectActionsOnOneRow(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const row = await page.evaluate(() => {
        const actions = document.querySelector(".modal-actions");
        if (!actions) return null;
        const kids = Array.from(actions.children);
        const gap = parseFloat(getComputedStyle(actions).columnGap || "0");
        return {
            distinctTops: new Set(
                kids.map((c) => Math.round(c.getBoundingClientRect().top))
            ).size,
            needed:
                kids.reduce(
                    (sum, c) => sum + c.getBoundingClientRect().width,
                    0
                ) +
                gap * (kids.length - 1),
            available: actions.getBoundingClientRect().width,
            viewportWidth: window.innerWidth,
        };
    });

    expect(row, ".modal-actions is absent").not.toBeNull();
    if (!row) return;

    expect(
        row.distinctTops,
        `at ${row.viewportWidth}px the ${row.needed.toFixed(1)}px of actions wrapped inside a ${row.available.toFixed(1)}px row`
    ).toBe(1);
    expect(
        row.needed,
        `at ${row.viewportWidth}px the actions need ${row.needed.toFixed(1)}px of the row's ${row.available.toFixed(1)}px`
    ).toBeLessThanOrEqual(row.available);
}

// The species name for a species id, read from the real served payload.
async function speciesNameById(page: Page, id: string): Promise<string> {
    return page.evaluate(async (speciesId) => {
        const res = await fetch("/jurassic/index.json");
        const raw = (await res.json()) as {
            species: Record<string, { species: string }>;
        };
        return raw.species[speciesId]?.species ?? "";
    }, id);
}

// The target of the practice round currently in localStorage.
//
// Practice CANNOT be seeded the way the daily is: `src/practice.ts` always
// calls `createNewGameState` and never restores a save, so a finished round
// written into localStorage is simply ignored. The only way to reach the
// practice game-over modal is to play a round out - and the only way to know
// which species to guess is to spend one guess, which is what makes the app
// persist the state this reads. The key is found by prefix rather than
// recomputed from the seed, so the padding formula living in two places cannot
// silently drift (LESSONS.md: hand-copied-logic-mirrors-rot).
async function practiceTargetName(page: Page): Promise<string> {
    const targetId = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) =>
            k.startsWith("gameState-practice-")
        );
        if (!key) return "";
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as { targetId: string }).targetId : "";
    });
    expect(targetId, "no practice game state was persisted").not.toBe("");

    const name = await speciesNameById(page, targetId);
    expect(name, `no species named by id ${targetId}`).not.toBe("");
    return name;
}

// Play the seeded practice round to a WIN, and return the target's name.
export async function playSeededPracticeToWin(page: Page): Promise<string> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    // One guess to make the app persist the round, so the target can be read.
    // "saurus" is an interior match of many species names, so the list is
    // non-empty whatever the target is (same trick as e2e/seed.spec.ts).
    await guessFirstSuggestion(page, "saurus");
    await expect(
        page.locator("#modal-overlay"),
        "the throwaway guess hit the target, so this is not the 2-guess win it claims to be"
    ).not.toHaveClass(/active/);

    const target = await practiceTargetName(page);
    await guessNamedSpecies(page, target);

    await expect(page.locator("#modal-title")).toHaveText("You found it!");
    return target;
}

// Play the seeded practice round to a LOSS: every guess spent, none of them the
// target. The wrong guesses are taken from the served payload at run time and
// filtered against the target read after the first one, so no hand-kept list
// can rot into an accidental win.
export async function playSeededPracticeToLoss(page: Page): Promise<void> {
    await page.goto(`/practice/?seed=${WIDE_TREE_SEED}`);
    await page.waitForSelector("#tree-container .node-box");

    const { speciesNames } = await loadContent(page);
    const first = speciesNames[0];
    await guessNamedSpecies(page, first);

    const target = await practiceTargetName(page);
    expect(
        first,
        "the first guess was the target, so this round cannot lose"
    ).not.toBe(target);

    const wrong = speciesNames
        .filter((name) => name !== target && name !== first)
        .slice(0, MAX_GUESSES - 1);
    expect(
        wrong,
        `the payload has too few species to spend ${MAX_GUESSES} guesses`
    ).toHaveLength(MAX_GUESSES - 1);
    for (const name of wrong) {
        await guessNamedSpecies(page, name);
    }

    await expect(page.locator("#stat-box")).toContainText("Guesses Left: 0");
    await expect(page.locator("#modal-title")).toHaveText("Game Over");
}

// MAX_GUESSES species ids from the served payload, none of them the target:
// exactly enough wrong guesses to spend a whole round. Read at run time and
// filtered against the target, so no hand-kept list can rot into an accidental
// win. Shared by e2e/postgame.spec.ts and e2e/share.spec.ts rather than copied
// into both, per LESSONS.md
// `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`.
//
// Needs a page already on an app route, since `loadContent` fetches the payload
// through the page.
export async function wrongGuessIds(
    page: Page,
    targetId: string
): Promise<string[]> {
    const { speciesIds } = await loadContent(page);
    const wrong = speciesIds
        .filter((id) => id !== targetId)
        .slice(0, MAX_GUESSES);
    expect(
        wrong,
        `the payload has too few species to spend ${MAX_GUESSES} guesses`
    ).toHaveLength(MAX_GUESSES);
    return wrong;
}
