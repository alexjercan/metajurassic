# Notes: Make shared links unfurl with Open Graph and Twitter cards

## What changes

Before: a pasted `https://alexjercan.github.io/metajurassic` link renders as a
bare URL in Slack, Discord, iMessage, WhatsApp, Bluesky and X. Nothing in
`<head>` tells them what the page is; there is not even a `<meta name="description">`,
so search results fall back to scraped body text.

After: every built page carries a canonical URL, a description, Open Graph tags
and a Twitter `summary_large_image` card. A pasted link unfurls as a card with
the title "Metajurassic", a one-line pitch, and a 1200x630 preview image served
from the deployed site. The daily page and `/practice/` unfurl with their own
title and description rather than sharing one.

No runtime behavior changes: this is head metadata plus one static image.

## Surfaces

| File | Why |
|------|-----|
| `src/_head.html` (new) | The shared social/SEO head block, placeholder-substituted per page. Mirrors how `_header.html` / `_footer.html` already work. |
| `webpack-partials.js` | Teach `HtmlPartialsPlugin` to inject `_head.html` and substitute `siteUrl`, `pagePath`, `pageTitle`, `pageDescription`. |
| `webpack.config.js` | One `SITE_URL` constant; per-page `pagePath` / `pageTitle` / `pageDescription` options on each of the six `HtmlWebpackPlugin` instances; a `CopyPlugin` entry for the preview PNG. |
| `src/index.html`, `faq.html`, `species.html`, `clades.html`, `profile.html` | Add the `<!-- social-head -->` marker inside `<head>`. |
| `src/assets/og-image.html` (new) | Source of the preview card: the museum/tree motif, laid out at 1200x630. |
| `src/assets/og-image.png` (new, committed) | The rendered artifact webpack copies to `dist/assets/og-image.png`. Committed because CI must not need a browser to build. |
| `scripts/og-image.ts` (new) | Playwright render of the HTML source to the PNG. Outside CI, like `scripts/playtest/`. |
| `package.json` | `og:image` npm script for the render. |
| `e2e/social.spec.ts` (new) | Asserts the tags are present and well-formed on the served pages. |

## Data and interfaces

`webpack-partials.js` - the plugin gains head injection and a shared
substitution helper:

```js
// options already carried per HtmlWebpackPlugin instance:
//   basePath: string          // "/" locally, "/metajurassic/" on Pages
//   pagePath: string          // "", "practice/", "faq/", ...
//   pageTitle: string         // og:title and <title>-adjacent copy
//   pageDescription: string   // og:description and meta description

class HtmlPartialsPlugin {
    constructor(options: { basePath?: string; siteUrl: string })
}

function fill(template: string, vars: Record<string, string>): string
```

`webpack.config.js`:

```js
// Canonical origin for absolute social URLs. NOT publicPath: og:url and
// og:image must be absolute and must point at production even in a dev build.
const SITE_URL = "https://alexjercan.github.io/metajurassic";
```

No TypeScript surface changes; `src/shareText.ts` keeps its own `SHARE_URL`.

## Sketches

Illustrative only.

`src/_head.html` (new):

```html
<meta name="description" content="<%= pageDescription %>" />
<link rel="canonical" href="<%= siteUrl %>/<%= pagePath %>" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Metajurassic" />
<meta property="og:title" content="<%= pageTitle %>" />
<meta property="og:description" content="<%= pageDescription %>" />
<meta property="og:url" content="<%= siteUrl %>/<%= pagePath %>" />
<meta property="og:image" content="<%= siteUrl %>/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="..." />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="<%= pageTitle %>" />
<meta name="twitter:description" content="<%= pageDescription %>" />
<meta name="twitter:image" content="<%= siteUrl %>/assets/og-image.png" />
```

`src/index.html`:

```diff
         <title>Metajurassic</title>
+        <!-- social-head -->
```

`webpack.config.js`:

```diff
             new HtmlWebpackPlugin({
                 template: "src/index.html",
                 chunks: ["index"],
                 basePath: publicPath,
+                pagePath: "",
+                pageTitle: "Metajurassic - the daily dinosaur guessing game",
+                pageDescription:
+                    "Guess today's dinosaur. Every guess reveals how close you are on the tree of life.",
             }),
```

`webpack-partials.js`:

```diff
                     data.html = data.html
+                        .replace("<!-- social-head -->", head)
                         .replace('<div id="header"></div>', header)
```

## Shape

```
                     webpack.config.js
                            |
              SITE_URL + per-page options
                            |
        +-------------------+--------------------+
        |                                        |
  HtmlWebpackPlugin (x6)                   CopyPlugin
  template + EJS basePath                  src/assets/og-image.png
        |                                        |
        v                                        v
   HtmlPartialsPlugin                    dist/assets/og-image.png
   _head.html  -> <!-- social-head -->           ^
   _header.html-> <div id="header">              |
   _footer.html-> <div id="footer">              |
        |                                        |
        v                                        |
   dist/**/index.html  -- og:image absolute URL --+


  scripts/og-image.ts  (manual, outside CI)
      playwright 1200x630
      src/assets/og-image.html  ->  src/assets/og-image.png  (committed)
```

## Consequences and open questions

- **Absolute URLs hardcode the origin.** `og:url` and `og:image` must be
  absolute, so `SITE_URL` is a build-time constant pointing at production. A
  fork or a preview deploy unfurls with upstream's URL and image until it edits
  the constant. This is the normal cost of OG on a static site.
- **Second copy of the site URL.** `src/shareText.ts` already hardcodes
  `SHARE_URL = "https://alexjercan.github.io/metajurassic"`. This adds a second.
  Open: unify (e.g. `package.json` `homepage`, read by both) or accept two
  constants with a comment cross-referencing them. Leaning accept + comment;
  the TS side importing build config is worse than the duplication.
- **The image must be a raster.** Slack, Discord, Facebook and X do not render
  SVG `og:image`, and the repo currently ships only SVGs. Hence the HTML source
  plus Playwright render plus committed PNG. Assumption recorded: reproducible
  source beats a hand-dropped binary, at the cost of one script.
- **Static image, not per-result.** A share link carries no result, so the card
  is the same for everyone. Per-player cards would need a server or an edge
  function; explicitly out of scope, and this forecloses nothing.
- **Practice shares the index template.** `src/index.html` is registered twice,
  so the marker is one line but the options differ per instance - the same
  pattern the file already documents for its practice-only button.
- Open: does the meta description belong on all six pages or only the game
  pages? Assumption: all six, since the archive and FAQ pages are the ones
  search engines index most usefully. Titles/descriptions differ per page.
- Open: `og:image:alt` copy and the exact card art are unwritten. They are
  content decisions for the work phase, not blockers.
- **Verification is split.** The tags are provable in CI (`e2e/social.spec.ts`
  plus the `rg` in the Definition of Done). The unfurl itself is only provable
  after deploy, by pasting the link - a manual step that cannot be closed on
  the branch.
