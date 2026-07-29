# Validate Jurassic data and media integrity

- STATUS: OPEN
- PRIORITY: 75
- TAGS: testing,data,content

## Story

As a player browsing museum cards and playing daily puzzles, I want every species, clade, icon, and image reference to load correctly, so that broken content does not undermine the game.

## Review Findings

- The raw served `jurassic/index.json` uses keyed species and clade objects, which the loader normalizes.
- Scope correction from the 2026-07-29 out-of-context review: ALL 150 species `icon` fields are stringified Python lists (for example `['https://.../ceratosauria.svg']`), not just some. The root cause is upstream: the frontmatter in `src/jurassic/species/*.md` (the source of truth the scripts pipeline generates JSON from) already contains the list repr.
- The same review pass found the rest of the graph clean: 0 unresolvable species clade refs, 0 unresolvable clade parents, 0 duplicate names, and all `image` fields are valid single URLs.
- The current tests use small mock datasets and do not validate the real Jurassic content graph or media fields.

## Steps

- [ ] Add a data-integrity test over the real `src/jurassic/index.json` payload.
- [ ] Verify every species points to an existing clade after loader normalization.
- [ ] Verify every clade parent points to an existing clade or is intentionally rootless.
- [ ] Verify species names and ids are unique and non-empty.
- [ ] Verify media fields are either absent or valid URL/path strings, not serialized arrays or malformed placeholders.
- [ ] Verify archive/profile card rendering handles missing optional media gracefully.
- [ ] Verify text fields (species, translation, description, clade names) contain no HTML, since cards interpolate them into `innerHTML` unescaped (`src/ui/card.ts`).
- [ ] Validate the markdown frontmatter source under `src/jurassic/` too (or the scripts round-trip), so defects are caught where they are authored, not only in the generated JSON.
- [ ] Fix or create follow-up content tasks for any data defects found.

## Definition of Done

- Real Jurassic data has automated integrity coverage. (test: Jest data integrity test)
- Broken `icon` or `image` field shapes are caught by tests. (test: Jest data integrity test)
- Loader assumptions are explicit and covered. (test: Jest loader/data test)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- This is intentionally content-aware. Mock data tests are not enough for this category.
- If the real data contains many existing defects, split mechanical content cleanup into separate tasks rather than hiding it inside the test harness work.
- Fragility worth pinning with a test: `jsonLoader` keys the clade map by lowercase display name and discards the JSON key, so renaming a clade silently breaks every species/parent reference to it.
