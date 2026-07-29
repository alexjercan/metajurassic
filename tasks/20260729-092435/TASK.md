# Run a structured Metajurassic playtest pass

- STATUS: OPEN
- PRIORITY: 86
- TAGS: ux, gameplay, research

## Story

As a game designer/developer, I want a structured playtest pass of the daily and practice loops, so that difficulty, clarity, and pacing are judged from a player's experience instead of implementation assumptions.

## Review Findings

- Desktop looked playable after a short learning period.
- Mobile first-run clarity was weaker because the panel hid the play surface.
- It is not yet clear whether the player can reliably infer what guesses to make from clade feedback, how often hints are useful, or whether 25 guesses and hint cost 3 feel fair.

## Steps

- [ ] Define a small playtest script for first-time desktop, first-time mobile, returning daily player, and practice player.
- [ ] Play through several deterministic targets with different clade depths and popularity levels, using the seed mode from `20260729-101819` so runs are scriptable and repeatable.
- [ ] Record where the player hesitates: objective, input, autocomplete, tree reading, hint use, panel use, win/loss modal, share/practice next step.
- [ ] Evaluate whether 25 guesses and hint cost 3 produce satisfying difficulty across easy and obscure dinosaurs.
- [ ] Evaluate the session close as a player: would I paste the share message anywhere, and is there a reason to come back tomorrow? Feed conclusions into `20260729-101823` (share rewrite) and `20260729-101838` (stats card and countdown).
- [ ] File separate implementation tasks for concrete issues found, rather than widening this research task into fixes.
- [ ] Summarize the findings in a durable artifact in this task folder.

## Definition of Done

- A playtest notes artifact exists for this task. (cmd: `test -s tasks/20260729-092435/NOTES.md`)
- At least desktop and mobile first-run flows are evaluated. (manual: playtest notes include both)
- At least daily and practice modes are evaluated. (manual: playtest notes include both)
- Follow-up tasks exist for every actionable finding. (manual: compare notes to `tatr ls`)

## Notes

- This is intentionally a research/playtest task. It should produce decisions and follow-up tasks before broad UI changes.
- Priority raised to 86 on 2026-07-29: this research must run before the onboarding design task (`20260729-092327`), which consumes its conclusions.
