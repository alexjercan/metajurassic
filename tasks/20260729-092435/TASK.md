# Run a structured Metajurassic playtest pass

- STATUS: CLOSED
- PRIORITY: 86
- TAGS: ux, gameplay, research
- KIND: TASK
- FLOW STEP: DONE
- PLAN STATUS: APPROVED

## Story

As a game designer/developer, I want a structured playtest pass of the daily and practice loops, so that difficulty, clarity, and pacing are judged from a player's experience instead of implementation assumptions.

## Review Findings

- Desktop looked playable after a short learning period.
- Mobile first-run clarity was weaker because the panel hid the play surface.
- It is not yet clear whether the player can reliably infer what guesses to make from clade feedback, how often hints are useful, or whether 25 guesses and hint cost 3 feel fair.

## Understanding (2026-07-29)

What "done" means here: a durable `NOTES.md` in this folder that answers four
questions with evidence, plus one follow-up task per actionable finding. No UI
change ships from this task.

1. Can a player infer the next guess from clade feedback, and how often is that
   inference actually available on screen?
2. Do 25 guesses and hint cost 3 produce satisfying difficulty across shallow
   and deep clades, and across famous and obscure dinosaurs?
3. Where does the first minute stall - desktop and mobile, daily and practice?
4. Is the session close (win/loss modal -> share -> come back tomorrow) worth
   acting on, and what does that hand to `20260729-101838`?

Constraint that shapes the whole task: **the playtester is an agent, not a
human.** "Where the player hesitates" cannot be measured by an agent, so this
task does not pretend to. It substitutes three instruments that produce real
evidence, and labels every finding in `NOTES.md` by its evidence class:

- `MEASURED` - a number out of the difficulty simulation over the real content
  graph.
- `ON-SCREEN` - something visible or absent in a captured screenshot of the
  real running app.
- `JUDGMENT` - a design opinion. Honest, but not playtest data; a human pass
  can still overturn it.

Assumptions recorded rather than asked:

- "Popularity" is not a field in `src/jurassic/index.json`. It is read as name
  recognition (Tyrannosaurus/Stegosaurus vs Saltriovenator/Xuanhanosaurus) and
  the seeds chosen for walkthroughs are picked to span both ends.
- Step 5 predates the share rewrite (`20260729-101823`), which has since
  LANDED. The share text is therefore evaluated as it is TODAY (closeness grid
  plus real stats), not as the old fabricated-stats version; only
  `20260729-101838` (stats card and countdown) is still downstream of this
  research.

## Steps

- [x] Record the instrument choice (simulation + scripted browser walkthrough +
      labelled judgment, in place of a human playtester) in `DECISION.md`.
- [x] Build `scripts/playtest/difficulty.ts`: a simulation that imports the REAL
      `GameData`/`GameState`/`findNextHintCladeId` from `src/` (no hand-copied
      mirror of the LCA logic) and plays every one of the 150 targets with a
      candidate-set-narrowing strategy, reporting the guess distribution, the
      loss rate at MAX_GUESSES=25, and the guesses a hint saves versus its
      cost of 3.
- [x] Extend the prettier/eslint/tsconfig globs to cover `scripts/**/*.ts` in
      the same change, and note the new directory in AGENTS.md.
- [x] Build `scripts/playtest/walkthrough.ts`: a Playwright script (outside the
      CI gate) that drives the real dev server and captures the first-run,
      mid-game, hint, and game-over screens for daily and seeded practice at a
      desktop and a phone viewport, into a gitignored shots directory.
- [x] Run the walkthrough over several seeds spanning shallow/deep clades and
      famous/obscure species, and read the captured screens for what a
      first-time player can and cannot see at each moment: objective, input,
      autocomplete, tree reading, hint affordance, panel, modal, share.
- [x] Evaluate 25 guesses and hint cost 3 against the simulation numbers, and
      the session close against the captured game-over screens plus the current
      share text.
- [x] Write `NOTES.md`: the four answers, every finding labelled
      MEASURED/ON-SCREEN/JUDGMENT, and an explicit "what a human playtest still
      has to check" section.
- [x] File one tatr task per actionable finding; do not fix anything here.

## Definition of Done

- A playtest notes artifact exists for this task. (cmd: `test -s tasks/20260729-092435/NOTES.md`)
- The instrument choice is recorded. (cmd: `test -s tasks/20260729-092435/DECISION.md`)
- The difficulty simulation runs and reports a distribution over all targets. (cmd: `npx ts-node scripts/playtest/difficulty.ts`)
- The simulation reuses the shipped game logic rather than mirroring it. (cmd: `rg -n "from \"\.\./\.\./src/" scripts/playtest/difficulty.ts`)
- At least desktop and mobile first-run flows are evaluated. (manual: playtest notes include both, citing captured screens)
- At least daily and practice modes are evaluated. (manual: playtest notes include both)
- Every finding carries an evidence label. (manual: inspect notes)
- Follow-up tasks exist for every actionable finding. (manual: compare notes to `tatr ls`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Outcome

`NOTES.md` holds the findings, `DECISION.md` the instrument choice. Headline:
**25 guesses is fine and should not change; the hint is the difficulty defect
(a bad buy at every point measured, ruinous up front); and the biggest gap is
that the game barely supports the clade-to-members deduction it asks for.**

Follow-up tasks filed:

- `20260729-141414` (p92) Keep the tree visible on mobile after a guess
- `20260729-141424` (p88) Rework hint reveal order and price
- `20260729-141425` (p86) Show which species belong to a revealed clade
- `20260729-141427` (p78) Fix autocomplete filtering order and prefix ranking
- `20260729-141428` (p76) Fix game-over modal overflow on phone viewports
- `20260729-141429` (p50) Fix the duplicated word in the share headline
- `20260729-141430` (p30) Normalize typographic punctuation in Jurassic content

Interim evidence notes added to existing tasks: `20260729-092327`,
`20260729-125313`, `20260729-101838`, `20260729-101754`.

## Notes

- This is intentionally a research/playtest task. It should produce decisions and follow-up tasks before broad UI changes.
- Priority raised to 86 on 2026-07-29: this research must run before the onboarding design task (`20260729-092327`), which consumes its conclusions.
- The walkthrough script stays OUT of `e2e/` on purpose: it captures screenshots and asserts nothing, so putting it in the Playwright testDir would add gate time for no signal.
- Screenshots are evidence for this pass, not repository content: the shots directory is gitignored and only `NOTES.md` and the two re-runnable scripts are committed.
