# Review: Add post-game stats card and next-puzzle countdown

- TASK: 20260729-101838
- BRANCH: feat/postgame-stats-countdown

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) src/gameStats.ts:154 - `formatAverageGuesses` returns `"0"`
  when nothing has been won, so a player losing their first daily reads
  `Avg 0` in the new card - a number that looks like an average of zero
  guesses rather than "no average yet". The profile page has always read this
  way and now shares the same formatter, so changing it is one edit in one
  place: return `"-"` for `wins === 0`, and update the two assertions that pin
  `"0"` (`e2e/postgame.spec.ts:267` and the practice/daily cases in
  `test/gameStats.test.ts`). Take it or leave it; the shared-formatter shape
  this round introduced is what makes it cheap either way.

### What was verified

Re-derived in the worktree rather than read off the close-out.

- `npm run ci` run in full: exit 0, 357 Jest tests in 26 suites, 149 Playwright
  tests. Both counts match the close-out's Evidence section exactly.
- All six Definition-of-Done proofs run individually and green, each `-g`
  filter checked for a non-vacuous match: `postgame -g "stats card|countdown"`
  selects 4 tests, `practice -g "lightweight"` selects 1,
  `mobile -g "game-over modal"` selects 17, and the two Jest proofs 17 cases.
- The countdown's DST claim re-derived by independent mutation: rewriting
  `msUntilNextPuzzle` as `startOfDay + 86400000` reddens both DST cases and the
  365-day sweep, naming `Mar 29 -> Mar 30 01:00` and `Oct 25 -> Oct 25 23:00`.
  The tests read at 01:30, BEFORE each transition, which is what makes them
  able to fail at all.
- The hint-split arithmetic is sound at its boundary: `canAffordHint` requires
  `guessesLeft() >= HINT_COST` (`src/gameState.ts:133`), so a hint can only be
  bought at or below 22 spent and `numberOfGuesses()` can never exceed
  `MAX_GUESSES`. `lossSummary`'s "You used all 25" and its guesses-plus-hints
  split therefore always sum to the same 25; the copy cannot contradict itself.
- The countdown has exactly one stop path to cover: the overlay's `active`
  class is removed at `src/ui/modal.ts:93` and nowhere else in `src/`, and both
  close routes (overlay click, `#modal-close-btn`) go through `hideModal`. The
  hint chip's re-open (`src/game/hintChip.ts:79`) re-enters `renderExtras`,
  which calls `stopCountdown` before starting a new tick.
- The shared-template divergence guard holds: `grep -rn` for `modal-extras` and
  `modal-countdown` across `src` and `e2e` reaches only `src/index.html`,
  `src/partials/modal.css`, `src/ui/modal.ts` and the specs; nothing but the
  `daily` branch unhides them. The practice test asserts `toBeAttached` before
  `toBeHidden`, so it cannot pass against a template that lost the card.
- `src/profile/statsPanel.ts` after the extraction is behaviourally identical
  to the inlined arithmetic it replaced, for daily and practice alike.
- Doc sweep: the only mention of the modals outside `tasks/` is README.md:47,
  which is generic and still accurate. `tatr check` is clean.

### Notes

- The close-out's Reflection is honest about the plan contradicting itself -
  step 6 asked for one row at 320px by wrapping, which four cells cannot do -
  and resolves it with two pinned numbers rather than prose.
  `expectStatCardFits` states its own reach (it catches an unshrinkable cell,
  not a merely wide one) rather than implying more coverage than it has.
- The two extractions beyond the plan (`formatWinRate`/`formatAverageGuesses`
  into `src/gameStats.ts`, the two geometry helpers into `e2e/helpers/modal.ts`)
  each remove a duplicate definition or cover a row nothing measured. Neither
  is scope the Story did not ask for.
- No `manual:` proofs are open, so there are no pending user checks.
