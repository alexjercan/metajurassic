# Decision: Decide and, if safe, split src/style.css by surface

- DATE: 20260801-114157
- STATUS: ACCEPTED
- TASK: 20260731-212617
- TAGS: css, refactor, proof

## Context

This task's first Step was a gate: establish whether an import-partial split
can preserve byte-for-byte cascade order under the current webpack and Tailwind
setup, and close the task if it cannot. Spike 20260801-113802 answered it with
a working split and two builds.

## Decision

The split proceeds, and its proof criterion changes from **byte-identical** to
**whitespace-normalised identical** compiled CSS.

Byte-identity is unreachable. `@tailwindcss/postcss` v4 resolves `@import`
itself and reserializes everything it pulls in, collapsing multi-line selector
lists and multi-line declaration values onto single lines. Measured on a
4-partial mechanical split: compiled CSS 43961 -> 43485 bytes, 210 diff lines,
every hunk whitespace. Normalising whitespace makes the two byte-identical -
no rule reordered, merged, dropped, or duplicated.

Pre-collapsing the source does not recover byte-identity; it moves the unsplit
baseline by the same amount. The two goals are mutually exclusive, so the
criterion that survives is the one that actually guards rendering.

The proof is the spike's `compile.js` plus whitespace normalisation, run before
and after, recorded in the task record. Every other guard in the Steps is
unchanged: whole blocks move in file order, nothing is merged, deduped, or
reordered, full E2E layout suites run, and every surface is looked at at
desktop, narrow, and short viewports.

## Alternatives considered

- **Importing partials from TypeScript** instead of `@import`, avoiding
  Tailwind's reserializer entirely. Rejected: every bundle grew ~58 KB against
  43 KB of total compiled CSS, and it multiplies injected `<style>` tags.
- **Closing the task as "not worth it"**, the second branch of the Definition
  of Done. Rejected: the only obstacle found is a cosmetic serialisation
  difference with a named mechanism and a proof that covers it. Closing on that
  would discard a safe split.

## Consequences

- The Definition of Done's byte-identity clause is superseded by this record.
  Review should check the normalised diff, not `cmp`.
- The task's remaining risk is no longer the toolchain but the partition: if
  board/tree/panel/modal/profile/archive are interleaved in file order, moving
  a surface's blocks together reorders the cascade. That is exactly what the
  "whole blocks in file order" rule forbids, so a surface that cannot be moved
  as a contiguous run stays where it is - or the task closes on its second
  branch after all.
- There is no emitted `.css` asset (`style-loader` inlines CSS into
  `dist/*.js`), so bundle-size deltas are a secondary check and the postcss
  compile is the primary one.
