import { test, expect } from "@playwright/test";
import { expectFullyVisibleWithin } from "./helpers/viewport";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle so this file's verdict is a property of the content
// rather than of the calendar. See tasks/20260804-000316/DECISION.md.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

// The archive's clade filter, at the browser level. Counts are measured against
// the checked-in `src/jurassic/index.json`; the assertions after each count are
// the invariants the feature exists for, and hold at any content size.
const CERAPODA_MEMBERS = 35;
const ALL_SPECIES = 150;

// Read the `Clade:` line each card renders, which names the species' IMMEDIATE
// clade only. This is the value the feature has to beat: a filter that matched
// the card text against "Cerapoda" would render nothing at all.
async function immediateClades(
    page: import("@playwright/test").Page
): Promise<string[]> {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll(".archive-card")).map((card) => {
            const stats = card.querySelector(".card-stats");
            const match = stats?.textContent?.match(
                /Clade:\s*([^\n]+?)\s*Era:/
            );
            return match ? match[1].trim() : "";
        })
    );
}

test("filtering to a higher clade keeps members from several immediate clades", async ({
    page,
}) => {
    await page.goto("/species/");
    await expect(page.locator(".archive-card")).toHaveCount(ALL_SPECIES);

    await page.locator("#clade-filter").selectOption("cerapoda");
    await expect(page.locator(".archive-card")).toHaveCount(CERAPODA_MEMBERS);

    const clades = await immediateClades(page);
    expect(clades.every((c) => c.length > 0)).toBe(true);
    // Lineage-aware, not a string match: the members span many immediate
    // clades, and Cerapoda is not any card's own clade.
    expect(new Set(clades).size).toBeGreaterThan(1);
    expect(clades).not.toContain("Cerapoda");
});

test("the filter option carries its member count", async ({ page }) => {
    await page.goto("/species/");

    const option = page.locator('#clade-filter option[value="cerapoda"]');
    await expect(option).toHaveText(`Cerapoda (${CERAPODA_MEMBERS})`);
    await expect(page.locator('#clade-filter option[value=""]')).toHaveText(
        `All clades (${ALL_SPECIES})`
    );
});

test("a ?clade= deep link arrives already filtered", async ({ page }) => {
    await page.goto("/species/?clade=cerapoda");

    await expect(page.locator(".archive-card")).toHaveCount(CERAPODA_MEMBERS);
    await expect(page.locator("#clade-filter")).toHaveValue("cerapoda");
});

test("an unknown ?clade= falls back to every species, not an empty page", async ({
    page,
}) => {
    await page.goto("/species/?clade=not-a-clade");

    await expect(page.locator(".archive-card")).toHaveCount(ALL_SPECIES);
    await expect(page.locator("#clade-filter")).toHaveValue("");
});

test("changing the filter keeps the URL coherent with the view", async ({
    page,
}) => {
    // The `/clades` deep link arrives with a `?clade=` param, so a later change
    // that left it in place would put a stale filter in the address bar and on
    // any reload or share of that URL.
    await page.goto("/species/?clade=cerapoda");

    await page.locator("#clade-filter").selectOption("theropoda");
    await expect(page).toHaveURL(/[?&]clade=theropoda/);

    await page.locator("#clade-filter").selectOption("");
    await expect(page).not.toHaveURL(/clade=/);
});

test("a clade card on /clades links into its filtered species view", async ({
    page,
}) => {
    await page.goto("/clades/");

    const card = page
        .locator(".archive-card")
        .filter({ has: page.locator(".card-title", { hasText: "Cerapoda" }) });
    await card.locator(".clade-card-members-link").click();

    await expect(page).toHaveURL(/\/species\/\?clade=cerapoda/);
    await expect(page.locator(".archive-card")).toHaveCount(CERAPODA_MEMBERS);
});

test("the clade card's link into the archive is reachable on a small phone", async ({
    page,
}) => {
    // `/clades` is `page-fixed` and its cards were already taller than the
    // carousel, so appending the link put this task's own route into a clipped
    // dead zone at 320x568: it rendered 38px below the carousel's bottom edge.
    // The first card stands in for all of them - the geometry is uniform, and
    // only it is on screen without scrolling the carousel sideways.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/clades/");
    await expect(
        page.locator(".archive-card .clade-card-members-link").first()
    ).toBeVisible();

    const linkSelector = ".archive-card:first-child .clade-card-members-link";
    await expectFullyVisibleWithin(page, linkSelector, ".archive-carousel");

    // Being inside the box is not the same as being tappable: the card's
    // `::after` backdrop is painted over this link unless it keeps its own
    // stacking context, and a visibility check would not notice.
    const hitsTheLink = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const box = el.getBoundingClientRect();
        return el.contains(
            document.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height / 2
            )
        );
    }, linkSelector);
    expect(hitsTheLink).toBe(true);

    await page.locator(linkSelector).click();
    await expect(page).toHaveURL(/\/species\/\?clade=/);
});

test("the filter is reachable from the home page footer, without the FAQ", async ({
    page,
}) => {
    await page.goto("/");

    await page.locator("footer a", { hasText: "Archive" }).click();

    await expect(page.locator("#clade-filter")).toBeVisible();
});

// The carousel nav survives a re-render. Re-rendering the cards on every filter
// change puts three things at risk that no other spec covers, because the nav
// listeners bind to the carousel ELEMENT and outlive its children.

// Wait out the scroll and report where it came to rest. The exact resting value
// is a scroll-snap decision, not a number worth pinning; what the caller
// compares is two of them.
async function settledScrollLeft(
    page: import("@playwright/test").Page
): Promise<number> {
    const read = () =>
        page
            .locator(".archive-carousel")
            .evaluate((el) => Math.round(el.scrollLeft));

    let previous = -1;
    await expect
        .poll(async () => {
            const current = await read();
            const settled = current > 0 && current === previous;
            previous = current;
            return settled;
        })
        .toBe(true);

    return previous;
}

async function wheelOverCarousel(page: import("@playwright/test").Page) {
    await page.locator(".archive-carousel").hover();
    await page.mouse.wheel(0, 200);
}

test("one wheel notch scrolls the same distance after a filter change as before", async ({
    page,
}) => {
    // Attaching `setupCarouselNav` from inside the render - which is what
    // `src/profile/dinosaurList.ts` does - stacks a second listener set per
    // change. The nav BUTTONS hide that: their `scrollBy` is smooth, and two
    // smooth scrolls issued in one tick resolve to the same target rather than
    // adding up. The wheel handler scrolls instantly, so there duplicates
    // genuinely double the distance. Both pages end on the same 150-card list,
    // so the only difference between them is how many times the nav was wired.
    await page.goto("/species/");
    await wheelOverCarousel(page);
    const wiredOnce = await settledScrollLeft(page);

    await page.goto("/species/");
    await page.locator("#clade-filter").selectOption("theropoda");
    await page.locator("#clade-filter").selectOption("");
    await expect(page.locator(".archive-card")).toHaveCount(ALL_SPECIES);
    await wheelOverCarousel(page);

    expect(await settledScrollLeft(page)).toBe(wiredOnce);
});

test("the forward nav re-evaluates against the newly filtered list", async ({
    page,
}) => {
    await page.goto("/species/");
    await expect(page.locator("#carousel-right")).toBeEnabled();

    // Avialae is the one clade with a single member, so its card cannot scroll
    // and the forward button has to go dead. The carousel was already at
    // scrollLeft 0, so no `scroll` event fires here: the button state is stale
    // unless the render refreshes it explicitly.
    await page.locator("#clade-filter").selectOption("avialae");
    await expect(page.locator(".archive-card")).toHaveCount(1);
    await expect(page.locator("#carousel-right")).toBeDisabled();

    await page.locator("#clade-filter").selectOption("");
    await expect(page.locator("#carousel-right")).toBeEnabled();
});

test("a filter change starts the new list at its beginning", async ({
    page,
}) => {
    await page.goto("/species/");
    await page
        .locator(".archive-carousel")
        .evaluate((el) => (el.scrollLeft = 3000));

    // The player must not land mid-list in a list they have never seen. This
    // guards the re-render as a whole, not the explicit `scrollLeft = 0` in
    // `renderCards`: it cannot fail for that line alone, because
    // `shrinkCardTitle`'s layout flush clamps the position anyway. It does fail
    // if the reset is given a non-zero value.
    await page.locator("#clade-filter").selectOption("cerapoda");
    await expect(page.locator(".archive-card")).toHaveCount(CERAPODA_MEMBERS);

    await expect(page.locator(".archive-carousel")).toHaveJSProperty(
        "scrollLeft",
        0
    );
});

// `/species` is `page-fixed`: the carousel has to fit the viewport, and the new
// filter row eats vertical space above it. The narrow case is checked too
// because `.archive-card`'s height budget has a separate override there
// (`src/partials/responsive.css`), and the two have to move together.
const fixedHeightViewports = [
    { name: "desktop", size: { width: 1280, height: 720 } },
    { name: "narrow", size: { width: 390, height: 780 } },
];

for (const viewport of fixedHeightViewports) {
    test(`the filter row does not push the carousel off the ${viewport.name} viewport`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport.size);
        await page.goto("/species/");
        await expect(page.locator(".archive-card").first()).toBeVisible();

        await expectFullyVisibleWithin(
            page,
            ".archive-card:first-child",
            ".archive-carousel"
        );
    });
}
