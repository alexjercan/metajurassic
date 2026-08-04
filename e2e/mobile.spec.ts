import { test, expect } from "@playwright/test";
import { guessFirstSuggestion, guessNamedSpecies } from "./helpers/guessing";
import { loadContent, seedFinishedDailyGame } from "./helpers/content";
import {
    playWideTree,
    playSeededPracticeToWin,
    playSeededPracticeToLoss,
} from "./helpers/rounds";
import {
    MIN_PAINTED_FONT_PX,
    expectNodeVisibleInArena,
    expectNewestGuessFramed,
    expectNodeTextReadable,
} from "./helpers/tree";
import {
    expectNoDeadScrollBand,
    expectEveryNodeReachable,
    touchScrollArena,
} from "./helpers/arena";
import {
    expectPullTabInsideViewport,
    expectTreeNotOccludedByPanel,
} from "./helpers/panel";
import {
    expectModalFitsViewport,
    expectModalNeedsNoScroll,
    expectModalStillScrolls,
    expectActionsOnOneRow,
    expectStatCardFits,
    expectStatCardOnOneRow,
} from "./helpers/modal";
import {
    expectNoBoxOverlap,
    expectFullyVisibleWithin,
} from "./helpers/viewport";
import { MAX_GUESSES } from "../src/constants";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle. `guessFirstSuggestion(page, "saurus")` below always
// guesses Ceratosaurus, so on a real-calendar day whose target IS
// Ceratosaurus this fixture WINS on guess 1 and the win modal swallows every
// later click. Load-bearing, not boilerplate - see
// tasks/20260804-000316/DECISION.md.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

// Phone sizes the game-over modal must hold at. 393px is the Pixel 5 this
// project runs (the width the reported overflow was measured on); 360px is the
// commonest Android width; 320px is the narrowest phone viewport still in use
// and the case with the least room for the action row. The last entry is short
// rather than narrow: every other size here is tall enough that the modal's
// ~331px cannot reach the fold, so without it the helper's top/bottom
// assertions could not fail anywhere in the swept set (LESSONS.md:
// a-layout-assertion-at-one-viewport-is-a-sample-of-one - a sweep that cannot
// fail on an axis has not covered that axis).
const NARROW_VIEWPORTS = [
    { width: 393, height: 851 },
    { width: 360, height: 640 },
    { width: 320, height: 568 },
    { width: 393, height: 500 },
];

// Short viewports, where the constraint is HEIGHT rather than width: the phone
// held sideways, and the Android split-screen and desktop-resize sizes below it.
// Every entry above is tall enough that the modal fits, so on its own that sweep
// cannot fail on the vertical axis at all (LESSONS.md:
// turn-every-axis-word-in-a-plan-into-a-number-before-ticking-it).
//
// The numbers, measured on master before the fix (win and loss modal alike -
// both render 331.2px tall, or 381.2px once the action row wraps):
//
//   568x320  iPhone SE landscape, the reported size. .modal [-5.6, 325.6]:
//            the BOX is clipped 5.6px at top AND bottom, while every control
//            still sits inside the viewport. This size does not fail on a
//            control - it fails on the modal being cut off at both ends.
//   480x320  the same, one width down: .modal [-5.6, 325.6].
//   640x360  fits today, .modal [14.4, 345.6] with 14.4px to spare. The control
//            size: the sweep must contain a height the old CSS satisfies, or
//            "the sweep goes red" would not distinguish a height problem from a
//            broken fixture.
//   360x320  narrow AND short, so the row wraps to 92px and the modal is
//            381.2px: #modal-share-btn bottom 321.6 against a 320px viewport -
//            1.6px below the fold, a control genuinely off screen.
//   360x300  the same shape with the margin no longer hairline: share button
//            bottom 311.6 against 300px, 11.6px below the fold.
//
// In the four that do not fit, .modal-overlay reports overflowY: visible with
// scrollHeight > clientHeight and the document does not scroll: the overflow
// exists and nothing can reach it. (640x360 has no overflow to reach - measured
// scrollHeight 360 against clientHeight 360 - which is what makes it the control
// size.)
//
// `fits` is the no-scroll promise, which is NOT made at every size here.
// 20260730-160720 compacts the card below 480px of height so the whole thing is
// visible at once at the three widest sizes; at 360px BOTH rows wrap
// (both .modal-extras-grid and .modal-actions take a second line) and the compacted
// card is still 362px against a 266px budget, so those two keep the scroll
// deliberately. Reachability - the escape hatch - is asserted at all five either
// way. Measured on master at bb17dcd, win and loss identical:
//
//   568x320  433px of content in a 286px box, 147px below the fold
//   480x320  the same 433 against 286
//   640x360  433 against 326, 107px below
//   360x320  543 against 286 (both rows wrapped), 257px below
//   360x300  543 against 266, 277px below
const SHORT_VIEWPORTS = [
    { width: 568, height: 320, fits: true },
    { width: 480, height: 320, fits: true },
    { width: 640, height: 360, fits: true },
    { width: 360, height: 320, fits: false },
    { width: 360, height: 300, fits: false },
];

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

    // The info panel used to auto-open on first load and, on a phone viewport,
    // overlayed the arena exactly (panel and #arena share the same box), so the
    // tree - the primary game surface - was hidden behind the hint card.
    // 20260729-092315 stopped the first-load auto-open; this is the regression
    // pin on the "player can see the primary surface" invariant.
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

        // Brachiosaurus by name, NOT the usual `guessFirstSuggestion(page,
        // "saurus")`. The marker only lights when a guess DEEPENS the best
        // clade past the root card already on screen, so this test needs a
        // guess related to the day's target. Against the pinned day's Eoraptor,
        // Triceratops meets it only at dinosauria - the root - and the card
        // never changes; Brachiosaurus meets it at sauropodomorpha. That the
        // test used to pass was the calendar handing it a related target; see
        // tasks/20260804-000316/TASK.md.
        await guessNamedSpecies(page, "Brachiosaurus");

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
    // guesses bought a tree redraw and nothing else.
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
        await expect(hint).not.toBeDisabled();
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
        // it cannot tell the two layouts apart: with the anchor reverted to the
        // desktop 120px, the viewport-relative form read 25px and PASSED.
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
    //
    // Run over BOTH pages. The practice page renders the same template plus the
    // New game button (tasks/20260729-101754), so it is the crowded version of
    // this bar - and every case here used to load `/` only, where that button
    // is hidden, leaving the bar that actually has three items in it unmeasured
    // (LESSONS.md `a-layout-assertion-at-one-viewport-is-a-sample-of-one`).
    for (const path of ["/", "/practice/"]) {
        for (const size of [
            { width: 393, height: 727 },
            { width: 360, height: 740 },
            { width: 320, height: 568 },
        ]) {
            test(`the top bar stays one row at ${size.width}px on ${path}`, async ({
                page,
            }) => {
                await page.setViewportSize(size);
                await page.goto(path);
                // The whole point of the /practice/ pass is the CROWDED bar. If
                // the button ever stopped being revealed, these cases would
                // silently become duplicates of the "/" cases and stay green.
                if (path === "/practice/") {
                    await expect(page.locator("#new-game-btn")).toBeVisible();
                }

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
                await expect(page.locator("#hint-box")).toContainText(
                    /stuck\?/i
                );
                await expect(page.locator("#hint-box")).toContainText(
                    /spend 3 guesses to reveal a clade/i
                );
            });
        }
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
    // Also run over both pages: the New game button takes its width out of the
    // chip's flex share, so the practice page is where the chip is squeezed
    // hardest and where it would be clipped first.
    for (const path of ["/", "/practice/"]) {
        for (const size of [
            { width: 393, height: 727 },
            { width: 360, height: 740 },
            { width: 320, height: 568 },
        ]) {
            test(`the whole hint chip is on screen at ${size.width}px on ${path}`, async ({
                page,
            }) => {
                await page.setViewportSize(size);
                await page.goto(path);
                // The whole point of the /practice/ pass is the CROWDED bar. If
                // the button ever stopped being revealed, these cases would
                // silently become duplicates of the "/" cases and stay green.
                if (path === "/practice/") {
                    await expect(page.locator("#new-game-btn")).toBeVisible();
                }

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

    // The other half of the resize story, and a regression the relayout
    // listener itself introduced: a resize that does NOT change the picture
    // must leave the player where they scrolled to. On Android Chrome the URL
    // bar hiding during a drag resizes the layout viewport and fires `resize`;
    // re-centring there would eat the gesture, which is the same family of
    // symptom as the original report.
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

// The finished round on a phone. The playtest pass (tasks/20260729-092435,
// NOTES.md F3.8) caught the game-over modal's action row spilling off both
// edges of a Pixel 5: "OK" clipped at x=0 and "Share" - the retention action -
// hanging off the right. Two separate CSS overflows produced it (see
// tasks/20260729-141428/TASK.md), so these pin the OUTCOME (every control on
// screen) rather than either rule.
//
// Daily rounds are injected into localStorage off a frozen clock; practice
// cannot be (it always rolls a fresh state) and is played out for real. Both
// pages render the same three-button row from src/index.html, so the four cases
// are a divergence guard, not four different widths.
test.describe("mobile game-over modal", () => {
    test.describe("daily", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/");
        });

        test("every win action is on screen", async ({ page }) => {
            const { speciesIds } = await loadContent(page);
            const target = speciesIds[0];
            await seedFinishedDailyGame(page, {
                targetId: target,
                guesses: [target],
                lastGuessId: target,
            });
            await page.reload();

            await expect(page.locator("#modal-title")).toHaveText(
                "You found it!"
            );
            await expectModalFitsViewport(page);
            // At the Pixel 5's 393px the three actions are meant to sit on ONE
            // row - that is what the trimmed button padding and gap buy, and
            // fitting the viewport does not prove it (a row wrapped to two
            // lines fits too).
            await expectActionsOnOneRow(page);
        });

        test("every loss action is on screen", async ({ page }) => {
            const { speciesIds } = await loadContent(page);
            const target = speciesIds[0];
            const wrong = speciesIds.slice(1, 26);
            expect(wrong).toHaveLength(25);
            await seedFinishedDailyGame(page, {
                targetId: target,
                guesses: wrong,
                lastGuessId: wrong[wrong.length - 1],
            });
            await page.reload();

            await expect(page.locator("#modal-title")).toHaveText("Game Over");
            await expectModalFitsViewport(page);
        });

        // The daily stats card is the other row in this box that can wrap, and
        // it is the one this modal grew. `expectModalFitsViewport` walks
        // `.modal-actions`, so nothing there measures these four cells at all.
        test("the stats card fits the modal at every narrow width", async ({
            page,
        }) => {
            const { speciesIds } = await loadContent(page);
            const target = speciesIds[0];
            await seedFinishedDailyGame(page, {
                targetId: target,
                guesses: [target],
                lastGuessId: target,
            });
            await page.reload();
            await expect(page.locator("#modal-extras")).toBeVisible();

            for (const size of NARROW_VIEWPORTS) {
                await page.setViewportSize(size);
                await expectStatCardFits(page);
            }
        });

        // The promise the cell floor and gap buy, stated as a number. Fitting
        // the modal does not prove it: a card wrapped to 3+1 - which is what
        // the cells rendered before they were given `box-sizing: border-box` -
        // fits too, and looks unfinished.
        test("the stats card is one row on the 393px phone", async ({
            page,
        }) => {
            const { speciesIds } = await loadContent(page);
            const target = speciesIds[0];
            await seedFinishedDailyGame(page, {
                targetId: target,
                guesses: [target],
                lastGuessId: target,
            });
            await page.reload();
            await expect(page.locator("#modal-extras")).toBeVisible();

            await expectStatCardOnOneRow(page);
        });

        // A single viewport is a sample of one (LESSONS.md:
        // a-layout-assertion-at-one-viewport-is-a-sample-of-one). The Pixel 5's
        // 393px is not the narrowest phone in use, and the row has to hold at
        // 320px too - the width where the three buttons have the least room.
        test("the actions stay on screen down to a 320px phone", async ({
            page,
        }) => {
            const { speciesIds } = await loadContent(page);
            const target = speciesIds[0];
            await seedFinishedDailyGame(page, {
                targetId: target,
                guesses: [target],
                lastGuessId: target,
            });
            await page.reload();
            await expect(page.locator("#modal-title")).toHaveText(
                "You found it!"
            );

            for (const size of NARROW_VIEWPORTS) {
                await page.setViewportSize(size);
                await expectModalFitsViewport(page);
            }
        });

        // The other axis. NARROW_VIEWPORTS is a sweep of widths - every height
        // in it clears the modal - so the vertical half of the assertion could
        // not fail anywhere in it. These are the sizes where HEIGHT is the
        // constraint: see SHORT_VIEWPORTS for the measured numbers.
        //
        // ONE TEST PER SIZE, deliberately, rather than a loop inside a single
        // case. A loop stops at its first failing size, so the whole short sweep
        // reported exactly one number - `.modal` clipped 5.6px at 568x320 - and
        // said nothing about the other four. The Definition of Done asks which
        // assertion fires at WHICH size, and the suite is the thing that has to
        // answer that on the next regression too, not just in this task's notes.
        //
        // Both modal variants, because the loss message is the longer string and
        // the win modal is what a finished round usually shows; they measure the
        // same 331.2px today, and asserting only one would not notice if a later
        // change made one of them taller.
        for (const variant of ["win", "loss"] as const) {
            for (const size of SHORT_VIEWPORTS) {
                test(`every ${variant} action is reachable at ${size.width}x${size.height}`, async ({
                    page,
                }) => {
                    const { speciesIds } = await loadContent(page);
                    const target = speciesIds[0];
                    const guesses =
                        variant === "win"
                            ? [target]
                            : speciesIds.slice(1, 1 + MAX_GUESSES);
                    if (variant === "loss") {
                        expect(guesses).toHaveLength(MAX_GUESSES);
                    }
                    await seedFinishedDailyGame(page, {
                        targetId: target,
                        guesses,
                        lastGuessId: guesses[guesses.length - 1],
                    });
                    // Before the reload, so the modal is laid out at the size
                    // under test and never at the project's default: a modal
                    // measured after a resize is a modal that has been through a
                    // reflow the player never performs.
                    await page.setViewportSize(size);
                    await page.reload();
                    await expect(page.locator("#modal-title")).toHaveText(
                        variant === "win" ? "You found it!" : "Game Over"
                    );

                    await expectModalFitsViewport(page);
                    // And at the sizes the compaction reaches, reachable is not
                    // enough: the whole card is on screen at once, with no
                    // scroll to discover. The other two are asserted to STILL
                    // overflow, because they are what keeps the escape hatch
                    // exercised - see `expectModalStillScrolls`.
                    if (size.fits) {
                        await expectModalNeedsNoScroll(page);
                    } else {
                        await expectModalStillScrolls(page);
                    }
                });
            }
        }
    });

    test.describe("practice", () => {
        // A real playthrough: a page load plus up to 25 guesses, each of which
        // waits on the autocomplete and the counter, so this needs more than
        // the default per-test budget.
        test.setTimeout(180_000);

        test("every win action is on screen", async ({ page }) => {
            await playSeededPracticeToWin(page);
            await expectModalFitsViewport(page);
        });

        test("every loss action is on screen", async ({ page }) => {
            await playSeededPracticeToLoss(page);
            await expectModalFitsViewport(page);
        });
    });
});
