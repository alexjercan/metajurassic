# Decision: how the tree is sized, where it rests, and how far touch is proven

- STATUS: ACCEPTED
- DATE: 2026-07-29
- TASK: 20260729-092339

## Context

The reproduction in `TASK.md` shows three independent faults in `renderTree`
plus `.tree-scale-*`. Fixing them means choosing a concrete rendering shape, and
the candidates are mutually exclusive: a bucketed `transform` at
`transform-origin: center top` cannot also produce a scroll extent that matches
the visible content, because the dead band IS the gap between the layout box the
buckets leave behind and the smaller box the transform paints. So "keep the
buckets" and "no dead band" could not both hold, and the fork went to the user
before any code was written.

## Fork 1: sizing strategy

Candidates:

1. **Continuous fit plus an honest box** (CHOSEN). Compute
   `scale = clamp(minScale, arenaWidth / treeWidth, 1)`, apply it at
   `transform-origin: top left`, and size a wrapper element to the SCALED
   dimensions so `#arena.scrollWidth` equals the width the player can actually
   see.
2. Keep the four bucket classes and change only where `renderTree` scrolls to.
   Smallest diff, but the ~430px dead band and the ~8.6px node text both survive.
3. Drop scaling entirely and navigate a full-size tree by scrolling alone.
   Simplest geometry, but a 12-guess tree is then about 4x the phone viewport
   wide with no overview at all.

Chosen: 1. It is the only candidate that removes the dead band, and the dead
band is the most plausible mechanism behind the original report's "on android
you cannot scroll to the left" - a scroll range with 430px of emptiness at each
end behaves differently across engines, and the player is dropped into it.
It also replaces a fixed 0.6 floor, which stops responding to a tree that keeps
growing, with a floor set by legibility (fork 4 below).

## Fork 2: resting scroll position

Candidates: centre the mystery `?` node (CHOSEN); centre the newest guess; fit a
box containing both.

Chosen: the mystery node. It is the one node present in every state of every
round, so the rule has no fallback case to get wrong, and a guess is drawn on
the lineage it shares with the target, so the newest guess is normally near it
anyway. Centring the newest guess drifts off the target when a guess lands in a
far branch; fitting both is better framing but is materially more math and more
test surface for a gain the shared-lineage property mostly already provides.

If the "both fit" framing turns out to be wanted after playtesting, it is a
change to `computeScrollTarget` alone, which is why that math is extracted as a
pure function.

## Fork 3: how far the Android touch verification goes

Candidates: real touch sequences via CDP `Input.dispatchTouchEvent` in the
mobile E2E project plus a documented manual item (CHOSEN); geometry assertions
only, with all touch behaviour manual.

Chosen: CDP touch events. The reported symptom is specifically about touch
scrolling, so leaving it entirely to a manual note would mean the one thing the
original bug named has no automated pin at all. Chromium's touch emulation is
not Android Chrome, so real-device confirmation stays a manual acceptance item
on the task rather than being claimed as covered.

## Fork 4: what sets the minimum scale

Not put to the user; it follows from fork 1 and is recorded because it replaces
a magic number. The floor is expressed as `MIN_NODE_FONT_PX` and converted to a
scale against the node's own computed font size, so the same constant holds on
desktop (16px base) and on a phone (14.4px base) instead of the single 0.6 that
produced ~8.6px text on the phone.

## Consequences

- `.tree-scale-90/80/70/60` are deleted; nothing may reintroduce a bucket.
- `#arena.scrollWidth` becomes a meaningful assertion target, and the specs pin
  it.
- The scale and scroll math leave `renderTree` for `src/ui/treeLayout.ts`, so
  they are unit-testable without a browser; the browser specs then check that
  the DOM actually ends up where the math says.
- Real Android Chrome and Opera remain unproven by CI, by construction.
