# AGENTS.md

Metajurassic: static TypeScript/webpack dinosaur-guessing game, deployed to
GitHub Pages. Guesses reveal distance from the target on an evolutionary tree.

Start here, then run `tatr ls --sort priority` and grep `LESSONS.md` for the
work area.

## Agent workflow

- Tracker/epics: `tatr`; records under `tasks/<id>/`; flow is `/flow` -> `/work` -> `/review` -> `/compound`.
- Examples/retention: runnable examples in `e2e/seed.spec.ts` and `scripts/playtest/`; findings in task records; durable lessons in `LESSONS.md`.
- Domain docs: `README.md`, shipped code under `src/`, and task `DECISION.md` files; code defines current behavior.
- Research/network: prefer local code and records; store research in `tasks/<id>/NOTES.md` or `SPIKE.md`; use network only when required.
- Checks/records: `npm run ci`, `tatr check`, and `tatr check --ledger LESSONS.md`; keep code and task records green.

## Repository map

| Path | Purpose |
|------|---------|
| `src/` | App source. Core: `game/` (DOM wiring and the round's units), `gameState.ts`, `gameData.ts`, `treeBuilder.ts`, `hintRule.ts`, `puzzleKey.ts`, `shareText.ts`. UI widgets: `src/ui/`. |
| `src/*.html`, `src/style.css`, `src/partials/` | Page templates and Tailwind styles. `src/style.css` is the entry: `@tailwind` directives plus one `@import` per surface partial, in cascade order. `webpack-partials.js` adds shared header/footer. |
| `src/jurassic/species/*.md`, `src/jurassic/clades/*.md` | Canonical content. |
| `src/jurassic/index.json` | Generated runtime graph. Never hand-edit. |
| `scripts/*.py` | Content conversion and pipeline tests. |
| `scripts/playtest/*.ts` | Game simulations and visual walkthrough. Outside CI. |
| `test/` | Jest tests. |
| `e2e/` | Playwright browser tests. |
| `tasks/` | Versioned tatr task, review, decision, retro, and notes records. |
| `LESSONS.md` | Durable lessons ledger. |

Ignored outputs: `dist/`, `*.csv`, `*metajurassic.json`, `coverage/`,
`test-results/`, `playtest-shots/`.

## Environment and commands

JS tools exist only inside the Nix dev shell.

```sh
nix develop
npm install

npm run serve             # localhost:8080
npm run build             # dist/
npm test                  # Jest
npm run test:pipeline     # Python content-pipeline tests
npm run test:e2e          # Playwright Chromium
npm run lint              # zero warnings
npm run lint:fix
npm run format
npm run format:check
npm run ci                # required local gate
```

- Done requires `npm run ci` inside `nix develop`. Report skipped checks.
- `npm run ci`: format check -> lint -> pipeline -> coverage -> E2E.
- `npm run build`: separate production-bundle check.
- NixOS Playwright: use the flake-provided browser. Never run
  `npx playwright install`. Keep `@playwright/test` pinned to the
  `playwright-driver` version in `flake.lock`.
- Parallel checkout already serving on 8080: inspect with
  `ss -ltnp | grep :8080`; use `E2E_PORT=8181 npm run ci`. Do not kill another
  checkout's server.
- Jest time zone: `test/setTimeZone.js` sets `TZ=Europe/Bucharest`.
  Date-sensitive tests call `expectPinnedZone()` from `test/timeZone.ts`.
  Never set `TZ` inside a spec.

## Content pipeline

Author markdown first. Regenerate the checked-in runtime graph.

| Command | Direction |
|---------|-----------|
| `python3 scripts/markdown_to_json.py` | Markdown -> `src/jurassic/index.json` plus ignored tree JSON |
| `python3 scripts/json_to_markdown.py` | JSON -> markdown source layout |
| `python3 scripts/csv_to_json.py <csv>` | CSV merge -> JSON; sync changes back to markdown |

- Pipeline rejects non-string values and serialized collections before writes.
- After an intended CSV merge: run `json_to_markdown.py`, review markdown, then
  run `markdown_to_json.py`.
- Content tests use the real `src/jurassic/index.json`, not mocks.
- `test/contentSource.test.ts`: markdown/JSON round-trip and stale payload guard.
- `test/dataIntegrity.test.ts`: graph, uniqueness, media, and render-safety rules.
- Related history: `tasks/20260729-092352/` and `LESSONS.md`.

## Deterministic practice games

- `practice/?seed=N`: reproducible target through the daily permutation.
- Seed normalization: `seed mod PUZZLE_ID_MODULUS`.
- Daily page ignores `seed`; practice state and share labels stay separate.
- Seeded rounds resume from storage. Repeated `goto` in one E2E test requires
  `localStorage.clear()` for a clean board.
- `practice-current`: active unseeded round. Finished round clears the pointer.
- Query seed overrides the pointer and is never stored as current.
- New game deletes unfinished state; keeps finished state for profile stats.
- Practice history cap: `MAX_PRACTICE_ENTRIES` (50), pruned oldest-first.
- Runnable example: `e2e/seed.spec.ts`.
- Design records: `tasks/20260729-101819/DECISION.md` and
  `tasks/20260729-101754/DECISION.md`.

## Playtests

Outside `npm run ci`.

| Command | Purpose |
|---------|---------|
| `npm run playtest:difficulty` | Simulate all targets and guess distribution. |
| `npm run playtest:hint` | Compare hint value and cost. |
| `npm run playtest:walkthrough` | Capture real screens to `playtest-shots/`; requires dev server. |

- Difficulty and hint rigs import shipped game logic.
- Hint rig cross-checks its rule reproduction against `findNextHintCladeId`.
- Walkthrough asserts nothing; browser assertions belong in `e2e/`.
- Findings: `tasks/20260729-092435/NOTES.md` and
  `tasks/20260729-160500/SPIKE.md`.

## CI and deploy

| Path | Environment | Checks |
|------|-------------|--------|
| Local | Nix dev shell | `npm run ci`; run `npm run build` when relevant |
| `.github/workflows/ci.yml` | Ubuntu, Node 20 and 22 | Gate steps separately; build job on Node 22 |
| `.github/workflows/gh-pages.yaml` | Ubuntu, Node 18 | Build with `PUBLIC_PATH=/metajurassic/`; deploy `dist/` from `master` |

Environment-specific failure: check Node-version drift first.

## Comments

Keep a comment for what a reader cannot recover without it. Not for what it
took to learn, and not for who learned it.

| Keep | Form |
|------|------|
| Public API contract | docstring above the exported symbol |
| Non-obvious constraint or guard: "do not change this", a browser quirk, an ordering or specificity dependency | one compact line or short block at the site |
| Why an assertion has its particular form: exact values not a property, this viewport, both branches, here and not there | at the assertion, at whatever length it needs |
| A defect shape, value, or invariant the code still defends | at the site |
| Record pointer | one line, after the constraint it explains |
| Live tracker marker | `NOTE:` / `FIXME:` / `TODO:` / `BUG:` plus the tatr ID |

| Discard | Why |
|---------|-----|
| Narration of what the code plainly does | the code says it |
| "task `<id>` wanted me to...", "found in review R1.4", "was `test.fixme` while..." | archaeology; the record holds it |
| Rationale reproducing a `DECISION.md` | compact to one line plus the pointer |
| Every clause describes behaviour that no longer ships | actively misleading; delete outright |

Compaction, not deletion, when a comment is partly load-bearing: split it at
the constraint, keep the constraint, drop the story.

Three rules decide the cases the tables do not:

- **Compact only towards an existing record.** If the rationale has no
  `DECISION.md`, `SPIKE.md` or `NOTES.md` behind it, the comment is its only
  copy: keep it in full, or write the record first and then compact. Length is
  never itself a reason to cut.
- **A pointer needs a constraint.** `See tasks/X/DECISION.md` alone tells a
  reader nothing they can act on. State what is constrained, then point.
- **A live marker is a marker.** `NOTE:` / `FIXME:` / `TODO:` / `BUG:` with a
  tatr ID means work that is still open. A task ID in any other shape is
  history and belongs in the record, not the code.

`test/` and `e2e/` are held to the same rules and to no extra brevity rule.
Their comment density is a feature: most of it is the why-this-assertion case
above.

Worked examples of the four hard cases: `tasks/20260731-212557/DECISION.md`.
Repository-wide inventory: `tasks/20260731-212557/NOTES.md`.

## File size

A file splits when it holds several unrelated jobs, because the seams are what
a reader needs and the size is what makes them expensive to find. Section
banners (`// ---- Policies ----`, `// ==== EDGE CASES ====`) are the reliable
signal: a banner is a file boundary that has not happened yet.

A file does NOT split for:

- Length alone. A long file doing one job is fine.
- A single caller wanting an abstraction. One caller is not an abstraction
  (KISS, YAGNI).

A split MOVES code. It does not generalize it, rename exported symbols, or
introduce a parameter, hook, or config knob on the way. If a split cannot be
done without changing behaviour, it is a different task.

## Conventions

- Global `~/AGENTS.md` applies.
- Code comments and file size: see `## Comments` and `## File size` above.
- ASCII punctuation only. No AI attribution in commits.
- Optimize for correctness, maintainability, and design quality.
- Lint: zero warnings. Fix new warnings or disable a rule deliberately in
  `eslint.config.mjs` with a reason. Never weaken `--max-warnings=0`.
- New source directory: update Prettier, ESLint, and TypeScript globs together.
- Webpack type-checks `e2e/`; E2E TypeScript errors can break the app bundle.
- Content: edit markdown, regenerate JSON, test the real payload.
- Test mutations: restore from a scratch copy, never `git checkout` a modified
  file.
- Sprout worktree with symlinked `node_modules`: stage explicit paths. Never
  `git add -A`.
- Meaningful change: record rationale, tradeoffs, fixes, and next-time lessons
  in the task records and `LESSONS.md`.
