# Fix game-over modal overflow on phone viewports

- STATUS: CLOSED
- PRIORITY: 76
- TAGS: bug, ui, mobile

## Story

As a player finishing a round on my phone, I want the game-over buttons to be fully on screen, so that I can share the result I just earned.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F3.8), ON-SCREEN.

- `05-win-modal-seed42-mobile.png` (Pixel 5 viewport): the `.modal-actions` row is wider than the viewport. "OK" is clipped at x=0 and the "Share" button runs off the right edge.
- Share is the retention action, and it is the one hanging off the screen.
- The same modal is fine at 1280x800 (`06-loss-modal-seed1-desktop.png`), so this is a narrow-viewport layout issue in `src/style.css`, not modal logic.

## Diagnosis

Two independent overflows stack up, both in `src/style.css`. Read off the rules
(to be confirmed by measurement in the failing test before the fix):

1. **The modal box itself is wider than the viewport.** `.modal` (style.css:1167)
   sets `width: 90%` with `padding: 40px 48px` and no `box-sizing`, so its
   default `content-box` makes the outer width `0.9v + 96 + 2px border`. That
   exceeds the viewport whenever `0.9v + 96 > v`, i.e. below 960px wide -
   masked above ~467px only because `max-width: 420px` caps the content box
   first. The `@media (max-width: 768px)` block (style.css:2101) trims padding
   to `28px 24px`, which shrinks the overshoot to `0.9v + 48 + 2` - still
   ~11px too wide at the Pixel 5's 393px, i.e. ~5px clipped on each side.
2. **The action row is far wider than the modal's content box.** `.modal-actions`
   (style.css:1235) is a `display: flex` row with `gap: 12px` and NO
   `flex-wrap`, and `.modal-btn` (style.css:1248) carries `padding: 10px 40px`
   - 80px of horizontal padding per button. Three buttons (OK, Practice,
   Share-plus-icon) need roughly 410px against a ~306px content box at 393px
   wide, so the row spills ~50px past each edge. `justify-content: center`
   splits the overflow both ways, which is exactly the reported symptom: "OK"
   clipped at x=0 and "Share" off the right edge.

Correction to the finding above: the "Practice" action is NOT practice-only.
`src/index.html` is the template for BOTH the daily and the practice page
(`webpack.config.js` emits `practice/index.html` from it), and nothing hides
`.modal-btn-practice` on either - `grep -rn modal-btn-practice src/` matches
only the template. So all four cases (win/loss x daily/practice) render the
same three-button row, and none is wider than another. The four cases are still
worth pinning, but as a guard against divergence, not because one is the widest.

## Steps

- [x] Add the failing mobile E2E assertion FIRST: every `.modal-actions`
      control, and `.modal` itself, lies within the viewport bounds. Watch it
      fail and record the measured overshoot for each of the two causes.
- [x] Fix cause 1: give `.modal` `box-sizing: border-box` so `width: 90%`
      includes its own padding and border.
- [x] Fix cause 2: let the action row survive any label width -
      `flex-wrap: wrap` on `.modal-actions` as the guarantee, plus a narrow
      viewport reduction of `.modal-btn`'s horizontal padding so the three
      buttons still sit on ONE row at 393px rather than wrapping by default.
      Keep the wrap as the safety net so a wider font stack (CI has a different
      one) degrades to two rows instead of overflowing.
- [x] Extend the assertion to all four cases: daily win, daily loss, practice
      win, practice loss. Daily seeds finished state through
      `seedFinishedDailyGame`; practice cannot (it always calls
      `createNewGameState`), so it plays a `?seed=42` round out for real.
- [x] Sweep narrow AND short viewports, not just Pixel 5 (LESSONS.md:
      `a-layout-assertion-at-one-viewport-is-a-sample-of-one`), and screenshot
      each of the four rendered states after the final layout change
      (LESSONS.md: `re-render-and-look-after-every-layout-change-not-once-per-task`,
      `render-every-branch-of-a-message-side-by-side`).

## Definition of Done

- All game-over actions are within the viewport on a phone. (test: `e2e/mobile.spec.ts` bounding-box assertion)
- Win and loss, daily and practice all pass it. (test: same spec, four cases)
- The new assertion is proven to DISCRIMINATE: it fails on this commit's parent
  and passes after the fix. (cmd: `git stash` the style.css fix, re-run the spec, restore)
- `npm run ci` passes. (cmd: `npm run ci`)
- `tatr check --ledger LESSONS.md` is clean. (cmd: `tatr check --ledger LESSONS.md`)

## What was built

`src/style.css`, three rules:

1. `.modal` gets `box-sizing: border-box`, and its `max-width` is restated as
   the same OUTER width the old content-box `420px` produced, PER PADDING STEP:
   `518px` at the desktop padding (420 + 96 + 2) and `470px` inside the 768px
   block at the trimmed padding (420 + 48 + 2). Both restatements are needed -
   review round 1 (R1.2) caught that a single desktop-derived cap silently
   widened the 520-768px band from master's 470px outer / 420px row to 518px /
   468px, a 48px change on iPad-portrait widths from a fix meant to touch
   clipping only.
2. `.modal-actions` gets `flex-wrap: wrap`. This is the guarantee: the row can
   never spill off a screen again, whatever the labels or font stack do.
3. `.modal-btn` horizontal padding goes 40px -> 32px on desktop, and 18px under
   768px, with `.modal-actions` gap 12px -> 10px there.

Rule 3 was NOT in the plan. `flex-wrap` exposed that the three actions needed
421.6px against the modal's 420px content box, so they had ALSO been overflowing
on the desktop - by 1.6px, invisibly, absorbed by the 48px padding. With `wrap`
that hairline became a wrapped second row at 1280px. 32px gives the row honest
room (373.6px in 420px) and `e2e/modal.spec.ts` now pins the desktop row at one
line, with the margin printed in the failure message.

A fourth change came out of the measurement work: `.modal-btn`'s
`transition: 0.2s` was `all`, so PADDING animated when the 768px breakpoint was
crossed, and three successive samples of the same layout read 31.0px, 28.9px and
23.9px of padding. It is narrowed to the three properties `:hover` actually
changes, so a resize lands on a real layout instead of sliding between two.

## Measured

Pre-fix, both causes, three widths (`.modal` overshoot each side / OK button
left edge / Share button right edge):

| viewport | `.modal` | OK left | Share right |
|---|---|---|---|
| 393x851 | 5.3px | -14.3 | 14px past |
| 360x640 | 7.0px | -30.8 | 31px past |
| 320x568 | 9.0px | -50.8 | 51px past |

Post-fix, swept by WIDTH at 320/360/393/400/480/520/576/600/700/768/769/800/
1024/1280 (all 900px tall): every control inside the viewport and inside the
modal's own content box at every width, one row from 393px up, two rows at 360px
and 320px by design (`Share` centred on the second line). The HEIGHT axis is a
single case, `393x500`, added to the spec's swept set in review round 1 (R1.4)
because the other entries are all tall enough that the vertical half of the
assertion could not fail. Screenshots of all four states (win/loss x
daily/practice) at 393/360/320 plus desktop 1280 were read, not just measured.

Single-row margins, because the 393px pin spends them: 18.1px at 393px
(285.6px of buttons in a 303.7px row) and 46.4px from 769px up (373.6px in
420px). 151.6px of the 393px figure is label TEXT, so labels ~12% wider would
wrap the row - and `fc-match sans-serif` here resolves to DejaVu Sans, the same
wide generic `ubuntu-latest` falls back to once `"Segoe UI"` and `Tahoma` miss,
so that margin is measured on the widest face in play rather than a flattering
local one (review round 2, R2.1).

Discrimination, all three run against the code that shipped:

Each mutation names exactly which rules were reverted, and each figure is what
the run printed rather than what it was expected to print:

- master's whole `src/style.css`: all 5 mobile cases fail,
  `.modal starts 5px left of the 393px viewport`.
- `box-sizing`/`max-width` kept, `flex-wrap` dropped, desktop padding back to
  `10px 40px`, both mobile overrides (`gap: 10px`, `padding: 10px 18px`)
  deleted: all 5 fail, `#modal-close-btn starts 14px left of the 393px
  viewport`. (An earlier note said 12px; that run had kept the mobile `gap`,
  which is part of the fix - review round 1, R1.5.)
- `flex-wrap` dropped alone, everything else intact: the 320px case fails,
  `#modal-close-btn starts 6px left of the modal's own content box`. Before
  round 1 this mutation was GREEN, because the assertion only measured the
  viewport; R1.1 added the modal-content-box containment that catches it.
- both mobile overrides deleted alone: the 393px case fails, `at 393px the
  373.6px of actions wrapped inside a 303.7px row`. Also green before round 1
  (R1.3) - fitting the viewport does not prove the row is one line.
- `flex-wrap` kept, desktop padding back to `10px 40px`: the desktop pin fails,
  `the 421.6px of actions wrapped inside a 420.0px row`.

The second mutation is why `min-width: 0` is NOT in the shipped CSS. It was
written into the first draft, and with the flex floor removed the pills shrink
below their own labels rather than spill - which kept all five viewport
assertions GREEN on a layout with no `flex-wrap` and the old 40px padding. A
speculative knob that made the task's own failure unfalsifiable.

## Notes

- Round 1 of review found that three of the four CSS changes were individually
  unfalsifiable by the first draft of the assertions: only reverting master's
  whole stylesheet reddened them. Two checks were added (containment in the
  modal's own content box, and a single-row pin at 393px), and every mutation
  above is now discriminated by a named test.
- `20260729-101838` will add a stats card and countdown to this same modal, making it taller and wider. Land this first, or that task inherits the overflow.
- Not in scope: whether the practice page should still offer a "Practice" link
  in its own game-over modal. It is a product question, not the overflow bug;
  raised at the plan gate.
