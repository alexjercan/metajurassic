# Make the tree's closeness readable without colour

- STATUS: OPEN
- PRIORITY: 62
- TAGS: feature,ux,a11y

## Story

As a player who cannot reliably tell yellow from orange from green, I want the tree's closeness encoding to reach me some way other than hue, so that the warmth the board is teaching is legible to me at all.

## Review Findings

- Filed from `20260729-182255` REVIEW.md R1.2 (out-of-context reviewer, MINOR, non-blocking).
- `renderTree` (`src/ui/treeVisualizer.ts`) puts the tier on a guessed species node as `node-close-<tier>` and `src/style.css` renders it as border + tint + text colour. Colour is the ONLY channel.
- Three of the five hues - `#d8c04a` yellow (tier 2), `#e08a3c` orange (tier 3), `#4ca86a` green (tier 4) - are the classic deuteranope confusion set, and they are the three that matter most: they are the hot end, where the player is closing in.
- The share grid does not have this problem to the same degree - `⬛🟦🟨🟧🟩` differ in lightness as well as hue - but it is not a full escape either.
- NOT a regression: the scale is pre-existing and `20260729-182255` carried it onto the board. This task is about the board's version of it.

## Open question - decide before building

The obvious fix is a `title`/`aria-label` naming the tier in words, but that is new PLAYER-FACING COPY and the wording is a tone decision, not a mechanical one. It is also only half a fix: a tooltip needs a hover, which a phone does not have.

Candidate shapes, which are NOT interchangeable:

1. `title`/`aria-label` per node. Cheap, helps a screen reader, does nothing for a sighted deuteranope player on a phone.
2. A second visual channel on the node itself - border WEIGHT, a dot/pip count, or a lightness ramp deliberately monotonic across the five tiers. Reaches everyone, costs board real estate, and interacts with `node-winner`/`node-mystery`.
3. Re-pick the palette for monotonic lightness as well as hue, so the tiers are separable in greyscale. Keeps the current visual language but breaks the "mirror the share grid's hues" decision recorded in `tasks/20260729-182255/DECISION.md` fork 1 - that supersede link has to be written on both records if this is chosen.

Take the fork to the user before building; 3 in particular reverses an accepted decision.

## Steps

- [ ] Decide the shape with the user and record it in DECISION.md, including the supersede link if it changes `20260729-182255` fork 1.
- [ ] Implement it.
- [ ] Prove it in greyscale, not by eye in colour: render the board and check the tiers are still separable with saturation stripped.
- [ ] Screenshot desktop and phone and look.

## Definition of Done

- The closeness tier is legible through at least one non-hue channel. (manual: greyscale render of a five-tier board, tiers still tellable apart)
- The decision is recorded, with a supersede link if it changes an earlier one. (cmd: `ls tasks/<id>/DECISION.md`)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Sequencing: after `20260729-182255`, which builds the scale this task makes accessible.
