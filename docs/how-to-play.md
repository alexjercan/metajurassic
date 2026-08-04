# How to play

Type a dinosaur species into the input and press Enter. The tree redraws to
show where that guess sits relative to the mystery species. Repeat until you
find it, or until the guess budget runs out.

## The tree is the feedback

There is no letter-by-letter colouring here. Every guess joins the
phylogenetic tree at the **clade it shares with the answer** - its lowest
common ancestor - and the answer itself sits on the board as a `?` placeholder.

The deeper into the tree your guess joins, the narrower the group you and the
answer have in common, and the closer you are. A guessed node is also coloured
on a cold-to-hot closeness scale, brightest green closest, on the same steps as
the squares in the grid you share at the end of a round.

The tree is built by
[`src/treeBuilder.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/treeBuilder.ts),
over the species graph in
[`src/gameData.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/gameData.ts).

Clicking any node opens the info panel with details of that species or clade.
After each guess the panel holds the clade directly above the `?` - the
narrowest group the answer is known to belong to. On a wide screen it opens
beside the tree; on a phone it would cover the tree, so it waits behind the
labelled tab at the top right, which names the clade it is holding.

## The guess budget

Each round gives you a fixed number of attempts, defined by `MAX_GUESSES` in
[`src/constants.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/constants.ts).
The number is deliberately not written out anywhere in prose - not on the board,
not in the FAQ, and not here. Every player-facing surface interpolates the
constant instead, and
[`test/markupConstants.test.ts`](https://github.com/alexjercan/metajurassic/blob/master/test/markupConstants.test.ts)
fails the build if a literal creeps back into a page template. The board shows
you the live count.

A name the game does not recognise is rejected outright and does not cost an
attempt.

## Hints

When you are stuck you can buy a hint. It costs `HINT_COST` guesses, again from
[`src/constants.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/constants.ts),
and hints are not capped per round - `MAX_HINTS` is `-1`, which the constant's
own comment records as a deliberate choice rather than an oversight.

A hint reveals one more clade in the answer's lineage. Which one is the
interesting part, and it is decided by `findNextHintCladeId` in
[`src/hintRule.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/hintRule.ts):

- Of the clades more specific than anything already on screen, it returns the
  **shallowest** one that cuts the still-possible species to at most
  `HINT_SPLIT_FRACTION` of their current number.
- If no unrevealed clade meets that threshold, it falls back to the deepest
  unrevealed one. That branch can under-deliver; by construction it cannot give
  away the answer.

The point of skipping rungs is that the lineage ladder is lumpy: consecutive
levels routinely hold ~66% and ~65% of the field, so advancing exactly one
level per hint spends a hint on a step worth almost nothing. The measured
before-and-after, and the reason the threshold is set against a _rescue_ bar
rather than a return-on-investment one, are in
[`tasks/20260729-141424/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-141424/DECISION.md)
and
[`tasks/20260729-160500/SPIKE.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-160500/SPIKE.md).

A hint is a way out of a round you were going to lose, not a shortcut to a
quick win.

## The daily puzzle

One mystery species per day, the same for everyone, derived from the calendar
rather than from your storage. The seed counts **calendar days** since a fixed
first day, and maps through a deterministic seeded permutation of the species
list to pick that day's answer -
[`src/gameData.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/gameData.ts).

Two properties are load-bearing and pinned by tests:

- The permutation salt is fixed, so the whole schedule is stable. Changing it
  reshuffles every future puzzle.
- Consecutive days never land on array-adjacent species positions.

The puzzle rolls over at your local midnight, and the end-of-round screen counts
down to it. Day counting goes through local calendar fields rather than elapsed
milliseconds, so the 23-hour and 25-hour nights around a summer-time transition
are still exactly one day apart - which is what streaks need.

## The round summary

When a round ends, the summary lists the clades your guesses established,
root-first, each next to the guesses that revealed it. See
[Profile and ranks](/profile-and-ranks#the-round-summary).

## Sharing

The share text is one square per guess, in the order you made them, coloured by
how close that guess landed - the same cold-to-hot steps the tree uses. A bulb
marks each hint you bought. Practice rounds are labelled as practice, so a share
never passes one off as the daily. Built by
[`src/shareText.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/shareText.ts).
