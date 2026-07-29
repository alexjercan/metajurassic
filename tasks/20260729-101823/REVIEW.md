# Review: Rewrite share text with real stats and a guess-story grid

- TASK: 20260729-101823
- BRANCH: feat/share-story-grid

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

What I ran and what it produced:

- `nix develop --quiet -c npm run ci` from the worktree: exit 0. Jest 7 suites /
  177 tests passed; Playwright 28 passed, 1 skipped (the known `test.fixme`
  species-icon assertion), including both new `e2e/share.spec.ts` cases.
- DoD `cmd: rg -n "5\.2|Avg\. Guesses" src/*.ts src/ui/*.ts`: no matches. The
  DoD's narrowing of this grep (from `src`) was checked and is honest: a
  repo-wide run hits only `src/jurassic/index.json`, `src/jurassic/species/
  sauropelta.md` ("size: 5.2 meters") and a path coordinate in
  `src/assets/share.svg`. All `.ts` sources live under `src/` and `src/ui/`, so
  the scoped glob still covers every TS file.
- Mutation testing (each change applied, `npx jest` run, then reverted; working
  tree confirmed clean afterwards and back to 177 passing):
  - widened the `🟦` tier to `below: 0.6` -> `share grid > each closeness tier
    renders its own cell` failed with `⬛🟦🟦🟧🟩🦖`.
  - deleted the `HINT_CELL` loop, forced the stats line to print zeros,
    `.reverse()`d the guess order, and removed the `AbortError` short-circuit in
    `src/ui/share.ts` -> 7 tests failed across `share.test.ts` and
    `gameState.test.ts`, one per broken behaviour (hint bulb, zero placeholders,
    guess order, cancelled share, plus the tier/story cases). The new tests are
    load-bearing, not decorative.
- Re-derived the DECISION.md claim that the metric spreads over all five bins:
  a throwaway Jest file sampling 5000 random real species pairs through
  `guessCloseness` gave 43.0% / 22.2% / 11.4% / 13.3% / 10.1%. The claim holds;
  the throwaway file was deleted.
- `tatr check`: exit 0.
- Docs sweep (excluding `tasks/`): the only share-related prose is
  `AGENTS.md:67` and `README.md:26`, both about the practice label
  (`Practice Dinosaur ...`), which this diff deliberately preserves. Nothing
  stale.

Spec and honesty checks:

- Every ticked step is really done. The one step whose text was rewritten (the
  Playwright step, now built on `seedFinishedDailyGame` instead of a seeded
  practice round) states the substitution and its reason in the step itself, and
  the substituted test genuinely covers both share paths.
- The hardcoded `5.2` and the fake `🔥 <guessCount>` streak are gone;
  `game.ts:234-246` computes real `computeGameStats` values from the same
  storage the finished round was just saved to (`save()` runs inside
  `submitGuess` before the modal), so the current game is counted - the E2E's
  `Avg. 4.0` proves it end to end.
- Guess-ordering assumption is sound: `state.guesses` is a `Set` (insertion
  ordered) rebuilt from the persisted array in `loadGameState`, so the grid is
  in play order.
- Fallback chain in `src/ui/share.ts` matches DECISION.md choice 4, including
  the `cancelled` outcome that must not fall through to a clipboard write.
  `game.ts` only shows "Copied!" for `"copied"`. Note that TASK.md's Design
  section still describes the return type as `"shared" | "copied"` with a cancel
  "swallowed as a no-op"; DECISION.md (same day, ACCEPTED) supersedes it with
  the explicit `"cancelled"` outcome, and the code follows DECISION.md. No
  action needed - flagging only so the discrepancy is not read later as drift.
- The two modified tests in `test/gameState.test.ts` are legitimate adaptation,
  not weakening: `🟩` -> `🦖` and `1 guesses` -> `1 guess!` track the new
  format, and the second test got *stronger* (it now asserts total grid length
  and the terminal `🦖` rather than counting one emoji type).
- No `manual:` DoD items exist; all five proofs are automated and all pass.

- [x] R1.1 (MINOR) src/gameState.ts:327 - a loss share still prints
      `🔥 N day streak`. `calculateStreak` in `gameStats.ts` only looks at wins,
      so today's loss does not break the streak: a player who loses today, after
      winning yesterday, shares `💀 Dinosaur ... / I couldn't figure it out in
      25 guesses. / <grid> / 🔥 5 day streak`, claiming a streak that the very
      round being shared just ended. For a task whose whole point is removing
      numbers the message has not earned, gate the streak on the win: change the
      condition to `mode === "daily" && state.isWin() && stats.currentStreak > 0`
      (threading `isWin` in, or simply passing `statsLine` only from the win
      branch of `formatGameStateForSharing`), and add a Jest case that a loss
      share contains no `🔥`.
  - Response: Fixed. Re-derived the claim independently before adopting it -
    `calculateStreak` filters to `results.filter((r) => r.isWin)`, so a loss
    today leaves yesterday's run standing. `formatStatsLine` now takes `isWin`
    and gates the streak on it (`src/gameState.ts:318-336`); the lifetime
    average still prints on a loss, which is honest. New Jest case "a loss never
    claims the streak it just failed to extend" asserts no `🔥` and no
    `streak`, with `Avg. 6.0` still present.

- [x] R1.2 (NIT) src/gameState.ts:365 - with hints the headline count and the
      grid length disagree. `numberOfGuesses()` charges `HINT_COST = 3` per
      hint, so one guess plus one hint renders `I figured it out in 4 guesses!`
      above a two-cell grid `🦖💡` (this is exactly what the new test "a hint
      costs its guesses in the headline count" pins). A reader who counts cells
      gets a different number from the sentence. The user explicitly chose one
      bulb per hint, so do not change the bulb count; instead make the sentence
      unambiguous, e.g. `I figured it out in ${guessCount} ${noun} (1 hint)!`
      when `state.hintClades.size > 0`, or drop hint cost from the headline and
      let the grid carry it. Either way pin the chosen wording with a test.
  - Response: Fixed with the suggested wording. The win sentence now reads
    `I figured it out in 4 guesses (1 hint)!`, pluralized for multiple hints
    (`src/gameState.ts:361-374`). Kept the hint cost in the count rather than
    dropping it: the count is what the player actually spent. Pinned by "a hint
    costs its guesses in the headline, and is named" (1 and 2 hints) plus "a
    hintless win says nothing about hints".

## Round 2

- VERDICT: APPROVE
- REVIEWER: out-of-context

Verified against commit 8064db0 (`git show 8064db0`), not against the summary of it.

- R1.1 confirmed fixed. `formatStatsLine` now takes `isWin` and the streak is
  gated on `mode === "daily" && isWin && stats.currentStreak > 0`
  (`src/gameState.ts:331`); `formatGameStateForSharing` passes `state.isWin()`
  (`src/gameState.ts:363`). The lifetime average is untouched by the gate, so a
  loss still carries the one number it has honestly earned. The comment records
  WHY (calculateStreak counts wins only), and TASK.md's Design section was
  updated to match, so the record and the code now agree.
- R1.2 confirmed fixed. The win sentence appends `(N hint/hints)` only when
  `state.hintClades.size > 0` (`src/gameState.ts:368-370`), pluralized. The
  headline count still includes the HINT_COST charge, which is the honest number
  of guesses spent, and the sentence now explains the gap between that number
  and the cell count.
- `nix develop --quiet -c npm run ci` from the worktree: exit 0. Jest 7 suites /
  179 tests passed (177 -> 179: two net-new cases, one replacement); Playwright
  28 passed, 1 skipped (the pre-existing `test.fixme`).
- Mutation testing of the new tests (applied, `npx jest`, reverted; tree
  confirmed clean and back to 179 green afterwards):
  - dropped `isWin` from the streak condition -> "a loss never claims the streak
    it just failed to extend" failed.
  - forced `help` to `""` -> "a hint costs its guesses in the headline, and is
    named" failed.
  - forced `help` to always append ` (N hints)` -> 5 failures including "a
    hintless win says nothing about hints" and "a win counts the guesses it
    took, pluralized", so the singular/plural and the hintless case are both
    genuinely pinned.
- No existing test was weakened to accommodate the change. The replaced case ("a
  hint costs its guesses in the headline count" -> "... in the headline, and is
  named") is strictly stronger: it keeps the 4-guess assertion and adds a
  two-hint case.
- Nothing the change invalidates elsewhere: `rg "figured it out|day streak"`
  outside `tasks/` hits only `src/gameState.ts`, `test/share.test.ts` and
  `e2e/share.spec.ts:90`, whose fixture game has no hints, so its
  `in 4 guesses!` assertion is still correct (and it passed in the gate).
- No new findings. The round-2 changes introduce no new behaviour beyond the two
  fixes and are covered by tests that fail when reverted.
