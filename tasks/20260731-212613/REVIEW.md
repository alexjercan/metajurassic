# Review: KISS pass: practice session, storage, and content loaders

- TASK: 20260731-212613
- BRANCH: refactor/kiss-practice-storage-loaders

## Round 1

- REVIEWER: out-of-context agent, given no prior knowledge of the branch, the
  epic or the sibling children
- VERDICT: REQUEST_CHANGES

Reviewed `ea7a2ef`. Five findings. Every one was a RECORD defect - the code
change was clean in round 1 and is unchanged in substance since.

### R1.1 - "no record holds `isResumable`'s rationale" was false (CONFIRMED)

`NOTES.md`'s records table asserted that nothing in `tasks/` holds the
rationale for `src/practiceSession.ts`'s `isResumable` shape-check. False:
`tasks/20260729-101754/REVIEW.md:123-128` holds it almost verbatim, as the NIT
"a corrupt entry with no `targetId` would resume forever" and its fix. A
literal `grep -rn isResumable tasks/` finds it in one hit. The SUBJECT grep
that was run searched `targetId`, which DOES hit that record - the output was
not read closely enough.

The finding propagated into `TASK.md`'s Close-out Difficulties and Reflection,
both of which were built on the false negative.

**Fixed.** The verdict (keep the comment verbatim) is unchanged, but now rests
on a stated KIND argument rather than an accident: `AGENTS.md` `## Comments`
names `DECISION.md`, `SPIKE.md` and `NOTES.md` as compaction targets, and a
`REVIEW.md` NIT is not one - it is round-1 feedback on one implementation, not
a decision the project holds. `NOTES.md` now cites the record and explains why
it is still not a target; the Close-out was rewritten to match, and the
Reflection now carries the method lesson (a negative record claim needs a
literal SYMBOL-NAME grep as a second pass, and the search must cover the whole
record folder, not just `DECISION.md`).

### R1.2 - a "compacted towards" row whose pointer was missing (CONFIRMED)

`src/practiceSession.ts`'s collided-draw `removeItem` comment was recorded as
compacted towards `20260729-101754/DECISION.md` section 4, but the surviving
comment carried no pointer, so the record was unreachable from the site.
`## Comments` prescribes "compact to one line plus the pointer".

**Fixed.** The pointer is now at `src/practiceSession.ts:151`.

### R1.3 - the rejected seam was 80 lines, not the plan's 60 (PLAUSIBLE)

`DECISION.md` choice 1 said "about 60 lines" while also claiming the argument
was confirmed against the file rather than inherited from the plan. The figure
was inherited. Re-measured on `master`: lines 25-27 plus 50-127, about 80.

**Fixed.** `DECISION.md` states the measured figure and says explicitly that it
is not the plan's estimate. The conclusion (no split) is unaffected and was
independently confirmed by the reviewer.

### R1.4 - a pointer overclaimed its record (PLAUSIBLE)

`resolvePracticeSeed`'s pointer read "Rules 1 and 3 are ... section 4". Section
4 covers rule 1 (fold the param, never persist it) and how a fresh seed is
drawn, but not rule 3 as a resolution rule.

**Fixed.** Narrowed to "Rule 1 is ...".

### R1.5 - `game/index.ts` called a page entry (PLAUSIBLE, cosmetic)

The webpack entries are `index`, `practice`, `faq`, `species`, `clades`,
`profile`; `game/index.ts` is reached from `src/index.ts` and `src/practice.ts`.
The conclusion it supported - nothing imports `markdownLoader` - is
independently true.

**Fixed** in both `DECISION.md` and `NOTES.md`.

## Round 2

- REVIEWER: same out-of-context agent, resumed with its round-1 context intact
- VERDICT: APPROVE

Verified the fixes in `8eb9d0f`. Nothing found. All five are made, and each fix
is itself accurate - including an independent re-derivation of the 80-line seam
and of the `REVIEW.md:123-128` citation. No regression: rig totals still exactly `615 / 27 / 142`, all 27
keep/compact row line numbers still point at their comment, the DoD pointer
grep returns 13 hits (12 pointers + 1 `NOTE:` marker) as recorded,
comment-stripped diffs of the three touched files are identical to `master`,
and `git diff master` over `test`, `e2e` and the three untouched loader files
is empty. Checks green.

## What round 1 was worth

Every finding across this child and its two predecessors has been a record
defect, which is the class a self-review is weakest at - the author cannot
un-know what the record was supposed to say. R1.1 in particular was a claim
that READ as verified (a table row, a named grep, a KIND column) while being
false, and it was the load-bearing claim of the whole Reflection.
