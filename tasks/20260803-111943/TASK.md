# Escape HTML in the social head partial substitution

- PRIORITY: 30
- TAGS: chore, build
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a maintainer editing page copy, I want `fill` in `webpack-partials.js` to escape its values, so that a quote or ampersand in a title or description cannot silently truncate a `<meta>` tag.

## Review Findings

- Carried over from review round 2 of 20260729-101751, finding R2.1 (MINOR).
- `webpack-partials.js:8-16` substitutes values with no HTML escaping; `src/_head.html` places every one inside a double-quoted attribute (`content="<%= pageTitle %>"`).
- `pageTitle: 'The "how" of it'` emits `content="The "how" of it"`, which a crawler reads as `The `. `e2e/social.spec.ts`'s `length > 0` assertions still pass.
- Latent today: no current `pageTitle` / `pageDescription` in `webpack.config.js:25-57` contains `"`, `<`, `>` or `&`.

## Steps

- [ ] `webpack-partials.js`: add `escapeHtml(value)` mapping `&`, `<`, `>`, `"`, `'` to entities in one `String.replace(/[&<>"']/g, ...)` pass, so `&` cannot be re-escaped after `<` -> `&lt;`. Apply it to each value inside `fill` before the placeholder replacement; keep the existing function-replacement `$`-guard, which escaping does not subsume. Escaping applies to `basePath` too - every placeholder in `_head.html`, `_header.html` and `_footer.html` sits inside a double-quoted attribute, so that is correct and no per-key opt-out is added.
- [ ] `webpack-partials.js`: add `module.exports.fill = fill` after the existing default export, so the unit test drives the real substitutor. Written to match the file's hand style: it is outside the `lint` and `format:check` globs, which list `webpack.config.js` only. Do not widen those globs here.
- [ ] New `test/socialHeadEscaping.test.ts`: `const { fill } = require("../webpack-partials")` (precedent: `test/dailyKeyMirror.test.ts` reaching outside `src/`; `allowJs` is off, and `@typescript-eslint/no-require-imports` is off in `eslint.config.mjs`). Assert the full table through an attribute-shaped template - `fill('content="<%= t %>"', { t: 'The "how" & <why> it\'s' })` -> `'content="The &quot;how&quot; &amp; &lt;why&gt; it&#39;s"'` - plus one no-double-escape case (`&amp;` in, `&amp;amp;` out) and one `$`-in-copy case pinning the existing guard.
- [ ] `e2e/social.spec.ts`: add a test that fetches `/` with `page.request.get` and asserts the raw response body contains `today&#39;s`. This is the served-boundary half and is the assertion that is red on base: a `master` build emits `content="Guess today's dinosaur. ..."` with a literal apostrophe. Then `page.goto("/")` and assert `og:description` decodes back to contain exactly `today's`, so double-encoding reddens too. See DECISION.md for why the quote case is proved at the unit level instead of by inventing quoted product copy or adding a test-only page.

## Definition of Done

- `fill` escapes `&`, `<`, `>`, `"` and `'` and does not double-escape. (cmd: `npx jest socialHeadEscaping`; red on base - the file and the export do not exist)
- The escaping survives the real build to the served bytes, and the decoded string still matches the configured copy. (cmd: `npx playwright test e2e/social.spec.ts`; red on base - the served HTML carries a literal `'`, verified by building `master` and grepping `dist/index.html`)
- No page's rendered social metadata changes meaning: all six pages still carry well-formed, distinct tags. (cmd: `npx playwright test e2e/social.spec.ts`)
- The repo stays green. (cmd: `npm run ci`)
