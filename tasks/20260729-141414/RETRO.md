# Retro: Keep the tree visible on mobile after a guess

- TASK: 20260729-141414
- DATE: 2026-07-29
- BRANCH: fix/mobile-tree-visible
- REVIEW: APPROVE at round 2 (out-of-context reviewer both rounds)

## What went well

**The fork went to the user with its constraint named, not just its options.**
The panel presentation was a genuine product fork - on a 390px viewport
`.info-panel` is `width: 100%` over `.game-area` and shares `#arena`'s box
exactly, so the card and the tree cannot both be full size. Stating THAT, rather
than offering three presentations and letting the user pick blind, is what made
the choice meaningful; the rejected bottom sheet would have been the wrong answer
for a reason the user could see (it spends the tree's scarcest resource, phone
vertical room, on supporting detail).

**Screenshots caught what the test suite could not.** Two defects came from
looking at the rendered screens rather than from any assertion: the pre-guess
pull tab carrying an amber "unseen" dot and reading "Dinosauria", duplicating the
tree's only node; and the confirmation that the scroll shadow actually appears
under the clipped sentence and moves to the top edge once scrolled. Neither is
expressible as a cheap assertion, and both are exactly the class of defect the
playtest pass exists to find.

**The disputed review finding was checked instead of accepted.** R1.5 claimed the
scroll-shadow covers mismatched the panel background. Reading the stacking
context showed `.museum-card::after` paints opaque `var(--bg-dark)` at `z-index:
1` directly beneath `.museum-card-inner`, so the covers match the CARD, not the
panel. The pushback was written with the file:line evidence and the round 2
reviewer independently agreed. The half of the finding that was right (a
hand-duplicated colour literal) was fixed.

## What went wrong

**The occlusion assertion could not fail, and I wrote the comment that said it
could.** `expectTreeNotOccludedByPanel` used `expect.poll(...).not.toContain(...)`,
which resolves on the FIRST sample satisfying the negation - and `.info-panel`
opens over `transform 0.4s`, so the first sample lands while the panel is still
off-screen. The test that pinned the entire task passed with the fix reverted.
Worse, I reached for polling to explain away a failure I had not yet diagnosed
(the `style-loader` unstyled frame), and wrote a confident comment asserting the
helper still caught the real defect. It did not. Caught by the out-of-context
reviewer, re-derived here by sabotage before being adopted.

**A type error in a test file broke the app bundle, and I misread the symptom.**
`expect.poll`'s `message` option takes a string; I passed a function. The webpack
build type-checks `e2e/` too, so this broke the BUNDLE, the dev-server error
overlay iframe covered the page, and every click-based test timed out. Seeing a
total wipeout I went to the stale-server lesson first (correct instinct, wrong
cause) and only found it by running `tsc --noEmit`.

**The plan reasoned about the auto-open and missed the hint path that depended on
it.** `src/game.ts` opened the panel by hand only when `!state.lastGuessId`,
justified by a comment saying `updateUI()` had already opened it otherwise. That
comment was load-bearing for a path I was changing, and I read `renderLastGuess`
carefully while never re-reading its CALLER's assumptions. A mid-game hint on a
phone therefore spent three guesses for nothing visible. Found in review.

**F3.9 was accepted into the plan without checking it had a solution.** The step
survived from the original task text; once the bottom sheet was rejected there was
nothing left to put in the arena's empty space, so the task could only deliver
half of it. That was recorded honestly rather than quietly shipped, but the
better move was to notice at plan time that this DoD item's fate depended on the
presentation fork and to scope it accordingly.

## Lessons

- `expect.poll(...).not.<matcher>` resolves on the first sample that satisfies
  the negation, so polling a moving element proves nothing. Against anything with
  a CSS transition, wait for it to come to rest and assert ONCE.
- Never reach for polling to make an undiagnosed failure go away. The right
  order is diagnose, then choose the assertion. A comment justifying a
  tolerance you have not verified is worse than no comment.
- When a fix changes an invariant, grep for the CALLERS that documented a
  dependency on it. The comment in `src/game.ts` named the assumption in plain
  English and would have been found by a search for `openPanel`.
- In this repo the webpack build type-checks `e2e/` as well as `src/`, so a type
  error in a TEST file breaks the APP bundle and surfaces as unrelated click
  timeouts against the dev-server error overlay.

## Follow-ups

- `20260729-092327` (onboarding) carries the interim note for the remaining half
  of F3.9: the room below the pre-guess tree, with the constraints it inherits.
- `20260729-125313` (reload auto-open) carries a note that its phone half is
  already fixed here, that its DoD needs narrowing to desktop, and that the
  desktop mid-game-hint behaviour has a test and should not be "fixed".
