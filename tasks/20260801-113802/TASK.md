# Spike: can src/style.css split into @import partials with byte-identical compiled output

- PRIORITY: 0
- TAGS: spike
- KIND: SPIKE
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Question

Task 20260731-212617 gates its split of `src/style.css` on a byte-identical
compiled stylesheet. Can an `@import`-partial split reach that under the
current webpack (`style-loader`, `css-loader`, `postcss-loader`) and Tailwind
v4 setup? If not, what exactly changes, and is the change safe?

## Result

RECOMMENDED: split, with the proof relaxed from byte-identity to
whitespace-normalised identity.

Byte-identity is unreachable. `@tailwindcss/postcss` v4 resolves `@import`
itself and reserializes what it pulls in, collapsing multi-line selector lists
and multi-line declaration values onto single lines. Cascade order is otherwise
untouched: no rule reordered, merged, dropped, or duplicated. Pre-collapsing
the source cannot recover byte-identity, because it moves the unsplit baseline
by the same amount.

Rejected: importing partials from TypeScript instead, which avoids the
reserializer but adds ~58 KB to every bundle.

Untested and left as the owning task's real risk: whether the surfaces are
contiguous enough in file order to move as whole blocks.

## Evidence

- `SPIKE.md` - full reasoning, commands, measurements, and limitations.
- `prototype/split.py` - mechanical 4-way split at depth-0 line boundaries.
- `prototype/compile.js` - runs `src/style.css` through the project's own
  postcss config, sidestepping the `style-loader` JS wrapper.
- `prototype/unsplit.css`, `prototype/split.css`, `prototype/compiled.diff` -
  43961 -> 43485 bytes, 210 diff lines, every hunk whitespace.
- `prototype/baseline/SHA256` - master `dist/*.js` fingerprints; `npm run build`
  on the restored tree reproduces all six.

## Notes

Decision recorded in `tasks/20260731-212617/DECISION.md`; the epic's Fog entry
for the stylesheet split is closed out against it. No new task seeded - the
remaining question belongs to 20260731-212617.
