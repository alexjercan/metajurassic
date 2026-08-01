# Retro: Decide and, if safe, split src/style.css by surface

- TASK: 20260731-212617
- BRANCH: refactor/split-style-css
- REVIEW ROUNDS: 2

## What went well

- Deciding before splitting. Spike `20260801-113802` settled the proof
  criterion (whitespace-normalised identity, not byte identity) and named the
  mechanism, so the split itself never had to argue about what "unchanged"
  meant. The riskiest child in the epic ran as a mechanical move.
- Cutting with a script, not by hand. `split.js` validated brace balance per
  partial and proved reassembly equals the original before writing anything.
  Its one failure was in the CHECK (a three-blank-line run collapsed on one
  side only), not the split - which is the right place for a false alarm.
- The review's re-derivation was compiler-independent. Reading the partials
  back in import order reproduces master's file byte-identically per line.
  That is stronger than the compiled proof and does not inherit Tailwind's
  behaviour, so the two together leave no room for a cascade change.
- Diagnosing the 21/22 screenshot DIFF instead of trusting or dismissing it. A
  split-vs-split control run also differed on 21/22, which identified the
  shots as non-deterministic (confetti, rotating `--card-glow-angle`) rather
  than the change as broken. Byte-comparing screenshots was then correctly
  abandoned for comparison by eye.

## What went wrong

- Three comments across `src/ui/panel.ts`, `src/closeness.ts` and
  `src/index.html` still named `src/style.css` as the holder of rules that had
  moved into partials. One of them (`NARROW_VIEWPORT_QUERY`) is a drift guard
  whose whole job is to keep a TypeScript constant and a media query in step;
  after the split, following it landed on an 18-line file with no media query
  in it. Review round 1 returned REQUEST_CHANGES on it.

  Why the plan looked complete: its Steps were written around the risk everyone
  expected - cascade order - and every one of them is about proving the
  RENDERING unchanged. The doc sweep that did run grepped the paths that gained
  code (`src/partials/`) and `AGENTS.md`, both of which were updated. Nothing
  grepped `style.css` itself, because the file still exists. The pointers broke
  anyway: a comment names a file for its CONTENTS, and the contents left.

- Nothing in `src/style.css` recorded that the import order is the cascade. The
  plan and `AGENTS.md` both say "in cascade order"; the file a maintainer would
  actually edit said nothing, and alphabetising 14 imports is a plausible tidy
  that silently changes rendering. Caught in review as MINOR.

## What to improve next time

- Breadth: 22 files, +2614/-2412, and that is the change working as intended -
  2400 lines moved verbatim into 14 partials. No independently landable piece
  was missed; the only non-mechanical edits are one test and four comments.
  Nothing to split.
- Churn: both findings are the same plan-time gap, and the from-scratch
  challenge would not have caught either - the design was right. The missing
  question is narrower: "which comments name this file, and are they naming the
  path or the contents?". A grep for the moved file's own name, run at plan
  time, produces the whole fix list in one shot.
- Context: one compaction during the review round; no delegation was available
  (subagent dispatch disabled for this session), which is why both review
  rounds were run by the primary and the exception is recorded in `REVIEW.md`.
  The compensation - re-deriving the load-bearing claim by a method the
  implementation had not used - is what to repeat when the out-of-context
  reviewer is unavailable, not a shorter review.

## Action items

- None requiring a new task. The two findings were comment-only and are fixed
  on this branch; the recurring shape is bumped in `LESSONS.md` to x3 and moved
  to Pending promotions for the user gate in `lessons`.
