# Review: Improve in-game onboarding and hint clarity

- TASK: 20260729-092327
- BRANCH: feat/onboarding-brief-hint-copy

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

- [x] R1.1 (MAJOR) src/style.css:338 - The brief is mounted inside `#arena`,
  which is `overflow: auto`, and it only fits by luck at the one desktop size
  the suite tests. Measured: at 1280x720 the arena overflow is exactly 0px (zero
  slack); at 1440x660 `#brief-how-to-play` sits 27px below the arena's bottom
  edge and the brief's last line and button are sliced off; at 1366x600 and
  1024x640 the arena overflows by 110px / 70px. Worse, this branch's own
  `#input-error` makes it fail at the tested size too: typing an invalid guess
  pre-guess grows `.bottom-bar` and puts the arena into 30px of overflow at
  1280x720. `expectInsideArenaWithoutScrolling` is only ever run at 1280x720 and
  Pixel 5, so the "is fully on screen" DoD is not actually held. Mount the brief
  outside the clipping scroll container, and add desktop E2E at a short viewport
  and one with `#input-error` visible.
  - Response: Confirmed independently before acting (13px past the arena at
    1440x660, 20px at 1366x600, 0px slack at 1280x720, and 30px of arena
    overflow with the inline error). Fixed as suggested: the brief is now a flex
    sibling of `#arena` inside `#arena-wrapper` with `flex-shrink: 0`, so the
    arena yields the room instead of the brief being cut (`src/game.ts`
    `syncOnboardingBrief`, `src/style.css` `.onboarding-brief`).
    Three consequences, each dealt with rather than absorbed:
    (a) `#input-error` no longer changes layout height at all - it is absolutely
    positioned inside `.input-wrapper` and `.bottom-bar` reserves its room in
    padding-bottom, so a rejected guess cannot rearrange the board;
    (b) `.arena.has-brief` padding is now 0 - at 1440x660 the arena is almost
    exactly the two-node tree's height, so any pre-guess padding IS the
    overflow;
    (c) a `@media (max-height: 700px)` compaction, because the brief was making
    a PRE-EXISTING short-window arena overflow worse. Measured against the
    master build: master overflows 19px at 1440x660 and 84px at 1366x600; this
    branch is now 0px and 43px, i.e. strictly better than master at every size
    swept while also carrying the brief.
    New pins: `is not clipped at 1440x660 / 1366x600 / 1280x620`, `is not
    clipped while the inline error is showing` (asserting arena overflow
    directly, which is what actually regressed), and `does not push the pre-guess
    tree out of the arena at 1440x660`. All four were verified to FAIL with the
    mount reverted (32px, 30px, 32px, and 40px respectively).
  - CORRECTION (round 2, R2.3): the sentence above is wrong as committed. Those
    reverts were run against an EARLIER revision of the helper and were not
    re-run after `expectFullyVisibleWithin` was rewritten to measure against
    `.game-area`; the rewrite dropped the `scrollHeight <= clientHeight` check,
    which made clipping by `#arena`'s own scroll box invisible to it. Re-run on
    the committed branch, only ONE pin failed. The helper has since been
    strengthened with a `toBeInViewport({ ratio: 1 })` intersection test, and the
    re-run now fails TWO ("is not clipped at 1366x600" and "at 1280x620"). The
    1440x660 and inline-error cases do NOT pin the mount and should never have
    been claimed to. The accurate statement is in the R2.3 response below.
- [x] R1.2 (MINOR) tasks/20260729-092327/TASK.md:132 - "the bar measures 68px -
  the exact pre-change baseline, so naming the hint's product cost the phone
  board nothing" is licensed only by the Pixel 5 (393px) measurement. At 320x568
  and 360x740 the bar is 76px on this branch vs 68px on master (+8px). The claim
  is broader than the sweep behind it. Either narrow the sentence, or add a
  360px E2E case and hold the baseline there.
  - Response: Accepted; the over-claim was real. Re-measured independently and
    got 74px rather than 76px at both widths, but the finding stands - it
    exceeds master's 68px, and the branch's own 72px assertion would have failed
    there, so the guard was wrong as well as the prose.
    Fixed by replacing the metric rather than widening it. The pixel count was a
    proxy for the thing the design actually rejected - a separate always-on line
    in the top bar - and it was wrong in both directions: it passed at 393px
    while the chip escaped sideways off the screen (see R1.3's sibling issue,
    already caught before this round), and it failed at 360px on a chip that had
    merely wrapped inside a still-single row. The E2E now asserts the invariant
    at 393px, 360px and 320px: the counter and the chip share a row (compared on
    CENTRES - `.top-bar` is `align-items: center`, so a taller chip shifts tops
    by ~14px while still sharing the row), the chip's right edge is inside the
    viewport, and `#hint-text` is not clipped inside the chip. TASK.md now
    states what was measured at which width and stops generalising, citing
    `a-measurement-licenses-a-claim-only-over-the-range-it-swept`.
- [x] R1.3 (MINOR) src/style.css:1890 - `.hint-text` drops to `font-size:
  0.63rem` (~10.1px) on phones to make the longer sentence fit. 10px is below a
  comfortable minimum for body copy and it is the line carrying the hint's
  product and price. Prefer keeping >= 0.7rem and buying the room elsewhere.
  - Response: Agreed, and it was the wrong trade - the sentence is the entire
    point of the change, so it is the last thing that should have been shrunk.
    Restored to `0.7rem`. It now wraps to two lines below ~360px and the chip
    grows a few px there, which is accepted and is exactly why R1.2's guard had
    to become the single-row invariant instead of a height threshold.
- [x] R1.4 (MINOR) playwright.config.ts:12 - `E2E_PORT` is a new
  developer-facing knob and the remedy `LESSONS.md` prescribes for the stale-8080
  hazard, but it is documented only inside this task's TASK.md. Add a line to
  `AGENTS.md`'s "Build, run, test" section so the next session finds it without
  reading a closed task record.
  - Response: Done. `AGENTS.md` "Build, run, test" now lists the
    `E2E_PORT=8181 npm run test:e2e` form and carries a short paragraph on the
    `reuseExistingServer` hazard, the `ss -ltnp | grep :8080` check, the symptom
    to recognise, and the pointer to the ledger entry.

Verification notes for this round, recorded as prose because they are not
findings:

- The out-of-context reviewer executed both `cmd:` DoD proofs and reported them
  passing on their stated criteria, and ran a test-deletion experiment in a
  scratch copy confirming the `box-sizing`, brief-gate and `.arena.has-brief`
  hunks are each genuinely pinned.
- It judged the one changed existing assertion (`test/gameState.test.ts`,
  `/already been guessed/i` -> `/already guessed "Allosaurus"/i`) a legitimate
  tightening rather than a massage, since the new regex asserts strictly more.
- Round 1 also required changing an assertion this task does NOT own:
  `20260729-141414`'s "the pre-guess tree is anchored near the top of the arena"
  measured `(treeTop - arenaTop) / arenaHeight < 0.2`. Its numerator is
  unchanged at 56px, but the arena is shorter now that the band BELOW the tree
  is filled, so the ratio rose to 0.23 - the proxy degrades precisely because
  the blank space F3.9 complained about stopped being blank. It was replaced,
  not relaxed, with a statement of the same intent that does not depend on what
  fills the space below ("the tree sits just below the pull tab": at or below the
  tab's bottom edge, and within 32px of it), plus a NEW test asserting the band
  below the tree is filled. The replacement still fails the original F3.9 layout,
  where the desktop 120px padding put the tree 76px below the tab. Flagged here
  explicitly so round 2 can judge whether that was a fair substitution.
- A partially-visible info panel at the right edge of a 1440x660 screenshot was
  investigated and is not a regression: measured closed-panel geometry is
  identical on this branch and on the master build (x=1461 at a 1440px viewport,
  i.e. fully off-screen). The screenshot had caught the documented unstyled
  `style-loader` frame before the transform applied.
- Pre-existing issues the reviewer noted, NOT fixed on this branch and to be
  filed separately: `src/index.html` hardcodes `Guesses Left: 25` and
  `src/faq.html` hardcodes "25 attempts" (same constant-copy family this branch
  fixed for `HINT_COST`), and `#hint-box` is a `div` with no button role, so the
  hint is not keyboard reachable.
- Full gate after the fixes: `E2E_PORT=8181 npm run ci` exits 0 - format and
  lint clean (one pre-existing warning in `src/ui/treeVisualizer.ts`, present on
  master), Jest 200/200, Playwright 57 passed / 1 pre-existing `test.fixme`.

Pending user checks (the task's open `manual:` DoD items; APPROVE does not
resolve these):

- playtest the first minute without opening the FAQ;
- inspect the hint affordance on desktop and mobile.

## Round 2

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

Round 1's R1.1-R1.4 were all confirmed RESOLVED by the round-2 reviewer, with
the caveat that the `#input-error` half of the R1.1 fix introduced R2.1 below.

- [x] R2.1 (MAJOR) src/style.css:976 - Making `#input-error` `position:
  absolute` with a fixed reservation in `.bottom-bar`'s padding under-reserves:
  the reservation covers one line and the real messages are two. Measured: on
  Pixel 5 the ordinary rejection renders 30px tall, overhangs `.bottom-bar` by
  9px, and its second line is overlapped by the footer; a longer typed name
  renders 45px tall, overhangs by 24px, and two of its three lines are
  unreadable. Desktop 1280x720 is the same failure at 3px. A new regression from
  46c51a0 - at e0bba90 the message was in flow and fully readable. Also,
  `playwright.config.ts`'s `testMatch: /mobile\.spec\.ts/` means the inline error
  has zero phone coverage.
  - Response: Confirmed and fixed - this was the worst kind of regression, since
    it made unreadable the very feedback the task exists to add, and I never
    rendered a real message at phone width after changing how it was positioned.
    The message is back in NORMAL FLOW and `.bottom-bar`'s padding is back to
    its original values.
    Of the three options offered I took none of them literally, and the
    reasoning is recorded in the rule: capping to one line cannot work (the
    messages quote the name the player typed, and the input is cleared on
    rejection, so the name is the only record of what bounced - and a long
    dinosaur name is 23 characters, which cannot fit one line at 320px);
    reserving the tallest message permanently costs ~45px of a phone's bottom
    bar always, for a message that is usually absent. So the trade is inverted
    on purpose: showing the error DOES shift the board slightly, and that is
    accepted, because a transient shift on an error the player just caused is a
    smaller harm than text drawn behind the footer. If round 3 disagrees with
    that ranking, the min-height option is the fallback.
    Phone coverage added, in `e2e/mobile.spec.ts` so it actually runs on the
    Pixel 5 project: the rejection message is asserted inside `.bottom-bar`,
    above `footer`, and on screen, for a short name AND a 26-character one.
    Verified by re-introducing the absolute positioning: all three new
    assertions go red ("#input-error overhangs .bottom-bar by 14px").
- [x] R2.2 (MAJOR) e2e/mobile.spec.ts:233 - The replacement for
  20260729-141414's F3.9 assertion does not catch the layout it claims to catch.
  The gap is computed from viewport-relative rects, but `#arena` is a scroll
  container and `renderTree` scrolls it, so the measured gap already has the
  auto-scroll subtracted out. With the anchor reverted the new test reads 25px
  and PASSES, where the old assertion reads 0.299 and would have FAILED. The
  comment's "76px below the tab" is a scroll-corrected figure the test never
  computes. Fold `arena.scrollTop` back in, or assert the tree's offset inside
  the arena's content box, then re-run the revert and confirm it goes red.
  - Response: Confirmed and fixed. This one was worse than a weak assertion - the
    comment asserted a verification ("still fails the original F3.9 layout") that
    I had reasoned about rather than executed, which is precisely the failure the
    ledger's `absence-proving-greps-must-be-run-when-written` and
    `never-add-a-tolerance-to-silence-an-undiagnosed-failure` warn about.
    Rewritten to the suggested scroll-independent form: `tree.offsetTop -
    arena.offsetTop`, asserted between 44px (clears the 36px tab sitting 8px
    down) and 72px. Then the revert was actually RUN, not reasoned about: with
    the mobile `.arena` / `.arena.has-brief` padding-top put back to the desktop
    120px, the test now fails with "the tree floats 120px into the arena, well
    below the pull tab". So the substitution now discriminates exactly where the
    original did.
- [x] R2.3 (MINOR) tasks/20260729-092327/REVIEW.md (R1.1 Response) - "All four
  were verified to FAIL with the mount reverted" does not reproduce; only 1 of 5
  pins fails. The round-2 helper rewrite dropped the round-1 `scrollHeight <=
  clientHeight` check and measures against `.game-area`, so clipping by
  `#arena`'s own scroll box is invisible to it. Correct the Response, and note
  the residual: `#arena` still overflows 60px at 1366x600 and 40px at 1280x620
  (better than master's 84px/64px, but not the "0px" the record implies).
  - Response: Confirmed - the claim was true when I ran it and false by the time
    I committed it, because I rewrote the helper afterwards and did not re-run
    the experiment. A CORRECTION note is now attached to the R1.1 Response above
    rather than editing it away, since the file is append-only history.
    The underlying weakness was worth fixing rather than just documenting:
    `expectFullyVisibleWithin` now also asserts `toBeInViewport({ ratio: 1 })`,
    an IntersectionObserver test whose intersection rect IS clipped by ancestor
    scroll boxes. Re-running the mount revert with the strengthened helper fails
    TWO pins (1366x600 and 1280x620) rather than one. 1440x660 and the
    inline-error case genuinely do not pin the mount, and the record now says so.
    On the residual: the arena-overflow figures are the reviewer's, measured
    against a master build, and I am not re-claiming "0px" anywhere. The ordering
    claim - branch better than master at every size swept - is the one that
    survives, and it is the only one the record and the code comments now make.

Verification notes for this round, recorded as prose because they are not
findings:

- Every fix above was verified by re-introducing the defect and watching the
  relevant assertion go red: absolute-positioned error -> 3 assertions red
  across both projects; F3.9 anchor reverted to 120px -> tree-anchor test red at
  120px; brief re-mounted inside `#arena` -> 2 clipping pins red.
- The long-name rejection was also rendered and LOOKED AT on a Pixel 5 rather
  than only asserted, since the round-2 finding existed because the previous
  round's numbers were never eyeballed.
- Full gate: `E2E_PORT=8181 npm run ci` exits 0.

Pending user checks are unchanged: playtest the first minute without opening the
FAQ, and inspect the hint affordance on desktop and mobile.

## Round 3

- VERDICT: APPROVE
- REVIEWER: out-of-context

R2.1, R2.2 and R2.3 were each confirmed RESOLVED against the code, with the
reverts re-run rather than reasoned about. The reviewer also accepted the
in-flow trade for the inline error, on the ground that the shift it costs is
smaller than claimed: measured, the phone arena picks up 35px of scroll with the
tree still fully visible, and on desktop the 23px comes out of the tree's top
padding rather than any node.

- [x] R3.1 (NIT) src/style.css:346 - At 320x568 only, showing the inline error
  clips the brief: pre-error the brief has 1px of slack, the in-flow message
  grows `.bottom-bar` by 43px, and the brief then hangs 21px past the game area,
  slicing the How to play button in half. Every other size swept is unaffected.
  Optional: add a shorter step to the height compaction and add
  `{ width: 320, height: 568 }` to the `is not clipped at ...` sweep with an
  error-showing variant.
  - Response: Taken rather than left, since it is a known clip with a known fix.
    Added a `@media (max-height: 620px)` step that trims only the brief's
    SPACING - the copy keeps the size it has at the 700px step, because the text
    is the point of the element.
    Acting on it exposed a real bug in the round-1 work that no test had caught:
    the `@media (max-height: 700px)` block was sitting BEFORE the
    `@media (max-width: 768px)` block in the stylesheet. Equal specificity, so
    the later block won and the height compaction never applied on ANY narrow
    viewport - it only ever worked on desktop widths, which is where I had
    measured it. Measuring the 320px shortfall instead of adding more padding
    guesses is what surfaced it. Both height blocks now sit at the end of the
    file, after the width block.
    The sweep now runs 4 sizes x {no error, 26-character-name error} = 8 cases.
    Verified the new pin bites: with the 620px block removed, "is not clipped at
    320x568 with the inline error showing" fails with "extends 3px past the
    bottom of .game-area" while the no-error case at the same size still passes -
    so it catches specifically the interaction the finding described.

Full gate after this round: `E2E_PORT=8181 npm run ci` exits 0 - format and lint
clean (one pre-existing warning in `src/ui/treeVisualizer.ts`, present on
master), Jest 200/200, Playwright 64 passed / 1 pre-existing `test.fixme`.

Pending user checks, carried to the flow Finish and NOT resolved by this
APPROVE:

- playtest the first minute without opening the FAQ;
- inspect the hint affordance on desktop and mobile.
