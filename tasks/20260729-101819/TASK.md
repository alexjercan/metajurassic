# Add a deterministic seed mode as the runnable example primitive

- STATUS: CLOSED
- PRIORITY: 94
- TAGS: testing,feature,e2e
- KIND: TASK
- FLOW STEP: DONE
- PLAN STATUS: APPROVED

## Story

As a developer or tester, I want to load the game with a chosen seed (for example `?seed=42`), so that bug repros, E2E fixtures, and playtests can target a known dinosaur and tree shape instead of whatever today happens to be.

## Review Findings

- There is no way to reproduce a specific puzzle: daily mode derives the seed from the clock and practice mode rolls `Math.random()` (`src/practice.ts:8`).
- The browser E2E task, the tree-scaling task, and the playtest task all need deterministic targets with chosen clade depths; without a shared seed mode each will invent its own localStorage fixture hack.
- The repo's global guidelines favor runnable examples for substantial components; for a web game the natural example is a seeded, reproducible round.

## Steps

- [x] Support a seed query param on the practice page, and decide whether daily honors it only in dev builds; record the choice in `DECISION.md`.
- [x] Key seeded game state in storage so it does not clobber the real daily state.
- [x] Guard share text so seeded/dev rounds do not masquerade as the daily puzzle.
- [x] Document the param in AGENTS.md and the README dev section.
- [x] Use it to script one runnable example: a short "play a fixed round" walkthrough usable by E2E fixtures and manual playtests.

## Definition of Done

- Loading with a seed param yields the same target every time. (test: browser E2E or Jest integration test)
- The daily state in storage is untouched by seeded rounds. (test: storage isolation test)
- The param is documented. (cmd: `rg -n "seed" AGENTS.md README.md`)

## Notes

- Sequence alongside `20260729-092258` (browser E2E harness); its fixtures should build on this.
- Must compose with `20260729-101740` (randomized daily mapping): a seed reproduces the mapped target, not the raw modulo pick.
- Build-shape fork recorded in `DECISION.md`: seed lives on the practice page only (daily stays clock-derived); seeded rounds get a distinct "Practice Dinosaur" share label so they cannot masquerade as the daily.
