# Retro: Rewrite share text with real stats and a guess-story grid

- TASK: 20260729-101823
- BRANCH: feat/share-story-grid
- REVIEW ROUNDS: 2

## What went well

- Measuring the metric BEFORE committing to a grid design. Before asking the
  user to choose between three grid shapes, the closeness metric was sampled
  over 5000 random real species pairs from `src/jurassic/index.json`: it lands
  in every one of five bins (0.1 -> 41%, tail to 1.0). The 5-tier option was
  therefore offered as a measured fact rather than a guess, and the same
  sampling later gave the tier test its real-taxonomy ladder (Stegosaurus ->
  Brachiosaurus -> Allosaurus -> Guanlong -> Albertosaurus). Choosing 5 tiers
  on intuition could just as easily have shipped a grid that renders three
  black squares for most real games.
- Presenting the forks as the mutually exclusive choices they were. The plan
  gate named the concrete artifact (grid encoding, stats source, hint cell,
  share API) rather than confirming "make the share better", and surfaced the
  two places where the user's own answers could not all hold at once (a
  first-ever share has no streak or average to print; the buy-order of a hint
  is not recoverable from the saved state). Both went back to the user in the
  gate instead of being silently resolved in code.
- Mutation-checking the new tests instead of trusting a green run. The tests
  were written first but only RUN after the implementation, so "21 passed" was
  not evidence they bite. Temporarily widening a tier boundary and forcing the
  zero-stats branch to print made exactly the two expected tests fail. The
  out-of-context reviewer then repeated this independently across five more
  mutations.
- Splitting `buildGameData` out of `jsonLoader` so the test could build the
  shipped graph from `src/jurassic/index.json` through the SAME mapping the app
  uses. The obvious alternative - copying the raw-to-GameData mapping into the
  test file - is exactly the mirror-rot the ledger already warns about.

## What went wrong

- R1.1 (a loss share still printed `🔥 N day streak`). Root cause: the stats
  work was framed as "stop fabricating numbers", so every check went into
  whether a number was REAL. `currentStreak` on a loss is real - it is just no
  longer the shared round's to claim. The honesty question that mattered was
  not "is this number true?" but "did THIS round earn the right to show it?",
  and the win and loss branches were never diffed against each other with that
  question in hand.
- R1.2 (headline count and grid length disagreed with hints). Root cause: the
  hint cell and the headline sentence were designed in separate steps, and the
  test written for the headline (`in 4 guesses!`) pinned the discrepancy rather
  than exposing it. A test asserting one half of a message cannot see that the
  other half contradicts it.
- The task's own DoD carried an imprecise proof: `rg -n "5\.2" src` also matches
  a real 5.2-metre Sauropelta and a coordinate in `share.svg`, so it could never
  have gone clean. Caught while running the proof, and narrowed to the TS
  sources with the reason recorded. An absence-proving grep written at plan time
  was never executed against the repo it would have to pass in.

## What to improve next time

- When a change spans several message/UI branches (win, loss, practice,
  first-run), render one example of EACH and read them side by side before
  review. Both review findings are visible on sight in a rendered pair; neither
  is visible from the diff. The preview run done here covered win and loss but
  used a zero-stats loss, which is precisely the case that hides R1.1.
- For a task about honesty, ask of every displayed value "did this round earn
  it?", not just "is it real?". Real-but-unearned is its own failure mode.
- Write an absence-proving DoD grep by RUNNING it when the DoD is written. A
  proof that cannot go green is not a proof.

## Action items

- [x] Ledger: `real-but-unearned-is-its-own-fabrication` (new).
- [x] Ledger: `render-every-branch-of-a-message-side-by-side` (new).
- [x] Ledger: bump `absence-proving-greps-must-be-run-when-written` (new here).
- [ ] Follow-up if wanted (not filed as a task; the user decides): in-line hint
      placement in the grid needs an ordered event log in the persisted game
      state plus a migration for existing saves. Recorded in DECISION.md #3.
