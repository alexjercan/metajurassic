# Filter the species archive by clade

- STATUS: OPEN
- PRIORITY: 60
- TAGS: feature,ux,archive


## Story

As a player who wants to learn how the tree fits together, I want to filter the
Species Archive by clade, so that "which dinosaurs are in Cerapoda" is a
question I can answer between rounds.

## Re-scoped (see DECISION.md)

This task began as "show which species belong to a revealed clade", aimed at the
in-round deduction. The user rejected that shape on 20260729:

> this one we won't do; it feels a bit like cheating (makes the game way too
> easy); and if a player wants this feature they can go into the archive and
> search the clade for each dino to see how it fits; so maybe it can turn into a
> "filter in the archive page"

So the clade-to-species mapping stays OUT of a round, and the archive becomes
the place to learn it. Priority drops 86 -> 60: this is no longer on the
critical path for whether a lost player can recover. It reads alongside
`20260729-141424`, whose hint deliberately names a clade the player must go and
look up.

## Findings that still apply

From the playtest pass (`20260729-092435`, NOTES.md F1.1-F1.3):

- `/species` (`src/species.ts`) lists all 150 species alphabetically with a
  `Clade:` line per card, so the INVERSE mapping already exists - but it is a
  150-card carousel with no filter, and each card names only a species'
  IMMEDIATE clade. It can answer "who else is in Ceratosauria" by brute-force
  scan and cannot answer "who is in Cerapoda" at all.
- It is linked only from inside the FAQ (`src/faq.html:81`), so it is hard to
  find even when it would help.
- `/clades` (`src/clades.ts`) renders clade cards (name, silhouette,
  description) from the same archive shell.

## Steps

- [ ] Add a clade filter to the Species Archive (`src/species.html`,
      `src/species.ts`). Filtering must be LINEAGE-aware: a species belongs to
      Cerapoda if Cerapoda appears anywhere in `GameData.lineage(species.clade)`,
      not only when it is the card's immediate clade.
- [ ] Decide how the filter is populated and presented - every clade in the
      graph is 108 options, so consider grouping by depth or restricting to
      clades with more than one member. Keep it usable on a phone.
- [ ] Consider whether `/clades` should link into the filtered species view
      ("show the species in this clade"), since that is the same question from
      the other direction.
- [ ] Make the archive discoverable from somewhere other than the FAQ.
- [ ] Coverage over the real payload, not a mock (`LESSONS.md`
      `mock-fixtures-hide-real-data-defects-test-the-real-payload`).

## Definition of Done

- The Species Archive can be filtered to the members of any clade, including
  higher clades that are no card's immediate clade. (test: browser E2E over the
  real payload, asserting a higher clade returns members drawn from more than
  one immediate clade)
- The filter is reachable without going through the FAQ. (test: browser E2E)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Decision record: `DECISION.md` next to this file, including the two rejected
  in-round shapes and why.
- Deliberately NOT reachable as an in-round aid; that was the point of the
  decision. If a future playtest shows players cannot recover at all, the lever
  to revisit is the hint (`20260729-141424`), not this page.

## Metazooa reference (2026-07-29, from `20260729-092452`)

Partly falsifies the parity framing behind this task. Full context in
`tasks/20260729-092452/NOTES.md` section 4.4.

- REFERENCE: no clade-to-members surface was found anywhere in the captured
  Metazooa pages or bundles either. The guess combobox is the only listing of
  species, and the game's table view names RANKS, not their members. So the
  playtest's F1.2 gap ("no surface maps a clade to its members") is not
  Metajurassic falling behind the reference - it is inherent to the genre.
- What follows: supplying membership is Metajurassic going BEYOND Metazooa, so
  it should be owned here as an enrichment decision with a difficulty cost
  (F1.3 measured the candidate field already collapsing to a median of 3 by
  guess 3 for a deducing player), not as a missing standard feature. The
  measured gap is real either way; the justification changes.
- Decide this consistently with `20260729-182320` (rank-ladder summary), the
  other "give the player more information" fork the alignment pass filed.
