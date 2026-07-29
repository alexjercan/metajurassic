# Improve in-game onboarding and hint clarity

- STATUS: CLOSED
- PRIORITY: 82
- TAGS: feature, ux, gameplay

## Story

As a first-time player, I want the game to explain just enough of the guessing loop in context, so that I can play without reading the FAQ before my first guess.

## Review Findings

- The core mechanic is good, but the player must infer that the clade tree is distance feedback.
- The hint button says `Hint: Cost 3 Guesses`, but it does not explain what kind of hint will be revealed or why it is worth spending guesses.
- The FAQ explains the mechanics, but the playable screen has too little just-in-time guidance.

## Steps

The two load-bearing artifact forks (in-board brief vs interstitial; the hint
string) were confirmed with the user on 2026-07-29 and recorded in `DECISION.md`
next to this file. These steps build the chosen shapes.

- [x] Add `src/ui/onboarding.ts` building the pre-guess **brief**, and mount it
      in `src/index.html` inside `#arena`, AFTER `#tree-container` - the empty
      band `20260729-141414` left. Practice reuses this same template
      (`webpack.config.js:32`), so both boards get it from one change.
- [x] Write the brief copy: the objective, what the `?` node is, that a guess
      joins the tree at the shared clade and deeper means closer, and the guess
      budget. Four short lines, not a tutorial. The budget number comes from
      `MAX_GUESSES`, never typed into markup.
- [x] Gate the brief in `updateUI()` on `state.numberOfGuesses() === 0`, so it
      is present at the top of every round and gone once play starts. No
      storage flag, no dismiss control - see `DECISION.md`.
- [x] Add a `How to play` control inside the brief that renders a how-to-play
      card into the existing `.info-panel` and opens it. Reuse the panel and the
      `#open-panel` pull tab; introduce NO second "there is something to read"
      affordance (`20260729-141414/DECISION.md`).
- [x] CSS for the brief on both viewports: it lives in the scrolling arena below
      the tree, must never overlap the tree or the input, and must not disturb
      the narrow-viewport top anchor of the pre-guess tree (`style.css` `.arena`
      `padding-top: 56px`, playtest F3.9).
- [x] Hint chip copy -> `Stuck?` / `Spend <HINT_COST> guesses to reveal a clade`.
      Drive `#hint-text` from TS in BOTH branches of `updateHintButton`
      (playable and the game-over Practice link), read the cost from
      `HINT_COST`, and delete the hardcoded `Cost 3 Guesses` from
      `src/index.html`. Rationale and the rejected wordings are in `DECISION.md`;
      the copy must not claim the hint halves the field, because on ~19% of
      presses the fallback branch narrows less.
- [x] Constrain the hint chip's width so the longer string wraps INSIDE the chip
      instead of growing `.top-bar` into an extra wrapped row on a phone. An
      always-on top-bar line is the shape the user explicitly rejected; this copy
      change must not smuggle its cost back in.
- [x] Replace the `alert()` in `submitGuess` (`src/game.ts:98`) with an inline
      error near the input in `.bottom-bar`, announced with `aria-live`, cleared
      on the next successful guess and on further typing. The share-failure
      `alert()` (`src/game.ts:278`) is deliberately OUT of scope: different
      surface, different task.
- [x] Update `e2e/helpers.ts` in the SAME change. Its `guessFirstSuggestion`
      comment block documents the raw-text path raising an alert that Playwright
      auto-dismisses - an invariant this step removes. Re-read that helper's
      stated assumptions and correct them
      (`LESSONS.md`: `when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies`).
- [x] Keep the FAQ as the deeper reference, and check its answers still agree
      with the board: `How do I play?` and `What does the tree show?` against the
      new brief copy, and the info-panel answer against the phone behaviour
      `20260729-141414` changed. Bounded to consistency, not a rewrite.
- [x] E2E coverage on both projects (Desktop Chrome and Pixel 5), plus a Jest
      test over the brief copy so the `MAX_GUESSES` wiring is pinned without a
      browser.

## Definition of Done

- Before the first guess, the board states the objective, what `?` is, that the
  tree is distance feedback, and the budget. (test: browser E2E on desktop and
  Pixel 5 asserting the brief is visible pre-guess and carries all four facts)
- The brief fills the band below the pre-guess tree and never overlaps the tree
  or the input; it is gone once the round is underway. (test: browser E2E
  bounding-box non-overlap on both projects, plus absence after guess 1)
- The hint chip names its product and its price, and the price is derived from
  `HINT_COST` rather than copied into markup. (test: browser E2E asserts the
  chip reads `Stuck?` / `Spend 3 guesses to reveal a clade`; cmd:
  `grep -rn "3 Guesses" src/*.html` returns nothing - executed at plan time and
  currently returns exactly the one line this task deletes)
- Naming the hint's product does not cost the phone board an extra top-bar row,
  and the whole chip stays on screen. (test: browser E2E at 393px, 360px and
  320px asserting the counter and the chip share a row, the chip's right edge is
  inside the viewport, and `#hint-text` is not clipped inside the chip)
- An invalid guess is reported inline near the input with no browser dialog.
  (test: browser E2E asserting a `page.on("dialog")` listener never fires and
  the inline error is visible; cmd:
  `grep -cE "^[[:space:]]*alert\(" src/game.ts` returns `1`, the out-of-scope
  share alert)

  NARROWED during work, with the reason, per `LESSONS.md`
  `absence-proving-greps-must-be-run-when-written`. The plan-time form was
  `grep -c "alert("`, which returns `2` here - but the second hit is the COMMENT
  explaining why the alert was removed, not a call. Anchoring on start-of-line
  counts call sites only, and it still discriminates: it returns `2` on
  `git show master:src/game.ts` and `1` on this branch.
- `npm run ci` passes. (cmd: `npm run ci`)

## Implementation notes (2026-07-29)

What was built is in `DECISION.md`; these are the changes a reviewer would
otherwise read as drive-by, each with the reason it could not be left out.

- **The brief is mounted OUTSIDE `#arena`**, as a flex sibling after it inside
  `#arena-wrapper` - which the Steps above do not say, because they were written
  before review round 1 found the problem and are left as written. Inside the
  arena the brief was subject to `overflow: auto` and its height competed with
  the tree's for a fixed arena height. It lost: 13px of it was sliced off at
  1440x660, 20px at 1366x600, and at the one size the suite tested (1280x720)
  the slack was exactly 0px, so merely showing `#input-error` - this task's own
  new element - pushed the arena into 30px of overflow. As a sibling the brief
  takes its natural height and the arena yields the room. Verified at four
  desktop sizes plus the inline-error case, all now pinned in
  `e2e/onboarding.spec.ts`.
- **`playwright.config.ts` takes an `E2E_PORT` override.** A webpack dev server
  from the MAIN checkout was already bound to 8080, and
  `reuseExistingServer: !CI` means Playwright ATTACHES to it rather than
  starting its own - so this branch's suite would have tested master
  (`LESSONS.md`: `a-stale-dev-server-on-8080-makes-e2e-test-the-wrong-app`).
  Killing a server belonging to the user's checkout was not mine to do; the
  override is the remedy that lesson already prescribes. The default is
  unchanged, so CI is unaffected. This branch's runs used `E2E_PORT=8181`.
- **`.top-bar` gained `box-sizing: border-box`.** It was `width: 100%` PLUS
  24px of padding, i.e. 24px wider than a 393px phone viewport, for as long as
  it has existed. Harmless while the chips were small enough to sit inside the
  overflow; the moment the hint chip named its product, the chip was clipped by
  the screen edge. Found by LOOKING at a screenshot - the top-bar HEIGHT test
  was green throughout, because a chip that escapes sideways does not make the
  bar taller. Pinned now by "the whole hint chip is on screen", which was
  verified to fail (by exactly 12px) with the fix reverted.
- **The two `makeGuess` rejection messages were reworded.** They were written
  as internal diagnostics (`Species "X" not found in game data`) because they
  only ever surfaced through an `alert()`. This task puts them on the board, so
  they now say what the player did and what to do next.
- **One FAQ answer was corrected**, not rewritten: "What is the info panel on
  the right?" still claimed the panel is on the right and opens automatically
  after every guess, both of which `20260729-141414` made false on a phone.
- **`.hint-text span` is no longer uppercase.** Uppercase plus 1px tracking runs
  the sentence ~25% wider, which wrapped it to a second line and pushed
  `.hint-box` past its 52px `min-height`, growing the top bar to 77px. Set as a
  sentence it fits on one line at 393px, where the bar measures 68px - the exact
  pre-change baseline.

  That number is licensed ONLY at 393px, and the first draft of this note
  claimed it generally ("cost the phone board nothing"). Round 1 caught the
  over-claim and re-measuring confirmed it: at 360px and 320px the sentence
  still wraps and the bar runs a few px taller than master's 68px. So the
  guarantee this task actually holds is the one the design cares about - the top
  bar stays ONE ROW, and the whole chip stays on screen - and that is what the
  E2E now asserts, at 393/360/320px, instead of a pixel count at one width.
  `LESSONS.md`: `a-measurement-licenses-a-claim-only-over-the-range-it-swept`.

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

## Flow State

- FLOW STEP: DONE
- PLAN STATUS: APPROVED
