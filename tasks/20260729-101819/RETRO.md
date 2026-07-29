# RETRO: deterministic seed mode

- TASK: 20260729-101819
- DATE: 2026-07-29
- OUTCOME: shipped; 1 review round, APPROVE. Gate green (129 Jest + 20 e2e).

## What went well

- The existing design did most of the work. `createNewGameState(data, seed)`
  already routed through `getRandomSpecies` -> the daily permutation, so a
  chosen seed reproduces the MAPPED target for free - no new selection code, and
  it composes with `20260729-101740` by construction. Practice storage was
  already prefixed `gameState-practice-...`, so daily isolation existed at the
  key level before this task; the work was to expose the seed, not build a
  mechanism.
- Reading the whole seed -> id -> key -> target chain up front (not just
  practice.ts) turned up a real latent bug the task itself named: the share text
  masqueraded as the daily in ALL modes because `formatGameStateForSharing`
  hardcoded `getTodaySeed()`. Threading a `ShareContext { mode, seed }` fixed
  the requested guard and the pre-existing masquerade in one move.
- Tests were pinned to the real payload (`src/jurassic/index.json`) per the
  repo lesson, and the storage-isolation test pre-seeds a colliding daily key so
  it proves byte-identical survival rather than asserting a vacuous truth.

## What went wrong / difficulties

- Sequencing slip at the start: I wrote DECISION.md and the Flow State marker
  into the MAIN checkout before sprouting, so they landed as uncommitted changes
  on master and had to be reverted and moved onto the branch. The trail must be
  born on the feature branch. Cost was small but avoidable.
- Two e2e/lint iterations: prettier flagged `practice.ts`/`seed.spec.ts` (ran
  `format` and moved on), and the first storage-isolation e2e assertion
  (`keys.every(k => k.includes("practice"))`) was too strict - the app writes a
  non-game-state preference key, so I narrowed it to keys starting with
  `gameState-`. The lesson: assert the specific invariant (no daily game-state
  key), not "every key looks like X".

## What the review surfaced

- The display puzzle id (`seed % 10^5`) is decoupled from the target
  (`seed % 150`); letting users pick the seed makes inherited boundaries
  (id overflow at seed 99999, id/key collision for seeds 100000 apart)
  immediately reachable. These are pre-existing and daily never hits them, so I
  documented the boundary in DECISION.md and added the "huge seed" parse test
  rather than re-architecting the daily id scheme. See LESSONS.md entry
  `user-chosen-seed-makes-inherited-id-boundaries-reachable`.

## Do differently next time

- Sprout FIRST, then write every artifact (DECISION/TASK markers) inside the
  worktree, so nothing is ever born on master.
- When a feature lets a user supply a value that feeds an existing derived
  identifier (id, storage key, hash), audit the full derivation chain for
  boundaries the previous callers could never reach - the new input surfaces
  them on day one.
