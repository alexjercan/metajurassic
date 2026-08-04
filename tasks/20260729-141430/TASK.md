# Normalize typographic punctuation in Jurassic content

- PRIORITY: 30
- TAGS: content, docs
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a maintainer, I want the Jurassic content to follow the repo's ASCII punctuation convention, so that the rule holds everywhere rather than only in code.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F5.1), MEASURED.

- The authored markdown under `src/jurassic/` contains 97 en dashes and 37 em dashes across 113 files: mostly period ranges (`Late Jurassic (153–148 Ma)`) and prose (`diastema—a distinct, toothless gap`).
- `AGENTS.md` asks for plain ASCII punctuation (`-`, `--`, `...`, `->`, straight quotes).
- It is visible in the panel card on every single guess, so it is user-facing, not just source hygiene.

## Steps

- [x] Add the failing guard FIRST, in `test/dataIntegrity.test.ts`: a `TYPOGRAPHIC` regex constant beside the existing `HTMLISH` one, written with `\uXXXX` escapes so the test source itself stays ASCII, and one case in the existing `describe("Jurassic text content")` that walks `textFieldsOf(species)` plus each clade `name`/`description` and collects offenders into an array asserted `toEqual([])`, exactly like the HTML case above it. Ban punctuation only (`‐-―`, `‘’“”`, `…`, `−`), never all non-ASCII: `Hațeg` and `Rubén` are correct spellings and must survive. Confirm it is RED before continuing.
- [x] Replace the 97 en dashes in the MARKDOWN source under `src/jurassic/species/*.md` with `-`. All 97 sit in the `period:` frontmatter between two digits (measured, no exceptions), so this is mechanical.
- [x] Replace the 37 em dashes in the markdown bodies under `src/jurassic/species/*.md` and `src/jurassic/clades/*.md` with ` -- `. All 37 are unspaced `word—word` (measured), so a single substitution yields `word -- word`; re-read the 4 paired-parenthetical files (`stegosaurus`, `corythosaurus`, `edmontosaurini`, `acrocanthosaurus`) to confirm both sides still read.
- [x] Regenerate the payload with `python scripts/markdown_to_json.py`, then confirm the Step 1 guard and `test/contentSource.test.ts` both go green. Never hand-edit `src/jurassic/index.json`.

## Definition of Done

- The guard is real, not a comment: injecting a typographic dash into the shipped payload fails `dataIntegrity`. (cmd: `cp src/jurassic/index.json /tmp/ij.bak && python3 -c 'import pathlib;p=pathlib.Path("src/jurassic/index.json");t=p.read_text();p.write_text(t.replace("Late Jurassic","Late—Jurassic",1))' && ! npx jest test/dataIntegrity.test.ts >/dev/null 2>&1; rc=$?; cp /tmp/ij.bak src/jurassic/index.json; exit $rc` - scratch-verified 2026-08-04 on the base: the injection lands, the suite still passes, so the proof is RED today. It restores from a copy rather than `git checkout` so that running it never destroys an uncommitted regeneration)
- No typographic dashes remain in the content source. (cmd: `! rg -q "[–—]" src/jurassic/` - verified 2026-07-29 and re-verified 2026-08-04 that this grep currently FINDS matches, so it is a real proof and not a vacuous one)
- The generated payload matches the source. (cmd: `python scripts/markdown_to_json.py && git diff --exit-code src/jurassic/index.json`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Low priority: cosmetic, and touches 113 files, so land it when no content task is in flight to avoid conflicts.
- Measured on the base 2026-08-04, agreeing with NOTES.md: 97 `–` (all in `period:`, all between digits, a PCRE2 look-around search for any other context returns nothing), 37 `—` (all unspaced, none adjacent to whitespace), and exactly 3 other non-ASCII characters, all LETTERS (`ț` x2, `é` x1).
- The last two DoD items are green on the base and are regression guards, not red-first proofs. They are non-vacuous only in conjunction: the sync proof goes red the moment the Steps edit markdown without regenerating, which is this change's most likely failure.
- `npx jest -t "<name>"` exits 0 when no test matches, so "the new case exists" cannot be proved by a name filter. That is why the guard's proof is the mutation above.
- A payload-level ban does cover the markdown source, transitively: `test/contentSource.test.ts` asserts the parsed markdown equals `index.json` exactly, so a typographic dash authored in a `.md` reaches the payload and trips the guard. A byte grep over `index.json` would NOT - `json.dump` defaults to `ensure_ascii=True`, so the file stores `\\u2013` escapes.
- Assumption taken, from NOTES.md's open question: the six `—` empty-field placeholders in `src/ui/card.ts` (lines 98-105) and the one in a `test/hintSelection.test.ts` comment stay. They are outside `src/jurassic/`, they are a UI glyph choice rather than authored content, and the card ones are unreachable in practice because `dataIntegrity` already asserts every field is non-empty. Widening the ban to source files is a separate, cheap follow-up.
- `python scripts/markdown_to_json.py` also rewrites `commontree-metajurassic.json`, which `.gitignore` covers; the `git diff --exit-code` proof is unaffected.

## Close-out

WHAT/WHY. Added a payload-level Jest guard (`TYPOGRAPHIC` in
`test/dataIntegrity.test.ts`) banning typographic punctuation in Jurassic text,
then removed the 97 en dashes and 37 em dashes from the markdown source and
regenerated `index.json`. The rule from AGENTS.md now has a red gate behind it
instead of only a convention.

ALTERNATIVES. As recorded in DECISION.md: a second source-file guard over
`src/jurassic/**/*.md` (redundant, `contentSource.test.ts` already pins source
== payload), widening the ban to all of `src/` (defers the `card.ts`
placeholders), and grep-only CI enforcement (the shape LESSONS.md says decays).
No alternative changed during implementation.

DIFFICULTIES. Two, both minor. Writing the regex through an editing tool
normalized the `\uXXXX` escapes into literal characters, which would have made
the test file trip its own rule; rewritten via a Python substitution and
re-verified with a non-ASCII grep over the file. And the sync proof
(`git diff --exit-code src/jurassic/index.json`) is red until the regeneration
is committed, which is expected rather than a defect.

EVIDENCE. The guard was confirmed RED before any content edit (14 offenders,
all clade descriptions). The mutation proof passes: injecting `Late-Jurassic`
with an em dash into the shipped payload turns `dataIntegrity` red, and the
file is restored from a copy. `npm run ci` exits 0: 32 suites, 411 Jest tests,
184 Playwright tests. `rg` over `src/jurassic/` now finds only the three
letters (`t-comma` x2, `e-acute` x1) that must survive.

REFLECTION. The measurements in the plan held exactly - all 97 en dashes sat
between digits in `period:`, all 37 em dashes were unspaced - so the
substitution was a single pass with no exceptions. The nine files with paired
parentheticals were re-read individually and all read correctly as ` -- x -- `.
The one thing worth carrying forward: a test that enforces a text rule can
violate that rule in its own source, so grep the test file, not just the target.
