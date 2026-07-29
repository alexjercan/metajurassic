# Align Metajurassic flow with Metazooa expectations

- STATUS: OPEN
- PRIORITY: 84
- TAGS: ux, gameplay, design

## Story

As a player who understands Metazooa-style taxonomy guessing, I want Metajurassic to preserve the familiar feedback loop while still feeling like its own polished dinosaur game.

## Review Findings

- Mechanically, Metajurassic is close enough to Metazooa: guesses reveal taxonomic/clade relationships to narrow the target.
- Visually and structurally, Metajurassic has become a richer museum-card game with profile stats, archives, hints, practice, and share.
- That richer UI is good, but it can obscure the simple Metazooa-like loop if the tree is not the primary feedback surface.

## Steps

- [ ] Compare the current Metajurassic first minute against the local `~/personal/metazooa` helper page and the expected Metazooa mental model.
- [ ] Identify which Metazooa-like affordances should be preserved: direct guessing, clear relationship feedback, simple next guess reasoning, and low-friction repeat attempts.
- [ ] Identify which Metajurassic-specific affordances should stay: museum cards, dinosaur imagery, profile collection, practice, hints, and sharing.
- [ ] Decide what should be prominent on the first screen versus secondary behind panel/archive/profile surfaces.
- [ ] Compare the end-of-game ritual and share loop too: Metazooa-family games close with a stats moment, a countdown to the next puzzle, and a share grid that tells the story of the round; Metajurassic currently has none of the three. Feed conclusions into `20260729-101823` and `20260729-101838`.
- [ ] Record a short design decision or notes artifact before implementing UI changes.
- [ ] Create follow-up implementation tasks for any concrete alignment changes.

## Definition of Done

- A comparison note or decision exists in this task folder. (cmd: `test -s tasks/20260729-092452/NOTES.md || test -s tasks/20260729-092452/DECISION.md`)
- The note names the core loop Metajurassic must preserve. (manual: inspect notes)
- The note lists concrete UI priorities for first screen, after first guess, and game over. (manual: inspect notes)
- Any implementation work is split into follow-up tasks. (manual: inspect `tatr ls`)

## Notes

- This task is about product direction and prioritization, not copying Metazooa's visual design.
- The out-of-context review's direction call, to be validated or overturned here: keep the tree as the primary feedback surface and the museum-card collection as the game's own identity layer; the gap versus Metazooa is retention polish (share, ritual), not the core loop.
- Priority raised to 84 on 2026-07-29: run this research before the onboarding design task (`20260729-092327`).
