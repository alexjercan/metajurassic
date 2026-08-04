# Pluralize HINT_COST and MAX_GUESSES prose off the constant

- PRIORITY: 20
- TAGS: docs, polish
- KIND: TASK
- ACTIVITY: UNDERSTANDING
- GATES: -
- RESOLUTION: -

## Story

As a player reading any surface that quotes a price or a budget, I want the
sentence to agree with the number it interpolates, so that a reprice to 1 does
not ship "costs 1 guesses".

## Context

Raised as R1.3 in `tasks/20260804-151357/REVIEW.md` and deliberately not fixed
there: the finding is about a repository-wide pattern, not that diff.

Every surface that interpolates `HINT_COST` or `MAX_GUESSES` into prose
hardcodes the plural noun:

- `src/faqCopy.ts:24` - `A hint costs ${HINT_COST} guesses.`
- `src/ui/onboarding.ts:27,132` - the same sentence shape, twice.

`src/shareText.ts:108-114` already does this correctly and is the pattern to
copy. The current values (`HINT_COST` 2, `MAX_GUESSES` > 1) mean nothing is
wrong on screen today; the defect is latent and only fires on a reprice.

The tests do not guard it. `test/faqCopy.test.ts` asserts the integer appears,
not the noun agreement, so all three surfaces stay green through a reprice
to 1.

Fixing one surface and not the others is worse than fixing none - the reason
R1.3 was held at NIT - so this task covers all three together.
