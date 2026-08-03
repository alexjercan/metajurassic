# Decision: Open Graph and Twitter card unfurl

- STATUS: ACCEPTED
- DATE: 2026-08-03
- TASK: 20260729-101751
- TAGS: feature, ux, content

## Context

A pasted `https://alexjercan.github.io/metajurassic` link rendered as a bare URL
everywhere: no `<head>` metadata at all, not even a `meta description`. For a
shareable .io game the unfurl is part of the share loop.

Three things had mutually-exclusive candidates: where the absolute site URL
comes from, how the preview raster is produced and emitted, and how a head
partial gets per-page values given the existing plugin's injection point.

## Decision

**One `SITE_URL` constant in `webpack.config.js`, duplicating `SHARE_URL` in
`src/shareText.ts`, and `SITE_URL` in `e2e/social.spec.ts`.** All three carry a
comment naming the other two. If the site moves, all three change; a stale
`og:url` is visible the first time anyone pastes a link. The spec's copy is
deliberate: comparing it to the build constant would make the test tautological
about the one value a crawler actually resolves.

**The preview image is a committed PNG with an HTML source.**
`src/assets/og-image.html` is the source; `scripts/og-image.ts` renders it with
Playwright at 1200x630 into `src/assets/og-image.png`; the PNG is committed and
copied to `dist/assets/og-image.png` by a `CopyPlugin` entry. The render is
manual (`npm run og:image`) and lives outside `e2e/`, like `scripts/playtest/`,
because it asserts nothing. `src/assets/og-image.html` inlines its own CSS and
duplicates the palette from `src/partials/tokens.css`: it is rendered standalone
and never goes through the Tailwind pipeline.

**The head block is a partial with plugin-side substitution.**
`webpack-partials.js` injects at `beforeEmit`, which runs AFTER
html-webpack-plugin's EJS pass, so a partial cannot use
`<%= htmlWebpackPlugin.options.X %>`. The plugin already worked around this for
`basePath`; this change generalises that one-off `String.replace` into a
`fill(template, vars)` helper and reuses it for the head partial's `siteUrl`,
`pagePath`, `pageTitle` and `pageDescription`. `fill` uses a function
replacement so a `$` in prose copy is not read as a replacement pattern - the
values are now human-authored sentences, not paths. Per-page copy lives in one
`PAGES` map spread into each `HtmlWebpackPlugin` instance, so the daily page and
`/practice/` share `src/index.html` but unfurl differently.

## Alternatives considered

**Unify the site URL** via `package.json` `homepage`, or a shared module
imported by both the webpack config and `shareText.ts`. Rejected: both make the
runtime bundle depend on build configuration. `shareText.ts` is plain game code
that appends a URL to a share string; a build-time import to keep one string in
one place is worse coupling than the duplication.

**Derive the absolute URLs from `publicPath`.** Rejected: impossible. A crawler
resolves `og:url` and `og:image` without ever seeing the build host, so they
must be absolute and production-pinned even in a dev build.

**Emit the PNG through the asset-module rule** instead of `CopyPlugin`.
Rejected: the SVG rule adds a content hash, and the `og:image` URL is absolute
and baked into every page, so the filename must stay hash-free.

**Render the PNG at build time.** Rejected: `npm run build` and CI must not
need a browser.

**Ship an SVG `og:image`.** Rejected: Slack, Discord, Facebook and X do not
render it.

**Hand-drop a binary PNG.** Rejected: the HTML source keeps the card editable
and the palette reviewable in a diff, for the cost of one script.

## Consequences

- A fork or a preview deploy unfurls with upstream's URL and image until it
  edits `SITE_URL`. Accepted: the normal cost of OG on a static site.
- Editing the card is a two-step change - edit the HTML, run `npm run og:image`,
  commit the regenerated PNG.
- The card palette can drift from `src/partials/tokens.css`. Comment in the HTML
  says to move both together.
- Per-result dynamic cards stay out of scope: a share link carries no result, so
  the card is identical for everyone, and per-player cards need a server or an
  edge function. Nothing here forecloses that.
- The unfurl itself is not closable on a branch. The tags are proved by
  `e2e/social.spec.ts` and the Definition of Done `rg` checks; whether a client
  draws the card is only observable after deploy.
