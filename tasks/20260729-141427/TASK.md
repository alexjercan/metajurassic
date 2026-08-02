# Fix autocomplete filtering order and prefix ranking

- PRIORITY: 78
- TAGS: bug, ui, input
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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

- [x] Extract the match logic out of the `setupAutocomplete` closure into an exported pure function `findMatches(speciesNames, query, isGuessed)` in `src/ui/autocomplete.ts`, so it is directly unit-testable; `setupAutocomplete` calls it with its own options.
- [x] Filter guessed species BEFORE truncating to 8, so the list always offers up to 8 usable suggestions.
- [x] Rank prefix matches above interior substring matches (stable partition, source order preserved within each group), keeping substring matching as the fallback.
- [x] Add `test/autocomplete.test.ts` covering both the filter-order fix and prefix ranking against the REAL `src/jurassic/index.json` species list.
- [x] Extend `e2e/autocomplete.spec.ts` with the browser regression: on a fixed practice seed, guess 8 "saur" species, then type "saur" and assert the suggestion list is still populated.

## Definition of Done

- After guessing 8 matching species, the query still returns suggestions. (test: browser E2E, the exact repro above)
- A prefix match outranks an interior match for the same query. (test: Jest, `test/autocomplete.test.ts`)
- Up to 8 suggestions are offered while unguessed candidates remain. (test: Jest)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Distinct from `20260729-130138` (blur timer swallows a fast re-typed guess); that one is about timing, this one about the match list. They touch the same file, so sequence them rather than running both in parallel worktrees.
