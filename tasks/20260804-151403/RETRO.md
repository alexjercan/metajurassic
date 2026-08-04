# Retro: Publish a VitePress documentation site at /docs

- TASK: 20260804-151403
- BRANCH: feature/vitepress-docs
- REVIEW ROUNDS: 1

## What went well

- DECISION.md closed five forks before the work phase; none reopened. The only
  new choice was `.mts` over root-wide ESM, and it was recorded where a cold
  reader hits it - a comment at the top of the config.
- The plan named a load-bearing invariant (`output.clean: true` means webpack
  must run first) and asked for a test rather than a comment.
  `test/docsGate.test.ts` fails on a reorder, which no other test in the repo
  could see.
- The step that anticipated the `gh-pages.yaml` -> `release.yaml` rename paid
  off: the sprout branched before the rename, the worker applied the edits to
  the file that existed, and `git merge-tree` carries both onto `release.yaml`.
- One review round, verdict APPROVE, no BLOCKER or MAJOR.

## What went wrong

- The doc sweep missed `AGENTS.md`. Three of five findings (R1.1-R1.3) are the
  same omission: this diff changed what `npm run build` does and which Node the
  deploy runs, and added a top-level directory, while `AGENTS.md` still records
  `npm run build  # dist/`, `Node 18`, and a repository map with no `docs/` row.
- Breadth: the diff is large by line count only. 4700 of ~4400 net lines are
  `package-lock.json` (161 added packages, nothing removed or downgraded). The
  hand-written part is seven pages, one config, one test, and four one-line
  entry points - a single feature with no landable split inside it.
- Churn: the plan enumerated its doc surfaces literally - `src/faq.html` and
  `README.md` - and the worker delivered exactly those. The missing question is
  not from-scratch or cold-reader; it is that a Step naming *specific* doc
  surfaces reads as the complete list and suppresses the sweep for the ones it
  did not name.
- Context: nothing observed. No compaction warning, no checkpoint, no handoff
  recorded on this branch.

## What to improve next time

- When a task's Steps enumerate doc surfaces to edit, treat the list as the
  minimum, not the closure. Any diff that changes a documented command's
  behavior, a CI environment value, or the top-level directory set owes
  `AGENTS.md` a pass in the same task.
- A close-out sentence about the state of *another* checkout ("the rename is
  uncommitted in the main checkout") is true for minutes. Record what is true
  of this branch and how it merges, not what a sibling tree looked like.

## Action items

- R1.1-R1.3: update `AGENTS.md` (command block line 44, `npm run build` note
  line 57, CI table line 124, repository map line 30) and `README.md:14`.
  MINOR, non-blocking; carry as follow-up.
- R1.4-R1.5: NIT, optional.

## Landing message

```
docs: publish a VitePress documentation site at /docs
```

Adds VitePress as a devDependency and builds seven Markdown pages into
`dist/docs/`, shipped by the existing Pages deploy at `/metajurassic/docs/`.
`npm run build` chains webpack then VitePress; `test/docsGate.test.ts` pins
that order, because webpack's `output.clean` would otherwise delete the docs
with every command still green. Reachable from one FAQ entry and one README
line. No `src/` runtime change.
