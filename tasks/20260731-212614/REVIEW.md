# Review: KISS pass: src/ui widget family

- TASK: 20260731-212614
- BRANCH: refactor/ui-widget-kiss

## Round 1

- REVIEWER: out-of-context agent (no prior knowledge of the change)
- VERDICT: REQUEST_CHANGES

The reviewer rebuilt the counting rig independently rather than running the
author's, and reproduced every cell of the before/after table, every delta, the
tree-file triple, all nine deleted-comment line numbers, the 13-hit pointer
grep, `npm run ci` (exit 0) and `npm run build` (exit 0). A comment-and-blank
stripped diff of all seven surviving cluster files against `master` came back
byte-identical, which is the no-behaviour-change claim as evidence. All four
findings are record defects; none touches shipped behaviour.

- [x] R1.1 (MAJOR) `tasks/20260731-212614/NOTES.md` - the "+2.2 was checked
      against the SPIKE" claim was not a check. `tasks/20260729-160500/SPIKE.md`
      lines 328-334 are a TWO-COLUMN table: `+2.2 to +2.4` is the
      **expert** column, and the comment said "a player who can READ THE TREE",
      whose `cost=3` figure is `+0.5 to +1.3`. The digits matched, the model
      column was never compared. `tasks/20260729-141424/DECISION.md:52` states
      the pair correctly, so two landed records disagree.
      **Fixed.** `src/ui/onboarding.ts:20` now gives both columns, each
      attributed to its own model. The error was inherited from
      `tasks/20260729-092327/DECISION.md:87-88`, a landed record this pass may
      not rewrite, so that is filed as its own task, **`20260801-002929`**.
      `NOTES.md` now records the whole thing, including that the first version
      of the record claimed a verification that had not happened.
- [x] R1.2 (MINOR) `tasks/20260731-212614/NOTES.md` keep/compact tables - four
      rows carried the verdict `keep` for comments `git diff master -- src/ui`
      shows were rewritten: `autocomplete.ts:125`, `onboarding.ts` 14, 24 and
      59. One of them even said "already in the target form" beside a rewrite.
      **Fixed.** The table now defines its verdict vocabulary against the diff
      (`keep` = byte-identical, `reworded, same shape`, `compact`), the four
      rows are relabelled, and the record names the 14 rows that ARE
      byte-identical so the claim is checkable rather than assertive.
- [x] R1.3 (MINOR) `TASK.md` Close-out and the commit message - "eleven
      compacted onto a constraint plus a record pointer" was wrong twice: two
      of the eleven carry no pointer (`panel.ts:59`, `onboarding.ts:31`), and
      counting R1.2's four, 17 survivors were rewritten rather than 11.
      **Fixed.** The close-out and the commit message now give the full
      breakdown: 17 of 31 rewritten (13 compacted, 9 of those with a pointer; 2
      reworded; 1 split; 1 keep given a pointer), 14 byte-identical.
- [x] R1.4 (MINOR) `TASK.md` `## Scope`, `DECISION.md` `## Consequences`, and
      the Close-out - "the three tree files carry the directory's highest
      comment ratios" is false for `treeVisualizer.ts`, which at 7% is the
      second-LEAST dense file in `src/ui/`. `DECISION.md` case 1 had it right
      ("the two highest"), so the record contradicted itself.
      **Fixed.** All three statements now say two, name the ratios, and say
      plainly that `treeVisualizer.ts` is in the excluded set because it is the
      third file of the same landed cluster, not because it is dense.

Explicitly checked and clean in round 1: policy compliance of all 31 surviving
comments; the nine deletions (nothing load-bearing lost - the dropped playtest
F3.1 history lives in `tasks/20260729-092435/NOTES.md:174`); the `panel.ts:109`
keep-in-full; the no-split call for `card.ts` and `panel.ts`; the barrel
deletion, including that it introduces no import-side-effect regression, since
`src/game/index.ts` already imported `../ui/modal`, `../ui/panel` and
`../ui/treeVisualizer` directly; every cited precedent; and the deferred
`card.ts` unreachable-ternary observation.

## Round 2

- REVIEWER: same out-of-context agent, resumed on its round-1 transcript
- VERDICT: APPROVE

No R2 findings. The reviewer re-ran its own rig against the post-fix state and
reproduced `849 / 31 / 142` for the cluster, `139 / 8 / 40` for
`onboarding.ts`, both validation sets, the `162` tree-file comment lines, and
the `29%` figure. It re-derived rather than accepted the two claims R1.2 and
R1.3 turn on: extracting every surviving comment from `git show master:` and
from `HEAD` and comparing byte-for-byte gives exactly 14 identical and 17
changed, and they are exactly the 14 the record names; and mapping the 13
pointer lines onto their comments gives exactly the 9 the close-out claims,
with `panel.ts:59` and `onboarding.ts:31` the two pointerless compactions. The
onboarding line-number shift was re-verified from parser output, not assumed.

The stripped-diff, `git diff master -- test e2e`, tree-file, line-67 and
`npm run ci` / `npm run build` proofs were all re-run and match the record.

One cosmetic note, recorded rather than fixed: R1.3's finding text above cites
`onboarding.ts:31` for a comment the reviewer first reported at `:30`. Both
name the same comment; `:31` is its post-fix line and resolves today.
