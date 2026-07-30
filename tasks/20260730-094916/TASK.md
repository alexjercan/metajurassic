# Name the closeness colour in the how-to-play copy

- STATUS: OPEN
- PRIORITY: 55
- TAGS: docs,ux
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a new player, I want the how-to-play card to tell me that the colour on a guessed node means how warm it was, so that I read the board's newest signal instead of wondering why some nodes are green.

## Review Findings

- Filed from `20260729-182255` REVIEW.md R1.3 (out-of-context reviewer, NIT, non-blocking).
- Neither surface is FALSE today; both are just silent about the colour:
  - `src/ui/onboarding.ts`, the "Reading the tree" card fact, explains placement and says "the tree is telling you how warm you are" - which is now literally true in hue, and unmentioned.
  - `src/faq.html`, "What does the tree show?", explains clades and proximity to the `?` node, and says nothing about colour.
- `20260729-182255`'s own Notes anticipated exactly this: "if both land, the onboarding copy can lean on the colour instead of explaining it". Both have now landed.

## Steps

- [ ] Add one clause to the onboarding card's "Reading the tree" fact naming the colour as the warmth signal. Keep it to a clause - the card's length is load-bearing, see `tasks/20260729-092327`, where the brief was being clipped at short viewports.
- [ ] Add a sentence to the FAQ's "What does the tree show?" answer.
- [ ] Say it in the SAME language the share grid uses, so the three surfaces (board, card, pasted grid) agree; the tiers run cold to hot with green closest.
- [ ] Re-run the onboarding layout E2E at the short/narrow viewports it already covers - added copy is what those assertions exist to catch.

## Definition of Done

- Both surfaces name the colour. (cmd: `grep -in "colour\|color" src/ui/onboarding.ts src/faq.html`)
- The onboarding brief is still not clipped at any covered viewport. (test: `e2e/onboarding.spec.ts`)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Depends on `20260729-182255` (the colour itself).
- Related: `20260730-094852` may change what the colour IS; if that lands first, write this copy against the result rather than against the hue scale.
