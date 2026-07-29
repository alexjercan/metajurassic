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
- [ ] Clarify hint affordance text or tooltip so players know what spending 3
      guesses does. There is now a GUARANTEE worth stating: since
      `20260729-141424` a hint reveals a clade that cuts the still-possible
      species by at least half (`HINT_SPLIT_FRACTION`). Two caveats for the
      wording: on ~19% of presses no clade meets the threshold and the hint
      falls back to the best available cut, which narrows LESS than half - so
      "always halves the field" would be a lie; and the hint is deliberately a
      bad deal for a player who can read the tree (it costs them +2.2 guesses),
      so the copy should read as a rescue, not as an edge. This task owns the
      string; `20260729-141424` deliberately left it alone.
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

## Interim note from `20260729-141414` (2026-07-29)

That task fixed the phone panel occlusion and, as its share of playtest finding
F3.9, anchored the pre-guess tree to the TOP of the arena instead of letting it
float between two blank bands. It could go no further: with the bottom-sheet
presentation rejected (`tasks/20260729-141414/DECISION.md`), it had no content to
put in the space and deliberately did not invent any.

So the room below the pre-guess tree on a phone is now a single contiguous empty
band, and it is THIS task's to fill. Two constraints it inherits:

- The space is below the tree and above the input, inside `#arena` (which
  scrolls). Guidance placed there grows downward as the tree does, so it must
  tolerate being pushed off-screen mid-game rather than assuming it stays put.
- The `#open-panel` pull tab now sits at the top-right of `.game-area` carrying a
  text label and an "unseen card" dot. It is the established affordance for "there
  is something to read"; new guidance should not introduce a second, competing one.

## Metazooa reference (2026-07-29, from `20260729-092452`)

The alignment pass captured the live game at <https://metazooa.com>; full
context and capture commands in `tasks/20260729-092452/NOTES.md`. Three things
bear directly on this task.

- REFERENCE, the hint string to beat, verbatim: **"Need a hint? Exchange 3
  guesses to reveal a rank!"** Metazooa charges the same 3 guesses and states
  its product; Metajurassic's chip states only its price. That is the whole
  captured fact, and it is enough for this task: the copy is what lags.
- JUDGMENT, kept separate because it is inference and not capture: Metajurassic
  probably has the better mechanic at that price. Which rank Metazooa reveals is
  NOT observable - its hint resolves server-side and no selection rule appears
  in the client bundles - so "Metazooa advances exactly one rank, including
  rungs that narrow nothing" is read off the offer string. On this side, the
  reveal is ALSO top-down (that order never changed); what `20260729-141424`
  rejected was the one-level-per-hint walk, replaced by "shallowest clade that
  cuts the field to at most `HINT_SPLIT_FRACTION`". Do not let copy imply
  Metajurassic hints differ from Metazooa's in DIRECTION - they differ in which
  rungs get skipped. The caveats already recorded above (the ~19% fallback that
  narrows less than half, and "rescue, not edge") still bound the wording.
- REFERENCE, and it changes the shape of the onboarding fork: Metazooa's rules
  are NOT in its FAQ. Its `/faq` is four content questions (how animals were
  chosen, taxonomy disagreements, no Reptilia, privacy); the goal, the
  rank-narrowing rule, a worked example tree and the guess budget all live on
  the home page you pass through before "Enter the zoo!". Metajurassic's `/` IS
  the board and its rules are in the footer FAQ - the one place the reference
  deliberately avoids. The alignment note recommends AGAINST copying the
  interstitial (`NOTES.md` section 5), which puts the whole explanation in-board.
  That is a load-bearing artifact fork - in-board guidance versus a pre-board
  page - and it must be confirmed with the user and recorded in a `DECISION.md`
  before anything is built, not inferred from this note.
- FALSIFIED, so this task does not owe it: "the game should describe each guess
  result in words" is not a Metazooa expectation. The reference game's message
  line never mentions the guess - its entire vocabulary is "Guess any species to
  begin!", "Enter your next guess.", the win line and "No more guesses." The
  tree is the whole feedback surface there too. Narration may still help a first
  timer, but it has to be argued on its own merits rather than as parity.
