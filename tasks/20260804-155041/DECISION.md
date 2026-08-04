# Decision: Pluralize HINT_COST and MAX_GUESSES prose off the constant

- DATE: 20260804-161409
- STATUS: ACCEPTED
- TASK: 20260804-155041
- TAGS: copy, module-boundary

## Context

Nine prose sites interpolate a count and hardcode its noun's plural. Fixing
them needs one agreement helper. One already exists, module-private, at
`src/gameOverCopy.ts:11-13`. Four of the five files that need it -
`faqCopy.ts`, `ui/onboarding.ts`, `shareText.ts`, `ui/ladderCard.ts` - have no
current reason to know `gameOverCopy.ts` exists. `src/faqCopy.ts:6-11` already
records the repo's stance on exactly this shape: it refuses to import
`briefCopy()` from `src/ui/onboarding.ts` because "the shared thing is
`MAX_GUESSES`, not the sentence", and importing would drag an unrelated
module's dependencies into the FAQ bundle. The same argument applies here: the
shared thing is a three-line string function, not game-over copy.

## Decision

The helper moves to a new `src/plural.ts` exporting
`plural(count, one, many): string`, lifted verbatim from `gameOverCopy.ts`.
Every plural in `src/` routes through it, including the four sites
(`shareText.ts:108,114`, `ladderCard.ts:17,19`) that already agree correctly
with their own inline ternary.

Built from scratch under today's constraints this is the same answer: a leaf
module with no imports, depended on by five copy modules that must not depend
on each other. The signature is unchanged from the private original, so
`gameOverCopy.ts`'s two `split()` call sites keep working as written.

Routing the already-correct sites through it is part of the decision, not
polish. A helper with four exceptions is not a pattern the next change will
find; the point of the task is that the next reprice cannot introduce a
disagreement, and that only holds if there is one obvious place to look.

## Alternatives considered

- **Export `plural()` from `src/gameOverCopy.ts`.** No new file, one line of
  diff. Rejected: it makes the FAQ, the onboarding board, the share text and
  the ladder card import game-over copy for a string utility, which is the
  coupling `src/faqCopy.ts:6-11` already argues against by name, and it points
  the next reader at the wrong owner.
- **Inline the ternary at each of the nine sites.** No module, no import.
  Rejected: it is the pattern that produced the defect - nine places to get
  right, no single place a reprice review can check.
- **Do nothing.** Nothing is wrong on screen: `MAX_GUESSES` is 25 and
  `HINT_COST` is 3. Rejected: deferring costs a silent "costs 1 guesses" on a
  reprice to 1, and the existing tests assert the integer, not the noun, so
  they stay green through it. That is the whole finding (R1.3 in
  `tasks/20260804-151357/REVIEW.md`).

## Consequences

Easier: one reprice touches `src/constants.ts` only, and one grep
(`plural(`) enumerates every agreeing sentence in the repo.

Harder: a new one-function module for three lines, which reads as
over-modularization out of context - this record is the context. Eight
production files churn for zero visible change today, so the diff is larger
than the defect it closes; the guard test is what justifies the size. The
helper pins an English one/many split - a language with a third form, or a
noun whose plural is not a suffix, needs a different helper. Not a constraint
for this repo.
