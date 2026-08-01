# Review: KISS pass: Jest suites and playtest rigs

- TASK: 20260731-212616
- BRANCH: refactor/kiss-jest-playtest

## Round 1

- REVIEWER: out-of-context subagent (general-purpose, opus), findings
  re-derived in session
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) scripts/playtest/hint.ts:13 - the rewritten header claims
  "Cross-checks on every run: `sanityCheck` ...", and ten lines later documents
  `PLAYTEST_ONLY=rescue`, which returns from `main()` at hint.ts:823 BEFORE
  `sanityCheck(data)` is ever called. A header written by this task to be the
  honest one now contradicts itself; under the AGENTS.md comment policy that is
  the "describes behaviour that no longer ships" case. Qualify it - "on every
  full run" - or state that the rescue-only path skips it.
  - Response: fixed in aa49ff0. Reads "on every full run" and names the
    exception. Verified both ways: the default run prints the sanity line,
    `PLAYTEST_ONLY=rescue` prints only `## 5`.
- [x] R1.2 (MINOR) tasks/20260731-212616/NOTES.md:66 - the ID audit says the
  twelve non-marker hits are each "`See tasks/<id>/DECISION.md` or `SPIKE.md`,
  each after the constraint it explains". `test/setTimeZone.js:10` is not: it
  is a bare `(tasks/20260729-122943)` naming a task folder with no record file
  cited. The file is untouched by this diff, so the code is a pre-existing
  matter - but the audit's claim about it is wrong. Either exempt it explicitly
  in the table or fix the pointer.
  - Response: fixed in aa49ff0, in the record. `setTimeZone.js` now has its own
    row saying what it is and why it was left alone: it is jest `globalSetup`,
    not a suite Step 5 names, and the diff does not touch it. The remaining
    count is 11, not 12.
- [x] R1.3 (MINOR) test/autocomplete.test.ts:8 - the compaction left the
  sentence ungrammatical: "because both defects this pins are about ORDER".
  Read "because both defects these tests pin are about ORDER".
  - Response: fixed in aa49ff0, exactly as worded.
- [x] R1.4 (NIT) tasks/20260731-212616/NOTES.md:31 - the DoD asks for before and
  after `wc -l` for every file touched. The table lists two unchanged files
  (`lintGate.test.ts`, `difficulty.ts`) but omits seven others that are also
  touched and also unchanged (`autocomplete`, `autocompleteBlur`, `closeness`,
  `gameData`, `hintRule`, `onboarding`, `treeLayout`). List them or state that
  every other touched file is unchanged in length.
  - Response: fixed in aa49ff0. NOTES.md now lists all seven with their
    (unchanged) counts.
- [x] R1.5 (NIT) tasks/20260731-212616/TASK.md:94 - "Moves are verbatim" is
  inexact: the `calculateRollingAverage` move also dropped two narration
  comments ("// Should have 2 separate data points", "// Should have 2 separate
  weeks"). That is Step 5 doing its job, not a defect, but the claim should say
  the ASSERTIONS are verbatim.
  - Response: fixed in aa49ff0. TASK.md now says the assertions move verbatim
    and that Step 5 still applies to comments inside a moved block; NOTES.md
    names the two dropped lines.
- [x] R1.6 (NIT) test/treeFixtures.ts:116 - the file ends `}\n\n`. `test/` is
  outside the prettier glob, so nothing catches it. Drop the trailing blank
  line.
  - Response: fixed in aa49ff0. File is 115 lines and ends `}` plus one
    newline.
- [x] R1.7 (NIT) test/hintRule.test.ts:134 - three compactions left a ragged
  short line where the deleted clause used to be: "// Regression pin.
  Tyrannosaurus used to be", and the same at test/autocomplete.test.ts:86 and
  test/lintGate.test.ts:104. Reflow the paragraphs.
  - Response: fixed in aa49ff0. All three reflowed; none changed the file's
    line count.

### Verification

- Parity re-derived independently by the reviewer from a detached worktree at
  `master` (`1e83a04`, also the merge-base): 323 names each side, empty diff,
  md5 `332edcc18fac4f471bc7357d937c5cdd` on both. Matches the record.
- Move fidelity checked mechanically by line-multiset comparison of each old
  file against its three successors. The only deltas are `export` keywords,
  import headers, deleted banners, and the two comments in R1.5. No `expect`,
  fixture value, `beforeEach` or `afterEach` changed or lost. Both fixture
  modules are faithful copies.
- R1.1 re-derived in session against hint.ts:821-825: the `PLAYTEST_ONLY` early
  return does precede `sanityCheck`.
- `npm run ci` green on the branch: format:check, lint `--max-warnings=0`,
  test:pipeline, 323 unit, 126 e2e. `playtest:hint` 548/548;
  `playtest:difficulty` prints its full report.
- All NOTES.md line counts verified on both sides, including 7711 -> 7709.
- Not verified: `npm run playtest:walkthrough` (needs a running server; out of
  the DoD by plan, lints clean).
- `test/contentSource.test.ts` is named in Step 5 but untouched. Inspected: its
  single ID is a well-formed pointer and nothing else qualified. Correct.
- The remaining `// ====` banners inside `treeBuilder.test.ts` mark sub-sections
  of one `describe` over one function, not a file boundary. Leaving them is
  right.

No pending `manual:` proofs.

## Round 2

- REVIEWER: in-session. Exception to the out-of-context default is recorded
  here: every round-1 finding was a comment-text or record correction with no
  logic in it, and the round-1 reader's mechanical checks (parity, line-multiset
  move fidelity) still hold because no assertion was touched. A second fresh
  reader would re-derive the same diff it already cleared.
- VERDICT: APPROVE

All seven round-1 findings read back in the tree and verified fixed in
`aa49ff0`:

- R1.1 re-derived by running the rig both ways rather than by reading the
  header. Default run prints `sanity: ... 548/548 agree`; `PLAYTEST_ONLY=rescue`
  prints only `## 5` and no sanity line - which is what the corrected header now
  claims.
- R1.6 checked with `od`: the file ends `}` plus a single newline, 115 lines.
- R1.3 and R1.7 read back at their sites; none changed a file's line count.
- R1.2, R1.4, R1.5 re-read against the tree. `setTimeZone.js` has its own row
  stating it is jest `globalSetup` and untouched, the seven unchanged touched
  files are listed with counts, and the verbatim claim is scoped to assertions
  with the two dropped comment lines named.

Re-verification after the fixes, not only near them:

- Parity still exact against the base-commit list: 323 names, md5
  `332edcc18fac4f471bc7357d937c5cdd`, empty diff.
- `npm run ci` green end to end, exit 0 (format:check, lint `--max-warnings=0`,
  test:pipeline, 323 unit, 126 e2e).
- `npm run playtest:hint` 548/548; `npm run playtest:difficulty` prints all nine
  section headings.
- Line counts re-measured after the fixes and corrected in NOTES.md:
  `treeFixtures.ts` 115, `hint.ts` 836, total 7711 -> 7710. The round-1
  verification note above quotes the pre-fix 7709.

No pending `manual:` proofs.
