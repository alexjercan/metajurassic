# Review: structured playtest pass

- TASK: 20260729-092435
- BRANCH: research/playtest-pass

## Round 1 (2026-07-29)

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

Reviewer independently re-ran both instruments (the simulation and the browser
walkthrough) rather than reading them, and re-derived every quoted number. All
numbers in NOTES.md reproduced exactly; the player model, round termination, and
the `cost` definition were all checked and found sound. No house-rule violations.

### Findings

**MAJOR - the enumeration of clade-membership surfaces was presented as
exhaustive and was not.** F1.2 named the tree, the clade card and `/clades`, but
omitted `src/species.ts`, which lists all 150 species with a `Clade:` line and is
linked from the FAQ. The conclusion survived, but the absolute "no surface in the
game maps a clade to its member species" - repeated in the commit message, the
Outcome block and task `20260729-141425` - overstated it.

**MAJOR - "It is never correct to buy one" was labelled MEASURED, but the
instrument only measured hints bought BEFORE any guess.** A stuck player is
stuck mid-round, and `findNextHintCladeId` reveals one level below the deepest
currently revealed clade, so a mid-round hint is strictly more specific than the
up-front hint the simulation priced. The categorical claim was broader than the
evidence - exactly the mislabelling `DECISION.md` exists to prevent.

**MINOR** - F5.1 was labelled MEASURED though its numbers come from a grep, not
from the simulation, contradicting the pass's own definition of the label.

**MINOR** - F3.10's reproduction ("on `/practice/?seed=5`") was not re-runnable
from the committed instrument: seed 5 was not in `SEEDS` and no scenario played
the case.

**MINOR** - F1.1's cost quantiles are computed over WON rounds only, which was
not stated; for `blind` that materially changes what "median 13" means. "20
trials each" was also wrong for `optimal` (deterministic, n=150).

**MINOR** - `difficulty.ts` `optimal` carried a comment describing a tie-break
that does not exist.

**MINOR** - two of five `SEEDS` in `walkthrough.ts` were never played, and the
comment claimed a famous/obscure span the three played seeds did not achieve.

**NITs** - stale `PROBE` comment; dead `fill("a")` in `loadNames`; "the least
specific clade" should be "second-least-specific" (the root is already on
screen); F3.9's geometry was loosely described.

**DoD gap** - F3.9 (mobile dead space) was actionable but had neither a
follow-up task nor an interim note. The only finding that fell through.

Reviewer confirmed all seven follow-up tasks are supported, correctly scoped and
free of invented claims, and that all nine DoD items check out.


## Round 1 response (commit 2ec48a4)

Both MAJORs were treated as real and fixed by getting more evidence rather than
by softening prose:

- **Hint claim**: added a mid-round hint policy (`hintAfterGuess`) and a new
  report section to `difficulty.ts`, then re-measured. One hint bought after n
  guesses still nets +2.5 to +2.9 guesses against the 3 it costs for a deducing
  player; for a weak `tree-reader` buying late it is close to break-even (+0.7)
  and lowers the loss rate 5.8% -> 4.6%. F2.2 now states that instead of "never
  correct to buy one", and tasks `20260729-141424`'s Steps and DoD were widened
  to require the mid-round case to improve too.
- **`/species`**: F1.2, the headline paragraph, the Outcome block and task
  `20260729-141425` now name the exception and why it is weak (FAQ-only link,
  150-card carousel, immediate clades only, so it cannot answer the internal
  clades the tree actually shows).

All MINORs and NITs applied. F3.10's repro is now a committed walkthrough
scenario (`autocompleteEndurance`) printing 83 matches / EMPTY / 75 remaining.
F3.9 folded into task `20260729-141414` as both a finding and a step.

`npm run ci` green: 179 Jest, 28 Playwright, exit 0.

## Round 2 (2026-07-29), commit 2ec48a4

- VERDICT: APPROVE
- REVIEWER: out-of-context (same reviewer, context retained)

Reviewer re-ran both instruments and the full gate rather than reading the diff.

- **MAJOR 1 addressed, and the new instrument verified sound.** The reviewer
  checked that the mid-round purchase fires exactly once (`guesses.size` is
  monotone), that `findNextHintCladeId` genuinely recomputes the revealed
  frontier from the guesses made so far (which is the whole difference from the
  up-front case), and that the `read-tree` narrowing preserves hint knowledge
  rather than widening back. No bug found. Every number in the new table
  reproduced row for row, and the "net cost per hint actually bought" division
  was re-derived (2.89 / 2.80 / 2.50 / 2.50), including the observation that the
  division is valid because `consistent` loses 0.0% at every row.
- **MAJOR 2 addressed without overcorrecting.** Each clause of the new
  `/species` bullet was independently checked: FAQ-only link, all 150
  alphabetical, immediate clade only.
- All MINORs and NITs verified fixed; the DoD gap (F3.9) is closed.
- `npm run ci` EXIT=0 (179 Jest, 28 Playwright + 1 skipped fixme).

Four new NITs, none blocking, all applied in the follow-up commit:

1. `20260729-141424` still carried "least specific clade in the game"; now
   mirrors the NOTES wording.
2. F1.2's heading said "unlinked" while its own body said "linked from the FAQ";
   now "FAQ-buried".
3. The tree-reader "+0.7 net" compares win-only means across rows with different
   loss rates, so newly rescued rounds inflate it. NOTES.md now says the figure
   is an upper bound and that the bias runs against the hint.
4. `boughtIn` was glossed as "rounds that lasted long enough"; it counts
   `hints > 0`, which also excludes shallow lineages with nothing left to
   reveal. Gloss corrected.

Plus one the reviewer raised about instrument fragility: `autocompleteEndurance`
would silently report the wrong thing if a content change ever made seed 5's
target one of the eight species it guesses. It now counts landed guesses and
prints an explicit `INVALID RUN` line instead. Verified: 8/8 land today, no
warning printed.

