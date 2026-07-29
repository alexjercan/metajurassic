# Review: Harden tree scaling and mobile scroll behavior

- TASK: 20260729-092339
- ROUND: 1
- DATE: 2026-07-29
- VERDICT: REQUEST_CHANGES
## Verification

### Commands run (all from the worktree, via `nix develop -c`)

| command | result |
|---|---|
| `nix develop -c npm run lint` | PASS (no output, clean) |
| `nix develop -c npm run format:check` | PASS ("All matched files use Prettier code style!") |
| `nix develop -c npm test` | PASS (11 suites, 212 tests) |
| `nix develop -c npm run test:coverage` | PASS (11 suites, 212 tests; global thresholds met) |
| `E2E_PORT=8181 nix develop -c npm run test:e2e` | PASS (76 passed, 1 skipped; includes all 11 new tree specs) |
| `grep -rn "tree-scale" src/` | one hit, a comment in `src/ui/treeLayout.ts:11` |
| `grep -n "tree-scale" src/style.css` | no matches |
| `git diff master...HEAD \| grep -P "[^\x00-\x7F]"` | no matches (ASCII punctuation only, per AGENTS.md) |
| `git status --porcelain` | only `?? node_modules` (untracked symlink, correctly NOT committed) |

I also ran three throwaway probe specs to test claims rather than assume them
(`e2e/zz-review-probe*.spec.ts`, since deleted, nothing committed). Their
measurements are quoted in the findings below.

### Definition of Done, item by item

1. **>=12-guess tree covered at mobile, short mobile and desktop** - HOLDS.
   `playWideTree` (e2e/helpers.ts:409) drives 12 named species through the real
   UI on `?seed=42`, and asserts the round is still live and that the arena
   really overflows (>1.2x) before any geometry is measured. That last guard is
   the right instinct: it stops the specs from silently passing on a tree that
   fits. Covered at Pixel 5, 393x560 and 1280x720.
2. **Mystery node fully inside `#arena` at all three sizes; newest guess joins
   it when the pair fits** - HOLDS as tested, but see findings 2 and 3: the
   newest-guess half is asserted unconditionally, on a measured 5.0px of margin,
   and the "fits" test in the implementation is horizontal only.
3. **`arena.scrollWidth` matches the visible content width** - HOLDS in
   substance. Measured on desktop at 12 guesses: `scrollWidth` 1851 for a
   1851.44px sized `.tree`, dead band 96px before the first node and 65px after,
   against 478/623px before the fix. The assertion's tolerance is loose and
   fixture-tuned though; see finding 4.
4. **Every `.node-box` reachable by scrolling** - HOLDS.
   `expectEveryNodeReachable` (e2e/helpers.ts:614) sweeps a 13x13 grid of scroll
   positions and, notably, forces the far end of each axis onto the stop list
   rather than trusting a stride. Restores the saved scroll on the way out.
5. **Node text never below `MIN_NODE_FONT_PX`** - PARTIALLY. The behaviour holds
   (measured scale 0.6875 at 16px base = 11px painted), but the specs assert
   against a hard-coded `10.5`, not against the exported constant; see finding 6.
6. **A real touch drag scrolls the arena both ways** -  HOLDS.
   `touchScrollArena` (e2e/helpers.ts:706) dispatches a genuine CDP
   touchStart/10x touchMove/touchEnd sequence and waits for the fling to settle
   before reading. The negative result recorded for
   `Input.synthesizeScrollGesture` is exactly the kind of note that stops the
   next person re-deriving it.
7. **A viewport change re-centres** - HOLDS (desktop resize and phone rotation
   specs, both polled rather than slept on).
8. **Bucket classes gone** - HOLDS. No rule defines one, no code applies one,
   the two remaining mentions are comments recording the removal.
9. **`npm run ci` passes** - HOLDS. I ran the four gate steps individually
   (format:check, lint, test:coverage, test:e2e on port 8181, since 8080 was
   free but this is a sprout worktree); all green.
10. **Manual acceptance recorded** - HOLDS. `TASK.md` keeps the Android/Opera
    items explicitly pending rather than claiming them, and the Outcome section
    says plainly that the original symptom was never reproduced. Good discipline.

### Jest tests: do they test edges or restate the implementation?

`test/treeLayout.test.ts` tests edges, not the code. The cases that earn their
keep: the readability floor as a *painted* size at two different base fonts (the
whole point of replacing 0.6), a base font already below the floor, an explicit
`minFontPx` override, zero width / zero arena / zero font, and the three
clamp positions of `computeScrollTarget`. None of them re-derive
`arenaWidth / treeWidth` from the source. The gap is that the union rect wider
than the viewport - the case `focusRect` produces and finding 3 is about - has
no `computeScrollTarget` test.

## Findings

### major: a relayout re-scrolls unconditionally, so any resize discards the player's own scroll position

`src/ui/treeVisualizer.ts:243` (`scheduleRelayout`) re-runs the whole of
`layoutTree`, and `layoutTree` always ends in `arena.scrollTo(...)`
(src/ui/treeVisualizer.ts:224) whether or not anything about the layout actually
changed. Master had no resize listener at all, so this is new behaviour.

Proven, not theorised. Probe on desktop-chromium: play the 12-guess fixture,
scroll the arena to the far right by hand (`scrollLeft` 571), then change ONLY
the viewport height by 60px. Result: `scrollLeft` 0. A height change cannot
change the scale (`computeTreeScale` is a function of width alone), so nothing
about the picture needed to move - the player's position was thrown away for
nothing.

Why it matters here specifically: on Android Chrome the URL bar hiding and
showing during a scroll resizes the layout viewport and fires `resize`. That is
the platform, and the gesture, this whole task exists for; the change risks
re-creating a "the tree fights my drag" symptom of the same family as the one
being fixed. The `ResizeObserver` on the arena widens the trigger surface
further (it fires for the arena's own box, e.g. a scrollbar gutter appearing).
Secondary cost: each relayout does two forced sync reflows plus a
`getComputedStyle` over every `.node-box` (src/ui/treeVisualizer.ts:187), which
during a rotation animation is per-frame work.

Suggested change: remember the inputs the frame was computed from
(`arena.clientWidth` and the resulting `scale`), and in the relayout path resize
the box but skip the `scrollTo` when neither changed. Something like:

```ts
let lastLayout = { arenaWidth: 0, scale: 0 };
function layoutTree(container: HTMLElement, reanchor: boolean): void {
    ...
    const moved = scale !== lastLayout.scale || arena.clientWidth !== lastLayout.arenaWidth;
    lastLayout = { arenaWidth: arena.clientWidth, scale };
    if (!reanchor && !moved) return;   // box resized, player's scroll left alone
    ...
}
```

with `renderTree` passing `reanchor: true` and `scheduleRelayout` passing
`false`. The existing rotation and resize specs both change the width, so they
keep passing; a spec for the height-only case would pin the new rule.

### major: the newest-guess containment assertions pass on 5.0px of margin, on font-metric-dependent geometry

`e2e/mobile.spec.ts:503` and `:522` assert unconditionally that the newest guess
is fully inside the arena. But `focusRect` (src/ui/treeVisualizer.ts:153) only
includes the newest guess when the pair fits across the arena, and it otherwise
falls back to the target alone - at which point those assertions fail.

Measured under the `mobile-chromium` project with the shipped fixture: union
width 388.01px against an arena `clientWidth` of 393px. Five pixels. The
deciding quantity is the horizontal distance between "?" and "Saltasaurus",
which is a sum of text widths, and CI renders on stock `ubuntu-latest` Chromium
with a different font stack from the nix `playwright-driver` Chromium used
locally. A one-percent difference in label metrics flips the branch and reddens
two tests on an implementation that is behaving exactly as designed. The same
exposure exists for any content edit to those twelve species' names.

Suggested change: either assert the documented rule rather than a coincidence of
the fixture - compute whether the pair fits in the page and assert containment
of the newest guess only in that case, asserting reachability otherwise - or
pick a fixture whose last guess sits close to the target so the margin is large
and say so in a comment. The current form claims a guarantee `focusRect`
deliberately does not make (DECISION.md fork 2 says so explicitly).

### minor: `focusRect` checks the union against the arena width but never against its height

`src/ui/treeVisualizer.ts:153`: `if (right - left > arenaWidth) return targetRect;`.
The union's `top`/`bottom` are computed and returned, but no equivalent guard
exists on the vertical axis, so a target and a newest guess far apart in depth
produce a focus rect taller than the arena, which `computeScrollTarget` then
centres - leaving the mystery node potentially off the top or bottom. That is
the DoD's central invariant, guarded on one axis out of two.

Not currently reachable with this fixture (measured on the short phone: union
height 145px against `clientHeight` 280px), which is why the suite is green, but
the arena on that viewport is only 280px tall and the tree's scroll height is
437px, so the margin is not large. The fix is two lines and symmetric with what
is already there:

```ts
function focusRect(canvas, origin, scale, arenaWidth, arenaHeight) {
    ...
    if (right - left > arenaWidth || bottom - top > arenaHeight) return targetRect;
```

and a `computeScrollTarget` unit test for an anchor larger than the viewport
would document what happens when it does not fit.

### minor: the dead-band tolerance is tuned to this fixture and would fail a correct narrower tree

`e2e/helpers.ts:593`: `const allowed = Math.max(tolerance, band.scrollWidth * 0.08);`
with `tolerance = 96`. Measured on desktop with the fixture: `band.before` is
96.25px and the floor is 96, so the check passes only because the proportional
term lifts the allowance to 148.

The band is real layout - `.tree-canvas` padding (50px desktop) times the scale,
plus list and node padding - so it grows as the scale approaches 1, while
`scrollWidth * 0.08` shrinks with the tree. A tree only slightly wider than the
arena (scale ~0.95, `scrollWidth` ~1350) gives a band around 130px against an
allowance of 108: a false failure on a perfectly honest layout. The check is
therefore only valid inside the width window this fixture happens to hit.

Suggested change: derive the allowance instead of guessing it - read
`getComputedStyle(canvas).paddingLeft/Right` and the first `li`'s padding,
multiply by the measured scale - or state the DoD's sentence directly:
`arena.scrollWidth` equals `treeContainer.offsetWidth` plus the arena's own
horizontal padding, which is exact and needs no fudge factor.

### minor: the readability floor defeats a user's own font-size preference at the tail

`computeTreeScale` (src/ui/treeLayout.ts:44) sets
`minScale = min(1, minFontPx / baseFontPx)`, so the painted size floors at
exactly `MIN_NODE_FONT_PX` for every base font above it. `.node-box` is
`font-size: 1rem`, so a user who raises their browser's default font to 24px
gets a scale of 0.458 and still reads 11px text. The bucket floor this replaces
was 0.6, which would have painted that user's labels at 14.4px. For the default
16px the change is a clear improvement (9.6px -> 11px); for accessibility-driven
large fonts it is a regression. Page zoom is unaffected, so the blast radius is
small, but it is worth a deliberate decision rather than a side effect.

Suggested change: floor the shrink factor as well as the painted size, e.g.
`minScale = Math.min(1, Math.max(minFontPx / baseFontPx, 0.6))`, or note in the
constant's doc comment that the floor is absolute and why that is acceptable.

### minor: the E2E readability pin is a duplicated magic number, not the exported constant

`e2e/tree.spec.ts:28` and `e2e/mobile.spec.ts:496` both declare
`const MIN_PAINTED_FONT_PX = 10.5;`. The DoD says "node text never renders below
`MIN_NODE_FONT_PX`", but nothing connects the two: lowering
`MIN_NODE_FONT_PX` to 10.6 would leave every test green. The 0.5px of slack for
`offsetHeight` rounding is justified, but the base should come from the source.

Suggested change: `import { MIN_NODE_FONT_PX } from "../src/ui/treeLayout";` in
a shared spot in `e2e/helpers.ts` and use `MIN_NODE_FONT_PX - 0.5`, with the
slack explained once instead of twice.

### nit: the `offsetParent` walk has no guard against escaping the canvas

`src/ui/treeVisualizer.ts:102-106` walks `offsetParent` until it hits `canvas`.
It terminates today because `.tree-canvas` is `position: absolute` and therefore
always on the chain, but if that ever changes (or the canvas is detached), the
loop runs to `null` through `.tree` and `body` and returns a coordinate quietly
computed against the wrong origin. A `if (!el.contains(node)) return fallback`
style bail, or simply starting from `canvas.getBoundingClientRect()` when the
walk ends without seeing the canvas, would fail loudly instead.

### nit: stale comment about a transition this same commit deleted

`e2e/helpers.ts:447` says "`.tree` transitions its transform". That transition
was removed from `src/style.css` in this commit; the canvas has none. The rest
of the comment (popIn) is accurate and worth keeping.

### nit: the new pure module sits where the coverage gate cannot see it

`src/ui/treeLayout.ts` is DOM-free arithmetic with a dedicated unit test, but
`jest.config.js:10` excludes `src/ui/**` from `collectCoverageFrom` on the
grounds that UI code is DOM-heavy. So the one file in `src/ui/` that is not
DOM-heavy contributes nothing to the thresholds. Either move it to
`src/treeLayout.ts` or narrow the exclusion to the components that earn it.

### nit: the container is unsized for the frame between render and layout

`renderTree` appends an absolutely positioned canvas and defers sizing to a
`requestAnimationFrame`, so on the first render `.tree` has zero height for one
frame while the canvas paints out of flow. One frame is not worth a fix on its
own; it is worth knowing when reading a layout-shift report later.

## Verdict

The diagnosis is exact, the fix is the right shape, and the evidence discipline
is unusually good: the reproduction is measured, the rejected alternative
(`Input.synthesizeScrollGesture`) is written down, the unfalsified half of the
original bug report is left explicitly open instead of being claimed, and the
`transition: all` discovery is a genuine root cause rather than a workaround.
The full gate is green, including all 11 new browser specs. What holds it back
is one behavioural regression and one merge risk, both measured rather than
suspected: any resize now discards the player's own scroll position even when
nothing about the layout changed (proven: a height-only resize moved
`scrollLeft` from 571 to 0), which on Android Chrome's URL-bar resize is the
same family of symptom this task set out to remove; and the mobile
newest-guess assertions pass on 5.0px of margin against a branch the
implementation is explicitly allowed to take, on geometry that differs between
the local nix Chromium and CI's. Fix those two, take the two-line vertical
guard in `focusRect` while you are in that function, and this is ready.

---

# Review round 2

- TASK: 20260729-092339
- ROUND: 2
- DATE: 2026-07-29
- VERDICT: APPROVE

## What changed since round 1

Every finding was addressed in code except the two nits that are notes rather
than defects (the one-frame unsized container, now a comment where it happens).

1. **major, relayout discards the player's scroll** - FIXED.
   `layoutTree(container, reanchor)` (src/ui/treeVisualizer.ts:170) now keeps
   `lastLayout = { arenaWidth, scale }` and returns before the `scrollTo` when
   the relayout path finds neither changed. The box is still resized either
   way, so a resize that DOES change the picture still re-frames. `renderTree`
   passes `reanchor: true`, `scheduleRelayout` passes `false`.
   Pinned by `a height-only resize does not throw away the player's scroll`
   (e2e/mobile.spec.ts:583), which was watched fail on the old behaviour first:
   scrollLeft 1251 -> 287 with the guard disabled, unchanged with it.
2. **major, newest-guess assertions on 5px of margin** - FIXED.
   `expectNewestGuessFramed` (e2e/helpers.ts) measures the target-plus-guess
   union against the arena and asserts the branch that applies: containment when
   the pair fits, reachability by scrolling when it does not. Both branches are
   real assertions, and the failure message reports the union and arena sizes so
   a CI-only font difference reads as a fact rather than as a mystery. Both
   phone specs and the desktop spec use it.
3. **minor, `focusRect` guards width but not height** - FIXED.
   `focusRect(..., arenaWidth, arenaHeight)` bails to the target alone when the
   union overflows EITHER axis (src/ui/treeVisualizer.ts). A
   `computeScrollTarget` case for an anchor bigger than the viewport documents
   what the arithmetic does if it is ever reached anyway.
4. **minor, fixture-tuned dead-band tolerance** - FIXED.
   `expectNoDeadScrollBand` no longer takes a tolerance. It asserts the exact
   invariant instead: `arena.scrollWidth` may be the painted tree box plus the
   arena's own padding and no more, with one pixel of sub-pixel slack. That has
   no valid-width window to fall out of, and still rejects the pre-fix layout by
   ~800px.
5. **minor, absolute font floor regresses large default fonts** - FIXED.
   `MIN_TREE_SCALE = 0.6` (src/ui/treeLayout.ts) floors the shrink FACTOR
   alongside the painted-size floor, restoring the guarantee the old bucket gave
   a 24px-base user. Both shipped breakpoints sit above it (0.688 and 0.764), so
   nothing changes for the common case - asserted directly as a test.
6. **minor, duplicated `10.5` magic number** - FIXED.
   `MIN_PAINTED_FONT_PX = MIN_NODE_FONT_PX - 0.5` is exported once from
   e2e/helpers.ts, imported from the shipped module. Lowering the constant now
   reddens the specs.
7. **nit, unguarded `offsetParent` walk** - FIXED. A walk that runs off the end
   without meeting the canvas falls back to bounding rects rather than returning
   a sum against the wrong origin.
8. **nit, stale transition comment** - FIXED (two places).
9. **nit, pure module outside the coverage gate** - FIXED. jest.config.js
   re-includes `src/ui/treeLayout.ts` after the `src/ui/**` exclusion; it
   reports 100% on all four metrics.
10. **nit, one unsized frame** - documented at `renderTree` rather than changed.

## Verification

| command | result |
|---|---|
| `E2E_PORT=8181 nix develop -c npm run ci` | PASS (format:check, lint, 215 Jest tests, 77 E2E passed / 1 skipped) |
| coverage on `src/ui/treeLayout.ts` | 100% statements, branches, functions, lines |
| red-first check on the new regression pin | FAILS without the `reanchor` guard (1251 -> 287), passes with it |

## Verdict

APPROVE. The behavioural regression the relayout introduced is gone and pinned
by a test proven red against the old code; the two assertions that would have
been flaky or vacuous now state the rules the implementation actually makes; and
the geometry guard is symmetric on both axes. The remaining judgement call -
that a hard 0.6 scale floor is right for large accessibility fonts - is now
explicit in a named constant with a test, rather than an unremarked side effect.
