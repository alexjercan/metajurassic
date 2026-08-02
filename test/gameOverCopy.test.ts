import { MAX_GUESSES, HINT_COST } from "../src/constants";
import { lossSummary, winSummary } from "../src/gameOverCopy";

// The line under the game-over title. `GameState.numberOfGuesses()` folds
// `hintClades.size * HINT_COST` into its total, so the number the modal is
// handed is NOT the number of species the player named - which is what made
// "You used all 25 guesses" a lie for a round that ended on 22 guesses and a
// hint.

describe("game-over copy without hints", () => {
    test("the win line is today's line, unchanged", () => {
        expect(winSummary(4, 0)).toBe(`Solved in 4 / ${MAX_GUESSES} guesses`);
    });

    test("the loss line is today's line, unchanged", () => {
        expect(lossSummary(MAX_GUESSES, 0)).toBe(
            `You used all ${MAX_GUESSES} guesses`
        );
    });
});

describe("game-over copy with hints", () => {
    test("a win names guesses and hints separately", () => {
        // 4 named species plus one hint is 4 + 3 = 7 against the budget.
        const total = 4 + HINT_COST;
        expect(winSummary(total, 1)).toBe(
            `Solved in ${total} / ${MAX_GUESSES}: 4 guesses + 1 hint`
        );
    });

    test("a loss names guesses and hints separately", () => {
        // The reported case: the round ends at the cap, but only 22 of those
        // are guesses.
        expect(lossSummary(MAX_GUESSES, 1)).toBe(
            `You used all ${MAX_GUESSES}: ${MAX_GUESSES - HINT_COST} guesses + 1 hint`
        );
    });

    test("both lines pluralise hints", () => {
        const total = 5 + 2 * HINT_COST;
        expect(winSummary(total, 2)).toBe(
            `Solved in ${total} / ${MAX_GUESSES}: 5 guesses + 2 hints`
        );
        expect(lossSummary(MAX_GUESSES, 2)).toBe(
            `You used all ${MAX_GUESSES}: ${MAX_GUESSES - 2 * HINT_COST} guesses + 2 hints`
        );
    });

    test("a single guess is not pluralised either", () => {
        const total = 1 + HINT_COST;
        expect(winSummary(total, 1)).toBe(
            `Solved in ${total} / ${MAX_GUESSES}: 1 guess + 1 hint`
        );
    });
});
