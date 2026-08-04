# Make the coverage gate see untested src modules

- PRIORITY: 50
- TAGS: chore, testing
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

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

## Steps

- [ ] Add `<rootDir>/src` to `roots` in `jest.config.js` and record the
      resulting per-file numbers.
- [ ] Confirm `testMatch`/`testPathIgnorePatterns` still discover exactly the
      32 suites under `test/` and no stray file under `src/`.
- [ ] Decide per newly visible module: exclude in `collectCoverageFrom` with a
      stated reason (DOM entry points, mirroring the existing `src/ui/**`
      exclusion), or keep it in the gate.
- [ ] Re-baseline `coverageThreshold` to the new real numbers and update the
      `// Current:` comments beside them.

## Definition of Done

- Coverage instruments the modules the config claims. (cmd: `npx jest --coverage --coverageReporters=json-summary --coverageThreshold='{}' && node -e "const s=require('./coverage/coverage-summary.json');const k=Object.keys(s).filter(f=>f!=='total');if(!k.some(f=>f.includes('src/game/index.ts')))process.exit(1)"`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- The `src/ui/**` exclusion plus the two re-includes (`treeLayout.ts`,
  `treeNav.ts`) show the intended pattern for opting a pure module back in.
- `src/markdownLoader.ts` is being deleted by `20260730-120401`, so it will
  not be among the newly visible files by the time this runs.
