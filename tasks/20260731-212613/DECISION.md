# Decision: the practice/storage/loader cluster keeps its file boundaries

- DATE: 20260731
- STATUS: ACCEPTED
- TASK: 20260731-212613
- TAGS: refactor, gameplay

## Context

Two choices the Steps require before any comment moves.

(1) `src/practiceSession.ts` is 281 lines and 35% comment, the largest comment
block left in `src/` outside `src/ui/`. The plan's read said it does NOT split;
the implementation had to confirm or overturn that against the file.

(2) `src/frontMatter.ts:1-14` asserts that `markdownLoader.ts` reads the parser
in the browser. That module is dead, so the claim is false - but its removal is
`20260730-120401`'s call, not this task's, so the header cannot simply be
corrected to "nothing reads it" and closed.

## Decision

### 1. `src/practiceSession.ts` does NOT split

Confirmed against the file rather than inherited from the plan.

`AGENTS.md` `## File size` splits a file that holds **several unrelated jobs**,
and names section banners (`// ---- Policies ----`) as the reliable signal.
There is not one banner in the file. It does NOT split for length alone, nor
for "a single caller wanting an abstraction".

The one candidate seam is the storage scan and reap - `StoredRound`,
`parseSaved`, `practiceRounds`, `prunePracticeEntries`, `MAX_PRACTICE_ENTRIES`.
Measured on `master` rather than taken from the plan: lines 25-27 plus lines
50-127, **about 80 lines**, not the "about 60" `TASK.md` estimated. The bigger
figure does not change the answer. Rejected, on three counts:

- `prunePracticeEntries`'s only shipped caller is `startNewPracticeRound`, in
  the same file. One caller is not an abstraction.
- `parseSaved` is used on BOTH sides of the proposed seam - by
  `practiceRounds` and by `abandonPracticeRound`/`resolvePracticeSeed` - so the
  cut either duplicates it or exports it purely to cross the new boundary. A
  seam that has to grow an export to exist is not a seam the reader wanted.
- The file's own header states ONE job (which round the practice page plays,
  when a new one starts, what happens to the old ones), and
  `test/practiceSession.test.ts` describes the five exports as one lifecycle.
  Pruning is not a second job; it is "what happens to the old ones".

Overturning this needs a named second job. 281 lines is not one.

### 2. `src/frontMatter.ts:1-14` is rewritten to the readers that actually exist

The header's central claim - "`markdownLoader.ts` reads it in the browser" -
is false. `src/markdownLoader.ts` exports a `loadGameData` that nothing
imports; every page that loads content (`game/index.ts`, reached from the
`index` and `practice` entries, plus the `clades`, `species` and `profile`
entries) takes `jsonLoader`'s. So the browser reads NO frontmatter, and the
comment describes a path nothing takes - `## Comments` "every clause describes
behaviour that no longer ships".

The module's future is `20260730-120401`'s call (delete the dead loader, or
wire it up), not this task's: it turns on which loader the project WANTS, a
product decision. So the header cannot simply say "the browser does not read
this" and stop - that reads as settled when it is open.

Decision: state the true readers (`test/contentSource.test.ts` for
`parseFrontMatter`, that test plus `test/dataIntegrity.test.ts` for
`isSerializedCollection`), keep both constraints the header carries - ONE
parser rather than a copy in the test, and the deliberate mirror of
`scripts/markdown_to_json.py` - and mark the open question with a `NOTE:`
naming `20260730-120401`, which is a live tracker marker over an OPEN task.

## Alternatives considered

**Splitting off the storage scan and reap.** Rejected above on three counts.
The strongest single one is `parseSaved` straddling the cut: a seam that has to
grow an export to exist was not a seam the reader wanted.

**Deleting the `frontMatter.ts` header outright.** Rejected. Two of its clauses
are Keeps under `## Comments` (a non-obvious constraint, and a cross-language
mirror contract); only the reader claim is false. Compaction, not deletion.

**Fixing the false claim by deleting `markdownLoader.ts` here.** Rejected. That
is `20260730-120401`, filed by `20260729-092352`, and this epic files bugs as
their own tasks rather than fixing them inline.

**Saying "nothing reads this in the browser" and stopping.** Rejected. It reads
as a settled state when the question is open, which is exactly what the
`NOTE:` marker exists to prevent.

## Consequences

- `src/practiceSession.ts` stays one file. Its comment block shrinks (98 ->
  84 comment lines) but no code moves and no symbol is renamed or exported.
- `src/frontMatter.ts` GREW by 5 lines. Stating what is true and marking the
  open question costs more than the one false sentence it replaced; that is
  accepted, not smoothed over.
- `src/markdownLoader.ts` stays byte-identical to `master`. The next reader of
  `frontMatter.ts` is pointed at `20260730-120401` rather than at a dead end.
- The no-split answer is now on the record with the seam it rejected named, so
  a future reader who wants to split does not have to re-derive the argument.
