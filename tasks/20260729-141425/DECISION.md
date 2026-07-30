# Decision: no in-round clade-to-species mapping; filter the archive instead

- DATE: 20260729 (accepted by the user in conversation)
- STATUS: ACCEPTED
- TASK: 20260729-141425
- TAGS: decision, feature, ux, archive
- CONTEXT: `tasks/20260729-092435/NOTES.md` F1.1-F1.3, `tasks/20260729-160500/SPIKE.md`

## Context

The playtest pass found that no surface maps a clade to its member species, so
the game asks for a deduction it gives the player almost no means to make. Three
candidate shapes were on the table, and they are not interchangeable:

- (a) the clade card lists its member species, in the round;
- (b) the tree renders unguessed members of a revealed clade as locked leaves,
  showing the SIZE of the field without the names;
- (c) nothing in-round; the archive gains the knowledge so it is learnable
  outside a round.

## Decision

Accepted: (c), as a clade FILTER on the species archive.

The user rejected the in-round shapes:

> `20260729-141425` this one we won't do; it feels a bit like cheating (makes
> the game way too easy); and if a player wants this feature they can go into
> the archive and search the clade for each dino to see how it fits; so maybe
> `20260729-141425` can turn into a "filter in the archive page"

So the mapping is not free during a round. A player who wants it leaves the
round and looks it up in the Species Archive (`/species`), which becomes
filterable by clade.

## Why this is a design position, not a gap

It is deliberately effortful, and the effort is the point. The measured spread
is stark: a player who cannot use the tree loses ~83% of rounds, one who can
fully deduce loses 0%. Handing the clade's membership over in-round collapses
that spread by reading rather than knowing - the "way too easy" the user names.
Putting it one page away keeps the knowledge learnable without making it free
mid-round.

This is also what makes the hint's rescue effect (`20260729-141424`) effortful
rather than automatic: a hint names a clade, and cashing that name in means a
trip to the archive. Both decisions were taken together and should be read
together.

## Alternatives considered

- **(a) member species on the clade card.** Rejected as cheating: it answers the
  puzzle by reading, in the round, for free.
- **(b) locked leaves in the tree.** Weaker than (a) but the same direction, and
  it adds tree-rendering complexity for a partial answer. Not taken; still
  available if play shows the field SIZE is the missing signal.

## Consequences

The task is re-scoped from an in-round gameplay feature to an archive
convenience, and drops in priority accordingly (86 -> 60): it no longer sits on
the critical path for whether a lost player can recover.

Implementation note carried into the task: each species card names only its
IMMEDIATE clade, so filtering by a higher clade (Cerapoda) needs lineage-aware
matching (`GameData.lineage`), not a string comparison against the card text.
