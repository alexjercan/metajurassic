# Notes: Make the coverage gate see untested src modules

## What changes

Before: `npm run test:coverage` reports 21 `src/` files. A module under `src/`
that no test imports is absent from the report entirely, so it neither shows at
0% nor drags the `coverageThreshold` floors down. The gate silently measures
"whatever the tests happen to import", not the `collectCoverageFrom` globs.

After: Jest instruments every `src/**/*.ts` the globs name. 12 previously
invisible modules become visible, are judged on their merits, and the ones that
stay in the gate would show at 0% if they lost their tests. Adding a new pure
module under `src/` with no test now moves the numbers instead of being ignored.

No user-visible behavior change in the game; this is a CI-gate change only.

Measured (this branch, `roots: [test, src]`, thresholds off): 33 files, of which
exactly 12 are new and all 12 are at 0/0/0/0. Totals collapse from
95.39/81.83/99.31/98.22 to 55.99/57.71/63.75/55.72.

The 12 newly visible modules:

| Module | Statements | Nature |
|-|-|-|
| `src/clades.ts` | 40 | page entry point, `document.getElementById` bootstrap |
| `src/faq.ts` | 6 | page entry point, top-level DOM mutation |
| `src/practice.ts` | 29 | page entry point, wires DOM + navigation |
| `src/species.ts` | 71 | page entry point, carousel render + listeners |
| `src/game/index.ts` | 121 | DOM game bootstrap |
| `src/game/hintChip.ts` | 37 | DOM component |
| `src/game/onboardingBrief.ts` | 19 | DOM component |
| `src/game/shareButton.ts` | 21 | DOM listener wiring |
| `src/profile/index.ts` | 31 | page entry point |
| `src/profile/dinosaurList.ts` | 46 | DOM component |
| `src/profile/rollingAverageChart.ts` | 137 | DOM/SVG builder |
| `src/profile/statsPanel.ts` | 38 | DOM component |

Every one of them touches `document` directly and has no pure core to split out
without restructuring. That is the same property the config already names when
it excludes `src/ui/**` ("DOM-heavy, hard to unit test") and `src/index.ts`
("entry point"). So the per-module decision in Step 3 comes out the same way for
all 12: exclude, with the reason stated inline.

Consequence of that decision: with the 12 excluded, the measured set is exactly
the 21 files of the baseline and the numbers are byte-identical
(95.39/81.83/99.31/98.22 - probed, not predicted). `coverageThreshold` needs no
re-baselining. Step 4 becomes "confirm unchanged", not "lower the floors".

## Surfaces

| File | Why |
|-|-|
| `jest.config.js` | the only file changed: `roots` gains `<rootDir>/src`, `collectCoverageFrom` gains the DOM exclusions, the stale comment on `roots` is rewritten |
| `tasks/20260804-140413/TASK.md` | first DoD proof asserts `src/game/index.ts` is present in the summary; that contradicts excluding it (see open questions) |

No `src/` or `test/` file changes. No new test suite.

## Data and interfaces

No TypeScript surface changes. The whole diff is Jest config data:

- `roots: string[]` - `["<rootDir>/test"]` -> `["<rootDir>/test", "<rootDir>/src"]`
- `collectCoverageFrom: string[]` - 6 entries -> 10, adding four negative globs

## Sketches

Illustrative, not the patch.

```diff
-    // Scopes coverage discovery too, not just test discovery: jest only
-    // instruments files it finds under `roots`, so a `src/` module no test
-    // imports is ABSENT from the report rather than listed at 0%, and
-    // `collectCoverageFrom` below never sees it. See tasks/20260804-140413/.
-    roots: ["<rootDir>/test"],
+    // `src` is here for COVERAGE discovery, not test discovery: jest only
+    // instruments files it finds under `roots`, so without it a `src/` module
+    // no test imports is ABSENT from the report rather than listed at 0%.
+    // Nothing under `src/` matches `testMatch`, so the suite set is unchanged.
+    roots: ["<rootDir>/test", "<rootDir>/src"],
```

```diff
     collectCoverageFrom: [
         "src/**/*.ts",
         "!src/**/*.d.ts",
         "!src/ui/**/*.ts", // Exclude UI components (DOM-heavy, hard to unit test)
         "src/ui/treeLayout.ts", // ...except this one: pure geometry, no DOM
         "src/ui/treeNav.ts", // ...and this one: pure traversal, no DOM
-        "!src/index.ts", // Exclude entry point
+        "!src/game/**/*.ts", // DOM components, same reason as src/ui/**
+        "!src/profile/**/*.ts", // DOM components, same reason as src/ui/**
+        // Page entry points: DOM bootstrap only, covered by the e2e suite.
+        "!src/index.ts",
+        "!src/clades.ts",
+        "!src/faq.ts",
+        "!src/practice.ts",
+        "!src/species.ts",
     ],
```

## Shape

```
        collectCoverageFrom globs          roots
                  |                          |
                  v                          v
        "what SHOULD be measured"   "where jest LOOKS"
                  \                          /
                   \                        /
                    +--------- AND ---------+
                                |
                                v
                       instrumented set

  before:  globs say src/**   AND  looks only in test/
           => set = { src modules some test imports }   (21 files)
           => a file with zero tests is invisible, not 0%

  after:   globs say src/** minus DOM   AND  looks in test/ + src/
           => set = { every non-DOM src module }        (21 files today,
              and tomorrow's untested pure module too, at 0%)
```

## Consequences and open questions

Costs and limits:

- Excluding 12 modules (~590 statements) makes the gate's silence about them
  explicit rather than accidental. It does not test them. `npm run test:e2e`
  (Playwright) is what actually exercises those paths; the unit gate now says so
  in writing.
- The exclusion list is a maintenance surface: a new page entry point under
  `src/` must be added to it or it lands at 0% and fails the floors. That is the
  intended failure mode - loud, in CI, at authoring time - but it is a new way
  for an unrelated PR to go red.
- `!src/game/**` and `!src/profile/**` are directory-wide. If a pure module is
  later added under either, it is excluded by default and needs a re-include
  line, mirroring the `treeLayout.ts` / `treeNav.ts` precedent.
- Forecloses nothing: re-including any module is a one-line change plus tests.

Confirmed by measurement, not assumed:

- Suite discovery is unchanged with `src` in `roots`: 32 suites, 411 tests, all
  passing. Nothing under `src/` matches Jest's default `testMatch`.
- With the exclusions applied, the measured file set and all four percentages
  match the baseline exactly. Probed via a generated config, so the floors are
  known-safe before the edit.

Open question, for planning to settle:

- TASK.md's first DoD proof asserts `src/game/index.ts` appears in
  `coverage-summary.json`. That was written before the per-module decision and
  presumes `src/game/**` stays in the gate. Under the recommended decision the
  proof must change - to a sentinel that survives the exclusions. The honest
  form asserts what the task actually claims: that `roots` reaches `src/`, e.g.
  a throwaway untested `src/` module shows at 0%, or simply that
  `jest --showConfig` lists `<rootDir>/src` in `roots`. Recording the assumption
  and proceeding: the alternative reading - keep all 12 in the gate and
  re-baseline the floors to 56/58/64/56 - satisfies the proof as written but
  guts the gate for every module that IS tested, which contradicts the task's
  own Story.
