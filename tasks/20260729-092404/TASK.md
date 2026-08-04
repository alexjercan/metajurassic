# Repair broken Jurassic media references

- PRIORITY: 70
- TAGS: bug, content, ui
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player, I want species and clade cards to show valid icons and images, so that the museum collection feels polished instead of broken or placeholder-heavy.

## Review Findings

- Scope correction from the 2026-07-29 out-of-context review: every one of the 150 species `icon` fields is a stringified Python list (for example `['https://.../ceratosauria.svg']`), so every card in the game currently renders a broken icon image.
- The root cause is in the authored source, not the generated JSON: the frontmatter in `src/jurassic/species/*.md` already carries the list repr, presumably leaked from the scraping/generation pipeline in `scripts/`.
- The card renderer passes `species.icon` directly to `img src`, so malformed media values become visible UI defects.
- Archives, profile collection cards, and the info panel all depend on the same content quality.
- The `image` fields are all valid; only `icon` is affected.

## Steps

- [x] Use the data-integrity task results to list every malformed or missing media reference.
- [x] Fix the `icon` values at the source: correct the frontmatter in `src/jurassic/species/*.md` (and the pipeline in `scripts/` so it cannot regenerate the list repr), then regenerate `src/jurassic/index.json`.
- [x] Decide whether missing images should use a deliberate default visual, a locked/mystery treatment, or content repair.
- [x] Verify species archive, clades archive, profile collection, and in-game panel render without broken image icons.
- [x] Add regression coverage for representative species and clade cards.

## Definition of Done

- No committed Jurassic `icon` field is a serialized array string. (cmd: `rg -n "icon.*\\[|\\['https?://" src/jurassic/index.json src/jurassic/species src/jurassic/clades`)
- Representative cards render valid images or intentional fallbacks. (test: Jest or browser card rendering test)
- Browser route smoke tests for species, clades, and profile pass. (test: browser E2E route tests)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Depends on the validation work if possible, but can proceed manually if the broken references are already obvious.

## Merged Into 20260729-092352 (2026-07-30)

At that task's plan gate the user chose to fold this repair into the same cycle
rather than ship a quarantined test pin, because the validation harness and the
content fix are inseparable in practice: the harness's central assertion is the
very invariant this task restores. Both tasks are delivered by one branch and
close together; the REVIEW.md and RETRO.md for the combined cycle live in
`tasks/20260729-092352/`.

What this task's steps mean, as delivered:

- The 150 `icon` values were unwrapped in the AUTHORED frontmatter
  (`src/jurassic/species/*.md`) and `index.json` regenerated from it, so the
  generated payload was never hand-edited.
- Both pipeline scripts now REFUSE a serialized-collection frontmatter value
  instead of copying it through, which is the "so it cannot regenerate the list
  repr" step. The scraper that originally produced the repr is not in this
  repository, so refusal at the pipeline boundary is the containment available.
- "Decide whether missing images should use a deliberate default visual": no
  decision needed for the content - every one of the 150 species and 108 clades
  HAS both media fields. The renderer's existing fallbacks (default icon,
  `[ Hologram Render ]`, `[ No Image ]`) are now pinned by
  `test/cardRendering.test.ts` against constructed media-less input, since no
  route can reach that path with the shipped data.
- Regression coverage: `test/dataIntegrity.test.ts` pins
  `species.icon === clades[species.clade].image` over the real payload, and the
  `test.fixme` in `e2e/images.spec.ts` is now a real, passing test.
