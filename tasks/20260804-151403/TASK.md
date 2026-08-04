# Publish a VitePress documentation site at /docs

- PRIORITY: 60
- TAGS: docs, tooling
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -
- DEPENDS ON: 20260804-151357

## Story

As a player or contributor who wants more than the FAQ gives, I want a
documentation site built from Markdown and published with the game, so that
gameplay rules, the content pipeline, and the architecture live somewhere
searchable instead of only in `AGENTS.md` and task records.

## Context

Today the project's prose is split across `README.md` (quickstart),
`AGENTS.md` (repo map, commands, conventions), `src/faq.html` (player-facing
Q&A), and ~58 `tasks/<id>/` records. Nothing is browsable and nothing is
searchable.

Settled with the user before this task was written:

- Tool: **VitePress**. Markdown in, static site out, npm-only, so it reuses the
  Node toolchain the game already has and adds no second language runtime.
  Rejected: MkDocs Material (adds a Python step to the Pages build), Docusaurus
  (React + ~200 deps, only worth it for versioned docs), and hand-rolled
  webpack pages (no nav, no search).
- Location: **a subpath of the game**, built to `dist/docs/` and shipped by the
  existing `.github/workflows/gh-pages.yaml` deploy, served at
  `/metajurassic/docs/`. One artifact, one deploy.

The base path matters: the Pages build already passes `PUBLIC_PATH=/metajurassic/`
to webpack, so VitePress needs the matching `base: "/metajurassic/docs/"` and
must not be hardcoded to that in local dev.

Documentation is a copy of nothing: pages should link to code and task records
rather than restate them, so `AGENTS.md` stays the single source for agent
conventions and the docs site does not fork it.

## Steps

DECISION.md settles the five questions NOTES.md left open. Do not re-open
them in the work phase.

- [ ] Install `vitepress@^1.6.4` as a devDependency (`latest`; `2.0.0-alpha.19`
      is the `next` tag and is not a candidate). Confirm `npm install` and a
      first `npx vitepress --version` succeed inside `nix develop` - Vite's
      esbuild binary is the usual NixOS friction point. If it fails there,
      stop and report rather than working around it.

- [ ] Add `docs/.vitepress/config.ts`: title, nav, sidebar, `search:
      { provider: "local" }`, `outDir: "../dist/docs"`, and
      `ignoreDeadLinks: false` stated explicitly (it is the 1.x default; state
      it so a later change cannot silently relax the dead-link gate).
      `base` mirrors webpack's `PUBLIC_PATH` with `docs/` appended:
      `process.env.PUBLIC_PATH ? \`${process.env.PUBLIC_PATH}docs/\` : "/docs/"`.
      Not hardcoded to `/metajurassic/docs/`, so `docs:dev` works locally.

- [ ] Write the seven pages under `docs/`. Each links to code and task records
      rather than restating them; `AGENTS.md` stays the single source for agent
      conventions and is linked, never forked.

      | Page | Covers | Read from |
      |------|--------|-----------|
      | `index.md` | What the game is, where to start | `README.md`, `src/faq.html` |
      | `how-to-play.md` | Tree, closeness steps, hints, guess budget | `src/hintRule.ts`, `src/faqCopy.ts`, `MAX_GUESSES`, `HINT_COST` |
      | `practice-and-seeds.md` | Practice mode, `?seed=`, `seed mod 100000`, resume | `src/practice.ts` |
      | `archives.md` | Species and clades archives | `src/species.ts`, `src/clades.ts` |
      | `profile-and-ranks.md` | Stats, streaks, rolling average, rank ladder | `src/profile/`, `src/gameStats.ts`, `src/rollingAverage.ts`, `src/rankLadder.ts` |
      | `content-pipeline.md` | `src/jurassic/*.md` -> `index.json`, never hand-edit `index.json` | `scripts/`, `AGENTS.md` |
      | `architecture.md` | Repo map, page/bundle layout, storage keys | `webpack.config.js` `PAGES`, `webpack-partials.js` |

      Any count that exists as a constant (guess budget, hint cost) is written
      as prose that names the constant, never as a hardcoded number - the same
      rule `src/faqCopy.ts` exists to enforce for the FAQ.

- [ ] `package.json`: add `"docs:dev": "vitepress dev docs"` and
      `"docs:build": "vitepress build docs"`, and chain
      `"build": "webpack --config webpack.config.js && npm run docs:build"`.
      Order is load-bearing: `webpack.config.js` sets `output.clean: true`, so
      webpack run second deletes `dist/docs/` and every command still exits 0.
      Add `"docs/**/*.md"` and `"docs/**/*.ts"` to the `format` and
      `format:check` globs. Leave `ci`, `lint` and `tsconfig.json` untouched
      (DECISION.md 2 and 3).

- [ ] Add `test/docsGate.test.ts` in the style of `test/lintGate.test.ts`:
      assert `pkg.scripts.build` contains a `docs:build` step, and that
      `webpack` appears before it in the string. This is the guard for the
      `clean: true` trap; a comment is not.

- [ ] Add one FAQ entry to `src/faq.html` linking to
      `<%= htmlWebpackPlugin.options.basePath %>docs/`. Note the template
      mechanism: `src/faq.html` is an html-webpack-plugin template, so it uses
      `htmlWebpackPlugin.options.basePath` (as the favicon link and the archive
      links do), NOT the bare `<%= basePath %>` form the injected partials use.
      The two are different passes; see `webpack-partials.js`.
      Do NOT add a footer link - DECISION.md 1.

- [ ] Add one line under `## More` in `README.md` pointing at the docs site.

- [ ] Extend the Pages workflow. The file is `.github/workflows/release.yaml`
      (renamed from `gh-pages.yaml` by the v1.0.0 task; if the sprout branches
      from a commit predating that rename, the same edits apply to
      `gh-pages.yaml`). It already runs `npm run build` with
      `PUBLIC_PATH=/metajurassic/`, so chaining `docs:build` into `build` needs
      no new workflow step - rename the step to say it builds both, and bump
      `node-version` from `"18"` to `"22"` so the deploy path runs the version
      `ci.yml` actually tests.

- [ ] Verify the new files are invisible to the existing gates, by running
      them, not by reading globs: `jest` `roots` are `test/` and `src/`,
      `collectCoverageFrom` is `src/**/*.ts`, `eslint` and `prettier` run over
      explicit globs, `test/markupConstants.test.ts` reads `src/*.html` only,
      and `.gitignore` already covers `**/.vitepress/{cache,dist}` and bare
      `dist`. Expected: no `.gitignore` edit.

## Definition of Done

Each proof below was run on the base branch and is red for the intended
missing change.

- `npm run docs:build` produces static output with no broken internal link.
  (cmd: npm run docs:build)  [base: exit 1, no such script]
- A full site build emits the docs under `dist/docs/`, in that order.
  (cmd: npm run build && test -f dist/docs/index.html)  [base: exit 1]
- The build order is pinned by a test, so reordering `build` fails a gate.
  (cmd: npx jest test/docsGate.test.ts)  [base: exit 1, no such file]
- The docs are reachable from the game and from the repo.
  (cmd: grep -q 'docs/' src/faq.html && grep -q 'docs' README.md)
  [base: exit 1]
- `npm run docs:dev` serves the site locally. (manual: agent loads the dev
  server root and one inner page, confirms local search returns a hit)
- The existing gate is unaffected by the new files. (cmd: npm run ci)
- The Pages workflow publishes both the game and the docs. (manual: user
  checks the deployed `/metajurassic/docs/` URL after the release tag)

## Notes

- Depends on the v1.0.0 release task only for content ordering, not for code:
  the CHANGELOG and trimmed README should exist first so the docs can link to
  them instead of restating them. That task is CLOSED/DONE.
- VitePress ships its own Vite build; do not try to route it through
  `webpack.config.js`. Two builders, one output directory.
- Scope guard: the seven pages above. No versioned docs, no API-reference
  generation from TypeScript, no i18n.
- No `src/` runtime code changes and no game behavior changes. The only `src/`
  edit is the one FAQ entry.
- A Playwright route spec for `/docs/` is deliberately not part of this task;
  `playwright.config.ts` starts the webpack dev server, which does not serve
  VitePress output. See DECISION.md 5.
