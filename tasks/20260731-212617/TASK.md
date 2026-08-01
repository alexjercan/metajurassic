# Decide and, if safe, split src/style.css by surface

- STATUS: OPEN
- PRIORITY: 50
- TAGS: refactor, ui, css
- KIND: STORY
- FLOW STEP: PLANNED
- PLAN STATUS: APPROVED
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer changing a layout rule, I want to find the block that owns it
without scrolling 2403 lines, so that a media-query fix lands in the right
place the first time.

## Problem

`src/style.css` is the largest file in the repo at 2403 lines. Every surface -
board, tree, panel, modal, profile, archive - shares one stylesheet with
interleaved media blocks.

This is the riskiest child in the epic and may correctly close as "not worth
it". CSS cascade order is load-bearing here: `LESSONS.md` records
`css-media-blocks-on-different-axes-are-resolved-by-file-order` and
`converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`.
A split that reorders declarations changes rendering, which this epic forbids.

## Steps

- [x] Decide first, split second. Done by spike `20260801-113802`: cascade
      order is preserved exactly, byte-identity is not (Tailwind reserializes
      imported rules' whitespace). Proceed, with the relaxed proof in
      `DECISION.md`.
- [ ] On master, BEFORE any edit, capture the baseline and the walkthrough
      captures:
      `nix develop --command node tasks/20260801-113802/prototype/compile.js > /tmp/.../baseline.css`,
      then `npm run playtest:walkthrough` and keep `playtest-shots/`. There is
      no emitted `.css` asset - `style-loader` inlines CSS into `dist/*.js`, so
      the postcss compile is the comparison surface.
- [ ] Create `src/partials/` and move the 2400 body lines of `src/style.css`
      into the 14 partials in the table under `## Notes`, in file order, cutting
      only at blank lines at brace depth 0 so a rule's leading doc comment
      travels with it. `src/style.css` keeps the three `@tailwind` directives
      and gains one `@import "./partials/<name>.css";` per partial in that same
      order. Move text verbatim: do not merge, dedupe, reorder, or reformat
      declarations.
- [ ] Keep the three trailing media blocks together in `responsive.css`, last.
      Splitting them per surface into the surface partials would put a
      surface's base rules after another surface's `768px` rules, which is a
      reorder - see `## Notes`.
- [ ] Prove the compiled output is unchanged: recompile with the same command,
      `diff -u` against the baseline and confirm every hunk is whitespace, then
      confirm the whitespace-normalised pair is byte-identical. Any
      non-whitespace hunk means the split changed the cascade; fix the order or
      abandon the split. Record both the diff line count and the `cmp` result
      in the task record.
- [ ] Re-render and look at every surface at desktop, narrow, and short
      viewports, comparing against the pre-split captures - an identical
      bundle still deserves eyes
      (`LESSONS.md`: `re-render-and-look-after-every-layout-change-not-once-per-task`).
- [ ] Run `npm run ci` and `npm run build`. Confirm `dist/*.js` hashes match
      `tasks/20260801-113802/prototype/baseline/SHA256` modulo the expected
      whitespace shrink, and record the actual sizes.

## Definition of Done

- `src/style.css` is under 25 lines and `src/partials/` holds the 14 partials
  from `## Notes`, each named for one surface.
  (cmd: `wc -l src/style.css src/partials/*.css`, recorded; red on master,
  where the file is 2403 lines and `src/partials/` does not exist)
- The compiled CSS is identical to the pre-split baseline once whitespace is
  normalised, and every raw diff hunk is whitespace only. Byte-identity is
  unreachable for a named reason - see `DECISION.md` and spike
  `20260801-113802`.
  (cmd: `compile.js` before and after, `diff -u` inspected, normalised `cmp`,
  all recorded)
- Or: the task closes with a recorded finding that the split cannot preserve
  cascade order, naming the mechanism that prevents it. (test: `DECISION.md`)
- Every E2E layout suite passes unchanged. (cmd: `npm run test:e2e`)
- Screens read at desktop, narrow, and short viewports, and compared against
  pre-split captures. (cmd: `npm run playtest:walkthrough`, images reviewed)
- `npm run ci` and `npm run build` pass. (cmd: both)

## Notes

### Discovered facts

- Prettier does not cover CSS (`package.json` `format`/`format:check` list
  `.ts`, `.html`, `webpack.config.js`, `playwright.config.ts` only), so moved
  text stays verbatim and `format:check` cannot reformat a partial.
- The partials are not webpack modules. Tailwind resolves `@import` inside the
  postcss stage, so only `src/style.css` is ever a module; webpack's
  `test: /\.css$/i` rule never sees `src/partials/*.css`.
- `src/style.css` is imported by six entries (`src/index.ts`, `clades.ts`,
  `faq.ts`, `practice.ts`, `species.ts`, `profile/index.ts`). None of them
  change.

### Partition

Surfaces are already contiguous in file order - the split is a set of cuts, not
a rearrangement. Line ranges are from master and are the plan's intent, not
line numbers to trust blindly; cut at the blank line above each first rule.

| # | Partial | Lines | Owns |
|---|---------|-------|------|
| 00 | `tokens.css` | 5-23 | `:root` custom properties |
| 01 | `base.css` | 25-107 | `body`, `header`, `.game-title`, `.profile-button`, `html.page-fixed` |
| 02 | `game-shell.css` | 109-278 | `main`, `.game-container`, `.top-bar`, `.stat-box`, `.new-game-btn`, `.hint-box`, `.hint-text`, `.game-area`, `.ad-container` |
| 03 | `arena.css` | 280-398 | `.arena-wrapper`, `.arena`, `.onboarding-brief`, `.brief-*` |
| 04 | `tree.css` | 401-643 | `.tree*`, `.node-*`, `@keyframes pulseMystery`, `@keyframes popIn` |
| 05 | `panel.css` | 644-744 | `.info-panel`, `.panel-card-container`, `.panel-pull*` |
| 06 | `card.css` | 745-1020 | `@property --card-glow-angle`, `.museum-card*`, `.card-*` |
| 07 | `input.css` | 1022-1137 | `.bottom-bar`, `.input-wrapper`, `.input-error`, `.autocomplete-*`, `.player-input` |
| 08 | `footer.css` | 1139-1178 | `footer` |
| 09 | `modal.css` | 1181-1383 | `.modal-overlay`, `.modal*`, `.share-icon`, `@keyframes modalIn` |
| 10 | `faq.css` | 1385-1479 | `.faq-*`, `.archive-links` (the FAQ page's archive list) |
| 11 | `profile.css` | 1482-1925 | `.profile-*`, `@keyframes fadeIn` |
| 12 | `archive.css` | 1928-2059 | `.archive-*`, `.carousel-btn*` |
| 13 | `responsive.css` | 2061-2403 | `@media (max-width: 768px)`, `(max-height: 700px)`, `(max-height: 620px)` |

### Why the media blocks stay together

The `768px` block is itself surface-grouped, so folding each surface's slice
into its own partial looks tempting. It is a reorder: today every base rule
precedes every `768px` rule, and per-surface partials would put, say, `tree`'s
base rules after `game-shell`'s `768px` rules. Proving no cross-surface pair
collides at equal specificity is exactly the reasoning this epic forbids
(`LESSONS.md`: `css-media-blocks-on-different-axes-are-resolved-by-file-order`).
`responsive.css` at ~343 lines is still a searchable file.

### Assumptions

- The story's "find the block that owns it" is satisfied by surface partials
  plus one responsive file. A maintainer fixing a media query opens
  `responsive.css`, not the surface file. If review wants base and responsive
  co-located per surface, that is a different task with a different risk
  profile, not an adjustment to this one.
- Reusing the spike's `compile.js` from `tasks/20260801-113802/prototype/`
  rather than promoting it to `scripts/`. One caller, one task - promoting it
  would add repo surface a check must then keep green (YAGNI).
