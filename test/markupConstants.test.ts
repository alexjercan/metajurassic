// No page template may state a game constant as a literal.
//
// The DoD for this task is a hand-run grep, and a hand-run grep is evidence for
// one moment, not a guard (LESSONS.md: a-guard-no-test-can-fail-is-a-comment;
// same reasoning `test/lintGate.test.ts` records). Nothing stops the next
// change from typing "You have 25 attempts" back into a page, so the check runs
// every CI instead.
//
// Scope is the page templates only. They are the surfaces no test renders
// against the constant: `.ts` prose comments and E2E fixtures that name 25 are
// narrative or expectations, not player-facing copy, and stay.

import * as fs from "fs";
import * as path from "path";
import { MAX_GUESSES, HINT_COST } from "../src/constants";

const srcDir = path.join(__dirname, "..", "src");

// Enumerated from a real readdir, not a hardcoded list, so a NEW page template
// is covered the day it lands (LESSONS.md: absence-needs-an-enumerated-scope).
const templates = fs.readdirSync(srcDir).filter((f) => f.endsWith(".html"));

describe("page templates", () => {
    it("enumerates the templates it is about to check", () => {
        // A glob that matches nothing passes every absence assertion below
        // vacuously. Assert the scope is real before asserting over it.
        expect(templates.length).toBeGreaterThan(0);
    });

    // Built FROM the constants, so a reprice moves the guard with the game
    // rather than leaving it pinned to 25 and 3.
    const forbidden = [
        {
            what: "the guess budget",
            pattern: new RegExp(`\\b${MAX_GUESSES}\\b`),
        },
        {
            what: "the hint price",
            pattern: new RegExp(`\\b${HINT_COST} [Gg]uesses\\b`),
        },
    ];

    // The fix when one of these fires is always the same: ship the element
    // empty and let the code that owns the constant fill it - `updateUI()` and
    // `updateHintButton()` in `src/game/index.ts` for the board, `src/faq.ts`
    // via `guessBudgetAnswer()` for the FAQ.
    describe.each(forbidden)("$what", ({ pattern }) => {
        it.each(templates)("is not a literal in %s", (file) => {
            const markup = fs.readFileSync(path.join(srcDir, file), "utf8");
            // Asserted as the matched TEXT rather than a bare boolean, so a
            // failure names what it found instead of "expected false to be
            // true".
            expect(pattern.exec(markup)?.[0] ?? null).toBeNull();
        });
    });
});
