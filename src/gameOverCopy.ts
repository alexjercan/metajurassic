import { HINT_COST, MAX_GUESSES } from "./constants";
import { plural } from "./plural";

// The summary line under the game-over title.
//
// `guessCount` is what `GameState.numberOfGuesses()` reports, which already
// folds `hintClades.size * HINT_COST` into the total - so it is the budget
// spent, not the number of species named. Without that split, a round that
// ended on 22 guesses and one hint said "You used all 25 guesses", naming three
// guesses the player never made.

// "4 guesses + 1 hint": the two halves of a spent budget, named separately.
function split(guessCount: number, hintCount: number): string {
    const named = guessCount - hintCount * HINT_COST;
    return `${plural(named, "guess", "guesses")} + ${plural(hintCount, "hint", "hints")}`;
}

export function winSummary(guessCount: number, hintCount: number): string {
    if (hintCount <= 0) {
        // The noun agrees with the DENOMINATOR, which is what it names: "1 / 25
        // guesses", not "1 / 25 guess". At MAX_GUESSES 1 the only reachable
        // numerator is 1 too, so the choice never shows on screen.
        return `Solved in ${guessCount} / ${plural(MAX_GUESSES, "guess", "guesses")}`;
    }
    return `Solved in ${guessCount} / ${MAX_GUESSES}: ${split(guessCount, hintCount)}`;
}

export function lossSummary(guessCount: number, hintCount: number): string {
    if (hintCount <= 0) {
        return `You used all ${plural(MAX_GUESSES, "guess", "guesses")}`;
    }
    return `You used all ${MAX_GUESSES}: ${split(guessCount, hintCount)}`;
}
