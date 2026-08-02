# Write the comment and file-size policy into AGENTS.md

- PRIORITY: 71
- TAGS: docs, process, refactor
- KIND: STORY
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE
- PARENT: 20260731-212345

## Story

As a maintainer, I want the comment and file-size rules written down before any
file is touched, so that eight cleanup tasks apply one standard and the pass
does not regress next quarter.

## Problem

`AGENTS.md` says "Code comments: docstrings or essential implementation notes
only" in the global file, and nothing about it in the repository file. That is
too thin to settle the 37 inline task-ID references, or to tell a rationale
essay from a load-bearing guard. Without a written rule, each sibling task
invents its own and the codebase ends up inconsistent.

## Steps

- [x] Write `NOTES.md` with the reproducing greps recorded verbatim, then the
      inventory they produce: one row per directory (`src`, `scripts`, `test`,
      `e2e`) with keep / compact / discard counts, and a second table naming
      every file that carries a task-ID comment. Measured baseline on
      `master`: 603 / 301 / 780 / 1166 comment-ish lines, 89 comment lines
      matching a task ID across 38 files, 2 marker comments
      (`scripts/playtest/walkthrough.ts:337`, `difficulty.ts:291`).
      Bucketing is per comment, read, not per grep hit.
- [x] Decide the four hard cases in `DECISION.md`, one `###` heading each,
      each naming the rule it establishes and a real example line from the
      inventory: (a) an inline `DECISION.md`/task pointer, (b) rationale that
      exists only in the comment, (c) a comment describing behaviour that no
      longer ships, (d) a test comment explaining why an assertion is the
      assertion.
- [x] Add a `## Comments` section to `AGENTS.md`, placed before
      `## Conventions`: keep table, discard table, the compaction rule
      (partly load-bearing comment keeps the constraint, drops the story), and
      where long rationale goes instead (task record plus a one-line code
      pointer). Include the marker forms `NOTE:` / `FIXME:` / `TODO:` /
      `BUG:` with the tatr ID, so a live pointer differs from archaeology by
      shape alone.
- [x] Add a `## File size` section beside it: several unrelated jobs in one
      file forces a split; mere length does not, and a single caller wanting
      an abstraction does not (KISS, YAGNI). Say that a split moves code and
      never generalizes it.
- [x] Replace the `## Conventions` bullet "Code comments: docstrings or
      essential implementation notes only" scope, if present, with a pointer
      to `## Comments` so the rule lives in one place. Confirm first; skip
      with a recorded reason if the repository file has no such bullet.
- [x] Do NOT edit any file under `src/`, `test/`, `e2e/`, `scripts/`. Rules
      only. A comment worth changing becomes a sibling task's work, not this
      one's.
- [x] Run `npm run ci` inside `nix develop`.

## Definition of Done

- The bucketed inventory exists with per-directory counts and the greps that
  reproduce it.
  (cmd: `grep -qE '^\| *(src|scripts|test|e2e) *\|' tasks/20260731-212557/NOTES.md`)
- `AGENTS.md` has a `## Comments` section.
  (cmd: `grep -qE '^## Comments' AGENTS.md`)
- That section documents the live-marker forms, so a live pointer is
  distinguishable from archaeology by shape.
  (cmd: `grep -qE 'FIXME:' AGENTS.md`)
- `AGENTS.md` states what forces a file split and what does not.
  (cmd: `grep -qiE '^## File size' AGENTS.md`)
- Each of the four hard cases has its own recorded decision.
  (cmd: `test "$(grep -c '^### ' tasks/20260731-212557/DECISION.md)" -ge 4`)
- No file under `src/`, `test/`, `e2e/`, `scripts/` is modified by this task.
  (cmd: `! git diff --name-only master...HEAD | grep -qvE '^(AGENTS\.md|tasks/)'`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Proof state on `master`: the `NOTES.md`, `DECISION.md`, `## Comments`,
  `FIXME:`, and `## File size` proofs are all red (files and sections absent).
  Confirmed by running each.
- The scope-guard proof is green on `master` by construction: it guards the
  diff rather than pinning a missing change. Kept because the epic's
  no-source-edit constraint is the main risk in this task.
- The epic's stated "37 inline task-ID references" counts comments; the grep
  counts comment *lines*, hence 89. `NOTES.md` records both so sibling tasks
  measure against the same number.
- `test/lintGate.test.ts` exists, but mechanizing the comment rule as a lint
  gate is out of scope here: it would edit `test/`, which this task forbids.

## Close-out

**What and why.** `AGENTS.md` gains `## Comments` and `## File size`, placed
before `## Conventions`, with a one-line cross-reference from `## Conventions`
so the rule has one home. `NOTES.md` holds the measured population the eight
sibling tasks work against; `DECISION.md` settles the four cases the epic's
tables do not.

**The counting method changed the answer.** The plan's baseline (603/301/780/
1166 lines, 89 task-ref comment lines) came from a line grep. Both halves were
wrong in ways that mattered:

- A run of consecutive `//` lines is one comment, not N. Counting lines makes
  a well-commented file look like a badly-commented one.
- The TypeScript *scanner* mistakes a regex literal for a comment and then
  swallows the rest of the file. `src/markdownLoader.ts:29`
  (`.replace(/\.md$/, "")`) did exactly that and hid every comment in
  `src/ui/treeVisualizer.ts` below it - the first run reported 115 comments in
  `src/` where there are 223. Re-running through the PARSER, which resolves
  regex-vs-divide, fixed it. Comment-line totals then matched the independent
  grep exactly (`e2e` 1166 both ways), which is what says the second method is
  right.

Final population: 837 comments / 3103 lines. 620 keep, 73 compact, 144
discard, 75 carrying a task reference.

**What the numbers say, against expectation.** The epic assumed a broad pass.
The discards are not broad: 110 of 144 sit in five files (`src/profile.ts` 30,
`src/gameStats.ts` 24, `src/treeBuilder.ts` 15, `test/gameStats.test.ts` 30,
`test/treeBuilder.test.ts` 11). `e2e/` is 237 keep against 14 discard. The
epic's Fog asked whether `test/`+`e2e/` density is a problem or a feature; the
inventory answers "feature", and the rules now say so explicitly so siblings
20260731-212615 and -212616 do not thin them.

**Alternatives rejected.** (a) Bucketing by a regex classifier - rejected, the
keep/discard line is a judgement about whether a reader could recover the fact,
which no pattern expresses. Every one of the 837 was read. (b) A lint rule
enforcing the policy - it would edit `test/`, which this task forbids; and the
rule's hard cases are exactly the ones a linter cannot judge.

**Difficulties.** The proof `grep -qE '^\| *(src|scripts|test|e2e) *\|'` went
red against a NOTES.md table whose first column was written as `` `src` ``.
The table lost its backticks rather than the proof its meaning.

**Reflection.** Writing the inventory before the rule was the right order and
nearly went the other way: the "compact only towards an existing record" rule
in `DECISION.md` case 2 exists only because reading `src/gameData.ts:5` showed
a long rationale with no record behind it. A rule written from the epic's
tables alone would have compacted it into a pointer to nothing.

**Evidence.** `npm run ci` green in `nix develop` (126 E2E passed, exit 0).
All seven DoD proofs run and green. `git diff --name-only master...HEAD`
touches `AGENTS.md` and `tasks/` only.

**Step 5 skipped, with reason.** The bullet "Code comments: docstrings or
essential implementation notes only" lives in the global `~/AGENTS.md`, not in
this repository's. There was nothing to replace. The repository file gains a
cross-reference bullet under `## Conventions` instead.

**Worktree note.** `node_modules` is symlinked into the sprout and shows as
untracked: `.gitignore:60` is `node_modules/`, and the trailing slash does not
match a symlink. Not touched here - it is a pre-existing worktree wart, not
this task's.
