# Review: Delete the dead markdownLoader

- TASK: 20260730-120401
- BRANCH: chore/delete-dead-markdownloader

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) src/frontMatter.ts:10 - the rewritten block keeps the
  `NOTE: 20260730-120401` prefix, but AGENTS.md `## Comments` is explicit that
  `NOTE:`/`FIXME:`/`TODO:`/`BUG:` plus a tatr ID "means work that is still
  open" and "a task ID in any other shape is history and belongs in the
  record, not the code". This branch closes that task, so the marker ships
  already dead, and it is the only `NOTE: <id>` left in `src`, `test`, `e2e`
  or `scripts`. The block also reproduces the DECISION.md rationale in full,
  which the same section says to "compact to one line plus the pointer".
  Replace lines 10-15 with a marker-free constraint plus a pointer, in the
  house form used by `src/ui/treeNav.ts:6` and `src/constants.ts:9`: state
  that no shipped browser path parses frontmatter because the app loads the
  generated `src/jurassic/index.json`, that the module nonetheless stays under
  `src/` as the TypeScript mirror of `scripts/markdown_to_json.py` rather than
  as test scaffolding, and close with
  `See tasks/20260730-120401/DECISION.md.`
  - Response: Rewritten marker-free. The block is now four lines: no shipped
    browser path parses frontmatter because the app loads the generated
    `src/jurassic/index.json`, so the module stays under `src/` as the
    TypeScript mirror of `scripts/markdown_to_json.py` rather than test
    scaffolding, then `See tasks/20260730-120401/DECISION.md.` The consumer
    list went with it, which is R1.3. `grep -rn 'NOTE: 202' src test e2e
    scripts` is now empty.
- [x] R1.2 (MAJOR) tasks/20260730-120401/TASK.md:97 - Close-out WHAT records
  the deletion as "128 lines". `git show master:src/markdownLoader.ts | wc -l`
  is 87 and the diffstat records 87 deletions, so no rig produced 128. Change
  "128 lines" to "87 lines".
  - Response: Corrected to "87 lines", which is what
    `git show master:src/markdownLoader.ts | wc -l` and the diffstat both
    report.
- [x] R1.3 (MINOR) src/frontMatter.ts:11 - "The only consumers are
  `test/contentSource.test.ts` and `test/dataIntegrity.test.ts`" restates
  lines 3-6, which already name both consumers and say which export each one
  reads. Drop that sentence when applying R1.1 and leave the existing
  paragraph as the single statement of consumers.
  - Response: Sentence dropped as part of the R1.1 rewrite. Lines 3-6 are
    again the only statement of who imports what.
- [x] R1.4 (NIT) jest.config.js:8 - the pointer is a bare id,
  `See 20260804-140413.`, where every other in-code record pointer in the
  repository uses the path form (`src/constants.ts:9`, `src/ui/treeNav.ts:6`,
  `src/rankLadder.ts:17`, and 17 more). Change it to
  `See tasks/20260804-140413/`.
  - Response: Changed to `See tasks/20260804-140413/.` DoD proof 3
    (`grep -n '20260804-140413' jest.config.js`) still matches.
- [x] R1.5 (NIT) test/contentSource.test.ts:8 - dropping the clause left a
  ragged short line, "and asserts the reconstructed graph". Reflow lines 8-10
  to the surrounding comment width.
  - Response: Paragraph reflowed; no line is now short of the surrounding
    width except where `scripts/markdown_to_json.py` forces the wrap.

Verified by the recording pass, independently of the reviewer:

- All four `cmd:` proofs run from the worktree: P1 exit 0, P2 exit 0, P3
  matches `jest.config.js:8`, `npm run ci` exit 0 (format:check, lint,
  `test:pipeline`, jest with coverage, 184 Playwright specs). No `manual:`
  proofs exist on this task.
- R1.2 re-derived here, not taken from the reviewer:
  `git show master:src/markdownLoader.ts | wc -l` is 87.
- R1.1 re-derived against AGENTS.md lines 140 and 160-162 and against
  `grep -rn 'NOTE: 202' src test e2e scripts` - one hit, this one.
- R1.4 re-derived against `grep -rn 'DECISION.md' src test e2e scripts` - 20
  pointers, all in `tasks/<id>/...` path form.
- `coverage/lcov.info` carries 21 `SF:` entries, matching the CORRECTION in
  Close-out rather than the plan's "19"; the correction is recorded, not left
  standing.
- Steps 1-4 match the diff literally. No test was deleted or weakened;
  `test/contentSource.test.ts` changed only in its header comment, so the
  drift gate DECISION.md leans on is intact.
- Working tree clean; the `node_modules` symlink used to run the suite was
  removed afterwards.

Not verified:

- The "sorted `SF:` list byte-identical before and after" claim was not
  re-derived by rebuilding coverage on `master`. It is consistent with the
  deleted file being uninstrumented by construction, which the report confirms.
- `npm run build` was not run - it is not in `npm run ci` and not a proof. The
  deletion removes the repository's only `require.context` call site, so the
  bundle path is the one thing neither review pass exercised.

Process signal: the plan's greppable proofs pinned every code-side residue,
and all three were red on the base for the stated reason. The two findings
above that are not nits both sit in prose the proofs could not reach - a
comment convention and a close-out number. A `cmd:` capturing the deleted
file's line count, or a repository-wide `! grep -rn 'NOTE: 202'` guard, would
have caught them at planning time.

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

No new findings. All five round-1 findings verified fixed against the files
themselves rather than against their Response lines, and every box above ticked
on that confirmation.

- R1.1: `src/frontMatter.ts:10-13` is marker-free and in the house form used by
  `src/constants.ts:9` and `src/ui/treeNav.ts:6` - constraint, then
  `See tasks/20260730-120401/DECISION.md.`
  `grep -rn 'NOTE: 202' src test e2e scripts` exits 1.
- R1.2: Close-out WHAT reads "87 lines", matching the diffstat and
  `git show master:src/markdownLoader.ts | wc -l`.
- R1.3: the duplicate consumer sentence is gone; lines 3-6 are again the single
  statement of who imports what.
- R1.4: `jest.config.js:8` reads `See tasks/20260804-140413/.` and DoD proof 3
  still matches it.
- R1.5: `test/contentSource.test.ts:8-15` measures 79/72/74/76/53/74/72/80
  columns; the one short line is the wrap `scripts/markdown_to_json.py` forces
  on the next.

All four `cmd:` proofs re-run from the worktree after the fixes: P1 exit 0,
P2 exit 0, P3 hits line 8, `npm run ci` exit 0 (format:check, lint,
`test:pipeline`, jest with coverage, 184 Playwright specs). No `manual:` proofs
exist on this task, so there are no pending user checks.

Round 1's one unexercised path is now closed: `npm run build` exits 0. The
deletion removed the repository's only `require.context` call site, and the
bundle builds clean without it.

The round-2 fixes touched comment prose and TASK.md only - no source logic and
no test assertion changed - so the drift gate `test/contentSource.test.ts`
enforces is untouched.

Still not re-derived, carried forward from round 1 and not blocking: the
"sorted `SF:` list byte-identical before and after" claim was never checked by
rebuilding coverage on `master`. `coverage/lcov.info` carries 21 `SF:` entries,
matching the recorded CORRECTION, and the deleted file was uninstrumented by
construction.
