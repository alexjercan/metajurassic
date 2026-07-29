# Decision: phone info-panel behaviour after a guess

- STATUS: ACCEPTED
- DATE: 2026-07-29

The task's step 1 names a product fork: from guess 1 onward `renderLastGuess`
calls `openPanel()`, and on a phone `.info-panel` is `width: 100%` and absolutely
positioned over `.game-area`, so it and `#arena` occupy the SAME box. The card
and the tree therefore cannot both be full size on a 390px viewport. Any fix
gives one of them up, which makes the candidates mutually exclusive
presentations rather than tweaks. The choice is recorded here rather than
inferred while coding.

## Chosen: no auto-open on narrow viewports, plus a labelled pull tab

On viewports at or below the existing `768px` CSS breakpoint, `renderLastGuess`
does NOT call `openPanel()` after a guess. The card is still rendered into the
panel, exactly as the first-load fix (`20260729-092315`) already does, so the
tree stays the whole screen and the feedback the player just paid a guess for is
what they see.

Because the card no longer appears by itself, the affordance has to announce it.
The `#open-panel` pull tab stops being an unlabelled `⟡` clipped by the viewport
edge (F3.3) and becomes a real control: fully inside the viewport, carrying a
text label, and when a card is rendered but unseen it names the clade just
revealed and carries an unseen marker. Tapping it opens the panel and clears the
marker.

Why: the tree IS the feedback surface. The card is supporting detail, and a
player who wants the detail can ask for it in one tap; a player who does not
should not lose the whole screen to it. This keeps the tree at full size on the
viewport where vertical room is scarcest.

## This deliberately reverses the "no breakpoint fork" of 20260729-092315

That decision rejected a viewport-dependent open rule, on the grounds that
desktop was no better off and that one rule for both viewports is simpler. That
reasoning held for the PRE-FIRST-GUESS screen it was about: before the player has
done anything, the panel is unwanted on both viewports.

After a guess the two viewports genuinely differ, and the playtest measured it:
on desktop the panel sits BESIDE the tree and the screen reads well (F3.4,
`04-after-hint-desktop.png`); on a phone it covers the tree completely (F3.5,
`03-after-first-guess-mobile.png` shows the Cerapoda card and no tree at all).
The viewport difference is now the actual product difference, so the fork belongs
in the code. Desktop keeps its auto-open unchanged.

The cost accepted here is the one that decision warned about: the responsive
split now lives partly in JS. It is bounded to a single
`matchMedia("(max-width: 768px)")` query that mirrors the `@media (max-width:
768px)` block in `src/style.css`. Drift between those two numbers is the failure
mode, so the query lives in one named constant with a comment pointing at the
stylesheet, and the mobile E2E project (Pixel 5, 393px) pins the behaviour on the
phone side while `e2e/panel.spec.ts` (Desktop Chrome) pins that desktop still
auto-opens.

## An explicit request still opens the panel, on every viewport

Suppressing the auto-open is about UNREQUESTED cards. These paths are the player
asking to see something, and they still open the panel on a phone:

- tapping a node in the tree (`src/game.ts`, `renderTree`'s `onSelect`);
- tapping the pull tab itself;
- buying a hint before the first guess, on any viewport;
- buying a hint at any point in the game, on a narrow viewport.

The hint case is deliberately NOT symmetric across viewports, because a manual
close means different things on each. On desktop a mid-game hint yields to a
manual close - the panel stays shut, pinned by "a mid-game hint does not
resurrect the panel for later guesses" (`e2e/panel.spec.ts`) - because there the
player who closed the panel is refusing a card that would otherwise keep
reappearing beside the tree on every guess. On a phone nothing reappears on its
own, so a closed panel is just a closed panel, and a hint the player paid three
guesses for has no other way to show its product.

The hint case was found in review round 1 (R1.4) rather than at plan time, and it
was a real defect: `src/game.ts` opened the panel by hand only when there was no
last guess, on the assumption that `updateUI()` had already opened it otherwise.
That assumption is exactly what this change invalidates on a phone, so a mid-game
hint bought three guesses' worth of nothing but a tree redraw. The condition is
now `!state.lastGuessId || isNarrowViewport()`. Pinned by "a mid-game hint on a
phone still shows its clade" in `e2e/mobile.spec.ts`.

## Resizing across the breakpoint mid-game is left to the player

`isNarrowViewport()` is evaluated per render, so a narrowed window gets the phone
behaviour from its next render onward. Nothing listens for the resize EVENT,
which means a desktop window with the panel already open, dragged below 768px,
keeps a now-full-width panel over the tree until the player closes it.

Deliberate. A real phone never crosses this breakpoint, and the player who
narrowed the window has the pull tab (labelled "Close" in that state) right
there. Adding a `matchMedia` change listener that force-closes the panel would
mean the window manager dismissing a card the player deliberately opened, which
is a worse behaviour than the one it fixes.

## Rejected alternatives

- **Bottom sheet** (panel pinned to the lower ~40% of the game area on narrow
  viewports, arena shrinking to the space above it). Tree and card would both be
  on screen after every guess, and its peeking state would also fill the blank
  pre-guess screen (F3.9). Rejected because it permanently spends the tree's
  scarcest resource - vertical room on a phone - on supporting detail, and
  because it adds a third visual state to `.info-panel` plus a drag/expand
  affordance and its own scroll interaction.
- **Inline card below the tree** inside the arena's scroll flow, with the overlay
  panel unused on phone. Nothing would ever cover the tree and the clipped-card
  problem (F3.7) would fix itself via the arena scroll. Rejected because it needs
  a second card mount point diverging from the panel's, and the card would be
  off-screen unless the player scrolls, so it is strictly less discoverable than
  a labelled tab while costing more code.

## Consequence for the empty first screen (F3.9)

With the sheet rejected, nothing fills the arena's blank vertical bands, so F3.9
gets its own layout fix in this task: the tree is anchored to the TOP of the
arena on narrow viewports instead of being centred under a large `padding-top`.
The tree grows downward as guesses land, so top-anchoring also removes the
reflow jump where the whole tree slides up on each guess. The blank band ends up
below the tree, where it reads as room to grow rather than as dead space.

## Consequence for 20260729-125313 (reload auto-open)

That task owns the mid-game-reload auto-open. This change fixes the reload case
on PHONES as a side effect, because `renderLastGuess` never auto-opens there
whatever triggered the render. It does not touch the desktop reload path or the
"render from page load vs render from a fresh guess" contract change that task is
about, so that task stays open and keeps its scope.
