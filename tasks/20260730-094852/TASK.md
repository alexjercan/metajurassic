# Make the tree's closeness readable without colour

- PRIORITY: 62
- TAGS: feature, ux, a11y
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a player who cannot reliably tell yellow from orange from green, I want the tree's closeness encoding to reach me some way other than hue, so that the warmth the board is teaching is legible to me at all.

## Review Findings

- Filed from `20260729-182255` REVIEW.md R1.2 (out-of-context reviewer, MINOR, non-blocking).
- `renderTree` (`src/ui/treeVisualizer.ts`) puts the tier on a guessed species node as `node-close-<tier>` and `src/style.css` renders it as border + tint + text colour. Colour is the ONLY channel.
- Three of the five hues - `#d8c04a` yellow (tier 2), `#e08a3c` orange (tier 3), `#4ca86a` green (tier 4) - are the classic deuteranope confusion set, and they are the three that matter most: they are the hot end, where the player is closing in.
- The share grid does not have this problem to the same degree - `⬛🟦🟨🟧🟩` differ in lightness as well as hue - but it is not a full escape either.
- NOT a regression: the scale is pre-existing and `20260729-182255` carried it onto the board. This task is about the board's version of it.

## Decision (settled)

`tasks/20260730-094852/DECISION.md`, ACCEPTED at the understanding gate:
the second channel is a **monotonic lightness ramp**, not pips, not border
weight, not copy. The five hues stay exactly as accepted, so
`tasks/20260729-182255/DECISION.md` fork 1 is NOT superseded. No `aria-label`
in this task.

## Steps

- [x] Decide the shape with the user and record it in DECISION.md. No supersede link needed - the hues do not move.
- [x] Add `describe("the scale is legible without hue")` to `test/closeness.test.ts`, beside the existing `describe("the stylesheet covers the scale")` which already follows `src/style.css`'s `@import` list into the partials. Parse each `.node-close-<tier>` block and assert three things: the `border-color` is still the exact accepted hex; the `background: rgba(...)` alpha is strictly increasing across tiers 0-4; the `color` hex's WCAG relative luminance is strictly increasing across tiers 0-4 with every adjacent pair at a contrast ratio of at least 1.15. Run it and watch it fail.
- [x] Retune the five `.node-close-*` rules in `src/partials/tree.css`. Keep every `border-color` byte for byte. Ramp the fill alpha 0.06 -> 0.11 -> 0.16 -> 0.22 -> 0.30. Retune the five `color` values to a monotonic luminance ramp - target luminances about 0.30 / 0.40 / 0.52 / 0.66 / 0.82, holding each one's hue angle so the tier still reads as its colour. Move nothing between the rules and do not reorder them; the file-order lock over `.node-mystery` / `.node-winner` / `.node-revealed` documented in the block comment must survive untouched.
- [x] Rewrite that block comment: it currently says the fill is 0.14 flat and that its job is clade-vs-species separation. It now has a second job, the tier ramp. Cite `tasks/20260730-094852/DECISION.md` alongside the existing `20260729-182255` citation.
- [x] Add a greyscale screenshot to `scripts/playtest/walkthrough.ts` (already screenshots, already outside CI): drive the same five-tier board `e2e/closeness.spec.ts` uses - target Struthiomimus, guesses Stegosaurus / Apatosaurus / Ceratosaurus / Yutyrannus / Gallimimus - and shoot it once with `filter: grayscale(1)` on the page.
- [x] Look at that greyscale shot. Five tiers, five distinguishable steps, or the numbers move and step 3 repeats.
- [x] Screenshot desktop and phone in colour and look. Confirm the retuned text colours still read as their hues and still sit legibly on `--node-bg`.
- [x] `nix develop -c npm run ci`.

## Definition of Done

- The closeness tier is legible through at least one non-hue channel. (test: `the scale is legible without hue`)
- The greyscale render of a five-tier board keeps the tiers tellable apart. (manual: user judgement)
- The colour render still reads correctly on desktop and phone. (manual: user judgement)
- The accepted hues are unchanged, so `20260729-182255` fork 1 still stands. (test: `the scale is legible without hue`)
- The decision is recorded. (cmd: `ls tasks/20260730-094852/DECISION.md`)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Notes

- Sequencing: after `20260729-182255`, which builds the scale this task makes accessible.
- Red on base, measured. Current text luminances are 0.500 / 0.497 / 0.715 / 0.548 / 0.599 - not monotonic, and the yellow at tier 2 is the lightest thing on the scale. Current fill alphas are all 0.14 - flat, so not strictly increasing either. Both halves of the new test fail today.
- The fill ramp alone is NOT enough and must not be the only assertion. `.node-close-*` sets the `background` SHORTHAND, so it REPLACES `.node-box`'s `background: var(--node-bg)` instead of layering over it, and the tint composites over the page `--bg-dark` `#0a0c10`. On that basis alphas 0.06 -> 0.30 give luminances 0.0061 / 0.0085 / 0.0216 / 0.0244 / 0.0355, i.e. adjacent contrast ratios of 1.04 / 1.22 / 1.04 / 1.15. Two of those steps are invisible. The text colour is the channel that actually carries the ramp; the fill is a supporting one. (This note first recorded the numbers over `--node-bg`; review round 1 R1.1 put them on the right basis. The conclusion did not change.)
- Consequence of a monotonic text ramp, accepted going in: tier 2's yellow has to get DARKER than it is today (0.715 -> ~0.52) so that orange and green can sit above it, and tier 4's green ends up pale. That is the cost of the ordering and is expected, not a mistake to be corrected in review.
- `e2e/closeness.spec.ts` already asserts the five tiers paint five DISTINCT borders. That test must stay green; the borders are not moving, so it should not notice this change at all. If it does, something reordered the rules.
- Threshold 1.15 is chosen to sit under the ~1.22 worst adjacent step the target ramp produces, so ordinary tuning does not trip it while a flat or inverted ramp still does.

## Close-out

### What and why

The five `.node-close-*` rules in `src/partials/tree.css` keep their borders
byte for byte and gain a lightness ramp. Fill alpha goes 0.06 / 0.11 / 0.16 /
0.22 / 0.30. Text goes `#8f95a1` / `#9caac4` / `#d7bf46` / `#ffca9b` /
`#9affbb`, luminances 0.299 / 0.398 / 0.522 / 0.659 / 0.820, adjacent contrast
ratios 1.28 / 1.28 / 1.24 / 1.23. The tier now reaches a player who cannot
separate the hues, and the board still pastes as the same grid it always did.

The colours were solved rather than eyeballed: hold each accepted hue's angle
in HLS, binary-search lightness until the WCAG relative luminance hits its
target. Tiers 3 and 4 were then pushed to near-full saturation, because
lightening at the ORIGINAL saturation washed orange into `#f2cead` (a pale
peach) and green into `#dbefe1` (nearly white). `#ffca9b` and `#9affbb` sit at
the same luminances and still read as orange and green.

### Alternatives

Pips, border weight and `aria-label` were all rejected at the understanding
gate; `tasks/20260730-094852/DECISION.md` holds the reasoning.

One alternative was rejected during the work, not at the gate: making the fill
alpha the whole answer. It reads as the cheaper change, but composited over the
page background its five steps are contrast ratios of 1.04 / 1.22 / 1.04 /
1.15 - two of them invisible. The test therefore asserts BOTH channels, and the
text one carries the weight. Anyone tempted to simplify the test down to the
alpha ramp would be deleting the half that matters.

### Difficulties

- The first greyscale shot proved nothing. `page.screenshot` at 1280 caught
  three of the five rungs: the info panel covers the right third of the board
  and the arena scrolls. Fixed by shooting `#tree-container` as an element,
  closing the panel first, and widening that one scenario's viewport to 1920.
  Judging a five-step ramp needs all five steps in one frame.
- The mobile greyscale shot is still clipped to the phone viewport - element
  screenshots do not escape it - so it shows tiers 2, 3 and 4. That is the
  deuteranope confusion set, which makes it the right three to have, and the
  desktop shot is the full-scale evidence. Left as is rather than faking a
  phone that can see the whole tree at once; a real phone cannot either.
- The fill numbers went into the records on the wrong basis and review round 1
  caught it. `.node-close-*` sets the `background` SHORTHAND, which REPLACES
  `.node-box`'s `background: var(--node-bg)` at equal specificity rather than
  layering over it, so the tint composites over the page `#0a0c10` and not the
  node's `#151820`. Every conclusion survived the correction - the fill ramp is
  still too weak to stand alone - but the block comment now names the basis,
  because it also tells the next maintainer to retune against the test.
- `CLOSENESS_LADDER` moved into `e2e/helpers/rounds.ts` rather than being
  copied into the playtest script. Two callers needed the same board, and a
  drifted copy would have photographed a different round than the one under
  test (LESSONS.md `hand-copied-logic-mirrors-rot`).

### Evidence

- `test/closeness.test.ts`, `the scale is legible without hue`: red on base
  for both intended reasons - `brighter: false` at tiers 0->1 and 2->3, `ratio:
  false` at 0->1 and 3->4 - and the border-hue tests green on base, as they
  must be. Green after the retune.
- `nix develop -c npm run ci`: green. 126 Playwright specs pass, including
  `e2e/closeness.spec.ts`, which still sees five distinct borders.
- `npm run playtest:walkthrough` shots 09 and 10, desktop and mobile. The
  greyscale desktop shot shows five ascending steps, Stegosaurus dimmest
  through Gallimimus brightest. The colour shot still reads grey / blue /
  yellow / orange / green, and the clade nodes still separate from the guesses
  by fill-vs-no-fill.

### Reflection

The proof shape was the valuable part. "Legible without colour" sounds like a
manual-only criterion, and it half is - but relative luminance is arithmetic,
and pinning the arithmetic in a unit test means the ramp cannot be
accidentally flattened by a later palette tweak. The screenshot then answers
only the question a number cannot: are five computed steps five steps to an
eye. Splitting it that way is worth reusing on the next "does this read?" task.

The measure-first habit paid twice: the base-branch luminances proved the test
was red for the right reason, and the composited fill numbers killed the
cheaper design before it was built rather than after review found it thin.
