import { defineConfig, devices } from "@playwright/test";

// Browser E2E for the playable game. See tasks/20260729-092258 and its
// DECISION.md for why this exists and how it runs on NixOS vs CI.
//
// The suite is part of `npm run ci`, so it must be deterministic: chromium
// only, fixture-driven, no reliance on the external image CDN. Locally the
// browser comes from the nix devShell (pkgs.playwright-driver.browsers via
// PLAYWRIGHT_BROWSERS_PATH); in GitHub CI it is installed with
// `npx playwright install --with-deps chromium`.

// Port 8080 by default, overridable with E2E_PORT. `reuseExistingServer` below
// means a dev server already bound to 8080 - the main checkout's, or an orphan
// from a deleted sprout worktree - is silently ATTACHED to instead of started,
// so a branch's suite would test the wrong app (LESSONS.md:
// a-stale-dev-server-on-8080-makes-e2e-test-the-wrong-app). Running a parallel
// worktree's suite on its own port is the escape hatch; the default is unchanged.
const PORT = Number(process.env.E2E_PORT ?? 8080);
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
        command: `npm run serve -- --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
    },
});
