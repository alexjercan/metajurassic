# Retro: Make the tree's closeness readable without colour

- TASK: 20260730-094852
- BRANCH: feature/tree-closeness-lightness-ramp
- REVIEW ROUNDS: 2

## What went well

- The fork went to the user at the UNDERSTANDING gate, before any code, and
  came back as one sentence that decided everything downstream. The task had
  been written with the fork already laid out and an explicit "take this to the
  user before building" instruction; the gate did what it was there for.
- Splitting the proof in two was the design decision that paid. "Legible
  without colour" reads as manual-only, but relative luminance is arithmetic,
  so `test/closeness.test.ts` pins the ramp and the screenshot answers only the
  part a number cannot: are five computed steps five steps to an eye. The test
  half is the durable one - a later palette tweak cannot silently flatten the
  ramp now.
- Measuring before building killed the cheaper design on evidence rather than
  taste. The fill-alpha-only option looks sufficient until its five steps are
  computed and two of them turn out invisible.
- The base-branch red was verified as red FOR THE RIGHT REASONS, per step, not
  just "the test fails". That is what let round 1's reviewer reproduce the
  close-out's failure signature exactly.

## What went wrong

The recorded fill luminances were computed over the wrong background. Every
one of them - in DECISION.md, in TASK.md's Notes, in the close-out - composited
the tint over `--node-bg` `#151820`, the value `.node-box` sets. But
`.node-close-*` sets the `background` SHORTHAND, which REPLACES that
declaration rather than layering over it, so the browser composites over the
page `--bg-dark` `#0a0c10`.

Why it seemed sound: the rule being edited was one that visibly paints a tinted
node box, and the block comment directly above it says clade nodes "keep the
flat dark `--node-bg`". Reading that, the node's background is obviously
`--node-bg` and the tint is obviously on top of it. The figure was computed
from a mental model of the element assembled by reading the declarations,
which is a model, not the resolved cascade - and an alpha fill is exactly the
case where the difference shows up as a number.

It graded MAJOR rather than MINOR because the block comment tells the next
maintainer to "retune these values only against that test" while the records
next to it handed them the wrong basis to reason from. Every conclusion
survived the correction; only the numbers moved.

Round 2 then found two NITs inside the round-1 fix itself: a "within a couple
of percent" that fit tier 1 but not tier 0, and the new note wedged between
"the fill has two jobs" and "its second job". Both are the ordinary cost of
editing prose under a correction.

## What to improve next time

- Diagnose - churn: the plan is where this was missable. It specified the alpha
  ramp and even predicted the fill would be too weak, but it never asked what
  the fill composites OVER. `plan/decision.md`'s cold-reader rationale test
  would have caught it: a cold reader handed "alphas 0.06 -> 0.30 give
  luminances 0.013 ..." has no way to know which background that is over, and
  writing the basis down is what forces you to check it.
- Diagnose - breadth: the diff is small and cohesive - one CSS block, its test,
  and the evidence rig. No split was missed. Moving `CLOSENESS_LADDER` into
  `e2e/helpers/rounds.ts` was in-scope: two callers needed the same board, and
  a copy would have photographed a different round than the one under test.
- Diagnose - context: no pressure observed. No checkpoint, no handoff, no
  compaction; the out-of-context review rounds ran as subagents by design, not
  under duress.
- The wider viewport for the greyscale scenario is worth remembering as a
  pattern: evidence shots that exist to be COMPARED against each other need
  every subject in one frame, which is a different constraint from the layout
  shots around them.

## Action items

- None requiring a task. The lesson is filed in the ledger; the two NITs and
  the MAJOR are all fixed on the branch.
