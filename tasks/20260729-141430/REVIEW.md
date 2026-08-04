# Review: Normalize typographic punctuation in Jurassic content

- TASK: 20260729-141430
- BRANCH: chore/normalize-typographic-punctuation

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) test/dataIntegrity.test.ts:53 - `TYPOGRAPHIC` is never
  pinned at its own boundary. The only assertion is `offenders` `toEqual([])`
  over data that already conforms, so a regex that matched nothing - the exact
  failure mode the close-out records, an editing tool un-escaping `\uXXXX` -
  would pass silently. Of the banned set only U+2014 is exercised anywhere, and
  only by the hand-run DoD mutation; U+2013 (97 of the 134 characters this task
  removed), the curly quotes, U+2026 and U+2212 are proven by nothing that runs
  in CI. Add a case beside it asserting `TYPOGRAPHIC.test()` is true for each of
  U+2010, U+2013, U+2014, U+2018, U+2019, U+201C, U+201D, U+2026 and U+2212,
  and false for `"Ha\u021Beg"` and `"Rub\u00E9n"`, so the constant's own
  contract is red-gated rather than the payload's current state alone.
  - Response:
- [ ] R1.2 (MINOR) test/dataIntegrity.test.ts:255 - the new case is a verbatim
  copy of the `HTMLISH` case at :233-253; only the regex identifier differs
  across 22 lines of nested loops. Extract
  `function collectOffenders(pattern: RegExp): string[]` above the two cases and
  reduce each to `expect(collectOffenders(HTMLISH)).toEqual([])` /
  `expect(collectOffenders(TYPOGRAPHIC)).toEqual([])`, deleting both duplicated
  loop bodies. Two callers is an abstraction, and the next content guard would
  be a third copy.
  - Response:
- [ ] R1.3 (MINOR) AGENTS.md:83 - the doc-surface sweep missed the one line that
  enumerates what this file guards: "`test/dataIntegrity.test.ts`: graph,
  uniqueness, media, and render-safety rules." The diff adds a fourth category.
  Change it to "`test/dataIntegrity.test.ts`: graph, uniqueness, media,
  render-safety, and punctuation rules."
  - Response:

Verification, run independently by the recording pass rather than taken from
the reviewer:

- Proof 1 (payload mutation) exits 0. Injecting an em dash into
  `src/jurassic/index.json` turns `dataIntegrity` red, and the restore leaves
  the file byte-identical (`git diff --exit-code` clean afterwards).
- Proof 2 (`! rg -q "[en/em dash]" src/jurassic/`) passes. An independent
  non-ASCII sweep over `src/jurassic/` returns exactly three characters, all
  letters: `t-comma` x2 and `e-acute` x1. The two dash classes are gone.
- Proof 3 (regenerate + `git diff --exit-code src/jurassic/index.json`) exits 0,
  so the payload is generated rather than hand-edited.
- Proof 4 (`npm run ci`) exits 0 under `nix develop`: format, lint, the Python
  pipeline, 32 Jest suites / 411 tests, and 184 Playwright tests. The close-out
  numbers reproduce exactly.
- Guard coverage re-derived from source, not from the reviewer's claim:
  `textFieldsOf` returns `period` and `description`, which are the two fields
  the content edit touched, and `Clade` in `src/types.ts` really carries the
  `id` the offender message interpolates. The en dashes all lived in `period:`,
  so the guard does reach them.
- Content quality: the four paired-parenthetical files named in Step 3 read
  correctly as ` -- x -- ` on both sides.
- `test/dataIntegrity.test.ts` is pure ASCII, so it does not trip its own rule.
- No `manual:` proofs exist, so there are no pending user checks.

- Process signal: Step 3 named 4 paired-parenthetical files; the real count is
  9. The plan's measurement was wrong, the implementation caught it and re-read
  all nine, and the close-out records the corrected number. Plan measurement,
  not implementation, was the weak link here - the other three measurements in
  the plan (97, 37, all-between-digits, all-unspaced) held exactly.
