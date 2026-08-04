# Notes: Escape HTML in the social head partial substitution

## What changes

Before: `fill` in `webpack-partials.js` splices raw strings into partials. Every
placeholder in `src/_head.html`, `src/_header.html` and `src/_footer.html` sits
inside a double-quoted attribute, so a `"` in a page title ends the attribute
early. `pageTitle: 'The "how" of it'` emits

```html
<meta property="og:title" content="The "how" of it" />
```

which a crawler reads as `The `, plus two junk attributes. `&`, `<` and `>` are
the same class of bug.

After: values are HTML-escaped at the substitution point, so the built page
carries `content="The &quot;how&quot; of it"` and a browser (or crawler) reads
back the exact configured string. No user-visible change today - nothing in
`webpack.config.js:25-57` currently contains an escapable character except the
apostrophe in the daily description - so this is a latent-bug fix plus a
regression pin.

## Surfaces

| File | Why |
|-|-|
| `webpack-partials.js` | Add `escapeHtml`; apply it inside `fill`. Export `fill` for the unit test. |
| `test/socialHeadEscaping.test.ts` (new) | Pins the escaping table and the "no double escape" property against the real `fill`. |
| `e2e/social.spec.ts` | Pins one real entity round trip at the served boundary (the apostrophe in the daily description). |

Nothing in `src/` changes. `src/_head.html` stays as-is: it is already correct
under an escaping substitutor.

## Data and interfaces

```js
// webpack-partials.js
function escapeHtml(value)          // string -> string; & < > " ' -> entities
function fill(template, vars)       // unchanged signature; now escapes values
module.exports = HtmlPartialsPlugin // unchanged default
module.exports.fill = fill          // new, for the unit test
```

`&` must be replaced first, or `<` -> `&lt;` would then become `&amp;lt;`.

`'` is escaped as `&#39;` even though it is safe inside a double-quoted
attribute: it makes the escape table complete and independent of which quote
style a future partial uses, and it gives the e2e round trip a real entity to
assert on with the copy that exists today.

`basePath` is escaped too. It only ever appears inside `href`/`src` attributes,
so escaping is correct there; `/` and `/metajurassic/` are unaffected.

## Sketches

Illustrative, not the patch.

```diff
+const HTML_ESCAPES = {
+    "&": "&amp;",
+    "<": "&lt;",
+    ">": "&gt;",
+    '"': "&quot;",
+    "'": "&#39;",
+};
+
+// Every placeholder in the partials sits inside a double-quoted attribute, so
+// an unescaped `"` in page copy truncates the tag. `&` is in the class list
+// first by construction: the regex alternation is applied in one pass.
+function escapeHtml(value) {
+    return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
+}
+
 function fill(template, vars) {
     return Object.entries(vars).reduce(
-        (out, [key, value]) =>
-            out.replace(new RegExp(`<%=\\s*${key}\\s*%>`, "g"), () => value),
+        (out, [key, value]) => {
+            const escaped = escapeHtml(value);
+            return out.replace(
+                new RegExp(`<%=\\s*${key}\\s*%>`, "g"),
+                () => escaped
+            );
+        },
         template
     );
 }
```

```ts
// test/socialHeadEscaping.test.ts - the escaping table, against the real fill
const { fill } = require("../webpack-partials");

expect(fill('content="<%= t %>"', { t: 'The "how" & <why>' })).toBe(
    'content="The &quot;how&quot; &amp; &lt;why&gt;"'
);
```

```ts
// e2e/social.spec.ts - one real entity surviving the served boundary
await page.goto("/");
// The configured copy has an apostrophe, so it is emitted as `&#39;` and must
// decode back to exactly this. Reddens if escaping ever double-encodes.
expect(await metaProperty(page, "og:description")).toContain("today's");
```

## Shape

```
webpack.config.js PAGES ─┐
  pageTitle/Description  │
  pagePath, SITE_URL     │
                         v
              HtmlPartialsPlugin.beforeEmit
                         │
                         v
                  fill(partial, vars)
                         │
                  escapeHtml(value)   <-- the change
                         │
                         v
        src/_head.html   content="&quot;..."   -> dist/**/index.html
                         │
                         v
                  browser / crawler
                  decodes back to the exact configured string
                         ^
                         └── e2e/social.spec.ts asserts here
```

Two proofs at two altitudes: the unit test pins the escape table (cheap,
exhaustive over the five characters); the e2e pins that escaping actually
round-trips through a real browser instead of leaking entity text.

## Consequences and open questions

- Escaping is applied to every `fill` value, not just the head's. That is
  correct for the placeholders that exist and is the reason no per-key opt-out
  is added; a future placeholder in a *non*-attribute or raw-HTML position would
  need a different substitutor, not a flag.
- The `$`-guard comment in `fill` stays load-bearing: the function replacement
  is still required, escaping does not subsume it.
- `webpack-partials.js` is outside `npm run lint` and `npm run format:check`
  globs (both list `webpack.config.js` only). Not widening them here; noted so
  the new code is written to match the file's existing style by hand.
- **Assumption, flagged for planning**: TASK.md Step 2 asks for a round-tripped
  title containing a **quote**. No page title contains one, and inventing quoted
  copy purely to be asserted on would be contriving product copy to serve a
  test. This brief instead splits that proof: the quote case is pinned by the
  unit test against the real `fill`, and the served-boundary round trip is
  pinned on the apostrophe that genuinely exists in the daily description. If
  the reviewer wants a literal quote end-to-end, the alternative is a
  test-only seventh `HtmlWebpackPlugin` page - more build surface for the same
  guarantee.
- Jest imports the plugin with `require` because `allowJs` is off in
  `tsconfig.json`; `test/dailyKeyMirror.test.ts` is the precedent for a test
  reaching outside `src/`.
- Coverage thresholds in `jest.config.js` only count `src/**`, so the new test
  does not move them.
