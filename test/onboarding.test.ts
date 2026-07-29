import { MAX_GUESSES, HINT_COST } from "../src/constants";
import { briefCopy, hintChipCopy } from "../src/ui/onboarding";

// The board copy a first-timer reads. These pin the copy itself and the two
// numbers that used to be typed into markup; the surfaces that carry it are
// covered end to end in e2e/onboarding.spec.ts and e2e/mobile.spec.ts, which is
// where DOM assertions belong in this repo (jest.config.js excludes src/ui).
describe("onboarding brief copy", () => {
    test("states the budget from MAX_GUESSES rather than a literal", () => {
        expect(briefCopy().budget).toContain(String(MAX_GUESSES));
    });

    test("carries all four facts the first screen used to omit", () => {
        const copy = briefCopy();

        // Playtest F3.1: the first screen stated none of these.
        expect(copy.objective).toMatch(/find the mystery dinosaur/i);
        expect(copy.mystery).toMatch(/\?/);
        expect(copy.feedback).toMatch(/clade/i);
        expect(copy.budget).toMatch(/guesses/i);
    });

    // The practice page renders the same template against a random target, so
    // any copy claiming this is today's puzzle would be false on /practice.
    test("does not claim the target is today's on either board", () => {
        const copy = briefCopy();
        const all = Object.values(copy).join(" ");
        expect(all).not.toMatch(/today/i);
    });
});

describe("hint chip copy", () => {
    test("names the price from HINT_COST rather than a literal", () => {
        expect(hintChipCopy().detail).toContain(String(HINT_COST));
    });

    test("names the product, not only the price", () => {
        expect(hintChipCopy().detail).toMatch(/reveal a clade/i);
    });

    test("reads as a rescue rather than an edge", () => {
        expect(hintChipCopy().label).toMatch(/stuck\?/i);
    });

    // The rule falls back to a smaller cut on ~19% of presses
    // (tasks/20260729-160500/SPIKE.md), so any promise about halving the field
    // would be false about one press in five. This is a pin on that specific
    // lie, not a style check.
    test("makes no claim about how much the reveal narrows", () => {
        const { label, detail } = hintChipCopy();
        expect(`${label} ${detail}`).not.toMatch(/half|halve|narrow/i);
    });
});
