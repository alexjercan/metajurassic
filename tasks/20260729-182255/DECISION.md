# Decisions - colour the tree by guess closeness

- DATE: 20260730
- STATUS: ACCEPTED
- CONTEXT: `tasks/20260729-092452/NOTES.md` section 2, "after the first guess"

Three forks, each with its own status line below. The document-level status
above is what `tatr check` reads; the per-fork lines record WHO accepted each
one and when, which the header does not carry.

## 1. The palette mirrors the share-grid emoji hues

STATUS: ACCEPTED (user, at the plan gate)

The board needs a five-step scale. Two candidates, mutually exclusive because
they cannot both be the board's hues:

- **Mirror the grid** - grey, blue, yellow, orange, green, i.e. the hues of
  `⬛🟦🟨🟧🟩`. Cost: tier-3 orange `#e08a3c` sits near `--amber-glow`
  `#e6a861`, which is the CLADE colour, so hue alone stops separating clade
  from species at that tier.
- **Cool-to-warm avoiding amber** - grey, blue, teal, lime, green. Buys back
  the clade/species separation on hue alone. Cost: the board's colours no
  longer match the emoji the player pastes, so the board teaches a second,
  similar-but-different language - which is the exact defect this task exists
  to remove. Its own hot end (lime vs green) is also a closer pair than
  orange vs green.

**Chosen: mirror the grid.** The point of the task is that the board and the
paste speak ONE language; a palette that does not match the grid does not
deliver it. The orange/amber collision is handled structurally rather than by
hue: every closeness node gets a `rgba(hue, 0.14)` tint fill, and clade nodes
keep the flat dark `--node-bg`, so fill-vs-no-fill separates kind even where
hue does not.

| tier | closeness | cell | border/hue |
|------|-----------|------|-----------|
| 0 | <= 0.2 | `⬛` | `#6b7280` grey |
| 1 | <= 0.4 | `🟦` | `#5b7199` blue (today's `node-species`) |
| 2 | <= 0.6 | `🟨` | `#d8c04a` yellow |
| 3 | <= 0.8 | `🟧` | `#e08a3c` orange |
| 4 | else   | `🟩` | `#4ca86a` green (hot) |

The two nodes that must NOT read as temperatures keep their existing
treatments and are excluded from the scale entirely: `node-mystery` (dashed
red + pulse) and `node-winner` (filled gold + glow + scale).

## 2. Guessed species only; clades keep their amber

STATUS: ACCEPTED (user, at the plan gate)

The share grid is one cell per GUESS, so a per-guess encoding is the faithful
mapping and a clade has no counterpart in it. Colouring clades by lineage
depth would also collapse the clade/species distinction the amber currently
carries - which decision 1 is already leaning on as its collision mitigation.

## 3. The tier is carried on the tree data, not computed in the renderer

STATUS: ACCEPTED (author; recorded because it is what makes the DoD provable)

`SpeciesNode` gains `closenessTier?: number`, set by `buildGuessTree`;
`renderTree` only maps it to a class. The alternative - computing the tier
inside `renderTree` - was rejected on testability: jest here runs
`testEnvironment: "node"` with no jsdom installed, and `jest.config.js`
excludes `src/ui/**` from coverage, so a tier computed in the renderer could
not be pinned by any Jest test. Putting it on the data makes the tier-parity
proof a plain node-environment test over the real payload, and leaves the
browser to prove only that the class reaches the DOM.
