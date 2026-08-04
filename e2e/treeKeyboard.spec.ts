import { test, expect, Page } from "@playwright/test";
import { playWideTree } from "./helpers/rounds";
import { waitForTreeToSettle } from "./helpers/tree";
import { guessNamedSpecies } from "./helpers/guessing";
import { CLOSENESS_LABELS } from "../src/closeness";

// The board itself from the keyboard. `renderTree` painted plain divs with a
// click listener, so a dozen guesses were reachable by pointer and by nothing
// else. This file pins the ARIA tree pattern end to end: the roles and labels a
// reader announces, one tab stop whatever the round has drawn, arrows along the
// drawn structure, Enter and Space onto the same card a click opens, an inert
// but announced mystery target, and a tab stop that survives the re-render
// every guess causes.
// See tasks/20260803-233105/DECISION.md.
//
// The fixture is the seeded PRACTICE round (`playWideTree`), which is why no
// clock pin appears here: the pin in tasks/20260804-000316/DECISION.md is for
// specs that open the DAILY page, and this one never does - the same reason
// e2e/tree.spec.ts, which shares this fixture, has none.
//
// Every expected destination is read back off the DRAWN tree rather than
// hard-coded or recomputed with `treeNav.ts`. A hard-coded id would assert a
// property of the seeded content, and a walker sharing the unit under test
// would agree with it however wrong both were.

// Enough presses to cross the whole page without being an unbounded loop. Every
// sweep asserts what it reached, so a too-small budget fails loudly.
const TAB_BUDGET = 60;

// Enough arrow presses to cross a twelve-guess tree twice over. Same rule.
const ARROW_BUDGET = 40;

// A node's `li`, by id, inside the tree.
const ITEM = (id: string) => `#tree-container [data-node-id="${id}"]`;

// What has focus, as either a tree node or a plain control, so a failure says
// where the sweep actually went.
function activeDescriptor(page: Page): Promise<string> {
    return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return "";
        const item = el.closest<HTMLElement>("#tree-container [data-node-id]");
        if (item) return `tree:${item.dataset.nodeId}`;
        return el.id ? `#${el.id}` : el.tagName.toLowerCase();
    });
}

// The id of the focused tree node, or null when focus is outside the tree.
async function activeNodeId(page: Page): Promise<string | null> {
    const descriptor = await activeDescriptor(page);
    return descriptor.startsWith("tree:") ? descriptor.slice(5) : null;
}

// Put focus on the tree's own tab stop, the way a Tab press does, and return
// the node it landed on.
async function focusTabStop(page: Page): Promise<string> {
    await page.locator("#tree-container [data-node-id][tabindex='0']").focus();
    const id = await activeNodeId(page);
    expect(
        id,
        "focusing the tree's tab stop focused no tree node"
    ).not.toBeNull();
    return id;
}

// Press Tab until `descriptor` has focus, returning everything seen on the way.
async function tabUntil(
    page: Page,
    descriptor: string
): Promise<{ reached: boolean; seen: string[] }> {
    const seen: string[] = [];
    for (let i = 0; i < TAB_BUDGET; i++) {
        await page.keyboard.press("Tab");
        const found = await activeDescriptor(page);
        seen.push(found);
        if (found === descriptor) return { reached: true, seen };
    }
    return { reached: false, seen };
}

// Drive focus to `nodeId` with arrow keys only, following the path the drawn
// tree says exists: up out of the current subtree, sideways to the one holding
// the destination, then down into it.
async function arrowTo(page: Page, nodeId: string): Promise<void> {
    for (let i = 0; i < ARROW_BUDGET; i++) {
        const current = await activeNodeId(page);
        expect(
            current,
            `focus left the tree while walking to ${nodeId}`
        ).not.toBeNull();
        if (current === nodeId) return;

        const key = await page.evaluate(
            ([fromId, toId]) => {
                const item = (id: string) =>
                    document.querySelector<HTMLElement>(
                        `#tree-container [data-node-id="${id}"]`
                    );
                const from = item(fromId);
                const to = item(toId);
                if (!from || !to) return "";
                if (from.contains(to)) return "ArrowDown";
                if (to.contains(from)) return "ArrowUp";
                // Neither contains the other: sideways when the destination is
                // under the same parent item, up otherwise.
                const parent = from.parentElement?.closest<HTMLElement>(
                    "#tree-container [data-node-id]"
                );
                if (!parent?.contains(to)) return "ArrowUp";
                const after =
                    from.compareDocumentPosition(to) &
                    Node.DOCUMENT_POSITION_FOLLOWING;
                return after ? "ArrowRight" : "ArrowLeft";
            },
            [current, nodeId] as const
        );
        expect(key, `no arrow path from ${current} to ${nodeId}`).not.toBe("");
        await page.keyboard.press(key);
    }
    throw new Error(
        `${ARROW_BUDGET} arrow presses did not reach ${nodeId}; focus is on ${await activeNodeId(page)}`
    );
}

// Is `ancestorId`'s item the one containing `descendantId`'s?
function contains(
    page: Page,
    ancestorId: string,
    descendantId: string
): Promise<boolean> {
    return page.evaluate(
        ([outer, inner]) => {
            const item = (id: string) =>
                document.querySelector<HTMLElement>(
                    `#tree-container [data-node-id="${id}"]`
                );
            const a = item(outer);
            const b = item(inner);
            return !!a && !!b && a !== b && a.contains(b);
        },
        [ancestorId, descendantId] as const
    );
}

// The child items drawn directly under `nodeId`.
function childIds(page: Page, nodeId: string): Promise<string[]> {
    return page.evaluate((id) => {
        const item = document.querySelector<HTMLElement>(
            `#tree-container [data-node-id="${id}"]`
        );
        if (!item) return [];
        return [...item.querySelectorAll<HTMLElement>("[data-node-id]")]
            .filter(
                (el) => el.parentElement?.closest("[data-node-id]") === item
            )
            .map((el) => el.dataset.nodeId ?? "");
    }, nodeId);
}

// The WIDEST sibling row on the board, so the sideways keys have somewhere to
// go whatever the seeded round put on screen - and so End is a real jump
// rather than the node ArrowRight already reaches, which is all it would be on
// a two-wide row.
async function branchingItem(
    page: Page
): Promise<{ id: string; children: string[] }> {
    const found = await page.evaluate(() => {
        const items = [
            ...document.querySelectorAll<HTMLElement>(
                "#tree-container [data-node-id]"
            ),
        ];
        let widest: { id: string; children: string[] } | null = null;
        for (const item of items) {
            const children = items
                .filter(
                    (el) => el.parentElement?.closest("[data-node-id]") === item
                )
                .map((el) => el.dataset.nodeId ?? "");
            if (
                children.length >= 2 &&
                children.length > (widest?.children.length ?? 0)
            )
                widest = { id: item.dataset.nodeId ?? "", children };
        }
        return widest;
    });
    expect(
        found,
        "the wide board drew no item with two children"
    ).not.toBeNull();
    return found as { id: string; children: string[] };
}

// The id, painted name and painted closeness tier of the first guessed species
// on the board. Read off the DOM rather than off the guess list, because what
// the keys have to reach is a node the renderer actually drew - and the tier is
// read off the `.node-close-*` class for the same reason: the label has to
// agree with the COLOUR that is on screen, not with a recomputed one.
async function firstGuessedSpecies(
    page: Page
): Promise<{ id: string; name: string; tier: number }> {
    const found = await page.evaluate(() => {
        const li = [
            ...document.querySelectorAll<HTMLElement>(
                "#tree-container [data-node-id]"
            ),
        ].find((el) =>
            el.querySelector(
                ":scope > .node-box.node-species:not(.node-mystery)"
            )
        );
        const box = li?.querySelector<HTMLElement>(":scope > .node-box");
        if (!li || !box) return null;
        const tier = [...box.classList]
            .map((name) => /^node-close-(\d+)$/.exec(name))
            .find(Boolean);
        return {
            id: li.dataset.nodeId ?? "",
            name: (box.textContent ?? "").trim(),
            tier: tier ? Number(tier[1]) : -1,
        };
    });
    expect(
        found,
        "the wide-tree board drew no guessed species node"
    ).not.toBeNull();
    expect(
        found?.tier,
        `${found?.id} is painted in no closeness tier`
    ).toBeGreaterThanOrEqual(0);
    return found as { id: string; name: string; tier: number };
}

// The node id of the mystery target.
async function mysteryNodeId(page: Page): Promise<string> {
    const id = await page.evaluate(() => {
        const li = document
            .querySelector("#tree-container .node-mystery")
            ?.closest<HTMLElement>("[data-node-id]");
        return li?.dataset.nodeId ?? "";
    });
    expect(id, "the board has no mystery target").not.toBe("");
    return id;
}

// The slack, per side, between a node's BOX and the arena's visible box.
// Negative on a side means the box hangs over it.
function boxSlack(
    page: Page,
    nodeId: string
): Promise<{
    left: number;
    right: number;
    top: number;
    bottom: number;
} | null> {
    return page.evaluate((id) => {
        const arena = document.getElementById("arena");
        const box = document
            .querySelector(`#tree-container [data-node-id="${id}"]`)
            ?.querySelector(":scope > .node-box");
        if (!arena || !box) return null;
        const a = arena.getBoundingClientRect();
        const n = box.getBoundingClientRect();
        return {
            left: n.left - a.left,
            right: a.right - n.right,
            top: n.top - a.top,
            bottom: a.bottom - n.bottom,
        };
    }, nodeId);
}

// The ROOT node of the drawn tree, which is the case the assertion exists for:
// an `li`'s own box spans its whole subtree, so the root's box is the whole
// board and `scrollIntoView({ block: "nearest" })` on the ITEM does nothing at
// all, leaving the node the player just focused above the fold.
async function rootNodeId(page: Page): Promise<string> {
    const id = await page.evaluate(
        () =>
            document.querySelector<HTMLElement>(
                "#tree-container [data-node-id]"
            )?.dataset.nodeId ?? ""
    );
    expect(id, "the board drew no nodes").not.toBe("");
    return id;
}

// Park the arena at the top and report the headroom a default page-down would
// have from there. `#arena` is the nearest scroll container above a tree item,
// so it is what Space scrolls.
//
// The parking is the point. `arrowTo` tends to leave the arena at its MAXIMUM,
// where a default scroll moves nothing and an unchanged-offset assertion holds
// with `preventDefault` deleted.
function parkArenaAtTop(page: Page): Promise<number> {
    return page.evaluate(() => {
        const arena = document.getElementById("arena");
        if (!arena) return 0;
        arena.scrollTop = 0;
        return arena.scrollHeight - arena.clientHeight;
    });
}

// Long enough for a keyboard scroll to have finished. Chromium ANIMATES one, so
// it is invisible in `scrollTop` on the tick after the press: reading straight
// away is how an earlier version of this assertion passed with
// `preventDefault` deleted. `waitForTreeToSettle` does not cover it - a smooth
// scroll is not a Web Animation.
const SCROLL_SETTLE_MS = 600;

async function settledArenaScrollTop(page: Page): Promise<number> {
    await page.waitForTimeout(SCROLL_SETTLE_MS);
    return page.evaluate(
        () => document.getElementById("arena")?.scrollTop ?? -1
    );
}

// Close the info panel if a guess left it open, so a later assertion about the
// panel is about the key press and not about what was already there.
async function closePanel(page: Page): Promise<void> {
    const panel = page.locator("#info-panel");
    if (await panel.evaluate((el) => el.classList.contains("active"))) {
        await page.locator("#open-panel").click();
    }
    await expect(panel).not.toHaveClass(/active/);
}

test.describe("walking the tree from the keyboard", () => {
    test("the board is announced as a named tree of labelled items", async ({
        page,
    }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // The ARIA layer is otherwise purely additive - nothing else on the
        // board reads it back, so every attribute here could be deleted or
        // replaced with a literal and the rest of the suite would stay green.
        const tree = page.locator("#tree-container ul[role='tree']");
        await expect(tree).toHaveCount(1);
        await expect(tree).toHaveAttribute("aria-label", "guess tree");

        // A clade owns its children through a group nested INSIDE its own
        // item, and says it is open: unmarked, a reader announces a leaf.
        const branch = await branchingItem(page);
        const item = page.locator(ITEM(branch.id));
        await expect(item).toHaveAttribute("aria-expanded", "true");
        const group = item.locator(":scope > ul[role='group']");
        await expect(group).toHaveCount(1);
        expect(
            await group.locator(":scope > [data-node-id]").count(),
            `${branch.id}'s group does not hold its ${branch.children.length} children`
        ).toBe(branch.children.length);

        // The warm/cold answer in words. This is the clause the whole label
        // exists for: the tier a sighted player reads as a colour has to be
        // announced, so the feedback is not colour-only.
        const species = await firstGuessedSpecies(page);
        const label = await page
            .locator(ITEM(species.id))
            .getAttribute("aria-label");
        expect(label, `${species.id} carries no aria-label`).not.toBeNull();
        expect(label).toContain(species.name);
        expect(
            label,
            `${species.id} is painted tier ${species.tier} but does not announce it`
        ).toContain(CLOSENESS_LABELS[species.tier]);
    });

    test("the tree is a single tab stop", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // The whole board, whatever its size, offers ONE tab stop. Asserted on
        // the attribute as well as through the sweep below, because the sweep
        // alone cannot tell "one stop" from "the budget ran out first".
        const stops = await page.evaluate(() => {
            const items = [
                ...document.querySelectorAll<HTMLElement>(
                    "#tree-container [data-node-id]"
                ),
            ];
            return {
                total: items.length,
                tabbable: items.filter((el) => el.tabIndex === 0).length,
            };
        });
        expect(
            stops.total,
            "the wide board drew too few nodes for this to prove anything"
        ).toBeGreaterThan(10);
        expect(stops.tabbable).toBe(1);

        // And a real sweep: Tab from the input all the way round to it again.
        await page.locator("#player-input").focus();
        const { reached, seen } = await tabUntil(page, "#player-input");
        expect(
            reached,
            `Tab never returned to #player-input in ${TAB_BUDGET} presses; saw ${seen.join(", ")}`
        ).toBe(true);

        expect(
            seen.filter((d) => d.startsWith("tree:")),
            `the tree took focus other than exactly once per cycle; saw ${seen.join(", ")}`
        ).toHaveLength(1);

        // The presses were delivered: other controls took focus too. Without
        // this the assertion above would pass on a page where Tab did nothing.
        expect(
            seen.filter((d) => d !== "" && !d.startsWith("tree:")),
            `no other control took focus during the sweep; saw ${seen.join(", ")}`
        ).not.toHaveLength(0);
    });

    test("arrows walk the tree", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // Up is the item CONTAINING the one focus came from, and down is that
        // item's first child.
        const start = await focusTabStop(page);
        await page.keyboard.press("ArrowUp");
        const parent = await activeNodeId(page);
        expect(parent).not.toBe(start);
        expect(
            await contains(page, parent, start),
            `${parent} is not the item containing ${start}`
        ).toBe(true);

        await page.keyboard.press("ArrowDown");
        const children = await childIds(page, parent);
        expect(await activeNodeId(page)).toBe(children[0]);

        // Right and left are the items drawn either side under one parent.
        const branch = await branchingItem(page);
        await arrowTo(page, branch.children[0]);
        await page.keyboard.press("ArrowRight");
        expect(await activeNodeId(page)).toBe(branch.children[1]);
        await page.keyboard.press("ArrowLeft");
        expect(await activeNodeId(page)).toBe(branch.children[0]);

        // End and Home are the ends of that same sibling row - scoped to the
        // siblings rather than to the whole tree, because the board is drawn
        // transposed (DECISION.md). Pressed here rather than only in
        // `treeNav.test.ts`, which exercises the `"home"`/`"end"` directions
        // but never the KEYS: without these two presses the bindings can be
        // deleted from `KEY_DIRECTIONS` with the whole suite green.
        const last = branch.children[branch.children.length - 1];
        await page.keyboard.press("End");
        expect(await activeNodeId(page)).toBe(last);
        await page.keyboard.press("Home");
        expect(await activeNodeId(page)).toBe(branch.children[0]);

        // A move off the end leaves focus where it was, rather than wrapping
        // or dropping out of the tree onto the page.
        await page.keyboard.press("ArrowLeft");
        expect(await activeNodeId(page)).toBe(branch.children[0]);

        // Same at the top: walk up to the root and press up once more.
        let root = await activeNodeId(page);
        for (let i = 0; i < ARROW_BUDGET; i++) {
            await page.keyboard.press("ArrowUp");
            const above = await activeNodeId(page);
            if (above === root) break;
            root = above;
        }
        expect(
            await page
                .locator(ITEM(root))
                .evaluate((el) =>
                    Boolean(el.parentElement?.closest("[data-node-id]"))
                ),
            `${root} still has an item above it, so the walk up stopped early`
        ).toBe(false);
        await page.keyboard.press("ArrowUp");
        expect(await activeNodeId(page)).toBe(root);
    });

    for (const key of ["Enter", " "] as const) {
        const keyName = key === " " ? "Space" : key;

        test(`${keyName} opens the focused node's card`, async ({ page }) => {
            await playWideTree(page);
            await waitForTreeToSettle(page);
            await closePanel(page);

            const species = await firstGuessedSpecies(page);
            await focusTabStop(page);
            await arrowTo(page, species.id);

            await page.keyboard.press(key);

            // The same end state a click produces: the panel forward, with
            // THAT species' card in it.
            await expect(page.locator("#info-panel")).toHaveClass(/active/);
            await expect(
                page.locator("#panel-card-container .card-title")
            ).toHaveText(species.name);
        });
    }

    test("Space does not scroll the board", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);
        await closePanel(page);

        // On the INERT mystery node, which is where the suppressed default is
        // observable at all: `preventDefault` runs before the `aria-disabled`
        // guard, so it is the same statement the card tests exercise, but no
        // card opens on top of it. Measured on a node that DOES open one, the
        // panel's own relayout leaves the arena back at the offset the press
        // started from, and the assertion holds either way.
        const mystery = await mysteryNodeId(page);
        await focusTabStop(page);
        await arrowTo(page, mystery);

        const headroom = await parkArenaAtTop(page);
        expect(
            headroom,
            "the arena could not scroll, so this proves nothing"
        ).toBeGreaterThan(0);

        await page.keyboard.press(" ");

        // Without `preventDefault` this is a full page-down: 0 -> 162 at
        // 1280x720 on this board.
        expect(
            await settledArenaScrollTop(page),
            "Space paged the arena down instead of being claimed by the node"
        ).toBe(0);
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);
    });

    test("an arrow move brings the focused node into view", async ({
        page,
    }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // The root, which the wide board's opening frame leaves above the fold:
        // the arena is anchored on the target, and the tree is taller than it.
        const root = await rootNodeId(page);
        const before = await boxSlack(page, root);
        expect(
            Math.min(...Object.values(before ?? {})),
            `${root} was already fully on screen, so this proves nothing: ${JSON.stringify(before)}`
        ).toBeLessThan(0);

        await focusTabStop(page);
        await arrowTo(page, root);
        await waitForTreeToSettle(page);

        const slack = await boxSlack(page, root);
        expect(slack, `${root} vanished from the board`).not.toBeNull();
        // Each number is the slack on that side; negative means it hangs over.
        expect(
            Math.min(...Object.values(slack ?? {})),
            `${root} is still outside the arena: ${JSON.stringify(slack)} (slack per side, px)`
        ).toBeGreaterThanOrEqual(-1);
    });

    test("the mystery target is announced but inert", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);
        await closePanel(page);

        const mystery = await mysteryNodeId(page);
        const item = page.locator(ITEM(mystery));
        // Announced as a disabled item rather than omitted: a hole where the
        // answer is would be worse than a node that says it cannot be opened.
        await expect(item).toHaveAttribute("role", "treeitem");
        await expect(item).toHaveAttribute("aria-disabled", "true");

        await focusTabStop(page);
        await arrowTo(page, mystery);
        await page.keyboard.press("Enter");

        // `.node-mystery` sets `pointer-events: none`, which stops a pointer
        // and nothing else, so the keyboard needs its own guard - the same
        // wrong-guard trap tasks/20260729-212743 hit on the hint chip.
        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);
    });

    test("the tab stop survives a guess", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        const species = await firstGuessedSpecies(page);
        await focusTabStop(page);
        await arrowTo(page, species.id);

        // Out of the tree the way a player leaves it: forward to the input,
        // which is where the next guess is typed. (Forward, not Shift+Tab:
        // #player-input is AFTER #tree-container in src/index.html.)
        const toInput = await tabUntil(page, "#player-input");
        expect(
            toInput.reached,
            `Tab never reached #player-input; saw ${toInput.seen.join(", ")}`
        ).toBe(true);

        await guessNamedSpecies(page, "Velociraptor");
        await waitForTreeToSettle(page);

        const back = await tabUntil(page, `tree:${species.id}`);
        expect(
            back.reached,
            `the tab stop was not on ${species.id} after a guess; saw ${back.seen.join(", ")}`
        ).toBe(true);
    });

    test("clicking a node moves the tab stop to it", async ({ page }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // Arrows and the pointer drive the same widget, so the roving
        // `tabindex` has to follow both. A click focuses the nearest focusable
        // ancestor without going through the key handler; unsynced, Tab would
        // later land on the arrowed-to node rather than the clicked one.
        const walked = await focusTabStop(page);
        const branch = await branchingItem(page);
        const clicked = branch.children.find((id) => id !== walked) ?? "";
        expect(clicked, "every child was already the tab stop").not.toBe("");

        await page.locator(`${ITEM(clicked)} > .node-box`).click();

        expect(await activeNodeId(page)).toBe(clicked);
        await expect(page.locator(ITEM(clicked))).toHaveAttribute(
            "tabindex",
            "0"
        );
        expect(
            await page.locator("#tree-container [tabindex='0']").count()
        ).toBe(1);
    });

    test("a modified direction key is left to the browser", async ({
        page,
    }) => {
        await playWideTree(page);
        await waitForTreeToSettle(page);

        // Alt+ArrowLeft is Back and Ctrl+Home is document-start. Claiming the
        // bare key is the widget's job; claiming the chord steals the browser's.
        const branch = await branchingItem(page);
        await focusTabStop(page);
        await arrowTo(page, branch.children[0]);

        await page.keyboard.press("Alt+ArrowRight");
        expect(await activeNodeId(page)).toBe(branch.children[0]);
        await page.keyboard.press("Control+End");
        expect(await activeNodeId(page)).toBe(branch.children[0]);

        // The delivery guard: the same keys unmodified DO move focus, so the
        // two assertions above are about the modifier and not about a dead
        // keyboard.
        await page.keyboard.press("ArrowRight");
        expect(await activeNodeId(page)).toBe(branch.children[1]);
    });
});
