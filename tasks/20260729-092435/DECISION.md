# DECISION: how to playtest without a human playtester

- STATUS: ACCEPTED
- DATE: 2026-07-29
- TASK: 20260729-092435

## Context

The task is written for a human: "record where the player hesitates" across
first-run desktop, first-run mobile, returning daily, and practice. The agent
running it is not a human and cannot feel hesitation, cannot forget the
taxonomy between guesses, and cannot be surprised by a screen.

Three shapes were available, and they are mutually exclusive in what the
resulting `NOTES.md` is allowed to claim:

1. **Agent narrates a playthrough as if it were a player.** Cheap, reads like a
   playtest, and is fiction. Its "the player hesitates here" lines are
   indistinguishable from the implementation assumptions this task exists to
   replace. Rejected.
2. **Agent builds the instruments and hands the human a script to run.** Honest,
   but delivers no findings now, and the downstream tasks
   (`20260729-092327` onboarding, `20260729-101838` stats card) are blocked on
   conclusions, not on tooling.
3. **Agent measures what is measurable, observes what is renderable, and labels
   the rest as opinion.** Delivers findings now, and is explicit about which
   ones a human pass could still overturn.

The user was shown this fork at the plan gate and chose 3 ("yes, build this -
can be automated").

## Decision

Build two instruments and label every finding by evidence class.

**Instrument A: `scripts/playtest/difficulty.ts`.** A simulation that imports
the shipped `buildGameData`, `GameData.computeLCA`, `GameData.lineage`,
`GameState`, `findNextHintCladeId`, `MAX_GUESSES` and `HINT_COST` from `src/`
and plays every target in the real `src/jurassic/index.json`. It must NOT
re-implement the LCA or hint logic: a hand-copied mirror rots against the
original (LESSONS.md `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`),
and a simulation that disagrees with the shipped rules measures a game nobody
plays. Only the player POLICIES and the PRNG are new code, because they do not
exist in `src/`.

**Instrument B: `scripts/playtest/walkthrough.ts`.** A Playwright script that
drives the real dev server and captures the screens a first-time player
actually meets, at a desktop and a phone viewport, for daily and for seeded
practice. It asserts nothing; its output is images that get read.

**Evidence classes**, mandatory on every finding in `NOTES.md`:

- `MEASURED` - a number from instrument A over the real content graph.
- `ON-SCREEN` - present or absent in a screen captured by instrument B, or in
  the markup/source that renders it.
- `JUDGMENT` - design opinion. Not playtest data.

`NOTES.md` closes with an explicit list of what a human pass still has to
check, so the labelling is load-bearing rather than decorative.

## Consequences

- The difficulty numbers are a **skill ceiling, not a typical player**. Both
  simulated policies maintain a perfect consistent-candidate set, which
  requires knowing every species' clade membership by heart. Their guess counts
  are therefore a FLOOR on what a human needs, and the gap between the floor
  and 25 is the real headroom question.
- Instrument B goes in `scripts/playtest/`, not `e2e/`. It captures screenshots
  and asserts nothing, so inside Playwright's `testDir` it would add gate time
  for zero signal.
- `scripts/` stops being Python-only, so the prettier, eslint and tsconfig
  globs get `scripts/**/*.ts` in the same change (LESSONS.md
  `new-source-dir-needs-toolchain-globs-in-the-same-change`), plus an eslint
  override letting these two files use `console.log` - printing the report IS
  their purpose.
- Screenshots are evidence for this pass, not repository content: the shots
  directory is gitignored. The two scripts are committed so any later session
  (or the user) can re-run the pass and get the same numbers and the same
  screens.
