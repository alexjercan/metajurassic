# Fix the mis-attributed hint-cost figure in 20260729-092327/DECISION.md

- STATUS: OPEN
- PRIORITY: 30
- TAGS: docs,bug
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Problem

`tasks/20260729-092327/DECISION.md:87-88` states:

> The hint is deliberately a bad buy for a player who can read the tree - it
> costs them +2.2 guesses (`tasks/20260729-160500/SPIKE.md`).

`+2.2` is not the tree-reader figure. `tasks/20260729-160500/SPIKE.md:328-334`
is a two-column table, net guesses per hint bought at `split<=1/2`:

```
            deduce (expert)        read-tree (middling)
cost=3        +2.2 to +2.4           +0.5 to +1.3
```

`+2.2 to +2.4` is the EXPERT column. The read-tree cost at `cost=3` is `+0.5 to
+1.3`. `tasks/20260729-141424/DECISION.md:52` states the same pair correctly
("it costs an expert +2.2 to +2.4 guesses and a tree-reader +0.5 to +1.3"), so
the two landed records disagree with each other and one of them is wrong.

The number was propagated into `src/ui/onboarding.ts`'s hint-copy comment,
which `20260731-212614` corrected against the SPIKE. The record itself is
untouched: a landed `DECISION.md` is not a KISS pass's to rewrite, and the
conclusion it draws ("a bad buy for anyone who can play") holds under both
columns, so this is a wrong citation rather than a wrong decision.

## Steps

- [ ] Confirm the reading against `tasks/20260729-160500/SPIKE.md:328-334` and
      `tasks/20260729-141424/DECISION.md:52`.
- [ ] Correct the figure in `tasks/20260729-092327/DECISION.md:87-88`, keeping
      the argument it supports, and note that the conclusion is unchanged.
- [ ] Re-grep `+2.2` over `tasks/`, `src/`, `test/`, `e2e/` and `scripts/` and
      fix any other site that attributes it to the tree-reader model.

## Definition of Done

- No occurrence of `+2.2` in the tree attributes the figure to a tree-reader.
  (cmd: `grep -rn '2\.2' tasks src test e2e scripts`, each hit checked)
- The corrected sentence still supports the `Stuck?` copy choice it was written
  for. (test: read `tasks/20260729-092327/DECISION.md` `## Chosen`)
