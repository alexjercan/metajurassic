# Review: Split e2e/helpers.ts into focused helper modules

- TASK: 20260731-212615
- BRANCH: 20260731-212615

Nine rounds, one out-of-context reviewer resumed each time. The reviewer
rebuilt the counting rig from `tasks/20260731-212557/NOTES.md` rather than
running the author's, validated it against the three landed sibling tables, and
re-ran all three proofs its own way each round. Every finding was accepted; none
was disputed.

The shape of the rounds is worth recording: round 1 found 2 MAJOR and 9 lesser,
round 2 found 0 MAJOR and 4, round 3 found 0 MAJOR and 3, round 4 found 1 MAJOR
and 1 NIT, round 5 found 2 MINOR, round 6 found 2 MINOR, round 7 found 2 MINOR,
round 8 found 1 MINOR, round 9 found 1 NIT and APPROVED. Of the 28 findings, 25
were RECORD defects and 3 were code.

Round 4's MAJOR is the one worth remembering: it is a comment the pass should
have COMPACTED and did not, found only because the reviewer chased the second
task ID in a comment the author had cleared on the strength of the first.

## Round 1

- REVIEWER: out-of-context agent, rig rebuilt from scratch
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) `e2e/modal.spec.ts:6` - the spec's header comment still read
      "see helpers.ts and DECISION.md". This commit DELETES `e2e/helpers.ts`, so
      the branch shipped a dangling pointer - the "stale reference" discard row,
      and the same staleness class the pass compacted elsewhere. `NOTES.md` also
      claimed "the rest of the directory's comments were read and left alone",
      so the coverage claim was false too.
  - Response: Accepted. Rewritten to `e2e/helpers/content.ts` and
    `tasks/20260729-092258/DECISION.md`, and added as a row in the specs table.
    `grep -rn "helpers\.ts" e2e src test scripts` now returns zero hits.

- [x] R1.2 (MAJOR) `NOTES.md`, specs table, `mobile.spec.ts:253` row - "Evidence
      read: `tasks/20260729-092315/REVIEW.md`" cited the wrong record. That
      review's R1.4 is about a stale `AGENTS.md` sentence. The label belongs to
      `tasks/20260729-141414/REVIEW.md:52` R1.4, whose Response names the very
      test the comment sits above.
  - Response: Accepted, and this is the finding that mattered most - the
    compaction was defensible but its recorded evidence did not support it, and
    `TASK.md` Step 4 makes the citation the deliverable. Corrected, with the
    Response's pinning-test name quoted.

- [x] R1.3 (MINOR) `DECISION.md` - "38 top-level symbols" and a module map
      missing `type FinishedGame`. The file has 39 declarations.
  - Response: Accepted. 39, and `FinishedGame` listed under `content.ts`.

- [x] R1.4 (MINOR) `NOTES.md` - "The +8 lines are the eight modules' own import
      headers" is arithmetically wrong: imports are +12, comment lines -4.
  - Response: Accepted. The delta is now broken out in full.

- [x] R1.5 (MINOR) `NOTES.md` - `mobile.spec.ts` imports from eight modules,
      not the seven claimed.
  - Response: Accepted.

- [x] R1.6 (MINOR) `NOTES.md` - the no-assertion-changed proof used
      `git diff --cached`, which prints nothing on a committed branch, and
      contained a literal placeholder `<the 25 imported symbol names>`. The
      claim was true; the recorded evidence would have passed for any diff.
  - Response: Accepted. Replaced with a runnable `master`-vs-`HEAD` awk/diff
    loop over `git ls-tree`. Exits 0.

- [x] R1.7 (MINOR) `e2e/mobile.spec.ts:669` - a compaction left a 111-character
      comment line; prettier does not reflow comments, so `ci` stayed green.
  - Response: Accepted, rewrapped. `awk 'length>90 && /^\s*(\/\/|\*)/'` over
    `e2e/` is now empty.

- [x] R1.8 (MINOR) `NOTES.md` row 2 / `DECISION.md` - "reordered but with no
      clause dropped" overclaimed. The banner's title clause went, and the
      "arena geometry" half it introduced landed in `arena.ts` with no header at
      all, against `20260731-212557`'s rule that the split takes the heading.
  - Response: Accepted. `arena.ts` gained a two-line file header carrying that
    half; both records now say both halves survive and name the one clause that
    did not.

- [x] R1.9 (NIT) `DECISION.md` - "six of the eight modules are under 232";
      seven are.
  - Response: Accepted.

- [x] R1.10 (NIT) `NOTES.md` - "Only the four-word label went"; six words went.
  - Response: Accepted, with the colon merge named too.

- [x] R1.11 (MINOR) record completeness - `TASK.md` Step 4 asks for the two-grep
      evidence pass on EVERY keep, not only the changed comments. The 57 keeps
      were recorded as one "byte-identical" row with no grep and no record KIND,
      and the epic's Done Means grep over `e2e/` was absent.
  - Response: Accepted. Two new sections: "## The keeps, and the grep behind
    them" and "## Task references surviving in e2e/". The keeps are now split by
    whether they cite a record, the two longest are tabled with their greps and
    the KINDs read, and the Done Means grep is run and its 34 -> 37 movement
    explained.

Verified good in later rounds: the reviewer reproduced every line/comment count,
the 875-line body-identity proof, and the mutation proof (10 failed / 38 passed
on both sides) independently.

## Round 2

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

- [x] R2.1 (MINOR) `NOTES.md` - the section heading said "7 edits" while the
      prose said 8 and the table had 8 rows. Leftover from the R1.1 fix.
  - Response: Accepted.

- [x] R2.2 (MINOR) `NOTES.md` - "all 37 must justify themselves as record
      pointers, and all 37 do: each states its constraint first and points
      second" is a universal several members fail. Several put the ID in the
      first clause; the two IDs this pass introduced are bare attributions, not
      the `tasks/X/DECISION.md` form.
  - Response: Accepted, and this is the same failure as R1.6 in a different
    place - a claim asserted at a convenient altitude rather than measured. The
    blanket claim is replaced by a measured three-row shape table (9 record
    paths, 5 folder paths, 23 bare IDs - since revised to 10/5/22 by R5.1), an explicit statement that "all 37 are
    record pointers" is FALSE, the 12 that are ID-first, and a narrowed claim
    that IS true of all 37: each carries a live constraint the ID identifies
    rather than replaces. `mobile.spec.ts:188-191` is called out as the closest
    call to the discard row and quoted in full.

- [x] R2.3 (NIT) `NOTES.md` - "11 of the 66 helper comments" mixes an
      after-state count with a before-state total; `helpers.ts` itself had 9.
  - Response: Accepted. Reworded to name the after-state population, with
    `helpers.ts`'s own 9 stated beside it (completed in round 3). R6.2 later
    rewrote that sentence again to name the group rather than the count; the
    counts now live only in `NOTES.md` `## What happened to every comment`.

- [x] R2.4 (NIT) `NOTES.md` - the "Records found" column omitted
      `tasks/20260730-165921/TASK.md`, which the named grep returns.
  - Response: Accepted.

## Round 3

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

- [x] R3.1 (MINOR) `NOTES.md`, both "Records found" cells - the cells written to
      fix R2.4 stated grep results rather than running them.
      `20260730-111003/REVIEW.md` contains none of the three terms, so the
      `expectModalFitsViewport` row's union is six files, not the seven
      enumerated, and "all eight KINDs" was wrong.
  - Response: Accepted, and the third instance of the same root cause. Both
    cells now carry the union of the three greps RUN separately: six files for
    row 1 (`20260730-111003/REVIEW.md` explicitly excluded), seven for row 2 -
    which was short one file, `20260729-141428/REVIEW.md`, and had gone
    unflagged.

- [x] R3.2 (MINOR) `NOTES.md` - the five task-citing keeps were described as
      "already in the `AGENTS.md` 'record pointer' keep form - a stated
      constraint followed by the pointer". None of the five is that form; all
      are bare IDs inside a sentence, which the shape table added in round 2
      classifies as attribution, NOT a pointer. The record contradicted itself
      40 lines apart.
  - Response: Accepted. The keep verdict is unchanged but now rests on content
    rather than form, and each of the three cited records is summarised by what
    it actually decides, checked by opening it. Doing that turned up a further
    self-inflicted error: the summaries first drafted for `20260729-130138` and
    `20260729-092352` described records the author had listed but not read. Both
    are now quoted from the files - `20260729-130138/DECISION.md` is "who owns
    the Enter key on the guess input", its `NOTES.md` is a reproduction
    transcript, and `20260729-092352/DECISION.md` is "Jurassic data-integrity
    harness shape" with zero hits for the leading-"[" guard.

- [x] R3.3 (NIT) the author's round-3 handover claimed `helpers.ts`'s own 9 was
      stated in the record; it was not.
  - Response: Accepted, now stated.

## Round 4

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

- [x] R4.1 (MAJOR) `NOTES.md`, the five-keeps paragraph, and
      `e2e/helpers/arena.ts:147` - the paragraph asserts a universal over five
      comments and checks three. The fifth, `touchScrollArena`, cites TWO tasks;
      only `20260331-154614` was considered, and the other, `20260729-092339`,
      has a `DECISION.md` whose `## Fork 3` restates the comment's first
      paragraph nearly clause for clause. So the section's own question - "is
      this rationale duplicated in a `DECISION.md`, making it a COMPACT the pass
      missed?" - is answered yes for that comment, and the record said no.
  - Response: Accepted, and this is the only real code finding since round 1.
    Both texts were read side by side and Fork 3 does restate it. `AGENTS.md`
    is not ambiguous here ("Rationale reproducing a `DECISION.md` - compact to
    one line plus the pointer"), so the comment is compacted rather than the
    claim narrowed: paragraph 1 becomes the constraint plus
    `tasks/20260729-092339/DECISION.md fork 3`. Paragraphs 2 and 3 stay
    verbatim - the reviewer independently established that
    `Input.synthesizeScrollGesture` appears only in that task's RETRO and
    REVIEW, which are not compaction targets, and that the measured "0 -> 172px"
    appears nowhere in `tasks/`. The comment moves out of the keeps list into
    the compact table as row 10; changed helper comments go 9 -> 10 and
    byte-identical 57 -> 56, both re-measured. `arena.ts` stays at 220/9/56. Two figures DO move and were missed here until
    review round 5: the comment leaves the shape table's bare-ID row for its
    record-path row (9/5/23 -> 10/5/22), and the keeps bullet's "6 of the 11
    changed" becomes 7. Bodies still 875/875 identical; `npm run ci` green.

- [x] R4.2 (NIT) `NOTES.md` - "a pasted failure output" describes
      `tasks/20260729-130138/NOTES.md:69`, which is the author's own line
      beneath the fenced output, not output itself.
  - Response: Accepted.

## Round 5

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

Confirmed good: the compaction itself (Fork 3 carries everything paragraph 1
dropped, paragraphs 2 and 3 byte-identical), and the keeps universal, which the
reviewer re-derived independently rather than from the author's list - the four
remaining task-citing keeps cite exactly three records, all checked, with no
fourth record hiding in any of them. That was round 4's hole and it is closed.

- [x] R5.1 (MINOR) `NOTES.md` shape table, and this file's R4.1 response - the
      round-4 fix DID move a figure the response said it did not. `arena.ts:147`
      now carries a `tasks/<id>/<RECORD>.md` path, so it leaves the bare-ID row:
      9/5/23 becomes 10/5/22. The R2.2 response's quoted 9/5/23 also reads as
      current when it is history.
  - Response: Accepted. Table corrected and the move explained in place;
    re-measured with the author's rig independently of the reviewer's
    (`total 37 recordPath 10 folderOnly 5 bareID 22`). The R4.1 response now
    names both figures that moved instead of claiming none did, and the R2.2
    response is marked "since revised".

- [x] R5.2 (MINOR) `NOTES.md` keeps bullet - "6 of the 11 are among the 10
      changed ones, leaving 4 keeps" does not add up; 11 - 6 = 5. The figure is
      7, left at its pre-round-5 value.
  - Response: Accepted. 7, with all seven now enumerated so the arithmetic is
    checkable on its face rather than asserted.

## Round 6

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

Confirmed good: both round-5 corrections, re-derived rather than taken from the
author (`total 37 recordPath 10 folderOnly 5 bareID 22 idInFirstLine 12`, and
the seven enumerated changed ref-carrying comments matching file and line).

- [x] R6.1 (MINOR) `NOTES.md:168` - "The 57 byte-identical helper comments" is
      stale by one; round 4's compaction took it to 56, which the heading, the
      table row and a set diff all agree on. Third consecutive round where a fix
      updated some sites of a count and not all.
  - Response: Accepted, and fixed by R6.2's remedy rather than by editing the
    digit.

- [x] R6.2 (MINOR) `NOTES.md`, whole-record and systemic - the record has a
      nameable fragility, not bad luck. The same counts were restated in six independent places in
      `NOTES.md` plus the `REVIEW.md` responses, with none marked authoritative,
      so every re-measure was a manual fan-out to six sites and the observed
      miss rate was one site per round. The remedy is structural: one measured
      counts block, with the prose referring to the groups by name.
  - Response: Accepted, and this is the right diagnosis - rounds 4, 5 and 6 are
    one defect, not three. `## What happened to every comment` now opens with a
    single counts table (before, after, new, byte-identical, changed, the two
    keep splits, spec edits and deletions) carrying the reproduction command and
    an arithmetic check (`56 + 10 = 66; + 1 = 67; 4 + 52 = 56`). Every prose
    site that restated a figure now names the group instead: the section heading
    dropped its parenthetical, the table's last row says "every other comment",
    and both keeps bullets are titled by kind rather than by count. Verified by
    grepping the whole section for the digits - the only survivors are the
    arithmetic-check line inside the block itself and an unrelated `content.ts:66`
    line reference. Counts re-measured against the rig after the edit; the figures
    themselves live in that block and are deliberately not copied here.

## Round 7

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

Confirmed good: the counts block's figures, measured independently after the
edit, and four of the six restatement sites R6.2 named genuinely gone.

- [x] R7.1 (MINOR) `NOTES.md`, inside the counts block - the artifact declared
      authoritative mis-nested two of its own rows. The two keep sub-rows sat
      under `changed text | 10` with an "of those", so the block read as "4 of
      the 10 changed comments are byte-identical", which is self-contradictory
      and contradicted by its own arithmetic line (`4 + 52 = 56`).
  - Response: Accepted. The two sub-rows moved directly beneath the
    byte-identical row and now say "of those 56". A structural remedy with a
    wrong structure is worse than the fan-out it replaced, so this was the right
    thing to catch first.

- [x] R7.2 (MINOR) `NOTES.md` and `REVIEW.md` - the remedy was thinned, not
      closed, because the block's scoping sentence bound only "the prose below".
      `NOTES.md:61` still restated two owned figures, and `REVIEW.md` carried a
      current-state restatement plus an unmarked quote of text this round
      rewrote.
  - Response: Accepted. The block's sentence now owns the prose ABOVE it too,
    `NOTES.md:61` names the groups instead of the digits, and `REVIEW.md`'s
    current-state line defers to the block. Two exceptions are now stated rather
    than left implicit: the per-file before/after tables carry their own
    `lines / comments / comment lines` triples, which measure a different
    population, and `REVIEW.md` quotes figures as they stood when a finding was
    written - it is a log and must represent the reviewer accurately - with any
    since-changed figure marked as revised.

## Round 8

- REVIEWER: same agent, resumed
- VERDICT: REQUEST_CHANGES

Two exceptions the author asked the reviewer to rule on rather than decide
alone, both ruled LEGITIMATE:

- The per-file `lines / comments / comment lines` tables measure each file's
  size, not the comment-fate census, and `TASK.md` Step 7 mandates them, so
  collapsing them into the counts block would delete a required deliverable.
  The coinciding figures are equal by construction and come from one rig
  invocation, so they cannot silently desynchronise.
- `REVIEW.md` quoting figures as they stood is required, not tolerated: a review
  log's evidentiary value is that it quotes the defective text verbatim, and
  rewriting "the 57 keeps" to 56 would make R1.11 incoherent and misrepresent
  the reviewer. The "since revised" markings are the correct safety valve, and
  match how the repo's other reviews read.

- [x] R8.1 (MINOR) `NOTES.md` - `### Specs (8 edits, 5 deletions)` still
      restated two figures the counts block owns, falsifying the block's own
      scoping sentence. Both digits were correct, so this was duplication rather
      than error - but it is the one site in the record with a documented
      history of going stale exactly this way: it read "(7 edits, 5 deletions)"
      for two rounds after the R1.1 fix added a row, which was finding R2.1.
  - Response: Accepted, and the history is the argument. Parenthetical dropped;
    the table beneath enumerates the rows and the block holds the counts. A
    sweep of the file for block-owned digits outside the block now returns only
    the arithmetic-check line inside the block itself.

## Round 9

- REVIEWER: same agent, resumed
- VERDICT: APPROVE

The reviewer ran its own sweep for block-owned figures outside the counts block
and found zero, agreeing with the author's. Everything re-measured a final time
against its own rig on this commit: the census (66 / 67 / 1 / 56 / 10), 11
ref-carrying helper comments, shape 10 / 5 / 22 with 12 ID-first over 37, module
totals 1420 / 67 / 428 with code 875, directory 4491 / 259 / 1156, and every
`DECISION.md` figure. Code re-verified: helper statements token-identical to
`master:e2e/helpers.ts`, spec bodies identical, `git diff master -- src test
scripts` empty, `npm run ci` exit 0 with Jest 323/323 and e2e 126 passed.

- [x] R9.1 (NIT) `NOTES.md`, first keeps bullet - an edit scar from R6.2's
      rewrite left "Neither restates any of / any of them". A duplicated
      fragment, not a false claim; the reviewer raised it outside the verdict
      rather than folding it in.
  - Response: Accepted, stray words deleted.

Closing assessment, the reviewer's: every figure in both records traces to the
measured block, to a per-file table `TASK.md` Step 7 mandates, or to a
`REVIEW.md` quotation marked as history; the code has been unchanged and
independently re-verified since round 4's compaction; the mutation proof reddens
through the moved helper on both sides; the keeps sweep is complete and earned;
and the one MAJOR that mattered - `touchScrollArena`'s rationale reproducing
Fork 3 - is fixed in the code rather than argued away in the record.
