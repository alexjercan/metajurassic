# Retro: Pluralize HINT_COST and MAX_GUESSES prose off the constant

- TASK: 20260804-155041
- BRANCH: fix/plural-constants
- REVIEW ROUNDS: 1

## What went well

Understanding refused TASK.md's site list. The Context named three `HINT_COST`
sites; reading the tree found nine. NOTES.md took the title's scope over the
Context's list and said why, so planning sized the real invariant instead of
three of its instances. Review re-derived the same nine on `master` from the
scan regex, which is why round 1 opened with no scope finding.

The guard is two halves for a stated reason. The `jest.isolateModules` reprice
half is the readable one but cannot reach `buildHowToPlayCard()`'s `innerHTML`
under `testEnvironment: "node"` - and that template held two of the nine
defects. The source scan is what actually covers them. A guard written only in
the readable shape would have shipped the card broken and green.

Red-first was proven per half and per reason, not by one suite run: the scan
named exactly four files, the reprice half failed on "1 guesses" / "1 attempts"
at all four modules, `plural.test.ts` was red on the missing module.

## What went wrong

The fresh sprout worktree had no `node_modules`, so the first `npx jest` exited
red on "Preset ts-jest not found" rather than on the missing `src/plural.ts`.
Red arrived for the wrong reason and briefly read as the intended red phase.
`npm ci` inside `nix develop` fixed it. The decision that failed - trusting a
red exit before reading why it was red - seemed sound because the step's whole
purpose was to be red.

Review's three findings share one root: prose written into code that a task
record already holds. `src/plural.ts:4-8` reproduces DECISION.md's
module-boundary rationale, and `test/constantPlurals.test.ts:6-7` cites the
originating review round by ID. `AGENTS.md` `## Comments` sends both to
"compact to one line plus the pointer" and "archaeology; the record holds it".
Writing the DECISION.md first made the rationale fresh and it went into the
docstring on the way past. All three findings are MINOR/NIT and are left open
at APPROVE.

## What to improve next time

Breadth. The diff is eight production files plus two test files for a
three-line helper, and that is the right size, not a missed split. Nothing here
lands independently: one helper, one invariant, and the whole point of the task
is that a reprice review has exactly one place to look. The four already-correct
sites were folded in for the same reason, decided before work started in
DECISION.md rather than found late.

Churn. Zero. No BLOCKER, no MAJOR, no fix cycle. No plan-time question would
have caught the three comment findings - the from-scratch challenge and the
cold-reader test both operate on the design, and the design was right. What
would have caught them is a pass over `AGENTS.md` `## Comments` on any file that
carries both a docstring and a DECISION.md, which is a checklist item, not a
plan defect.

Context. No threshold crossing, compaction warning, or handoff observed. Review
round 1 was delegated to an out-of-context reviewer as the skill requires; the
recording pass re-derived the nine-hits-on-base claim and re-ran `npm run ci`
independently rather than accepting the report.

## Action items

- Before trusting a red-first run in a fresh sprout worktree, provision the
  toolchain (`npm ci` inside `nix develop`) and read the failure text, not the
  exit code. Submitted to `testing/prove-the-test-can-fail`.
- A guard built on a hand-listed vocabulary covers only the terms that existed
  when it was written. R1.2 stands open: broadening
  `test/constantPlurals.test.ts:35-36` to `[a-zA-Z]+s\b` is green on HEAD today.
  Submitted as `verification/a-listed-vocabulary-guard-misses-later-terms`; the
  existing `verification/a-vocabulary-guard-fails-open` covers only the mirror
  case, a retired vocabulary, and the CLI refuses a body edit on an existing
  lesson.
- R1.1 and R1.3 remain open at APPROVE. Both are comment compaction against
  `AGENTS.md` `## Comments`; neither changes behavior.

## Landing message

```
fix: agree count nouns with the constant they interpolate

Every sentence that interpolated HINT_COST or MAX_GUESSES hardcoded its
noun's plural, so a reprice to 1 would have shipped "costs 1 guesses" across
the FAQ, the board brief, the hint chip, the how-to-play card, the game-over
summaries and the loss share text. Nothing was wrong on screen at the shipped
values and no test guarded it.

New src/plural.ts owns the one/many split as a leaf module, lifted from the
module-private copy in gameOverCopy.ts so the five copy modules that need it
do not have to depend on each other. All nine defect sites route through it,
as do the four that were already correct with an inline ternary.

Two guards: test/plural.test.ts for the helper, and test/constantPlurals.test.ts
in two halves - a recursive src/ scan for the defect shape, which is the only
check that reaches the how-to-play card template, and a reprice to 1 asserting
the exact singular sentences. No shipped sentence moves; no existing test
needed an edit.
```
