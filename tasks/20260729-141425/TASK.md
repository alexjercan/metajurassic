# Show which species belong to a revealed clade

- STATUS: OPEN
- PRIORITY: 86
- TAGS: feature,ux,gameplay


## Story

As a player told the answer is in "Cerapoda", I want some way to find out which dinosaurs that includes, so that the deduction the game asks for is one I can actually perform.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F1.1-F1.3) - this is the pass's single biggest finding.

- MEASURED: how much of the tree a player can use decides the whole game. Simulated over all 150 targets: a player who ignores the tree loses 84.8% of rounds; one who only knows "the target is inside the revealed clade" loses 5.8%; one who can fully deduce loses 0% and wins in a median of 4.
- ON-SCREEN: no surface maps a clade to its member species. `buildGuessTree` (`src/treeBuilder.ts`) renders only GUESSED species plus the `?` placeholder; `createCladeCard` (`src/ui/card.ts`) is name, silhouette and description; `/clades` (`src/clades.ts`) renders those same cards.
- The one partial exception, and it is weak: `/species` (`src/species.ts`) lists all 150 species alphabetically with a `Clade:` line on each card, so the INVERSE mapping exists. But it is linked only from inside the FAQ (`src/faq.html:81`), it is a 150-card carousel, and each card names only a species' IMMEDIATE clade - so it can answer "who else is in Ceratosauria" by brute-force scan and cannot answer "who is in Cerapoda" at all. Any solution here should consider whether to strengthen that page rather than add a fourth surface.
- So the game asks for a deduction it gives the player almost no means to make, and a real player lands somewhere on that 84.8%-to-5.8% spread largely on prior dinosaur knowledge.

## Steps

- [ ] Confirm the artifact with the user and record it in `DECISION.md`. This is a load-bearing fork with a real tension: showing a clade's members makes the game solvable by reading rather than knowing, which may be the point or may remove the challenge. Candidate shapes, and they are not interchangeable: (a) the clade card lists its member species; (b) the tree renders unguessed members of a revealed clade as locked/unnamed leaves so the player sees the SIZE of the field without the names; (c) nothing in-game, and instead the `/clades` archive gains membership (and a link from somewhere other than the FAQ) so the knowledge is learnable outside a round.
- [ ] Implement the chosen shape.
- [ ] Make sure it cannot spoil the answer: any surface listing members of the target's own clade narrows it to a handful (median leaf clade has 2 members, 34 clades are singletons).
- [ ] Add coverage over the real payload, not a mock (`LESSONS.md` `mock-fixtures-hide-real-data-defects-test-the-real-payload`).

## Definition of Done

- The chosen surface exists and is reachable from a round in progress. (test: browser E2E)
- It does not reveal the target. (test: seeded E2E round asserting the target name is absent before the win)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Sequence with `20260729-092327` (onboarding) and `20260729-092452` (Metazooa alignment): all three answer "what does the first screen owe the player".
- `scripts/playtest/difficulty.ts` re-measures the policy spread if the change is meant to move a player up it.
