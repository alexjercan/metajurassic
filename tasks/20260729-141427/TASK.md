# Fix autocomplete filtering order and prefix ranking

- STATUS: OPEN
- PRIORITY: 78
- TAGS: bug,ui,input


## Story

As a player deep in a round, I want the autocomplete to keep offering the dinosaurs I have not guessed yet, so that the input keeps working exactly when I need it most.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F3.10-F3.11), ON-SCREEN and reproduced in a browser.

- `src/ui/autocomplete.ts` `findMatches` slices to 8 BEFORE filtering out guessed species:

  ```ts
  .filter((name) => name.toLowerCase().includes(normalized))
  .slice(0, 8)                        // cut first
  .filter((name) => !isGuessed(name)) // filter after
  ```

  So every guessed species still consumes a suggestion slot.

- Reproduced on `/practice/?seed=5`: 83 species contain "saur"; after guessing the first 8 of them, typing "saur" returns an EMPTY list while 75 valid unguessed candidates remain.
- Typing a full name and pressing Enter still works (`src/game.ts` keydown), so this is degradation rather than a hard block - but the primary input affordance dies mid-round.
- Separately, there is no prefix ranking: "tyr" offers `Yutyrannus, Styracosaurus, Tyrannotitan, Tyrannosaurus, Nanotyrannus` in source order. The species the player is most likely typing is fourth.

## Steps

- [ ] Filter guessed species BEFORE truncating, so the list always offers up to 8 usable suggestions.
- [ ] Rank prefix matches above interior substring matches, keeping substring matching as the fallback.
- [ ] Add a Jest test for `findMatches`-level ordering and a browser E2E regression for the empty-list case (guess 8 "saur" species, assert the list is still populated).

## Definition of Done

- After guessing 8 matching species, the query still returns suggestions. (test: browser E2E, the exact repro above)
- A prefix match outranks an interior match for the same query. (test: Jest)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Distinct from `20260729-130138` (blur timer swallows a fast re-typed guess); that one is about timing, this one about the match list. They touch the same file, so sequence them rather than running both in parallel worktrees.
