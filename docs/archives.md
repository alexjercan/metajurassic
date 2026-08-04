# Archives

Two browsable pages over the same graph the game plays on. Both are open at any
time and neither gives anything away about today's answer.

- [Species archive](https://alexjercan.github.io/metajurassic/species/) - every
  dinosaur the game can pick.
- [Clades archive](https://alexjercan.github.io/metajurassic/clades/) - the
  taxonomic groups those species are sorted into, the same groups the tree
  reveals as you guess.

## Species archive

[`src/species.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/species.ts)
renders one card per species, sorted by name, into a horizontal carousel.

A **clade filter** narrows the list, and its selection is reflected in the URL
as `?clade=<id>`. That makes a filtered view a shareable deep link, and the page
keeps the URL honest after every change so a reload lands where you were. An
unknown or malformed `?clade=` value falls back to the full list rather than an
empty page.

Membership is **lineage-aware**, computed by `speciesInClade` in
[`src/cladeFilter.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/cladeFilter.ts):
a species whose immediate clade is Ceratopsidae counts as a member of Cerapoda
too. Comparing against a species' immediate clade alone would only ever match
the leaf-adjacent groups, which is not what "show me the Cerapoda" means.

Filter options are sorted **alphabetically by display name**, not by position in
the hierarchy. The recorded reason is that a player arrives already knowing the
name - off a hint, or off a card - so a known-name lookup is the entry path
rather than browsing the tree. See
[`tasks/20260729-141425/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-141425/DECISION.md).

## Clades archive

[`src/clades.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/clades.ts)
renders one card per clade, also sorted by name, each with a **See species in
&lt;clade&gt;** link into the species archive's `?clade=` filter.

That link is appended by the archive page, not by the shared card builder in
[`src/ui/card.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/ui/card.ts).
The same builder draws the in-round clade panel, which must _not_ offer a route
to a clade's members - that would be a list of candidate answers mid-round. Same
decision record as above.

## Where the data comes from

Both pages read the generated runtime graph,
`src/jurassic/index.json`, through
[`src/jsonLoader.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/jsonLoader.ts)
and
[`src/gameData.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/gameData.ts).
That file is generated and must never be hand-edited - see
[Content pipeline](/content-pipeline).
