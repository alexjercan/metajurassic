import { formatCountdown, msUntilNextPuzzle } from "../src/countdown";
import { expectPinnedZone } from "./timeZone";

// The wait until tomorrow's puzzle. The boundary is the LOCAL midnight
// `seedToDate`/`dateToSeed` use, so the countdown reaches zero exactly when the
// daily key changes - including on the 23h and 25h nights, where
// `now + 86400000` would be an hour out.

const msPerHour = 1000 * 60 * 60;

describe("msUntilNextPuzzle", () => {
    test("the suite really is running in a zone that shifts", () => {
        expectPinnedZone();
    });

    test("a whole-hour remainder on an ordinary day", () => {
        expect(msUntilNextPuzzle(new Date(2026, 5, 15, 18, 0, 0))).toBe(
            6 * msPerHour
        );
    });

    test("a sub-minute remainder", () => {
        expect(msUntilNextPuzzle(new Date(2026, 5, 15, 23, 59, 12))).toBe(
            48 * 1000
        );
    });

    test("local midnight itself is a whole day away, not zero", () => {
        // The instant the puzzle rolls over is the START of the new day, so the
        // countdown restarts at the full night rather than sticking at 0.
        expect(msUntilNextPuzzle(new Date(2026, 5, 15, 0, 0, 0))).toBe(
            24 * msPerHour
        );
    });

    test("the 23h spring-forward day still ends at the next local midnight", () => {
        // 2026-03-29 is the spring-forward Sunday in the pinned zone, and the
        // clocks jump at 03:00, so the reading has to be taken BEFORE that or
        // the transition is already spent and both forms agree (which is how
        // an evening sample passes against the broken arithmetic).
        //
        // The day is 23h long, so from 01:00 there are 22h left;
        // `now + 86400000` lands at 02:00 on Mar 30 and the countdown would
        // still read 2h at the moment the daily key changed.
        const beforeShift = new Date(2026, 2, 29, 1, 0, 0);
        const ms = msUntilNextPuzzle(beforeShift);

        expect(ms).toBe(22 * msPerHour);
        expect(new Date(beforeShift.getTime() + ms).getTime()).toBe(
            new Date(2026, 2, 30).getTime()
        );
    });

    test("the 25h fall-back day still ends at the next local midnight", () => {
        // 2026-10-25 is the fall-back Sunday, clocks going back at 04:00; read
        // at 02:00, before the repeated hour. The day is 25h long, so 23h
        // remain, while `now + 86400000` hits zero at 01:00 on Oct 26 - an hour
        // EARLY, promising a puzzle that is not there yet.
        const beforeShift = new Date(2026, 9, 25, 2, 0, 0);
        const ms = msUntilNextPuzzle(beforeShift);

        expect(ms).toBe(23 * msPerHour);
        expect(new Date(beforeShift.getTime() + ms).getTime()).toBe(
            new Date(2026, 9, 26).getTime()
        );
    });

    test("every day of 2026 counts down to its own next local midnight", () => {
        // Read at 01:30, not in the evening: both DST transitions in this zone
        // happen in the small hours, so an evening sample sits AFTER them and
        // agrees with the broken arithmetic on all 365 days.
        const offenders: string[] = [];
        const cursor = new Date(2026, 0, 1);
        while (cursor.getFullYear() === 2026) {
            const evening = new Date(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate(),
                1,
                30
            );
            const landed = new Date(
                evening.getTime() + msUntilNextPuzzle(evening)
            );
            const tomorrow = new Date(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate() + 1
            );
            if (landed.getTime() !== tomorrow.getTime()) {
                offenders.push(`${evening.toString()} -> ${landed.toString()}`);
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        expect(offenders).toEqual([]);
    });
});

describe("formatCountdown", () => {
    test("pads every field to two digits", () => {
        expect(formatCountdown(3 * msPerHour + 4 * 60 * 1000 + 5000)).toBe(
            "03:04:05"
        );
    });

    test("a full day reads as 24 hours rather than rolling over to zero", () => {
        expect(formatCountdown(24 * msPerHour)).toBe("24:00:00");
    });

    test("a sub-second remainder truncates towards zero", () => {
        expect(formatCountdown(1999)).toBe("00:00:01");
    });

    test("zero and negative remainders clamp", () => {
        expect(formatCountdown(0)).toBe("00:00:00");
        expect(formatCountdown(-5000)).toBe("00:00:00");
    });
});
