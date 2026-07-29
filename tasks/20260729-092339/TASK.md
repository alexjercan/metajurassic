# Harden tree scaling and mobile scroll behavior

- STATUS: CLOSED
- PRIORITY: 80
- TAGS: bug,ui,mobile,testing

## Story

As a mobile player making many guesses, I want the taxonomy tree to stay visible, centered, and scrollable, so that the core feedback loop remains usable even when the tree grows wide or deep.

## Review Findings

- The historical closed task was about graph scaling and Android/mobile scrolling.
- The current renderer uses `scrollWidth` thresholds, coarse scale classes, and a requestAnimationFrame scroll-to-center/bottom pass.
- There is no browser regression proof that a many-guess tree remains visible or horizontally scrollable on mobile.

## Reproduction (2026-07-29, before any fix)

Measured on the seeded practice page with 12 guesses spread across clades,
driven through the real UI in Chromium:

| viewport | arena scrollWidth vs clientWidth | nodes fully visible after the post-guess auto-scroll | mystery `?` visible |
|---|---|---|---|
| Pixel 5 (393x851) | 2152 vs 393 | 4 / 24 | no |
| Pixel 5 short (393x560) | 2152 vs 393 | 0 / 24 | no |
| Desktop (1280x720) | 2693 vs 1280 | 9 / 24 | yes, incidentally |

Three separate faults, all confirmed by measurement:

1. `.tree` is scaled with `transform: scale(0.6)` at `transform-origin: center
   top`, but `#arena`'s scroll extent stays the UNSCALED layout width (2152px of
   scroll for 1291px of visual content), leaving a ~430px dead band at each end
   of the scroll range.
2. `renderTree` scrolls to the geometric middle of that extent and to
   `scrollHeight`, i.e. to a position chosen with no reference to the mystery
   node or the newest guess. On the short phone that resting position shows
   nothing at all.
3. The scale buckets floor at `tree-scale-60` from ~5 guesses onward, so past
   that the tree only gets wider; at 0.6 the phone node text is ~8.6px.

NOT reproduced: the original report's "cannot scroll left on Android Chrome".
Every node is reachable by programmatic scrolling at every size measured. The
dead band (fault 1) means the player CAN scroll into emptiness, which is a
plausible source of that report, but confirming it needs a real device.

## Steps

- [x] Add a deterministic wide-tree fixture on the seeded practice page: `playWideTree(page, seed, names)` in `e2e/helpers.ts`, driving a fixed guess list spread across clades through the real UI, asserting the counter after each guess.
- [x] Write the regression specs FIRST and watch each fail for the right reason: mystery node and newest-guess node fully inside `#arena` at Pixel 5, short phone (393x560) and desktop; every node reachable by some scroll position; `arena.scrollWidth` equal to the visible content width (the dead-band pin); node text never below the readability floor; a genuine CDP touch drag scrolls the arena both ways; a viewport change re-centers.
- [x] Extract the geometry into a pure `src/ui/treeLayout.ts` (`computeTreeScale`, `computeScrollTarget`) with Jest tests for the edges (tree narrower than arena, tree many times wider, anchor against either edge).
- [x] Rework `renderTree`: sizing wrapper around the tree, `transform-origin: top left`, computed scale, wrapper sized to the SCALED width/height so the scroll extent is honest, then an instant scroll centering the mystery node.
- [x] Derive `minScale` from a `MIN_NODE_FONT_PX` constant against the measured computed font size rather than a magic 0.6.
- [x] Recompute on `resize` and `orientationchange`, rAF-debounced, preserving the anchor.
- [x] Delete the four `.tree-scale-*` classes and any rules they leave dead.
- [x] Document the manual acceptance that the harness cannot cover (real Android Chrome and Opera touch scrolling).
- [x] Review round 1: a relayout no longer re-scrolls unless the picture actually changed size (`reanchor`), `focusRect` guards the union on BOTH axes, the dead-band check is exact instead of fixture-tuned, and the E2E readability floor derives from `MIN_NODE_FONT_PX` instead of restating it.

## Definition of Done

- A >=12-guess tree is covered at mobile, short-height mobile and desktop. (test: `e2e/mobile.spec.ts`, `e2e/tree.spec.ts`)
- The mystery node is fully inside `#arena` after render at all three sizes, and the newest guess joins it whenever the pair fits across the arena. (test: bounding-box containment)
- `arena.scrollWidth` matches the visible content width, so there is no unreachable band. (test: scroll-extent assertion)
- Every `.node-box` is reachable by scrolling. (test: scroll sweep)
- Node text never renders below `MIN_NODE_FONT_PX`. (test: computed font size times scale)
- A real touch drag scrolls the arena in both directions. (test: `Input.dispatchTouchEvent` in `e2e/mobile.spec.ts`)
- A viewport change re-centers the tree on the mystery node. (test: resize then re-assert containment)
- A viewport change that does NOT change the picture leaves the player's own scroll alone. (test: `a height-only resize does not throw away the player's scroll` in `e2e/mobile.spec.ts`)
- The bucket scale classes are gone: no rule defines one and no code applies one. (cmd: `grep -n "tree-scale" src/style.css` returns nothing; the only remaining mentions anywhere are comments recording what was removed)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)
- Real Android Chrome / Opera touch scroll is recorded as a manual acceptance item. (manual: scroll a 12-guess tree on a phone; see Manual Acceptance below)

## Manual Acceptance

Chromium's touch emulation is not Android Chrome, and the harness has no Opera
at all, so these stay for a human with a real device. The automated suite drives
a genuine touch sequence (`Input.dispatchTouchEvent`) and proves the arena
scrolls both ways under it, which is as close as CI gets.

- (pending) On Android Chrome, play a dozen guesses and drag the tree LEFT and
  RIGHT. This is the exact symptom `20260331-154614` reported and could not be
  reproduced here: in Chromium every node was reachable by scrolling at every
  size measured, before the fix as well as after.
- (pending) Same on Opera, which the original report called out for "small
  inconveniences" that were never specified.
- (pending) Rotate the phone mid-round and confirm the target is still framed.

## Outcome

The reproduction confirmed three faults and falsified a fourth. Fixed:

1. The scroll range now matches the painted tree (`.tree` sizing box plus an
   absolutely positioned `.tree-canvas` carrying the transform), so the ~430px
   dead band at each end is gone.
2. The arena rests on the target - and on the newest guess too whenever the two
   fit across the arena - instead of at the geometric middle of the range.
3. The fixed 0.6 bucket floor is replaced by `MIN_NODE_FONT_PX`, so phone text
   is painted at 11px rather than 8.6px.

Not confirmed: "cannot scroll left on Android Chrome" never reproduced in this
harness. The dead band was the most plausible mechanism and is gone; the claim
itself stays open as a manual item above rather than being declared fixed.

Also fixed along the way, because it made the tree unmeasurable: `.tree ul`,
`.tree li` and `.node-box` used `transition: all`, so a media-query switch
ANIMATED font-size and padding, and any measurement inside 300ms of a rotation
read a font part-way between the phone and desktop values.

Review round 1 then found that the new relayout listener had introduced a
fourth fault of the same family: it re-scrolled on EVERY resize, so a
height-only viewport change (Android Chrome's URL bar hiding mid-drag) threw
away the position the player had scrolled to - measured scrollLeft 1251 -> 287.
The relayout now resizes the box unconditionally but only re-anchors when the
arena width or the scale actually changed, pinned by a spec that is red on the
old behaviour for exactly that reason.

## Notes

- This should be tackled after or alongside the browser harness task.
- Useful code areas: `src/ui/treeVisualizer.ts`, `src/style.css`, and `src/treeBuilder.ts`.
- The three load-bearing forks (sizing strategy, scroll anchor, touch-proof
  depth) were put to the user and are recorded in `DECISION.md`.

## Flow State

- FLOW STEP: DONE
- PLAN STATUS: APPROVED
