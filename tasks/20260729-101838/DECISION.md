# Decision: a four-number stat row, gated on the share mode, with pure copy and countdown modules

- DATE: 20260802-184917
- STATUS: ACCEPTED
- TASK: 20260729-101838
- TAGS: ui, modal, retention

## Context

The game-over modal is the whole end-screen ritual: there is no home page to
put a countdown on, and `gameStats.ts` already computes every number the close
could show but shows none of them. Three prior tasks constrain the box before
anything is added to it - `20260729-141428` (the action row spilling a phone),
`20260730-111003` (the modal having no vertical escape hatch at all), and
`20260729-092452` (the reference game's close is four numbers and a share
button, with no histogram).

## Decision

1. **Daily-ness is read from `shareContext.mode`.** `initGame` already resolves
   it - the practice page passes `{ mode: "practice", seed }`, the daily
   default is `{ mode: "daily", seed: getTodaySeed() }` - so the stats card and
   the countdown gate on that and no new `GameOptions` field is added.
   `showWinModal`/`showLossModal` take one options object with `daily?:
   ModalStats`: present means daily, absent means practice.

2. **Four numbers, no distribution histogram.** Played / Win % / Streak / Avg.
   TASK.md's original step 1 asked for "where this game landed in the
   distribution"; these Steps supersede it.

3. **The countdown targets the next LOCAL midnight, by calendar fields.**
   `new Date(y, m, d + 1).getTime() - now.getTime()`, matching `seedToDate` and
   `localDayIndex` in `src/gameData.ts` - never `now + 86400000`.

4. **Two new pure modules, `src/gameOverCopy.ts` and `src/countdown.ts`.**
   `src/ui/modal.ts` keeps everything that touches the DOM, including a 1s tick
   cleared in `hideModal()` and before each start.

## Alternatives considered

- **A new `daily: boolean` on `GameOptions`, passed by each page.** Rejected:
  the practice/daily distinction already exists and is already load-bearing -
  it is what keeps a practice share from masquerading as the daily - so this
  adds a second source of truth for one fact, and the two can disagree.
- **Sniffing the URL inside `src/ui/modal.ts`.** Rejected: puts a routing fact
  inside a widget, and cannot be unit-tested.
- **A mini distribution histogram with the current round highlighted.**
  Rejected: height is the scarce resource in this box, and a 25-row chart is
  the tallest thing that could go in it. The profile page already renders the
  distribution (`src/profile/statsPanel.ts:renderGuessDistribution`), and the
  reference close has none. Additive, so it needs no rework if revisited.
- **Inlining the copy and countdown logic in `src/ui/modal.ts`.** Rejected:
  that module reads `document` at import time and is imported by no Jest test,
  so the DST boundary and the hint-split copy - both cheap in Jest, expensive
  in Playwright - would have had to be pinned through the browser.
- **Elapsed-millisecond countdown arithmetic (`now + 86400000`).** Rejected:
  the DST comments in `calculateStreak` and `localDayIndex` are both scars from
  this form. A 23h night would put the countdown an hour out on exactly the day
  a streak is most fragile.

## Consequences

- Anything that makes a round "practice" for SHARING now also makes it practice
  for the end-screen ritual. That coupling is intended, and `src/game/index.ts`
  should say so at the call site.
- `computeGameStats` runs at game over, walking `localStorage` twice. The share
  button in the same modal already does this on click, so the cost is not new.
- The modal grows taller. The sweeps in `e2e/mobile.spec.ts`
  (`NARROW_VIEWPORTS`, `SHORT_VIEWPORTS`, `expectModalFitsViewport`) are the
  regression net and must stay green without being relaxed.
- A finished round can render its modal more than once per document, so a tick
  started on show without a stop on hide leaks a timer per open.

## Addendum, at implementation (2026-08-02)

5. **The two formatted figures live in `src/gameStats.ts`, not in either
   caller.** `formatWinRate` and `formatAverageGuesses` encode rules - a whole
   percent, and "0" rather than "0.0" with no win to average - that the profile
   panel and the game-over modal must agree on for the same round.
   `src/profile/statsPanel.ts` was moved onto them for daily and practice
   alike. The alternative, formatting inside `src/ui/modal.ts`, is a third copy
   of a two-line rule and the kind of hand-kept mirror this repo has been
   bitten by before; the modal takes ready-made strings (`ModalStats`) and
   decides nothing.

6. **`.modal-extra` is `box-sizing: border-box`, and the one-row promise is
   made at 393px only.** `min-width` sizes the CONTENT box by default, so the
   floor silently gained the padding and border and the row wrapped 3+1 on the
   Pixel 5. The floor is now the outer width the row's arithmetic uses.
   TASK.md's step 6 asked for one line at 320px "by letting it wrap"; the two
   halves cannot both hold, since four cells do not fit a 238px content box at
   any size that still shows their labels. One row at 393px, 2x2 below,
   pinned by `expectStatCardOnOneRow` and `expectStatCardFits`.
