# Decision: exclude the 12 newly visible DOM modules, do not lower the floors

- STATUS: ACCEPTED
- DATE: 2026-08-04
- TASK: 20260804-140413
- TAGS: chore, testing

## Context

Adding `<rootDir>/src` to `roots` makes jest instrument 12 `src/` modules that
no test imports: the four page entry points (`clades.ts`, `faq.ts`,
`practice.ts`, `species.ts`), all of `src/game/**`, and all of
`src/profile/**`. Every one is at 0/0/0/0. Left in the gate they collapse the
totals from 95.39 / 81.83 / 99.31 / 98.22 to 55.99 / 57.71 / 63.75 / 55.72.

TASK.md's original first DoD proof asserted `src/game/index.ts` appears in the
coverage summary, which presumes those modules stay in the gate. The two
readings are mutually exclusive, so planning settles it here.

## Alternatives considered

| Option | Effect |
|-|-|
| A. Exclude all 12 in `collectCoverageFrom` | measured set and floors unchanged; the gate's silence about DOM modules becomes explicit |
| B. Keep all 12, re-baseline floors to ~56/58/64/56 | satisfies the original proof, but the floors no longer constrain the modules that ARE tested |
| C. Keep them and write unit tests for all 12 | ~590 statements of DOM bootstrap; a different, much larger task |

## Decision

Option A.

Every one of the 12 touches `document` directly and has no pure core to split
out without restructuring. That is the property `jest.config.js` already names
when it excludes `src/ui/**` ("DOM-heavy, hard to unit test") and `src/index.ts`
("entry point"), so the per-module judgement lands the same way for all 12.

Option B guts the gate: dropping the statement floor to 56 lets any tested
module lose most of its tests without CI noticing. That contradicts this task's
own Story, which is about making the gate more honest, not less binding.
Option C is real work worth doing, but it is not this task; the Playwright
suite (`npm run test:e2e`) is what exercises those paths today.

## Consequences

- The exclusion list becomes a maintenance surface: a new page entry point
  under `src/` must be added to it or it lands at 0% and fails the floors. That
  failure is loud, in CI, at authoring time - the intended mode - but it is a
  new way for an unrelated PR to go red.
- `!src/game/**` and `!src/profile/**` are directory-wide, so a pure module
  later added under either is excluded by default and needs a re-include line,
  mirroring the `treeLayout.ts` / `treeNav.ts` precedent.
- Reversible: re-including any module is a one-line change plus tests.
- The DoD proof changes accordingly - it asserts `roots` reaches `src/` via a
  CLI `collectCoverageFrom` override, not that `src/game/index.ts` survives
  into the default report.
