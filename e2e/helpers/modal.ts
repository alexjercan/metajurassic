import { expect, Page } from "@playwright/test";

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
//    scrolling. The pass writes `scrollTop` itself, and in Chromium an
//    `overflow: hidden` box IS programmatically scrollable while being
//    scrollable by neither touch nor wheel. Changing this rule's
//    `overflow-y: auto` to `hidden` therefore left every action clipped 15px
//    below the card at all five short viewports with the whole modal suite
//    GREEN - the assertion's own scroll manufactured the pass. So wherever the
//    modal has overflow at all, the computed `overflow-y` is checked to be a
//    value that gives the player a scroll. That also fails on the pre-fix
//    `visible`, for the same honest reason.
//  - the control must land inside the container's CLIP box, not merely inside
//    the viewport. Reachability alone says nothing about containment, so with
//    the cap kept and `overflow` back to `visible` the three pills were
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
//    box" defect 20260729-141428 fixed, passing a viewport-only assertion.
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

// The whole card is VISIBLE at once: `#modal` has nothing under its own fold.
//
// The stronger half of `expectModalFitsViewport`'s vertical promise, and
// deliberately a separate helper because it is not true at every size.
// Reachability is what the scroll container guarantees everywhere; no-scroll is
// what the `max-height: 480px` compaction buys at the sizes where the trimmed
// card fits. At 360x320 and 360x300 both rows wrap and it is still 362px
// against a 266px budget, so there the hatch is the answer and this must not be
// asserted (see tasks/20260730-160720/DECISION.md).
//
// `scrollHeight <= clientHeight` rather than a rect comparison: the question is
// whether the container has content past its own fold, which is exactly what
// those two numbers say, and it is blind to where the card happens to sit in
// the viewport. The shortfall is named in pixels so a regression reports a
// number rather than a reflow - the slack at 568x320 is 15px, thin enough that
// a wider font stack could eat it.
export async function expectModalNeedsNoScroll(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const measured = await page.evaluate(() => {
        const modal = document.getElementById("modal");
        if (!modal) return null;
        return {
            scrollHeight: modal.scrollHeight,
            clientHeight: modal.clientHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };
    });

    expect(measured, "#modal is absent").not.toBeNull();
    if (!measured) return;

    // One pixel of slack, as everywhere else here; the overflows under test are
    // over a hundred pixels.
    expect(
        measured.scrollHeight,
        `at ${measured.viewportWidth}x${measured.viewportHeight} the modal holds ${measured.scrollHeight}px of content in a ${measured.clientHeight}px box, so ${measured.scrollHeight - measured.clientHeight}px of it is below the fold and the player has to discover a scroll`
    ).toBeLessThanOrEqual(measured.clientHeight + 1);
}

// The exact inverse: `#modal` DOES have content past its own fold here.
//
// Not a mirror written for symmetry. `expectActionsReachable` only checks the
// hatch is a hatch - that `overflow-y` is a value a finger can scroll - WHERE
// THERE IS OVERFLOW, so if every swept size stopped overflowing, that check
// would be inert everywhere and `overflow-y: auto` could be deleted with the
// suite green. 360x320 and 360x300 are the two sizes the compaction cannot
// reach (362px against 286/266, because both the stat grid and the action row
// take a second line at 360px), so they are what keeps the escape hatch under
// test. If a later change ever does make them fit, this fails and says so
// rather than quietly retiring the hatch.
export async function expectModalStillScrolls(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const measured = await page.evaluate(() => {
        const modal = document.getElementById("modal");
        if (!modal) return null;
        return {
            scrollHeight: modal.scrollHeight,
            clientHeight: modal.clientHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };
    });

    expect(measured, "#modal is absent").not.toBeNull();
    if (!measured) return;

    expect(
        measured.scrollHeight,
        `at ${measured.viewportWidth}x${measured.viewportHeight} the modal now fits its own box (${measured.scrollHeight}px in ${measured.clientHeight}px), so the escape hatch this size exists to exercise is no longer covered anywhere`
    ).toBeGreaterThan(measured.clientHeight + 1);
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

// The daily stats card fits inside the modal's own content box.
//
// `expectModalFitsViewport` walks `.modal-actions` and nothing else, so the
// four stat cells this modal grew are unmeasured by it. The comparison is
// against the modal's PADDING box for the same reason it is there: at 320px
// the un-wrapped action row measured [17.2, 302.8] - inside the viewport, so a
// viewport-only check passed - while sitting 24px out over the modal's padding
// on each side.
//
// What this does and does not catch, checked by mutation rather than assumed.
// The cells wrap AND shrink, so most overspends resolve themselves: giving them
// `width: 300px` leaves this green, because flex shrinks them back. What it
// does catch is a cell that CANNOT shrink - raising `.modal-extra`'s
// `min-width` to 300px reddens it at every narrow size - which is the failure
// mode that floor introduces and the one thing wrapping cannot absorb. The
// wrap itself is not a defect here and is deliberately not asserted; that is
// `expectStatCardOnOneRow`'s question, at the one width where it is a promise.
export async function expectStatCardFits(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const measured = await page.evaluate(() => {
        const modal = document.getElementById("modal");
        const cells = Array.from(
            document.querySelectorAll(".modal-extras-grid > *")
        );
        if (!modal) return null;
        const r = modal.getBoundingClientRect();
        const cs = getComputedStyle(modal);
        const px = (v: string) => parseFloat(v || "0");
        return {
            cells: cells.map((c, i) => {
                const box = c.getBoundingClientRect();
                return {
                    name:
                        (
                            c.querySelector(".modal-extra-label")
                                ?.textContent ?? ""
                        ).trim() || `cell ${i + 1}`,
                    left: box.left,
                    right: box.right,
                };
            }),
            inner: {
                left: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
                right: r.right - px(cs.borderRightWidth) - px(cs.paddingRight),
            },
            viewportWidth: window.innerWidth,
        };
    });

    expect(measured, "#modal is absent").not.toBeNull();
    if (!measured) return;
    // A loop over nothing passes every assertion inside it.
    expect(
        measured.cells.length,
        "the stats card rendered no cells"
    ).toBeGreaterThan(0);

    for (const cell of measured.cells) {
        expect(
            cell.left,
            `the "${cell.name}" stat starts ${Math.round(measured.inner.left - cell.left)}px left of the modal's own content box at ${measured.viewportWidth}px`
        ).toBeGreaterThanOrEqual(measured.inner.left - 1);
        expect(
            cell.right,
            `the "${cell.name}" stat extends ${Math.round(cell.right - measured.inner.right)}px past the right of the modal's own content box at ${measured.viewportWidth}px`
        ).toBeLessThanOrEqual(measured.inner.right + 1);
    }
}

// The stats card is a SINGLE row, with the margin stated.
//
// Like `expectActionsOnOneRow`, this is not true at every size - four cells
// genuinely do not fit a 320px phone, where the card wraps to 2x2 - so it is
// the promise made at the 393px width this project runs, and the only thing
// that distinguishes "fits" from "wrapped to two lines".
export async function expectStatCardOnOneRow(page: Page): Promise<void> {
    await waitForModalToSettle(page);

    const row = await page.evaluate(() => {
        const grid = document.querySelector(".modal-extras-grid");
        if (!grid) return null;
        const kids = Array.from(grid.children);
        const gap = parseFloat(getComputedStyle(grid).columnGap || "0");
        return {
            cells: kids.length,
            distinctTops: new Set(
                kids.map((c) => Math.round(c.getBoundingClientRect().top))
            ).size,
            needed:
                kids.reduce(
                    (sum, c) => sum + c.getBoundingClientRect().width,
                    0
                ) +
                gap * (kids.length - 1),
            available: grid.getBoundingClientRect().width,
            viewportWidth: window.innerWidth,
        };
    });

    expect(row, ".modal-extras-grid is absent").not.toBeNull();
    if (!row) return;

    // The four cells are asserted PRESENT, so a half-rendered card fails here
    // rather than passing a one-row check vacuously.
    expect(row.cells, "the stats card rendered the wrong number of cells").toBe(
        4
    );
    expect(
        row.distinctTops,
        `at ${row.viewportWidth}px the ${row.needed.toFixed(1)}px of stat cells wrapped inside a ${row.available.toFixed(1)}px row`
    ).toBe(1);
    expect(
        row.needed,
        `at ${row.viewportWidth}px the stat cells need ${row.needed.toFixed(1)}px of the row's ${row.available.toFixed(1)}px`
    ).toBeLessThanOrEqual(row.available);
}
