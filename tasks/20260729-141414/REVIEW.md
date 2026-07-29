# Review: Keep the tree visible on mobile after a guess

- TASK: 20260729-141414
- BRANCH: fix/mobile-tree-visible

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

- [x] R1.1 (MAJOR) e2e/helpers.ts:177 - `expectTreeNotOccludedByPanel` cannot
  detect the defect this task exists to fix, and its comment claims the opposite.
  `expect.poll(...).not.toContain(...)` passes on the FIRST sample that does not
  match, and `.info-panel` animates in over `transform 0.4s`, so immediately
  after a guess the panel is still off-screen when the first sample is taken.
  Demonstrated: with the `!isNarrowViewport()` guard reverted and only the
  `not.toHaveClass(/active/)` line removed from the two "tree stays visible"
  tests, they PASS with the panel auto-opening over the tree. Only the class
  assertion is doing any work; the hit test is decoration. Suggested change: make
  the helper deterministic - wait for the panel's transition to settle, then
  assert once - and fix the comment.
  - Response: Confirmed and fixed. Re-derived the claim independently before
    adopting it (guard reverted, class assertions removed): the post-guess test
    PASSED with the panel animating in over the tree. `e2e/helpers.ts` now waits
    for the panel to stop moving (`waitForPanelToSettle`: rAF loop until the
    panel's `left` is stable for ~6 frames, 3s deadline) and then asserts ONCE,
    so the poll-any-sample hole is gone. Re-ran the same sabotage against the
    repaired helper: both tests now fail on the hit test alone, reporting
    "inside #info-panel -> img.svg-img (panel left=0, viewport width=393)". The
    comment now states plainly what the helper does and does not prove.
- [x] R1.2 (MINOR) tasks/20260729-092315/DECISION.md:28 - the reversal is
  recorded on one side only. That record's "Same behavior on desktop and mobile
  (no breakpoint fork)" section still reads as current policy with no forward
  pointer, so a cold reader landing there gets the superseded rule. Suggested
  change: append a SUPERSEDED-IN-PART note pointing at this task's DECISION.md.
  - Response: Done, as an APPEND under that heading (the task trail is
    append-only history, so the original text is untouched). The note scopes the
    supersede precisely: the one-rule-for-both-viewports finding still holds for
    the pre-first-guess screen it was written about, and stops holding after a
    guess.
- [x] R1.3 (MINOR) tasks/20260729-125313/TASK.md:45 - that still-open task's DoD
  says "The panel still auto-opens after a fresh guess and on a hint purchase",
  which this change makes false on narrow viewports. `20260729-092327` got an
  interim note in this diff and `20260729-125313` did not, though the task Notes
  name both. Suggested change: add the same style of interim note narrowing its
  DoD to desktop.
  - Response: Done. `tasks/20260729-125313/TASK.md` now carries an interim note
    saying the phone half of that bug is already fixed here (with the pinning
    test named), that the desktop reload and the page-load-vs-fresh-guess
    contract change remain its work, and that its DoD item needs narrowing to
    desktop - while noting the hint-purchase half of that item still stands.
- [x] R1.4 (MINOR) src/game.ts:210 - the hint handler's comment is now wrong on
  the path this change created: "once there is a last guess, the `updateUI()`
  above has already opened the panel unless the player closed it by hand". On a
  narrow viewport `updateUI()` no longer opens it at all, so a mid-game hint on a
  phone produces no panel - three guesses spent for only a tree redraw and a tab
  marker. Suggested change: update the comment, and record in `DECISION.md`
  whether a mid-game hint on a phone is meant to open the panel.
  - Response: Confirmed as a real defect this change introduced, not just a
    stale comment: three guesses bought nothing visible on a phone. Fixed - the
    condition is now `!state.lastGuessId || isNarrowViewport()` (`isNarrowViewport`
    exported from `src/ui/panel.ts`), the comment enumerates both cases, and
    `DECISION.md` gains an "An explicit request still opens the panel, on every
    viewport" section covering node taps, the pull tab and hint purchases. Pinned
    by a new test, "a mid-game hint on a phone still shows its clade".
- [x] R1.5 (MINOR) src/style.css:757 - the scroll-shadow cover gradients paint
  opaque `var(--bg-dark)` over the top and bottom 28px of `.card-content`, but
  `.info-panel`'s background is a gradient plus `backdrop-filter`, so the cover
  does not match its surroundings and leaves a flat near-black band at both edges
  of the card text. The literal `rgba(10, 12, 16, 0)` also hand-duplicates
  `--bg-dark`, so a palette change silently desynchronises the two.
  - Response: Second half accepted, first half disputed on the evidence.
    `.card-content` does not sit on the panel background: `.museum-card::after`
    (src/style.css:574) paints `var(--bg-dark)` at `inset: 2px` with `z-index: 1`,
    underneath `.museum-card-inner` at `z-index: 2`, so the card's own opaque
    `--bg-dark` is what the cover gradients have to match - and they do. The
    re-shot phone screenshots show no flat band at either edge; what they show is
    the intended amber shadow under the clipped sentence, which moves to the top
    edge once the text is scrolled to its end. The hand-duplicated literal was
    real: `rgba(10, 12, 16, 0)` is now `var(--bg-dark-fade)`, defined next to
    `--bg-dark`.
- [x] R1.6 (NIT) src/ui/panel.ts:33 - `isNarrowViewport()` is evaluated per call,
  but nothing reacts to the resize itself: a desktop window with the panel already
  `active`, narrowed below 768px, leaves a now-full-width panel parked over the
  tree. Not reachable on a real phone. Either handle `matchMedia(...).change` or
  say in `DECISION.md` that the resize case is deliberately left to the player.
  - Response: Recorded rather than handled, per the second option. `DECISION.md`
    gains a "Resizing across the breakpoint mid-game is left to the player"
    section: a real phone never crosses this breakpoint, the pull tab reads
    "Close" in exactly that state, and a `matchMedia` change listener that
    force-closed the panel would mean the window manager dismissing a card the
    player deliberately opened - a worse behaviour than the one it fixes.

### Verification notes (round 1, out-of-context reviewer)

Checked `ss -ltnp` for a stale listener on 8080/8181 before starting - nothing
bound. Ran `nix develop -c npm run ci` in the worktree: exit 0, 179 Jest tests
across 7 suites, 33 Playwright tests passed / 1 skipped, matching the Outcome
section's claim. Every automated DoD item was confirmed by name in that run. The
diff to `e2e/panel.spec.ts` is additive only, so the two `manuallyClosedPanel`
tests really are unmodified; the only test deletion anywhere is the inline
`evaluate` in `mobile.spec.ts:47`, replaced by the helper.

Three sabotage runs, all restored afterwards. Reverting the narrow-viewport guard
turned three mobile tests red for the right reasons. With that revert applied,
removing only the `not.toHaveClass(/active/)` line from the two "tree stays
visible" tests made both PASS with the panel auto-opened over the tree - the
evidence behind R1.1. Deleting the mobile `.arena { padding-top: 56px }` rule
failed the anchoring test at gap 0.268 versus the 0.2 threshold (it measures
~0.125 with the fix), so that test is load-bearing with a reasonable margin.
Sabotaging the pre-guess branch to call `openPanel()` confirmed the first-load
occlusion test still goes red.

Grepped the diff for non-ASCII: only the pre-existing glyph, no new em dashes,
smart quotes or arrow glyphs. README and AGENTS.md are unaffected by the change;
the two stale task records are R1.2 and R1.3. The Outcome section's
self-assessment is honest - the F3.9 "partly addressed" admission is accurate
rather than understated.

Pending user checks (the task's two `manual:` DoD items, which no test covers): a
long clade description reachable in full with the cut-off visibly reading as a
scroll on a phone viewport (see R1.5); and the pre-guess arena not reading as
mostly blank - the Outcome itself concedes this one is not fully met and defers
it to `20260729-092327`.

### In-session re-derivation

R1.1 was re-derived independently before being adopted, per the review skill's
rule against taking an out-of-context round wholesale: guard reverted, class
assertion removed from both tests, `npx playwright test -g "tree stays visible"`
gave "1 failed, 1 passed" - the post-guess test PASSED with the panel animating
in over the tree, while only the reload test (where the panel is already open at
first paint, with no transition to hide behind) went red. Confirmed MAJOR.

## Round 2

- VERDICT: APPROVE
- REVIEWER: out-of-context

All six round 1 findings confirmed RESOLVED by the same out-of-context reviewer,
each by re-verification rather than by reading the responses.

- R1.1 RESOLVED - the round-1 sabotage was repeated exactly (guard reverted, both
  `not.toHaveClass(/active/)` lines deleted) and the two tests now FAIL on
  `helpers.ts:210` with "inside #info-panel -> img.svg-img (panel left=0,
  viewport width=393)", where in round 1 they passed. The hit test carries the
  assertion on its own. `waitForPanelToSettle` was checked for the opposite
  failure mode and fails safe in every branch: deadline fired or panel settled
  OPEN both resolve and let the caller assert against what is actually on top. A
  stalled rAF would hang to Playwright's own timeout rather than the 3s guard -
  still a failure, never a false pass, and not reachable in headless Chromium.
- R1.2 RESOLVED - the note is appended under the named heading, scoped to
  post-first-guess, pointing forward; the original text is untouched.
- R1.3 RESOLVED - interim note present and in the same style as the
  `20260729-092327` one. One sentence in it was inaccurate; see R2.1.
- R1.4 RESOLVED - removing `|| isNarrowViewport()` fails the new mobile hint test
  at `mobile.spec.ts:194`, so it is load-bearing. The `manuallyClosedPanel`
  interaction was traced independently: the phone hint's `openPanel()` does clear
  the flag, but the narrow branch of `renderLastGuess` short-circuits on the
  viewport before consulting it, so later guesses still do not auto-open, and the
  desktop path is unchanged with `e2e/panel.spec.ts` still green.
- R1.5 RESOLVED, and the pushback was judged CORRECT on the CSS itself:
  `.card-content` is inside `.museum-card-inner` (`z-index: 2`, no background)
  within `.museum-card` (a stacking context), with `.museum-card::after` painting
  opaque `var(--bg-dark)` at `z-index: 1` directly beneath and nothing painting
  between them. The covers match the card, not the panel. The reviewer noted a
  residual not worth a finding: the `--bg-dark-fade` channels are still typed by
  hand rather than derived (`rgb(from var(--bg-dark) r g b / 0)`), but they now
  sit adjacent with a comment, which is what the finding asked for.
- R1.6 RESOLVED - recorded rather than handled, one of the two options offered,
  and the record matches the code.

- [x] R2.1 (MINOR) tasks/20260729-141414/DECISION.md:65 - the new "An explicit
  request still opens the panel, on every viewport" section claimed the request
  paths "open the panel on a phone exactly as they do on desktop", listing
  "buying a hint, at any point in the game". False in both directions once the
  player has closed the panel by hand: on desktop a mid-game hint does NOT open
  it (deliberate, pinned by `e2e/panel.spec.ts`), while on a phone it now always
  does. The same claim appeared at `tasks/20260729-125313/TASK.md:78`, where it
  could mislead whoever picks that task up into "fixing" desktop against its own
  test. The behaviour is fine; only the records were wrong.
  - Response: Correct, and accepted as stated - the records overclaimed a
    symmetry the code does not have. Both sentences are rewritten. DECISION.md now
    lists the hint case as two separate paths (before the first guess on any
    viewport; at any point on a narrow viewport) and explains why the asymmetry is
    deliberate: on desktop a manual close is a refusal of a card that would
    otherwise reappear beside the tree every guess, whereas on a phone nothing
    reappears on its own, so a hint the player paid three guesses for has no other
    way to show its product. The `20260729-125313` note now spells the same split
    out and says explicitly not to "fix" the desktop case, naming its test.

### Verification notes (round 2, out-of-context reviewer)

`ss -ltnp` checked for stale listeners on 8080/8181 first (none bound).
`nix develop -c npm run ci`: exit 0, Playwright 34 passed / 1 skipped (up one from
round 1, the new mid-game-hint test), 179 Jest tests across 7 suites. Two sabotage
runs, both reverted and confirmed with `git status --short` showing only
`?? node_modules`. Read the full branch diff and the `.museum-card` /
`.card-content` stacking directly. Grepped the round 1 fix commit's added lines
for non-ASCII: none.

R2.1 was a records-only finding fixed after the verdict; the code the reviewer
approved is unchanged by it.

Pending user checks (the task's `manual:` DoD items - APPROVE does not resolve
these; they are the human-acceptance gate at flow Finish):

- A long clade description is reachable in full, with the cut-off visibly reading
  as a scroll rather than a truncation, on a phone viewport.
- The pre-guess arena does not read as mostly blank. The task's Outcome section
  concedes this one is only PARTLY met: the tree is top-anchored so it no longer
  floats between two blank bands, but the room below it stays empty until
  `20260729-092327` (onboarding copy) has content to put there.
