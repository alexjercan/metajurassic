# Decision: make the tree's closeness readable without colour

- TASK: 20260730-094852
- DATE: 20260801
- STATUS: ACCEPTED
- TAGS: feature, ux, a11y

## Context

`tasks/20260730-094852/TASK.md` opened with a fork it refused to guess at,
filed from `tasks/20260729-182255/REVIEW.md` R1.2: the board encodes closeness
in hue alone, and three of the five hues - `#d8c04a` yellow, `#e08a3c` orange,
`#4ca86a` green - are the classic deuteranope confusion set. They are also the
hot end of the scale, where the player is closing in, so the tiers that matter
most are the ones that collapse.

The fork was taken to the user at the understanding gate.

## Decision

**The second channel is a monotonic lightness ramp.** Keep the five hues, ramp
the fill alpha and the text lightness cold -> hot so the tiers separate with
saturation stripped.

Because the hues do not move, this does NOT supersede
`tasks/20260729-182255/DECISION.md` fork 1: the board and the pasted share grid
remain one language.

**No `aria-label` in this task.** Visual channel only.

Target ramp - hues unchanged, lightness monotonic:

| tier | hue | fill alpha | text luminance |
|------|-----|-----------|----------------|
| 0 | `#6b7280` grey | 0.06 | ~0.30 |
| 1 | `#5b7199` blue | 0.11 | ~0.40 |
| 2 | `#d8c04a` yellow | 0.16 | ~0.52 |
| 3 | `#e08a3c` orange | 0.22 | ~0.66 |
| 4 | `#4ca86a` green | 0.30 | ~0.82 |

The table is the intent, not the literal values. The proof is a greyscale
render in which the five tiers are still tellable apart; the numbers move if
the render says they must.

## Alternatives considered

Four candidate shapes, mutually exclusive because they are competing answers to
"what carries the tier when hue does not":

- **Pip count** - 0-4 dots inside each guessed node. Countable and completely
  hue-independent, but it spends board real estate the tree does not have to
  spare, and it needs a rule for how pips behave under `node-winner` and
  `node-mystery`.
- **Border weight ramp** - 1px -> 5px. Cheapest possible CSS change, rejected
  because `node-mystery` (2px dashed), `node-revealed` (2px solid) and
  `node-winner` all encode themselves THROUGH the border. Weight would collide
  with the target's own encodings, which must never read as temperatures.
- **`aria-label` only** - names the tier in words. Reaches a screen reader,
  does nothing for a sighted deuteranope player on a phone, and commits this
  task to player-facing tier wording, which is a tone decision.
- **Re-pick the palette for monotonic lightness AND hue** - the task's original
  option 3. Rejected because it reverses an accepted decision to buy something
  the lightness ramp delivers without reversing anything.

## Consequences

- The tint fill already existed as the clade-vs-species separator. Making its
  alpha monotonic gives it a second job at no new cost in layout or concepts.
- Nothing new lands in the DOM, so `node-winner`, `node-mystery` and
  `node-revealed` keep winning at the same specificity and in the same file
  order they do today. The ordering lock in `src/partials/tree.css` is
  untouched.
- The fill ramp alone is too weak to be the whole answer. `.node-close-*` sets
  the `background` SHORTHAND, which REPLACES `.node-box`'s
  `background: var(--node-bg)` rather than layering over it, so the tint
  composites over the page `--bg-dark` `#0a0c10`. On that basis alphas
  0.06 -> 0.30 give luminances 0.0061 / 0.0085 / 0.0216 / 0.0244 / 0.0355,
  adjacent contrast ratios 1.04 / 1.22 / 1.04 / 1.15 - two of those steps are
  invisible. The text colour is the channel that carries the ramp; the fill
  supports it. (Round 1 of review corrected this basis; the first draft
  composited over `--node-bg`, which the shorthand had already thrown away.)
- Accepted cost of the ordering: tier 2's yellow must get DARKER than it is
  today (luminance 0.715 -> ~0.52) so orange and green can sit above it, and
  tier 4's green ends up pale. Expected, not a defect.
- A worded tier for screen readers remains unbuilt. It gets its own task if
  wanted.
