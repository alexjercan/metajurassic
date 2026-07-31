# Retro: KISS pass: src/ui widget family

- TASK: 20260731-212614
- BRANCH: refactor/ui-widget-kiss
- REVIEW ROUNDS: 2

## What went well

- **Validating the rebuilt rig in both directions before using it, and being
  wrong.** The first build read trailing comment ranges from each token's START
  instead of its END and returned `889 / 6 / 14` against sibling
  `20260731-212612`'s landed `889 / 10 / 18`. The LINE count matched, which is
  exactly how a broken comment counter looks correct; four one-line trailing
  comments were simply invisible. Reproducing a landed sibling's table is the
  only check that catches this, and it caught it before a single number reached
  a record. The method the flow prompt prescribes earned its cost on the first
  command of the task.
- **Refusing a comment on the record's KIND, twice, and saying where the
  rationale does live.** `panel.ts:109`'s rationale is in a `TASK.md`
  close-out; `MAX_SUGGESTIONS`/`findMatches` sit in a task folder with no
  `DECISION.md` at all. Both stay verbatim, with `NOTES.md` naming the record a
  reader should go read anyway. That is `20260731-212613`'s `isResumable` call
  applied deliberately rather than rediscovered.
- **Deleting `src/ui/index.ts` on a precedent rather than on taste.** The
  no-barrel-re-export rule from `20260731-212610` case 2, re-applied by two
  siblings, decides a facade that owns nothing, and the epic's
  "no boundary changes" line does not protect an indirection its own callers
  already bypass. The decision took one paragraph because the argument was
  already in the tree.
- **Keeping a sibling's line-number pointer valid instead of editing a
  sibling's file.** `e2e/postgame.spec.ts:217` names `autocomplete.ts:67`, and
  freezing everything above that line cost nothing, because both comments up
  there were keeps on their own merits.

## What went wrong

- **A number was "verified" by matching its digits, not its meaning** (review
  R1.1). `onboarding.ts`'s hint copy said a hint costs "a player who can read
  the tree +2.2 guesses", and `NOTES.md` said the figure had been checked
  against the SPIKE rather than carried from the comment. The SPIKE table is
  TWO columns wide: `+2.2 to +2.4` is the expert column and the tree-reader
  pays `+0.5 to +1.3`. The check found `+2.2` at `cost=3` and stopped there.

  It seemed sound because the number really is in the record, at the row the
  comment is about, in a table the pass genuinely opened. What was never
  compared is the axis the CLAIM is indexed on - which player model - because
  the grep was for the figure and the figure was there. `20260729-141424`'s
  DECISION states the pair correctly, so the disagreement was one grep away.

- **Record rows were labelled from the intent, not from the diff** (R1.2, R1.3).
  Four keep/compact rows carried the verdict `keep` for comments the diff shows
  were rewritten, one of them beside the words "already in the target form";
  and the close-out's "eleven compacted onto a constraint plus a record
  pointer" was wrong in both directions - 17 of 31 survivors were rewritten,
  and only 9 of the 13 compactions carry a pointer.

  It seemed sound because the labels described what the pass MEANT to do to
  each comment, decided while reading the file, and those intentions were
  mostly right. Nothing re-derived them from `git diff master -- src/ui` after
  the edits existed. The evidence was one command away and pointed at itself:
  the table is a claim about the diff, so the diff is what it must be built
  from.

- **A superlative was asserted over a set it was not measured over** (R1.4).
  "The three tree files carry the directory's highest comment ratios" is true
  of two of them; `treeVisualizer.ts` is 7%, second-lowest of the ten files in
  `src/ui/`. `DECISION.md` case 1 said "the two highest" correctly, so the
  record contradicted itself in three other places. The three files travel
  together as a landed sibling's cluster, and the sentence quietly borrowed the
  cluster's headline property for each member.

## What to improve next time

- When a record cites a figure from a table, name the ROW AND the COLUMN, or
  quote the table. A single number is not addressable in a two-dimensional
  source.
- Build every "what happened to X" table in a record FROM the diff, not from
  the working notes: extract the before and after text and compare, then label.
  The four mislabelled rows and both wrong counts came from the same gap, and
  one `git diff` pass would have caught all six.
- A property that belongs to a SET ("the densest files") needs re-checking per
  member before it is written about each member.

## Action items

- `20260801-002929` (filed): `tasks/20260729-092327/DECISION.md:87-88`
  attributes the SPIKE's expert-column cost to a tree-reader. A landed record,
  so it is not fixed in this pass.
- No follow-up work is owed by this task itself. The `card.ts` unreachable
  inner ternary and `panel.ts`'s never-imported `closePanel` export are
  recorded in `NOTES.md` as observed and deliberately not changed; neither is a
  defect, and both are restructures a comment-and-split pass may not make.
