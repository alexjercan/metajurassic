# Retro: Name the closeness colour in the how-to-play copy

- TASK: 20260730-094916
- BRANCH: docs/name-closeness-colour
- REVIEW ROUNDS: 1

## What went well

- The plan pinned the copy to source, not to memory: Step 4 named
  `CLOSENESS_CELLS`, `.node-close-0..4` and `TIER_UPPER_BOUNDS` and forbade
  stating a tier count or boundary. Both the worker and two reviewers could
  then check "cold to hot, brightest green closest" against the ramp itself.
  The result is copy that cannot be wrong without a test going red elsewhere.
- Zero review rework. Round 1 returned two NITs and no BLOCKER or MAJOR, and
  the diff is 9 source lines across the two surfaces the Story named -
  `briefCopy()` untouched, no test weakened, no new scaffolding.
- Notes decided up front that no test would be added for one clause, and gave
  the reason (no test asserts these strings; the clipping E2E guards a
  different element). Review did not relitigate it.

## What went wrong

- The first FAQ draft said "shaded on a cold-to-hot scale" and never used the
  word "colour", so DoD proof 1 stayed red on `src/faq.html`. The decision
  seemed sound at the time because the sentence delivered the Story's meaning
  exactly; the proof pinned a word, and meaning-equivalent prose does not
  satisfy a grep. Running the proof rather than reading the diff caught it.
- A fresh sprout worktree has no `node_modules`, so the first
  `nix develop -c npm run ci` died at `format:check` with
  `prettier: command not found`. Read as a tooling gap, not a code fault, and
  fixed with `npm install` - but it cost a cycle.
- During the review round the out-of-context reviewer and the recording pass
  ran `npm run ci` concurrently in the same worktree. The suites collided on
  the dev-server port and the recording pass saw 30 spurious mobile failures.
  A clean re-run after the reviewer finished was exit 0, 165 passed, matching
  the reviewer's independent result. No code was at fault; the near-miss was
  reading a contended run as a real regression.

## What to improve next time

- Breadth: nothing to split. The diff is one clause and one sentence, exactly
  the two surfaces the filed finding named. The plan encoded the right size.
- Churn: none to attribute. One round, no BLOCKER or MAJOR. Both NITs propose
  wording the plan's own Steps rule out - Step 2 names the card clause
  verbatim, Step 3 asks for ONE FAQ sentence - so they are style preferences
  against a decided spec, not plan defects.
- Context: the only observed pressure was the delegation itself. When a review
  round delegates, the out-of-context reviewer runs the check suite as part of
  its brief; the recording pass should run its own suite after that agent
  reports, not alongside it, or the two runs contend and the recorder
  misreads the collision as a finding.

## Action items

- None for this repository. The two reusable lessons - proof-word versus
  proof-meaning, and serialising check-suite runs across concurrent agents -
  are submitted to the central knowledge repository rather than restated here.

## Landing message

```
docs: name the closeness colour in the how-to-play copy

The how-to-play card and the FAQ both explained the tree's placement and
stayed silent about the colour the board now carries. Add one clause to the
"Reading the tree" card fact and one sentence to "What does the tree show?",
each naming the cold-to-hot ramp with the brightest green closest, and tie the
FAQ's wording back to the squares in the shared grid.

Both surfaces stay clear of the tier count, the boundaries and the hex values;
TIER_UPPER_BOUNDS remains the only place the scale is written down.
```
