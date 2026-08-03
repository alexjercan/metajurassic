# Make shared links unfurl with Open Graph and Twitter cards

- PRIORITY: 55
- TAGS: feature, ux, content
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a person receiving a shared result, I want the game link to unfurl with a title, description, and image, so that the share looks like a real game invitation instead of a bare URL.

## Review Findings

- `src/index.html` has no Open Graph, Twitter card, or meta description tags; pasted links render as plain URLs in chat apps and social feeds.
- For a shareable .io game the unfurl is part of the share loop, alongside the share text itself.
- Confirmed on base: `npm run build` then `rg "og:|twitter:" dist/index.html` exits 1; so does `rg 'name="description"' dist/index.html`. `dist/assets/` holds only SVGs.
- `webpack-partials.js` injects `_header.html` / `_footer.html` at `beforeEmit`, AFTER html-webpack-plugin's EJS pass. A partial therefore cannot use `<%= htmlWebpackPlugin.options.X %>`; the plugin already does its own `<%= basePath %>` substitution, and the head partial extends that same mechanism.
- `scripts/playtest/walkthrough.ts:19,479` already launches `chromium` from `@playwright/test` under ts-node, outside CI. The preview-image render follows that precedent.

## Steps

- [ ] Add `src/_head.html`: the shared social/SEO block - `meta description`, `link canonical`, `og:type|site_name|title|description|url|image|image:width|image:height|image:alt`, and `twitter:card=summary_large_image|title|description|image`. Placeholders `<%= siteUrl %>`, `<%= pagePath %>`, `<%= pageTitle %>`, `<%= pageDescription %>`.
- [ ] In `webpack-partials.js`, add a `fill(template, vars)` helper doing the `<%=\s*key\s*%>` substitution for every var, use it for the existing header/footer `basePath` replacement, and inject the head partial at the `<!-- social-head -->` marker. Read `siteUrl` from the plugin options and `pagePath` / `pageTitle` / `pageDescription` from `data.plugin.options`.
- [ ] In `webpack.config.js`, define `const SITE_URL = "https://alexjercan.github.io/metajurassic";` with a comment saying it is deliberately absolute and production-pinned (not `publicPath`) and cross-referencing `src/shareText.ts`'s `SHARE_URL`. Pass `siteUrl: SITE_URL` to `HtmlPartialsPlugin` and add `pagePath` / `pageTitle` / `pageDescription` to all six `HtmlWebpackPlugin` instances (`""`, `practice/`, `faq/`, `species/`, `clades/`, `profile/`).
- [ ] Add the `<!-- social-head -->` marker inside `<head>` in `src/index.html`, `src/faq.html`, `src/species.html`, `src/clades.html`, `src/profile.html` (index covers both the daily and practice builds).
- [ ] Add `src/assets/og-image.html`: a 1200x630 card using the existing museum/tree motif, with inline CSS (it is rendered standalone, not bundled, so no Tailwind).
- [ ] Add `scripts/og-image.ts`: Playwright `chromium` render of that HTML at 1200x630 to `src/assets/og-image.png`, plus an `og:image` script in `package.json` mirroring the `playtest:*` ts-node invocation. Commit the produced PNG.
- [ ] In `webpack.config.js`, add a `CopyPlugin` entry copying `src/assets/og-image.png` to `assets/og-image.png` (a `CopyPlugin` entry, not the asset-module rule, so the filename stays hash-free and the absolute `og:image` URL is stable).
- [ ] Add `e2e/social.spec.ts`: for `/`, `/practice/`, `/faq/`, `/species/`, `/clades/`, `/profile/` assert `og:title`, `og:description`, `og:url`, `twitter:card=summary_large_image` and `meta[name=description]` are present and non-empty, that `og:url` ends with that page's path, that `og:image` is an absolute `https://` URL, and that titles/descriptions differ between `/` and `/faq/`.
- [ ] Run `npm run ci` and fix fallout.
- [ ] Record in `DECISION.md`: the duplicated site URL (accept + cross-reference comment, do not couple `src/shareText.ts` to build config), and the committed-PNG-with-HTML-source choice.

## Definition of Done

- Open Graph, Twitter and description tags are present in built HTML. (cmd: `npm run build && rg -q "og:title" dist/index.html && rg -q "twitter:card" dist/index.html && rg -q 'name="description"' dist/index.html`)
- Every built page carries the block, not just the index. (cmd: `npm run build && for p in index practice/index faq/index species/index clades/index profile/index; do rg -q "og:url" "dist/$p.html" || exit 1; done`)
- The preview image ships at a stable, hash-free path matching the `og:image` URL. (cmd: `npm run build && test -f dist/assets/og-image.png && rg -q 'og:image" content="https://alexjercan.github.io/metajurassic/assets/og-image.png"' dist/index.html`)
- The tags are well-formed and per-page on the served site. (cmd: `npx playwright test e2e/social.spec.ts`)
- The repo stays green. (cmd: `npm run ci`)
- The unfurl renders as a card in a real client. (manual: after deploy, paste the link in Slack/Discord or run it through a card validator)

## Notes

- Assumption: all six pages get description + social tags; titles and descriptions differ per page. The archive and FAQ pages are the ones search engines index most usefully.
- Assumption: `og:image:alt` copy and the exact card art are content decisions made during work, not blockers.
- Out of scope: per-result dynamic cards. A share link carries no result, so the card is identical for everyone; per-player cards need a server or edge function. This forecloses nothing.
- A fork or preview deploy unfurls with upstream's URL and image until it edits `SITE_URL`. Normal cost of OG on a static site.
- Not split: the tags reference the image URL, so shipping either half alone leaves a broken or imageless card. One understand-build-review pass.
- Detail and alternatives in `NOTES.md`.
- Related: the share text rewrite task; land the copy and the unfurl as one coherent share experience.
