// Integrity of the REAL Jurassic content graph, not a mock.
//
// Every other suite here builds a two-or-three species fixture, which proves
// the code shape and nothing about the content. That gap is what let all 150
// species icons ship as stringified Python lists for months while the loader
// tests stayed green (LESSONS.md
// `mock-fixtures-hide-real-data-defects-test-the-real-payload`). So this file
// loads `src/jurassic/index.json` and runs it through the SHIPPED
// `buildGameData` - the same normalization the browser gets - and asserts over
// the result. A failure here is a content defect or a loader change, and both
// are worth a red gate.

import rawGameData from "../src/jurassic/index.json";
import { buildGameData, RawGameData } from "../src/jsonLoader";
import { isSerializedCollection } from "../src/frontMatter";
import { Species } from "../src/types";

const raw = rawGameData as RawGameData;
const data = buildGameData(raw);

// The clade lookup is keyed the way `GameData.findCladeById` looks things up:
// lowercased. Species `clade` fields and clade `parent` fields both hold that
// key, not the display name.
const cladeKeys = new Set(Object.keys(data.clades));

// Media values are all absolute https URLs on the images host today. The test
// asserts the general shape (absolute http(s) URL, no whitespace, no serialized
// collection) rather than the host, so moving the CDN is not a test change but
// a malformed value still is.
function isWellFormedMediaRef(value: string): boolean {
    if (isSerializedCollection(value)) return false;
    if (/\s/.test(value)) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// Text that reaches `innerHTML` unescaped in `src/ui/card.ts`. Content is
// authored in this repo so there is no injection vector today - this guards
// against a stray tag or entity silently eating a card's layout, and against
// the day that assumption changes.
const HTMLISH = /[<>]|&[a-zA-Z]+;|&#\d+;/;

function textFieldsOf(species: Species): [string, string][] {
    return [
        ["species", species.species],
        ["translation", species.translation],
        ["period", species.period],
        ["size", species.size],
        ["weight", species.weight],
        ["description", species.description],
    ];
}

describe("Jurassic content graph", () => {
    it("ships the expected volume of content", () => {
        // A resize is not a bug, but it should be a deliberate edit here rather
        // than a silent drift - the daily shuffle salt is tuned to 150 species
        // (see gameData.ts DAILY_SHUFFLE_SALT).
        expect(data.species).toHaveLength(150);
        expect(Object.keys(data.clades)).toHaveLength(108);
    });

    it("resolves every species to an existing clade", () => {
        const unresolved = data.species
            .filter((s) => !data.findCladeById(s.clade))
            .map((s) => `${s.id} -> ${s.clade}`);

        expect(unresolved).toEqual([]);
    });

    it("resolves every clade parent, with exactly one root", () => {
        const unresolved: string[] = [];
        const roots: string[] = [];

        for (const clade of Object.values(data.clades)) {
            if (!clade.parent) {
                roots.push(clade.id);
            } else if (!cladeKeys.has(clade.parent)) {
                unresolved.push(`${clade.id} -> ${clade.parent}`);
            }
        }

        expect(unresolved).toEqual([]);
        // `scripts/markdown_to_json.py` raises without a root, and the tree
        // builder needs exactly one; two roots would silently orphan a subtree.
        expect(roots).toEqual(["dinosauria"]);
    });

    it("walks every species up to the root without cycles", () => {
        // `GameData.lineage` breaks on a revisited node rather than hanging, so
        // a parent cycle shows up as a lineage that stops short of the root -
        // which would quietly wreck every LCA closeness score.
        const broken = data.species
            .filter((s) => !data.lineage(s.clade).includes("dinosauria"))
            .map((s) => s.id);

        expect(broken).toEqual([]);
    });

    it("has unique, non-empty species ids and names", () => {
        const ids = data.species.map((s) => s.id);
        const names = data.species.map((s) => s.species);

        expect(ids.filter((id) => !id.trim())).toEqual([]);
        expect(names.filter((name) => !name.trim())).toEqual([]);
        expect(new Set(ids).size).toBe(ids.length);
        // Guessing resolves by name (`findSpeciesByName`, case-insensitively),
        // so two species sharing a name would make one unreachable.
        expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(
            names.length
        );
    });

    it("has unique, non-empty clade ids and names", () => {
        const clades = Object.values(data.clades);

        expect(clades.filter((c) => !c.id.trim())).toEqual([]);
        expect(clades.filter((c) => !c.name.trim())).toEqual([]);
        expect(new Set(clades.map((c) => c.id)).size).toBe(clades.length);
    });

    it("keeps every clade's JSON key equal to its lowercased display name", () => {
        // The fragility this test exists for: `buildGameData` keys the clade map
        // by `clade.name.toLowerCase()` and DISCARDS the JSON key, while species
        // `clade` fields and clade `parent` fields reference the KEY. The two
        // agree today, so renaming a clade's display name without renaming its
        // file would silently unresolve every reference to it - and the
        // reference tests above would catch that only as a mysterious dangling
        // ref. Pin the agreement itself.
        const mismatched = Object.entries(raw.clades)
            .filter(([key, c]) => key !== (c.clade || "").toLowerCase())
            .map(([key, c]) => `${key} != ${c.clade}`);

        expect(mismatched).toEqual([]);
    });
});

describe("Jurassic media references", () => {
    it("gives every species a well-formed image", () => {
        const bad = data.species
            .filter((s) => !s.image || !isWellFormedMediaRef(s.image))
            .map((s) => `${s.id}: ${s.image}`);

        expect(bad).toEqual([]);
    });

    it("gives every species a well-formed icon", () => {
        const bad = data.species
            .filter((s) => !s.icon || !isWellFormedMediaRef(s.icon))
            .map((s) => `${s.id}: ${s.icon}`);

        expect(bad).toEqual([]);
    });

    it("gives every clade a well-formed image", () => {
        const bad = Object.values(data.clades)
            .filter((c) => !c.image || !isWellFormedMediaRef(c.image))
            .map((c) => `${c.id}: ${c.image}`);

        expect(bad).toEqual([]);
    });

    it("points every species icon at its own clade's image", () => {
        // The icons are not arbitrary art: a species card wears its clade's
        // badge. Pinning the relation rather than just the URL shape means a
        // well-formed but WRONG icon (a copy-paste from the neighbouring
        // species, say) fails too. This is the invariant the stringified-list
        // defect broke.
        const wrong = data.species
            .map((s) => ({ s, clade: data.findCladeById(s.clade) }))
            .filter(({ s, clade }) => !clade || s.icon !== clade.image)
            .map(({ s, clade }) => `${s.id}: ${s.icon} != ${clade?.image}`);

        expect(wrong).toEqual([]);
    });

    it("stores no media value as a serialized collection", () => {
        // The exact defect class, asserted on the RAW payload so it is caught
        // even if the loader ever starts normalizing it away.
        const offenders: string[] = [];
        for (const [id, s] of Object.entries(raw.species)) {
            for (const field of ["image", "icon"] as const) {
                const value = s[field];
                if (value && isSerializedCollection(value)) {
                    offenders.push(`species/${id}.${field}: ${value}`);
                }
            }
        }
        for (const [id, c] of Object.entries(raw.clades)) {
            if (c.image && isSerializedCollection(c.image)) {
                offenders.push(`clades/${id}.image: ${c.image}`);
            }
        }

        expect(offenders).toEqual([]);
    });
});

describe("Jurassic text content", () => {
    it("fills every species field", () => {
        const missing: string[] = [];
        for (const species of data.species) {
            for (const [field, value] of textFieldsOf(species)) {
                if (!value.trim()) missing.push(`${species.id}.${field}`);
            }
        }

        expect(missing).toEqual([]);
    });

    it("fills every clade description", () => {
        const missing = Object.values(data.clades)
            .filter((c) => !c.description.trim())
            .map((c) => c.id);

        expect(missing).toEqual([]);
    });

    it("keeps HTML out of text that cards interpolate unescaped", () => {
        const offenders: string[] = [];
        for (const species of data.species) {
            for (const [field, value] of textFieldsOf(species)) {
                if (HTMLISH.test(value)) {
                    offenders.push(`${species.id}.${field}: ${value}`);
                }
            }
        }
        for (const clade of Object.values(data.clades)) {
            for (const [field, value] of [
                ["name", clade.name],
                ["description", clade.description],
            ] as [string, string][]) {
                if (HTMLISH.test(value)) {
                    offenders.push(`${clade.id}.${field}: ${value}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });
});
