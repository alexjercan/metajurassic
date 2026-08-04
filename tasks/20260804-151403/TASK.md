# Publish a VitePress documentation site at /docs

- PRIORITY: 60
- TAGS: docs, tooling
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
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

- [ ] Add `vitepress` as a devDependency and `docs:dev` / `docs:build` scripts.
      Confirm it installs and runs inside `nix develop`.
- [ ] Create `docs/` with `.vitepress/config.ts` (title, base, nav, sidebar,
      local search) and a first set of pages: index/overview, how to play
      (tree, closeness, hints, guess budget), practice and seeds, the archives,
      profile and rank ladder, the content pipeline
      (`src/jurassic/*.md` -> `index.json`, and the never-hand-edit rule), and
      architecture (repo map, page/bundle layout, storage keys).
- [ ] Wire the build so `npm run build` (or the Pages job) emits the docs into
      `dist/docs/` with the right `base`, and link the site from the game footer
      or FAQ.
- [ ] Extend `.github/workflows/gh-pages.yaml` to build docs before the artifact
      upload, and verify the deployed paths resolve.
- [ ] Keep the docs out of the JS gates that would misfire on them: check
      `prettier`, `eslint`, `jest` roots and `collectCoverageFrom` globs, and
      `.gitignore` for `docs/.vitepress/{cache,dist}`.
- [ ] Add a link check or a route E2E so a broken docs deploy fails a gate
      rather than 404ing silently.

## Definition of Done

- `npm run docs:dev` serves the site locally. (cmd: npm run docs:dev)
- `npm run docs:build` produces static output with no broken internal links.
  (cmd: npm run docs:build)
- A full site build emits the docs under `dist/docs/`.
  (cmd: npm run build && test -f dist/docs/index.html)
- The docs are reachable from the game. (manual: user clicks through from the
  site footer/FAQ to the docs and back)
- The existing gate is unaffected by the new files. (cmd: npm run ci)
- The Pages workflow publishes both the game and the docs. (manual: user
  checks the deployed `/metajurassic/docs/` URL after merge)

## Notes

- Depends on the v1.0.0 release task only for content ordering, not for code:
  the CHANGELOG and trimmed README should exist first so the docs can link to
  them instead of restating them.
- VitePress ships its own Vite build; do not try to route it through
  `webpack.config.js`. Two builders, one output directory.
- Scope guard: first pass is the page set above. No versioned docs, no
  API-reference generation from TypeScript, no i18n.
