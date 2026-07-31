# KISS pass: practice session, storage, and content loaders

- STATUS: OPEN
- PRIORITY: 64
- TAGS: refactor,gameplay
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer of the persistence layer, I want the practice-round rules and
the content loaders to read as small single-job files, so that the storage
rules stay checkable at a glance.

## Problem

`src/practiceSession.ts` (282 lines, 98 comment - the highest ratio in `src/`)
carries seed drawing, round storage, pruning, resume rules, and seed
normalization, with long prose reproducing
`tasks/20260729-101754/DECISION.md`.

`src/practice.ts` (90 lines) repeats some of that rationale inline. The loader
family - `jsonLoader.ts`, `markdownLoader.ts`, `frontMatter.ts`,
`storage.ts` - is small but has never been read as a group; check for duplicated
parsing and dead paths.

## Steps

- [ ] Follow the rules from the policy task.
- [ ] Read the loader family as one unit first. Note any duplicated parsing or
      unused export, and record it; delete only what is provably unused, and
      file anything ambiguous as its own task rather than guessing.
- [ ] Split `practiceSession.ts` if the read finds two jobs (seed selection and
      normalization vs round storage, pruning, and resume). One file is an
      acceptable outcome if the seam is not real - record which.
- [ ] Compact the comments in `practiceSession.ts` and `practice.ts`. The
      rules that `DECISION.md` fixed (current-pointer semantics, seed override
      never stored, prune cap, new-game deletes unfinished state) stay as short
      constraint lines beside the code that enforces them; the narrative
      history goes.
- [ ] Prove no behaviour moved: `test/practiceSession.test.ts`,
      `test/seedMode.test.ts`, `test/storage.test.ts`,
      `test/contentSource.test.ts`, `e2e/seed.spec.ts` and
      `e2e/practice.spec.ts` are untouched and green.

## Definition of Done

- Before/after `wc -l` recorded for every file in the cluster.
  (cmd: `wc -l` table in the task record)
- No assertion changed in the listed suites. (cmd: `git diff test e2e`)
- Any dead code removed is proved dead, not assumed.
  (cmd: a repo-wide grep per removed symbol, recorded)
- Every surviving inline task reference in the cluster is a pointer or a live
  marker. (cmd: the cluster grep)
- `npm run ci` and `npm run build` pass. (cmd: both)
