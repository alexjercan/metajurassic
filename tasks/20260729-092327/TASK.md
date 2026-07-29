# Improve in-game onboarding and hint clarity

- STATUS: OPEN
- PRIORITY: 82
- TAGS: feature, ux, gameplay

## Story

As a first-time player, I want the game to explain just enough of the guessing loop in context, so that I can play without reading the FAQ before my first guess.

## Review Findings

- The core mechanic is good, but the player must infer that the clade tree is distance feedback.
- The hint button says `Hint: Cost 3 Guesses`, but it does not explain what kind of hint will be revealed or why it is worth spending guesses.
- The FAQ explains the mechanics, but the playable screen has too little just-in-time guidance.

## Steps

- [ ] Identify the smallest in-game onboarding surface that does not turn the game into a landing page.
- [ ] Add concise first-run or always-available guidance for the objective, the `?` node, clade feedback, and guesses-left budget.
- [ ] Clarify hint affordance text or tooltip so players know what spending 3 guesses does.
- [ ] Ensure the guidance is accessible on mobile and desktop without occluding the tree/input loop.
- [ ] Keep the FAQ as deeper reference, but make the first play understandable without it.
- [ ] Replace the `alert()` error feedback for invalid guesses with inline UI near the input (`src/game.ts:81`); a browser alert breaks the game feel.
- [ ] Add E2E coverage for the onboarding/hint affordance shape.

## Definition of Done

- A new player can see the objective and basic rule loop from the playable screen. (manual: playtest the first minute without opening FAQ)
- Hint affordance makes clear that it reveals a useful clade and costs guesses. (manual: inspect desktop and mobile)
- The guidance does not cover or resize the input/tree in an incoherent way. (test: browser E2E mobile and desktop layout tests)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Avoid verbose tutorial copy. The game should still feel like a game screen, not documentation.
- Coordinate with the first-run mobile panel task so the two designs do not fight each other.
- Do this after the playtest (`20260729-092435`) and Metazooa-alignment (`20260729-092452`) research tasks; they produce the decisions this task consumes. Priorities were reordered accordingly on 2026-07-29.

## Playtest evidence (2026-07-29, from `20260729-092435`)

Interim notes from the playtest pass. All ON-SCREEN unless labelled otherwise;
full context in `tasks/20260729-092435/NOTES.md`.

- The first screen never states the objective. It is a "Guesses Left: 25" chip, a "HINT: COST 3 GUESSES" chip, the word "Dinosauria" over a dashed red `?`, and an input placeholder "Enter a dinosaur...". Nothing says what winning is, what the `?` means, or that the tree is feedback. FAQ is a small grey footer link. (`01-first-screen-desktop.png`)
- The hint chip states its price and never its product, confirming this task's review finding verbatim: it reads exactly `HINT: COST 3 GUESSES`.
- MEASURED, and it sharpens the hint copy problem: the hint is currently a bad buy at any moment (each one costs 3 guesses and saves ~0.5-1.0). Copy that sells the hint before `20260729-141424` reprices it would be selling a trap. Sequence this task after that one.
- The single largest onboarding gap is not copy at all: no surface in the game maps a clade name to its member species, so the deduction the game asks for is unsupported. Filed as `20260729-141425`; that decision constrains what this task's guidance should say.
- On a phone the panel hides the tree from the first guess onward (filed as `20260729-141414`), so any guidance added here must not compete for the same space.
