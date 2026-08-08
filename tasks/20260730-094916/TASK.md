# Name the closeness colour in the how-to-play copy

- STATUS: CLOSED
- PRIORITY: 55
- TAGS: docs, ux

## Story

As a new player, I want the how-to-play card to tell me that the colour on a guessed node means how warm it was, so that I read the board's newest signal instead of wondering why some nodes are green.

## Review Findings

- Filed from `20260729-182255` REVIEW.md R1.3 (out-of-context reviewer, NIT, non-blocking).
- Neither surface is FALSE today; both are just silent about the colour:
  - `src/ui/onboarding.ts`, the "Reading the tree" card fact, explains placement and says "the tree is telling you how warm you are" - which is now literally true in hue, and unmentioned.
  - `src/faq.html`, "What does the tree show?", explains clades and proximity to the `?` node, and says nothing about colour.
- `20260729-182255`'s own Notes anticipated exactly this: "if both land, the onboarding copy can lean on the colour instead of explaining it". Both have now landed.

## Steps

- [x] Confirm the proof is red before editing: `grep -nie colour src/ui/onboarding.ts && grep -nie colour src/faq.html` exits non-zero (neither file carries the word today).
- [x] `src/ui/onboarding.ts`, `buildHowToPlayCard`: extend the "Reading the tree" `card-fact` span (line ~121) by ONE clause after "how warm you are", naming both channels the board now uses - e.g. "- the node's colour runs cold to hot, brightest green closest." One clause only: the card's length is load-bearing (`tasks/20260729-092327`, where the brief was clipped at short viewports). Do not touch `briefCopy()`.
- [x] `src/faq.html`, "What does the tree show?" `<p class="faq-answer">` (lines 43-49): add ONE sentence after "the closer you are to the answer." covering the same cold-to-hot scale and naming the shared grid's squares as the same five steps.
- [x] Keep both surfaces in the share grid's language: five tiers, cold first, hottest last. `CLOSENESS_CELLS` is `["⬛","🟦","🟨","🟧","🟩"]` and `.node-close-0..4` ramps grey -> blue -> yellow -> orange -> green with rising fill alpha (`0369f8b`), so "cold to hot, brightest green closest" is true of board and grid alike. State no tier count, no boundary numbers, no hex: `TIER_UPPER_BOUNDS` in `src/closeness.ts` is the only place the scale is written down.
- [x] Spell it British: "colour". `src/ui/treeLayout.ts` uses "centre"; the dependency task is titled "readable without colour". The DoD grep pins this.
- [x] Run `nix develop -c npm run ci`. It covers `format:check` (prettier reformats `src/**/*.html` and `src/**/*.ts`, so re-read both files after) and `test:e2e`, which includes the `e2e/onboarding.spec.ts` viewport sweep down to 320x568.

## Definition of Done

- Both surfaces name the colour, in British spelling. Red on base: exit 1, zero matches. (cmd: `grep -nie colour src/ui/onboarding.ts && grep -nie colour src/faq.html`)
- `npm run ci` passes, which re-runs the onboarding layout sweep as a regression guard. (cmd: `nix develop -c npm run ci`)
- The new wording agrees with the share grid's tiers, and the how-to-play card still fits its panel. (manual: user judgement)

## Notes

- Depends on `20260729-182255` (the colour itself) - landed.
- `20260730-094852` landed first (`0369f8b`, "carry tree closeness on lightness as well as hue"), so the copy is written against the result: fill alpha and text luminance ramp monotonically across tiers alongside the five hues. Hence "brightest green" rather than "green" - it names both channels in three words and does not promise the hue alone will land.
- Resolves NOTES.md open question 1: the FAQ DOES name the shared grid. Step 3 of the filed task asks the three surfaces to agree, and the FAQ is the long-form surface where the tie-back costs nothing. The card stays silent about the grid - no room.
- Resolves NOTES.md open question 2: British "colour", evidence above.
- No test asserts the edited strings (`grep -rn "how warm you are\|Reading the tree\|closer you are to the answer" e2e/ test/ src/` hits only the two source lines), so no test needs updating and none can go red on the copy alone.
- The clipping E2E guards `#onboarding-brief`, which this task does not edit; the card is the info-panel surface and the spec asserts nothing about its height. The `npm run ci` item is therefore a regression guard, not a proof the card fits - hence the manual item. Adding a FAQ content spec or a card-height assertion for one sentence is more scaffolding than the change is worth.
- Accepted cost: two more places that go stale if the palette moves, with nothing mechanical binding copy to `TIER_UPPER_BOUNDS`. The alternative is a copy generator. Not worth one clause.

## Close-out

### What and why

- `src/ui/onboarding.ts` (`buildHowToPlayCard`, "Reading the tree"): one clause appended after "how warm you are" - "the node's colour runs cold to hot, brightest green closest". Both channels in five words; no tier count, no bounds, no hex.
- `src/faq.html` ("What does the tree show?"): one sentence after "the closer you are to the answer." - "A guessed node's colour says the same thing, running cold to hot with the brightest green closest, on the same steps as the squares in the grid you share at the end of a round."
- The FAQ sentence ties the board to the shared grid, per the plan's resolution of NOTES open question 1. It says "the same steps", not "five steps": Step 3 asked for the tie-back and Step 4 forbade stating a tier count, so the wording carries the agreement without the number. `TIER_UPPER_BOUNDS` stays the only place the scale is written down.
- British "colour" on both surfaces, matching `src/closeness.ts` ("colours") and `src/ui/treeLayout.ts` ("centre").

### Alternatives

- Naming the five tiers explicitly in the FAQ: rejected, Step 4 forbids a tier count and it dates the copy against `TIER_UPPER_BOUNDS`.
- Adding a FAQ content spec or a card-height assertion: rejected per Notes - more scaffolding than one clause is worth, and no test asserts these strings.
- No `DECISION.md`: the plan already records every load-bearing choice; nothing new emerged.

### Difficulties and diagnosis

- First FAQ draft said "shaded on a cold-to-hot scale" and never used the word "colour", so the DoD grep stayed red on `src/faq.html`. Caught by re-running the proof rather than assuming; rewritten to lead with "A guessed node's colour".
- `npm run ci` failed at `format:check` with `prettier: command not found` - the fresh sprout worktree had no `node_modules`. Fixed with `npm install` in the worktree; not a code fault.

### Evidence

- Proof red on base: `grep -nie colour src/ui/onboarding.ts && grep -nie colour src/faq.html` exited 1 with zero matches in both files (checked separately, not just via the short circuit).
- Proof green after: exit 0, `src/ui/onboarding.ts:122` and `src/faq.html:49`.
- `nix develop -c npm run ci` exit 0: `format:check` (prettier wanted no reflow of either edit), lint, pipeline, Jest coverage, and 165 Playwright tests including the `e2e/onboarding.spec.ts` sweep down to 320x568.
- Card fit (manual item): a throwaway Playwright probe opened the card at 320x568 and 360x640 and measured `#panel-card-container` at `scrollHeight === clientHeight` and `scrollWidth === clientWidth` on both, identical to the same probe run against stashed edits. The container's height is bounded by the panel, which is the scroller; longer copy lengthens the scroll, it cannot clip. The probe was deleted - Notes rules a permanent card-height assertion out of scope.
- Doc sweep: `grep -rn "how warm you are\|closer you are to the answer\|Reading the tree" README.md AGENTS.md src/ e2e/ test/` hits only the two edited lines. No doc surface restates this copy.

### Reflection

- The DoD grep pinned a word, not a meaning, and the first draft satisfied the meaning while missing the word. Running the proof instead of eyeballing the diff is what caught it - cheap here, and the habit is the point.
- A fresh sprout worktree needs `npm install` before `npm run ci`; worth doing first rather than reading a `command not found` as a real failure.
