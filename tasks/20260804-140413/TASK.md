# Make the coverage gate see untested src modules

- PRIORITY: 50
- TAGS: chore, testing
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As someone trusting `npm run ci`, I want the coverage gate to see every `src/`
module it claims to measure, so that a file with no test at all shows as 0%
instead of vanishing from the report.

## Context

Found while doing `20260730-120401`. `jest.config.js` sets
`collectCoverageFrom: ["src/**/*.ts", ...]`, but it also sets
`roots: ["<rootDir>/test"]`. Jest only discovers files to instrument inside
`roots`, so the `collectCoverageFrom` globs never match anything under `src/`
that no test imports. Untested modules are silently absent from the report
rather than reported at 0%.

Reproduced on the base branch: `coverage/lcov.info` lists 19 `src/` files.
Re-running with `--roots=<rootDir>/test --roots=<rootDir>/src` lists 34,
adding `src/clades.ts`, `src/species.ts`, `src/faq.ts`, `src/faqCopy.ts`,
`src/practice.ts`, `src/markdownLoader.ts` and every module under `src/game/`
and `src/profile/`.

That means the `coverageThreshold` floors (branches 78, functions 98, lines
97, statements 94) are computed over a subset chosen by "what the tests happen
to import", not by the config's stated intent. Adding `src/` to `roots` will
drop the measured percentages sharply, so this task has to decide per module
whether it belongs in the gate (and gets tests) or is explicitly excluded like
`src/ui/**` already is, and then re-baseline the floors.

Settled during planning: all 12 newly visible modules are DOM entry points or
DOM components and are excluded, which leaves the measured set and the floors
byte-identical to the baseline. See DECISION.md; the numbers above are the
first, pre-`markdownLoader`-deletion measurement and NOTES.md carries the
current ones.

## Steps

- [x] `jest.config.js`: add `<rootDir>/src` to `roots`, and rewrite the comment
      above it to say `src` is there for coverage discovery, not test
      discovery.
- [x] `jest.config.js`: extend `collectCoverageFrom` with the four negative
      globs that exclude the 12 newly visible DOM modules - `!src/game/**/*.ts`
      and `!src/profile/**/*.ts` (DOM components, same reason as `src/ui/**`),
      and `!src/clades.ts`, `!src/faq.ts`, `!src/practice.ts`,
      `!src/species.ts` grouped with the existing `!src/index.ts` under one
      "page entry points" comment. See DECISION.md.
- [x] Confirm suite discovery is unchanged: `npx jest --listTests | wc -l`
      still reports 32 and lists nothing under `src/`.
- [x] Confirm the measured file set is still the 21 baseline files and the four
      percentages are unchanged, then update the stale `// Current:` comments
      beside `coverageThreshold` to the measured 81.83 / 99.31 / 98.22 / 95.39.
      Leave the floors at 78 / 98 / 97 / 94.

## Definition of Done

- `roots` reaches `src/`, so a `src/` module no test imports is instrumented
  rather than absent. Red on base: the explicit glob matches zero files.
  (cmd: `npx jest --coverage --coverageReporters=json-summary --coverageThreshold='{}' --collectCoverageFrom='src/game/**/*.ts' && node -e "const s=require('./coverage/coverage-summary.json');const k=Object.keys(s).filter(f=>f!=='total');if(k.length!==4)process.exit(1)"`)
- Suite discovery unchanged by the new root. (cmd: `test "$(npx jest --listTests | wc -l)" = 32 && ! npx jest --listTests | grep -q '/src/'`)
- `npm run ci` passes - regression guard for stray test discovery and for the
  floors, not a discriminating proof. (cmd: `npm run ci`)

## Notes

- The `src/ui/**` exclusion plus the two re-includes (`treeLayout.ts`,
  `treeNav.ts`) show the intended pattern for opting a pure module back in.
- `src/markdownLoader.ts` was deleted by `20260730-120401` (commit `4a1d8b5`),
  so it is no longer among the newly visible files.
- Probed on base with CLI overrides, not predicted: `--roots test --roots src`
  plus the four planned exclusions yields 32 suites, 411 tests, 21 measured
  files, totals 95.39 / 81.83 / 99.31 / 98.22 - all above the existing floors.
  So `coverageThreshold` needs no re-baselining; only its comments are stale.
- The first DoD proof deliberately does not assert `src/game/index.ts` is in
  the default report - the recommended decision excludes it. It overrides
  `collectCoverageFrom` on the CLI to isolate the one thing this task changes:
  whether jest looks under `src/` at all.
- Assumption: excluding the 12 DOM modules is preferred over keeping them and
  re-baselining the floors to ~56/58/64/56. Recorded in DECISION.md.

## Close-out

What and why: `jest.config.js` only. `roots` gains `<rootDir>/src` so jest
instruments `src/` modules no test imports, and `collectCoverageFrom` gains four
negative globs so the 12 DOM modules that newly become visible are excluded on
their merits rather than by accident. The `roots` comment now says why `src` is
there, and the stale `// Current:` figures beside `coverageThreshold` were
refreshed to the measured values. Floors untouched.

Alternatives: keeping the 12 in the gate and re-baselining the floors to
~56/58/64/56 (guts the gate for the modules that ARE tested), or writing tests
for all 12 (~590 statements of DOM bootstrap, a separate task). See DECISION.md.

Difficulties: none. Planning had already probed the post-change numbers with CLI
overrides, so the edit landed on measured values instead of predicted ones. The
only wrinkle was the first DoD proof, written before the exclusion decision - it
overrides `collectCoverageFrom` on the CLI precisely so it tests "does jest look
under `src/`" and not "did `src/game` survive the exclusions".

Evidence:

- Proof 1 red on base (0 of 4 `src/game` files instrumented), green after (4).
- Proof 2: `npx jest --listTests` still 32, nothing under `src/`.
- Proof 3: `npm run ci` exit 0 - 411 jest tests, 184 playwright tests.
- Default coverage run: 21 measured files, totals 95.39 / 81.83 / 99.31 / 98.22,
  byte-identical to the baseline.

Reflection: the exclusion list is now the maintenance surface. A new page entry
point under `src/` lands at 0% and fails the floors unless it is added - loud and
at authoring time, which is the intended mode, but worth remembering when an
unrelated PR goes red on coverage.
