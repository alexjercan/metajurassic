import { dateToSeed, seedToDate } from "../src/gameData";
import { expectPinnedZone } from "./timeZone";

// Seed <-> date conversion across a daylight-saving transition.
//
// The suite is pinned to a DST-observing zone by test/setTimeZone.js; these
// assertions are meaningless without it (CI's own zone is UTC, which never
// shifts), so the first test proves the pin is in place.

// Every local midnight in 2026, as `[year, month, day]` triples. Built with
// setDate so it walks CALENDAR days rather than 24h steps - the distinction
// this whole file is about.
function everyDayOf2026(): Array<[number, number, number]> {
    const days: Array<[number, number, number]> = [];
    const cursor = new Date(2026, 0, 1);
    while (cursor.getFullYear() === 2026) {
        days.push([cursor.getFullYear(), cursor.getMonth(), cursor.getDate()]);
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

describe("seed <-> date across DST", () => {
    test("the suite really is running in a zone that shifts", () => {
        expectPinnedZone();
    });

    test("every day of 2026 round-trips to its own local midnight", () => {
        const offenders = everyDayOf2026()
            .map(([y, m, d]) => {
                const midnight = new Date(y, m, d);
                return {
                    midnight,
                    roundTripped: seedToDate(dateToSeed(midnight)),
                };
            })
            .filter(
                ({ midnight, roundTripped }) =>
                    roundTripped.getTime() !== midnight.getTime()
            )
            .map(
                ({ midnight, roundTripped }) =>
                    `${midnight.toString()} -> ${roundTripped.toString()}`
            );

        expect(offenders).toEqual([]);
    });

    test("a mid-day timestamp still maps to that day's midnight", () => {
        // The app converts `new Date()` - an arbitrary instant, not midnight -
        // so the seed must depend only on which calendar day that instant
        // falls in. The hours sampled straddle midnight, where the drift
        // showed; a noon-only sample agrees even with the broken arithmetic.
        const mismatches = everyDayOf2026()
            .flatMap(([y, m, d]) =>
                [0, 1, 12, 23].map((hour) => new Date(y, m, d, hour))
            )
            .filter((instant) => {
                const midnight = new Date(
                    instant.getFullYear(),
                    instant.getMonth(),
                    instant.getDate()
                );
                return (
                    seedToDate(dateToSeed(instant)).getTime() !==
                    midnight.getTime()
                );
            })
            .map((instant) => instant.toString());

        expect(mismatches).toEqual([]);
    });

    test("the reported 2026-07-29 EEST case dates today as today", () => {
        // Observed on 2026-07-29 in EEST: seedToDate(dateToSeed(midnight)) was
        // Jul 28 01:00, so the profile dated today's daily game as yesterday.
        const seed = dateToSeed(new Date(2026, 6, 29, 15, 42));
        const dated = seedToDate(seed);

        expect(seed).toBe(210);
        expect(dated.getFullYear()).toBe(2026);
        expect(dated.getMonth()).toBe(6);
        expect(dated.getDate()).toBe(29);
        expect(dated.getHours()).toBe(0);
    });

    test("the anchor day is seed 1", () => {
        expect(dateToSeed(new Date(2026, 0, 1))).toBe(1);
    });
});
