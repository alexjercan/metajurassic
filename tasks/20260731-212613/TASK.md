# KISS pass: practice session, storage, and content loaders

- STATUS: CLOSED
- PRIORITY: 64
- TAGS: refactor, gameplay

## Story

As a maintainer of the persistence layer, I want the practice-round rules and
the content loaders to read as small single-job files, so that the storage
rules stay checkable at a glance.

## Problem

`src/practiceSession.ts` carries the practice-round lifecycle - seed drawing,
round storage, pruning, resume rules, and seed normalization - and 35% of it is
comment, most of it long prose reproducing `tasks/20260729-101754/DECISION.md`
section by section. `src/practice.ts` repeats some of the same rationale inline.

The loader family - `jsonLoader.ts`, `markdownLoader.ts`, `frontMatter.ts`,
`storage.ts` - is small but has never been read as a group.

Baseline, measured on `master` at `7901a17` with the parser rig
(`lines / comments / comment lines`; the rig was first validated by reproducing
child 20260731-212612's landed table exactly):

| File | Lines | Comments | Comment lines | Ratio |
|-|-|-|-|-|
| `src/practiceSession.ts` | 281 | 20 | 98 | 35% |
| `src/practice.ts` | 90 | 5 | 27 | 30% |
| `src/frontMatter.ts` | 66 | 2 | 26 | 39% |
| `src/jsonLoader.ts` | 68 | 1 | 5 | 7% |
| `src/markdownLoader.ts` | 87 | 0 | 0 | 0% |
| `src/storage.ts` | 37 | 0 | 0 | 0% |
| total | 629 | 28 | 156 | 25% |

Two corrections to the numbers this task was drafted with. `practiceSession.ts`
is 281 lines, not 282, and its "98" is comment LINES, not comments - the parser
counts 20 comments. And it is not the highest comment ratio in `src/`: over
files above 20 lines the rig ranks `ui/treeLayout.ts` 44%, `closeness.ts` 42%,
`frontMatter.ts` 39%, `game/onboardingBrief.ts` 39%, `ui/treeScroll.ts` 37%,
then `practiceSession.ts` 35%. It is the largest comment BLOCK left in `src/`
outside `src/ui/`, which is sibling 20260731-212614's cluster.

## Notes

Discovered while planning, and load-bearing for the Steps:

- **`src/markdownLoader.ts` is dead, and is NOT this task's to remove.** It
  exports a `loadGameData` nothing imports: a repo-wide grep for the module name
  outside `tasks/` returns only `src/frontMatter.ts:3` and
  `test/contentSource.test.ts:9`, both in comments, and every page entry
  (`game/index.ts`, `clades.ts`, `species.ts`, `profile/index.ts`) takes
  `loadGameData` from `jsonLoader.ts`. The six webpack entries do not name it.
  That is already an open task - `20260730-120401`, "Delete or wire up the dead
  markdownLoader", filed by `20260729-092352` - and it is the wrong shape for a
  KISS pass: it turns on which loader the project WANTS (checked-in JSON payload
  versus markdown source), which is a product decision, and on why the file does
  not appear in the coverage report at all. Leave the file byte-identical.
- **`src/frontMatter.ts:1-14` states the consequence of that as fact, and it is
  false.** "`markdownLoader.ts` reads it in the browser" describes a path
  nothing takes. The live reader of `parseFrontMatter` is
  `test/contentSource.test.ts`, and of `isSerializedCollection` that test plus
  `test/dataIntegrity.test.ts`. This is a comment defect in this task's scope
  (`## Comments`, "every clause describes behaviour that no longer ships"), not
  a code change: the fix is to say what is true and mark the open question with
  a live tracker marker naming `20260730-120401`.
- **`tasks/20260729-101754/DECISION.md` exists and covers four of the long
  blocks**: section 1 the shared-template new-game control, section 2 the
  abandon retention fork, section 3 the 50-entry cap pruned oldest-first,
  section 4 seeds drawn from `[0, PUZZLE_ID_MODULUS)` with re-draw on collision.
  That makes those four the `## Comments` "rationale reproducing a
  `DECISION.md`" row, with a real record to compact towards.
- **`src/storage.ts` (37/0/0) and `src/jsonLoader.ts` (68/1/5) have nothing to
  do.** `storage.ts` is one interface and one implementation of it with no
  comments. `jsonLoader.ts`'s single comment states why `buildGameData` is split
  from the fetch and cites the mirror-rot lesson - a constraint, a Keep. Read
  them as part of the group, record that the read happened, change neither.

## Steps

Rules come from `AGENTS.md` `## Comments` and `## File size`; worked examples
from `tasks/20260731-212557/DECISION.md`. Do not re-derive them. Siblings
20260731-212610, -212611 and -212612 are landed; their method warnings apply -
count with the PARSER not a grep, enumerate call sites with the widest grep and
filter the output by READING it, grep `tasks/` whole with terms taken from the
comment's SUBJECT rather than its wording and then read the record found and
check its KIND, sweep docs in both polarities, and re-derive every per-file
number against the post-pass tree.

- [x] Rebuild the parser rig (method: `tasks/20260731-212557/NOTES.md`
      `## How the population was counted`; it needs the repo's typescript via
      `NODE_PATH` and a `node_modules` symlink in the worktree) and reproduce
      the baseline table above BEFORE touching anything. Cross-check the rig by
      re-running it over `src/profile/`, `src/gameStats.ts` and
      `src/rollingAverage.ts`, which must return 20260731-212612's landed
      figures 889/10/18.
- [x] Read the loader family as one unit: `jsonLoader.ts`, `markdownLoader.ts`,
      `frontMatter.ts`, `storage.ts`. Record what the read found in `NOTES.md`,
      including the two duplicate `loadGameData` implementations and which one
      ships. Delete nothing: the only dead module is `markdownLoader.ts` and it
      belongs to `20260730-120401` (see `## Notes`). If the read turns up
      anything else that looks unused, prove it with a repo-wide grep and, if it
      is genuinely ambiguous, file it as its own task rather than guessing.
- [x] Write `DECISION.md` before moving or cutting anything, settling two
      choices. (1) Whether `src/practiceSession.ts` splits. The planning read
      says NO and the implementation should confirm or overturn it against the
      file: `AGENTS.md` `## File size` splits a file for several unrelated jobs,
      signalled by section banners - there are none in this cluster - and
      explicitly not for length, nor for "a single caller wanting an
      abstraction". The one candidate seam is the storage scan and reap
      (`StoredRound`, `parseSaved`, `practiceRounds`, `prunePracticeEntries`,
      `MAX_PRACTICE_ENTRIES`, about 60 lines), whose only caller is
      `startNewPracticeRound` in the same file; the file's own header states one
      job, and `test/practiceSession.test.ts` describes the five exports as one
      lifecycle. Overturning this needs a named second job, not a line count.
      (2) What replaces `src/frontMatter.ts:1-14`, given that its central claim
      is false and the module's future is another task's call.
- [x] Compact the comments in `src/practiceSession.ts`. The four rules
      `tasks/20260729-101754/DECISION.md` fixed - current-pointer semantics,
      seed override never stored, the 50-entry prune cap, new-game deletes
      unfinished state - become short constraint lines plus the pointer; the
      narrative history goes. Before compacting each one, grep `tasks/` whole
      with terms from that comment's SUBJECT, read the record found, and check
      its KIND is one `## Comments` accepts. Do NOT assume the DECISION.md
      covers a block because it covers its neighbour: at least
      `prunePracticeEntries`'s "there is deliberately no protect-the-active-round
      parameter" argument, `normalizePracticeSeed`'s two-moduli explanation and
      `isResumable`'s shape-check rationale must each be checked against the
      record separately, and kept in full if the record does not hold them.
- [x] Compact `src/practice.ts` the same way. `practice.ts:35-36` is already a
      constraint plus a pointer and should survive roughly as is; `practice.ts:66`
      buries "is the fix for tasks/20260729-101754 - the round was always being
      SAVED, it was just never read back" inside the resolve comment, which is
      archaeology the record holds.
- [x] Fix `src/frontMatter.ts:1-14` per the `DECISION.md` choice: state the true
      readers, keep the "one parser, not a copy in the test" constraint and the
      deliberate-mirror-of-the-Python-parser constraint, and mark the dead-loader
      question with a `NOTE:` marker naming `20260730-120401`. Leave
      `isSerializedCollection`'s comment alone unless the same rules cut it - it
      states a defect shape and a cross-language mirror contract, both Keeps.
- [x] Sweep the docs in both polarities: grep for every path this task touches,
      and check whether `AGENTS.md` or `README.md` ENUMERATES a category any
      changed file belongs to (`AGENTS.md:21` is the enumeration that caught
      sibling -212611).
- [x] Re-run the rig, fill the before/after table, then `npm run ci` and
      `npm run build` inside `nix develop`.
- [x] Confirm the five listed suites are untouched and green, and that
      `src/markdownLoader.ts` is byte-identical to `master`.

## Definition of Done

- Before/after `wc -l` and parser comment counts recorded for every file in the
  cluster, from the rig rather than by hand.
  (cmd: rig table in `tasks/20260731-212613/NOTES.md`; red on base, where the
  table does not exist and the rig returns 629/28/156 for the six files)
- No numeric comment target was set or chased. The record states, per compacted
  or kept comment, which `## Comments` row decided it and which record it was
  compacted towards.
  (cmd: the keep/compact table in `NOTES.md`, one row per surviving comment,
  each naming a rule row; red on base - no such table exists)
- Every surviving inline task reference in the cluster is a one-line record
  pointer WITH the constraint it explains, or a live tracker marker.
  (cmd: `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/practiceSession.ts
  src/practice.ts src/frontMatter.ts src/jsonLoader.ts src/storage.ts`, each hit
  justified in `NOTES.md`; red on base at `practiceSession.ts:18`, a bare
  "Decisions recorded in tasks/20260729-101754/DECISION.md" with no constraint,
  which `## Comments` "a pointer needs a constraint" forbids)
- `src/markdownLoader.ts` is untouched, its removal left to `20260730-120401`.
  (cmd: `git diff master -- src/markdownLoader.ts` is empty)
- No behaviour moved: no assertion changed in the listed suites, and any diff
  under `test/` or `e2e/` is an import line.
  (cmd: `git diff master -- test e2e`, expected empty; each line listed if not)
- Any dead code removed is proved dead, not assumed - and the expected outcome
  is that none is removed here.
  (cmd: a repo-wide grep per removed symbol, recorded; empty if nothing was
  removed, which is the planned result)
- If `practiceSession.ts` did not split, the record says why against the
  `## File size` criteria rather than by omission.
  (cmd: `DECISION.md` choice 1, naming the candidate seam that was rejected and
  the rule that rejected it)
- `npm run ci` and `npm run build` pass inside `nix develop`. (cmd: both)

## Close-out

**What and why.** Compacted the comment block in `src/practiceSession.ts` and
`src/practice.ts` against `tasks/20260729-101754/DECISION.md`, and rewrote
`src/frontMatter.ts`'s header, whose central claim was false. Six files read as
one cluster; three unchanged. Totals 629/28/156 -> 615/27/142
(`lines / comments / comment lines`, parser rig). No behaviour moved: `git diff
master -- test e2e` is empty and no `src/` statement changed.

**Alternatives.** Splitting `practiceSession.ts` at the storage-scan seam:
rejected in `DECISION.md` choice 1 - no section banners, one caller, and
`parseSaved` straddles the proposed cut. Deleting the false `frontMatter.ts`
header outright: rejected, two of its clauses are Keeps. Deleting the dead
`src/markdownLoader.ts` to make the header true: that is `20260730-120401`, and
this epic files bugs rather than fixing them inline.

**Difficulties.** The one that mattered: `20260729-101754/DECISION.md` covers
`prunePracticeEntries` and `normalizePracticeSeed` in full but does NOT cover
`isResumable`'s shape-check between them, so that comment stays verbatim.
Getting the REASON right took review round 1. The first pass recorded "no
record holds it", which was false - `20260729-101754/REVIEW.md:123-128` holds
it almost verbatim, and a literal `grep -rn isResumable tasks/` finds it in one
hit. The verdict survives on a KIND argument instead: `## Comments` names
`DECISION.md`, `SPIKE.md` and `NOTES.md` as compaction targets, and a REVIEW.md
NIT is not one. `frontMatter.ts` also grew by 5 lines, because saying what is
true plus marking the open question costs more than the false sentence it
replaced - recorded rather than smoothed over.

**Evidence.** `NOTES.md`: rig validated at 889/10/18 and 629/28/156 before use;
before/after table; a keep/compact row per surviving comment naming its rule and
its record; a record-check row per compacted comment; the doc sweep in both
polarities. `npm run ci` green (lint clean, 323 Jest, 126 Playwright) and
`npm run build` successful inside `nix develop`.

**Reflection.** The loader read was worth doing as a group: the dead
`markdownLoader.ts` is invisible file by file, and it is the reason a comment
two modules away was lying. Two lessons for the remaining children. First, a
SUBJECT grep that returns nothing is a claim, and a negative claim is the
easiest kind to get wrong - before writing "no record holds this", grep the
SYMBOL NAME literally over `tasks/` as a second pass. Second, the search must
cover the whole record folder, not just `DECISION.md`: the rationale here was
in the same task's `REVIEW.md`, which changes what the record SAYS even when it
does not change the verdict.
