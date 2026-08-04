# Architecture

A static TypeScript site built by webpack, deployed to GitHub Pages. No server,
no account, no network calls at runtime beyond fetching the content graph and
the images it points at.

[`AGENTS.md`](https://github.com/alexjercan/metajurassic/blob/master/AGENTS.md)
is the authoritative repository map, command list and convention set. This page
is the shape of the build; it links there rather than copying it.

## Repository map

| Path                                           | Purpose                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/`                                         | App source. Core: `game/`, `gameState.ts`, `gameData.ts`, `treeBuilder.ts`, `hintRule.ts`, `puzzleKey.ts`, `shareText.ts`, `rankLadder.ts` |
| `src/ui/`                                      | UI widgets: tree rendering and navigation, panel, cards, modal, share                                                                      |
| `src/*.html`, `src/style.css`, `src/partials/` | Page templates and Tailwind styles                                                                                                         |
| `src/jurassic/`                                | Authored content and the generated graph - see [Content pipeline](/content-pipeline)                                                       |
| `scripts/*.py`                                 | Content conversion and its tests                                                                                                           |
| `scripts/playtest/*.ts`                        | Game simulations and a visual walkthrough. Outside CI                                                                                      |
| `test/`                                        | Jest                                                                                                                                       |
| `e2e/`                                         | Playwright                                                                                                                                 |
| `tasks/`                                       | Task, decision, review, retro and notes records                                                                                            |
| `docs/`                                        | This site                                                                                                                                  |

## Pages and bundles

Six entry points, one bundle each, wired in
[`webpack.config.js`](https://github.com/alexjercan/metajurassic/blob/master/webpack.config.js).
Each gets its own `HtmlWebpackPlugin` instance and its own entry in the
`PAGES` table, which supplies the per-page title, description and served path.

| Entry      | Served at    | Template                             |
| ---------- | ------------ | ------------------------------------ |
| `index`    | `/`          | `src/index.html`                     |
| `practice` | `/practice/` | `src/index.html` (the same template) |
| `faq`      | `/faq/`      | `src/faq.html`                       |
| `species`  | `/species/`  | `src/species.html`                   |
| `clades`   | `/clades/`   | `src/clades.html`                    |
| `profile`  | `/profile/`  | `src/profile.html`                   |

The daily page and the practice page **share one template**. Elements that only
one of them needs ship hidden and are revealed by the page's own entry point -
that is why `src/practice.ts` un-hides the New game button rather than the
markup carrying two variants.

## Two template passes

This trips people up, so it is worth stating plainly. There are two different
substitution mechanisms, and they use different syntax:

| Pass                    | Runs                   | Syntax                                      | Where                                                    |
| ----------------------- | ---------------------- | ------------------------------------------- | -------------------------------------------------------- |
| html-webpack-plugin EJS | First                  | `<%= htmlWebpackPlugin.options.basePath %>` | `src/*.html` page templates                              |
| `HtmlPartialsPlugin`    | After, at `beforeEmit` | `<%= basePath %>`                           | `src/_head.html`, `src/_header.html`, `src/_footer.html` |

Partials are injected **after** the EJS pass, so they cannot reach
`htmlWebpackPlugin.options` and get their own bare-placeholder substitution
instead. See
[`webpack-partials.js`](https://github.com/alexjercan/metajurassic/blob/master/webpack-partials.js).

`src/_head.html` is the shared social/SEO block, injected at each page's
`<!-- social-head -->` marker. Its URLs are absolute and built from `SITE_URL`,
deliberately **not** from `publicPath`: a crawler resolves `og:url` and
`og:image` without ever seeing this build's host, so they must point at
production even in a dev build. `SITE_URL` is duplicated by `SHARE_URL` in
`src/shareText.ts` and `SITE_URL` in `e2e/social.spec.ts`; the three are kept in
sync by hand, because having the runtime bundle import build config would be the
worse coupling. See
[`tasks/20260729-101751/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-101751/DECISION.md).

## Styles

`src/style.css` is the entry: the `@tailwind` directives, then one `@import` per
surface partial. **Import order is the cascade** - later partials override
earlier ones, and `responsive.css` must stay last so its media blocks resolve
after every rule they modify. Do not alphabetise it.

## Base path

`PUBLIC_PATH` is `/` locally and `/metajurassic/` on Pages. It reaches:

- webpack's `output.publicPath`, and through it the runtime
  `__webpack_public_path__` that page code builds links from;
- each page's `basePath` template option;
- this docs site's `base`, with `docs/` appended - see
  `docs/.vitepress/config.mts`. It is `.mts` and not `.ts` because the root
  `package.json` declares `"type": "commonjs"` while VitePress is ESM-only.

## Storage keys

Everything is `localStorage`, behind the `StorageProvider` seam in
[`src/storage.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/storage.ts)
so logic can be tested without a DOM.

| Key                                  | Holds                                      |
| ------------------------------------ | ------------------------------------------ |
| `gameState-dinosaur-#NNNNN`          | One daily round                            |
| `gameState-practice-dinosaur-#NNNNN` | One practice round                         |
| `practice-current`                   | The seed of the practice round in progress |

There is no separate stats record. The saved rounds **are** the stats -
`loadAllGames` scans storage keys and rebuilds each finished round. Key format
and parse are exact inverses, in
[`src/puzzleKey.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/puzzleKey.ts).

## Build and deploy

| Path                       | Runs                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Local gate                 | `npm run ci` - format check, lint, Python pipeline tests, Jest with coverage, Playwright |
| `.github/workflows/ci.yml` | The gate on Node 20 and 22, plus a separate `build` job on Node 22                       |
| Pages workflow             | `npm run build` with `PUBLIC_PATH=/metajurassic/`, then deploys `dist/`                  |

`npm run build` runs **two** builders into one output directory: webpack for the
game, then VitePress for this site into `dist/docs/`. The order is load-bearing.
`webpack.config.js` sets `output.clean: true`, so webpack run second would
delete `dist/docs/` while both builders still exited 0 - a green build that
ships a 404. `test/docsGate.test.ts` pins the order; the reasoning is in
[`tasks/20260804-151403/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260804-151403/DECISION.md).

`docs/` is deliberately outside the ESLint globs and the root
`tsconfig.json` `include`, and inside the Prettier globs only. Its one
TypeScript file is type-checked by VitePress's own Vite pipeline during
`docs:build`; pulling VitePress's type surface into the root project for a
single config file was judged the worse trade. Same record, section 2.

## Outside CI

Rigs that exist but do not run in the gate:
`npm run playtest:difficulty`, `npm run playtest:hint`,
`npm run playtest:walkthrough`, `npm run og:image`. The difficulty and hint rigs
import the shipped game logic rather than reimplementing it, and the hint rig
cross-checks its rule reproduction against `findNextHintCladeId`. Findings live
in the task records, not in the rigs. See
[`AGENTS.md`](https://github.com/alexjercan/metajurassic/blob/master/AGENTS.md).
