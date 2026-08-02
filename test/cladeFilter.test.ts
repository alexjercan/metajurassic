// Lineage-aware clade membership over the REAL content graph.
//
// A species card names only its IMMEDIATE clade, so a filter that string-matches
// the card text answers "who is in Ceratosauria" and cannot answer "who is in
// Cerapoda" at all. That is the whole point of the filter, and a mock fixture
// with three species cannot show it (LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`). So this suite
// runs the shipped `buildGameData` over `src/jurassic/index.json`, the same
// normalization the browser gets.

import rawGameData from "../src/jurassic/index.json";
import { buildGameData, RawGameData } from "../src/jsonLoader";
import { speciesInClade, cladeFilterOptions } from "../src/cladeFilter";

const data = buildGameData(rawGameData as RawGameData);

describe("speciesInClade", () => {
    it("includes members whose immediate clade is a DESCENDANT of the filter", () => {
        const members = speciesInClade(data, "cerapoda");

        // Measured 20260802 against the checked-in payload. The count is a
        // canary on content drift; the two assertions after it are the
        // invariant the feature exists for and must hold at any count.
        expect(members).toHaveLength(35);

        const immediate = new Set(members.map((s) => s.clade.toLowerCase()));
        // More than one immediate clade: a filter matching the card's `Clade:`
        // line against "Cerapoda" would return a strict subset of these.
        expect(immediate.size).toBe(22);
        // And none of them IS Cerapoda, so that naive filter returns nothing.
        expect(immediate.has("cerapoda")).toBe(false);
    });

    it("returns every species for the root clade", () => {
        expect(speciesInClade(data, "dinosauria")).toHaveLength(
            data.species.length
        );
        expect(data.species).toHaveLength(150);
    });

    it("is case-insensitive, matching findCladeById lookup", () => {
        expect(speciesInClade(data, "Cerapoda")).toHaveLength(35);
    });

    it("returns nothing for an unknown clade id", () => {
        // The archive falls back to the full list on an unknown `?clade=`, so
        // this empty result must be distinguishable from a real filter, not an
        // exception.
        expect(speciesInClade(data, "not-a-clade")).toEqual([]);
    });
});

describe("cladeFilterOptions", () => {
    it("offers every clade in the graph, sorted by display name", () => {
        const options = cladeFilterOptions(data);

        expect(options).toHaveLength(Object.keys(data.clades).length);

        const names = options.map((o) => o.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it("counts each clade by a brute-force lineage scan", () => {
        const options = cladeFilterOptions(data);

        const mismatched = options.filter(
            (option) =>
                option.count !==
                data.species.filter((s) =>
                    data.lineage(s.clade).includes(option.id)
                ).length
        );

        expect(mismatched).toEqual([]);
    });
});
