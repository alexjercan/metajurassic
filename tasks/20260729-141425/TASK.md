# Filter the species archive by clade

- PRIORITY: 60
- TAGS: feature, ux, archive
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

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

Presentation was settled with the user on 20260802; see "Presentation decision"
below. Recorded in `DECISION.md`.

- [x] Add `src/cladeFilter.ts` with two pure functions over `GameData`:
      `speciesInClade(data, cladeId)` returning the members whose
      `data.lineage(species.clade)` CONTAINS `cladeId` (not just the immediate
      clade), and `cladeFilterOptions(data)` returning
      `{ id, name, count }[]` sorted by `name.localeCompare`. Both take
      `GameData` as an argument; no module-level data loading.
      The membership idiom already appears at `src/hintRule.ts:93` and
      `test/dataIntegrity.test.ts:98` - reuse its shape, do not invent a new one.
- [x] Add `test/cladeFilter.test.ts` over the REAL `src/jurassic/index.json`
      (via the same loader path the other content tests use, not a mock):
      `speciesInClade(data, "cerapoda")` has 35 members drawn from 22 distinct
      immediate clades, none of which is `cerapoda` itself; `"dinosauria"`
      returns all 150; every `cladeFilterOptions` count equals a brute-force
      lineage scan; an unknown id returns `[]`.
      Counts measured 20260802 against the checked-in payload; if content
      changes, assert the invariant and the >1-immediate-clade property rather
      than re-pinning a number by hand.
- [x] Add the filter control to `src/species.html`: a single native
      `<select id="clade-filter">` in a labelled row between `.archive-subtitle`
      and `.archive-carousel-wrapper`, with `All clades (150)` first and one
      option per clade, alphabetical, labelled `Cerapoda (35)`.
      Native `<select>` is the phone picker; no new widget.
- [x] Rework `src/species.ts` around the filter. Attach `setupCarouselNav` ONCE,
      outside the re-render, and re-render only the cards on `change`.
      `src/profile/dinosaurList.ts:48` re-runs `setupCarouselNav` inside its
      render and stacks a duplicate listener set on every toggle; do not copy
      that. Reset `carousel.scrollLeft = 0` after a re-render, and refresh the
      nav button state so it re-evaluates against the new list.
- [x] Read `?clade=<id>` from `location.search` on load: lowercase it, accept it
      only if `data.findCladeById` resolves it, otherwise fall back to all
      species. On `change`, keep the URL coherent with
      `history.replaceState` (needed because the `/clades` deep link below
      arrives with a param that would otherwise go stale).
- [x] Link each clade card on `/clades` into the filtered view: in
      `src/clades.ts`, append an anchor to `/species/?clade=<clade.id>` to the
      card after `createCladeCard` returns. Do NOT add the link inside
      `createCladeCard` (`src/ui/card.ts:117`) - that builder is shared with the
      in-round panel, which must not offer this route.
- [x] Add one `Archive` link to `src/_footer.html` pointing at
      `<%= basePath %>species`, so the filter is reachable without the FAQ.
      Cross-links between the two archives are deferred; `/clades` stays
      FAQ-reachable.
- [x] Style the filter row in `src/partials/archive.css` (the archive partial,
      after `.archive-subtitle`), following the `.profile-filter-toggle`
      precedent at `src/partials/profile.css:377`. `/species` is a
      `page-fixed` page: confirm the new row does not push the carousel out of
      view. The `calc(100vh - 200px)` budget this step proposed adjusting was
      replaced rather than tuned - see the close-out - and its declarations are
      now removed as dead. Keep the `src/style.css` import order untouched.
- [x] Add `e2e/archiveFilter.spec.ts` for the two browser-level DoD items
      (see Definition of Done for the exact assertions).

## Definition of Done

- The Species Archive can be filtered to the members of any clade, including
  higher clades that are no card's immediate clade. (test: `e2e/archiveFilter.spec.ts`
  selects `cerapoda`, asserts 35 `.archive-card` remain, and reads the rendered
  `Clade:` line off the cards to assert more than one distinct immediate clade
  and that none of them is Cerapoda)
- Arriving at `/species/?clade=cerapoda` applies the filter, and an unknown
  `?clade=` value falls back to all 150 species rather than an empty page.
  (test: `e2e/archiveFilter.spec.ts`)
- A clade card on `/clades` links into its filtered species view.
  (test: `e2e/archiveFilter.spec.ts` clicks the link on a named clade card and
  asserts the landed page is filtered)
- The filter is reachable without going through the FAQ. (test:
  `e2e/archiveFilter.spec.ts` starts at `/`, clicks the footer Archive link,
  and asserts `#clade-filter` is visible)
- Lineage-aware membership holds over the real payload, not a mock. (test:
  `test/cladeFilter.test.ts`; `LESSONS.md`
  `mock-fixtures-hide-real-data-defects-test-the-real-payload`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Presentation decision (20260802, with the user)

- **Native `<select>`, alphabetical, with member counts.** The player arrives
  already knowing a clade NAME - from a hint (`20260729-141424`) or from a
  card - so alphabetical is the fastest lookup for the actual entry path.
- Rejected: `<optgroup>` grouped by tree DEPTH. It teaches the hierarchy but
  buries a known name across 16 levels, which is the opposite of the entry path.
- Rejected: a typeahead reusing `findMatches` (`src/ui/autocomplete.ts:18`). It
  is a new widget on the page and removes any way to BROWSE what clades exist.
- Restricting the list to clades with more than one member was considered and
  dropped: measured 20260802, 107 of the 108 clades already have more than one
  member, so the restriction prunes one option and buys nothing.

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

## Close-out (20260802)

### What and why

`/species` gained a native `<select>` clade filter, and clade membership became
lineage-aware so a higher clade like Cerapoda - which is no card's immediate
clade - resolves to its 35 members instead of nothing. The clade-to-species
mapping stays out of a round by design (`DECISION.md`); this is the page a
player goes to instead.

- `src/cladeFilter.ts`: `speciesInClade` and `cladeFilterOptions`, pure over
  `GameData`, both reusing the `lineage(...).includes(...)` idiom already at
  `src/hintRule.ts:93`.
- `src/species.ts`: reworked around the filter, reading `?clade=` on load and
  keeping the URL coherent with `history.replaceState` on change.
- `src/clades.ts`: each clade card gained a `See species in X` deep link,
  appended OUTSIDE `createCladeCard` so the shared in-round panel does not get
  the route.
- `src/_footer.html`: an `Archive` link, so the filter is reachable without the
  FAQ.

### Alternatives and difficulties

- **Carousel nav listener stacking.** The plan warned that
  `src/profile/dinosaurList.ts:48` re-runs `setupCarouselNav` inside its render
  and stacks a listener set per toggle. Attaching once was not sufficient on its
  own: the plan's `carousel.scrollLeft = 0` was meant to re-run the button check
  via the `scroll` event, but that event does NOT fire when the position was
  already 0, so a filter change from one short list to another left the nav
  buttons in a stale disabled state. `setupCarouselNav` now RETURNS its
  `updateButtons` and the render calls it explicitly.
- **Deep-link base path.** First draft derived the base from
  `location.pathname`. Replaced with `__webpack_public_path__`, the precedent
  already at `src/game/hintChip.ts:20`, which is correct under the
  `/metajurassic/` GitHub Pages prefix without regex guessing.
- **The deep link was unclickable.** `.museum-card::after` paints a backdrop at
  `z-index: 1`, so a link appended outside `.museum-card-inner` rendered and
  received clicks BEHIND it. Playwright caught it as "card intercepts pointer
  events". Fixed with `position: relative; z-index: 2`, matching
  `.museum-card-inner`.
- **The filter row broke the fixed-height page.** `/species` is `page-fixed`,
  and `.archive-card`'s `min-height: min(420px, calc(100vh - 200px))` floor does
  not know about the new row: the card overflowed the carousel by 9px at
  1280x720. The plan offered subtracting more from the shared `100vh` budget,
  but 420px is the binding term at that viewport, so a bigger subtrahend changes
  nothing. Instead the budget is scoped to the archives that need it
  (`.archive-container-fitted .archive-card { max-height: 100%; min-height: 0 }`),
  which sizes against the carousel's own box and adds no second magic number.
  Review round 2 found `/clades` needed the same rule - its cards were already
  taller than their carousel, so the appended members link fell 38px into the
  clipped zone at 320x568 - so the class is on both archives and named for what
  it does rather than for the filter. `/profile` card geometry is untouched.
- **The footer link regressed the onboarding brief.** See `DECISION.md`; the
  fourth link wrapped the footer at 320px and clipped the brief by 12px. Fixed
  by shortening the longest label at narrow widths, not by weakening the test.

### Evidence

- `test/cladeFilter.test.ts`: 6 tests over the REAL `src/jurassic/index.json`.
  Cerapoda has 35 members across 22 distinct immediate clades, none of them
  Cerapoda; every option count matches a brute-force lineage scan.
- `e2e/archiveFilter.spec.ts`: 13 tests covering all four browser-level DoD
  items, plus the fixed-height layout at desktop AND narrow viewports, the
  carousel nav across re-renders, and the clade card's link at 320x568, reusing
  `expectFullyVisibleWithin` from `e2e/helpers/viewport.ts`.
- `npm run ci`: green - 336 unit tests, 139 E2E. `npm run build`: compiles.

### Reflection

Two of the three real defects here were caught only because an assertion
measured GEOMETRY rather than presence: the clipped card and the clipped
onboarding brief would both have passed any `toBeVisible` check. Reaching for
the existing `expectFullyVisibleWithin` helper instead of the hand-rolled
viewport comparison in the first draft is what turned the card overflow from
green to red - the hand-rolled version compared against the viewport only and
missed the clipping ancestor.

The onboarding regression is the more general lesson: a footer is shared by
every page, so "add one link" is a global layout change, and the smallest
supported viewport is where it gets paid for.
