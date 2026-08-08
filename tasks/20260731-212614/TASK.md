# KISS pass: src/ui widget family

- STATUS: CLOSED
- PRIORITY: 62
- TAGS: refactor, ui

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

## Scope

The eight widget files only: `panel.ts`, `autocomplete.ts`, `card.ts`,
`onboarding.ts`, `modal.ts`, `share.ts`, `autoShrink.ts`, `index.ts`.

`treeLayout.ts`, `treeScroll.ts` and `treeVisualizer.ts` are also under
`src/ui/`. Two of them carry the directory's highest comment ratios by a wide
margin (`treeLayout.ts` 44%, `treeScroll.ts` 37%; `treeVisualizer.ts` is 7%,
near the bottom). All three are landed sibling `20260731-212611`'s files and
their density is that
task's recorded verdict, not a miss: its `RETRO.md` states `treeScroll.ts`
ships 109 comment lines against 291 code lines because the records behind those
comments are a `REVIEW.md` and a `RETRO.md`, KINDs `AGENTS.md` `## Comments`
does not accept as compaction targets. Re-opening them here would re-litigate a
landed decision. They are measured in the baseline table for completeness and
left byte-identical.

## Steps

- [x] Rebuild the counting rig from `tasks/20260731-212557/NOTES.md` `## How
      the population was counted` and validate it BOTH ways before use:
      `src/profile src/gameStats.ts src/rollingAverage.ts` must give
      `889 / 10 / 18` (sibling `20260731-212612`), and the eight files on the
      branch base must give `888 / 39 / 177`.
- [x] Read the family as one unit; record which auto-open, focus and blur rules
      the code enforces today versus what a comment claims. Verify each claim
      against its source, not against memory: the 768px mirror
      (`panel.ts:22`) against `src/style.css:2061`, the coverage and jsdom
      claims (`onboarding.ts:44-51`) against `jest.config.js:18-19` and
      `test/cardRendering.test.ts:2`, the `stopImmediatePropagation` claim
      (`autocomplete.ts:158-171`) against `src/game/`'s own keydown listener.
      Anything stale is deleted, not compacted; a comment and the code
      disagreeing about BEHAVIOUR is a bug report filed as its own task.
- [x] For EVERY comment kept or compacted, run the two-grep record pass: terms
      from the comment's SUBJECT over `tasks/` whole, then a second grep on the
      literal SYMBOL NAME, reading every record KIND in the folder found, not
      only `DECISION.md`. A "no record holds this" claim needs its own
      evidence. One row per surviving comment in `NOTES.md`.
- [x] Compact each rationale essay to a constraint line plus a record pointer,
      towards a `DECISION.md`/`SPIKE.md`/`NOTES.md` only. Keep the guards
      exactly as guards: the 100ms blur timer and its cancel invariant, the
      `stopImmediatePropagation` sibling-listener constraint, the
      `NARROW_VIEWPORT_QUERY` stylesheet mirror, the deliberate non-use of
      `openPanel()` on the narrow path.
- [x] Leave `autocomplete.ts:1-67` byte-identical. `e2e/postgame.spec.ts:217`
      points at `src/ui/autocomplete.ts:67` by LINE, that file belongs to a
      sibling and may not be edited here, and line 67 is currently correct.
      Every edit in this file lands below it.
- [x] Decide the `src/ui/index.ts` barrel: it re-exports seven symbols over
      four lines (the plan said five; corrected against the file during the
      pass) and only `setupAutocomplete` is ever imported through it
      (`src/game/index.ts:7`). `renderLastGuess`, `openPanel`, `renderTree`,
      `showWinModal` and `showLossModal` are imported from their own modules
      directly; `closePanel` has no importer at all. Delete the barrel and
      repoint that one import line, or defer with the reason recorded.
- [x] Split only where a file does two jobs. `card.ts` (four builders plus two
      mount helpers) and `panel.ts` (viewport rules plus panel mounting) are
      the named candidates; record each file considered and left alone with the
      reason, so the next reader does not redo the analysis.
- [x] Prove no behaviour moved: `test/autocomplete.test.ts`,
      `test/autocompleteBlur.test.ts`, `test/cardRendering.test.ts`,
      `test/onboarding.test.ts`, `test/share.test.ts`, `e2e/panel.spec.ts`,
      `e2e/autocomplete.spec.ts`, `e2e/modal.spec.ts`,
      `e2e/onboarding.spec.ts` untouched and green.

## Definition of Done

- Before/after `wc -l` AND parser comment counts for every `src/ui/` file,
  including the ones left alone with the reason. Every number in the record
  comes from the validated rig, including numbers quoted inside prose.
  (cmd: the `lines / comments / comment lines` table in `NOTES.md`, against a
  rig reproducing `889 / 10 / 18` and the `888 / 39 / 177` baseline)
- Each `NOTES.md` row saying a comment was compacted towards X is checked by
  grepping the POST-pass file for X. (cmd: `grep -n` per row)
- No assertion changed in the listed suites. (cmd: `git diff master -- test
  e2e` is empty)
- The three tree files are untouched. (cmd: `git diff master -- src/ui/treeLayout.ts
  src/ui/treeScroll.ts src/ui/treeVisualizer.ts` is empty)
- `e2e/postgame.spec.ts:217`'s pointer still resolves. (cmd: `sed -n '67p'
  src/ui/autocomplete.ts` is `autocompleteBox.style.display = "none";`)
- Every surviving inline task reference under `src/ui/` is a record pointer
  sitting after the constraint it explains, or a live `NOTE:`/`FIXME:`/`TODO:`/
  `BUG:` marker. (cmd: `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)'
  src/ui`, each hit justified in `NOTES.md`)
- Any comment/code disagreement found is filed as its own task, not fixed here.
  (test: the IDs listed in `NOTES.md`)
- Every sibling file touched, and the mechanical import-line edit that touched
  it, is listed in `NOTES.md`. (cmd: `git diff --stat master` against that list)
- `npm run ci` and `npm run build` pass inside `nix develop`. (cmd: both)

## Close-out

**What and why.** The eight `src/ui/` widget files go from `888 / 39 / 177`
(lines / comments / comment lines, parser rig) to `849 / 31 / 142`, 20% comment
lines to 17%. Nine comments are deleted as narration and 17 of the 31 survivors
are rewritten: 13 compacted onto a constraint, 9 of those carrying a record
pointer; 2 reworded without dropping a clause; 1 split into the two constraints
it was carrying at one site; and 1 kept verbatim but given a pointer. The other
14 survivors are byte-identical to `master`. `src/ui/index.ts` - a barrel with
one real importer - is deleted. No behaviour moved: `git diff master -- test e2e` is
empty and `npm run ci` is green on an unmodified suite.

**Alternatives.** Four settled in `DECISION.md` before a comment moved. The two
that most shaped the result: excluding `treeLayout.ts`/`treeScroll.ts`/
`treeVisualizer.ts` despite the first two being the directory's densest, because
sibling `20260731-212611` already adjudicated them and its `RETRO.md` records
the density as the policy's answer rather than a miss; and deleting the barrel
rather than keeping it, on the no-barrel-re-export precedent `20260731-212610`
set and two siblings re-applied. Two behaviour-neutral cleanups are
deliberately NOT done and recorded as such in `NOTES.md`: the unreachable inner
ternary in `card.ts`'s image branches, and `panel.ts`'s never-imported
`closePanel` export.

**Difficulties and diagnosis.** The rig was wrong on its first build - it read
trailing comments from each token's START instead of its END and returned
`889 / 6 / 14` where sibling `20260731-212612` landed `889 / 10 / 18`. The line
count matched, which is exactly how a broken comment counter looks right. The
both-ways validation caught it before a single number reached a record.

The one comment/code disagreement found is a stale PATH: `autocomplete.ts`
cited `src/game.ts` for the second keydown listener, and `20260731-212610`
split that file into `src/game/`. The mechanism was re-verified rather than
assumed - `src/game/index.ts:203` registers the listener, `setupAutocomplete`
is called at :171, so the ordering the comment depends on still holds - and the
path was corrected in place. No bug task filed, because no behaviour disagrees
with any comment.

**Evidence.** `npm run ci` green (Jest 21 suites / 323 tests, Playwright 126,
ESLint `--max-warnings=0`, Prettier, the Python pipeline test); `npm run build`
compiles; `git diff master -- test e2e` empty; `git diff master` on the three
tree files empty; `sed -n '67p' src/ui/autocomplete.ts` still the line
`e2e/postgame.spec.ts:217` names; 13 surviving task references under `src/ui/`,
each a pointer sitting after its constraint, each grepped for in the POST-pass
file.

**Reflection.** The expensive part was not compacting - it was proving where
each rationale lives. Two comments turned out to have their record in a KIND
`## Comments` does not accept as a compaction target (`panel.ts:109` in a
`TASK.md` close-out, `MAX_SUGGESTIONS`/`findMatches` in a task folder with no
`DECISION.md` at all), so both stay verbatim; and one comment pointed at the
WRONG record, which only the second grep on the subject rather than the symbol
exposed. A comment that cites a record is not evidence that the record holds
what it claims.
