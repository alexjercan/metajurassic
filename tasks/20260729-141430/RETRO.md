# Retro: Normalize typographic punctuation in Jurassic content

- TASK: 20260729-141430
- BRANCH: chore/normalize-typographic-punctuation
- REVIEW ROUNDS: 1

## What went well

The plan measured before it prescribed, and the measurements held. All 97 en
dashes really did sit between two digits in `period:`, and all 37 em dashes
really were unspaced `word-word`, so both substitutions were a single
mechanical pass with no exceptions across 113 content files.

DECISION.md answered the only real design question - where enforcement lives -
before any content was touched, and it named what it was NOT doing. The
deferred `src/ui/card.ts:98-105` placeholders are a recorded gap rather than an
undiscovered one, which is why the review found nothing to argue about there.

Choosing a punctuation SET over "ban non-ASCII" meant the three legitimate
letters (`Ha\u021Beg` x2, `Rub\u00E9n` x1) survive by construction. No
exception list to maintain, and the reviewer's independent sweep confirmed
exactly those three remain.

Review round 1 returned APPROVE with three MINORs and zero rework.

## What went wrong

Step 3 named 4 files with paired parentheticals; the real count is 9. The
implementation caught it and re-read all nine, so nothing shipped wrong, but
the plan asserted a count it had not actually enumerated - the one measurement
in the plan that was not measured.

The guard's own matcher is never exercised by anything that runs in CI
(REVIEW.md R1.1). `TYPOGRAPHIC` is only ever asked to find nothing in data
that already conforms, so a constant that matched nothing at all would pass
silently. DECISION.md item 4 chose a hand-run mutation as the guard's proof
and, having chosen it, stopped asking. That decision seemed sound at the time
for a good reason: the repo has twice recorded that a hand-run grep is not a
guard, so the mutation felt like the rigorous answer. It is - for the payload.
It is not a proof of the matcher.

The `\uXXXX` escapes in the new constant were normalized into the literal
characters they encode by the editing tool, which would have made the test file
violate the rule it enforces. Caught by a non-ASCII grep over the file and
rewritten through a Python substitution. The same thing then happened again to
this task's REVIEW.md while it was being written, which is what makes it a
pattern rather than an incident.

## What to improve next time

Breadth: 116 files is inherent to a content sweep, not a missed split. The one
independently landable piece - widening the ban past `src/jurassic/` - was
identified at decision time and deferred on purpose.

Churn: none to attribute. The plan-time question that would have closed R1.1 is
narrower than the from-scratch challenge: when a plan names a matcher constant,
ask what proves the matcher matches, separately from what proves the data
conforms.

Context: one observed pressure point, the escape normalization above. No
compaction, no handoff, no checkpoint. Nothing to split or defer.

## Action items

- Fold R1.1, R1.2 and R1.3 into one follow-up: a positive/negative case for
  `TYPOGRAPHIC`, a `collectOffenders(pattern)` helper shared with the `HTMLISH`
  case, and the `AGENTS.md:83` line that enumerates what `dataIntegrity`
  guards. All three are MINOR and all three touch the same two files.
- Widening the punctuation ban to `src/ui/card.ts` remains deferred per
  DECISION.md, not forgotten.

## Landing message

```
chore: normalize typographic punctuation in Jurassic content

Replace the 97 en dashes and 37 em dashes in the authored markdown under
src/jurassic/ with ASCII `-` and ` -- `, and regenerate index.json from the
source. The three non-ASCII letters that are correct spellings survive.

Add a TYPOGRAPHIC guard to test/dataIntegrity.test.ts over the parsed
payload, beside the HTMLISH case it mirrors, so the AGENTS.md convention has
a failing test behind it rather than only a convention.
```
