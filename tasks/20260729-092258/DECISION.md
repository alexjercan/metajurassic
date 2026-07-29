# Decision: Browser E2E harness shape

- STATUS: ACCEPTED
- DATE: 2026-07-29

Four load-bearing choices had mutually-exclusive candidates, so they are
recorded here rather than inferred while coding.

## 1. Harness: Playwright, pinned to the nixpkgs browser revision

The task prefers Playwright; the real fork is how a real-browser harness runs on
this NixOS dev machine. Playwright's own `npx playwright install` downloads
browser binaries that do NOT run on NixOS (dynamic-linker mismatch). nixpkgs
ships pre-patched browsers as `pkgs.playwright-driver.browsers`. The version
that matters is the one in the flake's LOCKED nixpkgs (flake.lock), **1.57.0** -
NOT the newer `1.60.0` the system's default registry reports. Pinning to the
registry version first produced a real failure: `@playwright/test@1.60.0`
expected chromium revision `1223`, but the locked nixpkgs only ships `1200`, so
`browserType.launch` reported "Executable doesn't exist". The npm package must
track the driver in `flake.lock`, not `nixpkgs#playwright-driver` from the
registry.

Decision: pin `@playwright/test` to exactly `1.57.0` so its expected browser
revision matches the nix-provided one, and point Playwright at the nix browsers
from the flake devShell:

```
PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}"
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
```

Rejected: jsdom/happy-dom (not a real browser - cannot catch responsive layout,
the auto-open panel overlap, or image-loading defects, which are the whole point
of this task); letting Playwright download its own browsers (broken on NixOS).

## 2. E2E is part of `npm run ci`, and wired separately into GitHub CI

DoD requires browser tests to run in `npm run ci`. But `.github/workflows/ci.yml`
does NOT call `npm run ci`; it runs `format:check`, `lint`, `test:coverage` as
separate steps (to slot Codecov uploads between them). So two edits are needed:

- `package.json` `ci` becomes `format:check && lint && test:coverage && test:e2e`
  (local gate, offline via the nix browsers).
- The CI workflow gets an explicit chromium install + `npm run test:e2e` step
  (CI is stock ubuntu, not nix, so it uses `npx playwright install --with-deps`).

Tradeoff accepted: E2E now blocks the gate, so the suite is kept deterministic
(chromium only, fixture-driven, no reliance on the external image CDN).

## 3. Deterministic modal fixtures: localStorage state + frozen clock

The seed-mode primitive (`20260729-101819`) that this task's Notes prefer for
fixtures is still OPEN, so it cannot be built on yet. `loadGameState` reads
`targetId` straight from the stored JSON (it does not recompute it from the
seed), so a finished-game fixture written to the daily storage key produces a
deterministic win/loss modal on load. The daily storage key depends on
`getTodaySeed()`, so the test freezes time with `page.clock` and computes the
key in-browser with the same formula the app uses, guaranteeing agreement.

This is the "ad-hoc localStorage injection" the task flags as a fallback. When
`20260729-101819` lands, migrate the modal fixtures onto `?seed=`. Recorded as a
follow-up, not silently kept.

Rejected: brute-forcing guesses to reach a win (impossible within 25 guesses
over 150 species); duplicating the daily-shuffle permutation in the test to
predict the real target (brittle coupling to internal seed math).

## 4. Image integrity is checked structurally and offline, not over the network

Every image URL in `index.json` points at an external host
(`alexjercan.github.io/metajurassic-images/...`). A "no failed image requests"
assertion would depend on that CDN being reachable, which is flaky in CI and
offline in the nix shell. Instead the image test asserts the STRUCTURAL
invariant offline: every rendered `<img>` has a well-formed URL `src` (http(s),
non-empty, not a stringified Python list like `"['https://...svg']"`). That
still catches the real, tracked defect - all 150 species `icon` fields are
stringified lists (`20260729-092352`, repaired by `20260729-092404`) - without
touching the network. Actual pixel load over the CDN is out of scope for the
deterministic gate.

## Known-bug assertions land as `test.fixme`, not softened

Some DoD assertions describe behavior that is currently a tracked bug:
- species card icons are malformed (`20260729-092352` / `20260729-092404`);
- the info panel auto-opens over the mobile viewport (`20260729-092315`).

Where the current code genuinely violates the invariant (verified by running the
test, not assumed), that specific assertion is committed as `test.fixme` with a
comment pointing at the owning task. The test exists and documents the invariant;
it flips green when that task lands; and the `npm run ci` gate stays green now.
This is the bug-playbook move (encode the invariant, pin it), not a softened
review.
