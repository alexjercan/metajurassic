# Normalize typographic punctuation in Jurassic content

- PRIORITY: 30
- TAGS: content, docs
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

## Story

As a maintainer, I want the Jurassic content to follow the repo's ASCII punctuation convention, so that the rule holds everywhere rather than only in code.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F5.1), MEASURED.

- The authored markdown under `src/jurassic/` contains 97 en dashes and 37 em dashes across 113 files: mostly period ranges (`Late Jurassic (153–148 Ma)`) and prose (`diastema—a distinct, toothless gap`).
- `AGENTS.md` asks for plain ASCII punctuation (`-`, `--`, `...`, `->`, straight quotes).
- It is visible in the panel card on every single guess, so it is user-facing, not just source hygiene.

## Steps

- [ ] Replace en dashes in period ranges with `-` and em dashes in prose with ` -- ` or a recast sentence, in the MARKDOWN source under `src/jurassic/`, never in the generated JSON.
- [ ] Regenerate `src/jurassic/index.json` with `python scripts/markdown_to_json.py`.
- [ ] Add a content test that fails on non-ASCII punctuation in the real payload, so the rule is enforced rather than restated.

## Definition of Done

- No typographic dashes remain in the content source. (cmd: `! rg -q "[–—]" src/jurassic/` - verified 2026-07-29 that this grep currently FINDS matches, so it is a real proof and not a vacuous one)
- The generated payload matches the source. (cmd: `python scripts/markdown_to_json.py && git diff --exit-code src/jurassic/index.json`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Low priority: cosmetic, and touches 113 files, so land it when no content task is in flight to avoid conflicts.
