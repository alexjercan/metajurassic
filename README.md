# Metajurassic

A simple clone of the [Metazooa](metazooa.com) game.

### Quickstart

```console
npm install
npm run serve
```

Access the page at `localhost:8080`

### Seed mode (reproducible practice rounds)

The practice page accepts a `?seed=` query param that loads a chosen,
reproducible target instead of a random one:

```
localhost:8080/practice/?seed=42
```

The same seed always yields the same dinosaur (the seed is routed through the
daily permutation, so it reproduces the mapped target), which makes it the
primitive for bug repros, E2E fixtures, and manual playtests. Seeded rounds are
stored under their own `practice-` storage key and share as "Practice
Dinosaur ...", so they never touch or masquerade as the daily puzzle. The daily
page ignores the param on purpose - the daily target stays clock-derived and
uncheatable. `e2e/seed.spec.ts` is a runnable walkthrough of a fixed round.

Practice rounds RESUME, seeded ones included: revisiting a seed you have already
played brings that saved round back rather than dealing a fresh one. To replay a
seed from scratch, press **New game** (which starts an unseeded round) or clear
the page's local storage. Seeds are folded into `seed mod 100000`, so
`?seed=100042` means `?seed=42`.

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
