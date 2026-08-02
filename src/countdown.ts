// How long until the next daily puzzle, and how to say it.
//
// The boundary is the next LOCAL midnight, reached by calendar-field
// arithmetic - the same form `seedToDate` and `localDayIndex` use in
// `gameData.ts`, and for the same reason. `now + 86400000` is an hour out on
// the 23h and 25h nights around a DST transition, so it would either reach zero
// before the daily key changed or keep counting after it had.

export function msUntilNextPuzzle(now: Date): number {
    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );
    return Math.max(0, nextMidnight.getTime() - now.getTime());
}

// `HH:MM:SS`. Hours are not capped at 24 and not rolled over: the remainder is
// under a day by construction, and a wall-clock-style rollover would print
// "00:00:00" for a whole day away.
export function formatCountdown(ms: number): string {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
