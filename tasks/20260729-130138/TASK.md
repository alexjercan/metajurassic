# Autocomplete blur timer swallows a fast re-typed guess

- STATUS: CLOSED
- PRIORITY: 70
- TAGS: bug, ui, input

## Story

As a player who taps another control and then goes straight back to the input,
I want my typed guess to submit, so that the game does not throw away my guess
and accuse me of naming a species that does not exist.

## Context

Found while writing the panel tests for `20260729-092315` (the new
"a mid-game hint does not resurrect the panel for later guesses" test was
intermittently red: 2 passes, 1 failure under `--repeat-each=3`).

Mechanism, in `src/ui/autocomplete.ts`:

- the `blur` handler schedules `setTimeout(..., 100)` which sets
  `autocompleteBox.style.display = "none"` and `activeIndex = -1` (lines 77-82);
- the timer handle is never stored and never cleared;
- `focus`/`input` re-render the list and set `display = "block"`,
  `activeIndex = 0`;
- so if the player clicks another control (the `#open-panel` toggle, `#hint-box`)
  and types again within 100ms, the stale timer fires AFTER the re-render and
  hides a list that is currently in use. The `keydown` handler then computes
  `isOpen === false` and returns early, so ArrowDown and Enter do nothing and
  the guess is never submitted from the suggestion list.

The failure is worse than a dropped keypress. That ignored Enter keeps going to
the input's OWN keydown handler in `src/game.ts` (line 329), which calls
`submitGuess(playerInput.value.trim())` with the RAW typed text. Species lookup
is exact-match (`findSpeciesByName`, `src/gameData.ts`), so a partial query like
`saurus` throws, and the `finally` still runs `updateUI()`, which clears the
input. The player is told a perfectly good prefix is not a species, and the
emptied box makes it look like a guess was taken when none was. Any fix must
kill the spurious rejection, not just restore the suggestion list.

### Correction to the above, found while planning (2026-07-30)

Two things in the paragraph above are out of date or incomplete, and the plan
below is built on the corrected reading:

1. **There is no `alert()` any more.** `20260729-092327` replaced it with the
   inline `#input-error` element (`showInputError`, `src/game.ts:130`), so the
   symptom today is an inline "Species ... not found in game data" message under
   the input, not a browser dialog. `e2e/helpers.ts` already records this. The
   Definition of Done below asserts on `#input-error` instead; a
   `page.on("dialog")` listener is kept anyway as a cheap pin that the dialog
   does not come back.

2. **`preventDefault()` does not protect the raw-text path, and never did.**
   Both keydown listeners are registered on the SAME element (`playerInput`:
   `setupAutocomplete` at `src/game.ts:262`, then the raw handler at line 329),
   so `preventDefault()` in the autocomplete does not stop the second listener -
   only `stopImmediatePropagation()` would. Even on the happy path today, BOTH
   handlers run for every Enter. A double submit is avoided purely by accident:
   `selectAndSubmit` -> `onSelect` -> `submitGuess` -> `updateUI()` sets
   `playerInput.value = ""` (`src/game.ts:223`), so the raw handler then reads an
   empty string and bails at its own `if (!guess) return`. That accidental guard
   is load-bearing and undocumented, and it is the reason the timer fix alone is
   not enough.

3. **There are TWO workaround helpers, not one.** The paragraph below names
   `guessFirstSuggestion`; `guessNamedSpecies` in the same file carries the
   identical `toPass` retry loop and a comment saying the hazard "applies here
   identically". Both are removed.

The e2e suite worked around this in `e2e/helpers.ts` `guessFirstSuggestion`,
which retried the whole type-and-submit, selected by CLICKING the suggestion
(whose `mousedown` handler bypasses the `isOpen` gate) rather than pressing
Enter, and only exited once the guesses-left counter had actually gone down.
That workaround is removed by this task - its comment pointed back here.

## Decision

`DECISION.md` records the resolved fork, confirmed by the user before any code
was written:

- the autocomplete CONSUMES Enter (`preventDefault` +
  `stopImmediatePropagation`) whenever a suggestion is highlighted, so
  `src/game.ts`'s raw-text handler is only ever reached when no suggestion list
  is open;
- the 100ms blur delay STAYS, with its handle stored and cleared on `focus` and
  `input`.

## Steps

Written test-FIRST: each test lands red, for the right reason, before the
change that greens it.

- [x] Add `test/autocompleteBlur.test.ts` - a jsdom Jest spec
      (`@jest-environment jsdom`, as `test/cardRendering.test.ts` does) driving
      `setupAutocomplete` directly with fake timers. This is the deterministic
      pin for the race, because the 100ms window can be stepped exactly instead
      of being chased by a browser. Assert, RED first: blur, then focus and
      input, then advance timers past 100ms, and the box is still
      `display: block` with matches; ArrowDown and Enter still reach the
      handler; `onSelect` fires with the full species name.
- [x] Store the blur timeout handle in `setupAutocomplete` and `clearTimeout`
      it on `focus` and on `input`. The 100ms delay itself stays (see
      `DECISION.md`): it covers whatever touch-blur ordering the
      `mousedown`+`preventDefault` on items does not, and the race is what is
      being fixed, not the grace period.
- [x] Add an e2e test to `e2e/autocomplete.spec.ts` at the player's altitude:
      click `#open-panel`, immediately click back into the input and type a
      partial query, then ArrowDown + Enter. Assert the guesses-left counter
      goes down by exactly one, `#input-error` stays hidden, and a
      `page.on("dialog", ...)` listener never fired. RED first against the
      current code.
- [x] Make the autocomplete consume Enter: add `event.stopImmediatePropagation()`
      alongside the existing `preventDefault()` in the
      `event.key === "Enter" && activeIndex >= 0` branch of
      `src/ui/autocomplete.ts`, so `src/game.ts`'s raw-text handler is only
      reached when no suggestion list is open. Comment WHY (same element, same
      event, `preventDefault` is not enough) so the accidental
      `updateUI()`-clears-the-input guard is no longer what correctness rests on.
- [x] Add a jsdom assertion that a highlighted-Enter does not reach a second
      keydown listener registered on the same input after `setupAutocomplete` -
      the direct pin for the step above, since the jsdom spec can register that
      second listener itself.
- [x] Simplify BOTH workaround helpers in `e2e/helpers.ts`. The task text names
      only `guessFirstSuggestion`; `guessNamedSpecies` (line ~381) carries the
      SAME `toPass` retry loop and a comment saying the hazard "applies here
      identically", so the fix is not landed until both are plain. Keep in each
      the `guessesLeft` assertion of exactly one guess spent - that catches
      double-submit and is worth keeping on its own merits
      (`LESSONS.md`: `side-effect-cleared-state-is-not-proof-of-success`, which
      is this very defect's lesson). `guessFirstSuggestion` becomes type +
      ArrowDown + Enter; `guessNamedSpecies` keeps its exact-text CLICK, which
      is about picking an unambiguous species and not about this bug, and loses
      only the retry and the hazard comment.

      DONE WITH ONE DEVIATION: `guessFirstSuggestion` submits with Enter alone,
      not ArrowDown + Enter. `renderSuggestions` already highlights index 0, so
      an ArrowDown would move to the SECOND suggestion and the helper would stop
      guessing the FIRST one, which is its whole contract. The ArrowDown path is
      still covered - by the pre-existing case at the top of
      `e2e/autocomplete.spec.ts` and by the new blur case, both of which press
      it deliberately.
- [x] Measure the flake before claiming it is dead
      (`LESSONS.md`: `measure-a-flake-fix-against-its-original-failure-rate`).
      Simplify the helpers FIRST, on the unfixed code, and run
      `e2e/panel.spec.ts` enough times to establish a real baseline failure
      rate; only then apply the source fix and re-run enough repeats to have
      seen the old failure several times over. Record both numbers verbatim in
      `NOTES.md` - the reported failure rate was 1-in-3 under `--repeat-each=3`,
      so `--repeat-each=5` is not a proof.
- [x] Sweep the live doc surfaces for the removed workaround: `AGENTS.md` and
      any other spec or comment naming `20260729-130138` as an open defect must
      stop describing it as one. Exclude the `tasks/` tree - that history stays
      verbatim.

## Definition of Done

- Re-focusing the input and typing within 100ms of a blur leaves the suggestion
  list open and still submits the guess.
  (test: `test/autocompleteBlur.test.ts`, fake-timer boundary)
- A highlighted-Enter never reaches a later keydown listener on the same input,
  so a valid prefix can never be submitted as raw text.
  (test: `test/autocompleteBlur.test.ts`, second-listener assertion)
- After blurring to `#open-panel` and typing straight back, ArrowDown + Enter
  spends exactly one guess, `#input-error` stays hidden, and no dialog is
  raised. (test: the new case in `e2e/autocomplete.spec.ts`)
- NEITHER helper in `e2e/helpers.ts` still retries around the defect.
  (cmd: `grep -n "toPass" e2e/helpers.ts` returns nothing.

  NARROWED for the same reason as the doc grep below, and this one was missed
  on the first pass (REVIEW.md R1.2). The plan's version also matched the bare
  task id, which still returns 2 lines - both historical provenance in the
  rewritten comments, which is wanted. `toPass` alone is the real proof: it
  matched exactly the two retry loops at lines 79 and 401 before this change,
  and those loops were the workaround.)
- No live doc surface still describes this defect as OPEN.
  (cmd: `grep -rn "once 20260729-130138 is fixed\|a real app defect\|applies here identically" --exclude-dir=tasks --exclude-dir=node_modules --exclude-dir=.git .`
  returns nothing.

  NARROWED, with the reason recorded per `absence-proving-greps-must-be-run-when-written`.
  The plan's original grep was the bare task id, and running it after the fix
  returned 8 lines - all of them historical provenance in the new and updated
  comments ("the regression for task 20260729-130138", "20260729-130138 fixed
  both halves"), which is the same convention `e2e/autocomplete.spec.ts` already
  uses for 20260729-141427. Citing the task that caused a line is wanted; the
  bare-id grep can therefore never go clean and proves nothing. What must be
  absent is the language calling the defect LIVE, which is what the narrowed
  grep matches - and it matched all three workaround sites before this change.)
- The blur-timer regression is pinned by a test that provably discriminates.
  (cmd: recorded verbatim in `NOTES.md` - the new e2e case fails 10/10 against
  the unfixed source and passes 30/30 with the fix)
- The originally reported flake is dead, measured against its own failure rate.
  (cmd: `npx playwright test e2e/panel.spec.ts -g "resurrect" --repeat-each=40`
  - 12/40 fail on the unfixed source with the helper workarounds removed, 0/40
  with the fix. This is a SECOND discriminating proof, not a no-regression
  check; an earlier revision of this line said otherwise on the strength of an
  underpowered whole-file run, see REVIEW.md R1.1 and `NOTES.md`.)
- `e2e/panel.spec.ts` passes repeatedly with the retry workaround removed.
  (cmd: `npx playwright test e2e/panel.spec.ts --repeat-each=30`)
- `npm run ci` passes. (cmd: `npm run ci`)
