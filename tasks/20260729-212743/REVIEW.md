# Review: Make the hint chip keyboard reachable

- TASK: 20260729-212743
- BRANCH: feat/hint-chip-keyboard

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) src/partials/game-shell.css:81 - the comment says the
  `[hidden]` rule "sits before" `.hint-box` because `display: flex` "beats
  `[hidden]`". Order is not what decides it: `.hint-box[hidden]` is (0,2,0)
  against `.hint-box`'s (0,1,0), so it wins wherever it is placed. Reword to
  say the author-level `display: flex` overrides the UA `[hidden]` rule and the
  attribute selector is what restores it, dropping the ordering claim.
  - Response:
- [ ] R1.2 (NIT) src/partials/game-shell.css:87 - the comment reads "these four
  neutralise UA button styling", but five properties follow, and the fifth
  (`text-decoration: none`) exists for the `<a>` occupant rather than for the
  button. Say "these five", or split `text-decoration` onto its own line with
  the anchor as its reason.
  - Response:
- [ ] R1.3 (NIT) src/game/hintChip.ts:23 - `hintBox.hidden = false;
  if (hintPractice) hintPractice.hidden = true;` cannot be exercised. Nothing
  un-ends a round in place: practice's "New game" is
  `window.location.replace(pathname)` (`src/practice.ts:26`), a full load that
  restores the markup's own `hidden` attributes. Either delete the two lines as
  unreachable, or keep them as render idempotence and accept that no test can
  pin them. Take it or leave it.
  - Response:

Verification, not findings:

- `E2E_PORT=8191 npm run ci` re-run in the worktree by the recording pass:
  format, lint, pipeline, Jest coverage, 168 Playwright tests, all green.
- The DoD grep returns no hits, exit 1, against the 9 hits and exit 0 recorded
  at plan time. The proof is red on base and green here as claimed.
- The out-of-context reviewer independently confirmed red on base for all four
  test proofs by copying the new and changed specs onto a detached `master`
  worktree: `Tab never reached #hint-box in 40 presses` for (a) and (b), a
  `toBeDisabled` failure for (c), a `toBeHidden` failure for the postgame
  rewrite. The Evidence section's claimed failure reasons match.
- The migrated `not.toHaveClass(/disabled/)` -> `not.toBeDisabled()` assertions
  in `panel.spec.ts` and `mobile.spec.ts` are strengthened, not weakened:
  Playwright treats a `<div>` as enabled, so the old form could not fail.
- Re-derived by the recording pass against the reviewer's own claim: the
  reviewer filed the `hintChip.ts:23` restore as MAJOR on the scenario that a
  practice "New game" after a finished round would leave the chip hidden and
  the Practice link stuck in the slot. It would not. `startAnotherRound`
  navigates, so the page reloads and the template's `hidden` attributes decide
  the slot before `updateHintButton` ever runs. The lines are unreachable
  rather than untested, which is why deleting them left the suite green.
  Downgraded to R1.3.
- `.hint-box` does carry `display: flex`, so the `[hidden]` rule is
  load-bearing; only the comment's reasoning is off.
- Docs sweep: no `hint-box`, `.hint-box.disabled`, `hint-text a` or `.practice`
  mentions survive outside `src/`, `e2e/`, `scripts/playtest/walkthrough.ts`
  (which clicks `#hint-box` and is still valid) and the exempt `tasks/` tree.
- DECISION.md covers both load-bearing forks (native `disabled` over
  `aria-disabled`; a sibling `<a>` over a link nested in a button), and the
  close-out matches the code.

Pending user check:

- The `manual:` DoD line - the chip is visually unchanged at desktop and at
  360px in the affordable, disabled and game-over states. The close-out
  describes six `.top-bar` screenshots plus a focused-chip shot; they are not
  repo content, and the line is correctly left unticked for the user's own
  judgement.

Inspection commands:

```bash
cd "$(sprout show feat/hint-chip-keyboard)"
git diff master...HEAD
E2E_PORT=8191 npm run ci
npx playwright test e2e/hintKeyboard.spec.ts
```
