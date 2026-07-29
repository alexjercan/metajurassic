# Persist in-progress practice games across reloads

- STATUS: OPEN
- PRIORITY: 68
- TAGS: bug,ux,gameplay

## Story

As a practice player, I want a reload or accidental tab close to bring back my in-progress round, so that I never lose a game I was in the middle of.

## Review Findings

- `src/practice.ts:8` rolls a fresh `Math.floor(Math.random() * 1_000_000)` seed on every page load, so a reload silently abandons the current practice game.
- Each abandoned game leaves an orphaned `gameState-practice-*` localStorage entry; storage grows without bound and abandoned rounds are never surfaced anywhere.
- Practice seeds can collide modulo the key format, silently resuming an unrelated saved round.

## Steps

- [ ] Store the active practice seed (for example under a `practice-current` key) and resume it on load until the round finishes.
- [ ] Offer an explicit "new game" action that ends or abandons the current round intentionally.
- [ ] Decide the retention policy for finished practice games (kept for stats) and abandoned ones (pruned, or counted as losses); record it in `DECISION.md` and reconcile with `loadAllGames`, which currently skips incomplete games.
- [ ] Add pruning or a cap so practice entries in localStorage stay bounded.
- [ ] Test the resume-on-reload and new-game flows.

## Definition of Done

- Reload mid-practice restores the same round. (test: browser E2E reload test or Jest storage-level test)
- Starting a new practice game is an explicit action. (test: browser E2E)
- Orphaned practice entries stay bounded. (test: Jest pruning test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Depends on: `20260729-092258` for the browser-level reload coverage.
