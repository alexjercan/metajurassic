# Decision: Replace the share-failure alert with inline feedback

- DATE: 20260802-232457
- STATUS: ACCEPTED
- TASK: 20260730-165921
- TAGS: ux, ui, modal

## Context

The share failure was the last `alert()` in `src/`. Guesses already report
inline via `#input-error` (`tasks/20260729-092327/DECISION.md`). Moving the
share failure needs two choices: where the message goes inside `.modal`, and
which module owns the element.

## Decision

Placement: `<p class="modal-error" id="modal-error" hidden>` as the LAST child
of `.modal`, after `.modal-actions`. Styled in `src/partials/modal.css`
mirroring `.input-error` (`#ff8a80`, `0.85rem`, `1.3` line-height) with the
`margin: 14px 0 0 0` of the neighbouring `.modal-countdown`. Ships hidden:
`src/index.html` is the practice page template too. It carries `role="alert"`
like `#input-error` does - the dialog it replaces announced itself, and a
silently revealed line would not.

Ownership: `src/ui/modal.ts` looks the element up and exports
`showModalError(message)` / `clearModalError()`. `src/game/shareButton.ts`
calls them; it keeps its `console.error`. `showModal()` calls
`clearModalError()` so a failure does not survive a close and re-open.

## Alternatives considered

- Inside `.modal-actions`: rejected. That row is `display: flex` with
  `flex-wrap` (`src/partials/modal.css:220`), so a `<p>` becomes a flex item
  beside the buttons and can take its own wrapped row, and
  `e2e/helpers/modal.ts` walks that row's children for the viewport-fit check.
- Under `#modal-stats`: rejected. It pushes `.modal-actions` down by a full
  line at the moment the player's pointer is on the Share button. Below the
  row, the growth of a vertically-centred `.modal` moves that button by roughly
  half a line.
- Looking `#modal-error` up in `src/game/shareButton.ts` (as the plan's Step
  said): rejected. `src/ui/modal.ts` already owns every modal element, and
  `showModal()` has to clear the line anyway - a second `getElementById` for
  the same node in another module would split that ownership.
  `shareButton.ts` takes its `button` as an argument and otherwise reaches the
  UI only through `../ui/*`, so importing two functions matches what is there.

## Consequences

- Any future modal action that can fail has a place to report it, without
  reaching into modal DOM from outside `src/ui/modal.ts`.
- The element is hidden on every path `e2e/mobile.spec.ts` exercises (none of
  them fails a share), so the pinned modal geometry is unchanged.
- A visible failure grows `.modal` by one line; the vertical centring splits
  that growth, so the buttons move about half a line. Accepted as the smallest
  shift of the three placements.
