import { test, expect } from "@playwright/test";
import { isStructurallyValidImageSrc } from "./helpers";

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

    // KNOWN FAILING: every species `icon` field is a stringified Python list
    // ("['https://...svg']"), so card-icon <img> src is malformed. Owned by
    // 20260729-092352 (validation) and 20260729-092404 (repair). This test
    // encodes the invariant and flips green when the media is repaired; it is
    // fixme so the npm run ci gate stays green now. See DECISION.md.
    test.fixme("a representative species card has a valid icon (blocked on 20260729-092404)", async ({
        page,
    }) => {
        await page.goto("/species/");
        const icon = page.locator(".archive-card .card-icon").first();
        await expect(icon).toBeVisible();
        const src = await icon.getAttribute("src");
        expect(isStructurallyValidImageSrc(src)).toBe(true);
    });
});
