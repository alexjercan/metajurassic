import { MAX_SUGGESTIONS, findMatches } from "../src/ui/autocomplete";
import { buildGameData } from "../src/jsonLoader";
import type { RawGameData } from "../src/jsonLoader";
import rawGameData from "../src/jurassic/index.json";

// These run against the REAL species list (`src/jurassic/index.json`), in the
// same order the game builds it (`src/game.ts`: `data.species.map(s => s.species)`),
// because both defects these tests pin are about ORDER: which names survive
// the truncation to 8, and which of the survivors comes first. A hand-written
// fixture would let the list be reordered underneath the assertions.
const speciesNames = buildGameData(
    rawGameData as unknown as RawGameData
).species.map((s) => s.species);

const noneGuessed = () => false;
const guessedFrom = (names: string[]) => {
    const set = new Set(names.map((n) => n.toLowerCase()));
    return (name: string) => set.has(name.toLowerCase());
};

const substringMatches = (query: string) =>
    speciesNames.filter((name) => name.toLowerCase().includes(query));

describe("findMatches fixture", () => {
    // The assertions below name exact species, so pin the content they rely on.
    // If a content edit moves these, the pin fails here rather than turning an
    // ordering assertion vacuously green somewhere below.
    it("the shipped species list still has the shape these tests assert", () => {
        expect(speciesNames).toHaveLength(150);
        expect(substringMatches("tyr")).toEqual([
            "Nanotyrannus",
            "Styracosaurus",
            "Tyrannosaurus",
            "Tyrannotitan",
            "Yutyrannus",
        ]);
        expect(substringMatches("saur")).toHaveLength(83);
    });
});

describe("findMatches ranking", () => {
    it("ranks prefix matches above interior matches, source order within each group", () => {
        // Source order alone puts the two names that START with "tyr" third and
        // fourth: ["Nanotyrannus", "Styracosaurus", "Tyrannosaurus",
        // "Tyrannotitan", "Yutyrannus"]. The prefix group must come first.
        expect(findMatches(speciesNames, "tyr", noneGuessed)).toEqual([
            "Tyrannosaurus",
            "Tyrannotitan",
            "Nanotyrannus",
            "Styracosaurus",
            "Yutyrannus",
        ]);
    });

    it("puts prefix matches first even when interior matches would fill the list", () => {
        // 83 species contain "saur" but only two start with it, and both sit
        // deep in source order - so an unranked list never shows them at all.
        const matches = findMatches(speciesNames, "saur", noneGuessed);

        expect(matches).toEqual([
            "Sauropelta",
            "Sauroposeidon",
            "Acrocanthosaurus",
            "Alamosaurus",
            "Albertosaurus",
            "Allosaurus",
            "Amargasaurus",
            "Ankylosaurus",
        ]);
    });

    it("matching is case insensitive and ignores surrounding whitespace", () => {
        expect(findMatches(speciesNames, "  TYR ", noneGuessed)).toEqual(
            findMatches(speciesNames, "tyr", noneGuessed)
        );
    });

    it("returns nothing for an empty query", () => {
        expect(findMatches(speciesNames, "", noneGuessed)).toEqual([]);
        expect(findMatches(speciesNames, "   ", noneGuessed)).toEqual([]);
    });
});

describe("findMatches truncation vs guessed species", () => {
    it("still offers a full list after the first 8 suggestions are guessed", () => {
        // The repro: guessing what the box offered used to empty it, because
        // the slice to 8 happened BEFORE guessed names were dropped. 83 species
        // match "saur", so the box has plenty left.
        const first = findMatches(speciesNames, "saur", noneGuessed);
        expect(first).toHaveLength(MAX_SUGGESTIONS);

        const second = findMatches(
            speciesNames,
            "saur",
            guessedFrom(first)
        );

        expect(second).toHaveLength(MAX_SUGGESTIONS);
        expect(second.filter((name) => first.includes(name))).toEqual([]);
    });

    it("keeps offering 8 suggestions round after round until candidates run out", () => {
        const total = substringMatches("saur").length;
        const rounds = Math.floor(total / MAX_SUGGESTIONS);
        expect(rounds).toBeGreaterThan(1);

        const guessed: string[] = [];
        for (let round = 0; round < rounds; round++) {
            const matches = findMatches(
                speciesNames,
                "saur",
                guessedFrom(guessed)
            );

            expect(matches).toHaveLength(MAX_SUGGESTIONS);
            expect(matches.filter((name) => guessed.includes(name))).toEqual(
                []
            );
            guessed.push(...matches);
        }

        // Every suggestion ever offered was a distinct real match.
        expect(new Set(guessed).size).toBe(rounds * MAX_SUGGESTIONS);
    });

    it("returns the remaining candidates, not an empty list, once fewer than 8 are left", () => {
        const all = substringMatches("tyr");
        const guessed = all.slice(0, all.length - 2);

        expect(findMatches(speciesNames, "tyr", guessedFrom(guessed))).toEqual(
            findMatches(speciesNames, "tyr", noneGuessed).filter(
                (name) => !guessed.includes(name)
            )
        );
    });
});
