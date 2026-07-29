# Metajurassic

A simple clone of the [Metazooa](metazooa.com) game.

### Quickstart

```console
npm install
npm run serve
```

Access the page at `localhost:8080`

### Testing

```console
npm test              # Jest unit/integration suite
npm run test:e2e      # Playwright browser E2E suite
npm run ci            # the full gate: format:check + lint + test:coverage + test:e2e
```

The browser E2E suite (`e2e/`, driven by `playwright.config.ts`) exercises the
real game screens in Chromium: the daily first-load smoke, a mobile viewport,
the autocomplete guess flow, the info panel, the win/loss modals, the archive
and FAQ routes, and image integrity.

Running browser tests needs a Chromium binary:

- **Local (Nix dev shell):** the `flake.nix` dev shell provides a NixOS-patched
  Chromium (`pkgs.playwright-driver.browsers`) and points Playwright at it, so
  `npm run test:e2e` works out of the box inside `nix develop`. Do NOT run
  `npx playwright install` on NixOS - those downloaded binaries do not run. The
  `@playwright/test` version in `package.json` is pinned to match the driver in
  `flake.lock`; bump them together.
- **CI / non-Nix:** install the browser first with
  `npx playwright install --with-deps chromium`, then `npm run test:e2e`.
