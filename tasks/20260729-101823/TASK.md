# Rewrite share text with real stats and a guess-story grid

- STATUS: OPEN
- PRIORITY: 88
- TAGS: feature,ux,gameplay

## Story

As a player who just finished a round, I want a share message that honestly and vividly shows how my game went, so that pasting it to friends is worth doing and reads like an invitation to play.

## Review Findings

- `formatGameStateForSharing` (`src/gameState.ts:196-217`) hardcodes `Avg. Guesses: 5.2` and renders a fire emoji followed by the guess count styled as a streak; both are fabricated while real stats exist in `gameStats.ts`.
- The grid is N identical green squares (or 25 black squares on loss); it tells no story. Wordle-family shares work because the emoji trail shows the journey, how close each guess got.
- The function calls `getTodaySeed()` unconditionally, so sharing a practice win labels it with today's daily puzzle number.
- Share is clipboard-only; on mobile `navigator.share` is the expected affordance.

## Steps

- [ ] Design the share grid so each guess encodes taxonomic closeness (for example colored steps by LCA depth toward the target); keep it spoiler-free.
- [ ] Use real stats (streak, average) from `gameStats`, or omit them entirely; never fabricate.
- [ ] Label practice shares as practice, without a daily puzzle number.
- [ ] Use `navigator.share` when available with clipboard as fallback; keep the copied-confirmation UX.
- [ ] Unit-test the share text for win, loss, practice, and hint-using games; assert no hardcoded stats remain.
- [ ] Coordinate copy with the link-preview task so the URL unfurls well wherever it is pasted.

## Definition of Done

- Share text contains no fabricated numbers. (test: Jest share tests; cmd: `rg -n "5\.2" src`)
- The grid varies with guess closeness across distinct scenarios. (test: Jest share grid test)
- Practice shares are labeled practice and carry no daily puzzle id. (test: Jest practice share test)
- Mobile native share path exists with clipboard fallback. (test: browser E2E, or manual on a phone)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- The share message is the game's only growth loop; treat the copy as a product feature, not a formatting detail.
- Depends on: `20260729-092258` for browser coverage of the share button path (Jest can cover the text itself immediately).
- Related: `20260729-101751` (link unfurl) and the post-game ritual task; land them as one coherent share experience.
