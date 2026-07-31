# Review: KISS pass: core game loop (game.ts, gameState.ts, share text)

- TASK: 20260731-212610
- BRANCH: refactor/kiss-core-game-loop

## Round 1

- REVIEWER: in-session (exception, see below)
- VERDICT: REQUEST_CHANGES

The skill's default is an out-of-context reviewer for a substantive diff. This
session's operating instructions forbid spawning subagents, so round 1 was run
in session. To offset the shared-context risk, every load-bearing claim in the
records was re-derived from the repository rather than accepted: the two
"is there a record behind this comment" checks, the behaviour-preservation
argument, and both gate results. One of those re-derivations produced R1.2.

### Verification performed

- **Behaviour preservation, mechanically.** Stripped comments and blank lines
  from `master:src/game.ts` and from the concatenation of `src/game/*.ts`,
  normalised indentation, sorted, and diffed. The only differences are import
  lines, the new parameter declarations, and the four call sites
  (`syncOnboardingBrief(state, arena, arenaWrapper)`,
  `updateHintButton(state, hintBox)`, `wireHintPurchase(...)`,
  `wireShareButton(...)`). No statement changed. Same method over
  `master:src/gameState.ts` against `gameState.ts + puzzleKey.ts +
  shareText.ts`: the only differences are imports plus the two visibility
  changes `DECISION.md` declares (`formatPuzzleId` exported,
  `CLOSENESS_CELLS` from `export {}` to `export const`).
- **Listener registration order**, which the arguments flagged: master
  registered autocomplete, `#open-panel`, `#hint-box`, `input`, `keydown`,
  `#modal-share-btn`, then called `updateUI()`. `src/game/index.ts:161-200`
  keeps exactly that order with `wireHintPurchase` and `wireShareButton` in
  the third and sixth positions.
- **Null guards.** `if (hintBox) { addEventListener }` became
  `if (!hintBox) return;` inside `wireHintPurchase` - equivalent, and it
  matches the guard `updateHintButton` already had. `arena`/`arenaWrapper`
  stay nullable and keep their combined guard inside `syncOnboardingBrief`.
  `shareButton.ts` keeps master's `button?.addEventListener` on a
  non-nullable-typed parameter; that mismatch is master's (the `as
  HTMLButtonElement` cast), faithfully carried, not introduced here.
- **The `finally`-ordering rule** at `src/game/index.ts:106-121` is byte-identical
  to master's, comment included, and stayed in `index.ts` with `updateUI` -
  which is the reason `DECISION.md` gives for not extracting `submitGuess`.
- **Hint auto-open branches** at `src/game/hintChip.ts:73-75`:
  `!state.lastGuessId || isNarrowViewport()` is unchanged.
- **Gate, re-run independently**: `npm run ci` exit 0, `npm run build` exit 0
  inside `nix develop`. 21 suites / 323 Jest tests, 126 Playwright tests.
- **`e2e/` is untouched**: `git diff --stat master...HEAD -- e2e` is empty.
  `test/` is 7 files, +15/-11; filtering import lines and bare symbol names out
  of the diff leaves nothing, so no assertion moved.
- **Task references**: all 8 in the cluster are one-line record pointers, each
  attached to a stated constraint. No bare pointers, no archaeology.
- **`gameState.ts` re-exports nothing** it shed: the audit grep returns only
  its own `import` line and four internal call sites.

- [x] R1.1 (MAJOR) AGENTS.md:21 - The repository map still reads "Core:
      `game.ts`, `gameState.ts`, `gameData.ts`, `treeBuilder.ts`", but this
      branch deletes `src/game.ts`. `AGENTS.md` is the file the repo tells
      every agent to start from, so it now points a cold reader at a path that
      does not exist. Change the entry to `game/` (and consider naming
      `shareText.ts`/`puzzleKey.ts` if the row is meant to list the core
      modules). The task's own rules require updating invalidated docs.

- [x] R1.2 (MAJOR) tasks/20260731-212610/NOTES.md - The
      "brief-mount essay was KEPT IN FULL" paragraph justifies itself with
      "neither `tasks/20260729-141414/DECISION.md` nor
      `tasks/20260729-092327/DECISION.md` records the flex-sibling layout
      reason or the 1440x660 / 1280x720 measurements", and concludes "with none
      behind it the comment is its only copy". That conclusion is false.
      `tasks/20260729-092327/TASK.md:110-117` records exactly this rationale -
      the flex-sibling mount, `overflow: auto`, the competing heights, 1440x660,
      1366x600, 1280x720 and the 30px overflow. The search covered only
      `DECISION.md` files and so missed it.
      The CODE outcome is still defensible: `AGENTS.md` `## Comments` says
      "compact only towards an existing record" and names `DECISION.md`,
      `SPIKE.md` or `NOTES.md` - a TASK.md close-out is not on that list, and
      the comment is load-bearing either way. But `NOTES.md` is written as
      precedent for eight sibling tasks, and as written it teaches a
      record-search that misses records. Correct the paragraph to say what is
      true: the rationale IS recorded, in a TASK.md close-out, which is not one
      of the record kinds the policy accepts as a compaction target - so the
      comment stays in full for that reason. Sibling tasks should search
      `tasks/` whole, not `DECISION.md` alone.

### Checked and NOT findings

- The compaction of the hint-purchase essay (17 lines to 7) is properly backed:
  `tasks/20260729-092315/DECISION.md:49-54` holds the before-first-guess
  branch and `tasks/20260729-141414/DECISION.md:64` the narrow-viewport one.
  Verified by reading both, not by trusting the pointers.
- Both `src/constants.ts` compactions are properly backed:
  `tasks/20260729-141424/DECISION.md:27-35` holds the 83% -> 50% / 34% / 14%
  rescue table and `:56-61` the second-hint collapse and the
  knob-not-redesign reasoning.
- `src/game/index.ts` at 219 lines is the largest file in the cluster, and that
  is fine. It does one job - wiring a round - and `## File size` says a file
  does not split for length alone.
- The +17 net line total is correctly reported and correctly explained in
  `NOTES.md` rather than hidden.
- `NOTES.md` volunteers that the plan's importer grep was too narrow and that
  Jest caught the miss. That is the honest version and needs no change.

### Pending manual items

None from this task. The epic's `## Manual Acceptance` ("read a sample of each
cluster's post-pass files and confirm they read better, not merely shorter")
covers this cluster and is batched to the user at epic close.

### Responses (round 1)

- R1.1: fixed. `AGENTS.md:21` now reads `game/` and additionally names
  `puzzleKey.ts` and `shareText.ts`, since the row lists the core modules and
  two of them are new.
- R1.2: fixed. The `NOTES.md` paragraph now states that
  `tasks/20260729-092327/TASK.md:110-117` DOES record the rationale, and that
  the comment stays in full because a TASK.md close-out is not one of the
  record kinds `AGENTS.md` `## Comments` accepts as a compaction target - not
  because no record exists. Added an explicit instruction for siblings to
  search `tasks/` whole rather than the `DECISION.md` files a comment happens
  to name.

## Round 2

- REVIEWER: in-session (same exception as round 1)
- VERDICT: APPROVE

- R1.1 confirmed fixed. `AGENTS.md:21` now reads `game/` and names
  `puzzleKey.ts` and `shareText.ts`. Cross-checked against the tree: the four
  files under `src/game/` exist and `src/game.ts` does not, so the map matches
  the repository.
- R1.2 confirmed fixed. `NOTES.md` now states the rationale is recorded at
  `tasks/20260729-092327/TASK.md:110-117` and gives the correct reason the
  comment stays in full - the record kind, not the record's absence. The added
  "search `tasks/` whole" paragraph is the generalisation siblings need.

The round-2 commit changes `AGENTS.md` and two task records only - no source
file - so round 1's behaviour verification stands unrepeated. `npm run ci`
re-run after the fixes: exit 0.

No new findings. No open BLOCKER or MAJOR.
