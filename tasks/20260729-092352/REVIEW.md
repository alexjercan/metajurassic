# Review: Validate Jurassic data and media integrity (with the folded-in media repair)

- TASK: 20260729-092352
- ALSO COVERS: 20260729-092404
- BRANCH: test/jurassic-data-integrity

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

The reviewer executed every `test:` and `cmd:` proof in both TASK.md files and
ran its own mutation tests rather than trusting the Evidence section: re-wrapping
an `index.json` icon as a list reddened exactly the round-trip pin plus the three
icon assertions; changing one species' `size` reddened only the staleness pin;
replacing `species.icon || defaultIcon` with `|| ""` reddened three card tests;
re-poisoning all 150 icons made the un-fixme'd e2e assertion fail on the real
rendered `src`. It also confirmed the regenerated `index.json` is byte-identical
to the committed one, that no existing test was weakened or deleted, and that
every Evidence claim it re-ran matched reality. All six findings below are
MINOR/NIT, so the verdict is APPROVE; they were fixed anyway rather than banked,
because R1.3 named a guard no test could fail.

- [x] R1.1 (MINOR) e2e/helpers.ts:326 - the comment on
  `isStructurallyValidImageSrc` still described the defect in the present tense
  ("The known species-icon bug stores a stringified Python list"), which is now
  false and reads as if the game still ships broken icons.
  - Response: Reworded to past tense, naming the repairing task and saying what
    the leading-"[" guard is still for.
- [x] R1.2 (MINOR) src/ui/onboarding.ts:47 and src/treeBuilder.ts:39 - both
  comments justify a design choice with "this repo has no jsdom environment",
  a premise this branch invalidates. A reader could conclude the constraint is
  gone entirely, when the `src/ui/**` coverage exclusion still binds.
  - Response: Both updated to say jsdom is opt-in per file (pointing at
    `test/cardRendering.test.ts`), that `node` remains the DEFAULT environment,
    and that the coverage exclusion is the part that still binds.
- [x] R1.3 (MINOR) scripts/markdown_to_json.py:27 - `validate_attributes` is the
  only new runtime behavior in `scripts/`, AGENTS.md documents it as a standing
  guarantee, and nothing in `npm run ci` exercised it: deleting the call from
  both sites left the entire gate green, because the Jest tests only assert over
  the committed data, which would still be clean. The DoD proof was a hand-run
  command nobody will re-run.
  - Response: Added `scripts/test_content_pipeline.py` (stdlib `unittest`, 10
    tests) covering the predicate, both directions' refusal, the "writes nothing
    on failure" property and "leaves an existing payload untouched". Wired into
    the gate as `npm run test:pipeline` and into `.github/workflows/ci.yml`.
    Verified it bites: deleting the `validate_attributes` call turns 3 of the 10
    red. This was the most valuable finding of the round - the guard was a
    comment with a function body.
- [x] R1.4 (MINOR) scripts/csv_to_json.py:65 - a third pipeline entry point
  rewrites `index.json` directly with no validation and without touching the
  markdown source, so it could both launder a value and desync the payload,
  while the new AGENTS.md paragraph read as if the whole pipeline were guarded.
  - Response: Guarded rather than documented as an exception. `merge_csv` now
    validates every merged record before writing, exits non-zero with the same
    named refusal, and AGENTS.md says "all three scripts" and tells the reader
    to re-run `markdown_to_json.py` after a merge.
- [x] R1.5 (NIT) src/frontMatter.ts:53 - `isSerializedCollection` and
  `COLLECTION_REPR` are a hand-copied predicate mirror with nothing
  cross-checking them, the pattern
  `LESSONS.md: hand-copied-logic-mirrors-rot-...` warns about. The round-trip
  test keeps the two PARSERS honest but says nothing about the two predicates.
  - Response: Both files now carry a MIRRORED-in cross-reference naming the
    other, and `scripts/test_content_pipeline.py` asserts the same five examples
    as `contentSource.test.ts`'s "recognises the historical defect shape", so
    loosening one side reddens a test.
- [x] R1.6 (NIT) scripts/json_to_markdown.py:30 - in the reverse direction the
  values come from `index.json`, where a number, `null` or a nested object is
  representable, so `value.strip()` would raise a bare `AttributeError`
  traceback instead of the clean named refusal.
  - Response: `validate_attributes` now rejects a non-string by name first,
    covered by `test_rejects_a_non_string_by_name` over four such values.

Pending user checks: none - neither task has a `manual:` DoD item.

The reviewer noted `tatr check --ledger LESSONS.md` red with
`closed-missing-review`/`closed-missing-retro` for both tasks. That is the
flow-ordering artifact of `/work` closing a task before REVIEW.md and RETRO.md
exist; this file is one of the two, and it clears when the retro lands.

It also observed that with all 150 icons poisoned, the older
`first screen has no structurally broken images` e2e test still passed - the
daily page renders no species-card icon, so that test never covered this defect.
Pre-existing, and precisely the gap this branch closes.

Full gate re-run after the fixes: `npm run ci` exit 0 - 10 pipeline tests, 279
Jest tests in 18 suites, 87 Playwright tests, coverage 94.4 / 79.06 / 99 / 97.79
against the raised 94 / 78 / 98 / 97 floors.
