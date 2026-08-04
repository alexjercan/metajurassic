# Retro: Ship the v1.0.0 release: CHANGELOG, quickstart README, refreshed FAQ

- TASK: 20260804-151357
- BRANCH: docs/v1-release
- REVIEW ROUNDS: 2

## What went well

The number-bearing-fragment route from `tasks/20260729-212757/DECISION.md`
carried a second time without argument: `hintCostAnswer()` plus an empty span
plus the `src/faq.ts` guard took one step, and `test/markupConstants.test.ts`
was already the reason nobody was tempted to type the price into the template.
An established route is cheaper than the decision that produced it.

Splitting the two load-bearing forks into `DECISION.md` before writing the
changelog meant round 1 argued about a sentence, not about the shape of the
release.

## What went wrong

Breadth: the diff is a changelog, a README rewrite, and six FAQ answers, which
reads as three tasks. It stayed one because all three answer the same question
- what did we ship - from the same reading of `src/`, and splitting them would
have made that reading three times. The size is inherent, not a missed split.

Churn: one MAJOR across two rounds, R1.1, and the plan seeded it. Step 4 wrote
the hint answer's player-facing prose verbatim - "the shallowest clade in the
answer's lineage that is not on the tree yet" - from memory of the rule rather
than from `src/hintRule.ts:6-25`, and implementation copied the step through.
That seemed sound at plan time because the sentence was short, sounded right,
and the plan was otherwise citing files precisely; a one-line description of a
rule does not look like something that needs a citation. The same change's
CHANGELOG bullet, written from the source, had it right in the same session.
Nothing in CI could catch it: the guards only exist where a constant is
involved.

The two record defects, R1.2 and R2.1, are the same failure in a different
place - close-out numbers ("seven new blocks", "65 lines") transcribed from a
diff stat or from recollection instead of re-run. Both were caught by review,
which is the expensive place to catch a number.

R2.2 is the accepted cost arriving early: the round-summary answer omits hint
rows, and it omits them because prose without an assertion has nothing holding
it to the code. It was written eleven lines below the new hints answer and
still missed that hints appear on the ladder.

Context: no pressure observed. One out-of-context reviewer per round, no
checkpoint, no compaction warning.

## What to improve next time

A plan step that specifies player-facing prose describing a rule must cite the
file and lines the rule lives in, and the prose must be quoted from that source
or marked as needing derivation at implementation time. Prose is a claim about
behavior; it earns a citation the same way a number does.

A close-out number gets the command that produced it re-run at write time, not
recalled. `git diff --stat`'s churn count is not a file length.

A post-merge action belongs in the Definition of Done as a landing check and
nowhere else. This plan wrote `git tag v1.0.0` as both a Step and a DoD landing
proof, and the Step blocked `tatr flow` out of COMPOUNDING: the record cannot
close while a Step is unticked, and the Step cannot be ticked until after the
record closes and the branch lands. The duplicate Step was removed at compound
time; the DoD proof, which is the artifact landing actually reads, is unchanged.

## Action items

- [ ] `tasks/20260804-155041` - pluralize `HINT_COST`/`MAX_GUESSES` prose off
      the constant across `src/faqCopy.ts` and `src/ui/onboarding.ts`. Its
      Context needs the `MAX_GUESSES` sites added and its `HINT_COST` value
      corrected to 3 (R2.3).
- [ ] Open findings carried past APPROVE, all MINOR or NIT: R2.1 (close-out
      says 65 README lines, was 59), R2.2 (FAQ round-summary answer omits hint
      rows), R2.4 (repeated "field" in the hint answer). R2.2 is the one worth
      a task if the FAQ is touched again.

## Landing message

```
docs: ship the v1.0.0 release

Add CHANGELOG.md with an Added-only, dated 1.0.0 section written from src/
and the task records, and an empty Unreleased heading above it. Cut README.md
from a mixed quickstart/seed-mode/Playwright document to a 30-line quickstart
that links to the material already in AGENTS.md.

Extend the FAQ from the daily game to the game that shipped: hints, the round
summary, practice and ?seed=, sharing, the profile page, and the archives, with
a daily-reset answer that states local midnight and the countdown. The hint
price routes through a new hintCostAnswer() in src/faqCopy.ts and an empty span
mounted by src/faq.ts, so no constant is typed into the template. Fix
pyproject.toml's placeholder description; the Python pipeline stays at 0.1.0.
```
