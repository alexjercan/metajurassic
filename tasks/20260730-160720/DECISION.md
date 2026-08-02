# Decision: compact the game-over card on the height axis alone

- DATE: 20260802-235033
- STATUS: ACCEPTED
- TASK: 20260730-160720
- TAGS: css, responsive, modal

## Context

`20260730-111003` gave `.modal` a vertical escape hatch - `max-height:
calc(100% - 32px)` plus `overflow-y: auto` - which made every action REACHABLE
at every short viewport. It did not make them VISIBLE. At 568x320 the card is
433px of content in a 286px box: the action row is cut by the card's own bottom
edge, and there is no scrollbar, fade or chevron to say there is more below.
Three half-pills and nothing else.

147px of that 433 is spacing and one 3.5rem emoji. No copy has to go.

## Decision

### Compaction, not a scroll affordance

Trim the card at short heights so the whole thing is visible at once, rather
than adding an affordance that teaches the player to scroll. Paying for a
scroll hint would be paying to keep space nobody asked for.

The escape hatch STAYS. It is what 360x320 and 360x300 still need, so this is a
reduction in how often the hatch is used, not a replacement for it.

### Vertical properties only

The `@media (max-height: 480px)` block touches only `padding-top`/
`padding-bottom`, `margin-top`/`margin-bottom` and `font-size`. Never
`max-width`, never horizontal padding.

That restriction is what lets the block sit on the height axis alone. `.modal`
carries a `max-width` that is an OUTER width under `border-box`, so it has to be
restated at every padding step - the `max-width: 470px` in the `max-width: 768px`
block exists for exactly that reason (LESSONS.md:
`converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`).
A height block that touched horizontal padding would owe the same restatement,
from a condition on the other axis, and would silently get it wrong in one of
the two width bands. Trimming only vertical properties leaves the horizontal
cascade untouched, so nothing needs restating and every horizontal assertion in
the suite still answers the question it answered before.

`font-size` counts as vertical here in the sense that matters: the trimmed
elements (`.modal-icon`, `.modal-title`, `.modal-message`, `.modal-stats`,
`.modal-extra-value`, `.modal-countdown`) are all centred inline content or a
shrink-to-fit inline-block, so a smaller font takes height out and gives width
back. The two rows whose WIDTH is load-bearing - `.modal-actions` and
`.modal-extras-grid` - keep their font size, so the one-row promises at 393px
are computed from unchanged numbers.

### The block goes LAST in responsive.css

Appended after the `max-width: 768px` block and after the existing 700px/620px
height blocks. Media blocks on different axes are resolved by FILE ORDER, not by
specificity: a height block above the width block would be overwritten by that
block's `.modal { padding: 28px 24px }` on every phone, i.e. on exactly the
devices this task is about (LESSONS.md:
`css-media-blocks-on-different-axes-are-resolved-by-file-order`). The position
is load-bearing and the comment in the file says so.

### Threshold 480px

The uncompacted card is 433px and `.modal` is capped at `calc(100% - 32px)`, so
it needs 465px of viewport height to fit. 480 is the first round number above
that. Above it nothing changes, which is why no desktop or tall-phone
measurement in the suite moves.

## Alternatives considered

- **A scroll affordance** - a persistent scrollbar, a bottom fade, or a chevron.
  Rejected: it admits the card does not fit and asks the player to act on that,
  when the card does not need to be that tall in the first place.
- **Dropping content at short heights** - hiding the stats card or the
  countdown. Rejected: the copy is the point, and the budget is met without it.
- **A width-keyed block** (extending `max-width: 768px`). Rejected: this is a
  HEIGHT problem. A short desktop window hits it exactly like a landscape phone
  does, and 900x400 proves it - see below.

## Consequences

- The card measures 271px at every size the block reaches, so 15px of slack
  against the 286px budget at 568x320 and 97px against 368 at 900x400. Thin
  enough at the phone sizes that a wider font stack could eat it, which is why
  `expectModalNeedsNoScroll` names the shortfall in pixels.
- **360x320 and 360x300 keep their scroll.** At 360px both the stat grid and the
  action row take a second line (the grid wraps 3+1 once compacted, measured),
  so the card is 362px against 286 and 266. No vertical trim reaches that; only
  dropping content or a horizontal change would, and both are out of scope. The
  `fits` flag in `SHORT_VIEWPORTS` records which sizes carry the no-scroll
  promise; reachability is still asserted at all five.
- **Those two sizes are what keeps the escape hatch under test.**
  `expectActionsReachable` only checks `overflow-y` is a value a finger can
  scroll WHERE THERE IS OVERFLOW, so if every swept size fitted, that check
  would be inert everywhere and `overflow-y: auto` could be deleted with the
  suite green. `expectModalStillScrolls` asserts the inverse at 360x320 and
  360x300 so a change that makes them fit has to say so out loud.
- **900x400 covers the height axis alone.** The block is exercised at 900px
  wide, where `max-width: 768px` does NOT apply, so the trims are proven against
  the DESKTOP padding step too. Without that case a compaction that only worked
  below 768px wide would pass the entire mobile sweep - every short size in it
  is also narrow - which is the precise failure mode the ordering lesson above
  describes.
