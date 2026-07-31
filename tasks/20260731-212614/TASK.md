# KISS pass: src/ui widget family

- STATUS: OPEN
- PRIORITY: 62
- TAGS: refactor,ui
- KIND: STORY
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT
- PARENT: 20260731-212345
- DEPENDS ON: 20260731-212557

## Story

As a maintainer of the widgets, I want each `src/ui/` file to own one surface
with its rationale compacted, so that the panel's viewport rules are readable
without wading through incident history.

## Problem

The widget family - `panel.ts` (176), `autocomplete.ts` (176), `card.ts` (173),
`onboarding.ts` (153), `modal.ts` (112), `share.ts`, `autoShrink.ts`,
`index.ts` - is individually small but carries a dense layer of narrative
comments about past bugs: panel auto-open rules across viewports
(`20260729-092315`, `20260729-141414`), the autocomplete blur timer
(`20260729-130138`), the hint copy that came out of `20260729-160500`.

Several of those rules ARE load-bearing and must survive as constraints. The
history around them must not.

## Steps

- [ ] Follow the rules from the policy task.
- [ ] Read the family as one unit and record which auto-open, focus, and blur
      rules are actually enforced by code today, versus described by a comment
      that no longer matches. Anything stale is deleted, not compacted; if a
      comment and the code disagree about behaviour, that is a bug report, not
      a comment edit - file it as its own task.
- [ ] Compact every rationale essay to a constraint line plus a record pointer.
      Keep the do-not-change guards (blur timing, viewport branches) exactly as
      guards.
- [ ] Split only where a file does two jobs; most of these are already one
      surface each. Record files considered and left alone, so the next reader
      does not redo the analysis. `card.ts` and `panel.ts` are the likeliest
      candidates - check whether card rendering belongs beside panel mounting.
- [ ] Prove no behaviour moved: `test/autocomplete.test.ts`,
      `test/autocompleteBlur.test.ts`, `test/cardRendering.test.ts`,
      `e2e/panel.spec.ts`, `e2e/autocomplete.spec.ts`, `e2e/modal.spec.ts`,
      `e2e/onboarding.spec.ts` untouched and green.

## Definition of Done

- Before/after `wc -l` for every `src/ui/` file, including the ones left alone
  with the reason. (cmd: `wc -l` table in the task record)
- No assertion changed in the listed suites. (cmd: `git diff test e2e`)
- Every surviving inline task reference under `src/ui/` is a pointer or a live
  marker. (cmd: `grep -rnE '//.*(2026[0-9]{4}-[0-9]{6}|tasks/)' src/ui`)
- Any comment/code disagreement found is filed as its own task, not fixed here.
  (test: the IDs listed in `NOTES.md`)
- `npm run ci` and `npm run build` pass. (cmd: both)
