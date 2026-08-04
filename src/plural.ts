/**
 * Agree a noun with the count printed beside it.
 *
 * Its own leaf module with no imports, rather than an export from
 * `src/gameOverCopy.ts` where it started: the FAQ, the board brief, the share
 * text and the ladder card all need it, and none of them has any other reason
 * to know game-over copy exists. `src/faqCopy.ts` already refuses that exact
 * coupling for `briefCopy()`. See tasks/20260804-155041/DECISION.md.
 *
 * Every plural in `src/` routes through here, including the sites that were
 * already correct with an inline ternary - a helper with exceptions is not a
 * pattern the next reprice will find.
 */
export function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}
