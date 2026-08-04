// The FAQ's guess-budget sentence must FOLLOW `MAX_GUESSES`, not restate it.
//
// The literal it replaces ("You have 25 attempts to find the target.") sat in
// `src/faq.html` where nothing overwrote it, so a reprice would have left the
// FAQ contradicting the game (LESSONS.md:
// hand-copied-logic-mirrors-rot-update-them-in-the-same-change).

import { MAX_GUESSES } from "../src/constants";
import { guessBudgetAnswer } from "../src/faqCopy";

describe("guessBudgetAnswer", () => {
    it("states the budget from MAX_GUESSES", () => {
        expect(guessBudgetAnswer()).toContain(String(MAX_GUESSES));
    });

    it("carries no integer other than MAX_GUESSES", () => {
        // A second number in the sentence would be either a second hardcoded
        // fact or a stale copy of this one. Catches the reprice that edits the
        // constant and leaves a "25" behind in the prose around it.
        const numbers = guessBudgetAnswer().match(/\d+/g) ?? [];
        expect(numbers).toEqual([String(MAX_GUESSES)]);
    });
});
