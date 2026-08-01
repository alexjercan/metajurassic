# Spike: can src/style.css split into @import partials with byte-identical compiled output

- DATE: 20260801-113804
- STATUS: RECOMMENDED
- TAGS: spike, css, refactor

## Question

Task 20260731-212617 gates its split on a byte-identical compiled stylesheet.
Can `src/style.css` (2403 lines) be split into `@import`ed partials so the
compiled CSS is byte-for-byte what master produces? If not, what exactly
changes, and is the change safe?

## Context

Toolchain, from `package.json` and `webpack.config.js:87`:

| Piece | Version / value |
|-------|-----------------|
| webpack rule | `use: ["style-loader", "css-loader", "postcss-loader"]` |
| postcss plugins | `@tailwindcss/postcss`, `autoprefixer` (`postcss.config.js`) |
| tailwindcss | 4.1.18 (`nix develop --command node -e "require('tailwindcss/package.json').version"`) |
| css-loader | 7.1.3 |

Two consequences shape the answer:

- `style-loader` means there is no emitted `.css` asset. The compiled CSS lives
  inside `dist/*.js` as a string. The task's "diff the built CSS" step has no
  file to diff; it needs either a bundle diff or a postcss-level compile.
- `@tailwindcss/postcss` v4 resolves `@import` itself, before `css-loader` ever
  sees it. The import graph is bundled and **reserialized** by Tailwind.

`src/style.css` is imported by six entry points (`src/index.ts`, `clades.ts`,
`faq.ts`, `practice.ts`, `species.ts`, `profile/index.ts`).

## Options considered

### A. `@import` partials from `src/style.css` - RECOMMENDED

`@tailwind` directives stay in `style.css`; the 2400 body lines move into
partials imported in file order.

Prototype: `prototype/split.py` cut the body into 4 partials at depth-0 blank
lines (never inside a rule, media block, or comment), preserving order:

```sh
python3 tasks/20260801-113802/prototype/split.py 4
nix develop --command node tasks/20260801-113802/prototype/compile.js > split.css
git checkout src/style.css && rm -rf src/partials
nix develop --command node tasks/20260801-113802/prototype/compile.js > unsplit.css
diff -u unsplit.css split.css
```

Observed:

- `npm run build` succeeded. `@import` after the `@tailwind` directives did not
  error, despite the CSS rule that `@import` precede other rules.
- Every bundle shrank by exactly 286 bytes (e.g. `index.js` 191678 -> 191392).
- Compiled CSS: 43961 -> 43485 bytes, 210 diff lines
  (`prototype/compiled.diff`).
- Every hunk is whitespace. Tailwind's import bundler collapses multi-line
  selector lists (`.tree li::before,\n.tree li::after` -> one line) and
  multi-line declaration values (`transition:` lists, `linear-gradient(...)`)
  onto single lines. Nothing else.
- Normalising runs of whitespace and space-around-commas makes the two files
  **byte-identical** (`cmp` on the normalised pair). No rule was reordered,
  merged, dropped, or duplicated.

So byte-identity against the current master baseline is **not achievable**, and
the mechanism is named: `@tailwindcss/postcss` reserializes every rule it pulls
in through `@import`, discarding the source's intra-rule line breaks. Semantic
identity **is** achievable and is provable by the normalised diff.

Byte-identity cannot be recovered by pre-collapsing the source either: that
would change the *unsplit* baseline by the same 476 bytes, so the comparison
against master's output still fails. The two goals are mutually exclusive.

### B. Import each partial from TypeScript instead - REJECTED

Keep `@tailwind` in `style.css`, add `src/styles.ts` importing `style.css` plus
each partial in order, and point the six entries at it. Each partial becomes
its own css-loader module; `style-loader` injects them as separate `<style>`
tags in import order, so no Tailwind import-bundling and no reserialization.

Observed: every bundle grew by ~58 KB (`index.js` 191678 -> 249621), against
43 KB of total compiled CSS. Preflight is not duplicated (the
`*, ::before, ::after` marker still occurs once), so the growth is the partials
being emitted at roughly source size, comments retained, not run through the
compaction the main sheet gets. I did not attribute the last of that growth
precisely; the magnitude alone is disqualifying. It also multiplies the
injected `<style>` tags, which is a rendering-order surface this epic should
not be opening.

### C. Do not split - viable fallback

The epic explicitly permits this child to close as "not worth it". Option A's
cost is one relaxed acceptance criterion. C stays available if review disagrees
with relaxing it.

## Recommendation

Take **A**, with the task's done criterion changed from byte-identity to
**whitespace-normalised identity of the compiled CSS**, proven by the
prototype's compile-and-normalise commands. Byte-identity is unreachable for a
named, understood, benign reason; holding the task to it would close a split
the evidence says is safe.

The other guards stay exactly as written: whole blocks move in file order, no
merging or deduping or reordering of declarations, full E2E layout suites, and
eyes on every surface at desktop, narrow, and short viewports.

## Open questions

- Where the surface boundaries actually fall. The prototype cut at arbitrary
  quarter points to test the mechanism; it says nothing about whether
  board/tree/panel/modal/profile/archive are separable in file order. A surface
  may be interleaved across the file, and moving its blocks together would
  reorder the cascade. That is the real risk and it is untested here.
- Whether the 286-byte-per-bundle shrink holds at a different partition. It
  should - it is a function of how many multi-line constructs land inside an
  import - but the number is not a constant to assert against.

`prototype/baseline/SHA256` fingerprints the master `dist/*.js` this spike
measured against; the bundles themselves are build output and are not kept.

## Prototype limitations

- One partition (4 equal chunks) and one build. No surface-aligned partition
  was attempted, and no browser rendered either output.
- `compile.js` runs postcss directly. It reproduces the loader chain's postcss
  stage, not `css-loader`/`style-loader` behaviour; the bundle-size figures
  above are the check on that gap.
- The E2E suites and the visual walkthrough were not run against the split.

## Next steps

- 20260731-212617 keeps the split, with the relaxed proof. Its `DECISION.md`
  records the criterion change.
- The surface-boundary question stays inside that task rather than seeding a
  new one: it is answered by doing the partition, and if surfaces turn out to
  be interleaved beyond repair the task still closes on its "not worth it"
  branch.
