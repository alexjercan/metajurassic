# Retro: Rework the hint reveal rule

- DATE: 20260729
- TASK: 20260729-141424 (CLOSED, review APPROVE)

## What went well

- **The decision was already made, so the build was mechanical.** Two rounds of
  research (`20260729-160500`) and a DECISION.md settled the fraction, the price
  and the cap before any code existed. The implementation cycle had no design
  arguments in it at all - it was constants, one function, one gate, tests. That
  is what the spike bought.
- **Reading `buildCladeSubtree` BEFORE writing anything killed the biggest
  unknown.** The plan's main risk was that a hint skipping lineage levels would
  render wrong, which would have meant tree work. Five minutes of reading showed
  it attaches revealed clades to their nearest revealed ancestor - the same path
  already used for non-adjacent LCA clades - so the answer was "no work needed",
  established before the gate rather than discovered mid-build.
- **The mock-tree tests were hand-traced before running them.** All five
  `findNextHintCladeId` cases were worked through on paper under the new rule to
  predict pass/fail. They passed, and the trace explained WHY (a 4-species
  fixture has a cutoff of 2, which the old answers already met) rather than
  leaving a green bar to be taken on trust.
- **The playtest harness caught its own staleness by design.** Its self-check
  against the real function would have gone red the moment the shipped rule
  changed. It moved in the same commit and still reports 548/548, so the rig
  measures the game that ships.
- **Two risks were retired with measurements instead of prose**: the hot-path
  cost (0.21 ms/call, so the ~100x work increase is irrelevant) and the rescue
  claim (83% -> 55%).

## What went wrong

- **A new function was spliced into the middle of another symbol's doc
  comment.** The insertion anchor matched inside a comment block, so
  `ShareStats` lost the first half of its documentation and the new helper
  inherited the second half. Nothing mechanical catches this - prettier, eslint
  and 193 tests are all blind to a comment attached to the wrong symbol. It was
  found only by reading the DIFF, where the mid-paragraph insertion is obvious,
  after reading the FILE had shown nothing wrong. Programmatic edits anchored on
  prose need the diff read back, not the file.
- **The first version of the property test asserted a state it never reached.**
  It checked the qualifying-vs-fallback rule over cold boards only, and the
  fallback branch cannot fire on a cold board. It failed - but only because it
  also counted how many times each branch was exercised and refused to pass on
  zero. Without that anti-vacuity counter it would have gone green while testing
  the fallback rule with no cases at all, which is worse than not testing it.
- **The plan under-estimated the harness work.** The rig update was one plan
  bullet; in practice it needed the baseline row renamed, a new shipped policy
  constant, a shadowed local variable fixed, and the header comment corrected -
  because the rig's vocabulary ("shipped") had been written when the OLD rule was
  shipped. Language that encodes "current" rots the same way copied logic does.

## Lessons

- `anchor-programmatic-edits-on-code-not-prose-and-read-the-diff-back`: a
  scripted insertion anchored on a comment string landed inside another symbol's
  doc block, silently re-attributing documentation to the wrong function. No
  linter or test can see it. When an edit is anchored on prose, verify by reading
  the DIFF (where a mid-paragraph splice is obvious) rather than the file (where
  it reads plausibly). Sharpens
  [[an-edit-you-believe-you-made-is-a-hypothesis-until-the-artifact-shows-it]]:
  the artifact to check is sometimes the diff, not the file.
- `count-both-branches-in-a-property-test-or-it-passes-vacuously`: the hint rule
  has a qualifying path and a fallback path, and the first test only ever reached
  one of them - it was written over cold boards, where the fallback cannot fire.
  It failed loudly only because it counted executions of each branch and asserted
  both were non-zero. Any property test covering two branches should count them
  and fail when either is unexercised; otherwise "all green" can mean "half
  untested".
- `naming-something-shipped-rots-when-the-shipped-thing-changes`: the playtest
  rig called its baseline policy `top-down (shipped)`. When the shipped rule
  became the threshold split, that label was actively false and the row had to be
  renamed to `top-down (was)`. Same failure family as
  [[hand-copied-logic-mirrors-rot-update-them-in-the-same-change]], but in
  vocabulary rather than logic - prefer naming what a thing IS over its current
  status.
