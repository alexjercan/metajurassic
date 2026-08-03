import { test, expect, Page } from "@playwright/test";

// Social/SEO head metadata on every built page.
//
// The tags are absolute and production-pinned by design: `og:url` and
// `og:image` must resolve for a crawler that never sees this dev server, so
// they point at the deployed origin even here. That is why this spec asserts
// the SHAPE of those URLs rather than comparing them to `baseURL`.
//
// Third copy of the origin, after SITE_URL in webpack.config.js and SHARE_URL
// in src/shareText.ts; kept in sync by hand.
const SITE_URL = "https://alexjercan.github.io/metajurassic";

// Every page emitted by webpack, keyed by the path segment `og:url` must end
// with. The daily page and `/practice/` share one template and must still
// unfurl differently.
const PAGES = [
    { name: "daily", url: "/", pagePath: "" },
    { name: "practice", url: "/practice/", pagePath: "practice/" },
    { name: "faq", url: "/faq/", pagePath: "faq/" },
    { name: "species archive", url: "/species/", pagePath: "species/" },
    { name: "clades archive", url: "/clades/", pagePath: "clades/" },
    { name: "profile", url: "/profile/", pagePath: "profile/" },
];

async function metaProperty(page: Page, property: string): Promise<string> {
    return (
        (await page
            .locator(`meta[property="${property}"]`)
            .getAttribute("content")) ?? ""
    );
}

async function metaName(page: Page, name: string): Promise<string> {
    return (
        (await page.locator(`meta[name="${name}"]`).getAttribute("content")) ??
        ""
    );
}

for (const social of PAGES) {
    test(`${social.name} carries well-formed social metadata`, async ({
        page,
    }) => {
        await page.goto(social.url);

        const title = await metaProperty(page, "og:title");
        const description = await metaProperty(page, "og:description");
        expect(title.length).toBeGreaterThan(0);
        expect(description.length).toBeGreaterThan(0);

        expect(await metaName(page, "description")).toBe(description);
        expect(await metaProperty(page, "og:type")).toBe("website");
        expect(await metaProperty(page, "og:site_name")).toBe("Metajurassic");

        // Absolute and pointing at this page, not at whatever host served it.
        const url = await metaProperty(page, "og:url");
        expect(url).toBe(`${SITE_URL}/${social.pagePath}`);
        expect(
            await page.locator("link[rel=canonical]").getAttribute("href")
        ).toBe(url);

        const image = await metaProperty(page, "og:image");
        expect(image).toMatch(/^https:\/\//);

        // The referenced PNG is actually served at that path. Shape alone
        // would stay green if the CopyPlugin entry vanished and every unfurl
        // silently lost its image; this pins the stable hash-free path at the
        // served boundary. The origin is production, the bytes are here.
        expect(image.startsWith(`${SITE_URL}/`)).toBe(true);
        const served = await page.request.get(image.replace(SITE_URL, ""));
        expect(served.status()).toBe(200);
        expect(await metaProperty(page, "og:image:width")).toBe("1200");
        expect(await metaProperty(page, "og:image:height")).toBe("630");
        expect(
            (await metaProperty(page, "og:image:alt")).length
        ).toBeGreaterThan(0);

        // A large card, not the 1:1 summary thumbnail.
        expect(await metaName(page, "twitter:card")).toBe(
            "summary_large_image"
        );
        expect(await metaName(page, "twitter:title")).toBe(title);
        expect(await metaName(page, "twitter:description")).toBe(description);
        expect(await metaName(page, "twitter:image")).toBe(image);

        // No unsubstituted placeholder survived the build.
        expect(url + title + description + image).not.toContain("<%=");
    });
}

test("the daily page and the FAQ unfurl as different things", async ({
    page,
}) => {
    await page.goto("/");
    const daily = {
        title: await metaProperty(page, "og:title"),
        description: await metaProperty(page, "og:description"),
    };

    await page.goto("/faq/");
    expect(await metaProperty(page, "og:title")).not.toBe(daily.title);
    expect(await metaProperty(page, "og:description")).not.toBe(
        daily.description
    );
});

test("the daily page and practice unfurl as different things", async ({
    page,
}) => {
    await page.goto("/");
    const daily = await metaProperty(page, "og:title");

    await page.goto("/practice/");
    expect(await metaProperty(page, "og:title")).not.toBe(daily);
});
