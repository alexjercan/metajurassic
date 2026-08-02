# Let the game-over modal fit a landscape phone without scrolling

- PRIORITY: 58
- TAGS: bug, ui, mobile, ux
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a player finishing a round with the phone sideways, I want to see the whole
game-over card at once, so that reaching the buttons is not a scroll I have to
discover.

## Problem

`20260730-111003` gave the modal a vertical escape hatch (`max-height:
calc(100% - 32px)` plus `overflow-y: auto` on `.modal`), which made every action
REACHABLE at every short viewport. It did not make them VISIBLE. At 568x320
(iPhone SE landscape) the action row is cut by the modal's bottom edge, and
there is no persistent scrollbar or other affordance - three half-pills and
nothing that says "there is more below".

RE-MEASURED on master at bb17dcd, after `20260729-101838` added the stats card
and the countdown. The gap is no longer the 11px this task was written around;
win and loss measure identically:

| viewport | content | visible | shortfall |
|----------|---------|---------|-----------|
| 568x320 | 433 | 286 | 147 |
| 480x320 | 433 | 286 | 147 |
| 640x360 | 433 | 326 | 107 |
| 360x320 | 543 | 286 | 257 |
| 360x300 | 543 | 266 | 277 |

The 360px column is larger because BOTH rows wrap there: `.modal-extras-grid`
goes 2x2 (84 -> 144) and `.modal-actions` takes a second line (42 -> 92).

Content budget at 568x320 (`.modal` is `border-box`, cap `calc(100% - 32px)` =
288 outer, 286 client):

| part | height | margin |
|------|--------|--------|
| `.modal` padding | 28 + 28 | - |
| `.modal-icon` | 66.0 | 12 below |
| `.modal-title` | 33.0 | 12 below |
| `.modal-message` | 25.2 | 20 below |
| `.modal-stats` | 39.0 | - |
| `.modal-extras` | 84.1 | 20 above |
| `.modal-actions` | 42.0 | 24 above |

## Why it is worth doing

147px of a 433px card is a third of its height, but it is all SPACING and one
oversized emoji - no copy has to go. A vertical-only compaction at short
heights was prototyped against the live page and measured: the card comes to
271px, fits 286 with 15px to spare, and reads well (screenshot taken at
568x320 - icon, title, answer, stats line, four-cell card, countdown and all
three pills, none clipped). The escape hatch stays as the guarantee for 360px
wide, where the two wraps make it an honestly scrolling modal.

## Steps

- [ ] Record the shape in `DECISION.md`: compaction, not a scroll affordance,
      and VERTICAL-ONLY. Only `padding-top`/`padding-bottom`, `margin-top`/
      `margin-bottom` and `font-size` are trimmed - never `max-width` or
      horizontal padding. That is what lets the block sit on the height axis
      alone with no restatement against `.modal`'s two padding steps
      (LESSONS.md:
      `converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`,
      and the `max-width: 470px` restatement at `src/partials/responsive.css`
      that lesson produced).
- [ ] Add one `@media (max-height: 480px)` block at the END of
      `src/partials/responsive.css`, after the `max-width: 768px` block and
      after the existing 700px/620px brief blocks. Threshold: the uncompacted
      card needs 433 + 32 = 465px of viewport height, so 480 is the first
      round number above the point where it stops fitting. ORDER IS
      LOAD-BEARING (LESSONS.md:
      `css-media-blocks-on-different-axes-are-resolved-by-file-order`) - a
      height block above the width block never applies on a phone.
- [ ] Trim to the measured budget. The prototype that reached 271px:
      `.modal` padding-block 28 -> 12; `.modal-icon` 3.5rem -> 1.75rem and
      margin-bottom 12 -> 4; `.modal-title` 1.8rem -> 1.3rem, margin-bottom
      12 -> 6; `.modal-message` 1.05rem -> 0.95rem, margin-bottom 20 -> 10;
      `.modal-stats` padding-block 10 -> 5, 0.95rem -> 0.85rem;
      `.modal-extras` margin-top 20 -> 10; `.modal-extra` padding-block 8 -> 4;
      `.modal-extra-value` 1.15rem -> 1rem; `.modal-countdown` margin-top
      14 -> 8, 0.9rem -> 0.8rem; `.modal-actions` margin-top 24 -> 10;
      `.modal-btn` padding-block 10 -> 6. Re-measure rather than trusting
      these: they were read off an `addStyleTag` overlay, not the cascade.
- [ ] Add `expectModalNeedsNoScroll` to `e2e/helpers/modal.ts`: assert
      `#modal.scrollHeight <= clientHeight + 1`, with the shortfall in pixels
      in the message. It settles the modal first, like every other helper
      there.
- [ ] Apply it in `e2e/mobile.spec.ts` at the sizes where fitting is the
      promise, not at all five: tag `SHORT_VIEWPORTS` with a per-size `fits`
      flag (true for 568x320, 480x320, 640x360; false for 360x320, 360x300)
      and call the new helper only where it is true. Both variants, as now.
      The escape-hatch tests stay untouched at every size.
- [ ] Cover the OTHER axis in `e2e/modal.spec.ts`'s desktop describe: one
      900x400 viewport, wide enough that the `max-width: 768px` block does NOT
      apply, so the height block is exercised against the desktop padding step
      too. Without it nothing would notice a trim that only works below 768px
      wide - which is the whole failure mode the ordering lesson describes.
- [ ] Read the rendered screens again after the trim, win AND loss, at 568x320
      and 900x400. A compaction that makes the icon or the stats card look
      wrong has traded one defect for another (LESSONS.md:
      `re-render-and-look-after-every-layout-change-not-once-per-task`).

## Definition of Done

- No scroll is needed at 568x320, 480x320 or 640x360, win and loss:
  `#modal.scrollHeight <= clientHeight`. (test: `e2e/mobile.spec.ts`)
- No scroll is needed at 900x400, where the width media block does not apply,
  so the compaction is proven on the height axis alone.
  (test: `e2e/modal.spec.ts`)
- Every action stays REACHABLE at all five short sizes - the escape hatch is
  not removed, and 360x320/360x300 still scroll.
  (test: `e2e/mobile.spec.ts`)
- The actions and the stat cells still hold their single row at 393px and the
  modal still fits every narrow viewport - the trims are vertical, so nothing
  horizontal may move. (test: `e2e/mobile.spec.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Found by reading the rendered screens at the end of `20260730-111003`, which
  no assertion in that task could see (LESSONS.md:
  `re-render-and-look-after-every-layout-change-not-once-per-task`).
- The measurements above were taken on master at bb17dcd with a throwaway
  Playwright spec (seed a finished daily game, set the viewport BEFORE the
  reload, `waitForModalToSettle`, read `scrollHeight`/`clientHeight` and each
  child's box). The spec was deleted; the numbers are the record.
- Proof is red on base: at 568x320 master measures 433 against 286.
- 360x300 is the one size the compaction cannot reach - 362 against 266 even
  trimmed, because both rows wrap. That one keeps the scroll, deliberately.
- Slack at the target sizes is 15px (271 of 286). Thin enough that a wider
  font stack could eat it; the assertion names the shortfall so a regression
  reports a number rather than a reflow. The runner's generic sans is DejaVu
  Sans here and on `ubuntu-latest`, per `src/partials/responsive.css`.
