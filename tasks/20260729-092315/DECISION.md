# Decision: First-load info-panel behavior

- STATUS: ACCEPTED
- DATE: 2026-07-29

The task's step 1 names a product fork: on first load (no guess yet) the info
panel should be a closed panel, a collapsed panel, a bottom sheet, or an inline
intro card. These are mutually exclusive - they cannot all occupy the space next
to the tree - so the choice is recorded here rather than inferred while coding.

## Chosen: panel stays CLOSED on first load, on both desktop and mobile

The starting-clade hint card is still **rendered into the panel** on first load;
only the auto-open is dropped. The always-present `.panel-pull` (`#open-panel`,
the `⟡` tab pinned to the top-right of `.game-area`) is the affordance: one tap
reveals the pre-rendered hint with no extra fetch, no re-render, no new UI. The
existing "after a guess the panel auto-opens" behavior is untouched - the fix is
scoped to the `!state.lastGuessId` branch of `renderLastGuess`
(`src/ui/panel.ts`).

Why: the bug is that the panel occupies the play surface before the player has
done anything. On a 390x844 viewport `.info-panel` is `width: 100%` and overlays
`#arena` exactly, so the tree - the primary game surface - is invisible on the
first screen. Not opening it is the whole fix; the tree, the guesses-left box,
the hint box and the input are then the first screen, which is what the story
asks for.

## Same behavior on desktop and mobile (no breakpoint fork)

> SUPERSEDED IN PART (2026-07-29) by `tasks/20260729-141414/DECISION.md`. This
> section's "one rule for both viewports" holds for the PRE-FIRST-GUESS screen it
> was written about, and that part still stands. It does NOT hold after a guess:
> the playtest pass measured desktop reading well with the panel beside the tree
> and a phone losing the tree entirely behind it, so the auto-open that follows a
> guess is now suppressed below 768px. Read that record before citing this one.

Rejected: keeping the auto-open on desktop and suppressing it only on mobile.
Desktop is not actually better off - the panel still dominates the right side
before the player makes a move (task Review Findings) - and a viewport-dependent
open rule pushes the responsive split out of CSS and into JS, where it needs a
matchMedia/width probe, two behaviors, and two sets of tests that can drift.
One rule for both viewports is simpler and matches the observed problem on both.

## Two paths this deliberately does NOT change

Round 1 of the review surfaced both; they are recorded here so a cold reader
does not read the closed panel as a blanket rule.

- **Buying a hint before the first guess** runs through the same
  `!state.lastGuessId` branch. Dropping the auto-open there would spend three
  guesses for no visible card, so `src/game.ts`'s `hintBox` handler now calls
  `openPanel()` itself after `updateUI()`: a hint is an explicit request to see
  something, unlike a page load. Pinned by the "opens when a hint is bought
  before the first guess" e2e test.
- **Reloading mid-game** still auto-opens the panel, because
  `manuallyClosedPanel` is module-level and resets on every load, so a restored
  `state.lastGuessId` reaches the tail `openPanel()` during the first
  `updateUI()`. That is the same "panel over the tree on load" shape as this
  bug, but for a returning player rather than the first screen this task owns,
  and fixing it means distinguishing "render from page load" from "render from a
  fresh guess" - a change to renderLastGuess's contract. Left out of scope on
  purpose and filed as its own task.

## Rejected alternatives

- **Collapsed panel** (a peeking strip of the card): needs a third visual state
  in `.info-panel` CSS plus its own transition, and on mobile a full-width strip
  still eats the bottom of the arena. New UI surface for a bug fix.
- **Bottom sheet**: a genuinely new component (drag affordance, backdrop,
  scroll interaction) and a second card mount point. Out of proportion to the
  defect, and it would still cover the tree when open.
- **Inline intro card** inside the arena: competes with the tree for exactly the
  space this bug is about, and duplicates the card that already exists in the
  panel.

## Consequence for tests

`e2e/mobile.spec.ts` carries a `test.fixme` ("primary surface is not occluded by
the auto-opened panel") left by task 20260729-092258 explicitly blocked on this
task. It flips to a live test here. `e2e/panel.spec.ts` asserted the auto-open
as the first-load state; that expectation is now inverted (closed on load, opens
on tap), and a new assertion pins that the panel still auto-opens after a guess
so this fix cannot silently disable that path too.
