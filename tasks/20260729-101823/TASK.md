# Rewrite share text with real stats and a guess-story grid

- PRIORITY: 88
- TAGS: feature, ux, gameplay
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player who just finished a round, I want a share message that honestly and vividly shows how my game went, so that pasting it to friends is worth doing and reads like an invitation to play.

## Review Findings

- `formatGameStateForSharing` (`src/gameState.ts:196-217`) hardcodes `Avg. Guesses: 5.2` and renders a fire emoji followed by the guess count styled as a streak; both are fabricated while real stats exist in `gameStats.ts`.
- The grid is N identical green squares (or 25 black squares on loss); it tells no story. Wordle-family shares work because the emoji trail shows the journey, how close each guess got.
- The function calls `getTodaySeed()` unconditionally, so sharing a practice win labels it with today's daily puzzle number.
- Share is clipboard-only; on mobile `navigator.share` is the expected affordance.

## Design (confirmed 2026-07-29)

**Closeness metric.** For a guess `g` against target `t`:
`lineage = gameData.lineage(target.clade)` (index 0 = the target's own clade,
last = root); `idx = lineage.indexOf(computeLCA(g, t))`;
`closeness = (lineage.length - idx) / lineage.length`, so 1.0 means the guess
shares the target's own clade and ~1/len means it only meets at the root.
Sampled over 5000 random real pairs from `src/jurassic/index.json` the metric
spreads across all five bins (0.1 -> 41%, then a tail out to 1.0), so the grid
really does vary. Spoiler-free: it names nothing, only how deep the join was.

**Grid: 5-tier heat scale**, one cell per guess in guess order.

| closeness | cell |
|-----------|------|
| <= 0.2 | `⬛` |
| <= 0.4 | `🟦` |
| <= 0.6 | `🟨` |
| <= 0.8 | `🟧` |
| < 1.0 (and any non-winning guess in the target's own clade) | `🟩` |
| the winning guess | `🦖` |

A guess whose LCA is null (disjoint lineages) or whose species is missing from
the data renders `⬛`. Each hint purchase renders one `💡`.

**Hint placement.** Saved state stores `guesses` and `hintClades` as two
separate sets with no interleaving order, so the exact moment a hint was bought
is NOT recoverable. Hints are therefore appended as `💡` cells after the guess
cells. Exact in-line placement would need an ordered event log in the persisted
state plus a migration for existing saves; that is out of scope here and filed
as a follow-up if it is wanted.

**Stats line: real values from `gameStats`, zero-data values omitted.**
`game.ts` computes `computeGameStats(data, storage, mode)` at share time and
passes a plain `{ currentStreak, averageGuesses, wins }` record into
`formatGameStateForSharing`; `gameState.ts` stays free of storage. Daily wins
render `🔥 N day streak | Avg. N.N`; practice renders only the average (the
streak is day-based and meaningless for practice). A stat with no data is
DROPPED, not printed as zero - `Avg. 0.0` on a first-ever share would be
exactly the fabricated number this task exists to remove. With no stats at all
the line is omitted entirely. A LOSS share drops the streak too (review R1.1):
`calculateStreak` counts wins only, so a loss leaves the previous run standing,
and printing it would claim a streak the shared round just failed to extend.

**Practice labelling.** Practice shares already read
`Practice Dinosaur dinosaur-#NNNNN` where the number is the practice SEED id,
not a daily puzzle number (task `20260729-101819`, documented in AGENTS.md and
pinned by `test/seedMode.test.ts`). That satisfies the original finding; this
task keeps that behavior rather than stripping the id.

**Share affordance.** A new `src/ui/share.ts` exports a DOM-free
`shareResult(text, deps)` returning `"shared" | "copied" | "cancelled"`: try
`navigator.share({ text })` when it exists, return `"shared"`; swallow a user
cancel (`AbortError`) as a no-op; on any other failure, or when the API is
absent, fall back to `navigator.clipboard.writeText` and return `"copied"`.
`game.ts` keeps the existing "Copied!" confirmation for the clipboard path.

## Steps

- [x] Add a closeness-tier grid builder in `src/gameState.ts` (uses
      `state.gameData`, so no new plumbing) covering win, loss, hints, null LCA.
- [x] Rewrite `formatGameStateForSharing` to take an optional real-stats record
      and emit the grid; delete the hardcoded `5.2` and the fake streak.
- [x] Compute the stats in `src/game.ts` via `computeGameStats` for the share
      context's mode and pass them in.
- [x] Add `src/ui/share.ts` with the navigator.share/clipboard fallback and wire
      the modal share button to it, keeping the "Copied!" confirmation.
- [x] Jest: grid tiers over the REAL `index.json` payload (distinct scenarios
      produce distinct grids), win/loss/practice/hint share text, stats
      omitted-when-empty, and no hardcoded numbers.
- [x] Jest: `shareResult` unit tests for native share, user cancel, share
      failure -> clipboard, and no-API -> clipboard.
- [x] Playwright `e2e/share.spec.ts`: asserting the native share path (stubbed
      `navigator.share`) and the clipboard fallback with the "Copied!"
      confirmation. Built on the existing `seedFinishedDailyGame` helper (a
      finished DAILY game with a known guess ladder) rather than playing a
      seeded practice round to a win: the daily path is the one that exercises
      the real streak/average line, and the helper already pins the clock.
- [x] Update AGENTS.md's seed-mode note if the practice share wording changes.
      It did not - practice still shares as `Practice Dinosaur dinosaur-#NNNNN`
      - so AGENTS.md is untouched.

## Definition of Done

- Share text contains no fabricated numbers. (test: Jest share tests; cmd: `rg -n "5\.2|Avg\. Guesses" src/*.ts src/ui/*.ts` - scoped to the TS sources because a repo-wide grep hits a real 5.2-metre Sauropelta in the content graph and an SVG path)
- The grid varies with guess closeness across distinct scenarios, proven against the real content graph. (test: Jest share grid test over `src/jurassic/index.json`)
- Practice shares are labeled practice and carry the practice seed id, never a daily puzzle number. (test: Jest practice share test)
- Stats are real or absent: no stat is rendered as a zero placeholder. (test: Jest first-ever-share test)
- Mobile native share path exists with clipboard fallback. (test: `e2e/share.spec.ts`)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- The share message is the game's only growth loop; treat the copy as a product feature, not a formatting detail.
- Depends on: `20260729-092258` for browser coverage of the share button path (Jest can cover the text itself immediately).
- Related: `20260729-101751` (link unfurl) and the post-game ritual task; land them as one coherent share experience. The URL line stays as it is here; the unfurl task owns the meta tags on the other side of that link.
