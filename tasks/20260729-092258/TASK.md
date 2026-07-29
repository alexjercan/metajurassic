# Add browser E2E coverage for the playable game

- STATUS: OPEN
- PRIORITY: 95
- TAGS: testing,e2e,ui,flow

## Story

As a developer, I want browser-level tests for the real Metajurassic game screens, so that user-facing behavior is proven the way a player experiences it rather than only through helper-level Jest tests.

## Review Findings

- `npm run ci` passes 114 Jest tests with high core coverage, but there is no browser automation harness.
- The existing tests cover `GameData`, `GameState`, `GameStats`, storage, and tree-building helpers, but not the actual DOM flow, responsive layout, autocomplete, panel behavior, modals, or navigation.
- Flow methodology prefers integration or example tests for substantial user-facing work, especially for games and visual mechanics.
- The out-of-context review found live defects a first-load smoke test would have caught: the auto-opened panel covering the mobile viewport, and every species card icon failing to load (all 150 `icon` fields are malformed, see `20260729-092352`).
- E2E complements but does not replace seam-level tests: the puzzle-key round-trip bug (`20260729-101747`) needs a property test, not a browser.

## Steps

- [ ] Choose and wire a browser E2E harness, preferably Playwright, into the repo's npm scripts.
- [ ] Add a smoke test that loads the daily game and verifies the first screen has the expected header, guesses-left control, hint control, tree area, input, footer links, and no blank primary surface.
- [ ] Add a mobile viewport test that checks the player can see the primary game surface and input without incoherent overlap.
- [ ] Add an autocomplete test that types a partial dinosaur name, navigates suggestions, submits a guess, and verifies guesses left and tree feedback update.
- [ ] Add a panel test that opens and closes the info panel and verifies clade/species card content is shown without hiding the control path unexpectedly.
- [ ] Add win/loss modal smoke coverage using deterministic state or seeded data.
- [ ] Add route smoke tests for practice, profile, species archive, clades archive, and FAQ.
- [ ] Assert no broken images on the first screen and on a representative species/clade card (no failed image requests, no zero-size rendered imgs).
- [ ] Build deterministic fixtures on the seed mode from `20260729-101819` instead of ad-hoc localStorage injection where possible.
- [ ] Add screenshots or trace artifacts only where useful and keep them out of committed churn unless the repo adopts snapshot baselines intentionally.

## Definition of Done

- Browser tests run locally and in the main verification command. (cmd: `npm run ci`)
- At least one desktop and one mobile viewport are covered. (test: browser E2E suite)
- The guess flow is covered from typing through rendered feedback, not only state helper calls. (test: browser E2E suite)
- The harness docs or README mention how to run the browser tests. (cmd: `rg -n "playwright|browser|e2e" README.md package.json`)

## Notes

- Do this before large UX changes when possible, so the current behavior can be captured and then intentionally updated.
- Avoid brittle pixel-perfect assertions for normal layout; reserve screenshots for key shape regressions.
