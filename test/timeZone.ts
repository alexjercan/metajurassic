// The time zone the suite runs in, and a guard that proves it.
//
// `test/setTimeZone.js` (jest globalSetup) pins the run to a DST-observing
// zone. Specs that assert DST behaviour call `expectPinnedZone()` first,
// because the failure mode of a zone-dependent test is silence: run it in UTC
// and every DST assertion passes without ever crossing a transition. The guard
// turns "the pin was lost" into a red test instead of a green vacuum.
export const PINNED_ZONE = "Europe/Bucharest";

// Sanity: a spring-forward and a fall-back Sunday in the pinned zone. If the
// zone were UTC (or any non-shifting one) these local midnights would be a
// plain 24h apart from the day before, and the assertions below would not.
export function expectPinnedZone(): void {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(PINNED_ZONE);

    const msPerHour = 1000 * 60 * 60;
    const springForward =
        (new Date(2026, 2, 30).getTime() - new Date(2026, 2, 29).getTime()) /
        msPerHour;
    const fallBack =
        (new Date(2026, 9, 26).getTime() - new Date(2026, 9, 25).getTime()) /
        msPerHour;

    expect([springForward, fallBack]).toEqual([23, 25]);
}
