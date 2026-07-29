import { test, expect } from "@playwright/test";
import {
    expectPullTabInsideViewport,
    guessFirstSuggestion,
    expectTreeNotOccludedByPanel,
    expectNoBoxOverlap,
    expectFullyVisibleWithin,
    playWideTree,
    expectNodeVisibleInArena,
    expectNewestGuessFramed,
    expectNoDeadScrollBand,
    expectEveryNodeReachable,
    expectNodeTextReadable,
    touchScrollArena,
    MIN_PAINTED_FONT_PX,
} from "./helpers";

// Mobile viewport coverage (runs on the Pixel 5 project). The player must be
// able to see the primary game surface AND reach the guess input, without the
// info panel covering the control path.
test.describe("mobile game layout", () => {
    test("primary surface and guess input are both usable", async ({
        page,
    }) => {
        await page.goto("/");

        // The arena (tree) is the primary surface and must have real size.
        const arena = page.locator("#arena");
        await expect(arena).toBeVisible();
        const arenaBox = await arena.boundingBox();
        expect(arenaBox?.width ?? 0).toBeGreaterThan(0);
        expect(arenaBox?.height ?? 0).toBeGreaterThan(0);

        // The input must be visible, inside the viewport, and actually
        // clickable (not covered by the auto-opened panel). A trial click
        // fails if another element intercepts the pointer.
        const input = page.locator("#player-input");
        await expect(input).toBeVisible();
        const inputBox = await input.boundingBox();
        const viewport = page.viewportSize();
        expect(inputBox).not.toBeNull();
        if (inputBox && viewport) {
            expect(inputBox.y).toBeGreaterThanOrEqual(0);
            expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(
                viewport.height + 1
            );
        }
        await input.click({ trial: true });
    });

    // Was a test.fixme left by 20260729-092258 and owned by this task: on first
    // load the info panel auto-opened and, on a phone viewport, overlayed the
    // arena exactly (panel and #arena share the same box), so the tree - the
    // primary game surface - was hidden behind the hint card. 20260729-092315
    // stopped the first-load auto-open, so this is now a live regression pin on
    // the "player can see the primary surface" invariant.
    test("primary surface is not occluded by the info panel on first load", async ({
        page,
    }) => {
        await page.goto("/");
        await expectTreeNotOccludedByPanel(page);
    });

    // The 390x844-class first screen from the task's Definition of Done: the
    // panel is closed, and the tree plus the guess input are what the player
    // sees. Guards against a regression that re-opens the panel on load.
    test("first load shows the game, not the info panel", async ({ page }) => {
        await page.goto("/");

        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);

        // The tree is populated and the input is reachable behind no overlay.
        const tree = page.locator("#tree-container");
        await expect(tree).toBeVisible();
        await expect
            .poll(async () => (await tree.innerHTML()).trim().length)
            .toBeGreaterThan(0);
        await page.locator("#player-input").click({ trial: true });

        // The panel must not be covering the viewport: with the panel closed it
        // is translated off-screen, so its box starts at or past the right edge.
        const viewport = page.viewportSize();
        const panelBox = await panel.boundingBox();
        expect(panelBox).not.toBeNull();
        if (panelBox && viewport) {
            expect(panelBox.x).toBeGreaterThanOrEqual(viewport.width - 1);
        }

        // The hint is still one tap away via the always-present pull tab.
        const toggle = page.locator("#open-panel");
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(panel).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
    });

    // The core of task 20260729-141414 (playtest finding F3.5). Before the fix,
    // `renderLastGuess` ended in an unconditional `openPanel()`, and on a phone
    // `.info-panel` is `width: 100%` over `.game-area`, so from guess 1 onward
    // the player was shown a museum card INSTEAD of the tree feedback they had
    // just spent a guess on. On narrow viewports the auto-open is dropped; see
    // tasks/20260729-141414/DECISION.md.
    test("the tree stays visible after the first guess", async ({ page }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);
        await expect(page.locator("#tree-container")).toBeVisible();
        await expectTreeNotOccludedByPanel(page);

        // The card was still RENDERED - it is one tap away, not discarded.
        await expect(
            page.locator("#panel-card-container .card-title")
        ).not.toBeEmpty();
    });

    // Same shape, reached by reloading rather than by guessing (F3.6). Task
    // 20260729-125313 owns the general reload auto-open; this pins the phone
    // consequence, which the narrow-viewport rule fixes whatever triggered the
    // render.
    test("the tree stays visible after a mid-game reload", async ({ page }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        await page.reload();
        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 24"
        );

        await expect(page.locator("#info-panel")).not.toHaveClass(/active/);
        await expect(page.locator("#tree-container")).toBeVisible();
        await expectTreeNotOccludedByPanel(page);
    });

    // With no auto-open, the tab has to ANNOUNCE the card, or the player has no
    // way to know the guess produced a description worth reading (F3.3: it was
    // an unlabelled glyph clipped by the viewport edge).
    test("the pull tab is on screen, names the revealed clade, and opens it", async ({
        page,
    }) => {
        await page.goto("/");
        await expectPullTabInsideViewport(page);

        // Before any guess the tab is plain "Info": the starting hint is the
        // same root clade the tree already shows, so flagging it unseen would
        // spend the marker on information the player has not earned and cannot
        // act on.
        const tab = page.locator("#open-panel");
        await expect(tab).not.toHaveClass(/has-unseen/);
        await expect(tab.locator(".panel-pull-label")).toHaveText("Info");

        await guessFirstSuggestion(page, "saurus");

        // The label matches the card that was rendered but not shown, so the
        // player is told which clade the tab holds rather than just "info".
        const cladeName = (
            (await page
                .locator("#panel-card-container .card-title")
                .textContent()) ?? ""
        ).trim();
        expect(cladeName).not.toBe("");
        await expect(tab).toHaveClass(/has-unseen/);
        await expect(tab.locator(".panel-pull-label")).toHaveText(cladeName);
        await expectPullTabInsideViewport(page);

        // One tap shows the card and clears the unseen marker.
        await tab.click();
        await expect(page.locator("#info-panel")).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
        await expect(tab).not.toHaveClass(/has-unseen/);
        await expectPullTabInsideViewport(page);
    });

    // Buying a hint is an explicit request to see something, so it must show
    // something. Dropping the auto-open on phones broke that for the MID-GAME
    // hint specifically: `updateUI()` no longer opens the panel there, and
    // src/game.ts only opened it by hand before the first guess, so three spent
    // guesses bought a tree redraw and nothing else. Found in review round 1
    // (R1.4).
    test("a mid-game hint on a phone still shows its clade", async ({
        page,
    }) => {
        await page.goto("/");
        await guessFirstSuggestion(page, "saurus");

        // Precondition for the test to mean anything: the guess itself did NOT
        // open the panel, so the hint below is the only thing that can.
        const panel = page.locator("#info-panel");
        await expect(panel).not.toHaveClass(/active/);

        const hint = page.locator("#hint-box");
        await expect(hint).not.toHaveClass(/disabled/);
        await hint.click();

        await expect(page.locator("#stat-box")).toContainText(
            "Guesses Left: 21"
        );
        await expect(panel).toHaveClass(/active/);
        await expect(
            page.locator("#panel-card-container .card-title")
        ).toBeVisible();
    });

    // F3.9: before the first guess the two-node tree floated mid-arena with
    // large blank bands above and below it. The tree is now anchored near the
    // top, so the band above it is nothing but clearance for the #open-panel
    // pull tab.
    //
    // 20260729-141414 expressed this as `(treeTop - arenaTop) / arenaHeight <
    // 0.2`, normalised by the arena height to avoid encoding one device's pixel
    // count. 20260729-092327 had to replace the METRIC (not relax it): the
    // numerator is unchanged at 56px, but the arena is now shorter because the
    // band BELOW the tree is filled by the onboarding brief - so the ratio rose
    // to 0.23 precisely because the blank space F3.9 complained about stopped
    // being blank. A proxy that degrades when the thing it proxies for improves
    // is the wrong proxy.
    //
    // The replacement states the intent directly and is still device
    // independent: the band above the tree is the pull tab's clearance and
    // nothing more. It still fails the original F3.9 layout - the desktop 120px
    // padding would put the tree 76px below the tab.
    test("the pre-guess tree sits just below the pull tab, not mid-arena", async ({
        page,
    }) => {
        await page.goto("/");
        const tree = page.locator("#tree-container");
        await expect(tree).toBeVisible();

        // Measured inside the arena's CONTENT box (offsetTop), not from
        // viewport rects. #arena is a scroll container and renderTree scrolls it,
        // so a viewport-relative gap already has the auto-scroll subtracted out
        // and reads nearly the same however much padding sits above the tree -
        // it cannot tell the two layouts apart. Review round 2 caught exactly
        // that: with the anchor reverted to the desktop 120px, the
        // viewport-relative form read 25px and PASSED.
        const offset = await page.evaluate(() => {
            const arena = document.getElementById("arena");
            const tree = document.getElementById("tree-container");
            if (!arena || !tree) return null;
            return tree.offsetTop - arena.offsetTop;
        });

        expect(offset).not.toBeNull();
        if (offset === null) return;
        // Enough to clear the pull tab, which is 36px tall and sits 8px down...
        expect(
            offset,
            `the tree starts ${Math.round(offset)}px into the arena, under the pull tab`
        ).toBeGreaterThanOrEqual(44);
        // ...and no more, so the band is clearance and not a void. 56px here;
        // the pre-20260729-141414 layout put the tree 120px down and fails.
        expect(
            offset,
            `the tree floats ${Math.round(offset)}px into the arena, well below the pull tab`
        ).toBeLessThanOrEqual(72);
    });

    // The other half of F3.9, and the half this task owns: the room below the
    // pre-guess tree is filled rather than blank.
    test("the band below the pre-guess tree is filled, not blank", async ({
        page,
    }) => {
        await page.goto("/");

        const gap = await page.evaluate(() => {
            const tree = document.getElementById("tree-container");
            const brief = document.getElementById("onboarding-brief");
            if (!tree || !brief) return null;
            return (
                brief.getBoundingClientRect().y -
                tree.getBoundingClientRect().bottom
            );
        });

        expect(gap).not.toBeNull();
        if (gap === null) return;
        expect(gap).toBeGreaterThanOrEqual(-1);
        expect(
            gap,
            `${Math.round(gap)}px of blank band remains between the tree and the brief`
        ).toBeLessThan(100);
    });

    // The band F3.9 left below the pre-guess tree is what 20260729-092327 fills.
    // On this viewport it measured 239px before the change.
    test("the onboarding brief fills the band below the pre-guess tree", async ({
        page,
    }) => {
        await page.goto("/");

        const brief = page.locator("#onboarding-brief");
        await expect(brief).toBeVisible();

        const box = await brief.boundingBox();
        expect(box).not.toBeNull();
        if (!box) return;

        // Readable without a scroll on the viewport with least room, which is
        // the whole reason the copy is short. Measured against the clipping
        // ancestor rather than the viewport - .game-area clips, so a viewport
        // check passes while the brief's last lines are cut off.
        await expectFullyVisibleWithin(page, "#onboarding-brief", ".game-area");

        // Below the tree, not over it, and clear of the input.
        const treeBox = await page.locator("#tree-container").boundingBox();
        expect(treeBox).not.toBeNull();
        if (treeBox) {
            expect(box.y).toBeGreaterThanOrEqual(
                treeBox.y + treeBox.height - 1
            );
        }
        await expectNoBoxOverlap(page, "#onboarding-brief", ".bottom-bar");
    });

    test("the brief gives the band back to the tree after the first guess", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page.locator("#onboarding-brief")).toBeVisible();

        await guessFirstSuggestion(page, "Tyrannosaurus");

        await expect(page.locator("#onboarding-brief")).toBeHidden();
    });

    // Naming the hint's product makes the chip string much longer than the old
    // "Cost 3 Guesses". An always-on top-bar line is the shape the user
    // explicitly rejected (DECISION.md fork 1), so this copy change must not
    // smuggle its cost back in by wrapping .top-bar onto an extra row.
    // Measured baseline on this viewport before the change: 68px.
    // Asserted as the INVARIANT rather than as a pixel count. What the design
    // rejected is a separate always-on line in the top bar; a chip that is a
    // few px taller because its sentence wrapped is not that. A height
    // threshold conflated the two and was wrong in both directions: it passed
    // at 393px while the chip escaped sideways off the screen, and it failed at
    // 360px on a chip that had merely wrapped inside a still-single row.
    for (const size of [
        { width: 393, height: 727 },
        { width: 360, height: 740 },
        { width: 320, height: 568 },
    ]) {
        test(`the top bar stays one row at ${size.width}px`, async ({
            page,
        }) => {
            await page.setViewportSize(size);
            await page.goto("/");

            const rows = await page.evaluate(() => {
                const stat = document
                    .getElementById("stat-box")
                    ?.getBoundingClientRect();
                const hint = document
                    .getElementById("hint-box")
                    ?.getBoundingClientRect();
                return {
                    statMid: stat ? stat.y + stat.height / 2 : 0,
                    hintMid: hint ? hint.y + hint.height / 2 : 9999,
                };
            });
            // Compared on CENTRES, not top edges. `.top-bar` is
            // `align-items: center`, so once the chip's sentence wraps it is
            // taller than the counter and their TOPS differ by ~14px while they
            // still share a row - which is not the thing being guarded against.
            // Wrapping puts the chip on its own line below, moving the centres
            // apart by a whole row.
            expect(
                Math.abs(rows.statMid - rows.hintMid),
                "the counter and the hint chip are on different rows, so .top-bar has wrapped"
            ).toBeLessThan(10);

            // And the chip still says both things it must say, in full.
            await expect(page.locator("#hint-box")).toContainText(/stuck\?/i);
            await expect(page.locator("#hint-box")).toContainText(
                /spend 3 guesses to reveal a clade/i
            );
        });
    }

    // The inline error had NO phone coverage at all: playwright.config.ts binds
    // the mobile project with `testMatch: /mobile\.spec\.ts/`, so the desktop
    // spec's inline-error test never ran on a phone - and the phone is where it
    // broke. The messages quote the name the player typed, so they run to two or
    // three lines here, and an out-of-flow message with a fixed reservation had
    // its tail drawn behind the footer.
    for (const name of ["Notadinosaurus", "Micropachycephalosaurusrex"]) {
        test(`the rejection message for "${name}" is fully readable`, async ({
            page,
        }) => {
            await page.goto("/");

            const input = page.locator("#player-input");
            await input.click();
            await input.fill(name);
            await input.press("Enter");

            const error = page.locator("#input-error");
            await expect(error).toBeVisible();

            const geometry = await page.evaluate(() => {
                const err = document
                    .getElementById("input-error")
                    ?.getBoundingClientRect();
                const bar = document
                    .querySelector(".bottom-bar")
                    ?.getBoundingClientRect();
                const foot = document
                    .querySelector("footer")
                    ?.getBoundingClientRect();
                return {
                    errBottom: err?.bottom ?? 0,
                    errTop: err?.top ?? 0,
                    barBottom: bar?.bottom ?? 0,
                    footTop: foot?.top ?? Number.MAX_SAFE_INTEGER,
                    viewport: window.innerHeight,
                };
            });

            // Inside its own bar, above the footer, and on screen. Any one of
            // these failing means the player cannot read why the guess bounced.
            expect(
                geometry.errBottom,
                `#input-error overhangs .bottom-bar by ${Math.round(geometry.errBottom - geometry.barBottom)}px`
            ).toBeLessThanOrEqual(geometry.barBottom + 1);
            expect(
                geometry.errBottom,
                `#input-error runs ${Math.round(geometry.errBottom - geometry.footTop)}px into the footer`
            ).toBeLessThanOrEqual(geometry.footTop + 1);
            expect(geometry.errTop).toBeGreaterThanOrEqual(0);
            expect(geometry.errBottom).toBeLessThanOrEqual(
                geometry.viewport + 1
            );
        });
    }

    // The single-row check above is about VERTICAL cost; on its own it is
    // satisfied by a chip that stays on one row by running off the side of the
    // screen, which is exactly what the first attempt at the nowrap top bar did
    // (`.top-bar` was `width: 100%` plus padding, so 24px wider than the
    // viewport). Assert the readable thing directly, at the narrow widths where
    // there is least room for it.
    for (const size of [
        { width: 393, height: 727 },
        { width: 360, height: 740 },
        { width: 320, height: 568 },
    ]) {
        test(`the whole hint chip is on screen at ${size.width}px`, async ({
            page,
        }) => {
            await page.setViewportSize(size);
            await page.goto("/");

            const chip = await page.locator("#hint-box").boundingBox();
            const stat = await page.locator("#stat-box").boundingBox();
            expect(chip).not.toBeNull();
            expect(stat).not.toBeNull();
            if (!chip || !stat) return;

            expect(stat.x).toBeGreaterThanOrEqual(-1);
            expect(
                chip.x + chip.width,
                `hint chip runs ${Math.round(chip.x + chip.width - size.width)}px past the right edge`
            ).toBeLessThanOrEqual(size.width + 1);

            // Clipping is not the only way to lose the text: the chip could
            // also be squeezed until the sentence is truncated inside it.
            const overflows = await page.evaluate(() => {
                const el = document.getElementById("hint-text");
                if (!el) return true;
                return (
                    el.scrollWidth > el.clientWidth + 1 ||
                    el.scrollHeight > el.clientHeight + 1
                );
            });
            expect(overflows, "#hint-text is clipped inside the chip").toBe(
                false
            );
        });
    }
});

// Many-guess tree on a phone (task 20260729-092339). The desktop half is in
// e2e/tree.spec.ts; this is the size the bug was reported at and the size it is
// worst at. Measured on this viewport before the fix, with the twelve-guess
// fixture: 2152px of scroll range for a 393px arena, 4 of 24 nodes on screen,
// the mystery target 222px off the left edge - and on the short viewport below,
// ZERO of 24 nodes on screen. The arena was a blank rectangle with two clipped
// nodes at the right edge.
test.describe("many-guess tree on a phone", () => {
    // A short phone-shaped window, where the arena has least room and the
    // pre-fix resting position showed nothing at all. Kept as an explicit size
    // rather than a device profile so the height is the variable under test.
    const SHORT = { width: 393, height: 560 };

    test("the mystery target and the newest guess are both on screen", async ({
        page,
    }) => {
        const newest = await playWideTree(page);

        await expectNodeVisibleInArena(
            page,
            "#tree-container .node-mystery",
            "the mystery target"
        );
        await expectNewestGuessFramed(page, newest);
        await page.locator("#player-input").click({ trial: true });
    });

    test("the mystery target is on screen on a short phone too", async ({
        page,
    }) => {
        await page.setViewportSize(SHORT);
        const newest = await playWideTree(page);

        await expectNodeVisibleInArena(
            page,
            "#tree-container .node-mystery",
            "the mystery target"
        );
        await expectNewestGuessFramed(page, newest);
        await page.locator("#player-input").click({ trial: true });
    });

    test("the scroll range holds content, not empty bands", async ({
        page,
    }) => {
        await playWideTree(page);
        await expectNoDeadScrollBand(page);
    });

    test("every node can be scrolled into view", async ({ page }) => {
        await playWideTree(page);
        await expectEveryNodeReachable(page);
    });

    test("nodes stay readable however wide the tree gets", async ({ page }) => {
        await playWideTree(page);
        await expectNodeTextReadable(page, MIN_PAINTED_FONT_PX);
    });

    // The symptom the original report (20260331-154614) actually named: on
    // Android Chrome the tree could not be scrolled left. Driven here through
    // Chromium's touch pipeline rather than by assigning scrollLeft, which is
    // as close as this harness gets; a real device stays a manual acceptance
    // item on the task.
    test("a touch drag scrolls the tree both ways", async ({ page }) => {
        await playWideTree(page);

        const start = await page.evaluate(
            () => document.getElementById("arena")?.scrollLeft ?? NaN
        );

        // Finger drags left, so the tree moves left and scrollLeft grows.
        const afterRight = await touchScrollArena(page, -150);
        expect(
            afterRight,
            `dragging the finger left moved scrollLeft from ${start} to ${afterRight}`
        ).toBeGreaterThan(start);

        // Finger drags right: back the other way. This is the direction the
        // original report said was impossible on Android Chrome.
        const afterLeft = await touchScrollArena(page, 150);
        expect(
            afterLeft,
            `dragging the finger right moved scrollLeft from ${afterRight} to ${afterLeft}`
        ).toBeLessThan(afterRight);
    });

    // The other half of the resize story, and a regression this task's own
    // relayout listener introduced before review round 1 caught it: a resize
    // that does NOT change the picture must leave the player where they
    // scrolled to. On Android Chrome the URL bar hiding during a drag resizes
    // the layout viewport and fires `resize`; re-centring there would eat the
    // gesture, which is the same family of symptom as the original report.
    // `computeTreeScale` is a function of WIDTH alone, so a height-only change
    // cannot alter the scale and has nothing to re-frame.
    // Measured before the fix: scrollLeft 571 -> 0.
    test("a height-only resize does not throw away the player's scroll", async ({
        page,
    }) => {
        await playWideTree(page);

        const scrolled = await page.evaluate(() => {
            const arena = document.getElementById("arena");
            if (!arena) return NaN;
            arena.scrollLeft = arena.scrollWidth - arena.clientWidth;
            return arena.scrollLeft;
        });
        expect(
            scrolled,
            "the fixture left no room to scroll, so this proves nothing"
        ).toBeGreaterThan(0);

        const size = page.viewportSize();
        expect(size).not.toBeNull();
        if (!size) return;
        await page.setViewportSize({
            width: size.width,
            height: size.height - 60,
        });

        // Give the relayout its frames, then confirm nothing moved. Polled to
        // the timeout would pass on a handler that has not run yet, so wait
        // for two frames and read once.
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => resolve())
                    )
                )
        );
        const after = await page.evaluate(
            () => document.getElementById("arena")?.scrollLeft ?? NaN
        );
        expect(
            after,
            `a height-only resize moved scrollLeft from ${scrolled} to ${after}`
        ).toBeCloseTo(scrolled, 0);
    });

    // Turning the phone is a resize, and the pre-fix renderer sized and
    // scrolled once in a requestAnimationFrame after render with no listener
    // for anything after that.
    test("rotating to landscape brings the mystery target back on screen", async ({
        page,
    }) => {
        await playWideTree(page);
        await page.setViewportSize({ width: 851, height: 393 });

        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        const arena = document.getElementById("arena");
                        const node = document.querySelector(".node-mystery");
                        if (!arena || !node) return false;
                        const a = arena.getBoundingClientRect();
                        const n = node.getBoundingClientRect();
                        return (
                            n.left >= a.left - 1 &&
                            n.right <= a.right + 1 &&
                            n.top >= a.top - 1 &&
                            n.bottom <= a.bottom + 1
                        );
                    }),
                { timeout: 3000 }
            )
            .toBe(true);

        await expectNoDeadScrollBand(page);
    });
});
