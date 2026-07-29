# Autocomplete blur timer swallows a fast re-typed guess

- STATUS: OPEN
- PRIORITY: 70
- TAGS: bug,ui,input

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

The failure is worse than a dropped keypress. That ignored Enter keeps bubbling
to the input's OWN keydown handler in `src/game.ts`, which calls
`submitGuess(playerInput.value.trim())` with the RAW typed text. Species lookup
is exact-match (`findSpeciesByName`, `src/gameData.ts`), so a partial query like
`saurus` throws, the `catch` raises `alert("Species \"saurus\" not found in game
data")`, and the `finally` still runs `updateUI()`, which clears the input. The
player is told a perfectly good prefix is not a species, and the emptied box
makes it look like a guess was taken when none was. Any fix must kill the
spurious alert, not just restore the suggestion list.

The e2e suite currently works around this in `e2e/helpers.ts`
`guessFirstSuggestion`, which retries the whole type-and-submit, selects by
CLICKING the suggestion (whose `mousedown` handler bypasses the `isOpen` gate)
rather than pressing Enter, and only exits once the guesses-left counter has
actually gone down. That workaround should be removed once this is fixed - its
comment points back at this task.

## Steps

- [ ] Add a failing test at the defect's own boundary: blur the input and
      re-focus/type inside the 100ms window, then assert the suggestion list is
      still open, the guess submits, and NO alert dialog is raised (register a
      `page.on("dialog", ...)` listener and assert it never fired).
- [ ] Store the blur timeout handle and `clearTimeout` it on `focus` and on
      `input` (and consider whether the delay is needed at all, since item
      selection already uses `mousedown` + `preventDefault`).
- [ ] Decide whether the input's own Enter handler in `src/game.ts` should
      submit raw text at all while a suggestion list is open - it is the second
      half of this defect and can turn a valid prefix into an error alert.
- [ ] Simplify `guessFirstSuggestion` in `e2e/helpers.ts` back to a plain type +
      ArrowDown + Enter, and drop the comment pointing at this task.

## Definition of Done

- Re-focusing the input and typing within 100ms of a blur still submits the
  guess. (test: the new boundary test)
- No alert is raised for a valid prefix that has suggestions. (test: the same
  boundary test's dialog listener)
- `e2e/panel.spec.ts` passes repeatedly without the retry workaround.
  (cmd: `npx playwright test e2e/panel.spec.ts --repeat-each=5`)
- `npm run ci` passes. (cmd: `npm run ci`)
