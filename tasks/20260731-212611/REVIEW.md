# Review: KISS pass: tree pipeline (treeBuilder, treeVisualizer, treeLayout)

- TASK: 20260731-212611
- BRANCH: refactor/kiss-tree-pipeline
- BASE: master @ 2741c23
- HEAD: 062a178

## Round 1

- REVIEWER: in-session (exception, recorded below)
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MINOR) AGENTS.md:21 - repository map does not name `src/hintRule.ts`
- [x] R1.2 (MINOR) tasks/20260731-212611/NOTES.md - "15 narration discards in
      `treeBuilder.ts`" is a per-cluster number presented as a per-file one

**Reviewer identity.** In-session, not an out-of-context subagent. The session
carries a standing instruction not to spawn agents unless the user asks, which
overrides the skill's round-1 default. Recorded as an exception rather than
silently taken: the diff is NOT trivial (2 new modules, 10 changed files), so
this is a weaker round 1 than the skill intends. Mitigation applied: every
load-bearing claim below was re-derived from the tree rather than accepted from
the implementation's own record, and both findings are defects in claims that
the implementation's own `NOTES.md` asserted as correct.

**Checks rerun.** `npm run ci` (126 E2E passed), `npm run build` (exit 0),
`npm run playtest:hint` (exit 0, 548/548 agreement). `tatr check` exit 0.

### Re-derived independently

- **The behaviour-preservation claim.** Re-ran the strip/normalise/sort/diff on
  both clusters. Residue on the `treeBuilder` side is 3 added import lines; on
  the `treeVisualizer` side, 1 added import, `mountTreeScroll`'s signature and
  brace, and its single call site. **Zero removed lines on either side.** The
  claim holds.
- **The deleted comment clause.** `NOTES.md` claims `buildGuessTree`'s
  reveal-set comment listed a condition that never fires ("It is on the path
  between the root and an LCA clade"). Verified from the code, not the record:
  `revealedClades.add` appears exactly four times
  (`src/treeBuilder.ts:78,81,105,118`) - root, hint clades, target-guess LCAs,
  pairwise guess LCAs. Nothing adds a clade for being on a path.
  `getNearestRevealedAncestor` then walks PAST unrevealed intermediates rather
  than revealing them. The bullet was false and the neighbouring "(but NOT
  intermediate path clades)" was the true statement. Deleting it is correct and
  changes no behaviour.
- **The DOM-free claim for `treeLayout.ts`.** The file's whole diff is one word
  in one comment (`treeVisualizer.ts` -> `treeScroll.ts`). The DoD grep's single
  hit is the English word "offset" in prose at line 78, not a DOM identifier.
- **No import cycle.** `hintRule.ts` imports `treeBuilder.ts` type-only;
  `treeBuilder.ts` imports nothing from `hintRule.ts`. `treeVisualizer.ts` ->
  `treeScroll.ts` -> `treeLayout.ts` is a chain, not a cycle.
- **`test/` and `e2e/`.** `git diff master -- test e2e` is 4 content lines, all
  inside import blocks. No assertion, `describe` or `it` touched. `e2e/` empty.

### R1.1 (MINOR) `AGENTS.md:21` - the repository map does not name `src/hintRule.ts`

The `## Repository map` row for `src/` lists the core modules by name -
`gameState.ts`, `gameData.ts`, `treeBuilder.ts`, `puzzleKey.ts`,
`shareText.ts`. The last two are there because sibling 20260731-212610 added
them to the map when it created them. This task creates a core module at the
same level and did not.

Nothing is stale - `treeBuilder.ts` still exists, so this is not child 2's
deleted-path defect - but the map now under-describes `src/`, and the hint rule
is exactly the kind of module a reader scans that row for.
`src/ui/treeScroll.ts` needs no entry: the map covers `src/ui/` as a directory.

Change: add `hintRule.ts` to the `src/` row's core list.

### R1.2 (MINOR) `tasks/20260731-212611/NOTES.md` - "15 narration discards in `treeBuilder.ts`" names the wrong scope

The count is right and the file is not. Enumerated from
`git diff master -- src/treeBuilder.ts | grep -E '^-\s*//'` and classified by
reading each one: 15 comments are discarded outright, but **3 of them sit in
code that moved to `src/hintRule.ts`** (`// Walk from just below the deepest
revealed clade...`, `// Check if any direct child is the "?" placeholder`,
`// Recurse into child clades`). Only **12** are discards from the file
`treeBuilder.ts` keeps.

The record's own example list gives it away: it cites `// Recurse into child
clades`, which is one of the three that moved. The number is correct for the
cluster and wrong for the file it names.

This matters because `NOTES.md` is precedent for five remaining siblings and
the epic's Done Means asks each child for per-file numbers. A per-cluster
number presented as a per-file number is the shape of error the epic's method
rules exist to prevent, and it is the same class as child 2's R1.2 - a claim
that reads as measured but was not re-derived after the code moved.

Change: state 15 across the cluster, 12 in `treeBuilder.ts` and 3 in code that
moved to `hintRule.ts`, and pick an example from the 12 for the file-scoped
sentence.

### Considered and NOT raised

- **`treeVisualizer.ts`'s DoD grep returns one hit.** The criterion says the
  grep should "return only calls into the new modules, no declarations and no
  re-exports". The hit at `src/ui/treeVisualizer.ts:11` is a COMMENT naming
  `focusRect`, not a declaration, call or re-export. The criterion is met in
  substance and `NOTES.md` discloses the hit precisely rather than reporting the
  grep as empty. Correct handling, not a finding.
- **`test/treeLayout.test.ts:206` and `e2e/helpers.ts:511` name `focusRect`.**
  Neither names a FILE, so neither goes stale. No edit needed, and this task may
  not edit test comments anyway.
- **`mountTreeScroll` as a new export.** One caller, no options, no callbacks,
  body identical to the four lines it replaces. `DECISION.md` case 3 states the
  test it has to pass and it passes it. Exporting the mutable instead would be
  the worse route.
- **`consistentCandidates` staying in `gameState.ts`.** The counterfactual
  favours the decision: moving it would put a query over `GameState` inside a
  file whose job is choosing a clade, which is the trigger the epic removes.
  `DECISION.md` case 4 argues it on the merits and names the locality argument
  it rejects.
- **The scroll cluster's 109 comment lines.** Checked the compaction refusal
  rather than assuming it: the rationale for those comments is in
  `tasks/20260729-092339/REVIEW.md` and `RETRO.md`, which `AGENTS.md`
  `## Comments` does not list as compaction targets. Keeping them in full is
  what the policy requires.

## Verdict

**REQUEST_CHANGES.**

Both findings are MINOR and neither touches shipped behaviour; the split itself
is correct, mechanically verified, and green on every gate. They are raised
rather than waived because both are record/doc defects in artefacts that five
remaining siblings will copy from, which is precisely how child 2's two
findings propagated.

## Pending manual items

None. The task declares no `manual:` criteria.

### Responses (round 1)

- **R1.1 FIXED.** `AGENTS.md:21` now lists `hintRule.ts` in the `src/` row's
  core list, between `treeBuilder.ts` and `puzzleKey.ts`. `src/ui/treeScroll.ts`
  deliberately gets no entry, per the finding.
- **R1.2 FIXED.** `NOTES.md` now states 15 discards across the cluster, 12 in
  `treeBuilder.ts` and 3 in code that moved to `hintRule.ts`, names the three,
  and gives file-scoped examples drawn from the 12. It also records how the
  count was enumerated (`git diff` over deleted comment lines, classified by
  reading) and why the rig's comment COUNT cannot answer the question - it nets
  discards against compactions and moves. The one other sentence using the
  figure (the line-total paragraph) now says "the cluster's 15".

## Round 2

- REVIEWER: in-session (same exception as round 1)
- VERDICT: APPROVE

Both round-1 findings confirmed fixed; no fix regressions, and no new findings.

- **R1.1 confirmed.** `AGENTS.md:21` reads `... treeBuilder.ts`, `hintRule.ts`,
  `puzzleKey.ts` ... `src/ui/treeScroll.ts` correctly absent.
- **R1.2 confirmed.** The corrected paragraph splits the figure 12/3, names the
  three that moved, and draws its file-scoped examples from the 12. The prose
  paragraph that reused the number now says "the cluster's 15", so the record no
  longer states the figure two ways. Spot-checked the enumeration method it now
  documents: `git diff master -- src/treeBuilder.ts | grep -cE '^-\s*//'`
  returns 38 deleted comment LINES, which is consistent with 15 discarded
  COMMENTS plus the moved and compacted blocks - and is exactly why the record
  now says the count came from reading the hits rather than from the rig's
  netted comment total.

Checks re-run after the fixes: `npm test` (21 suites, 323 tests, exit 0),
`npm run format:check` exit 0. The fixes touch one doc line and one record
section; no source file changed in round 2, so the full gate from round 1
stands.

## Pending manual items

None.
