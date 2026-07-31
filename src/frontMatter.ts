// Frontmatter parsing for the authored content under `src/jurassic/`.
//
// This lives in its own module so there is ONE parser. `parseFrontMatter` is
// read by `test/contentSource.test.ts`, which parses the markdown off disk to
// prove the committed `index.json` still matches it; `isSerializedCollection`
// by that test and `test/dataIntegrity.test.ts`. A copy in the test would be a
// second seam that rots (LESSONS.md
// `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`).
//
// NOTE: 20260730-120401 - `src/markdownLoader.ts` is the only other importer
// and nothing imports IT, so no shipped browser path parses frontmatter. That
// task decides whether the loader is deleted or wired up.
//
// It is a deliberate re-expression of `scripts/markdown_to_json.py`'s parser,
// not an independent format: same regex, same split-on-first-colon, same
// surrounding-quote strip, same body trim. That duplication is safe only
// because the round-trip test compares this parser's output against the JSON
// the Python one produced - a divergence in either reddens the gate rather
// than drifting silently.

export interface FrontMatter {
    attributes: Record<string, string>;
    body: string;
}

export function parseFrontMatter(text: string): FrontMatter {
    const match =
        /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/m.exec(text);
    if (!match) {
        return { attributes: {}, body: text.trim() };
    }

    const [, header, body] = match;
    const attributes: Record<string, string> = {};

    header
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const idx = line.indexOf(":");
            if (idx === -1) return;
            const key = line.slice(0, idx).trim();
            const rawValue = line.slice(idx + 1).trim();
            const value = rawValue.replace(/^"|"$/g, "");
            attributes[key] = value;
        });

    return { attributes, body: body.trim() };
}

// A frontmatter value must be a plain scalar. The 150 species icons shipped for
// months as stringified Python lists (`['https://...svg']`) leaked from the
// content scraper, and every card in the game rendered a broken <img> because
// nothing rejected the shape. `scripts/markdown_to_json.py` now refuses to
// generate from such a value; this is the same predicate on the TypeScript
// side, used by the data-integrity tests.
//
// MIRRORED from `COLLECTION_REPR` in `scripts/markdown_to_json.py`. The two
// must accept and reject the same values, so the SAME five examples are
// asserted on both sides - here by "recognises the historical defect shape" in
// `test/contentSource.test.ts`, there by `scripts/test_content_pipeline.py`.
// Change one and the other's test tells you.
export function isSerializedCollection(value: string): boolean {
    const trimmed = value.trim();
    return (
        /^\[.*\]$/.test(trimmed) ||
        /^\{.*\}$/.test(trimmed) ||
        /^\(.*,.*\)$/.test(trimmed)
    );
}
