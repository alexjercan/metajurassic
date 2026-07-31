# Notes: KISS pass over the src/ui widget family

## The rig

Rebuilt from `tasks/20260731-212557/NOTES.md` `## How the population was
counted` (TypeScript PARSER, not the scanner; runs of consecutive standalone
`//` lines fused into one comment). Run inside `nix develop` with `NODE_PATH`
pointing at the worktree's `node_modules` symlink.

Validated BEFORE use, in both directions:

- `src/profile/`, `src/gameStats.ts`, `src/rollingAverage.ts` -> **889 / 10 /
  18**, reproducing child `20260731-212612`'s landed table exactly.
- `src/practiceSession.ts`, `src/practice.ts`, `src/frontMatter.ts`,
  `src/jsonLoader.ts`, `src/markdownLoader.ts`, `src/storage.ts` -> **615 / 27 /
  142**, reproducing child `20260731-212613`'s landed after-table exactly.
- The eight cluster files on this branch's base (`c989fd2`) -> **888 / 39 /
  177**, reproducing this task's baseline table.

The first build of the rig read trailing comments from each token's START
rather than its END and returned `889 / 6 / 14` for the first validation set -
four one-line trailing comments short. That is what the both-ways validation is
for; the numbers below all come from the corrected rig.

Every number in this record comes from that rig. `wc -l` was re-run alongside
it and the two agree per file.

## Before / after

`lines / comments / comment lines`, same rig, same invocation.

| File | Before | After | Delta |
|-|-|-|-|
| `src/ui/panel.ts` | 176 / 11 / 42 | 165 / 8 / 31 | -11 / -3 / -11 |
| `src/ui/autocomplete.ts` | 176 / 5 / 40 | 173 / 6 / 37 | -3 / +1 / -3 |
| `src/ui/card.ts` | 173 / 7 / 21 | 171 / 5 / 19 | -2 / -2 / -2 |
| `src/ui/onboarding.ts` | 153 / 8 / 54 | 139 / 8 / 40 | -14 / 0 / -14 |
| `src/ui/modal.ts` | 112 / 4 / 4 | 108 / 0 / 0 | -4 / -4 / -4 |
| `src/ui/share.ts` | 58 / 3 / 11 | 57 / 3 / 10 | -1 / 0 / -1 |
| `src/ui/autoShrink.ts` | 36 / 1 / 5 | 36 / 1 / 5 | unchanged |
| `src/ui/index.ts` | 4 / 0 / 0 | deleted | -4 / 0 / 0 |
| **total** | **888 / 39 / 177** | **849 / 31 / 142** | **-39 / -8 / -35** |

Comment lines fall from 20% of the cluster to 17%.

`autocomplete.ts` GAINS a comment while losing lines. Its blur comment was one
block that covered two different things at one site: the cancel invariant on
the timer handle, and why the delay itself is not zero. Those are now two
comments at the two sites they constrain (`hideTimer`'s declaration, and the
`setTimeout` call). The `## Comments` "split it at the constraint" instruction
is what produced the extra comment; no numeric target was set or chased in
either direction.

`autoShrink.ts` is byte-identical to `master`: one docstring stating a public
API contract, nothing else in the file.

## Files considered and left alone, or left unsplit

| File | Verdict |
|-|-|
| `src/ui/autoShrink.ts` | read, unchanged - one function, one docstring |
| `src/ui/card.ts` | not split - `DECISION.md` case 3 |
| `src/ui/panel.ts` | not split - `DECISION.md` case 3 |
| `src/ui/treeLayout.ts`, `treeScroll.ts`, `treeVisualizer.ts` | out of cluster - `DECISION.md` case 1; `git diff master` on the three is empty |

## Keep / compact, comment by comment

One row per SURVIVING comment, 31 of them, plus the 9 deletions (3 in
`panel.ts`, 2 in `card.ts`, 4 in `modal.ts`). 39 before, minus 9 deleted, plus
the one comment `autocomplete.ts` gained by splitting a block in two, is the 31
that ship. "Rule" is the
`AGENTS.md` `## Comments` row that decided it. Line numbers are post-pass.
Every "compacted towards" target was grepped for in the POST-pass file, not
only in the plan - see `## Pointer check`.

"Verdict" describes what happened to the TEXT, checked against
`git diff master -- src/ui`: `keep` means byte-identical, `reworded, same
shape` means shortened or rephrased without dropping a clause, `compact` means
a clause was dropped or moved. Four rows said `keep` in the first version of
this record for comments the diff shows were rewritten; review round 1 (R1.2)
caught it.

The 14 rows now marked `keep`, `keep untouched` or `keep in full` are
byte-identical to `master` - `panel.ts` 16 and 109, `autocomplete.ts` 1 and 4,
`card.ts` 7, 56, 114, 150 and 164, `onboarding.ts` 47 and 95, `share.ts` 11 and
41, `autoShrink.ts` 1. The one `keep + pointer` row (`panel.ts:30`) kept its
text and gained a record pointer.

### `src/ui/panel.ts` (8 survive, 3 deleted)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 16 | `unseenCardTitle`: what "unseen" means, and that opening clears it | keep | invariant the code defends | - |
| 22 | `NARROW_VIEWPORT_QUERY` mirrors the stylesheet breakpoint | compact | guard, "do not change this" | `20260729-141414/DECISION.md` |
| 30 | `isNarrowViewport` is per-render; no resize listener | keep + pointer | non-obvious setting | same, `## Resizing across the breakpoint` |
| 59 | `noteCardRendered`: only a closed panel makes a card unseen | compact | narration around one invariant | - |
| 100 | pre-first-guess: card rendered, panel stays CLOSED, both viewports | compact | rationale reproducing a DECISION.md | `20260729-092315/DECISION.md` |
| 109 | the starting hint is not new information, so the tab reads "Info" | **keep in full** | rationale whose only record is a `TASK.md` | **nothing it may compact towards - see below** |
| 129 | auto-open is desktop-only; and do not reroute through `openPanel()` | compact | rationale reproducing a DECISION.md, plus a guard kept whole | `20260729-141414/DECISION.md` |
| 151 | the how-to-play card mounts in THIS panel, no second surface | compact + **pointer corrected** | rationale reproducing a DECISION.md | `20260729-092327/DECISION.md` |
| ~~37 (before)~~ | "Keep the pull tab describing its own current job: close, open an unseen card (named), or open generally" | **deleted** | narration; the three branches are the code | - |
| ~~124 (before)~~ | "Correct guess: show the target species" | **deleted** | narration | - |
| ~~130 (before)~~ | "Incorrect guess: show the best hint clade (direct parent of "?")" | **deleted** | narration; `findBestHintCladeId` is the name of the thing | - |

The line-151 pointer was WRONG before this pass, not merely long. It cited
`20260729-141414/DECISION.md`, which establishes the pull tab as the panel's
affordance but says nothing about the how-to-play card. The "no competing
'there is something to read' control" argument is `20260729-092327/DECISION.md`
(`## Chosen: an in-arena pre-guess brief`), which is what it now cites.

### `src/ui/autocomplete.ts` (6 survive, 0 deleted)

Every edit in this file is below line 67 - see `## The frozen region`.

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 1 | `MAX_SUGGESTIONS`: how many the box shows at once | keep untouched | frozen region; public constant | - |
| 4 | `findMatches`: the two ordering rules and the defects behind them | keep untouched | frozen region; public API contract + defect shapes | - |
| 101 | `hideTimer`: re-opening must cancel a pending hide, or `keydown` sees `isOpen === false` | compact | guard | `20260729-130138/DECISION.md` |
| 125 | "belt and braces": a blur cannot follow a blur | compact (one line shorter) | invariant kept local | - |
| 129 | why the delay is not zero, even though `mousedown` makes it look dead | **new split** | guard, "do not change this" | same, `## Also chosen: the 100ms blur delay stays` |
| 159 | `stopImmediatePropagation` is required by a SECOND keydown listener on the same input | compact + **stale path fixed** | guard | same |

Line 159's claim was verified rather than trusted: `src/game/index.ts:203`
registers a `keydown` listener on the same `playerInput`, and
`setupAutocomplete` is called at line 171, so this handler is registered first
and the raw-text one runs after it. The comment said `src/game.ts`, a file
sibling `20260731-212610` split into `src/game/` - the path was stale, the
mechanism was not. Corrected in place as a stale reference, not filed as a bug:
no behaviour disagrees with the comment.

Line 129 is the one place this pass moved rationale rather than shortening it.
The before-state put the "why not zero" reason in the same block as the cancel
invariant, six lines above the `setTimeout` it constrains.

### `src/ui/onboarding.ts` (8 survive, 0 deleted)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 3 | file header: what the module holds, and the pre-guess-every-round gate | compact | rationale reproducing a DECISION.md | `20260729-092327/DECISION.md`, `## Pre-guess-every-round, not first-visit-only` |
| 14 | copy is built from the constants, because the old hardcoded mirror rotted | reworded, same shape | constraint + lesson pointer, already in the target form | - |
| 20 | "Stuck?" not "Hint": a hint is a net loss at cost 3 | compact + **figure corrected** | rationale reproducing a SPIKE.md | `20260729-160500/SPIKE.md` |
| 25 | the copy must NOT promise to halve the field (~19% fallback) | compact | guard on a user-visible value | same record |
| 31 | `briefCopy` is separate from the DOM so it is testable; `src/ui/**` has no coverage | compact | public API contract + non-obvious constraint | - |
| 47 | "the mystery dinosaur", not "today's": practice reuses this template | keep | invariant the code defends | - |
| 60 | `buildOnboardingBrief`: four short lines, a game screen not documentation | reworded, same shape | public API contract | - |
| 95 | `buildHowToPlayCard`: the deeper reference, FAQ still owns the rest | keep | public API contract | - |

The `+2.2` in the line-20 comment was WRONG, and the first version of this
record said it had been checked when the check had only matched the digits.
`tasks/20260729-160500/SPIKE.md:328-334` is a TWO-COLUMN table - net guesses
per hint bought at `split<=1/2`:

```
            deduce (expert)        read-tree (middling)
cost=3        +2.2 to +2.4           +0.5 to +1.3
```

The comment said "a player who can READ THE TREE" and then quoted `+2.2`, which
is the EXPERT column. The tree-reader cost at `cost=3` is `+0.5 to +1.3`.
`tasks/20260729-141424/DECISION.md:52` states the pair correctly ("an expert
+2.2 to +2.4 guesses and a tree-reader +0.5 to +1.3").

The comment now gives both columns and attributes each to its own model. The
error was NOT introduced here: `tasks/20260729-092327/DECISION.md:87-88` -
which is the record this comment compacts towards - carries the same
mis-attribution, and the comment inherited it. That is a defect in a landed
record, so it is filed as its own task, `20260801-002929`, rather than fixed in
passing. The conclusion both records draw is unaffected: at cost 3 the hint is
a net loss under BOTH models, so it is a bad buy for anyone who can play.

The `~19%` fallback share in the line-25 comment does check out:
`tasks/20260729-160500/SPIKE.md:262`.

The line-31 compaction dropped one true clause deliberately: "a jsdom
environment IS available since 20260729-092352, but opt-in per file". It is
true - `test/cardRendering.test.ts:2` and `test/autocompleteBlur.test.ts:2`
both carry `@jest-environment jsdom` - but it is the history of how the seam
came to be defensible, not the constraint. The constraint that binds a reader
editing this file is that the copy must stay pure. `jest.config.js:18` is still
cited so the coverage claim is checkable.

### `src/ui/card.ts` (5 survive, 2 deleted)

| Line | Subject | Verdict | Rule |
|-|-|-|-|
| 7 | `createLockedSpeciesCard` contract | keep | public API contract |
| 56 | `createSpeciesCard` contract, incl. who picks the outer class | keep | public API contract |
| 114 | `createCladeCard` contract | keep | public API contract |
| 150 | `mountCard`: replaces content, then shrinks; for single-card containers | keep | public API contract |
| 164 | `shrinkCardTitle`: call it AFTER appending, so measurement works | keep | ordering dependency |
| ~~69 (before)~~ | "Add rarity class if specified" | **deleted** | narration of `if (rarity)` |
| ~~86 (before)~~ | "Create rarity star HTML" | **deleted** | narration of the next line |

### `src/ui/modal.ts` (0 survive, 4 deleted)

| Subject | Verdict | Rule |
|-|-|-|
| ~~21~~ "Close when clicking the backdrop (but not the modal itself)" | **deleted** | narration of `if (e.target === overlay)` |
| ~~26~~ "Close via the OK button" | **deleted** | narration of a click handler on `modalCloseBtn` |
| ~~29~~ "Add the share SVG to the share button in the modal" | **deleted** | narration of the three lines below it |
| ~~103~~ "Initial burst" | **deleted** | narration of a `confetti(...)` call |

The file now carries no comments. Nothing in it was load-bearing: the module is
element lookups, two show functions and a confetti loop, and every deleted line
restated the statement under it. `showWinModal`/`showLossModal` are the only
exports and their names and signatures are the contract.

### `src/ui/share.ts` (3 survive, 0 deleted)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 1 | header: sheet where there is one, clipboard where there is not; DI for testability | compact | rationale reproducing a DECISION.md | `20260729-101823/DECISION.md` s4 |
| 11 | `ShareOutcome`: "cancelled" is an explicit no and must NOT fall through | keep | invariant the code defends | - |
| 41 | a non-cancel failure is a platform problem, so the clipboard still runs | keep | invariant the code defends | - |

### `src/ui/autoShrink.ts` (1)

| Line | Subject | Verdict | Rule |
|-|-|-|-|
| 1 | `autoShrinkText` contract: shrink until it fits, accounting for siblings and gap | keep untouched | public API contract |

## Records checked, per comment

Each subject grep ran over `tasks/` whole with terms from the comment's
SUBJECT; the record found was READ and its KIND checked. A SECOND grep then ran
on the literal SYMBOL NAME, and every KIND in the folder was read, not only
`DECISION.md`. Run for every keep and every compaction, not only the compacted
ones.

| Subject searched | Symbol grepped | Record found | KIND / status | Holds it? |
|-|-|-|-|-|
| first-load panel closed, pull tab affordance | `manuallyClosedPanel` | `20260729-092315/DECISION.md` | TASK / CLOSED, DECISION ACCEPTED | yes, in full |
| narrow auto-open, 768px fork, F3.5 | `isNarrowViewport` | `20260729-141414/DECISION.md` | TASK / CLOSED, DECISION ACCEPTED | yes, in full |
| the stylesheet mirror, drift as the failure mode | `NARROW_VIEWPORT_QUERY` (no hits) | same, `## This deliberately reverses...` | same | yes - and it REQUIRES this comment to exist |
| resize across the breakpoint mid-game | `isNarrowViewport` | same, `## Resizing across the breakpoint...` | same | yes |
| **starting hint not flagged unseen, tab reads "Info"** | `unseenCardTitle`, `clearUnseenCard` (no hits) | **`20260729-141414/TASK.md:81-83`** | **TASK.md close-out - not a compaction target** | **NO - kept in full** |
| how-to-play card routed through the existing panel | `renderHowToPlayCard` (no hits) | `20260729-092327/DECISION.md` | TASK / CLOSED, DECISION ACCEPTED | yes - and NOT the record the comment cited |
| pre-guess brief in the arena, gated on no-guesses | `briefCopy`, `buildOnboardingBrief` (no hits) | same | same | yes, in full |
| hint price framing, per-model cost, ~19% fallback | `hintChipCopy` (no hits) | `20260729-160500/SPIKE.md:262,328-334` | SPIKE / CLOSED | yes - and it CONTRADICTED the comment's attribution; see the hint-cost note above and task `20260801-002929` |
| blur timer cancel, ArrowDown/Enter ignored | `cancelPendingHide`, `hideTimer` | `20260729-130138/DECISION.md` | TASK / CLOSED, DECISION ACCEPTED | yes, in full |
| the 100ms delay is kept deliberately | `selectAndSubmit` | same, `## Also chosen: the 100ms blur delay stays` | same | yes |
| `stopImmediatePropagation`, sibling listener | `stopImmediatePropagation` | same | same | yes |
| native share, AbortError, clipboard fallback | `shareResult` | `20260729-101823/DECISION.md` s4 | TASK / CLOSED, DECISION ACCEPTED | yes |
| `MAX_SUGGESTIONS`, prefix-before-interior ordering | `findMatches`, `MAX_SUGGESTIONS` | `20260729-141427/` (TASK, REVIEW, RETRO - no DECISION.md) | not a compaction target | no - kept in full (also frozen) |
| "at most one armed hide" | `hideTimer` (no hits) | nothing | - | no - kept |
| card mounting, auto-shrink ordering | `mountCard`, `shrinkCardTitle`, `autoShrinkText` (no hits) | nothing | - | no - kept |
| unseen-card bookkeeping | `noteCardRendered`, `syncPullTab` (no hits) | nothing beyond 141414's tab description | - | narration deleted, invariant kept |
| practice reuses the daily template | - | `webpack.config.js` (the code itself) | - | no record needed; the comment names the file |

The `panel.ts:109` row is this task's version of `20260731-212613`'s
`isResumable`. The rationale is NOT nowhere: `20260729-141414/TASK.md:81-83`
records that the pre-guess tab initially carried the amber unseen dot and read
"Dinosauria", duplicating the tree's only node, so the no-last-guess branch now
clears the marker. But `## Comments` names `DECISION.md`, `SPIKE.md` and
`NOTES.md` as the only things a comment may compact towards, and that task's
`DECISION.md` covers its NEIGHBOURS - the auto-open fork and the labelled tab -
without covering this. So the comment stays verbatim, for a stated reason, and
`DECISION.md` case 4 records where a reader should look anyway.

## The frozen region

`e2e/postgame.spec.ts:217` points at `src/ui/autocomplete.ts:67` by LINE
NUMBER, as evidence that `selectAndSubmit` hides the box before calling back
into the game. `e2e/` belongs to siblings `20260731-212615`/`-212616` and this
task may not edit it, so the pointer was kept valid instead: every edit in
`autocomplete.ts` lands below line 67.

`sed -n '67p' src/ui/autocomplete.ts` still prints
`autocompleteBox.style.display = "none";`, the line the spec describes. Both
comments above it (the `MAX_SUGGESTIONS` line and the `findMatches` docstring)
are keeps on their own merits, so the freeze cost this task nothing.

## Pointer check

Every "compacted towards" cell above was verified by grepping the POST-pass
file, not the plan:

```
$ grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/|LESSONS)' src/ui/
src/ui/share.ts:2         tasks/20260729-101823/DECISION.md
src/ui/panel.ts:27        tasks/20260729-141414/DECISION.md
src/ui/panel.ts:32        tasks/20260729-141414/DECISION.md
src/ui/panel.ts:103       tasks/20260729-092315/DECISION.md
src/ui/panel.ts:131       tasks/20260729-141414/DECISION.md
src/ui/panel.ts:135       LESSONS.md read-the-helper-body-...
src/ui/panel.ts:153       tasks/20260729-092327/DECISION.md
src/ui/onboarding.ts:11   tasks/20260729-092327/DECISION.md
src/ui/onboarding.ts:17   LESSONS.md hand-copied-logic-mirrors-rot-...
src/ui/onboarding.ts:23   tasks/20260729-160500/SPIKE.md
src/ui/autocomplete.ts:105  tasks/20260729-130138/DECISION.md
src/ui/autocomplete.ts:132  tasks/20260729-130138/DECISION.md
src/ui/autocomplete.ts:168  tasks/20260729-130138/DECISION.md
```

13 hits, across four of the seven files this cluster still ships; the three
tree files add four more, unchanged and not this task's. Every one sits AFTER
the constraint it
explains; none is a bare pointer. `onboarding.ts:26`'s "(same record)" refers
to the SPIKE named three lines above it, at the same site.

No `NOTE:`/`FIXME:`/`TODO:`/`BUG:` marker exists or was added in this cluster.

## Comment/code disagreements found

Two, neither of them a behaviour disagreement.

The first is a wrong NUMBER, found in review round 1 (R1.1) rather than by this
pass: `onboarding.ts`'s hint-copy comment attributed the SPIKE's expert-column
cost `+2.2` to a tree-reader, whose cost at `cost=3` is `+0.5 to +1.3`. The
comment is corrected here; the landed record it inherited the error from
(`tasks/20260729-092327/DECISION.md:87-88`) is NOT, and is filed as task
**`20260801-002929`**. Detail in `## Keep / compact` under `onboarding.ts`.

The second is a stale PATH rather than stale behaviour:
`autocomplete.ts:159`'s `src/game.ts` became `src/game/index.ts` when sibling
`20260731-212610` split the file. The mechanism it describes still holds
exactly - `src/game/index.ts:203` registers the second listener, after
`setupAutocomplete` at line 171 - so this is the `## Comments` "stale reference"
case, fixed in place. No task filed for this one: nothing outside the comment
was wrong.

No comment in the cluster asserted behaviour the code does not have. The three
claims most likely to have rotted were each re-verified against their source:

| Claim | Checked against | Verdict |
|-|-|-|
| `.info-panel` is `width: 100%` below 768px and overlays the arena | `src/style.css:2061` (`@media`), `:2172-2173` | true |
| `src/ui/**` is excluded from coverage, `treeLayout.ts` excepted | `jest.config.js:18-19` | true |
| a jsdom environment is opt-in per file | `test/cardRendering.test.ts:2`, `test/autocompleteBlur.test.ts:2` | true (dropped as history, not as falsehood) |
| the best hint clade is the direct parent of `?` | `src/hintRule.ts:107-126` | true |

Two things were noticed and deliberately NOT changed. `panel.ts` exports
`closePanel`, which nothing outside the file imports - `grep -rn 'closePanel\b'
src test e2e scripts` finds only its definition and `closePanelManually`'s call
to it. Removing an export is a public-boundary change, which the epic puts out
of scope, and it is not a bug: the function is live, reached through
`closePanelManually`. Deleting `src/ui/index.ts` stops the barrel advertising
it, which is as far as this pass goes.

And `card.ts`'s
`createLockedSpeciesCard` and `createSpeciesCard` both guard `species.image`
twice - an outer `if (species.image && ...endsWith(".svg"))` and then a ternary
on `species.image` inside it, whose else-branch is unreachable on the first
arm. It is redundant, not wrong, and removing it is a behaviour-neutral
restructure that `## File size` puts outside a comment-and-split pass. No
comment claims otherwise, so there was nothing to correct here; it is left for
whoever next has a reason to touch that function.

## One plan number corrected

The approved plan's barrel step said `src/ui/index.ts` "re-exports five
symbols". It re-exports SEVEN, over four lines - the plan counted export
statements against a memory of the file rather than the file. The step's
conclusion is unaffected (still one importer, still `setupAutocomplete`), but
the count is corrected in `TASK.md` and in `DECISION.md` case 2 rather than
left to contradict them.

## Sibling files touched

One, and it is the mechanical import-line edit `DECISION.md` case 2 predicts:

| File | Owner | Edit |
|-|-|-|
| `src/game/index.ts` | `20260731-212610` | line 7, `from "../ui"` -> `from "../ui/autocomplete"` |

Nothing else in that file changed. `git diff master -- src/game/index.ts` is
that one line.

## Doc sweep, both polarities

- Forward: `grep -rn` for `src/ui`, `ui/index` and the barrel import forms over
  `AGENTS.md`, `README.md`, `jest.config.js`, `webpack.config.js` and
  `tsconfig.json`. `AGENTS.md:21` says "UI widgets: `src/ui/`" - a directory,
  with no file enumeration, so deleting `index.ts` leaves it correct.
  `jest.config.js:18-19` names `src/ui/**` and `src/ui/treeLayout.ts`, both
  untouched. No config resolves `../ui` as a directory import.
- Reverse: nothing outside `src/ui/` imported the barrel except
  `src/game/index.ts:7`, which this task repoints. `README.md` names no `src/`
  path.

No doc change was needed.

## Verification

Inside `nix develop`, in the worktree:

- `npm run ci` - green. Prettier clean; ESLint `--max-warnings=0` clean; the
  Python pipeline test passed; Jest 21 suites / 323 tests passed; Playwright
  126 passed.
- `npm run build` - webpack compiled successfully.
- `git diff master -- test e2e` - **empty**. No assertion touched.
- `git diff master -- src/ui/treeLayout.ts src/ui/treeScroll.ts
  src/ui/treeVisualizer.ts` - **empty**.
- `sed -n '67p' src/ui/autocomplete.ts` - the line
  `e2e/postgame.spec.ts:217` names, unchanged.
