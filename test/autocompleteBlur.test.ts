/**
 * @jest-environment jsdom
 */

// The blur-timer race, and who owns the Enter key (20260729-130138).
//
// The rest of the suite runs in the `node` environment; the docblock above
// scopes jsdom to this file, as `test/cardRendering.test.ts` does.
//
// Why a jsdom unit test and not only an E2E one, when `jest.config.js`
// deliberately excludes `src/ui/**` from coverage as "DOM-heavy, hard to unit
// test": the defect is a 100ms REAL-TIME window. A browser test can only chase
// it - type fast enough and hope the machine cooperates - so a green run there
// is as likely to mean "the window closed before we got back" as "the bug is
// fixed", and the same run on a loaded CI box proves something different again.
// Fake timers step the window exactly, so these assertions fail for the one
// reason they exist. The player-altitude proof lives in `e2e/autocomplete.spec.ts`;
// this file is the deterministic pin underneath it.

import { findMatches, setupAutocomplete } from "../src/ui/autocomplete";
import { buildGameData } from "../src/jsonLoader";
import type { RawGameData } from "../src/jsonLoader";
import rawGameData from "../src/jurassic/index.json";

// The real species list, in the order the game builds it (`src/game.ts`:
// `data.species.map(s => s.species)`), for the same reason
// `test/autocomplete.test.ts` uses it: a hand-written fixture can be reordered
// underneath assertions that are about which name comes first.
const speciesNames = buildGameData(
    rawGameData as unknown as RawGameData
).species.map((s) => s.species);

const QUERY = "tyrann";

// What the box shows for QUERY, asserted exactly rather than as a property the
// right answer happens to have (LESSONS.md:
// `assert-the-exact-values-not-a-property-they-happen-to-have`). If content
// moves these, this fails here instead of turning a selection assertion
// vacuously green below.
const EXPECTED_MATCHES = [
    "Tyrannotitan",
    "Tyrannosaurus",
    "Yutyrannus",
    "Nanotyrannus",
];

type Harness = {
    inputEl: HTMLInputElement;
    autocompleteBox: HTMLDivElement;
    onSelect: jest.Mock<void, [string]>;
    // A keydown listener registered on the SAME element AFTER
    // `setupAutocomplete`, mirroring `src/game.ts` (autocomplete at line 262,
    // the raw-text handler at line 329). This is the stand-in for that raw
    // handler, and it is what proves Enter is consumed rather than merely
    // default-prevented.
    laterKeydown: jest.Mock<void, [KeyboardEvent]>;
    type: (value: string) => void;
    focus: () => void;
    blur: () => void;
    press: (key: string) => KeyboardEvent;
    isOpen: () => boolean;
    itemTexts: () => string[];
};

function mount(): Harness {
    document.body.innerHTML = "";

    const inputEl = document.createElement("input");
    inputEl.id = "player-input";
    const autocompleteBox = document.createElement("div");
    autocompleteBox.id = "autocomplete-box";
    document.body.append(inputEl, autocompleteBox);

    const onSelect = jest.fn<void, [string]>();
    setupAutocomplete({
        inputEl,
        autocompleteBox,
        speciesNames,
        isGuessed: () => false,
        onSelect,
    });

    const laterKeydown = jest.fn<void, [KeyboardEvent]>();
    inputEl.addEventListener("keydown", (event) => laterKeydown(event));

    const dispatch = (type: string) =>
        inputEl.dispatchEvent(new Event(type, { bubbles: false }));

    return {
        inputEl,
        autocompleteBox,
        onSelect,
        laterKeydown,
        type: (value: string) => {
            inputEl.value = value;
            dispatch("input");
        },
        focus: () => dispatch("focus"),
        blur: () => dispatch("blur"),
        press: (key: string) => {
            const event = new KeyboardEvent("keydown", {
                key,
                bubbles: true,
                cancelable: true,
            });
            inputEl.dispatchEvent(event);
            return event;
        },
        isOpen: () => autocompleteBox.style.display === "block",
        itemTexts: () =>
            Array.from(
                autocompleteBox.querySelectorAll(".autocomplete-item")
            ).map((item) => item.textContent ?? ""),
    };
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

describe("autocomplete fixture", () => {
    it("the shipped species list still offers these matches for the query", () => {
        expect(speciesNames).toHaveLength(150);
        expect(findMatches(speciesNames, QUERY, () => false)).toEqual(
            EXPECTED_MATCHES
        );
    });
});

describe("the blur timer does not hide a list that was re-opened", () => {
    it("keeps the box open when focus returns inside the 100ms window", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        expect(h.isOpen()).toBe(true);

        // The player taps another control...
        h.blur();
        // ...and comes straight back, well inside the 100ms grace period.
        jest.advanceTimersByTime(50);
        h.focus();
        expect(h.isOpen()).toBe(true);

        // The stale timer's original deadline passes. Before the fix it fired
        // here and hid a list that is currently in use.
        jest.advanceTimersByTime(100);

        expect(h.isOpen()).toBe(true);
        expect(h.itemTexts()).toEqual(EXPECTED_MATCHES);
    });

    it("keeps the box open when typing resumes inside the 100ms window", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        h.blur();
        jest.advanceTimersByTime(50);
        // Re-typing rather than re-focusing: a tap that lands directly in the
        // input can produce either, so both entry points must cancel the timer.
        h.type(QUERY);
        jest.advanceTimersByTime(100);

        expect(h.isOpen()).toBe(true);
        expect(h.itemTexts()).toEqual(EXPECTED_MATCHES);
    });

    it("still selects with ArrowDown and Enter after the window has passed", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        h.blur();
        jest.advanceTimersByTime(50);
        h.focus();
        jest.advanceTimersByTime(100);

        // renderSuggestions highlights index 0, so one ArrowDown moves to 1.
        h.press("ArrowDown");
        h.press("Enter");

        expect(h.onSelect).toHaveBeenCalledTimes(1);
        expect(h.onSelect).toHaveBeenCalledWith(EXPECTED_MATCHES[1]);
    });

    // The delay is kept, not deleted (tasks/20260729-130138/DECISION.md), so
    // pin that it still does its job. Without this, removing the whole blur
    // handler would pass every assertion above.
    it("still hides the box when focus does not come back", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        h.blur();

        expect(h.isOpen()).toBe(true);
        jest.advanceTimersByTime(100);
        expect(h.isOpen()).toBe(false);
    });
});

describe("the autocomplete owns Enter while a suggestion is highlighted", () => {
    it("does not let the Enter reach a later listener on the same input", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        const event = h.press("Enter");

        expect(h.onSelect).toHaveBeenCalledTimes(1);
        expect(h.onSelect).toHaveBeenCalledWith(EXPECTED_MATCHES[0]);
        expect(event.defaultPrevented).toBe(true);
        // The point of the fix: `preventDefault()` alone leaves this at 1,
        // because both listeners are on the SAME element, and in the real app
        // that second listener submits `inputEl.value` as raw text.
        expect(h.laterKeydown).not.toHaveBeenCalled();
    });

    // Both branches counted, so neither goes untested (LESSONS.md:
    // `count-both-branches-in-a-property-test-or-it-passes-vacuously`).
    // Consuming Enter unconditionally would pass the test above and break the
    // rejection message for a genuinely bogus guess, which is the raw-text
    // handler's real job.
    it("lets the Enter through when no suggestion list is open", () => {
        const h = mount();

        h.focus();
        h.type("qqqq");
        expect(h.isOpen()).toBe(false);

        const event = h.press("Enter");

        expect(h.onSelect).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
        expect(h.laterKeydown).toHaveBeenCalledTimes(1);
    });

    it("lets the Enter through after a blur has genuinely closed the list", () => {
        const h = mount();

        h.focus();
        h.type(QUERY);
        h.blur();
        jest.advanceTimersByTime(100);
        expect(h.isOpen()).toBe(false);

        h.press("Enter");

        expect(h.onSelect).not.toHaveBeenCalled();
        expect(h.laterKeydown).toHaveBeenCalledTimes(1);
    });
});
