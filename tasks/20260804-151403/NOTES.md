# Notes: Publish a VitePress documentation site at /docs

## What changes

Before: project prose is scattered. `README.md` is a quickstart, `AGENTS.md`
is the repo map and conventions, `src/faq.html` is 8 player-facing Q&As, and
everything else is buried in ~58 `tasks/<id>/` records. Nothing is browsable,
nothing is searchable, and a player who wants to know how closeness is scored
has to read TypeScript.

After: `docs/` holds Markdown, `npm run docs:dev` serves it locally, and a
production build emits it to `dist/docs/`. The GitHub Pages deploy ships one
artifact containing both the game (`/metajurassic/`) and the docs
(`/metajurassic/docs/`). A player reaches the docs from the FAQ page; a
contributor reaches it from `README.md`.

No game behavior changes. No `src/` runtime code changes. The docs site is a
second, independent static build glued into the same output directory.

## Surfaces

| File | Why |
|------|-----|
| `package.json` | `vitepress` devDependency; `docs:dev`, `docs:build` scripts; `build:all` (or equivalent) to sequence webpack then vitepress. |
| `docs/.vitepress/config.ts` | New. Title, `base`, `outDir`, nav, sidebar, `themeConfig.search` (local). |
| `docs/*.md` | New. index, how-to-play, practice-and-seeds, archives, profile-and-ranks, content-pipeline, architecture. |
| `.github/workflows/gh-pages.yaml` | Build docs after webpack, before artifact upload. Node bump 18 -> 22. |
| `src/faq.html` | One link into the docs, so the player-facing entry point exists. |
| `README.md` | One link under `## More`. |
| `.gitignore` | Already covers `**/.vitepress/{cache,dist}` and bare `dist`. Verify only; expected no edit. |
| `prettier.config.js` glob in `package.json` | Decide whether `docs/**` joins `format`/`format:check`. Currently the globs are explicit per-directory, so `docs/` is silently excluded. |
| `test/docsGate.test.ts` (name provisional) | New. Asserts the build order and the docs step exist, the way `test/lintGate.test.ts` pins the CI chain. |
| `tsconfig.json` | `include` does not cover `docs/`, so `docs/.vitepress/config.ts` is outside the type-checked project. Either leave it out deliberately or add it. |

Deliberately untouched: `AGENTS.md` stays the single source for agent
conventions. Docs pages link to it rather than restating it.

## Data and interfaces

No runtime types change. The new surface is build configuration.

`docs/.vitepress/config.ts`:

```ts
import { defineConfig } from "vitepress";

// Mirrors webpack's PUBLIC_PATH: "/" locally, "/metajurassic/" on Pages.
// VitePress needs the docs subpath appended.
const base = process.env.PUBLIC_PATH
    ? `${process.env.PUBLIC_PATH}docs/`
    : "/docs/";

export default defineConfig({
    title: "Metajurassic",
    base,
    outDir: "../dist/docs",
    themeConfig: { nav: [...], sidebar: [...], search: { provider: "local" } },
    // Default in VitePress 1.x, stated so a later change cannot silently
    // relax it: a dead internal link fails `docs:build`.
    ignoreDeadLinks: false,
});
```

`package.json` scripts:

```json
"docs:dev": "vitepress dev docs",
"docs:build": "vitepress build docs",
"build": "webpack --config webpack.config.js && npm run docs:build"
```

Versions: `vitepress@1.6.4` is current latest (`2.0.0-alpha.19` is the `next`
tag and is not a candidate). It requires Node `^18 || >=20`.

## Sketches

Illustrative only.

`package.json`:

```diff
-    "build": "webpack --config webpack.config.js",
+    "build": "webpack --config webpack.config.js && npm run docs:build",
+    "docs:dev": "vitepress dev docs",
+    "docs:build": "vitepress build docs",
```

`.github/workflows/gh-pages.yaml`:

```diff
-                  node-version: "18"
+                  node-version: "22"
...
-            - name: Build with webpack
+            - name: Build the game and the docs
               run: npm run build
               env:
                   PUBLIC_PATH: /metajurassic/
```

`src/faq.html` (new Q&A item, matching the existing `.faq-item` shape):

```diff
+                <div class="faq-item">
+                    <h2 class="faq-question">Where can I read more?</h2>
+                    <p class="faq-answer">
+                        The <a href="<%= ... %>docs/">documentation site</a>
+                        covers the rules, the content pipeline and the
+                        architecture.
+                    </p>
+                </div>
```

Note the template-variable problem in that diff: `src/faq.html` is an
html-webpack-plugin template, so the base path there is
`<%= htmlWebpackPlugin.options.basePath %>` (as used by the favicon link), not
the `<%= basePath %>` form the injected partials use. The two mechanisms are
different passes; see `webpack-partials.js`.

## Shape

```
  repo
  |
  +-- src/ ------[webpack]------> dist/          (clean: true wipes dist first)
  |                                 index.html
  |                                 practice/ faq/ species/ ...
  |
  +-- docs/ ---[vitepress]------> dist/docs/     MUST run after webpack
                                    index.html
                                    how-to-play.html ...

  npm run build  =  webpack  &&  vitepress build docs
                       |             |
                       |             +-- outDir ../dist/docs
                       +-- output.clean: true  <-- the ordering constraint

  Pages job: checkout -> npm install -> npm run build (PUBLIC_PATH=/metajurassic/)
             -> upload ./dist -> deploy
                 /metajurassic/        game
                 /metajurassic/docs/   docs
```

## Consequences and open questions

**The ordering constraint is the sharp edge.** `webpack.config.js` sets
`output.clean: true`, so webpack deletes everything in `dist/` on every run.
A docs build that lands in `dist/docs/` before webpack runs is erased without
a warning, and the Pages job would upload an artifact whose `/docs/` path 404s
while every command exited 0. This must be sequenced webpack-then-vitepress
and guarded by a test, not by a comment.

**A footer link is the wrong place for the docs link.**
`src/partials/responsive.css:242` carries a load-bearing comment: the footer
wraps under 768px, a wrapped row costs ~27px of game area, and that is enough
to clip the onboarding brief at 320x568 - which `e2e/onboarding.spec.ts`
asserts. `.footer-label-long` is hidden specifically to keep the current
**four** links on one row at that width. Adding a fifth is a real risk of
turning a green mobile suite red for a reason no one would connect to a docs
task. Recommendation: link from `src/faq.html` and `README.md`, and leave the
footer alone. This is the one place the TASK.md step ("link the site from the
game footer or FAQ") and the code disagree.

**The E2E suite cannot test the docs route as written.**
`playwright.config.ts` starts `npm run serve`, i.e. the webpack dev server,
which knows nothing about VitePress output. A `/docs/` route spec would either
404 or need a second static server. Cheaper and more honest guards, in
increasing cost:

1. `ignoreDeadLinks: false` already fails `docs:build` on a dead internal
   Markdown link. That is the "no broken internal links" DoD, for free.
2. A Jest test in the `lintGate.test.ts` style asserting `build` runs webpack
   before `docs:build`, and that the docs step is in the chain at all. This is
   what actually guards the `clean: true` trap.
3. A post-build file assertion (`dist/docs/index.html` exists) - the DoD
   already names this as a `cmd:`.

A Playwright route spec is the expensive option and buys the least; propose
skipping it unless the user wants it.

**Node 18 in the Pages workflow is stale and now load-bearing.**
`gh-pages.yaml` pins Node 18 while `ci.yml` runs 20 and 22 and builds on 22.
VitePress 1.6 supports 18, but the split means the deploy path is the only one
never exercised at the version CI tests. Bumping to 22 aligns them and removes
a class of "works in CI, fails in deploy" bug.

**Gate exposure of the new files** (checked, not assumed):

- `test/markupConstants.test.ts` reads `src/*.html` only. `docs/**` invisible.
- `jest.config.js` `roots` are `test/` and `src/`. `docs/**` invisible.
- `collectCoverageFrom` is `src/**/*.ts`. `docs/.vitepress/config.ts`
  invisible, so no coverage-threshold effect.
- `eslint.config.mjs` is invoked over explicit globs (`src`, `test`, `e2e`,
  `scripts`). `docs/` unlinted unless added.
- `format:check` globs are likewise explicit. `docs/` unformatted unless added.
- `test/lintGate.test.ts` asserts `ci` chains with `&&`, contains no `|`, and
  includes five named steps. Adding a docs step to `ci` is compatible
  (separators are asserted `>= steps-1`, all `&&`). Adding it to `build` is
  not asserted at all today - hence the proposed new test.

So the new files are invisible to every existing gate. That is the safe
default but it also means `docs/.vitepress/config.ts` would be the only
TypeScript in the repo that is neither linted, formatted, nor type-checked.

**Open questions**

1. Docs link placement: FAQ + README only (recommended, for the mobile-footer
   reason above), or footer too and accept re-tuning `responsive.css`?
2. Do `docs/**` join the `prettier` and `eslint` globs and `tsconfig.json`
   `include`? Recommend yes for `prettier` (cheap, keeps the repo uniform),
   no for `eslint`/`tsconfig` (VitePress config pulls its own types and would
   drag the whole `.vitepress` tree into `projectService`).
3. Does `docs:build` join `npm run ci`, or stay a `build`-only step? `ci` does
   not currently run `build` at all, so `ci` would be the first place a broken
   docs link is caught locally - at the cost of adding a Vite build to every
   gate run.
4. Scope of the first page set. TASK.md names seven pages. That is a lot of
   prose for one task; a first landing of index + how-to-play + architecture,
   with the rest seeded as a follow-up task, is a defensible cut.
5. `vitepress` install inside `nix develop` is unverified - `npm view` reached
   the registry, but the actual install and the `vitepress dev` run happen in
   the work phase. Vite's esbuild binary is the usual NixOS friction point.
