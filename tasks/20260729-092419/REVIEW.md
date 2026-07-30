# Review: Tighten CI signal and remove warning drift

- VERDICT: APPROVE
- ROUNDS: 2 (REQUEST_CHANGES, APPROVE)
- DATE: 2026-07-30

Branch `chore/strict-lint-gate`. Round 1 was out-of-context: the reviewer did
not write the code, re-derived the behaviour from the diff, the task and the
ledger, and independently re-ran both the falsification and the full gate.

## Round 1 - 2026-07-30, out-of-context reviewer

Reviewer independently reproduced the whole Verification table (both
falsification rows, the full `E2E_PORT=8181 npm run ci` at exit 0 with 21 Jest
suites / 322 tests + 104 Playwright tests) and mutation-tested the new guard
(deleting `--max-warnings=0` does turn `test/lintGate.test.ts` red). Diff
confirmed in scope, 6 files, +247/-14, no unrelated cleanup riding along.

### MAJOR - `toContain("npm run lint")` also matches `npm run lint:fix`

`test/lintGate.test.ts:43` and the `it.each` step loop used substring matching.
The reviewer swapped `ci` to call `npm run lint:fix` - the script this branch
DELIBERATELY leaves non-strict - and all 9 specs stayed green while the gate had
silently lost `--max-warnings=0` entirely. That is exactly the failure mode the
spec's own comment claims to prevent, so the guard had a hole the size of the
decision it was guarding.

FIXED: both assertions now use a word-boundary regex,
`npm run <step>(?![:\w-])`, so `lint:fix` no longer satisfies `lint`. Verified
by re-running the reviewer's mutation: `ci` pointing at `lint:fix` now fails 2
specs instead of passing.

### MINOR - the "CI inherits the bar" comment asserted an unguarded artifact

`test/lintGate.test.ts:38-42` reasoned about `.github/workflows/ci.yml` while
only reading `package.json`. Dropping the workflow's `npm run lint` step, or
spelling out a bare `npx eslint`, turned nothing red - yet AGENTS.md and
DECISION.md both state CI inheritance as fact.

FIXED: the spec now reads `.github/workflows/ci.yml` from disk and asserts a
`run: npm run lint` step, with the same word boundary.

### MINOR - the no-pipe regex did not match its own comment

`/\|[^|]/` flagged `a || b` (not a pipe) and MISSED a trailing `npm run x |`
(because `[^|]` demands a following character).

FIXED: simplified to `/\|/`, which catches every pipe including a trailing one.
The `||` overlap is now deliberate and documented rather than incidental - the
separator spec already forbids `||`.

### MINOR - separator assertion coupled shape to a hardcoded count

`toEqual(Array(steps.length - 1).fill("&&"))` would fail on any legitimate new
`ci` step not mirrored into the local `steps` array, and pointed the failure at
separators rather than at the real cause.

FIXED: split into two assertions - "at least as many separators as the known
steps require" and "every separator is `&&`".

### NIT - TASK.md said "four repo rules configured as warn" and listed three

FIXED: `eslint.config.mjs` configures exactly three; corrected to three.
(AGENTS.md and DECISION.md already said three.)

### NIT - AGENTS.md understated the lint scope and overstated rule uniformity

The `lint` script also covers `playwright.config.ts`, and the warn-level rules
are not uniformly in force: `no-explicit-any` is `off` for `test/`, `e2e/` and
`*.spec.ts`, and `no-console` is `off` for `scripts/**/*.ts`. A reader could
have concluded a `console.log` in a playtest script reddens the gate.

FIXED: both noted in the Conventions bullet.

VERDICT round 1: REQUEST_CHANGES

## Round 2 - 2026-07-30

All six findings addressed as recorded above. Re-verified by re-running the
reviewer's own mutations, since a fix to a guard has to be proven by the attack
it failed:

| mutation | round 1 | round 2 |
|----------|---------|---------|
| `ci` rewired to `npm run lint:fix` | 9 passed (hole) | **2 failed** (`is the script the gate calls`, `includes lint`) |
| workflow's `run: npm run lint` replaced with a bare `npx eslint` | nothing red | **1 failed** (`is the script the CI workflow calls too`) |

Both mutations were applied and restored via scratch copies
(`package.json.bak`, `ci.yml.bak`), never `git checkout`. `git status`
afterwards showed only the intended edits plus the pre-existing untracked
`node_modules`.

Full gate after the fixes: `E2E_PORT=8181 nix develop -c npm run ci` exit **0**
- 21 Jest suites / 323 tests (the +1 is the new workflow assertion), 104
Playwright tests, pipeline `OK`, no lint warning. `tatr check` clean.

VERDICT round 2: APPROVE
