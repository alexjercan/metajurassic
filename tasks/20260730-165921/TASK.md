# Replace the share-failure alert with inline feedback

- PRIORITY: 58
- TAGS: bug, ux, ui
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a player whose browser refuses the clipboard write, I want to be told inside
the game rather than by a system dialog, so that a failed share reads as part of
the game and not as a page error.

## Problem

`src/game/shareButton.ts:45-48` (the `#modal-share-btn` handler; `src/game.ts`
has since been split into `src/game/`) ends its rejection path with
`console.error` plus `alert("Failed to share game state. Please try again.")`.
Guesses deliberately moved OFF `alert()` for this exact reason - an unknown or
repeated guess now reports next to the input via `#input-error`, because a
system dialog interrupts the round and reads as a page error rather than as game
feedback (see the comment at `src/game/index.ts:116` and
`tasks/20260729-092327/DECISION.md`). The share failure path never got the same
treatment, so the one place a modal action can fail is also the only place left
that still raises a browser dialog.

Found while mapping the post-game journey for `20260729-092504`; that task pins
the current `alert()` behaviour in `e2e/share.spec.ts` ("does not claim a copy
for a clipboard write that failed") so this change has a baseline to move.

## Steps

- [ ] Write `tasks/20260730-165921/DECISION.md`
      (`tatr scaffold 20260730-165921 DECISION`) for the placement: a
      `#modal-error` line as the LAST child of `.modal`, after
      `.modal-actions`. Rejected: inside `.modal-actions`, which is a
      `display: flex` row with `flex-wrap` (`src/partials/modal.css:220`) - a
      `<p>` there becomes a flex item beside the buttons and can take its own
      wrapped row, and `e2e/helpers/modal.ts` walks that row's children for the
      viewport-fit check. Rejected: under `#modal-stats`, which pushes
      `.modal-actions` down by a full line at the moment the player's pointer
      is on the Share button; below the row, the growth of a
      vertically-centred `.modal` moves that button by roughly half a line.
- [ ] Add `<p class="modal-error" id="modal-error" hidden></p>` to
      `src/index.html` after the `.modal-actions` div (line 154), inside
      `.modal`. Shipped hidden, like `#modal-extras`: `src/index.html` is the
      template for the practice page too (`webpack.config.js`).
- [ ] Style `.modal-error` in `src/partials/modal.css`, mirroring `.input-error`
      (`src/partials/input.css:37`): `color: #ff8a80`, `font-size: 0.85rem`,
      `line-height: 1.3`, plus `.modal-error[hidden] { display: none; }`.
      `.modal` already centres text. Use the `margin: 14px 0 0 0` of the
      neighbouring `.modal-countdown`.
- [ ] Rewrite the pinning test `e2e/share.spec.ts:185` ("does not claim a copy
      for a clipboard write that failed"): keep the `page.on("dialog")` recorder
      but assert `dialogs.length === 0`, assert `#modal-error` is visible and
      contains "Failed to share", and keep the "never said Copied!" assertion,
      ordered after the message has been observed for the same reason the
      comment at line 219 gives. Replace the `src/game.ts` / "pins the CURRENT
      behaviour" comment with what the test now defends. Confirm it fails
      before touching `src/`.
- [ ] Replace the `alert()` in `src/game/shareButton.ts` with `#modal-error`:
      look the element up once outside the click handler (the pattern
      `src/game/index.ts:58` uses, `| null` and guarded), set text plus
      `hidden = false` in `.catch`, and clear it in the `.then` so a later
      successful share does not leave the failure on screen. Keep the
      `console.error`.
- [ ] Clear `#modal-error` in `showModal()` in `src/ui/modal.ts`, so a failure
      does not survive a close and re-open of the same finished round - the
      staleness `renderExtras` already guards against for `#modal-extras`.
- [ ] Run `npm run ci`.

## Definition of Done

- A failed clipboard write shows the inline `#modal-error` message and raises no
  browser dialog, and the button still never says "Copied!".
  (test: `npm run test:e2e -- share.spec.ts`)
- No `alert()` call is left in `src/`, only the comments explaining its removal.
  (cmd: `grep -rnP 'alert\x28"' src/`)
- The full suite passes with the rewritten pin. (cmd: `npm run ci`)

## Notes

- The failing-clipboard stub already exists: `stubShareApis(page, false, true)`
  in `e2e/share.spec.ts`.
- Sequencing: independent of `20260729-101838`, which also edits the modal.
- The absence proof spells the open paren as `\x28` (hence `grep -P`) on
  purpose: `tatr check` reads the trailing `(...)` group as the proof, and a
  literal `(` inside the command unbalances it. Do not "simplify" it back.
- Proof state on `master` at plan time: that grep matches
  `src/game/shareButton.ts:47` (red - the criterion wants no match).
  `grep -rn 'modal-error' src/ e2e/` matches nothing, so nothing in the tree
  claims the new element yet. `npm run test:e2e -- share.spec.ts` and
  `npm run ci` are green on `master` and turn red at the Step that rewrites the
  pin, which is the test-first order above.
- The bare-token cross-check `grep -rn 'alert' src/` returns four hits; the
  three the narrowed token drops are prose (`src/index.html:89`,
  `src/partials/input.css:20`, `src/game/index.ts:117`), all of them comments
  that name `alert()` to explain why it is gone. Those must survive.
- `#modal-error` ships hidden, so the modal geometry pinned by
  `e2e/mobile.spec.ts` ("mobile game-over modal") is unchanged on every path
  those tests exercise; none of them fails a share.
