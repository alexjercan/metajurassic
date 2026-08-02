# Retro: Add post-game stats card and next-puzzle countdown

- TASK: 20260729-101838
- BRANCH: feat/postgame-stats-countdown
- REVIEW ROUNDS: 1

## What went well

- One implementation commit, one review round, APPROVE with a single NIT. Every
  DoD proof was already green and non-vacuous when review ran it independently.
- The two pure modules paid off exactly as DECISION.md predicted: the DST
  boundary and the hint-split copy are pinned in Jest for milliseconds, and the
  review's own mutation re-derivation was cheap because of it.
- Two prior planning decisions held under contact: gating on
  `shareContext.mode` rather than a new `GameOptions` field, and refusing the
  distribution histogram. Neither needed revisiting once the modal grew.
- The plan's blocker list was real and correctly sequenced - `20260729-141428`
  and `20260730-111003` had already given the modal its horizontal and vertical
  room, so a taller card landed without reopening either.

## What went wrong

- **A plan step asserted a layout outcome that arithmetic contradicts.** Step 6
  asked to "keep the row on one line at 320px by letting it wrap": four cells
  cannot occupy one line and also wrap, and 238px of content box holds neither.
  It read as sound at plan time because it named the right mechanism (wrapping,
  not a media block) and the right constraint (320px); what it never did was
  multiply four cells by a width. The worker resolved it by pinning both real
  outcomes as numbers - one row at 393px, 2x2 at 320px.
- **A layout number came out wrong by exactly the padding.** `min-width`
  applies to the content box, so a 56px floor rendered 74px cells and the row
  wrapped 3+1 on the Pixel 5. `.modal`'s own `max-width` comment, four rules
  further up the same file, already documented that trap. Reading the
  neighbouring rule before writing the new one would have saved the round trip.
- **A countdown test flaked on a slower run** (expected 43109, got 43104).
  Playwright's `clock.install` keeps advancing with real time, so the value read
  at the start of the test and the one read after a 90s fast-forward differed by
  however long the test took. `clock.pauseAt` fixes it, but only at a time ahead
  of the already-running clock.

## What to improve next time

- Breadth: 17 files is what this feature costs - two pure modules, a shared
  template, CSS, wiring, and the tests for each. One split was available and
  missed: `src/gameOverCopy.ts` fixes the hint-aware loss copy, which TASK.md
  records as its own Review Finding and which was independently landable
  without the stats card or the countdown. Folding it in cost nothing here, but
  a bug listed separately in a task's findings is a split candidate by default.
- Churn: none to attribute - the single review round found no BLOCKER or MAJOR.
  The one plan-time question that would have caught step 6's contradiction is
  the arithmetic itself: a step that promises a geometric outcome at a named
  width should carry the multiplication, or promise the outcome as a test to be
  written rather than a fact.
- Context: no checkpoint, compaction warning, or handoff was recorded, and the
  work fit one pass. Nothing to split or defer on that basis.

## Action items

- None owed. R1.1 is a NIT (`Avg 0` reading as an average rather than "none
  yet") deliberately left open; it changes the profile page too and is one edit
  in the now-shared formatter whenever it is wanted.
