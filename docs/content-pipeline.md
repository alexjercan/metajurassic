# Content pipeline

The dinosaurs are authored as Markdown. The game reads a generated JSON graph.
Both are committed, and keeping them in agreement is a gate.

::: danger Never hand-edit `src/jurassic/index.json`
It is generated. It is also **sorted by id**, and that order is what the daily
permutation indexes into - so re-ordering it re-points every past and future
puzzle. Edit the Markdown and regenerate.
:::

## The shape of it

| Path                        | What it is                                   |
| --------------------------- | -------------------------------------------- |
| `src/jurassic/species/*.md` | One file per species. Canonical.             |
| `src/jurassic/clades/*.md`  | One file per clade. Canonical.               |
| `src/jurassic/index.json`   | Generated runtime graph. Loaded by the game. |

A species file is frontmatter plus a body:

```markdown
---
species: Acrocanthosaurus
translation: High-Spined Lizard
clade: carcharodontosauridae
period: Early Cretaceous (113-110 Ma)
size: 11.5 meters
weight: 6,200 kilograms
image: https://.../species/acrocanthosaurus.png
icon: https://.../clades/carcharodontosauridae.svg
---

One paragraph of flavour text.
```

## Commands

Run from the repository root, inside the Nix dev shell. The scripts are
stdlib-only Python 3.

| Command                                | Direction                                            |
| -------------------------------------- | ---------------------------------------------------- |
| `python3 scripts/markdown_to_json.py`  | Markdown -> `index.json` (plus an ignored tree JSON) |
| `python3 scripts/json_to_markdown.py`  | JSON -> the Markdown source layout                   |
| `python3 scripts/csv_to_json.py <csv>` | CSV merge -> JSON                                    |
| `npm run test:pipeline`                | The pipeline's own Python tests                      |

After an intended CSV merge, the order is: run `json_to_markdown.py`, **review
the Markdown**, then run `markdown_to_json.py`. The Markdown is the source of
truth, so a merge has to land there before it lands in the generated file.

## Adding or changing a dinosaur

1. Add or edit the file under `src/jurassic/species/`.
2. Run `python3 scripts/markdown_to_json.py`.
3. Run `npm run ci`.
4. Commit the Markdown and the regenerated `index.json` together.

## The validation rule that matters

The converter **refuses** a frontmatter value that is not a plain scalar - a
stringified list, dict or tuple - rather than unwrapping it.

That is a fix for a real defect, not a hypothetical: every one of the species
`icon` fields once held a stringified Python list that leaked out of the content
scraper, the converter copied frontmatter strings straight through, the repr
landed in `index.json`, and every card in the game rendered a broken image.
Sanitizing at this boundary would make the generated JSON disagree with the
Markdown that is the source of truth, hiding the authoring bug instead of
surfacing it. See
[`tasks/20260729-092352/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-092352/DECISION.md),
choice 2.

The rule is expressed twice, on purpose:

- `COLLECTION_REPR` in
  [`scripts/markdown_to_json.py`](https://github.com/alexjercan/metajurassic/blob/master/scripts/markdown_to_json.py)
- `isSerializedCollection` in
  [`src/frontMatter.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/frontMatter.ts)

The two must accept and reject the same values.
`scripts/test_content_pipeline.py` and the "recognises the historical defect
shape" case in `test/contentSource.test.ts` assert the **same five examples** on
both sides, so loosening one without the other reddens a test rather than
drifting silently. The reason a TypeScript frontmatter parser exists at all,
given that no shipped browser path parses frontmatter, is recorded in
[`tasks/20260730-120401/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260730-120401/DECISION.md).

## What the gate checks

Content tests run against the **real** `src/jurassic/index.json`, never a mock.

| Test                                                                                                              | Checks                                              |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`test/contentSource.test.ts`](https://github.com/alexjercan/metajurassic/blob/master/test/contentSource.test.ts) | Markdown/JSON round-trip, and a stale-payload guard |
| [`test/dataIntegrity.test.ts`](https://github.com/alexjercan/metajurassic/blob/master/test/dataIntegrity.test.ts) | Graph shape, id uniqueness, media, render safety    |
| `npm run test:pipeline`                                                                                           | The Python converters themselves                    |

So a regenerated `index.json` that was not committed, or a Markdown edit that
was not regenerated, fails CI rather than shipping.

Related history:
[`tasks/20260729-092352/`](https://github.com/alexjercan/metajurassic/tree/master/tasks/20260729-092352).
