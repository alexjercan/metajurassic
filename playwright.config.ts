import { defineConfig, devices } from "@playwright/test";

// Browser E2E for the playable game. See tasks/20260729-092258 and its
// DECISION.md for why this exists and how it runs on NixOS vs CI.
//
// The suite is part of `npm run ci`, so it must be deterministic: chromium
// only, fixture-driven, no reliance on the external image CDN. Locally the
// browser comes from the nix devShell (pkgs.playwright-driver.browsers via
// PLAYWRIGHT_BROWSERS_PATH); in GitHub CI it is installed with
// `npx playwright install --with-deps chromium`.

const PORT = 8080;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            // Everything except the mobile-only spec runs on a desktop viewport.
            name: "desktop-chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: /mobile\.spec\.ts/,
        },
        {
            // The mobile-only spec runs on a phone viewport.
            name: "mobile-chromium",
            use: { ...devices["Pixel 5"] },
            testMatch: /mobile\.spec\.ts/,
        },
    ],
    webServer: {
        command: "npm run serve",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
    },
});
