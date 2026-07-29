# Review: Fix first-run mobile game focus

- TASK: 20260729-092315
- BRANCH: fix/first-run-panel-focus

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

The reviewer ran `nix develop --command npm run ci` itself (exit 0; 156 Jest,
24 e2e passed, 1 skipped - the pre-existing `images.spec.ts` fixme owned by
20260729-092404), confirmed each DoD proof individually, and empirically
checked that the new tests fail with the fix reverted: `git checkout master --
src/ui/panel.ts` then re-running the two specs gave 5 failed / 1 passed, every
failure on the `#info-panel` `active`-class expectation, i.e. red for the right
reason. The worktree was restored byte-identical to HEAD.

In-session re-derivation of two load-bearing claims (per the review skill, the
supplement must not adopt the round wholesale): R1.1's hint path was confirmed
by reading `src/game.ts:192-207` (`hintBox` click -> `state.useHint` ->
`updateUI` -> `renderLastGuess`, which with no guess yet takes the
`!state.lastGuessId` branch this diff changed), and R1.4's stale sentence was
read directly at `AGENTS.md:79-82`.

- [x] R1.1 (MINOR) src/ui/panel.ts:38 - the `!state.lastGuessId` branch also
  serves the hint-before-first-guess path (`hintBox` click -> `useHint` ->
  `updateUI` -> `renderLastGuess`, `src/game.ts:192-207`). Before this change,
  buying a hint with no guess made popped the panel with the newly revealed
  clade; now the card re-renders silently behind a closed panel and the only
  feedback is the tree redraw. Neither DECISION.md nor a test covers it. Open
  the panel from the `hintBox` handler after `updateUI()`, and pin it with an
  e2e assertion.
  - Response: Confirmed by reading `src/game.ts:192-207`. Fixed: the `hintBox`
    handler now calls `openPanel()` after `updateUI()`, since a hint purchase is
    an explicit request to see something (unlike a page load). Pinned by the new
    "opens when a hint is bought before the first guess" test in
    `e2e/panel.spec.ts`, and recorded in DECISION.md.
- [x] R1.2 (MINOR) src/ui/panel.ts:68 - a returning mid-game player on mobile
  still gets the panel auto-opened over `#arena` on reload: `manuallyClosedPanel`
  is module-level and resets to `false` on every load, so a restored
  `state.lastGuessId` runs the tail `openPanel()` during the initial
  `updateUI()`. The DoD covers only the no-guess case, so the "tree hidden on
  load" complaint survives for reloads after the first guess. Either scope it
  out explicitly in DECISION.md or suppress the auto-open when `renderLastGuess`
  runs from the initial `updateUI()` rather than from a fresh guess.
  - Response: Agreed it is real, and kept out of scope: the fix changes
    `renderLastGuess`'s contract (page-load render vs fresh-guess render), which
    is more than this task's first-screen Story. Scoped out explicitly in
    DECISION.md ("Two paths this deliberately does NOT change") and filed as
    task `20260729-125313` with the mechanism and a seeded-reload test plan.
- [x] R1.3 (MINOR) e2e/mobile.spec.ts:81 - the off-screen check sits inside
  `if (panelBox && viewport)`, so a null `boundingBox()` makes the assertion
  no-op and the test pass vacuously. The sibling test at line 26 guards this
  with `expect(inputBox).not.toBeNull()` first. Add
  `expect(panelBox).not.toBeNull();` before the conditional.
  - Response: Fixed - `expect(panelBox).not.toBeNull();` added before the
    conditional, matching the sibling test's guard.
- [x] R1.4 (MINOR) AGENTS.md:79-82 - now stale: it names "the mobile auto-open
  panel, `20260729-092315`" among the `test.fixme` assertions awaiting their
  task. This branch lands that task and flips that fixme; only the species-icon
  one remains. Update the sentence to name only the species-icon fixme.
  - Response: Confirmed stale at `AGENTS.md:79-82` and fixed - the sentence now
    names only the species-icon fixme, in the singular.
- [x] R1.5 (MINOR) e2e/panel.spec.ts:33-35 - the pre-existing post-close
  assertion `await expect(input).toBeVisible()` was dropped (it moved up into
  the first-load block, leaving only `toBeEditable()` at the close step).
  `toBeEditable` does not imply the input is rendered, so the "closing the panel
  leaves the control path usable" leg is weaker than before. Restore
  `await expect(input).toBeVisible();` alongside it.
  - Response: Fixed - `toBeVisible()` restored at the close step, alongside the
    `toBeEditable()` it had been reduced to.

## Round 2

- VERDICT: APPROVE
- REVIEWER: out-of-context

The same out-of-context reviewer verified all five round-1 fixes against the
actual diff, re-ran `nix develop --command npm run ci` (exit 0; 156 Jest, 25
e2e passed, 1 skipped), and vacuity-checked the new hint test by deleting the
`openPanel();` line from the `hintBox` handler: exit 1, exactly one failure -
"opens when a hint is bought before the first guess" on the `active`-class
expectation, having passed the `Guesses Left: 22` assertion first, so the test
isolates precisely that fix. All five round-1 findings RESOLVED. It raised one
new finding and one nit.

- [x] R2.1 (MINOR) src/game.ts:207 - the new `openPanel()` was unconditional, so
  it also fired mid-game, where it overrides an explicit manual close AND clears
  `manuallyClosedPanel` (`openPanel()` sets it false, `src/ui/panel.ts:21`).
  Close the panel, buy a hint, then guess: the panel auto-opens again, undoing
  the preference this branch's own "respects a manual close" test pins. Narrow
  to the documented case, `if (!state.lastGuessId) openPanel();` - mid-game the
  `lastGuessId` branch of `renderLastGuess` already opens the panel, respecting
  the manual close, exactly as on master.
  - Response: Confirmed and fixed - the call is now guarded by
    `if (!state.lastGuessId)`, with a comment explaining the flag-clearing
    hazard, and the DECISION.md wording already scoped it to "before the first
    guess". Added the suggested e2e leg as "a mid-game hint does not resurrect
    the panel for later guesses" (guess -> manual close -> hint -> guess, panel
    stays shut throughout).
- [x] R2.2 (NIT) tasks/20260729-092315/REVIEW.md - round-1 findings still
  carried unticked checkboxes despite their "Fixed" responses.
  - Response: Fixed - all five round-1 checkboxes ticked.

Writing R2.1's regression test surfaced a pre-existing app defect this branch
does not own: `src/ui/autocomplete.ts:77-82` hides the suggestion box on a
100ms `blur` timer whose handle is never cleared, so clicking another control
and typing again inside that window lets the stale timer hide a freshly
rendered list - the `keydown` handler then sees `isOpen === false` and drops
ArrowDown/Enter, swallowing the guess. It made the new test intermittently red
(2 pass / 1 fail under `--repeat-each=3`), which is how it was found. Filed as
task `20260729-130138`; the suite works around it in `e2e/helpers.ts`
`guessFirstSuggestion`, which retries the whole type-and-submit until the app's
own "input cleared" signal proves the guess landed. The first version of that
workaround was itself wrong - see R3.1.

Final gate after round 2: `nix develop --command npm run ci` exit 0 - 156 Jest
tests, 26 e2e passed, 1 skipped (the `images.spec.ts` fixme owned by
20260729-092404). The single lint warning (`treeVisualizer.ts:103`, unused `e`)
is pre-existing on master and untouched by this branch.

## Round 3

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

The reviewer confirmed R2.1 and R2.2 resolved, traced AND probed the new guard
(a temporary spec showed a mid-game hint with the panel not manually closed
still opens it and swaps the card title `Dinosauria` -> `Ornithischia` at
`Guesses Left: 21`), and re-checked non-vacuity by restoring the unconditional
`openPanel()`: 3 failed / 12 passed under `--repeat-each=3`, all three the new
mid-game test. It then found a MAJOR the in-session pass had missed.

- [x] R3.1 (MAJOR) e2e/helpers.ts:34 - the retry loop's exit condition
  (`expect(input).toHaveValue("")`) is not proof the guess landed, and the
  comment claiming a retry cannot double-submit was false. When the stale blur
  timer hides the list, `setupAutocomplete`'s keydown returns early but the
  Enter still bubbles to the input's own keydown handler (`src/game.ts`), which
  calls `submitGuess` with the RAW typed text; `findSpeciesByName` is
  exact-match, so `makeGuess` throws, `alert()` fires (auto-dismissed by
  Playwright) and the `finally`'s `updateUI()` clears the input anyway. The
  helper then reports success with no guess made. Reproduced: `--repeat-each=6
  --workers=2` gave 47 passed / 1 failed, `panel.spec.ts` expecting
  `Guesses Left: 20` and getting 21, with the page snapshot showing a single
  guessed species. Make the exit condition the counter actually decreasing, or
  select via clicking the suggestion (its `mousedown` calls `selectAndSubmit`
  directly, bypassing the `isOpen` gate), bound the `toPass` timeout, and fix
  the comment.
  - Response: Confirmed and fixed - all three suggestions taken. The helper now
    selects by CLICKING the first suggestion (never Enter, so the raw-text path
    is never reached), exits only when `#stat-box`'s guesses-left number has
    gone down (polled with its own bounded timeout, so a slow frame cannot
    cause a double-submit), and runs under `.toPass({ timeout: 10_000 })`. The
    false comment is replaced by an accurate description of both hazards. This
    finding also corrects an in-session claim: the earlier "48/48 green" report
    was a false green produced by the broken exit condition.
- [x] R3.2 (MINOR) tasks/20260729-092315/REVIEW.md - the round-2 claim "48/48
  green under `--repeat-each=6`" does not reproduce (the reviewer got 47/48).
  Restate the observed number once R3.1 is fixed.
  - Response: Fixed - the false claim is struck from the Round 2 text, which now
    points at R3.1. Re-measured after the fix: `npx playwright test panel.spec.ts
    mobile.spec.ts --repeat-each=10 --workers=2` run twice, 80/80 passed both
    times (exit 0).
- [x] R3.3 (MINOR) tasks/20260729-130138/TASK.md - the mechanism is accurate but
  stops one step short: the swallowed Enter falls through to `src/game.ts` and
  submits the raw typed text, so the player gets an "not found in game data"
  alert for a valid prefix. "Silently eat a keystroke" is inaccurate - it is
  worse than silent. Add the fallthrough, fix the Story, add a no-spurious-alert
  DoD line.
  - Response: Fixed - Story reworded, the fallthrough paragraph added to
    Context, a step added for the raw-text Enter handler, and a
    "no alert is raised for a valid prefix" DoD item with a dialog-listener
    proof.

Verification after round 3: `nix develop --command npm run ci` exit 0 - 156
Jest tests, 26 e2e passed, 1 skipped (the `images.spec.ts` fixme owned by
20260729-092404). Flake re-measured as above: two independent 80/80 runs.

## Round 4

- VERDICT: APPROVE
- REVIEWER: out-of-context

R3.1, R3.2 and R3.3 all confirmed RESOLVED. The reviewer probed the rewritten
helper for false success by inserting an early `return` at the top of
`submitGuess` so every guess is swallowed: `panel.spec.ts` went to 3 failed / 2
passed, each failure at the helper's counter assertion - it cannot fake a pass.
It also confirmed the counter is written synchronously inside the click's
`mousedown` dispatch (so the poll's first sample already sees it and the bound
cannot expire on a landed guess), and that keyboard coverage is not dodged:
`e2e/autocomplete.spec.ts` still drives fill -> ArrowDown -> active-item
assertion -> Enter end to end, and touches no other control first, so it is not
exposed to the blur race. Net coverage is broader than before - keyboard path
there, mouse path in `panel.spec.ts`. Flake re-measured independently: two
`--repeat-each=10 --workers=2` runs plus one at `--workers=4`, 80 passed each,
240 repeats green against the 47/48 failure reproduced in round 3.

- [x] R4.1 (NIT) e2e/helpers.ts:57 - `toBeLessThan(before)` is satisfied by any
  decrease, so a hypothetical double-submit is only caught downstream by the
  callers that happen to assert an exact count. `toBe(before - 1)` is strictly
  stronger and self-detecting inside the helper, at no cost.
  - Response: Taken - the assertion is now `toBe(before - 1)` with a comment
    saying why exactly-one matters. Re-verified after the change:
    `--repeat-each=10 --workers=2` 80/80 passed, `npm run ci` exit 0.

Final state: `nix develop --command npm run ci` exit 0 - 156 Jest tests, 26 e2e
passed, 1 skipped (the `images.spec.ts` fixme owned by 20260729-092404). The one
lint warning (`treeVisualizer.ts:103`, unused `e`) is pre-existing on master.
