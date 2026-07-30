# Decision: who owns the Enter key on the guess input

- STATUS: ACCEPTED
- DATE: 2026-07-30

The task's step 3 names a fork ("decide whether the input's own Enter handler in
`src/game.ts` should submit raw text at all while a suggestion list is open").
Planning turned up the constraint that makes the candidates mutually exclusive
rather than tweaks, so the choice is recorded here rather than inferred while
coding.

## The constraint

Both keydown listeners live on the SAME element. `setupAutocomplete` registers
one on `playerInput` (`src/game.ts:262`), and the raw-text handler registers
another on `playerInput` (`src/game.ts:329`). `event.preventDefault()` does not
stop a sibling listener on the same element - only
`event.stopImmediatePropagation()` does. So today, for EVERY Enter, both
handlers run.

The happy path survives that only by accident. `selectAndSubmit` sets
`inputEl.value = name` and calls `onSelect` -> `submitGuess` -> `updateUI()`,
which sets `playerInput.value = ""` (`src/game.ts:223`); the raw-text handler
then reads an empty string and bails at its own `if (!guess) return`. Nothing
declares that ordering, nothing tests it, and it is the only thing standing
between a valid selection and a double submit.

That is why fixing the blur timer alone is not sufficient. The timer fix makes
the suggestion list stay open, so in practice the autocomplete handler wins
first and the raw-text handler sees an empty box - but correctness would still
rest on the undocumented accident, and the "valid prefix rejected as a species"
symptom would remain one refactor away.

## Chosen: the autocomplete consumes Enter when a suggestion is highlighted

In the `event.key === "Enter" && activeIndex >= 0` branch of
`src/ui/autocomplete.ts`, call `event.stopImmediatePropagation()` alongside the
existing `event.preventDefault()`. `src/game.ts`'s raw-text handler is then
reached only when no suggestion list is open - which is exactly the case it is
good for: the player typed something with zero matches, and the inline
`#input-error` rejection is the correct, wanted feedback.

Rejected alternatives:

- **Remove the raw-text handler entirely.** Simplest control flow, but it
  deletes the only path that produces a rejection message for a genuinely bogus
  guess, and it makes a typed-out exact name unsubmittable in any state where
  the box is hidden. Too much behaviour lost for the simplification.
- **Fix only the timer.** Leaves the accidental `updateUI()`-clears-the-input
  guard as the thing correctness rests on, and leaves the second half of the
  defect (a valid prefix reaching the exact-match lookup) live behind a
  re-render race rather than removed.

## Also chosen: the 100ms blur delay stays

The delay's handle is stored and `clearTimeout`ed on `focus` and on `input`;
the delay itself is not removed. Suggestion items call `preventDefault()` on
`mousedown`, which stops the input blurring when one is clicked, so the delay
looks like dead weight on desktop - but the mobile suite does not cover every
touch browser's blur-versus-tap ordering, and the bug being fixed is the
uncancelled timer, not the grace period. Removing the delay is a separate change
with its own risk and no evidence behind it.
