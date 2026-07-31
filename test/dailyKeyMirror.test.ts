import { dailyKeyForNow } from "../e2e/dailyKeyMirror";
import { gameStateKey, getTodaySeed } from "../src/puzzleKey";
import { expectPinnedZone } from "./timeZone";

// `e2e/dailyKeyMirror.ts` hand-copies the daily key formula because it is
// serialized into the browser and cannot import the real thing. This pins the
// copy to the original, so a change to the seed or key formula reddens here
// rather than quietly making the E2E suite assert against a key nothing writes.
// See LESSONS.md: hand-copied-logic-mirrors-rot-update-them-in-the-same-change.

describe("the E2E daily-key mirror tracks the shipped formula", () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    // Sampled at the day's EDGES, not just at noon: two seed formulas that
    // differ by an hour after a DST shift still agree at midday. A noon-only
    // version of this test passed against a deliberately reverted
    // `dateToSeed`, which is how that gap was found.
    function everyHourWorthChecking(): Date[] {
        const instants: Date[] = [];
        const cursor = new Date(2026, 0, 1);
        while (cursor.getFullYear() === 2026) {
            for (const hour of [0, 1, 12, 23]) {
                instants.push(
                    new Date(
                        cursor.getFullYear(),
                        cursor.getMonth(),
                        cursor.getDate(),
                        hour
                    )
                );
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return instants;
    }

    test("agrees with gameStateKey(getTodaySeed()) all year", () => {
        expectPinnedZone();

        const mismatches: string[] = [];
        for (const instant of everyHourWorthChecking()) {
            jest.useFakeTimers({ now: instant });
            const real = gameStateKey(getTodaySeed(), "daily");
            const mirrored = dailyKeyForNow();
            if (real !== mirrored) {
                mismatches.push(`${instant.toString()}: ${real} != ${mirrored}`);
            }
        }

        expect(mismatches).toEqual([]);
    });
});
