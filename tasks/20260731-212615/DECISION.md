# Decision: Split e2e/helpers.ts into focused helper modules

- DATE: 20260801-093744
- STATUS: ACCEPTED
- TASK: 20260731-212615
- TAGS: refactor, testing, e2e

## Context

`e2e/helpers.ts` was 1409 lines, 66 comments, 430 comment lines - the largest
TypeScript file in the tree and the largest comment block left in the epic. It
held 39 top-level declarations spanning at least five unrelated jobs, and every one
of the 11 specs that used it imported through the same door.

The comment density is not the problem here. `AGENTS.md` `## Comments` holds
`test/` and `e2e/` to the same rules and to no extra brevity rule, and
`tasks/20260731-212557/NOTES.md` measured `e2e/` at 237 keep against 14
discard: "why this assertion has its particular form" is the dominant shape and
it is the strongest keep case in the rules. The size is the problem.

## Decision

`e2e/helpers.ts` becomes `e2e/helpers/`, eight modules, no re-export barrel.

| Module | Lines | Symbols |
|-|-:|-|
| `guessing.ts` | 75 | `guessesLeft`*, `guessFirstSuggestion`, `guessNamedSpecies` |
| `content.ts` | 102 | `FinishedGame`, `computeDailyKey`, `loadContent`, `seedFinishedDailyGame`, `isStructurallyValidImageSrc`, `wrongGuessIds` |
| `rounds.ts` | 158 | `WIDE_TREE_SEED`, `WIDE_TREE_GUESSES`, `playWideTree`, `speciesNameById`*, `practiceTargetName`*, `playSeededPracticeToWin`, `playSeededPracticeToLoss` |
| `tree.ts` | 231 | `MIN_PAINTED_FONT_PX`, `waitForTreeToSettle`, `treeNode`, `expectNodeVisibleInArena`, `expectNewestGuessFramed`, `expectNodeReachable`*, `expectNodeTextReadable` |
| `arena.ts` | 220 | `expectNoDeadScrollBand`, `expectEveryNodeReachable`, `touchScrollArena` |
| `panel.ts` | 97 | `topElementOverArena`, `waitForPanelToSettle`*, `expectTreeNotOccludedByPanel`, `expectPullTabInsideViewport` |
| `modal.ts` | 445 | `waitForModalToSettle`, `MeasuredBox`, `ScrolledControl`, `scrollModalTo`*, `expectActionsReachable`*, `expectModalFitsViewport`, `expectActionsOnOneRow` |
| `viewport.ts` | 92 | `expectNoBoxOverlap`, `expectFullyVisibleWithin` |

`*` = module-private, exactly as it was module-private in `helpers.ts`. No
symbol changed visibility, name, signature, or body.

The seams are the jobs, not the sizes. `tree.ts` and `arena.ts` are the one
place where a job was split further: node visibility (is the player looking at
this node?) and arena scroll extent (what is the scroll range, and can a finger
move it?) are different questions about different boxes, and the section banner
at `helpers.ts:313-320` marked the boundary already. `AGENTS.md` `## File size`
names a banner as "a file boundary that has not happened yet"; that banner is
gone; its two halves are now the header comments of `rounds.ts` (the
wide-tree fixture) and `arena.ts` (the arena geometry), which is
`20260731-212557`'s rule for a substantive banner: the split takes the
heading.

Dependencies run one way and form no cycle: `rounds` -> {`guessing`, `content`,
`tree`}, `arena` -> `tree`, `content` -> `dailyKeyMirror`.

`playwright.config.ts` sets `testDir: "./e2e"` with the default `testMatch`
(`**/*.@(spec|test).?(c|m)[jt]s?(x)`), so nothing under `e2e/helpers/` is
collected as a test.

## Alternatives considered

- **A re-export barrel at `e2e/helpers/index.ts`.** Rejected. It preserves
  exactly the property the split exists to remove: one import specifier
  standing in front of every helper in the suite, so a reader looking for
  `expectModalFitsViewport` still has no idea which file to open. The cost of
  not having it is 11 spec import blocks rewritten once, which is churn in a
  single commit rather than a standing cost. `TASK.md` also asked for the
  barrel only "if the spec import churn is otherwise large"; it is not.

- **Splitting `modal.ts` to get every file under 400 lines.** Rejected, and
  `modal.ts` takes the `Definition of Done` size exception instead at 445
  lines. It does one job - the end-of-game modal's geometry - and its three
  passes are an *ordered* whole: `expectModalFitsViewport`'s comment is what
  says why reachability runs second and why the box's own vertical fit runs
  last. Moving `expectActionsReachable` and `scrollModalTo` into a sibling file
  would separate pass 2 from the only text explaining its position. `AGENTS.md`
  `## File size` is explicit that a file does not split for length alone, and
  445 is the residue of 180 comment lines that are almost entirely the
  why-this-assertion keep case, not of mixed responsibilities. The next-largest
  module is 231 lines.

- **Converting the leading `//` blocks to `/** */` docstrings.** Rejected.
  `//` above an exported symbol is the dominant form in this repo already
  (`src/ui/share.ts`, and `helpers.ts` itself throughout), so the change buys a
  reader nothing, and rewriting all 66 comment openers would have buried the
  diff that proves the helper bodies did not move.

## Consequences

- The largest `e2e/` helper file is 445 lines, down from 1409; seven of the eight
  modules are under 232.
- A spec's import block now names which job each helper belongs to. The cost is
  that adding a helper means picking a module, which is the point.
- `modal.ts` is a recorded exception to the 400-line criterion. If a fourth
  distinct promise is ever added to it, the seam to split on is
  reachability-machinery vs fit-assertions, and the ordering comment must move
  with pass 2.
- Zero non-import, non-comment lines changed in any spec, and the 875
  non-comment lines of `helpers.ts` are present unchanged across the eight
  modules. See `NOTES.md`.
