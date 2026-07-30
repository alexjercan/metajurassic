// The daily localStorage key, recomputed from scratch.
//
// This is a HAND-COPY of getTodaySeed()/gameStateKey()/formatPuzzleId
// (src/gameState.ts) and dateToSeed() (src/gameData.ts), and it has to be: it
// is serialized into the browser by `page.evaluate`, so it may not reference
// imports or module scope, and it must read the SAME frozen `new Date()` the
// app under test sees rather than a seed computed in the node process.
//
// Hand-copies rot (LESSONS.md:
// `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`), so it lives
// in its own file with `test/dailyKeyMirror.test.ts` checking it against the
// real functions over a year of dates, at the hours where a formula change
// actually shows. Change the originals and that test goes red instead of the
// E2E suite silently asserting against a key nothing writes.
export function dailyKeyForNow(): string {
    const msPerDay = 1000 * 60 * 60 * 24;
    // Which calendar day an instant falls on, as a zone-free integer.
    const dayIndex = (date: Date): number =>
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
        msPerDay;

    const firstDay = new Date(2026, 0, 1);
    const seed = dayIndex(new Date()) - dayIndex(firstDay) + 1;

    // Mirror formatPuzzleId's modulus wrap so this stays an exact copy of the
    // app's key even at the residue-99999 edge (unreachable for daily seeds,
    // but the mirror must not silently diverge from source).
    const modulus = Math.pow(10, 5);
    const index = ((seed % modulus) + modulus) % modulus;
    const display = (index + 1) % modulus;
    return `gameState-dinosaur-#${display.toString().padStart(5, "0")}`;
}
