# Add a whole-record-tree search that labels hits by record KIND

- STATUS: OPEN
- PRIORITY: 36
- TAGS: process,tooling
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As an author about to write "no record holds this", I want one command that
searches the whole record tree and labels every hit by record KIND, so that a
negative claim comes with evidence instead of a scroll that stopped early.

## Problem

Promoted from `LESSONS.md`
`search-the-whole-record-tree-before-declaring-a-rationale-unrecorded` (x4):
20260731-212610, 20260731-212612, 20260731-212613, 20260731-212615. Four hits,
four DIFFERENT reasons - grep scoped to the records the comment named, terms
taken from the comment's wording rather than its subject, output under-read at
the `DECISION.md` files, and only the first of two cited IDs chased. Prose has
been rewritten twice and failed again, because each fix addressed the previous
instance's reason.

## Steps

- [ ] Add a `tatr` subcommand taking a phrase or symbol, searching all of
      `tasks/` and printing every hit WITH its record KIND.
- [ ] Accept several IDs or phrases in one call, so a comment citing two tasks
      cannot be half-chased.
- [ ] Decide the output shape (grouped by KIND vs by task) and record it.
