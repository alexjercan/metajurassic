# Write the comment and file-size policy into AGENTS.md

- STATUS: OPEN
- PRIORITY: 71
- TAGS: docs, process, refactor
- KIND: STORY
- FLOW STEP: PLANNED
- PLAN STATUS: APPROVED
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

- [ ] Write `NOTES.md` with the reproducing greps recorded verbatim, then the
      inventory they produce: one row per directory (`src`, `scripts`, `test`,
      `e2e`) with keep / compact / discard counts, and a second table naming
      every file that carries a task-ID comment. Measured baseline on
      `master`: 603 / 301 / 780 / 1166 comment-ish lines, 89 comment lines
      matching a task ID across 38 files, 2 marker comments
      (`scripts/playtest/walkthrough.ts:337`, `difficulty.ts:291`).
      Bucketing is per comment, read, not per grep hit.
- [ ] Decide the four hard cases in `DECISION.md`, one `###` heading each,
      each naming the rule it establishes and a real example line from the
      inventory: (a) an inline `DECISION.md`/task pointer, (b) rationale that
      exists only in the comment, (c) a comment describing behaviour that no
      longer ships, (d) a test comment explaining why an assertion is the
      assertion.
- [ ] Add a `## Comments` section to `AGENTS.md`, placed before
      `## Conventions`: keep table, discard table, the compaction rule
      (partly load-bearing comment keeps the constraint, drops the story), and
      where long rationale goes instead (task record plus a one-line code
      pointer). Include the marker forms `NOTE:` / `FIXME:` / `TODO:` /
      `BUG:` with the tatr ID, so a live pointer differs from archaeology by
      shape alone.
- [ ] Add a `## File size` section beside it: several unrelated jobs in one
      file forces a split; mere length does not, and a single caller wanting
      an abstraction does not (KISS, YAGNI). Say that a split moves code and
      never generalizes it.
- [ ] Replace the `## Conventions` bullet "Code comments: docstrings or
      essential implementation notes only" scope, if present, with a pointer
      to `## Comments` so the rule lives in one place. Confirm first; skip
      with a recorded reason if the repository file has no such bullet.
- [ ] Do NOT edit any file under `src/`, `test/`, `e2e/`, `scripts/`. Rules
      only. A comment worth changing becomes a sibling task's work, not this
      one's.
- [ ] Run `npm run ci` inside `nix develop`.

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
