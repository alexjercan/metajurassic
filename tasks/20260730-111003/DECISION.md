# Decision: cap and scroll the modal, do not scroll the overlay

- STATUS: ACCEPTED
- DATE: 2026-07-30
- TASK: 20260730-111003

## The fork

The game-over modal has no vertical escape hatch: `.modal-overlay` is
`position: fixed; inset: 0` with `overflow: visible`, `.modal` has no
`max-height`, and the document does not scroll. A modal taller than the viewport
overflows in both directions and nothing can reach the overflow.

Three mechanisms could give it one, and they are mutually exclusive:

- **A - cap and scroll the modal.** `max-height` plus `overflow-y: auto` on
  `.modal`. The modal box is capped to the viewport; its CONTENT scrolls inside
  it.
- **B - scroll the overlay.** `overflow-y: auto` and `align-items: flex-start`
  on `.modal-overlay`, `margin: auto` on `.modal`. The whole modal box scrolls
  within the backdrop, the familiar mobile sheet pattern.
- **C - compact at short heights.** A `@media (max-height: ...)` block trimming
  the icon, paddings and margins so the modal fits without any scrolling.

## What made them exclusive

`expectModalFitsViewport` (`e2e/helpers.ts`) asserts that the `.modal` box lies
inside the viewport, and that assertion is load-bearing: it is what caught the
`width: 90%`-on-a-content-box overflow in `20260729-141428`.

Under A that promise stays literally true - the cap is exactly what keeps the box
inside the viewport, so the assertion gets STRONGER rather than weaker. Under B
the box is taller than the viewport BY DESIGN, so the same assertion has to be
weakened to "reachable by scrolling" for the box itself, and there is then
nothing left asserting the modal is sized to the screen at all. The two cannot
both hold. That incompatibility is the decision, and it went to the user before
any code was written.

## Chosen: A

```css
.modal {
    max-height: calc(100% - 32px);
    overflow-y: auto;
}
```

Reasons, in order:

1. **It keeps the existing box-inside-viewport promise true.** B retires a guard
   this repo paid for; A tightens it.
2. **`calc(100% - 32px)`, not `100vh`.** The percentage resolves against the
   fixed overlay, which is the layout box actually on screen. `100vh` is the
   LARGE viewport on mobile browsers with a dynamic toolbar - it reports a
   height the player cannot see, which is the exact class of lie this task
   exists to remove.
3. **A percentage cap needs no per-media-block restatement.** The `max-width`
   next to it had to be restated in the `768px` block because converting it to
   an outer width made it depend on the padding (LESSONS.md:
   `converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`).
   `calc(100% - 32px)` does not read the padding, so it holds at every step.

## Rejected: B

Costs the box-inside-viewport assertion, as above. It is also the pattern with
the sharper failure mode: flex centering plus an overflowing item makes the top
of the item unreachable unless `align-items` is moved to `flex-start` and the
centering re-expressed as `margin: auto`, so the correct form is three coupled
declarations across two rules rather than one localized cap.

## Rejected: C

Not wrong, just insufficient, and it is the one option that does not solve the
problem it is aimed at:

- Compaction has a floor. `20260729-101838` adds a stats card and a countdown to
  this same modal; whatever the trimmed layout saves, that work spends.
- Height-axis media blocks in this file are exactly where
  `css-media-blocks-on-different-axes-are-resolved-by-file-order` bit before: a
  `@media (max-height: 700px)` block written above the `max-width: 768px` block
  never applied on any phone.

Compaction remains a legitimate follow-up ON TOP of the escape hatch if the
scrolling modal reads badly on the screens - see the Notes section of `TASK.md`.

## Consequence accepted

The vertical half of `expectModalFitsViewport` changes meaning: from "every
control is visible" to "every control is REACHABLE" (scroll it into view, then it
must be wholly in the viewport). That is what the Definition of Done asks for and
it is unsatisfiable in the old form once the modal scrolls - a control below the
fold of an internal scroll container is correct behaviour. The horizontal
assertions are untouched and stay unconditional.

The cap engages wherever the viewport is shorter than about 363px, so 640x360 -
which fits today with 14.4px to spare - gains a ~3.2px internal scroll. That is
the mechanism working at its threshold, not a regression: no size loses a control.
