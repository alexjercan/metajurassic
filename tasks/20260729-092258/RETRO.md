# Retro: Add browser E2E coverage for the playable game

- TASK: 20260729-092258
- BRANCH: test/e2e-browser-coverage
- REVIEW ROUNDS: 1 (APPROVE, out-of-context; four NITs, no blockers)

See TASK.md for what shipped and DECISION.md for the four load-bearing choices.
This retro is process only.

## What went well

- Verified the browser-on-NixOS integration before writing tests, not after: a
  throwaway smoke run surfaced the version mismatch (`@playwright/test@1.60.0`
  wanting chromium 1223 vs the nix browsers' 1200) at minute two, with one test
  file, instead of after the whole suite was written. Reading `flake.lock`'s
  driver version and pinning the npm package to it (1.57.0) was the fix.
- Encoded the two known bugs as `test.fixme` AND proved each fails when enabled
  (temporarily removed `.fixme`, ran, saw red, reverted). That turned "trust me,
  it's a real invariant" into evidence the out-of-context reviewer could and did
  independently reproduce.
- Used the real served payload (`fetch('/jurassic/index.json')`) for fixtures
  and the image check rather than a mock, so the suite honors the repo lesson
  `mock-fixtures-hide-real-data-defects` - the icon defect is caught structurally.
- The out-of-context reviewer added real value with zero rework: it re-ran the
  gate, reproduced both `fixme` failures itself, and confirmed the fixtures were
  deterministic, so APPROVE was earned, not rubber-stamped.

## What went wrong

- First harness attempt failed to launch Chromium: I pinned `@playwright/test`
  to the version reported by `nix eval nixpkgs#playwright-driver.version`
  (1.60.0, the system registry) instead of the flake's LOCKED nixpkgs (1.57.0).
  Root cause: the registry nixpkgs and the flake's `flake.lock` nixpkgs are
  different pins, and `nix develop` uses the latter. Cost: one extra
  install+run loop. Cheap because I was still test-first on a single spec.
- Prettier/eslint initially rejected the new `e2e/` files because the format and
  lint globs did not include them. Root cause: adding a whole new source
  directory without extending the toolchain globs in the same edit. Caught by
  the first `npm run ci`, not by inspection.

## What to improve next time

- On a Nix project, read the tool version from `flake.lock` / the flake's own
  package set, never from `nixpkgs#...` in the system registry - they drift.
- When adding a new top-level source directory (`e2e/`), extend the format,
  lint, and tsconfig globs in the SAME change that creates it, then run the gate
  once to confirm - do not assume the globs are wildcards.

## Action items

- [x] Recorded the flake.lock-vs-registry version lesson in LESSONS.md.
- [x] Recorded the new-source-dir-needs-glob-updates lesson in LESSONS.md.
- [ ] Follow-up (not filed as a task yet; NIT R1.4): consider a second E2E
  project that serves a built `dist/` so production-only build/path regressions
  are caught, not just the dev bundle.
- [ ] Follow-up when 20260729-101819 (seed mode) lands: migrate
  `e2e/modal.spec.ts` fixtures onto `?seed=` (already noted in TASK.md/DECISION).
