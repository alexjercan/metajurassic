# Post-game journey map (2026-07-30)

Traced from the shipped code, not from memory. Every leg names the function that
owns it, so a later change to the modal (`20260729-101838`) can be checked
against a written baseline rather than a re-read.

## Win flow

| Leg | Code path |
|-----|-----------|
| Correct name entered | `setupAutocomplete` `onSelect`, or the `keydown` Enter handler (`src/game.ts:329`) - both call `submitGuess` |
| Guess recorded | `submitGuess` -> `state.makeGuess(guess)` -> `save()` (`src/game.ts:109`) |
| Board redrawn | `finally { updateUI() }` - runs for accepted AND rejected guesses |
| Input closed off | `updateUI` -> `disableInput()`: `playerInput.disabled = true`, placeholder emptied, `#autocomplete-box` display none (`src/game.ts:87`) |
| Answer revealed | `buildGuessTree(state, state.isGameOver())` - the `revealTarget` flag opens the target's lineage (`src/treeBuilder.ts:191`) |
| Hint chip becomes retention | `updateHintButton` game-over branch: `.disabled` removed, `.practice` added, `#hint-text` replaced by an `<a href="<base>practice">Practice</a>` (`src/game.ts:145`) |
| Onboarding brief withdrawn | `syncOnboardingBrief` - `wanted` is false once the game is over |
| Modal raised | `submitGuess` -> `showGameOverModal()` -> `showWinModal(name, count)` (`src/ui/modal.ts:37`): 🏆, "You found it!", `.modal-title-win`, "Solved in N / 25 guesses", confetti |
| ACTION: OK | `#modal-close-btn` -> `hideModal()` drops `.active` (`src/ui/modal.ts:27`). Backdrop click does the same |
| ACTION: Practice | `.modal-btn-practice`, a plain `<a>` to `<base>practice` in `src/index.html:112`. The practice page REBINDS it to New game (`e2e/practice.spec.ts` owns that side) |
| ACTION: Share | `#modal-share-btn` -> `computeGameStats(...)` over real storage -> `formatGameStateForSharing` -> `shareResult` (`src/game.ts:338`). Native sheet if `navigator.share`, else clipboard + a 2s "Copied!" |
| Profile progress | `/profile/` re-reads the same `gameState-*` keys through `computeGameStats`, painting `#games-played-daily`, `#total-wins-daily`, `#current-streak-daily`, `#avg-guesses-daily` (`src/profile.ts:68`) |
| Next attempt | Daily: nothing until the clock rolls (no countdown today - that is `20260729-101838`). Practice: `#new-game-btn` / the modal's Practice link |

## Loss flow

Identical to the win flow from `updateUI` onward, with these differences:

| Leg | Difference |
|-----|-----------|
| Trigger | The 25th wrong guess. `state.isLoss()`, so `showLossModal(name)` (`src/ui/modal.ts:58`) |
| Modal | 💀, "Game Over", `.modal-title-loss`, "The answer was **X**", "You used all 25 guesses", NO confetti |
| Answer | The modal message is the only place the NAME is spelled out; the tree reveals the lineage |
| Share | `formatGameStateForSharing` loss branch: "💀 Dinosaur dinosaur-#N 🦖" / "I couldn't figure it out in 25 guesses." / a 25-cell grid with no 🦖, and NO streak - `formatStatsLine` withholds it from a loss on purpose (`src/gameState.ts:382`) |
| Retention | Same three actions and the same hint-chip Practice swap. A loss is the case where Practice matters most and where the modal is the ONLY exit |

## Mutations run (every new test failed at least one)

All tests passed on their first run, which is evidence of nothing on its own
(LESSONS.md `a-guard-no-test-can-fail-is-a-comment`). Each mutation below was
applied to a pristine tree, the named test run, then the file restored from a
scratch copy - `git checkout` was avoided because this branch also touches
`e2e/share.spec.ts` (LESSONS.md
`revert-a-test-mutation-with-a-scratch-copy-not-git-checkout`). The replacement
strings are pasted from the script that produced each result, not recalled
(LESSONS.md `quote-the-mutation-not-the-memory-of-it`).

| # | File | Mutation | Test | Result |
|---|------|----------|------|--------|
| M1 | `src/game.ts` | `        playerInput.disabled = true;` -> `        // MUTANT M1: disabled flag removed` | "the input is closed" | 1 failed, `toBeDisabled()` got "enabled" |
| M2 | `src/game.ts` | the whole `if (hintText) { hintText.innerHTML = ` + "`" + `<a href="${__webpack_public_path__}practice"><strong>Practice</strong></a>` + "`" + `; }` block -> `// MUTANT M2: practice link never written into the chip` | "the hint slot" | 1 failed at `expect(text.trim()).toBe("Practice")` |
| M3 | `src/game.ts` | `        const roots = buildGuessTree(state, state.isGameOver());` -> `        const roots = buildGuessTree(state, false); // MUTANT M3` (anchored on the preceding `        updateHintButton();` line - the bare string appears twice, and the mutate script's single-occurrence assert caught it) | "reveals the answer" | 1 failed at `expect(revealed).toHaveCount(1)` |
| M4 | `src/gameState.ts` | `if (mode === "daily" && isWin && stats.currentStreak > 0) {` -> `if (mode === "daily" && stats.currentStreak > 0) { // MUTANT M4` | "bragging" | 1 failed at `expect(text).not.toMatch(/day streak/)` |
| M5 | `src/game.ts` | `                alert("Failed to share game state. Please try again.");` -> `                // MUTANT M5: failure reported to nobody` | "does not claim a copy" | 1 failed at `expect.poll(() => dialogs.length).toBe(1)` |
| M5b | `src/game.ts` | four lines added after `console.error("Failed to share game state: ", err);`: `const s = modalShareBtn.querySelector("span"); if (s) s.textContent = "Copied!";` | "does not claim a copy" | 1 failed at the label assertion |
| M6 | `src/gameStats.ts` | `            if (!state.isGameOver()) continue;` -> `            continue; // MUTANT M6: no finished round ever counted` | "profile page" | 1 failed at `#games-played-daily` |
| M7 | `src/index.html` | the `<a class="modal-btn modal-btn-practice" ...>Practice</a>` element -> `<!-- MUTANT M7: practice action removed -->` | "three next-step actions", "Practice action" | 2 failed (count 3, then a click timeout) |
| M8 | `src/ui/modal.ts` | `modalCloseBtn?.addEventListener("click", () => hideModal());` -> `// MUTANT M9: OK no longer closes the modal` | "OK dismisses" | 1 failed at `not.toHaveClass(/active/)` |

Nine experiments, M1-M8 with M5 split into M5/M5b. The mutation string in the
M8 row still reads `MUTANT M9` because that is what was actually run - the row
was renumbered after the fact, and the string is pasted rather than rewritten.
M7's recorded "2 failed" is the count from its narrower two-pattern `-g` run;
the reviewer's whole-spec run of the same mutation prints 3 failed, the third
being the loss describe's action-count test.

### Round-2 mutations (from the review)

The out-of-context review re-ran M1, M3, M4 and M7 and reproduced all four. It
also ran three of its own, one of which found a real defect:

| # | File | Mutation | Test | Result |
|---|------|----------|------|--------|
| E1 | `src/game.ts` | BOTH defenders removed at once: `            if (playerInput.disabled) return;` and `submitGuess`'s `if (state.isGameOver()) { showGameOverModal(); return; }` | "the input is closed" | 1 failed, `Expected: 4 / Received: 5` - the guarantee is defended exactly twice, as the spec's comment claims, and the domain counter catches losing both |
| E2 | `src/game.ts` | `        autocompleteBox.style.display = "none";` -> `        // MUTANT E2: autocomplete never hidden at game over` | "the input is closed" | **1 PASSED** - the finding: `.autocomplete-box` is `display: none` in the stylesheet and the fixture never opened it, so `toBeHidden()` was satisfied by the CSS |
| E3 | `src/game.ts` | `        playerInput.placeholder = "";` -> `        // MUTANT E3: placeholder left in place` | "the input is closed" | 1 failed at the placeholder assertion |
| E4 | `e2e/share.spec.ts` (the FIXTURE, run after fixing the MINOR) | `const counter = String(Number(digits[1]) - 1).padStart(5, "0");` -> `const counter = String(Number(digits[1]) - 40).padStart(5, "0"); // MUTANT E4: win banked 40 days ago` | "bragging" | 1 failed, `#current-streak-daily` `Expected: "1" / Received: "0"` - the added profile read catches a fixture that stops meaning "yesterday", which is what the reviewer asked for |

E2's first attempted fix was a new test that plays the 25th guess in-page with
the list OPEN, so the close would be a transition rather than a stylesheet
default. **It passed under E2 as well** (`1 passed (1.0s)`), which is the real
answer to the finding: the line is not untested, it is UNFALSIFIABLE, because
the box is hidden twice over by mechanisms that are not `disableInput`:

- `selectAndSubmit` sets `autocompleteBox.style.display = "none"` before it
  calls `onSelect`, i.e. before the game hears about the guess at all
  (`src/ui/autocomplete.ts:67`);
- the blur handler arms a 100ms hide for the click-away path
  (`src/ui/autocomplete.ts:132`), which covers the only other way the round can
  end with a list on screen (buying a hint that spends the last guesses).

`disableInput`'s own hide therefore beats the blur timer by at most ~100ms and
is otherwise dead. A Playwright visibility assertion auto-retries for 5s, so
nothing short of a synchronous race check could see the difference. Deleting the
line is a production change and out of scope for a test-only task, so the
outcome recorded here is: the guarantee IS pinned (the new test drives the whole
live-round ending), the redundant line is NOT, and the task record says so
instead of claiming coverage it does not have. The test was renamed to describe
what it actually proves.

M4 is the one that also proves a fixture is doing its job: the loss-share test
banks a win dated the day BEFORE the frozen clock, so `currentStreak` is really
1 while today is a loss. Without that win the suppression branch is guarded on
two conditions at once and the assertion would pass vacuously.

Two assertions are deliberately NOT single-mutation-falsifiable, and say so in
the spec: "no further guess is recorded" is defended by both the `disabled`
early-return in the keydown handler and `submitGuess`'s own game-over
early-return, so it pins the guarantee while the `toBeDisabled()` assertion
beside it pins the mechanism (M1).

## What the mapping surfaced

1. **A failed share raises a system `alert()`** (`src/game.ts:370-373`). Guesses
   moved off `alert()` to the inline `#input-error` precisely because a system
   dialog reads as a page error rather than as part of the game; the share
   failure path never got the same treatment. Filed as its own task; this task
   pins the SHIPPED behavior so the fix has a baseline to change.
2. **The post-game hint chip is a Practice link with no label change beyond the
   word.** Step 3 of this task asked whether that confuses a player expecting
   hints to be disabled. Verdict from the code: the chip drops `.disabled` and
   gains `.practice`, so it is visually promoted rather than greyed out, and its
   whole text becomes "Practice" - there is no residual hint wording to
   misread. It is a re-used slot, not a disabled hint. No defect; pinned by test
   so a future edit cannot silently leave "Hint" wording behind a practice link.
3. **The daily post-game state has no next-puzzle affordance at all.** Already
   owned by `20260729-101838`; not re-filed.
