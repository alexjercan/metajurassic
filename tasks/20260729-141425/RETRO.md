# Retro: Filter the species archive by clade

- TASK: 20260729-141425
- BRANCH: feat/archive-clade-filter
- REVIEW ROUNDS: 4

## What went well

The plan was unusually specific and it paid. Step 4 named
`src/profile/dinosaurList.ts:48` as a defect not to copy, and Step 6 named
`src/ui/card.ts:117` as a builder not to touch because the in-round panel shares
it - both were followed, and neither mistake happened. Naming the wrong code by
`file:line` in the plan turned out to be worth more than describing the right
code.

Content assertions ran against the real `src/jurassic/index.json` rather than a
fixture, and the counts (35 members across 22 immediate clades, none of them
Cerapoda) were re-derived independently in review rather than read back from the
implementation. A mock could not have shown the property the feature exists for.

The presentation decision was settled with the user before implementation and
recorded with its rejected alternatives, so no review round relitigated it.

## What went wrong

Three rounds, three sets of real defects, and each round's fix seeded the next
round's finding. The chain is one root cause:

- R1.1: the carousel-nav restructuring shipped with no test.
- R2.1: the fix for R1.1 deleted `carousel.scrollLeft = 0` on the claim that
  `innerHTML = ""` already clamps the scroll to 0, and wrote that claim into the
  code comment AND into plan Step 4.
- R3.1: the fix for R2.1 restored the line but claimed the test now pinned it.
  It does not.

Every one of those was a statement about browser behaviour inferred from whether
a test was green, not from the mechanism. The R2.1 case is the sharp one: the
evidence was "I removed the line and the test still passed", which is equally
consistent with the line being dead and with something else incidentally masking
its absence. It was the second. `shrinkCardTitle` forces a layout after the
first card is appended, and that flush is what clamps the position - a coupling
`renderCards` never declared. A synthetic-box probe took about two minutes when
it was finally run in round 2, and it falsified the claim immediately.

The decision seemed sound at the time because deleting the line was the
conservative-looking move: AGENTS.md is strict that a comment describing
behaviour that does not ship must be deleted outright, and the line looked like
exactly that. The rule was right; the premise fed into it was not.

Scope also grew twice for the same reason, both times legitimately. The footer's
fourth link cost the onboarding brief 12px at 320px, and `/clades` cards turned
out to already overflow their carousel, so the new members link landed in a
clipped dead zone. Both were consequences of shared, fixed-height page budgets
that no Step owned.

## What to improve next time

- When a test's greenness is the evidence for a claim about a platform or
  browser mechanism, change the line the claim is about and watch the test go
  red before believing it. A passing test after a deletion is not evidence the
  deleted code was dead.
- Do not amend a plan Step on an unprobed mechanism claim. Correcting a Step is
  legitimate when the code contradicts it, but the contradiction has to be
  demonstrated, not inferred.
- A `page-fixed` height budget is a shared resource. Any Step that adds chrome
  to a shared partial - a footer link, a filter row, a card affordance - should
  check it against the smallest supported viewport up front. Step 8 anticipated
  this for `/species` and missed it for the footer and for `/clades`.

## Diagnose

- **Breadth.** The diff is large for the Story (about 1005 insertions), but it
  did not grow from a missed split. Roughly half is tests and task records, and
  the code is a pure module, one page rework, one link, one footer entry and the
  CSS to hold them. What genuinely widened it was the shared height budget:
  fixing `/species` exposed that `/clades` and the narrow-viewport override were
  paying into the same pot, so a card-sizing change that started on one page
  ended up owned by both. That was the right call, not scope creep - the
  alternative was leaving this task's own route untappable on a phone.
- **Churn.** The plan-time question that would have prevented the rework is not
  in `plan` at all: every round of churn came from a mechanism assumed rather
  than probed during `work`. The plan's Steps were accurate; Step 4's original
  instruction to reset `scrollLeft` was correct and was wrongly overridden
  mid-flight. If anything the lesson runs the other way - the plan was right and
  the implementation talked itself out of it.
- **Context.** No context pressure was observed. No checkpoint, compaction
  warning or handoff occurred. Two review rounds were delegated to bounded
  out-of-context subagents by the review skill's default, which worked well:
  both returned findings the in-session pass had missed, and round 2's finding
  reversed an in-session decision that the in-session pass had been confident
  about.

## Action items

- None blocking. R3.2's removal of the superseded `.archive-card` height budget
  already cleaned up the last artifact of the shared-budget confusion.
- Follow-up left open deliberately by the task, not by this retro: cross-links
  between `/species` and `/clades` are still deferred, and `/clades` remains
  reachable only through the FAQ.
