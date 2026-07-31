# Decision: the four hard cases the comment rules have to settle

- DATE: 20260731
- STATUS: ACCEPTED
- TASK: 20260731-212557
- TAGS: docs, process, refactor

## Context

The epic's keep/discard tables (`tasks/20260731-212345/TASK.md`) settle the
easy comments. Four cases are not settled by them, and every one of the eight
sibling cleanup tasks hits all four. Left undecided, each sibling invents its
own answer and the tree ends up inconsistent - which is the failure this task
exists to prevent.

The evidence is the inventory in `NOTES.md`: 837 comments read and bucketed,
620 keep, 73 compact, 144 discard, 75 carrying a task reference.

The through-line for all four: **a comment is kept for what a reader cannot
recover without it.** Not for what it took to learn, and not for who learned
it.

## Decision

### 1. An inline pointer to a `DECISION.md` or a task record

Example - `src/practice.ts:35`:

```ts
// Ships hidden in the SHARED template - the daily page renders the same
// file and leaves it hidden. See tasks/20260729-101754/DECISION.md.
```

**KEEP, as one line.** A pointer is the cheapest possible comment and the
thing that makes compaction safe everywhere else: rationale can be moved out
of the code precisely because a line like this survives to say where it went.
Deleting pointers would make every later compaction a deletion.

Rule: a record pointer is kept, and is at most one line. It sits after the
constraint it explains, never instead of one - a bare `See tasks/X/DECISION.md`
with no statement of what is being constrained tells a reader nothing they can
act on without opening another file.

### 2. Rationale that exists ONLY in the comment

Example - `src/gameData.ts:5`, the daily shuffle salt:

```ts
// Fixed salt for the daily shuffle. [...] This value (the golden-ratio hashing
// constant) yields zero adjacent pairs for the shipped count of 150;
// gameData.test.ts pins that against the real list. Changing it reshuffles the
// whole schedule, so keep it stable.
```

**KEEP IN FULL. Do not compact, and do not move it to a task record.** No
record holds this; the comment is the only copy. Compacting it would be
inventing a pointer to a document that does not exist, and moving it into a
task record would put a live constraint into an archive nobody reads while
editing `gameData.ts`.

Rule: length is never itself a reason to cut. A comment may only be compacted
TOWARDS an existing record. If the rationale has no record behind it, either it
stays in full or the record is written first and the comment compacted after -
never compacted first.

This is the case the epic's "rationale essays reproducing a `DECISION.md`" line
does not cover, and the one most likely to be got wrong by a task working
quickly through a file.

### 3. A comment describing behaviour that no longer ships

Example - `e2e/images.spec.ts:40`:

```ts
// Was `test.fixme` while every species `icon` field held a stringified
// Python list ("['https://...svg']"). The media was repaired and the data
// pinned by 20260729-092352 (which folded in 20260729-092404), so the
// invariant this test always encoded is now asserted for real.
```

**COMPACT, do not delete.** The framing is dead - the test is not `fixme`, and
which task un-fixmed it is archaeology. What is NOT dead is the defect SHAPE:
`"['https://...svg']"` is what this assertion exists to keep failing, and a
reader who loses it will eventually "simplify" the assertion into a plain
non-empty check.

Rule: split the comment at the constraint. Behaviour that no longer ships is
deleted; a defect shape, a value, or an invariant the code still defends is
kept even when the story around it is dead. Ask what a reader would do wrong
without the fact - if the answer is "nothing", it goes.

A comment whose EVERY clause describes something that no longer ships is
deleted outright. That is the actively-misleading case, and the one discard the
rules treat as urgent rather than cosmetic.

### 4. A test comment explaining why an assertion is the assertion

Example - `e2e/postgame.spec.ts:75`:

```ts
// `disableInput` also hides the suggestion box, but asserting that HERE
// could not fail: `.autocomplete-box` is `display: none` in the
// stylesheet and this fixture reloads into a finished round, so the box
// was never open. The test below opens it on a live round first, which
// is the only way to tell the stylesheet's hiding from the game's.
```

**KEEP.** This is the strongest keep case in the repository, and the reason
`test/` and `e2e/` come out of the inventory at 207 and 237 keep. The comment
records why the assertion is where it is and not where it looks like it should
be. Without it the next reader "tidies" the check into the earlier test and
turns a real guard into a vacuous one - exactly the failure `LESSONS.md`
`a-guard-no-test-can-fail-is-a-comment` records.

Rule: in `test/` and `e2e/`, a comment explaining why an assertion has its
particular form - why exact values and not a property, why this viewport, why
both branches, why here and not there - is kept, at whatever length it needs.
Test comments are held to the same discard rule for narration
(`// Two games on the same day` above an obvious fixture goes) and to no extra
brevity rule beyond it.

## Alternatives considered

**Bucket the inventory with a regex classifier instead of reading.** Rejected.
The keep/discard line is a judgement about whether a reader could recover the
fact from the code, which no pattern expresses. All 837 comments were read.
The mechanical route also failed on its own terms: the first extraction pass
used the TypeScript scanner, which mistook `/\.md$/` in
`src/markdownLoader.ts:29` for a comment and hid every later comment in that
file - reporting 115 comments in `src/` where there are 223.

**Delete inline record pointers along with the rationale they point at.**
Rejected as case 1. It would make every compaction elsewhere a silent deletion,
because nothing in the code would say where the reasoning went.

**Blanket-compact every comment over N lines.** Rejected as case 2. Length does
not predict whether a comment is recoverable from elsewhere, and the longest
comments in `e2e/helpers.ts` are among the most load-bearing in the tree.

**Enforce the rules with a lint rule in `test/lintGate.test.ts`.** Rejected
here on two counts: it would edit `test/`, which this task forbids, and the
four cases above are precisely the ones a linter cannot judge.

**Apply a lighter rule to `test/` and `e2e/`** (the epic's Fog wondered whether
their density is a problem). Rejected by the measurement: 237 keep against 14
discard in `e2e/`. The density is the why-this-assertion case, which is a keep,
so they get the same rules and no extra brevity rule.

## Consequences

- `AGENTS.md` gains `## Comments` and `## File size`. Sibling tasks apply those
  sections; this record is the worked-example appendix they point at.
- Siblings must check for a backing record before compacting a long comment.
  Where none exists, the choice is keep-in-full or write-the-record-first -
  which may add a `NOTES.md` to a sibling that expected only to delete lines.
- `test/` and `e2e/` should come out of this epic nearly unchanged in comment
  count. A sibling reporting a large discard count there has probably
  misapplied case 4; 14 discards in `e2e/` is the measured baseline.
- The 73 compacts are concentrated in review archaeology (12) and section
  banners (27). The banners are file-boundary evidence, so they resolve as part
  of the split work in 20260731-212616 rather than as comment edits.
