# Notes: split e2e/helpers.ts into focused helper modules

## The rig

Rebuilt from `tasks/20260731-212557/NOTES.md` `## How the population was
counted` (TypeScript PARSER, not the scanner; runs of consecutive standalone
`//` lines fused into one comment; trailing ranges read from each token's END).
Run inside `nix develop` with `NODE_PATH` pointing at the worktree's
`node_modules` symlink.

Validated BEFORE use, in both directions:

- `src/profile/`, `src/gameStats.ts`, `src/rollingAverage.ts` -> **889 / 10 /
  18**, reproducing child `20260731-212612`'s landed table exactly.
- The seven live `src/ui` files of `20260731-212614` -> **849 / 31 / 142**,
  reproducing that child's landed after-table exactly.
- `src/practiceSession.ts`, `src/practice.ts`, `src/frontMatter.ts`,
  `src/jsonLoader.ts`, `src/markdownLoader.ts`, `src/storage.ts` -> **615 / 27 /
  142**, reproducing child `20260731-212613`'s landed after-table exactly.
- This task's own baseline, the whole of `e2e/` on the branch's base
  (`be498b3`) -> **4479 / 263 / 1166**, of which `e2e/helpers.ts` is **1409 /
  66 / 430** and `e2e/mobile.spec.ts` is **894 / 50 / 248**. The directory
  totals reproduce `20260731-212557`'s `e2e` population row (263 comments,
  1166 comment lines), and the two file figures reproduce the epic's own
  starting table.

The first build of the rig walked with `forEachChild`, which visits named
children but skips punctuation and keyword tokens, so any comment attached to
one of those was never seen: the first validation set came back **889 / 1 / 1**
instead of 889 / 10 / 18. The LINE count was already exact at that point, which
is what a broken comment counter looks like from a distance. Rewritten to
recurse over `getChildren()` and take the leaves; all four validations above
are from the corrected rig.

Every number in this record comes from that rig. `wc -l` was re-run alongside
it and the two agree per file.

## Before / after

`lines / comments / comment lines`, same rig, same invocation.

### The split file

| File | Before | After |
|-|-|-|
| `e2e/helpers.ts` | 1409 / 66 / 430 | deleted |
| `e2e/helpers/guessing.ts` | - | 75 / 5 / 28 |
| `e2e/helpers/content.ts` | - | 102 / 6 / 26 |
| `e2e/helpers/rounds.ts` | - | 158 / 11 / 40 |
| `e2e/helpers/tree.ts` | - | 231 / 11 / 53 |
| `e2e/helpers/arena.ts` | - | 220 / 9 / 56 |
| `e2e/helpers/panel.ts` | - | 97 / 5 / 26 |
| `e2e/helpers/modal.ts` | - | 445 / 17 / 180 |
| `e2e/helpers/viewport.ts` | - | 92 / 3 / 19 |
| **total** | **1409 / 66 / 430** | **1420 / 67 / 428** |

Lines break down as: `import` lines 4 -> 16 (+12), comment lines 430 -> 428
(-2), code 875 -> 875, blank lines 100 -> 101. The +12 is the eight modules'
own import headers.

Every comment `helpers.ts` had is still present; the one extra is `arena.ts`'s
new two-line file header, which carries the "arena geometry" half of the
section banner the split consumed (row 2 below), and is counted in
`## What happened to every comment`. Comment lines fall by 2,
from 30.5% of the file to 30.1%.

That is the expected result, not a disappointing one. `20260731-212557` bucketed
`e2e/` at 237 keep against 14 discard and singled this file out: "`e2e/helpers.ts`
alone holds 66 comments over 1409 lines, nearly all load-bearing. Task
20260731-212615 splits that file; it should carry the comments across intact
rather than treat their density as the problem." No ratio target was set or
chased. The deliverable here is the size and the seams.

### The specs

| File | Before | After | Delta |
|-|-|-|-|
| `e2e/autocomplete.spec.ts` | 215 / 17 / 63 | 214 / 15 / 61 | -1 / -2 / -2 |
| `e2e/closeness.spec.ts` | 86 / 9 / 24 | 88 / 9 / 24 | +2 / 0 / 0 |
| `e2e/images.spec.ts` | 51 / 3 / 9 | 50 / 3 / 8 | -1 / 0 / -1 |
| `e2e/mobile.spec.ts` | 894 / 50 / 248 | 900 / 50 / 245 | +6 / 0 / -3 |
| `e2e/modal.spec.ts` | 79 / 4 / 13 | 77 / 4 / 14 | -2 / 0 / +1 |
| `e2e/onboarding.spec.ts` | 271 / 18 / 51 | 271 / 18 / 51 | 0 / 0 / 0 |
| `e2e/panel.spec.ts` | 174 / 19 / 33 | 169 / 16 / 30 | -5 / -3 / -3 |
| `e2e/postgame.spec.ts` | 317 / 18 / 70 | 317 / 18 / 70 | unchanged |
| `e2e/practice.spec.ts` | 364 / 24 / 96 | 364 / 24 / 96 | unchanged |
| `e2e/share.spec.ts` | 283 / 18 / 59 | 283 / 18 / 59 | unchanged |
| `e2e/tree.spec.ts` | 109 / 5 / 25 | 111 / 5 / 25 | +2 / 0 / 0 |

`onboarding.spec.ts` shows 0/0/0 while two of its comments were edited: both
edits removed a parenthetical from a line that still wraps the same way, so no
line was gained or lost. The per-comment table below is what records them.

`e2e/dailyKeyMirror.ts`, `routes.spec.ts`, `seed.spec.ts` and `smoke.spec.ts`
were not touched - they never imported `helpers`.

Directory total: **4479 / 263 / 1166** -> **4491 / 259 / 1156**.

## What happened to every comment

Built from `git diff master`, by extracting each comment's before and after text
with the rig's `DUMP=1` mode and comparing the two sorted sets, not from the
working notes.

**The counts, measured, in one place.** Every number about this population lives
here, and that includes the prose ABOVE it: everywhere else in this file names
these groups rather than restating the figures, so a re-measure touches this
block only. Two deliberate exceptions, neither a current-state claim. The
before/after tables higher up carry their own per-file `lines / comments /
comment lines` triples, which are a different measurement of a different
population. And `REVIEW.md` quotes figures as they stood when a finding was
written, because it is a log of the review and must represent the reviewer
accurately; where a quoted figure has since changed it is marked as revised.

Reproduce with `DUMP=1 node comments.js` over `master:e2e/helpers.ts` and
`e2e/helpers/`, then `comm` the two sorted comment-text sets.

| Group | Count |
|-|-:|
| comments in `helpers.ts` before | 66 |
| comments in `e2e/helpers/*` after | 67 |
| of which new (the `arena.ts` file header) | 1 |
| byte-identical across the move | 56 |
| - of those 56, keeps that cite a task | 4 |
| - of those 56, keeps that cite none | 52 |
| changed text | 10 |
| spec comments edited | 8 |
| spec comments deleted | 5 |

56 + 10 = 66 before; + 1 new = 67 after. 4 + 52 = 56.

### `helpers.ts` -> `e2e/helpers/*`, the changed comments

| # | Comment | Now in | Verdict | Why |
|-|-|-|-|-|
| 1 | file header, "Shared fixtures for the browser E2E suite. See tasks/20260729-092258/DECISION.md ..." | `content.ts` | compact | The first clause described a file that no longer exists. The constraint (modal state is injected via localStorage keyed off a frozen clock) and its record pointer are kept verbatim; only the sentence naming the old file is gone. |
| 2 | `// ---- Wide-tree fixture and arena geometry (task 20260729-092339) ----` banner | `rounds.ts` header | compact | This is the divider `20260731-212557` counted in `helpers.ts` under `## Where the compacts are`. `AGENTS.md` `## File size`: "a banner is a file boundary that has not happened yet". The boundary happened. The prose and the task ID went with the code they introduce, reordered: the wide-tree half heads `rounds.ts` and the arena-geometry half heads `arena.ts`. The only text dropped is the banner's own title clause ("Wide-tree fixture and arena geometry"), which the two file names now carry; every prose clause survives. |
| 3 | `playWideTree`, "the case this task exists for" | `rounds.ts` | compact | "this task" meant `20260729-092339` when it was written and now reads as this one. Rewritten to "this fixture". |
| 4 | `expectNodeVisibleInArena`, "This is the heart of the task: ..." | `tree.ts` | compact | Same stale "this task". The clause carried no constraint, so the two sentences fused; the promise ("LOOKING at the node, not merely able to reach it by scrolling") is verbatim. |
| 5 | `expectNodeTextReadable`, "The bucket classes this task removes" | `tree.ts` | compact | Stale "this task" -> `20260729-092339`. Attribution verified: `grep -rl "bucket class" tasks/` returns `tasks/20260729-092339/DECISION.md` and nothing else. |
| 6 | `expectNoDeadScrollBand`, "The `transform: scale()` this task replaces" | `arena.ts` | compact | Stale "this task" -> `20260729-092339`. Attribution verified: `grep -rl "transform: scale" tasks/` returns `tasks/20260729-092339/TASK.md` and nothing else; that task is "Harden tree scaling and mobile scroll behavior". |
| 7 | `waitForTreeToSettle`, "Same trap as `waitForPanelToSettle` above" | `tree.ts` | compact | "above" became false: `waitForPanelToSettle` is now in `panel.ts`. One word dropped, nothing else. |
| 8 | `expectActionsReachable`, "This is the hole review round 1 found (R1.1) ..." and "(R1.2)" | `modal.ts` | compact | Review archaeology, the `AGENTS.md` discard row "found in review R1.4", and one of the 12 `20260731-212557` bucketed under `## Where the compacts are` (it names `helpers.ts:967`, this comment, and says "The constraint stays; the round number goes to the record"). Both round labels removed; every clause of both constraints kept verbatim. Evidence read: `tasks/20260730-111003/REVIEW.md` R1.1 (MAJOR, the `overflow-y: hidden` mutation and the 15px) and R1.2 (MINOR, the clip-box containment). The comment already points at `tasks/20260730-111003/DECISION.md` three lines above, so `AGENTS.md`'s "a pointer needs a constraint" still holds. |
| 9 | `expectModalFitsViewport`, "the \"row wider than the box\" defect this task exists to fix" | `modal.ts` | compact | Stale "this task" -> `20260729-141428`, which the same comment already names two paragraphs earlier ("re-running the 20260729-141428 attack"). Attribution verified by reading `tasks/20260729-141428/TASK.md`: "Fix game-over modal overflow on phone viewports", `.modal-actions` row wider than the viewport. |
| 10 | `touchScrollArena`, paragraph 1 ("the closest this harness gets to the Android Chrome behaviour ... A real device remains a manual acceptance item on task 20260729-092339") | `arena.ts` | compact | Found in review round 4, and the one genuine compaction the first pass missed. It reproduces `tasks/20260729-092339/DECISION.md` `## Fork 3` nearly clause for clause - Fork 3 chooses CDP touch events and says "Chromium's touch emulation is not Android Chrome, so real-device confirmation stays a manual acceptance item on the task". `AGENTS.md` discard row: "Rationale reproducing a `DECISION.md` - compact to one line plus the pointer." Compacted to the constraint (the reported symptom is touch specifically, so the pin must go through the touch pipeline) plus `tasks/20260729-092339/DECISION.md fork 3`. Paragraphs 2 and 3 are untouched: `Input.synthesizeScrollGesture` appears only in that task's `RETRO.md` and `REVIEW.md`, which are not compaction targets, and the measured "0 -> 172px" appears nowhere in `tasks/` at all. |
| - | every other comment | across all 8 modules | keep | Byte-identical; the count is the "byte-identical" row of the block above, verified by `comm` over the two sorted comment-text sets. |

Nothing in `helpers.ts` was deleted. Of the changed comments, six are a stale
self-reference the MOVE made false (3, 4, 5, 6, 7, 9), three are the
banner/archaeology cases the rules name (1, 2, 8), and one (10) is a rationale
that reproduces a `DECISION.md` - the only compaction here that would have been
due even without the split.

### Specs

| File | Comment | Verdict | Why |
|-|-|-|-|
| `images.spec.ts:40` | "Was `test.fixme` while every species `icon` field held ..." | compact | `AGENTS.md` discard row, quoted almost verbatim: "was `test.fixme` while ...". The defect shape (stringified Python list), the repairing task ID and the invariant all stay; "(which folded in 20260729-092404)" goes as task-merge archaeology. |
| `mobile.spec.ts:120` | "Was a test.fixme left by 20260729-092258 and owned by this task: ..." | compact | Same discard row, plus a stale "this task". The defect shape (panel and `#arena` share the same box), the FIXING task ID `20260729-092315` and the invariant are verbatim. The dropped `20260729-092258` was the task that left the fixme, which is the archaeology half. |
| `mobile.spec.ts:253` | "Found in review round 1 (R1.4)." | compact | Review archaeology; one of the 6 e2e compacts `20260731-212557` named (`mobile.spec.ts:240` on master). Evidence read: `tasks/20260729-141414/REVIEW.md:52` R1.4 (MINOR, `src/game.ts:210`), whose Response pins the fix with "a mid-game hint on a phone still shows its clade" - the test this comment sits above. Sentence deleted; the whole `updateUI()`/`src/game.ts` constraint above it is untouched. |
| `mobile.spec.ts:308` | "Review round 2 caught exactly that: with the anchor reverted ..." | compact | Named by `20260731-212557` as `mobile.spec.ts:295`. Six words went ("Review round 2 caught exactly that"), and the sentence break became a colon. The non-vacuity proof - "with the anchor reverted to the desktop 120px, the viewport-relative form read 25px and PASSED" - is kept verbatim, as `TASK.md` requires. Evidence read: `tasks/20260729-092327/REVIEW.md` R2.2, which records the revert being RUN rather than reasoned about. |
| `mobile.spec.ts:671` | "a regression this task's own relayout listener introduced before review round 1 caught it" | compact | Named by `20260731-212557` as `mobile.spec.ts:661`. Stale "this task" plus a round label -> "a regression the relayout listener itself introduced". The measured proof ("scrollLeft 571 -> 0") and the Android URL-bar constraint are untouched. Evidence read: `tasks/20260729-092339/REVIEW.md`. |
| `onboarding.spec.ts:68` | "(round 3, R3.1)" | compact | Named by `20260731-212557` as `onboarding.spec.ts:66`. Label only. Evidence read: `tasks/20260729-092327/REVIEW.md:248` R3.1 (NIT), the 320x568 inline-error case. The 1px-of-slack constraint is verbatim. |
| `onboarding.spec.ts:146` | "(review round 2, R2.1)" | compact | Named by `20260731-212557` as `onboarding.spec.ts:143`. Label only. Evidence read: `tasks/20260729-092327/REVIEW.md:147` R2.1 (MAJOR), the `#input-error` under-reservation. |
| `modal.spec.ts:6` | "see helpers.ts and DECISION.md" | compact | A pointer to the file this commit DELETES, plus an unqualified `DECISION.md` that names no task. Both halves were unresolvable after the split; rewritten to `e2e/helpers/content.ts` and `tasks/20260729-092258/DECISION.md`. The constraint (state injected into localStorage off a frozen clock) is verbatim. Found in review round 1. |
| `autocomplete.spec.ts` | "// Navigate down one and submit the highlighted suggestion." | discard | Narrates `press("ArrowDown")` then `press("Enter")` on the next two lines. |
| `autocomplete.spec.ts` | "// Guesses left decremented by exactly one, input cleared, tree changed." | discard | Narrates the three assertions directly beneath it. |
| `panel.spec.ts` | "// Toggle open: the pre-rendered hint card is shown." | discard | Narrates `toggle.click()` and the two assertions under it. |
| `panel.spec.ts` | "// Toggle closed: panel is dismissed and the input remains usable." | discard | As above. |
| `panel.spec.ts` | "// Toggle open again: card content is shown once more." | discard | As above. |

Those 5 discards are within the 14 `20260731-212557` counted for the whole of
`e2e/` ("scattered singles"). The rest of the directory's comments were read and
left alone: they are the why-this-assertion case, which `AGENTS.md` `## Comments`
keeps "at whatever length it needs".

Two candidates were read and REJECTED as discards:

- `practice.spec.ts:36` "Every `gameState-practice-*` key currently on disk." -
  it is the docstring on `practiceKeys()`, stating that helper's promise.
- `autocomplete.spec.ts:97` "The bug: this list used to be empty." - it is the
  defect shape the assertion two lines down defends.

## The keeps, and the grep behind them

`TASK.md` Step 4 asks for the two-grep evidence pass on every keep, not only on
the comments that changed. What that pass has to answer for a keep is one
question: is this comment's rationale duplicated in a `DECISION.md`, `SPIKE.md`
or `NOTES.md`, making it a COMPACT the pass missed? `AGENTS.md` is explicit that
those three KINDs are the only compaction targets, and that a rationale with no
record behind it stays in full however long it is.

The population is bounded and was walked, not sampled:

- **The byte-identical helper comments that name no task.** No task ID, no
  `tasks/` path, no `DECISION.md` - they are docstrings, one-line
  slack/diagnostic notes, and why-this-assertion prose about the browser
  (`popIn`, `pulseMystery`, `Input.synthesizeScrollGesture`, Chromium's integer
  `scrollTop`, `elementFromPoint`). Grepped `tasks/` on each one's subject term;
  the recurring hits are `20260729-092339` and `20260730-111003`, whose
  `DECISION.md` files were read in full for this task. Neither restates any of
  them: `20260729-092339/DECISION.md` decides the SCALING MECHANISM (bucket
  classes out, continuous scale in) and `20260730-111003/DECISION.md` decides
  the MODAL CAP (fork A, cap + scroll). Neither records why a measurement waits
  for an animation, why a rect check needs `toBeInViewport` beside it, or why a
  slack is one pixel. Those comments are their own only copy, so keep in full is
  the rule's answer, not an omission.
- **The byte-identical helper comments that DO cite a task.** Measured with
  the rig over the AFTER state: 11 of the comments now in `e2e/helpers/*`
  carry a task ID or a `tasks/` path. `helpers.ts` itself had 9, which is also
  `20260731-212557`'s per-file figure; the 2 extra are the IDs this pass put in
  place of "this task" (`tree.ts:201`, `arena.ts:8`). 7 of the 11 are among the
  changed comments tabled above (`content.ts:5`, `rounds.ts:7`, `tree.ts:198`,
  `arena.ts:7`, `arena.ts:147`, `modal.ts:118`, `modal.ts:222`), leaving the
  4 keeps - `guessing.ts:10`, `:40`, `:60`
  (`20260729-130138`, `20260729-141427`) and `content.ts:66`
  (`20260729-092352`). The fifth, `arena.ts:147`, was in this list until review
  round 4 read the record its second ID points at and found `## Fork 3`
  restating it; it is row 10 of the compact table above now.

  None of the four is the trailing "record pointer" form; all four carry a bare
  ID inside the sentence, which is the "attribution inside a constraint" row of
  the shape table further down. That does not make them compaction candidates,
  and the reason is not their form but their content: in each, the constraint IS
  the comment's own substance and no `DECISION.md` or `NOTES.md` restates it.
  Checked one by one, and this time that means all four, against every record
  each cites - `20260729-130138` has both a `DECISION.md` and a
  `NOTES.md`, and both were read. The `DECISION.md` is "who owns the Enter key
  on the guess input" and decides which of the two keydown listeners submits;
  the `NOTES.md` is the reproduction transcript. Neither says why
  `guessFirstSuggestion` asserts the COUNTER rather than the emptied input,
  which is that comment's substance - the one `NOTES.md` line matching
  "counter" is the author's own one-line reading of the pasted Playwright output
  directly above it ("The guess was swallowed and the counter never moved"), not
  a rationale for the assertion's shape. `20260729-092352` has a `DECISION.md`, read:
  "Jurassic data-integrity harness shape", which decides the harness and who
  owns the repair; `grep -cE 'startsWith|leading|"\["'` over it returns 0, so
  the leading-"[" guard's shape is stated only in the comment. `20260729-141427` has no `DECISION.md` and no
  `NOTES.md` at all - only TASK/REVIEW/RETRO - so that comment could not be
  compacted even if it were long.

Two keeps were probed hardest, because they are the longest and would be the
biggest wins if a record held them:

| Keep | Symbol grepped | Records found | KINDs read | Verdict |
|-|-|-|-|-|
| `expectModalFitsViewport`'s 53-line ordering essay | `expectModalFitsViewport`, `modal-actions`, "three passes" | Union of the three greps, run separately: `20260729-141428/{REVIEW,TASK}.md`, `20260730-111003/{DECISION,RETRO,TASK}.md`, `20260730-165921/TASK.md`. Six files. `20260730-111003/REVIEW.md` is NOT in the set - none of the three terms appears in it | all six | keep in full. `20260730-111003/DECISION.md` decides the CAP and says nothing about the ORDER of the three passes; the ordering was worked out in this helper and exists nowhere else. `20260729-141428` has no `DECISION.md` at all. |
| `expectActionsReachable`'s three-bullet discrimination essay | `expectActionsReachable`, `scrollModalTo`, `overflow-y` | Union of the three greps, run separately: `20260730-111003/` (all four KINDs), `20260729-141414/TASK.md`, `20260729-141428/REVIEW.md`, `20260730-160720/TASK.md`. Seven files | all seven | keep in full apart from the two round labels (row 8 above). The substance lives only in `20260730-111003/REVIEW.md`, which is NOT a compaction target, so the constraints stay verbatim - which is what happened. |

Negative claim, with its own evidence: `ls tasks/*/SPIKE.md` returns exactly
one file, `tasks/20260729-160500/SPIKE.md` ("make the hint split the remaining
candidates"), and `grep -rn 20260729-160500 e2e` returns 0 hits. No `e2e/`
comment has a `SPIKE.md` behind it, so the compaction-target set for this
task's population is `DECISION.md` and `NOTES.md` only - and both KINDs were
read for every record named above.

## Task references surviving in e2e/ (the epic's Done Means grep)

```sh
grep -rnE '//.*(2026[0-9]{4}-[0-9]{6}|tasks/)' e2e
```

44 lines, in 37 comments (rig, `DUMP=1` filtered on the same pattern), across
18 files. On `master` the same measurement is **34** comments; the branch is
**37**. The +3 is deliberate and is the whole point of three of the edits:

| File | Was | Now |
|-|-|-|
| `e2e/modal.spec.ts:7` | "see helpers.ts and DECISION.md" - a pointer to a deleted file and an unqualified `DECISION.md` | `e2e/helpers/content.ts` and `tasks/20260729-092258/DECISION.md` |
| `e2e/helpers/tree.ts:201` | "the bucket classes this task removes" | "the bucket classes `20260729-092339` removed" |
| `e2e/helpers/arena.ts:8` | "the `transform: scale()` this task replaces" | "the `transform: scale()` `20260729-092339` replaced" |

The `modal.spec.ts` edit turns an unresolvable pointer into a record pointer.
The other two turn "this task" - which after the move reads as THIS task - into
a bare ID that at least resolves; neither is the `tasks/X/DECISION.md` form, and
calling them record pointers would overstate them.

Nothing in `e2e/` uses the `NOTE:`/`FIXME:`/`TODO:`/`BUG:` marker form, so all
37 have to justify themselves under the epic's other limb. They do not all take
the same shape, and the honest breakdown is:

| Shape | Count | Epic's Done Means |
|-|-:|-|
| Carries a `tasks/<id>/<RECORD>.md` path | 10 | record pointer, unambiguously |
| Carries a `tasks/<id>` path with no record file named | 5 | record pointer to a folder; the reader lands on the task and picks the KIND |
| Bare ID, no `tasks/` path | 22 | attribution inside a constraint, not a pointer |

The `tasks/<id>/<RECORD>.md` row gained a member in review round 4, when
`arena.ts:147` was compacted onto `tasks/20260729-092339/DECISION.md` and left
the bare-ID row.

So the blanket claim "all 37 are record pointers" would be false, and 12 of the
37 put the ID in the comment's FIRST line rather than after the constraint
(`tree.spec.ts:15`, `autocomplete.spec.ts:49`, `mobile.spec.ts:168` and nine
others). What IS true, and is what was checked comment by comment: every one of
the 37 carries a live constraint that the ID identifies rather than replaces -
the ID names the defect the assertion still defends, or the decision the
assertion implements. None is the `AGENTS.md` discard shape "task `<id>` wanted
me to ...", where the ID is the whole content and there is no constraint left
if you delete it.

The closest call is `e2e/mobile.spec.ts:188-191`: "Same shape, reached by
reloading rather than by guessing (F3.6). Task 20260729-125313 owns the general
reload auto-open; this pins the phone consequence, which the narrow-viewport
rule fixes whatever triggered the render." The "task X owns ..." phrasing is one
step from the discard row. It survives because both clauses around it are real
constraints - what the assertion covers (the reload path, F3.6) and what it
deliberately does NOT cover (the general case, which is another task's) - and a
reader cannot recover either from the code. It is in a spec this task only
re-imported, so rewriting it was out of scope; flagged here rather than left
unremarked.

The two that LOOK like bare pointers, `e2e/practice.spec.ts:14` ("See
tasks/20260729-101754.") and `e2e/seed.spec.ts:7` ("tasks/20260729-101819."),
are the closing line of a multi-line comment whose constraint is the four lines
above it - checked by reading both comments whole, not by reading the grep hit.

## Import-line edits in sibling-owned files

`e2e/*.spec.ts` belongs to this task's cluster, but the changes below are
mechanical import rewrites and nothing else. Every edited line:

| File | Change |
|-|-|
| `autocomplete.spec.ts` | 1 line -> 2: `guessFirstSuggestion` from `./helpers/guessing`, `loadContent` from `./helpers/content` |
| `closeness.spec.ts` | 1 line -> 3: `guessNamedSpecies` (`guessing`), `treeNode` (`tree`), `WIDE_TREE_SEED` (`rounds`) |
| `images.spec.ts` | 1 line: `isStructurallyValidImageSrc` -> `./helpers/content` |
| `mobile.spec.ts` | 1 block of 21 -> 8 blocks totalling 30, one per module - it uses all eight |
| `modal.spec.ts` | 5 lines -> 2: `loadContent`/`seedFinishedDailyGame` (`content`), `expectActionsOnOneRow` (`modal`) |
| `onboarding.spec.ts` | 5 lines -> 5: `guessFirstSuggestion` (`guessing`) split out, the other two from `viewport` |
| `panel.spec.ts` | 5 lines -> 3: `guessing`, `content`, `panel` |
| `postgame.spec.ts` | 1 line: specifier `./helpers` -> `./helpers/content` |
| `practice.spec.ts` | 1 line: specifier `./helpers` -> `./helpers/guessing` |
| `share.spec.ts` | 1 line: specifier `./helpers` -> `./helpers/content` |
| `tree.spec.ts` | 1 block of 10 -> 3 blocks of 12: `rounds`, `tree`, `arena` |

No file outside `e2e/` was touched. `src/`, `test/` and `scripts/` are
byte-identical to `master`.

## Proof

### No assertion changed

Every spec, `master` vs `HEAD`, with comments, blank lines and whole `import`
statements stripped, then compared. Runs against the committed branch, so it is
reproducible by anyone at any later point:

```sh
strip() {
  awk '
    /^import /          { inimport = !/;[[:space:]]*$/ && !/from ".*";?$/; next }
    inimport            { if (/^} from /) inimport = 0; next }
    /^[[:space:]]*\/\// { next }
    /^[[:space:]]*$/    { next }
    { print }
  '
}
for f in $(git ls-tree --name-only HEAD e2e/ | grep '\.spec\.ts$'); do
  diff -q <(git show "master:$f" | strip) <(git show "HEAD:$f" | strip) >/dev/null \
    || echo "BODY CHANGED: $f"
done
```

No output, exit 0. No spec's body changed at all - not an assertion, not a
locator, not a viewport, not a fixture value.

### Helper bodies are byte-identical

`helpers.ts` and the eight modules, stripped of comments, blank lines and
`import` lines, then sorted:

```
$ diff code.before code.after
(no output)   # 875 lines each
```

The split moved code and changed nothing else.

### The mutation still reddens, through the moved helper

The attack is the one `expectActionsReachable`'s own comment documents:
`.modal`'s `overflow-y: auto` -> `hidden` at `src/style.css:1252`. Chromium
scrolls an `overflow: hidden` box programmatically but not by touch or wheel,
so the assertion's own `scrollTop` write can manufacture a pass; the guard is
the computed-`overflow-y` check.

Applied from a scratch copy to a detached `master` worktree and to this branch,
`--project=mobile-chromium` both times:

| | Failed | Passed | Failing helper frame |
|-|-:|-:|-|
| `master` (be498b3) + mutation | **10** | 38 | `expectActionsReachable (e2e/helpers.ts:1036:11)` |
| this branch + mutation | **10** | 38 | `expectActionsReachable (e2e/helpers/modal.ts:187:11)` |
| this branch, unmutated | 0 | 48 | - |

The two failing sets are the same 10 tests, name for name - the five short
viewports times win and loss - differing only in the spec line number the
import block and the round-1 rewraps shifted (845 vs 851). Both go red inside the moved helper. The
count also reproduces `tasks/20260730-111003/REVIEW.md`'s recorded
"R1.1's mutation (`overflow-y: hidden`) | **10 failed** (was 0)".

`src/style.css` was restored from the scratch copy afterwards; `git status`
reports `src/` clean.

### The gate

`npm run ci` inside `nix develop`, run bare: **126 passed, exit 0**.

## Size

```
$ wc -l e2e/*.ts e2e/helpers/*.ts   # after
   214 e2e/autocomplete.spec.ts       445 e2e/helpers/modal.ts
    88 e2e/closeness.spec.ts          231 e2e/helpers/tree.ts
    32 e2e/dailyKeyMirror.ts          220 e2e/helpers/arena.ts
    50 e2e/images.spec.ts             158 e2e/helpers/rounds.ts
   900 e2e/mobile.spec.ts             102 e2e/helpers/content.ts
    77 e2e/modal.spec.ts               97 e2e/helpers/panel.ts
   271 e2e/onboarding.spec.ts          92 e2e/helpers/viewport.ts
   169 e2e/panel.spec.ts               75 e2e/helpers/guessing.ts
   317 e2e/postgame.spec.ts
   364 e2e/practice.spec.ts
    49 e2e/routes.spec.ts
    92 e2e/seed.spec.ts
   283 e2e/share.spec.ts
    54 e2e/smoke.spec.ts
   111 e2e/tree.spec.ts
```

Two files remain over the `Definition of Done`'s "roughly 400 lines":

- `e2e/helpers/modal.ts`, 445. The recorded exception; see `DECISION.md`
  `## Alternatives considered`. One job, three ordered passes, and the ordering
  rationale would be orphaned by a split.
- `e2e/mobile.spec.ts`, 900. **Out of scope for this task and left alone.**
  It is a spec, not a helper, and splitting it would move `test()` blocks
  between Playwright projects - `playwright.config.ts` routes `mobile.spec.ts`
  to the `mobile-chromium` project by filename `testMatch`, so a split changes
  which viewport each test runs on. That is a behaviour change to the suite and
  the epic forbids one. Flagged here as the largest thing left in `e2e/`.
