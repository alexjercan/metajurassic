# Tool the stale-pointer check: grep what a diff moved code out of

- STATUS: OPEN
- PRIORITY: 55
- TAGS: tooling,tatr,process
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Problem

`LESSONS.md`: `when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies`
reached x3 and the user chose PROMOTE to tooling.

Three hits, each a stated dependency left behind by a change that was itself
careful:

- 20260729-141414 - a comment in `src/game.ts` named the auto-open invariant a
  fix was removing; a mid-game hint on a phone silently did nothing.
- 20260731-212610 - `AGENTS.md`'s repository map still named the path
  `src/game.ts` after it became `src/game/`.
- 20260731-212617 - three comments (`src/ui/panel.ts`, `src/closeness.ts`,
  `src/index.html`) still named `src/style.css` as the home of rules that had
  moved into `src/partials/`. One is the drift guard for
  `NARROW_VIEWPORT_QUERY`.

The third hit is why prose will not hold it: the rule as written says to grep a
DELETED name, and `src/style.css` was never deleted - it kept its path and lost
its contents, so nothing prompted a grep. A pointer names a file for what is
inside it.

## Notes

Proposal recorded in the ledger: a `tatr` subcommand (or a `work` verification
step backed by one) that takes the paths a diff moved code OUT of and greps the
tree for comments and docs naming them, printing each hit for a keep/repoint
decision. The input already exists in the diff, which is what makes this a tool
rather than a thing to remember.

Design questions for PLANNING: what counts as "moved out of" (a rename, a
delete, a large deletion hunk in a surviving file); whether the check runs in
`tatr` or in the `work` skill's doc sweep; and how a keep decision is recorded
so the same hit is not re-reported every run.
