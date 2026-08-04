# Retro: Delete the dead markdownLoader

- TASK: 20260730-120401
- BRANCH: chore/delete-dead-markdownloader
- REVIEW ROUNDS: 2

## What went well

- The three greppable DoD proofs did the entire code-side job. Each named the
  exact residue to remove rather than the outcome to feel good about, all
  three were run red on the base for their stated reason, and the result is
  that "delete the file" could not silently leave the prose hits at
  `src/frontMatter.ts` and `test/contentSource.test.ts` behind. No review
  finding touched code.
- DECISION.md was written before implementation and was genuinely binding.
  Both live questions - delete `markdownLoader` rather than adopt it and
  retire `jsonLoader`, and keep `src/frontMatter.ts` under `src/` despite
  having only test consumers - were settled with alternatives argued, so
  neither reopened during the work or either review round.
- The `19 files` number the plan carried loosely was CORRECTED in the record
  rather than quietly ticked: `coverage/lcov.info` holds 21 `src/` entries.
  The invariant that actually mattered - the sorted `SF:` list unchanged, no
  threshold moved - was stated and checked in its place.
- The coverage blind spot found on the way (jest's `roots` scoping
  instrumentation, not just discovery) was split into `20260804-140413`
  instead of absorbed. This task shipped only the comment that puts the
  finding where the next reader of `jest.config.js` will hit it.

## What went wrong

- Both non-nit review findings sat in prose the proofs could not reach.
  `src/frontMatter.ts:10` shipped `NOTE: 20260730-120401` - a live-work marker
  naming the very task the branch closes - which AGENTS.md `## Comments`
  rules out explicitly ("a task ID in any other shape is history and belongs
  in the record, not the code"). It was the only `NOTE: <id>` left anywhere in
  `src`, `test`, `e2e` or `scripts`.
- The root cause is in the plan, not the execution. Step 2 said "Rewrite the
  `NOTE:` block at `src/frontMatter.ts:10-12`", which names the block by its
  marker and so reads as an instruction to keep the marker and swap the body.
  That is what happened. The Step also dictated the replacement content -
  including the consumer list that lines 3-6 already carried - so the rewrite
  inherited a redundancy the Step had specified.
- Close-out WHAT recorded the deleted file as "128 lines" where
  `git show master:src/markdownLoader.ts | wc -l` is 87. Nothing produced 128;
  it was written from memory into a record whose whole job is to be trusted
  later.
- Round 1 closed with `npm run build` unexercised, flagged because the
  deletion removed the repository's only `require.context` call site. Round 2
  ran it (exit 0). It was a smaller gap than it looked - `npm run ci` reaches
  webpack through `test:e2e`, whose Playwright `webServer` runs `npm run
  serve` - but nothing in the records said so at the time.

## What to improve next time

- Breadth: the diff is small (87 lines deleted, three comments touched) and
  correctly scoped. The one thing that could have inflated it, re-baselining
  `coverageThreshold` for the `roots` finding, was split to `20260804-140413`.
  No missed split.
- Churn: the plan-time question that would have prevented both non-nit
  findings is not the from-scratch challenge - the design survived untouched.
  It is narrower: **a Step that says "rewrite the `NOTE:` block" has already
  decided the comment keeps its marker.** Name the form the comment must end
  in, not the block to edit, and re-derive an edited comment against the
  comment convention as if writing it fresh - an edit inherits the shape of
  what it replaces, including a shape the convention forbids.
- The second, cheaper form of the same lesson: a `cmd:` proof reaches prose
  too. `! grep -rn 'NOTE: 202' src test e2e scripts` would have caught the
  marker; a proof capturing the deleted file's line count would have caught
  the 128. Every number a close-out states should come from a command re-run
  as the close-out is written, not from recall.
- Context: no pressure observed - no checkpoint, no compaction warning, no
  handoff. Both review rounds were delegated to out-of-context reviewers as
  the skill requires; nothing else needed delegating.

## Action items

- Submitted to central knowledge: the edited-comment lesson above, and the
  close-out-numbers-come-from-a-command lesson.
- No follow-up task. `20260804-140413` already owns the coverage blind spot,
  and the build gap is not real: `npm run ci` compiles the bundle via
  `test:e2e` -> `webServer` -> `npm run serve`.

## Landing message

```
chore: delete the dead markdownLoader
```

`src/` carried two `loadGameData` implementations since `10d93f7` added
`src/jsonLoader.ts` without removing `src/markdownLoader.ts`; every page
imports the JSON one and nothing imported the markdown one. Deletes the
markdown loader and the last `require.context` call site, rewrites the stale
header comment on `src/frontMatter.ts` that pointed at it, drops the matching
clause from the `test/contentSource.test.ts` header, and records beside
`roots` in `jest.config.js` that it scopes coverage discovery too - the reason
the dead module never showed up at 0% in the report. See
`tasks/20260730-120401/DECISION.md`.
