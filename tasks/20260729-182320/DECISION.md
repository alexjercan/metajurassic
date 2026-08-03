# Decision: no depth-to-target; a revealed-lineage round summary in the panel

- DATE: 20260803 (accepted by the user in conversation)
- STATUS: ACCEPTED
- TASK: 20260729-182320
- TAGS: decision, feature, ux, gameplay
- CONTEXT: `tasks/20260729-092452/NOTES.md` sections 1.7 and 5, `tasks/20260729-092435/NOTES.md` F1.3 and F2.1, `tasks/20260729-141425/DECISION.md`

## Context

Metazooa ships a `Show table` toggle whose ladder ends in a `???` species row,
so the player can count how many ranks still separate them from the answer
(`tasks/20260729-092452/NOTES.md` section 1.7). Metajurassic has no equivalent:
the tree shows the revealed chain, so a player sees WHERE they are but not HOW
FAR is left.

That gap is not free to close. Depth-to-target is real difficulty information.
Three shapes were on the table, and they are not interchangeable:

- (a) the full ladder, with unrevealed ranks as `???` rows - hands out
  depth-to-target;
- (b) a ladder over the REVEALED lineage only - restates what the board already
  shows, keyed by guess;
- (c) nothing; close the alignment finding as decided-against.

## Decision

Accepted: (b).

Depth-to-target is NOT given. The ladder stops at the deepest revealed clade:
no `???` row, no remaining-rank count, no total-depth number anywhere on the
surface.

A second fork follows from that, and is decided here too. `buildGuessTree`
reveals more clades than the target's lineage - it also reveals the pairwise LCA
of two guesses (`src/treeBuilder.ts`, "Pairwise guess LCAs too"), and those
clades hang OFF the target's chain:

- **Rows are the revealed clades on the TARGET's chain only**, root -> deepest.
  An off-chain pairwise-LCA clade is not a rank of the answer's ladder and gets
  no row - giving it one would suggest the answer sits inside it.
- **Every guess is attributed to the deepest chain clade it belongs to**, which
  is exactly its join with the target: the fact the player already saw when they
  spent the guess. A guess bucketed off-chain in the tree rolls up to that
  clade's nearest chain ancestor.

So every guess appears exactly once, no row implies anything the board has not
already shown, and the card cannot disagree with the tree.

## Alternatives considered

**(a) The full ladder with `???` rows.** Rejected as inconsistent with
`20260729-141425`, which began as "show which species belong to a revealed
clade" and was rejected by the user verbatim: "it feels a bit like cheating
(makes the game way too easy)". The clade-to-species mapping was pushed out of
the round and into the archive. Option (a) is the same trade in a different
wrapper - it converts a deduction the game asks the player to perform into a
readout. The two tasks were filed to be decided consistently, and they now are.

Independently, the measured field is already tight: `20260729-092435` F1.3
measured the candidate field collapsing to a median of 3 by guess 3 for a player
who reads the tree, against a 25-guess budget F2.1 already found non-binding.
Printing remaining depth would compress that further.

**(c) Build nothing.** Rejected because (b) is not a no-op. The story's stated
pain is "instead of re-reading the tree each turn", and the board answers "where
am I" but never "which of my guesses joined where, and how warm was each" -
`renderLastGuess` (`src/ui/panel.ts`) shows only the LAST guess. A summary keyed
by GUESS rather than by node is new legibility with zero new information, and
the closeness tiers it needs already exist on `SpeciesNode.closenessTier` from
`20260729-182255`.

## Consequences

- One ordering, `Summary`. `Chronological` stays out of scope
  (`tasks/20260729-092452/NOTES.md` section 5).
- The surface mounts in the EXISTING info panel behind an `Info` / `Summary` tab
  switcher, with `Info` still the default. No second pull tab and no new top-bar
  control: the panel already owns the "there is something to read" affordance
  (`tasks/20260729-092327/DECISION.md`).
- The tree is never replaced. Metazooa's `Show table` swaps the board out and so
  needs a `Return to tree` link; we annotate beside the board instead, because
  swapping would fight the `arena-wrapper` / `panel-open` layout and the
  phone-occlusion rule from `tasks/20260729-141414/DECISION.md`.
- No state is stored and no rule changes. The summary is a pure read of
  `GameState` plus the `CladeNode[]` roots `buildGuessTree` already returns, so
  difficulty is unchanged by construction.
- `src/index.html` is registered twice in `webpack.config.js` (daily and
  `/practice/`), so the tabs ship active on both pages rather than hidden.

The build plan that follows from this decision is in `NOTES.md`.
