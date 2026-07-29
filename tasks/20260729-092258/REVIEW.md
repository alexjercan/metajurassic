# Review: Add browser E2E coverage for the playable game

- TASK: 20260729-092258
- BRANCH: test/e2e-browser-coverage

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

The out-of-context reviewer ran `npm run ci` in the nix devshell and it passed:
122 Jest tests (5 suites), then Playwright 18 passed + 2 skipped (the two
`test.fixme`). The DoD doc-check `rg -n "playwright|browser|e2e" README.md
package.json` returns matches in both files. The one lint warning
(`treeVisualizer.ts:103` unused `e`) is pre-existing on master, not introduced
by this branch.

The reviewer independently confirmed the load-bearing claims rather than
trusting the summary:

- Both deferred assertions are genuine failing invariants today, not fake
  deferrals: a temp un-`fixme` of the species-icon assertion failed (all 150
  `icon` fields are stringified Python lists rendered raw into `<img src>` at
  `src/ui/card.ts`), and the mobile-occlusion assertion reported `OCCLUDED=true`
  and failed on the Pixel 5 project.
- The modal fixtures are deterministic: `computeDailyKey` in `e2e/helpers.ts`
  mirrors `formatPuzzleId`/`gameStateKey`, and `loadGameState` reads
  `targetId`/`guesses` straight from storage, so win/loss are independent of the
  real daily pick.
- All four load-bearing choices have DECISION.md entries; README.md and
  AGENTS.md accurately describe nix vs CI browser provisioning; no stale
  `ci = format+lint+coverage` claims remain; no banned punctuation in new files.

In-session confirmation (not adopted wholesale): this session also ran
`npm run ci` to green and independently verified both `test.fixme` assertions
fail when enabled (see the work log), so the round-1 pass/skip result and the
genuineness of the deferrals are re-derived here, not taken on trust.

No BLOCKER, MAJOR, or MINOR findings. Four NITs, left to implementer discretion:

- [ ] R1.1 (NIT) e2e/mobile.spec.ts:43, e2e/images.spec.ts:45 - the `test.fixme`
  signatures stay on one long line while the live tests use multi-line
  signatures; Prettier accepts both. Purely cosmetic.
  - Response: Left as-is. Prettier owns the wrapping and accepts the current
    form (`format:check` is green); rewrapping by hand would fight the formatter.
- [ ] R1.2 (NIT) e2e/routes.spec.ts:47 - `.first()` is redundant for the
  `practice` route whose target `#player-input` is a unique id.
  - Response: Left as-is deliberately; `.first()` is uniform across all routes
    and harmless on a unique selector.
- [ ] R1.3 (NIT) e2e/helpers.ts:41 - `FinishedGame.hintClades` is never
  exercised by the suite (dead fixture surface).
  - Response: Kept for fixture completeness; a hint-spend modal fixture is a
    plausible near-future addition and the field matches the stored shape.
- [ ] R1.4 (NIT) playwright.config.ts:41 - `webServer` runs `npm run serve`
  (dev bundle), so a production-only `dist/` build regression would not be
  caught, and the route paths rely on the dev-server fallback.
  - Response: Accepted as a known limitation of this task's scope. Recorded in
    RETRO.md as a candidate follow-up (run the suite against a built `dist/`).

No open `manual:` DoD items - every Definition of Done proof is a `cmd:`/`test:`
that was executed and passed, so there are no pending user checks.
