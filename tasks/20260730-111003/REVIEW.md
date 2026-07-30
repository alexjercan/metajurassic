# Review: Give the game-over modal a vertical escape hatch on short viewports

- TASK: 20260730-111003
- BRANCH: fix/modal-vertical-escape-hatch

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context
- COMMIT: 44183d3

The reviewer ran the gate green, reproduced the record's numbers independently,
and confirmed the shipped CSS is correct. The findings are about the reworked
E2E helper, not the fix.

### Findings

- [x] R1.1 (MAJOR) `e2e/helpers.ts` `expectActionsReachable` - the reachability
      pass can pass on a modal no player can scroll, and the comment's stated
      reason why it cannot was FALSE. The comment claimed a `scrollTop`
      assignment is inert where there is no scroll container; that holds for
      `overflow: visible` but not for `overflow: hidden`, which in Chromium is
      programmatically scrollable and scrollable by neither touch nor wheel. The
      reviewer changed this rule's `overflow-y: auto` to `hidden` and got:
      `52 passed, 0 failed`, with the three actions clipped 15px below the card's
      clip box, invisible, and inert under both a CDP touch drag and a wheel
      event. The assertion's own scroll manufactured the pass on exactly the
      defect this task exists to remove.
  - Response: Accepted, and this is the right call - it is
    [[a-speculative-knob-beside-a-failing-test-is-a-suspect]] with the knob in
    the test. Fixed by asserting the property separately from performing the
    scroll: wherever `#modal` has any overflow at all, its computed `overflow-y`
    must be one of `auto`/`scroll`/`overlay`. Re-ran the reviewer's mutation:
    **10 failed** where it was 0 before, at all five short sizes on both
    outcomes - including 640x360, whose 3px of overflow no previous mutation
    reddened. The message names the pixels:
    ``#modal has 43px of content past its own box but `overflow-y: hidden`, so a
    player cannot scroll to it - only this test can`` (43px at 568x320; 3, 93 and
    113 at the others). The guard also fires on
    the pre-fix `visible`, which is honest: that state is equally unreachable.
    The false sentence in the comment is replaced by the measured account.
- [x] R1.2 (MINOR) `e2e/helpers.ts` - the vertical axis had no "contents stay
      inside the box" containment to match the horizontal axis, and reachability
      does not supply one because it only asks about the viewport. With the cap
      kept and `overflow` back to `visible` (`mutate.py no-overflow-y`), the
      three pills were drawn straddling the card's bottom border, half on the
      backdrop, and 568x320 and 480x320 stayed GREEN - only the 360x320 and
      360x300 pairs failed.
  - Response: Accepted. `scrollModalTo` now returns the post-scroll rect and the
    clip bounds, and the pass asserts the control lies inside `#modal`'s clip box
    on both edges. `no-overflow-y` now fails **8** cases, up from 4: 568x320 and
    480x320 included. Because both fixes landed together the overflow guard from
    R1.1 fires first on that mutation, so the containment assertion was
    falsified on its own too, with R1.1's guard disabled: `the "OK" action still
    hangs 15px below the modal's own box after scrolling it as far as it goes` -
    the same 15px the reviewer measured. Neither guard is
    [[a-guard-no-test-can-fail-is-a-comment]].
- [x] R1.3 (MINOR) `e2e/mobile.spec.ts` `SHORT_VIEWPORTS` comment and
      `TASK.md` - "in all five, `.modal-overlay` reports `overflowY: visible`
      with `scrollHeight > clientHeight`" is false at 640x360, which measures
      `scrollHeight 360, clientHeight 360`. It is the deliberate "fits today"
      control size, so it cannot also have unreachable overflow.
  - Response: Accepted. Both places now say "the four that do not fit" and quote
    640x360's equal numbers as what makes it the control size.
- [x] R1.4 (NIT) `TASK.md`, the non-vacuity Definition of Done - "381.2px inside
      a 393x500" is the wrapped-row height at 360px wide; at 393x500 the modal is
      331.2px. The cap and the zero max-scroll in that line are right, and the
      table elsewhere is right.
  - Response: Accepted, corrected to 331.2px.
- [x] R1.5 (NIT) `e2e/helpers.ts` - `scrollModalTo` returned `{before, after}`
      "so a caller can see whether the scroll was load-bearing" and the only
      caller discarded it, so the documented signal had no reader.
  - Response: Accepted. The return value is now read: the offsets and the
    post-scroll rect are what R1.2's containment assertion is built on.
- [x] R1.6 (NIT) `e2e/helpers.ts` - "put the scroll back where it was found"
      wrote a literal 0 rather than the entry value.
  - Response: Accepted. The entry `scrollTop` is captured and restored.
- [x] R1.7 (NIT) `e2e/helpers.ts` - "after scrolling everything that can scroll"
      overstates; only `#modal` is scrolled.
  - Response: Accepted, reworded to "after scrolling the modal as far as it
    goes".
- [x] R1.8 (NIT) `e2e/helpers.ts` vs `src/style.css` - the helper says "there is
      no horizontal escape hatch and there should not be one" while the CSS it
      documents creates one (`overflow-x` computes to `auto`).
  - Response: Accepted. The helper now says the sideways scroll exists as a side
    effect of the vertical hatch but is not a promise - nothing is allowed to
    need it, and the horizontal assertions are what say so.

### What the reviewer reproduced

Independently reproduced, matching the record: the whole master-CSS measurement
table; the per-size, per-axis reproduction (8 failed / 2 passed with the 640x360
pair passing); all four mutations (`no-hatch` 8, `no-max-height` 8,
`no-overflow-y` 4, `revert-141428` 14) including `#modal-close-btn starts 14px
left of the 393px viewport`; the scrollHeight/clientHeight/max-scroll table; the
`scrollTop` snapping finding (`assigned 15.188 readback 15 ... over 0.188`), with
the explicit judgement that `Math.ceil` is a legitimate fix and not a tolerance;
that `mutate.py revert-141428` is faithful to `9992893^` apart from the two hatch
declarations; that no media block overrides `max-height`; and that the modal is
genuinely touch-scrollable (CDP drag, scrollTop 0 -> 43).

Contradicted: R1.3 and R1.4. Not verifiable after the fact: the "26 screenshots,
all read" claim.

## Round 2

- VERDICT: APPROVE
- REVIEWER: author, against the round-1 findings

All eight findings addressed on the branch. Verification after the changes:

| check | result |
|-------|--------|
| `mobile.spec.ts` + `modal.spec.ts` on the shipped CSS | 51 passed |
| R1.1's mutation (`overflow-y: hidden`) | **10 failed** (was 0) |
| R1.2's mutation (`no-overflow-y`) | **8 failed** (was 4) |
| containment assertion alone, R1.1 guard disabled | fails with the reviewer's 15px |
| `npm run ci` | green, exit 0 |

No finding was resolved by weakening an assertion; both fixes add one.
