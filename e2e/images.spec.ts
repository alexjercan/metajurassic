import { test, expect } from "@playwright/test";
import { isStructurallyValidImageSrc } from "./helpers/content";
import { pinDailyClock } from "./helpers/clock";

// Pin the daily puzzle so this file's verdict is a property of the content
// rather than of the calendar. See tasks/20260804-000316/DECISION.md.
test.beforeEach(async ({ page }) => {
    await pinDailyClock(page);
});

// Image integrity, checked structurally and offline (see DECISION.md choice 4):
// every rendered <img> must have a well-formed URL src. This catches the real,
// tracked defect (stringified-Python-list icons) without depending on the
// external image CDN, which would make the gate flaky.

async function invalidImageSrcs(
    locator: import("@playwright/test").Locator
): Promise<string[]> {
    const srcs = await locator.evaluateAll((imgs) =>
        imgs
            .map((img) => img.getAttribute("src"))
            .filter((src): src is string => src !== null)
    );
    return srcs.filter((src) => !isStructurallyValidImageSrc(src));
}

test.describe("image integrity", () => {
    test("first screen has no structurally broken images", async ({ page }) => {
        await page.goto("/");
        // Header profile icon and the auto-opened clade card image are present.
        await expect(page.locator("header .profile-icon")).toBeVisible();
        const bad = await invalidImageSrcs(page.locator("img"));
        expect(
            bad,
            `structurally broken image srcs: ${bad.join(", ")}`
        ).toEqual([]);
    });

    test("a representative clade card has a valid image", async ({ page }) => {
        await page.goto("/clades/");
        const cardImg = page.locator(".archive-card img").first();
        await expect(cardImg).toBeVisible();
        const src = await cardImg.getAttribute("src");
        expect(isStructurallyValidImageSrc(src)).toBe(true);
    });

    // Every species `icon` field once held a stringified Python list
    // ("['https://...svg']"). The media was repaired and the data pinned by
    // 20260729-092352; this asserts the invariant that defect broke.
    test("a representative species card has a valid icon", async ({ page }) => {
        await page.goto("/species/");
        const icon = page.locator(".archive-card .card-icon").first();
        await expect(icon).toBeVisible();
        const src = await icon.getAttribute("src");
        expect(isStructurallyValidImageSrc(src)).toBe(true);
    });
});
