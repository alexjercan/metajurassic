// The AUTHORED content, checked where it is written.
//
// `src/jurassic/index.json` is generated from the markdown under
// `src/jurassic/species` and `src/jurassic/clades`; the markdown is the source
// of truth. Validating only the JSON catches a defect one step downstream of
// where it can be fixed, and catches nothing at all if the JSON is stale.
//
// So this file parses the markdown with the SHIPPED parser (`src/frontMatter`,
// the same one `markdownLoader` uses) and asserts the reconstructed graph
// equals the committed `index.json` exactly. That does three jobs at once: it
// validates the frontmatter, it proves the generated payload is in sync with
// its source, and it keeps the TypeScript parser honest against the Python one
// in `scripts/markdown_to_json.py` - if the two ever disagree about quoting,
// colons in values, or body trimming, this test goes red instead of the
// difference rotting unnoticed. See tasks/20260729-092352/DECISION.md choice 3.

import * as fs from "fs";
import * as path from "path";

import rawGameData from "../src/jurassic/index.json";
import { RawGameData } from "../src/jsonLoader";
import { isSerializedCollection, parseFrontMatter } from "../src/frontMatter";

const raw = rawGameData as unknown as RawGameData;

const JURASSIC_DIR = path.join(__dirname, "..", "src", "jurassic");
const SPECIES_DIR = path.join(JURASSIC_DIR, "species");
const CLADES_DIR = path.join(JURASSIC_DIR, "clades");

const SPECIES_FIELDS = [
    "species",
    "translation",
    "clade",
    "period",
    "size",
    "weight",
    "image",
    "icon",
];
const CLADE_FIELDS = ["clade", "parent", "image"];

interface SourceEntry {
    id: string;
    file: string;
    attributes: Record<string, string>;
    body: string;
}

function readSource(dir: string): SourceEntry[] {
    return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".md"))
        .sort()
        .map((file) => {
            const { attributes, body } = parseFrontMatter(
                fs.readFileSync(path.join(dir, file), "utf8")
            );
            return {
                id: file.replace(/\.md$/, ""),
                file: path.join(path.basename(dir), file),
                attributes,
                body,
            };
        });
}

const speciesSource = readSource(SPECIES_DIR);
const cladesSource = readSource(CLADES_DIR);

// `parse_markdown_file` in the Python generator emits the frontmatter
// attributes plus a `description` holding the trimmed body. Rebuild that shape
// so the comparison is against the whole record, not a chosen subset - a field
// this test forgot to list is a field it would not be checking.
function toRecord(entry: SourceEntry): Record<string, string> {
    return { ...entry.attributes, description: entry.body };
}

describe("authored markdown source", () => {
    it("has a markdown file for every entry in index.json, and vice versa", () => {
        expect(speciesSource.map((e) => e.id).sort()).toEqual(
            Object.keys(raw.species).sort()
        );
        expect(cladesSource.map((e) => e.id).sort()).toEqual(
            Object.keys(raw.clades).sort()
        );
    });

    it("regenerates index.json exactly, so the payload is not stale", () => {
        const fromSource = {
            species: Object.fromEntries(
                speciesSource.map((e) => [e.id, toRecord(e)])
            ),
            clades: Object.fromEntries(
                cladesSource.map((e) => [e.id, toRecord(e)])
            ),
        };
        const committed = {
            species: raw.species as unknown as Record<string, unknown>,
            clades: raw.clades as unknown as Record<string, unknown>,
        };

        // Both sides are sorted by id now, but `toEqual` compares
        // structurally, which is the property that matters here.
        expect(fromSource).toEqual(committed);
    });

    it("gives every species the full set of frontmatter fields", () => {
        const missing: string[] = [];
        for (const entry of speciesSource) {
            for (const field of SPECIES_FIELDS) {
                if (!(entry.attributes[field] ?? "").trim()) {
                    missing.push(`${entry.file}: ${field}`);
                }
            }
            if (!entry.body.trim()) missing.push(`${entry.file}: body`);
        }

        expect(missing).toEqual([]);
    });

    it("gives every clade its frontmatter fields, with one intentional rootless clade", () => {
        const missing: string[] = [];
        const rootless: string[] = [];

        for (const entry of cladesSource) {
            for (const field of CLADE_FIELDS) {
                const value = (entry.attributes[field] ?? "").trim();
                if (value) continue;
                // A missing `parent` is what MAKES the root; everything else is
                // a defect.
                if (field === "parent") rootless.push(entry.id);
                else missing.push(`${entry.file}: ${field}`);
            }
            if (!entry.body.trim()) missing.push(`${entry.file}: body`);
        }

        expect(missing).toEqual([]);
        expect(rootless).toEqual(["dinosauria"]);
    });

    it("carries no frontmatter value that is a serialized collection", () => {
        // The defect this whole cycle exists for: all 150 species icons were
        // authored as `['https://...svg']`, a Python list repr that leaked out
        // of the content scraper, and the pipeline copied it straight into
        // index.json. Both pipeline directions now refuse such a value
        // (scripts/markdown_to_json.py, scripts/json_to_markdown.py); this is
        // the same predicate asserted over the committed source.
        const offenders: string[] = [];
        for (const entry of [...speciesSource, ...cladesSource]) {
            for (const [key, value] of Object.entries(entry.attributes)) {
                if (isSerializedCollection(value)) {
                    offenders.push(`${entry.file}: ${key} = ${value}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    it("recognises the historical defect shape", () => {
        // Guards the guard: an `isSerializedCollection` that quietly stopped
        // matching would make the test above pass for the wrong reason.
        expect(
            isSerializedCollection(
                "['https://alexjercan.github.io/metajurassic-images/clades/ceratosauria.svg']"
            )
        ).toBe(true);
        expect(isSerializedCollection('{"a": 1}')).toBe(true);
        expect(isSerializedCollection("('a', 'b')")).toBe(true);
        expect(
            isSerializedCollection(
                "https://alexjercan.github.io/metajurassic-images/clades/ceratosauria.svg"
            )
        ).toBe(false);
        expect(isSerializedCollection("Late Jurassic (153-148 Ma)")).toBe(false);
    });
});

describe("frontmatter parser", () => {
    it("keeps colons inside a value", () => {
        const { attributes } = parseFrontMatter(
            "---\nimage: https://example.com/a.svg\n---\n\nBody."
        );
        expect(attributes.image).toBe("https://example.com/a.svg");
    });

    it("strips surrounding quotes and trims the body", () => {
        const { attributes, body } = parseFrontMatter(
            '---\nspecies: "Tyrannosaurus rex"\n---\n\n  Body text.  \n'
        );
        expect(attributes.species).toBe("Tyrannosaurus rex");
        expect(body).toBe("Body text.");
    });

    it("treats a file with no frontmatter as pure body", () => {
        const { attributes, body } = parseFrontMatter("Just prose.\n");
        expect(attributes).toEqual({});
        expect(body).toBe("Just prose.");
    });
});
