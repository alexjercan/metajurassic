import { test, expect } from "@playwright/test";

// Route smoke tests: every top-level page loads with its shared header and its
// own primary content. URLs use the trailing slash the built pages are emitted
// under (e.g. practice/index.html -> /practice/).
const routes = [
    {
        name: "practice",
        path: "/practice/",
        primary: (page: import("@playwright/test").Page) =>
            page.locator("#player-input"),
    },
    {
        name: "faq",
        path: "/faq/",
        primary: (page: import("@playwright/test").Page) =>
            page.locator(".faq-title"),
    },
    {
        name: "species archive",
        path: "/species/",
        primary: (page: import("@playwright/test").Page) =>
            page.locator(".archive-title"),
    },
    {
        name: "clades archive",
        path: "/clades/",
        primary: (page: import("@playwright/test").Page) =>
            page.locator(".archive-title"),
    },
    {
        name: "profile",
        path: "/profile/",
        primary: (page: import("@playwright/test").Page) =>
            page.locator(".profile-title"),
    },
];

for (const route of routes) {
    test(`${route.name} loads with header and primary content`, async ({
        page,
    }) => {
        await page.goto(route.path);
        await expect(page.locator("header .game-title")).toHaveText(
            "Metajurassic"
        );
        await expect(route.primary(page).first()).toBeVisible();
    });
}
