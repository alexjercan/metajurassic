# Retro: structured playtest pass

- TASK: 20260729-092435
- DATE: 2026-07-29
- OUTCOME: research delivered; 7 follow-up tasks filed, 4 existing tasks annotated
- REVIEW: 2 rounds, APPROVE

## What this task actually was

A task written for a human ("record where the player hesitates") handed to an
agent that cannot hesitate. The whole cycle turned on refusing to paper over
that: name the mismatch at the plan gate, pick instruments that produce real
evidence, and label every claim by what kind of evidence stands behind it.

## What went well

**Surfacing the instrument fork at the gate rather than inferring a shape.** The
plan presentation named three candidate shapes - narrate a playthrough as if
player (fiction), build the tools and hand the human a script (no findings now),
or measure/observe/label (chosen) - and said plainly which questions each one
could not answer. The user answered "yes, build this - can be automated", which
is a decision, not a guess. `DECISION.md` records it.

**Importing the shipped logic instead of mirroring it.** The simulation pulls
`computeLCA`, `lineage`, `GameState` and `findNextHintCladeId` from `src/`, so
it measures the game that ships. The ledger's
[[hand-copied-logic-mirrors-rot-update-them-in-the-same-change]] was read before
starting and directly shaped the design; the reviewer specifically verified this
and confirmed the model is the exact consistency test, not an approximation.

**The instruments found things reading the code would not have.** The hint's
top-down walk is visible in `findNextHintCladeId` if you stare at it, but "3
guesses to go from 150 candidates to 99, and hinting to the target's own clade
costs a median of 27 against a 25-guess budget" only exists once something plays
150 rounds. Likewise the mobile modal clipping and the total panel occlusion
after guess 1 are invisible in a diff and obvious in a screenshot.

**Both review MAJORs were fixed by getting more evidence, not less claim.** The
tempting response to "you only measured hints bought up front" was to reword the
sentence. Instead a mid-round hint policy went into the simulation and the claim
was re-derived. That turned a defensible-but-narrow finding into a better one -
it surfaced that a late hint for a weak player is near break-even and cuts the
loss rate 5.8% -> 4.6%, which the original framing would have hidden.

## What went wrong

**Two claims shipped broader than their evidence, and both were mine to catch.**

1. "No surface maps a clade to its member species" - I enumerated three surfaces
   and stopped, never checking `src/species.ts`, which lists all 150 species
   with their clade. I had even read `src/clades.ts` in the same breath and did
   not open its sibling.
2. "It is never correct to buy a hint" - I measured hints bought before the
   first guess and generalised to all hints, when the mechanism I had just
   documented (the hint reveals one level below the *deepest revealed* clade)
   says plainly that a mid-round hint is different.

Both were labelled MEASURED. That is precisely the failure `DECISION.md` was
written to prevent, which makes it worse, not better: the labelling scheme
existed and I still put an inference under a label reserved for measurement.

**A degenerate policy nearly became a finding.** The first hint section had the
simulated player buy a hint every loop iteration while candidates exceeded a
threshold, producing 26-66% loss rates. Read carelessly, "hints cause you to
lose two thirds of your rounds" was right there. It was caught because the
number was too dramatic to believe, which is luck dressed up as judgement.

**Three avoidable gate failures.** `scripts/` was not in the prettier/eslint
globs (the ledger has a lesson for exactly this, and I applied it to tsconfig
and package.json but only after the first red), and a `!` assertion tripped a
lint rule.

## What to do differently

1. **When enumerating what a codebase does NOT have, enumerate from the
   filesystem, not from memory.** "No surface does X" is an absence claim, and
   absence claims need a listing (`ls src/*.ts`), not a recollection of the
   files already opened. Same family as the ledger's
   [[absence-proving-greps-must-be-run-when-written]].
2. **A measurement licenses a claim only over the parameter range it swept.** If
   the instrument varies one knob (hints bought at t=0), the claim must name
   that knob. Generalising past it is inference wearing a MEASURED label.
3. **Distrust a dramatic simulation result before reporting it.** A number that
   would be a headline is the one most likely to be measuring the harness. Trace
   one concrete case by hand first - the Tyrannosaurus hint trace is what turned
   a suspicious aggregate into a finding worth trusting.

## Numbers

- 2 instruments, 949 lines of new script
- 150 targets x 20 trials x 4 policies, plus 8 hint configurations
- 8 screens captured across 2 viewports, 4 scenarios
- 2 review rounds, 2 MAJOR + 5 MINOR + 8 NIT findings, all addressed
- `npm run ci`: 179 Jest, 28 Playwright, green
