// Every e2e spec that opens the daily page must pin the clock.
//
// A spec that calls `page.goto("/")` on the real clock plays whatever puzzle
// today's date seeds, so its verdict depends on the calendar rather than on
// the code. That is not hypothetical: on 2026-08-04 the daily target WAS
// Ceratosaurus, which is what `guessFirstSuggestion(page, "saurus")` always
// guesses, so three specs won the round on guess 1 and then timed out clicking
// through the win modal. The same suite was green on 2026-07-29. See
// tasks/20260804-000316/DECISION.md.
//
// No runtime test can hold this property - the suite is green on the days it
// happens to be green - so the guard has to read the sources, exactly as
// `test/lintGate.test.ts` does for the shape of the check gate
// (`LESSONS.md`: a-guard-no-test-can-fail-is-a-comment).
//
// Granularity is deliberately file-level. Detecting "this `describe` lacks a
// `beforeEach`" textually is more machinery than the property is worth; a new
// spec file is the case that actually recurs.

import * as fs from "fs";
import * as path from "path";

const e2eDir = path.join(__dirname, "..", "e2e");

const specs = fs
    .readdirSync(e2eDir)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => ({
        name,
        source: fs.readFileSync(path.join(e2eDir, name), "utf8"),
    }));

describe("e2e specs that open the daily page", () => {
    it("finds spec files to check at all", () => {
        // A rename of the directory or the suffix would otherwise make this
        // whole file vacuously green.
        expect(specs.length).toBeGreaterThan(0);
    });

    it("pin the daily clock", () => {
        const opensDailyPage = specs.filter((spec) =>
            spec.source.includes('goto("/")'),
        );
        expect(opensDailyPage.length).toBeGreaterThan(0);

        const unpinned = opensDailyPage
            .filter((spec) => !spec.source.includes("pinDailyClock"))
            .map((spec) => spec.name);

        expect(unpinned).toEqual([]);
    });

    it("do not carry their own copy of the pinned date", () => {
        // The date is a fixture input, so it is named once in
        // `e2e/helpers/clock.ts`. Five specs used to repeat the literal.
        const withOwnDate = specs
            .filter((spec) => /\d{4}-\d{2}-\d{2}T/.test(spec.source))
            .map((spec) => spec.name);

        expect(withOwnDate).toEqual([]);
    });
});
