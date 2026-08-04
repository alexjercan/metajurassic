# Publish a VitePress documentation site at /docs

- PRIORITY: 60
- TAGS: docs, tooling
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE
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

- [x] Install `vitepress@^1.6.4` as a devDependency (`latest`; `2.0.0-alpha.19`
      is the `next` tag and is not a candidate). Confirm `npm install` and a
      first `npx vitepress --version` succeed inside `nix develop` - Vite's
      esbuild binary is the usual NixOS friction point. If it fails there,
      stop and report rather than working around it.

- [x] Add `docs/.vitepress/config.mts` (CORRECTED from `.ts`; see close-out):
      title, nav, sidebar, `search:
      { provider: "local" }`, `outDir: "../dist/docs"`, and
      `ignoreDeadLinks: false` stated explicitly (it is the 1.x default; state
      it so a later change cannot silently relax the dead-link gate).
      `base` mirrors webpack's `PUBLIC_PATH` with `docs/` appended:
      `process.env.PUBLIC_PATH ? \`${process.env.PUBLIC_PATH}docs/\` : "/docs/"`.
      Not hardcoded to `/metajurassic/docs/`, so `docs:dev` works locally.

- [x] Write the seven pages under `docs/`. Each links to code and task records
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

- [x] `package.json`: add `"docs:dev": "vitepress dev docs"` and
      `"docs:build": "vitepress build docs"`, and chain
      `"build": "webpack --config webpack.config.js && npm run docs:build"`.
      Order is load-bearing: `webpack.config.js` sets `output.clean: true`, so
      webpack run second deletes `dist/docs/` and every command still exits 0.
      Add `"docs/**/*.md"` and `"docs/**/*.mts"` (CORRECTED from `*.ts`, same
      reason as the config step) to the `format` and
      `format:check` globs. Leave `ci`, `lint` and `tsconfig.json` untouched
      (DECISION.md 2 and 3).

- [x] Add `test/docsGate.test.ts` in the style of `test/lintGate.test.ts`:
      assert `pkg.scripts.build` contains a `docs:build` step, and that
      `webpack` appears before it in the string. This is the guard for the
      `clean: true` trap; a comment is not.

- [x] Add one FAQ entry to `src/faq.html` linking to
      `<%= htmlWebpackPlugin.options.basePath %>docs/`. Note the template
      mechanism: `src/faq.html` is an html-webpack-plugin template, so it uses
      `htmlWebpackPlugin.options.basePath` (as the favicon link and the archive
      links do), NOT the bare `<%= basePath %>` form the injected partials use.
      The two are different passes; see `webpack-partials.js`.
      Do NOT add a footer link - DECISION.md 1.

- [x] Add one line under `## More` in `README.md` pointing at the docs site.

- [x] Extend the Pages workflow. The file is `.github/workflows/release.yaml`
      (renamed from `gh-pages.yaml` by the v1.0.0 task; if the sprout branches
      from a commit predating that rename, the same edits apply to
      `gh-pages.yaml`). It already runs `npm run build` with
      `PUBLIC_PATH=/metajurassic/`, so chaining `docs:build` into `build` needs
      no new workflow step - rename the step to say it builds both, and bump
      `node-version` from `"18"` to `"22"` so the deploy path runs the version
      `ci.yml` actually tests.

- [x] Verify the new files are invisible to the existing gates, by running
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

## Close-out

### What and why

VitePress 1.6.4 ships as a devDependency and builds `docs/` into `dist/docs/`,
behind the existing Pages deploy. `npm run build` is now two builders into one
output directory, webpack first; `test/docsGate.test.ts` pins that order. Seven
pages landed as specified, each linking to code and task records instead of
restating them. Two entry points: one FAQ entry and one `README.md` line. No
footer link, no `src/` runtime change, no `ci` change, no `.gitignore` change.

Everything in DECISION.md held. The five settled questions were not reopened.

### Alternatives

None re-litigated - DECISION.md had already closed the forks. The only new
choice was `.mts` over `.ts` for the config, below, where the alternatives were
`.mts`, adding `"type": "module"` to the root `package.json`, or a separate
`docs/package.json`. `.mts` is the remedy VitePress documents and the only one
that touches a single file; flipping the root to ESM would have reached webpack,
Jest, PostCSS and every `.js` config in the repo, for one 70-line file.

### Difficulties and diagnosis

**`docs/.vitepress/config.ts` could not be loaded.** `docs:build` failed with
`"vitepress" resolved to an ESM file. ESM file cannot be loaded by require`.
Cause: the root `package.json` declares `"type": "commonjs"`, so Vite loads a
`.ts` config as CommonJS, and VitePress 1.x is ESM-only. Renamed to
`config.mts`, which forces ESM regardless of the enclosing package type. The
prettier globs moved from `docs/**/*.ts` to `docs/**/*.mts` with it - verified
by `prettier --check "docs/**/*.mts"` matching the file rather than passing
vacuously on an empty glob. TASK.md steps 2 and 4 are corrected in place and a
comment at the top of the config records the constraint, since renaming it back
reintroduces the failure.

**`npx vitepress --version` hangs.** Not a defect: `--version` is not a
recognised flag, so it falls through to `vitepress dev` and starts a server.
That is a stronger check than the plan asked for - it proves esbuild's binary
runs on NixOS, which was the step's stated friction point. No workaround needed.

**Sprout base predates the workflow rename.** The worktree branched from
`b762a38`, where the file is still `.github/workflows/gh-pages.yaml`; the rename
to `release.yaml` is uncommitted in the main checkout, owned by another task.
Applied the same two edits to `gh-pages.yaml`, exactly as the step anticipated,
and left the main tree's dirty rename untouched.

### Evidence

All run inside `nix develop`, in the sprout worktree.

| Proof | Result |
| --- | --- |
| `npm run docs:build` | exit 0; `ignoreDeadLinks: false`, so no dead internal link |
| `npm run build && test -f dist/docs/index.html` | exit 0; 7 pages plus `404.html` emitted |
| `npx jest test/docsGate.test.ts` | 4 passed (was 4 failed before the `package.json` edit) |
| `grep -q 'docs/' src/faq.html && grep -q 'docs' README.md` | exit 0 |
| `npm run ci` | exit 0; 185 Playwright specs, Jest coverage thresholds held |
| `PUBLIC_PATH=/metajurassic/ npm run build` | FAQ emits `href="/metajurassic/docs/"`; docs assets emit `/metajurassic/docs/assets/...` |
| `npm run docs:dev` (manual) | root renders `Metajurassic`, inner page renders `How to play`, local search for "hint" returns 7 results across 4 pages |

Gate invisibility was confirmed by running the gates, not by reading globs:
`npm run ci` is green with the new files present, and `git status` shows exactly
eight new paths under `docs/` plus `test/docsGate.test.ts`, with
`docs/.vitepress/cache/` already ignored. No `.gitignore` edit, as predicted.

Still pending, by design: the deployed `/metajurassic/docs/` URL, which the user
checks after the release tag.

### Reflection

The plan was accurate everywhere it touched this repository's own code - the
`clean: true` trap, the two template passes in `src/faq.html`, the gate globs.
It was wrong only about the new tool's own packaging constraint, which is the
one thing it could not read out of the existing source. Worth noting for the
next "add a second builder" task: check the new tool's module system against the
root `"type"` field before writing the config, not after.

The `--version` hang cost more time than the real bug did, because a hang reads
as a NixOS problem when it was just a flag that does not exist. Running the
binary with no arguments first would have shown that immediately.
