# Retro: Make the coverage gate see untested src modules

- TASK: 20260804-140413
- BRANCH: chore/coverage-gate-src-roots
- REVIEW ROUNDS: 1

## What went well

Planning probed the post-change numbers on the base branch with CLI overrides
(`--roots test --roots src` plus the four planned exclusions) before any edit
landed. So the implementation wrote measured values into the config comments
instead of predicted ones, and the "floors need no re-baselining" claim was
known-safe at plan time rather than discovered at CI time. Zero review rework
followed: round 1 approved with no BLOCKER or MAJOR.

Planning also caught its own contradiction. TASK.md's original first DoD proof
asserted `src/game/index.ts` appears in the coverage summary, which presumes the
`src/game/**` modules stay in the gate - mutually exclusive with the exclusion
the same plan recommended. NOTES.md raised it as an open question and
DECISION.md settled it, rewriting the proof to assert the one thing the task
actually changes: whether jest looks under `src/` at all.

The review went beyond the DoD and probed the Story directly - a throwaway
untested `src/` module reports at 0% on the branch and is absent on master.
That is the user-facing claim; no DoD proof stated it in that form.

## What went wrong

Two small factual slips, both of the same shape: a figure or clause was written
once and copied forward without being recounted against the artifact.

- "Four negative globs" appears in Step 2, in NOTES.md ("6 entries -> 10"), and
  again in the TASK.md close-out. The change adds six (`!src/game/**`,
  `!src/profile/**`, and four page entry points), taking `collectCoverageFrom`
  from 6 entries to 12. Nobody recounted at any of the three copy points. It
  seemed sound because the plan's own prose asserted the count authoritatively
  and the list beside it was easy to read as two groups rather than six lines.
- The `roots` comment was rewritten wholesale rather than compacted, which
  dropped master's `See tasks/20260804-140413/.` record pointer.
  `AGENTS.md:139` lists a record pointer as a keep and `AGENTS.md:146` says
  DECISION.md rationale compacts to one line plus the pointer. Rewriting for
  accuracy is exactly when a keep-category clause is easiest to lose, because
  attention is on the sentence that became wrong.

Both were caught in review as MINOR/NIT and neither blocks the gate. They are
open at landing.

## What to improve next time

- Breadth: not a breadth question. One config file, 26 lines, matching the plan
  exactly. No split was missed.
- Churn: no review rework to prevent. The plan's from-scratch challenge did its
  job - the alternatives table in DECISION.md priced keeping the 12 modules and
  testing them, and the review independently re-derived that nothing measured on
  master became newly excluded.
- Context: no observed pressure. No checkpoint, no compaction warning, no
  handoff, no delegation beyond the mandatory round-1 reviewer.

The transferable habit: when a comment is rewritten because part of it became
false, diff the old and new clause-by-clause and re-check each dropped clause
against the keep/discard table, rather than composing the replacement fresh.
And when a plan states a count of things it also lists, recount from the list at
each point the count is restated.

## Action items

- Open MINOR from review round 1, unfixed and the human's call at the landing
  gate: add one line to the negative-glob group in `jest.config.js`, e.g.
  `// Exclusions decided per module: tasks/20260804-140413/DECISION.md`.
- Open NIT, same disposition: the close-out's "four negative globs" should read
  "six".

## Knowledge

Both slips already had a lesson in the central repository, so neither warranted
a new one - bumped with this task's provenance instead:

- `docs/an-edited-comment-inherits-its-old-form` - previously recorded the
  marker-survives-a-body-swap case from `20260730-120401`; this task is its
  inverse, a wholesale rewrite dropping a keep-category clause.
- `docs/a-count-in-prose-shares-no-token-with-its-subject` - the "four negative
  globs" miscount is its copied-between-records case exactly.

## Landing message

```
chore: make the coverage gate see untested src modules

`jest.config.js` set `collectCoverageFrom: ["src/**/*.ts", ...]` but
`roots: ["<rootDir>/test"]`, and jest only instruments files it finds under
`roots`. So a `src/` module no test imported was absent from the report
rather than listed at 0%, and the coverage floors were computed over
"whatever the tests happen to import" instead of the stated globs.

Adds `<rootDir>/src` to `roots` for coverage discovery only - nothing under
`src/` matches `testMatch`, so suite discovery is unchanged at 32 suites.
That newly exposes 12 DOM modules at 0%; all are page entry points or DOM
components with no pure core to split out, so they are excluded explicitly
alongside the existing `src/ui/**` exclusion rather than dragging the floors
down. See tasks/20260804-140413/DECISION.md.

The measured set stays at the 21 baseline files and the totals are
unchanged, so the floors keep their values; only the stale `// Current:`
figures beside them are refreshed to 81.83 / 99.31 / 98.22 / 95.39.
```
