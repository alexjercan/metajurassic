# AGENTS.md

Orientation for agents working on **Metajurassic**, a daily dinosaur-guessing
game (a clone of [Metazooa](https://metazooa.com)). Read this first, then check
the backlog (`tatr ls --sort priority`) and `LESSONS.md` before diving in.

## What this is

A browser game: guess the target dinosaur species, and each guess tells you how
close you are on the evolutionary tree. The taxonomy graph and per-species facts
are the content; the game logic, tree visualization, and daily-puzzle sequencing
are the code. The site is static and deployed to GitHub Pages.

## Layout

TypeScript front end bundled with webpack; a small Python toolchain regenerates
the content graph from markdown.

| Path | What it is |
|------|------------|
| `src/` | TypeScript source. `index.ts` is the entry; `game.ts`, `gameState.ts`, `gameData.ts`, `treeBuilder.ts` are the core; `ui/` holds widgets. |
| `src/*.html`, `src/style.css` | Page templates and Tailwind styles; `webpack-partials.js` stitches `_header.html`/`_footer.html` in. |
| `src/jurassic/species/*.md`, `src/jurassic/clades/*.md` | **Content source of truth** - one markdown file per species/clade, data in YAML-style frontmatter. |
| `src/jurassic/index.json` | The served content graph, GENERATED from the markdown above. Do not hand-edit; regenerate it. |
| `scripts/*.py` | Content pipeline (markdown <-> json <-> csv). See below. |
| `scripts/playtest/*.ts` | Playtest harness: a difficulty simulation, a hint-value simulation, and a browser screen-capture walkthrough. Outside the CI gate. See below. |
| `test/` | Jest suite (`*.test.ts`). |
| `webpack.config.js` | Bundler + dev server config (port 8080). |
| `flake.nix` | Nix dev shell: provides `nodejs`, `uv`, and the Python venv. |
| `tasks/` | tatr task records - one folder per task (TASK/REVIEW/RETRO/NOTES). |
| `LESSONS.md` | The lessons ledger - read it before starting any task. |

`dist/`, `data.csv`, `test.csv`, and `commontree-metajurassic.json` are
gitignored build/scratch artifacts (`.gitignore`: `*.csv`, `*metajurassic.json`,
`dist`). The markdown under `src/jurassic/` is what is versioned and canonical.

## Build, run, test

**The JS toolchain is NOT on PATH outside the nix dev shell.** `node`, `npm`,
and `npx` come from the `flake.nix` devShell (`pkgs.nodejs`). Enter it first:

```sh
nix develop                 # enter the dev shell (node + uv + python venv on PATH)

npm install                 # install JS deps (first time / after package.json changes)
npm run serve               # dev server at localhost:8080
npm run build               # production bundle into dist/

npm test                    # Jest
npm run test:coverage       # Jest with coverage (writes coverage/ + test-results/junit.xml)
npm run test:e2e            # Playwright browser E2E suite (e2e/, Chromium)
npm run lint                # eslint over src/ and test/
npm run format              # prettier --write; format:check to verify only
npm run ci                  # THE GATE: format:check + lint + test:coverage + test:e2e
```

`npm run ci` is the source of truth for green. Run it (inside `nix develop`)
before calling a change done, and say plainly when you skipped a step.

### Seed mode (deterministic targets)

The practice page honors a `?seed=N` query param (`localhost:8080/practice/?seed=42`)
that loads a chosen, reproducible target instead of a random one - the seed is
routed through the daily permutation, so it reproduces the MAPPED species, not a
raw modulo pick. This is the primitive for bug repros, E2E fixtures, and
playtests that need a known dinosaur. Seeded rounds persist under their own
`gameState-practice-...` key (isolated from the daily `gameState-...` key) and
share as "Practice Dinosaur ...", so they never clobber or masquerade as the
daily. The daily page (`src/index.ts`) deliberately ignores the param - the
daily target stays clock-derived (see `tasks/20260729-101819/DECISION.md`).
`e2e/seed.spec.ts` is the runnable "play a fixed round" walkthrough.

### Playtest harness (outside the gate)

Three standalone TypeScript scripts under `scripts/playtest/` measure the game as
a game rather than as code. They are NOT part of `npm run ci`:

```sh
npm run playtest:difficulty   # simulate all 150 targets, print the guess distribution and hint value
npm run playtest:hint         # price a hint against a guess in bits, per selection policy and cost
npm run serve                 # in another shell
npm run playtest:walkthrough  # drive the real screens, shots -> playtest-shots/ (gitignored)
```

`hint.ts` is the evidence rig for `tasks/20260729-160500/SPIKE.md` (why the hint
is a bad buy and what selection rule and price fix it). Like `difficulty.ts` it
imports the shipped game logic; it also re-checks its own reproduction of
`findNextHintCladeId` against the real function on every run, so a change to the
shipped rule shows up as a mismatch instead of a silently stale comparison.

`difficulty.ts` imports the shipped `computeLCA`/`GameState`/`findNextHintCladeId`
rather than re-implementing them, so it measures the game that actually ships;
only the player policies are new code. `walkthrough.ts` asserts nothing, which
is why it lives here and not in `e2e/`. The findings from the first pass are in
`tasks/20260729-092435/NOTES.md`.

The browser E2E suite lives in `e2e/` (config `playwright.config.ts`) and drives
the real screens in Chromium. It needs a browser binary: locally the `flake.nix`
dev shell supplies a NixOS-patched Chromium (`pkgs.playwright-driver.browsers`)
and points Playwright at it via `PLAYWRIGHT_BROWSERS_PATH`, so `npm run test:e2e`
just works inside `nix develop` - do NOT `npx playwright install` on NixOS. Keep
`@playwright/test` in `package.json` pinned to the `playwright-driver` version in
`flake.lock`; a mismatch fails with "Executable doesn't exist" because the browser
revisions differ. An assertion that encodes still-broken behavior (species icons,
`20260729-092404`) is committed as `test.fixme` so it documents the invariant
without reddening the gate; it flips on when that task lands.

To run `npm` without paying for the full Python venv build, you can invoke a
nix-store `nodejs` bin directly plus a `node_modules` symlink into the worktree,
or `nix develop -c npm run ci`. (See `LESSONS.md`:
`metajurassic-js-toolchain-lives-in-the-nix-devshell`.)

## Content pipeline

The markdown files under `src/jurassic/` are authored by hand; everything else
is generated. All scripts use only the Python stdlib and are run from the repo
root (inside `nix develop`, or with any `python3`):

```sh
python scripts/markdown_to_json.py   # md source -> src/jurassic/index.json (+ commontree-metajurassic.json)
python scripts/json_to_markdown.py   # index.json -> md files (reverse; regenerate the source layout)
python scripts/csv_to_json.py <csv>  # merge a data CSV into index.json (bulk content edits)
```

The normal loop after editing a species/clade markdown file is
`python scripts/markdown_to_json.py`, which rewrites the served `index.json` and
the `commontree-metajurassic.json` tree. `index.json` is checked in (it is the
runtime payload); the CSVs and the commontree JSON are gitignored scratch.

## CI vs local nix (known drift)

CI (`.github/workflows/ci.yml`) does NOT use nix. It runs `npm ci` then the gate
steps individually (`format:check`, `lint`, `test:coverage`, and a browser-E2E
step that first runs `npx playwright install --with-deps chromium` then
`npm run test:e2e`) on stock `ubuntu-latest` against a Node matrix (20.x and
22.x), then a separate `build` job runs `npm run build`. It runs the steps
separately rather than `npm run ci` so the Codecov uploads can slot between them;
`npm run ci` bundles the same steps for local use. Local development requires the
nix dev shell to get Node at all. This drift is intentional and workable, but the
environments differ: CI pins Node via `actions/setup-node` and installs the
Playwright browser itself, local uses `pkgs.nodejs` and the nix-provided browser
from the flake. If a build passes locally but fails in CI (or vice versa),
suspect a Node-version difference first.

Deploy is a third path: `.github/workflows/gh-pages.yaml` builds with
`PUBLIC_PATH=/metajurassic/` on Node 18 and publishes `dist/` to GitHub Pages on
every push to `master`.

## Conventions

- Global rules from `~/AGENTS.md` apply: plain ASCII punctuation only (`-`,
  `--`, `...`, `->`, straight quotes - no em dashes, smart quotes, or arrows),
  plain commit messages with NO AI attribution, and no time-based technical
  arguments.
- TypeScript style is enforced by prettier and eslint; keep `npm run ci` clean
  rather than disabling rules inline.
- Content changes go through the markdown source, then regenerate `index.json` -
  never hand-edit the generated JSON.
- Tests that guard content integrity should run over the REAL payload
  (`src/jurassic/index.json`), not a hand-written mock (see `LESSONS.md`).

## Development flow and records

`/flow` drives development here: plan a goal into tatr tasks, then `/work`
(implement in a sprout worktree), `/review` (out-of-context round-1 review until
APPROVE), and `/compound` (retro + lesson) for each. Everything tied to one task
lives under `tasks/<id>/` (TASK.md, REVIEW.md, RETRO.md, NOTES.md); the lessons
ledger is `LESSONS.md` at the repo root. `tatr check` and
`tatr check --ledger LESSONS.md` are the conformance gates - keep them clean.

Isolated work happens in a **sprout** worktree (`cd "$(sprout new <type>/<slug>)"`).
A fresh sprout has no `node_modules`; if you symlink the main checkout's, stage
explicit paths and never `git add -A` (the symlink is not matched by
`.gitignore`'s `node_modules/` and will ride into the commit - see `LESSONS.md`:
`sprout-worktrees-have-no-node_modules-dont-git-add-all`).
