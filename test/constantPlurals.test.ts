// A sentence that interpolates a count must agree with it.
//
// Nothing is wrong on screen at the shipped values - HINT_COST is 3 and
// MAX_GUESSES is 25 - so this is a latent defect that only fires on a reprice
// to 1, and no existing test would catch it: they assert the integer appears,
// not the noun beside it. Raised as R1.3/R2.3 in
// tasks/20260804-151357/REVIEW.md.
//
// Two halves, because neither is sufficient alone. The SOURCE SCAN is the only
// check that reaches the how-to-play card template
// (`src/ui/onboarding.ts:127,132`), which `testEnvironment: "node"` puts out of
// unit-test reach, but it only proves the shape is absent. The REPRICE half
// proves the sentences are actually right at 1, but only for the modules a
// node test can import.

import * as fs from "fs";
import * as path from "path";

const srcDir = path.join(__dirname, "..", "src");

// A real readdir, not a hardcoded list, so a NEW copy module is covered the day
// it lands (LESSONS.md: absence-needs-an-enumerated-scope). `src/ui`,
// `src/game` and `src/profile` are subdirectories, so the walk recurses.
function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return entry.name.endsWith(".ts") ? [full] : [];
    });
}

const sources = sourceFiles(srcDir);

// An interpolation followed by a bare count noun: the shape that hardcodes a
// plural the number beside it may not have. The fix is always `plural()` from
// `src/plural.ts`.
const HARDCODED_PLURAL =
    /\$\{[^}]*\} (guess|guesses|hint|hints|attempt|attempts)\b/;

describe("no source file hardcodes the noun beside an interpolated count", () => {
    it("enumerates the files it is about to check", () => {
        // A walk that returns nothing passes every absence assertion below
        // vacuously. Assert the scope is real before asserting over it.
        expect(sources.length).toBeGreaterThan(0);
    });

    it.each(sources.map((f) => path.relative(srcDir, f)))(
        "src/%s builds its plurals from the count",
        (relative) => {
            const source = fs.readFileSync(path.join(srcDir, relative), "utf8");
            // Asserted as the matched TEXT rather than a bare boolean, so a
            // failure names the site instead of "expected false to be true".
            expect(HARDCODED_PLURAL.exec(source)?.[0] ?? null).toBeNull();
        }
    );
});

// Re-import the copy modules with both constants forced to 1. They are
// compile-time constants by design, so `jest.isolateModules` + `jest.doMock` is
// how the singular branch is really executed rather than argued about - the
// same rig `test/hintCap.test.ts` uses for MAX_HINTS.
describe("every constant-reading sentence reads in the singular at 1", () => {
    interface RepricedModules {
        faqCopy: typeof import("../src/faqCopy");
        onboarding: typeof import("../src/ui/onboarding");
        gameOverCopy: typeof import("../src/gameOverCopy");
        shareText: typeof import("../src/shareText");
        gameState: typeof import("../src/gameState");
    }

    function reprice(): RepricedModules {
        let mods: RepricedModules | undefined;
        jest.isolateModules(() => {
            jest.doMock("../src/constants", () => ({
                ...jest.requireActual<typeof import("../src/constants")>(
                    "../src/constants"
                ),
                HINT_COST: 1,
                MAX_GUESSES: 1,
            }));
            mods = {
                faqCopy: require("../src/faqCopy"),
                onboarding: require("../src/ui/onboarding"),
                gameOverCopy: require("../src/gameOverCopy"),
                shareText: require("../src/shareText"),
                gameState: require("../src/gameState"),
            };
        });
        if (!mods) throw new Error("copy modules did not load under the mock");
        return mods;
    }

    afterEach(() => {
        jest.resetModules();
        jest.dontMock("../src/constants");
    });

    test("the FAQ answers", () => {
        const { faqCopy } = reprice();
        expect(faqCopy.guessBudgetAnswer()).toBe(
            "You have 1 attempt to find the target."
        );
        expect(faqCopy.hintCostAnswer()).toBe("A hint costs 1 guess.");
    });

    test("the hint chip and the board brief", () => {
        const { onboarding } = reprice();
        expect(onboarding.hintChipCopy().detail).toBe(
            "Spend 1 guess to reveal a clade"
        );
        expect(onboarding.briefCopy().budget).toBe("You have 1 guess.");
    });

    test("the game-over summaries", () => {
        const { gameOverCopy } = reprice();
        expect(gameOverCopy.winSummary(1, 0)).toBe("Solved in 1 / 1 guess");
        expect(gameOverCopy.lossSummary(1, 0)).toBe("You used all 1 guess");
    });

    test("the loss share text", () => {
        const { shareText, gameState } = reprice();
        const { buildGameData } = require("../src/jsonLoader") as {
            buildGameData: typeof import("../src/jsonLoader").buildGameData;
        };
        const data = buildGameData(require("../src/jurassic/index.json"));
        const wrong = data.findSpeciesByName("Stegosaurus");
        if (!wrong) throw new Error("test fixture species missing");

        // One wrong guess exhausts a one-guess budget, so the round is a loss.
        const state = new gameState.GameState(
            data,
            "tyrannosaurus",
            new Set([wrong.id])
        );
        expect(state.isLoss()).toBe(true);

        const message = shareText.formatGameStateForSharing(state, {
            mode: "daily",
            seed: 1,
        });
        expect(message).toContain("I couldn't figure it out in 1 guess.");
    });
});
