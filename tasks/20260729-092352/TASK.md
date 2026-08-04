# Validate Jurassic data and media integrity

- PRIORITY: 75
- TAGS: testing, data, content
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player browsing museum cards and playing daily puzzles, I want every species, clade, icon, and image reference to load correctly, so that broken content does not undermine the game.

## Review Findings

- The raw served `jurassic/index.json` uses keyed species and clade objects, which the loader normalizes.
- Scope correction from the 2026-07-29 out-of-context review: ALL 150 species `icon` fields are stringified Python lists (for example `['https://.../ceratosauria.svg']`), not just some. The root cause is upstream: the frontmatter in `src/jurassic/species/*.md` (the source of truth the scripts pipeline generates JSON from) already contains the list repr.
- The same review pass found the rest of the graph clean: 0 unresolvable species clade refs, 0 unresolvable clade parents, 0 duplicate names, and all `image` fields are valid single URLs.
- The current tests use small mock datasets and do not validate the real Jurassic content graph or media fields.

## Plan (2026-07-30)

A pre-plan scan of the real payload (150 species, 108 clades) reproduced the
review findings exactly and found nothing else: 0 unresolvable species clade
refs, 0 unresolvable clade parents, 1 intentional rootless clade
(`dinosauria`), 0 duplicate names, 0 empty fields, 0 clade-key/name mismatches,
all 258 `image` values well-formed, 0 HTML-ish characters in any text field -
and all 150 species `icon` values stringified Python lists. So there is exactly
one defect to repair, and at the gate the user chose to fold that repair
(`20260729-092404`) into this cycle rather than ship a quarantined pin - the two
tasks are delivered by one branch and both close together.

Three load-bearing choices, recorded in `DECISION.md`:

1. **The repair is folded into this cycle (user decision, 2026-07-30), so no
   quarantine pin is needed.** This branch also delivers `20260729-092404`:
   unwrap the 150 frontmatter `icon` values, harden the pipeline against
   re-laundering the defect, regenerate `index.json`, and let every icon
   assertion land as a plain green test - including flipping the `test.fixme`
   in `e2e/images.spec.ts` on. The alternative (harness now, `test.failing`
   quarantine, repair in a later cycle) was presented at the gate and
   rejected. A stronger invariant is available than "well-formed URL": every
   one of the 150 icons is a 1-element list whose URL is EXACTLY the species'
   own clade `image`, so after the unwrap the test pins
   `species.icon === clades[species.clade].image`.
2. **Source validation is a round-trip equality pin, not a second parser.**
   `parseFrontMatter` moves out of `src/markdownLoader.ts` into a shared
   `src/frontMatter.ts`; the test parses every `src/jurassic/**/*.md` with it
   and asserts the reconstructed graph equals the committed `index.json`
   byte-for-byte in content. That validates the authored source AND proves the
   generated file is in sync, and keeps the TS parser honest against the
   Python one in `scripts/markdown_to_json.py` (divergence = red), instead of
   hand-copying a mirror that rots.
3. **Card rendering gets a jsdom test file.** Adds `jest-environment-jsdom` and
   a per-file `@jest-environment jsdom` docblock; the default env stays `node`.

## Steps

- [x] Add `test/dataIntegrity.test.ts` over the real payload, built through the
      shipped `buildGameData` (not a re-implementation).
- [x] Verify every species points to an existing clade after loader normalization.
- [x] Verify every clade parent resolves, and exactly one clade is rootless.
- [x] Verify species ids/names and clade ids/names are unique and non-empty.
- [x] Pin the `jsonLoader` fragility: the clade map is keyed by lowercase display
      name and the JSON key is discarded, so key and lowercase name must agree.
- [x] Verify `image` fields are well-formed absolute URLs, and that no media
      value is a serialized array or other non-scalar repr.
- [x] REPAIR (folds in `20260729-092404`): unwrap the `icon` frontmatter in all
      150 `src/jurassic/species/*.md`, make `scripts/markdown_to_json.py` REJECT
      a non-scalar frontmatter value loudly instead of laundering it into
      `index.json`, and regenerate `index.json`.
- [x] Pin the repaired invariant: every species `icon` equals its own clade's
      `image`. Flip the `test.fixme` in `e2e/images.spec.ts` on.
- [x] Verify text fields (species, translation, description, clade names)
      contain no HTML, since cards interpolate them into `innerHTML` unescaped.
- [x] Extract `parseFrontMatter` into `src/frontMatter.ts`, rewire
      `src/markdownLoader.ts` to it.
- [x] Add `test/contentSource.test.ts`: parse the markdown frontmatter source and
      assert it round-trips to the committed `index.json` exactly.
- [x] Add `test/cardRendering.test.ts` (jsdom): species/clade/locked cards with
      missing `icon`/`image` fall back to the default icon and the
      `[ Hologram Render ]` / `[ No Image ]` placeholders rather than emitting
      an empty `src`.
- [x] Verify the species, clades and profile routes render icons for real in the
      browser (the `20260729-092404` DoD item), via the E2E suite.
- [x] Close `20260729-092404` as delivered by this branch: tick its steps, record
      the merge in its `TASK.md`, and give it the same REVIEW/RETRO pointer.
- [x] File a follow-up task for the dead `src/markdownLoader.ts`.
- [x] Run `npm run ci` green and `tatr check --ledger LESSONS.md` clean.

## Definition of Done

- Real Jurassic data has automated integrity coverage over the shipped payload,
  not a mock. (test: `npx jest test/dataIntegrity.test.ts`)
- Broken `icon` or `image` field shapes are caught by tests, with no quarantined
  or softened assertion left behind. (test: `npx jest test/dataIntegrity.test.ts`)
- No committed Jurassic media value is a serialized array string.
  (cmd: `grep -rn "\['https\?://" src/jurassic`)
- Every species `icon` resolves to its own clade's `image`.
  (test: `npx jest test/dataIntegrity.test.ts`)
- The pipeline refuses to regenerate a non-scalar frontmatter value: run against
  a poisoned temp content tree it exits non-zero and names the offending file.
  (cmd: `python scripts/markdown_to_json.py --jurassic-path <poisoned-tmp>`)
- The species-card icon assertion in `e2e/images.spec.ts` runs green as a real
  test, not `test.fixme`. (test: `npm run test:e2e`)
- The authored markdown frontmatter is validated and proven in sync with the
  generated `index.json`. (test: `npx jest test/contentSource.test.ts`)
- Loader assumptions are explicit and covered, including the discarded-clade-key
  fragility. (test: `npx jest test/dataIntegrity.test.ts`)
- Cards render intentional fallbacks when optional media is absent.
  (test: `npx jest test/cardRendering.test.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)
- `tatr check --ledger LESSONS.md` is clean. (cmd: `tatr check --ledger LESSONS.md`)

## Evidence (2026-07-30)

- Test-first: `test/dataIntegrity.test.ts` was written and run BEFORE the
  repair. It failed 3 of 15 - exactly the icon assertions (well-formed icon,
  icon-equals-clade-image, no serialized collection) - and the other 12 passed.
  After the repair all 15 pass.
- The staleness pin was verified by breaking it on purpose: changing
  `size: 3.5 meters` to `3.6` in one species markdown reddens
  "regenerates index.json exactly", and only that test.
- Pipeline refusal, run against a poisoned copy of the content tree:
  `python scripts/markdown_to_json.py --jurassic-path <tmp>` exits 1 with
  `error: <tmp>/species/zuniceratops.md: frontmatter 'icon' is a serialized
  collection, not a scalar: [...]`, and writes NEITHER output file, so a
  rejected value cannot leave a half-rewritten index.json.
- Repair diff: 150 markdown files, one `icon:` line each, plus the 150
  matching lines in the regenerated `index.json`. Nothing else changed in the
  content. `grep -rn "\['https\?://" src/jurassic` returns nothing.
- Full gate green in the worktree: `npm run ci` -> 279 Jest tests in 18 suites,
  87 Playwright tests, including the species-icon assertion that had been
  parked as `test.fixme`.
- Coverage rose enough that the old floors stopped guarding anything, so
  `jest.config.js` thresholds were raised to just under the new numbers
  (statements 89 -> 94, branches 65 -> 78, lines 93 -> 97, functions 95 -> 98).
  This is adjacent to `20260729-092419` (tighten CI signal) but leaving stale
  floors and stale "Current:" comments behind was the worse option.

## Notes

- This is intentionally content-aware. Mock data tests are not enough for this category.
- If the real data contains many existing defects, split mechanical content cleanup into separate tasks rather than hiding it inside the test harness work.
- Fragility worth pinning with a test: `jsonLoader` keys the clade map by lowercase display name and discards the JSON key, so renaming a clade silently breaks every species/parent reference to it.
- Found while planning (2026-07-30): `src/markdownLoader.ts` is DEAD CODE - every page imports `loadGameData` from `jsonLoader`, nothing imports `markdownLoader`. Whether to delete it is a follow-up task (`20260730-120401`), not this one; this task only lifts its frontmatter parser into a shared module that the source-validation test can use. Correction to the planning note: it does NOT show up in the coverage report at all - not as 0%, but absent - which the follow-up should explain before deleting.
- Out of scope but noted: `src/ui/card.ts` interpolates content into `innerHTML` unescaped. With in-repo authored content there is no injection vector today, so this task guards the DATA (no HTML in content) rather than changing the renderer.
