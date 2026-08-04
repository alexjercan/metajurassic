import { MAX_GUESSES, HINT_COST } from "./constants";
import { plural } from "./plural";

/**
 * FAQ answer fragments whose numbers come from the constants that define them.
 *
 * Pure and DOM-free so Jest can cover it; `src/faq.ts` next door does the
 * mounting. Deliberately NOT `briefCopy()` from `src/ui/onboarding.ts`: the
 * shared thing is `MAX_GUESSES`, not the sentence, and importing it would drag
 * the onboarding DOM builders into the FAQ bundle and let a board wording
 * change silently rewrite the FAQ. See tasks/20260729-212757/DECISION.md.
 */

// Closes the "How do I play?" answer. The count is interpolated rather than
// typed in, because nothing on this static page overwrites it - the literal
// this replaces would simply have gone stale on a reprice.
export function guessBudgetAnswer(): string {
    return `You have ${plural(MAX_GUESSES, "attempt", "attempts")} to find the target.`;
}

// Closes the "I am stuck" answer. Same reasoning as the budget above, and the
// same guard: `test/markupConstants.test.ts` forbids the price as a literal in
// any page template, so the sentence has to be built from HINT_COST here.
export function hintCostAnswer(): string {
    return `A hint costs ${plural(HINT_COST, "guess", "guesses")}.`;
}
