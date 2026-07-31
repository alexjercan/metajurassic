# Decision: KISS pass: src/ui widget family

- DATE: 20260801-001320
- STATUS: ACCEPTED
- TASK: 20260731-212614
- TAGS: refactor, ui, comments

## Context

Eight widget files, `888 / 39 / 177` (lines / comments / comment lines by the
parser rig), 20% comment lines. Four choices are load-bearing enough that a
later reader would otherwise have to re-derive them from the diff: what the
cluster is, whether the `src/ui/index.ts` barrel survives, whether anything
splits, and what happens to a comment whose rationale exists only in a record
KIND `AGENTS.md` `## Comments` does not accept.

## Decision

### 1. The cluster is the eight widget files; the three tree files are excluded

`panel.ts`, `autocomplete.ts`, `card.ts`, `onboarding.ts`, `modal.ts`,
`share.ts`, `autoShrink.ts`, `index.ts`.

`src/ui/treeLayout.ts` (106 / 5 / 47, 44%) and `src/ui/treeScroll.ts`
(291 / 16 / 109, 37%) hold the directory's two highest comment ratios;
`src/ui/treeVisualizer.ts` (87 / 2 / 6, 7%) is near the bottom and is here only
because it is the third file of the same landed cluster. They are
landed sibling `20260731-212611`'s files, and their density is that task's
recorded VERDICT rather than a miss: `tasks/20260731-212611/RETRO.md` states
`treeScroll.ts` ships 109 comment lines against 291 code lines because the
records behind its browser-quirk comments are a `REVIEW.md` and a `RETRO.md` -
KINDs `## Comments` "compact only towards an existing record" does not accept.
Re-opening them here would re-litigate a landed decision on the same evidence.
They are measured in `NOTES.md` for completeness and left byte-identical.

### 2. `src/ui/index.ts` is deleted, not kept

The barrel re-exports seven symbols over four lines. Exactly one import in the
tree goes through it - `setupAutocomplete` at `src/game/index.ts:7`. Five of
the rest (`renderLastGuess`, `openPanel`, `renderTree`, `showWinModal`,
`showLossModal`) are imported from their own modules by every caller that wants
them, including by `src/game/index.ts` itself two lines further down. The
seventh, `closePanel`, has no importer at all: `grep -rn 'closePanel\b' src
test e2e scripts` finds only its definition and `closePanelManually`'s call to
it, both inside `panel.ts`. Deleting the barrel neither creates nor fixes that
- it stops the barrel from advertising it.

This applies the precedent `tasks/20260731-212610/DECISION.md` case 2 set and
`20260731-212611` and `20260731-212612` each re-applied: a file that exports
what it does not own is, to every reader and every grep, the file that holds
it. The barrel is that shape in its purest form - it owns nothing at all. One
mechanical import-line edit in a sibling's file (`src/game/index.ts:7`, listed
in `NOTES.md`) buys the deletion of a whole file whose only effect is to make
one import out of several lie about where its symbol lives.

### 3. Nothing splits

Each file is one surface already. The two candidates the plan named:

- `card.ts` builds card DOM - locked species, species, clade - plus
  `mountCard`/`shrinkCardTitle`, which are a few lines each and exist because a
  card must be in the document before `autoShrinkText` can measure it. That is
  one job (build a museum card and get it on screen), and the two mount helpers
  have callers in `panel.ts`, `species.ts`, `clades.ts` and
  `profile/dinosaurList.ts`, so they are not a one-caller abstraction either.
- `panel.ts` is the info-panel surface: its open/close state, the pull tab that
  advertises it, and what gets rendered into it. The viewport rule is not a
  second job - it is the open rule, which is the panel's whole subject.

`## File size` splits for several unrelated jobs, not for length, and the
largest file here is 176 lines. No section banner appears anywhere in the eight.

### 4. A comment whose only record is a `TASK.md` stays in full

`panel.ts`'s "the starting hint is not NEW information, so the tab advertises it
as plain Info rather than flagging it unseen" is rationale, and it does have a
record: `tasks/20260729-141414/TASK.md` (close-out), which says the pre-guess
tab initially carried the unseen dot and read "Dinosauria", duplicating the
tree's only node.

`## Comments` names `DECISION.md`, `SPIKE.md` and `NOTES.md` as the only
compaction targets. A `TASK.md` close-out is not among them, so this comment is
still its own only accepted copy and is kept verbatim - the same call
`20260731-212613` made for `isResumable` against a `REVIEW.md`, for the same
stated reason rather than by accident. `NOTES.md` records where the rationale
does live so the next reader is sent there rather than told it is nowhere.

## Alternatives considered

- **Sweep all eleven `src/ui/` files.** Rejected in case 1. The three tree
  files hold 162 comment lines against this task's whole 177-line starting
  population, so including them is where the big number is - and taking it
  would mean overturning a landed sibling's recorded verdict on evidence that
  has not changed.
- **Keep `src/ui/index.ts` and route the other imports back through it.** The
  consistent version of the barrel. Rejected in case 2 on the standing
  precedent: it would put more imports through a file that owns nothing.
- **Keep `src/ui/index.ts` untouched as out-of-scope boundary work.** Rejected:
  the epic excludes "changing public module boundaries beyond moving code", and
  deleting a facade that its callers already bypass moves no boundary - it
  deletes an indirection that misreports one.
- **Split `card.ts` into builders and mounting.** Rejected in case 3: the mount
  helpers are a handful of lines and belong to the thing they mount.
- **Compact the starting-hint comment towards `20260729-141414/TASK.md`.**
  Rejected in case 4 on the record's KIND, not on its existence.
- **Fix `e2e/postgame.spec.ts:217`'s line-number pointer into
  `src/ui/autocomplete.ts`.** Rejected: `e2e/` belongs to siblings
  `20260731-212615`/`-212616`, and the epic allows only mechanical import-line
  edits in a sibling's files. The pointer is kept valid instead, by making
  every edit in `autocomplete.ts` land below the line it names.

## Consequences

- `src/ui/` drops from eleven files to ten. `src/game/index.ts` gains one
  changed import line and imports nothing through a barrel any more.
- `src/ui/autocomplete.ts` lines 1-67 are frozen for this pass. Its
  `MAX_SUGGESTIONS` comment and `findMatches` docstring are keeps on their own
  merits (a public API contract plus two defect shapes), so the freeze costs
  this task nothing - but it is a constraint a future pass over the file must
  either honour or retire by fixing the e2e pointer first.
- `treeLayout.ts` (44%) and `treeScroll.ts` (37%) keep the directory's two
  highest comment ratios, well above the densest file this task did touch
  (`onboarding.ts`, 29% after). Anyone reading `src/ui/` as a percentage after
  this task will see that and must read case 1 before treating it as unfinished
  work.
