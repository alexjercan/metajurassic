# Review: Escape HTML in the social head partial substitution

- TASK: 20260803-111943
- BRANCH: chore/escape-html-social-head

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) test/socialHeadEscaping.test.ts:26 - `it("substitutes every
  placeholder occurrence")` mostly pins the pre-existing `g` flag and the
  whitespace-optional `<%=t%>` form; Step 3 enumerated three cases (full table,
  no-double-escape, `$`-guard). It does assert the escaped value reaches every
  site, so it is not vacuous. Delete lines 26-28 if the multi-occurrence
  property is not being claimed as part of this fix; otherwise leave it.
  - Response:
- [ ] R1.2 (NIT) AGENTS.md:22 - the repository-map cell describes
  `webpack-partials.js` as "filling per-page options from `webpack.config.js`"
  with no mention of escaping. The durable contract this change introduces -
  every placeholder must sit in an attribute-value position, and a raw-HTML
  placeholder would need a different substitutor - lives only in a code comment
  and DECISION.md. Append "values are HTML-escaped at substitution" to that
  cell.
  - Response:

Verified in the recording pass, independently of the out-of-context reviewer:

- Full diff read. Additive only: `escapeHtml` + named export in
  `webpack-partials.js`, new `test/socialHeadEscaping.test.ts`, one new e2e
  test, TASK.md close-out. No existing test weakened or deleted.
- `npm run ci` re-run here: green, 184 e2e passed - matches the close-out
  number exactly.
- `npx jest socialHeadEscaping` re-run here: 4 passed, exit 0.
- Red-on-base re-derived independently of the reviewer's stash method:
  `git show master:webpack-partials.js` exports no `fill` (checked in node), so
  the unit proof cannot even load on base; and `webpack.config.js:26-27`
  configures `index.pageDescription` as `Guess today's dinosaur. ...` with a
  literal apostrophe, which base `fill` passes through unescaped - so
  `toContain("today&#39;s")` at `e2e/social.spec.ts:110` is necessarily red on
  base.
- Cross-domain escaping check: every `fill` consumer sits in a double-quoted
  attribute (`_head.html` `content=`/`href=`, `_header.html` `href=`/`src=`,
  `_footer.html` `href=`), so attribute escaping is correct for `basePath` and
  the URL keys too. No JS, JSON-LD or raw-text placeholder exists.
- Single-pass `/[&<>"']/g` cannot re-escape an `&` it introduced; pinned by the
  second unit test. The `$`-guard is retained and separately pinned.
- Doc sweep: grepped README.md, AGENTS.md, `src/`, `e2e/`, `test/`, `scripts/`
  for `webpack-partials`, `escapeHtml`, `fill(` - no stale mentions beyond
  R1.2.
- Honesty: every close-out claim and number reproduced. `tatr proofs` lists
  four `cmd:` proofs and no `manual:` items, so there are no pending user
  checks.
