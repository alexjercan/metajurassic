import { Page } from "@playwright/test";

// The one day the daily page is played on. Every spec that opens `/` runs on
// this date, so the puzzle under test is a property of the content rather than
// of the calendar. See tasks/20260804-000316/DECISION.md; `test/dailyClockPin.
// test.ts` holds the rule that no spec opens the daily page without it.
export const PINNED_DAY = "2026-06-15T12:00:00";

// `install`, NOT `pauseAt`. Time has to keep advancing: the autocomplete's
// 100ms blur timer and the tree settle waits never fire under a stopped clock.
// A spec that needs a frozen instant pauses on top of this - see
// `e2e/postgame.spec.ts`'s countdown suite, which is the only such case.
export async function pinDailyClock(page: Page): Promise<void> {
    await page.clock.install({ time: new Date(PINNED_DAY) });
}

// Same pinned calendar day, a different wall time. `pauseAt` fast-forwards TO
// the given moment and rejects one already behind the running clock, so a
// paused spec cannot reuse `PINNED_DAY` itself. Derived here so the two cannot
// drift onto different days and silently change the daily storage key.
export function pinnedDayAt(time: string): Date {
    return new Date(`${PINNED_DAY.split("T")[0]}T${time}`);
}
