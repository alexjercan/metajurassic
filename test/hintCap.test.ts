// MAX_HINTS: the per-round hint cap. -1 means uncapped, which is what ships
// today; any positive integer caps the round.
//
// The cap exists because the SECOND hint collapses a round to ~4% loss at every
// fraction and every price - no price fixes that, only a cap does. It ships
// switched off so closing that collapse after real play is a constant change
// rather than a redesign. See tasks/20260729-141424/DECISION.md.
//
// Testing a POSITIVE cap means re-importing the modules with a different
// constant, since MAX_HINTS is a compile-time constant by design (a knob, not
// runtime configuration). `jest.isolateModules` + `jest.doMock` does that
// without making the production code configurable for the tests' benefit.

import { buildGameData } from "../src/jsonLoader";
import { GameState } from "../src/gameState";
import { MAX_HINTS, HINT_COST, MAX_GUESSES } from "../src/constants";
import rawGameData from "../src/jurassic/index.json";

const data = buildGameData(rawGameData);
const target = data.species[0];

describe("MAX_HINTS as shipped (-1, uncapped)", () => {
    test("the shipped value is uncapped", () => {
        expect(MAX_HINTS).toBe(-1);
    });

    test("hintsRemaining is unbounded", () => {
        const state = new GameState(data, target.id);
        expect(state.hintsRemaining()).toBe(Infinity);

        state.hintClades.add("a");
        state.hintClades.add("b");
        expect(state.hintsRemaining()).toBe(Infinity);
    });

    test("canUseHint tracks the guess budget alone", () => {
        const state = new GameState(data, target.id);
        expect(state.canUseHint()).toBe(true);

        // Spend down to fewer than HINT_COST guesses left.
        const affordable = Math.floor(MAX_GUESSES / HINT_COST);
        for (let i = 0; i < affordable; i++) state.hintClades.add(`hint${i}`);

        expect(state.guessesLeft()).toBeLessThan(HINT_COST);
        expect(state.canAffordHint()).toBe(false);
        expect(state.canUseHint()).toBe(false);
    });
});

describe("MAX_HINTS set to a positive cap", () => {
    // Re-import gameState with MAX_HINTS = 1 so the cap path is really executed
    // rather than argued about.
    type GameStateModule = typeof import("../src/gameState");

    function withCap(cap: number): GameStateModule {
        let mod: GameStateModule | undefined;
        jest.isolateModules(() => {
            jest.doMock("../src/constants", () => ({
                ...jest.requireActual<typeof import("../src/constants")>(
                    "../src/constants"
                ),
                MAX_HINTS: cap,
            }));
            mod = require("../src/gameState") as GameStateModule;
        });
        if (!mod) throw new Error("gameState did not load under the mock");
        return mod;
    }

    afterEach(() => {
        jest.resetModules();
        jest.dontMock("../src/constants");
    });

    test("a cap of 1 allows exactly one hint", () => {
        const { GameState: Capped } = withCap(1);
        const state = new Capped(data, target.id);

        expect(state.hintsRemaining()).toBe(1);
        expect(state.canUseHint()).toBe(true);

        state.useHint(data.lineage(target.clade)[0]);

        expect(state.hintsRemaining()).toBe(0);
        expect(state.canUseHint()).toBe(false);
        // Still affordable - the cap is what stops it, not the budget.
        expect(state.canAffordHint()).toBe(true);
    });

    test("buying past the cap throws, and says why", () => {
        const { GameState: Capped } = withCap(1);
        const state = new Capped(data, target.id);
        const lineage = data.lineage(target.clade);

        state.useHint(lineage[0]);
        expect(() => state.useHint(lineage[1])).toThrow(/no hints left/i);
    });

    test("a cap of 0 refuses every hint", () => {
        const { GameState: Capped } = withCap(0);
        const state = new Capped(data, target.id);

        expect(state.hintsRemaining()).toBe(0);
        expect(state.canUseHint()).toBe(false);
        expect(() => state.useHint(data.lineage(target.clade)[0])).toThrow(
            /no hints left/i
        );
    });
});
