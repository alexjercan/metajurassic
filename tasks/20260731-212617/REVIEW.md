# Review: Decide and, if safe, split src/style.css by surface

- DATE: 20260801-124500
- TASK: 20260731-212617
- BRANCH: refactor/split-style-css
- WORKTREE: /home/alex/.cache/sprouts/metajurassic/refactor/split-style-css

## Round 1

- REVIEWER: primary, in session. The out-of-context reviewer was not
  available: subagent dispatch is disabled for this session. Compensated by
  re-deriving every load-bearing claim from the diff rather than from the
  close-out, using a check the implementation did not run (below).
- VERDICT: REQUEST_CHANGES

### Independent re-derivation

The close-out rests on the compiled-CSS proof. That proof runs through
Tailwind, so it can only be as trustworthy as the compiler. I re-derived the
same conclusion without compiling at all:

    { head -4 <master:src/style.css>; \
      grep -o 'partials/[a-z-]*\.css' src/style.css | while read p; do cat "src/$p"; echo; done; }

Reading the partials back **in the order style.css imports them** and diffing
against master:

| Check | Result |
|---|---|
| whitespace-insensitive token stream | identical - nothing merged, dropped, duplicated or reordered |
| `diff <(cat -s master) <(cat -s rebuilt)` | one added trailing blank line, nothing else - every line byte-identical, indentation included |

This is stronger than the compiled-CSS proof and independent of it: the import
list reconstructs master exactly, so cascade order is preserved by
construction.

Re-ran the compiled proof from a true master checkout of `src/style.css`
(the close-out's numbers reproduce): 43729 B -> 43253 B, 210 diff lines, 15
hunks, whitespace-normalised `cmp` exit 0.

`npm run ci` re-run on `E2E_PORT=8282`: exit 0, 323 Jest, 126 Playwright.
`tatr check`: clean. Every partial starts at a rule or its own leading comment
and ends at `}`; `responsive.css` is imported last.

### Findings

#### 1. MAJOR - a drift-guard comment now names a file that no longer holds
the rule it guards

`src/ui/panel.ts:22`

    // MIRRORS the `@media (max-width: 768px)` block in src/style.css, where
    // `.info-panel` becomes `width: 100%` and overlays the arena instead of
    // sitting beside it. Do not move one number without the other...

The block moved to `src/partials/responsive.css`. This comment exists to stop
`NARROW_VIEWPORT_QUERY` from drifting from the CSS, and its named failure mode
is "a stale query auto-opens the panel over the tree". A maintainer who
follows the pointer opens an 18-line file with no media query in it and has to
guess whether the mirror still exists. The diff created that gap; the task's
own story is "find the block that owns it without scrolling", so a pointer
that no longer resolves is squarely in scope.

Change: point it at `src/partials/responsive.css`.

#### 2. MINOR - two more stale pointers to `style.css`

- `src/closeness.ts:38` - "the board's colours (`.node-close-*` in
  style.css)". Now `src/partials/tree.css`.
- `src/index.html:93` - "see .input-error in style.css". Now
  `src/partials/input.css`.

Same defect as finding 1 with lower stakes: neither guards a mirrored value,
and `test/closeness.test.ts` still enforces the `closeness.ts` one
mechanically. Fix them in the same pass.

#### 3. MINOR - nothing in `src/style.css` says the import order is
load-bearing

`src/style.css:5-18`

The file is now a bare list of 14 imports. Alphabetising it, or moving
`responsive.css` up to sit beside the surface it modifies, silently changes
rendering - which is exactly the failure `LESSONS.md`
(`css-media-blocks-on-different-axes-are-resolved-by-file-order`) records and
this epic forbids. `AGENTS.md` now says "in cascade order", but the trap is
sprung in this file, not in `AGENTS.md`.

Change: one comment above the import list stating that the order is the
cascade and `responsive.css` must stay last. This is the kind of comment the
repo's rules explicitly protect ("comments that guard a value").

### Accepted without change

- `test/closeness.test.ts:174-181` reading through the `@import` list rather
  than globbing `src/partials/*.css`. The glob would pass for a partial that
  is never imported; following the list will not. Correct call, and the
  close-out's falsification (drop the `tree.css` import, 5 failures return)
  reproduces.
- Keeping the three media blocks together in `responsive.css`. Splitting them
  per surface reorders base rules after another surface's `768px` rules; the
  plan's reasoning holds.
- Not promoting the spike's `compile.js` to `scripts/`. One caller.
- Unnumbered partial filenames. The plan's `##` column is a table index, not a
  filename prefix; finding 3 covers the ordering risk directly.

### Pending user checks

None. No `manual:` proofs in the Definition of Done.
## Round 2

- REVIEWER: primary, in session (same exception as round 1: subagent dispatch
  disabled). Fixes are comment-only, so the check that matters is whether each
  pointer now resolves - verified by opening each named file, not by trusting
  the response table.
- VERDICT: APPROVE

### Responses verified

| Finding | Fix | Verified |
|---|---|---|
| 1 MAJOR | `src/ui/panel.ts:22-23` now names `src/partials/responsive.css` | that file holds the `@media (max-width: 768px)` block with `.info-panel { width: 100% }`; the mirror resolves again. Fixed |
| 2 MINOR | `src/closeness.ts:37`, `src/index.html:93` | `.node-close-*` is in `src/partials/tree.css`; `.input-error` is in `src/partials/input.css`. Fixed |
| 3 MINOR | comment above the import list in `src/style.css:5-8` | states the order is the cascade, that `responsive.css` stays last, and points at the LESSONS.md entry. Fixed |

Repository-wide sweep for `style.css` pointers: the only surviving mention is
`test/closeness.test.ts:174`, which is correct - `src/style.css` is the entry.

The fixes touch no rules, and recompiling after them is byte-identical to the
round-1 split output (43253 B, `cmp` exit 0), so the comment never reaches the
artifact. `npm run ci` on `E2E_PORT=8282`: pass, 323 Jest, 126 Playwright.

No fix regressions. No new findings.

### Pending user checks

None.
