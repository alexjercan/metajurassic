// The one place a count meets its noun. Three cases, because the singular is
// the only one the shipped constants never reach: HINT_COST is 3 and
// MAX_GUESSES is 25, so `plural(1, ...)` is exercised here or nowhere.

import { plural } from "../src/plural";

describe("plural", () => {
    test("one takes the singular", () => {
        expect(plural(1, "guess", "guesses")).toBe("1 guess");
    });

    test("many takes the plural", () => {
        expect(plural(3, "guess", "guesses")).toBe("3 guesses");
    });

    // English agrees zero with the plural, and `split()` in
    // `src/gameOverCopy.ts` really renders it: a round won entirely on hints
    // names "0 guesses + 1 hint".
    test("zero takes the plural", () => {
        expect(plural(0, "guess", "guesses")).toBe("0 guesses");
    });
});
