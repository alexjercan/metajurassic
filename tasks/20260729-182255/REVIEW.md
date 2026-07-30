# Review: Colour the tree by guess closeness

- TASK: 20260729-182255
- BRANCH: feat/tree-closeness-colour

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

- [x] R1.1 (MINOR) tasks/20260729-182255/TASK.md:52 - The Verification section claims the `guessTier(...) - 1` mutation made `test/closeness.test.ts` fail "on both the parity test and the every-tier test; the other 10 stayed green". Re-running exactly that mutation gives 1 failed, 11 passed: only the parity test caught it. "The ladder actually exercises every tier" is insensitive to a UNIFORM shift, because `new Set([-1,0,1,2,3]).size` is still 5 and the array is still ascending. Either correct the claim, or (better) make that test assert the tiers ARE `[0..CLOSENESS_TIER_COUNT-1]`, which also catches a uniform drift and an out-of-range tier that has no CSS rule.
  - Response: FIXED, and the finding is right on the sharper point. Re-derived here rather than adopted: the unclamped `guessTier(...) - 1` mutation gives 1 failed / 11 passed, confirming the ladder test was blind to a uniform shift. Root cause of the bad claim found - the experiment the Verification section DESCRIBED (unclamped) is not the one that was RUN (`Math.max(0, ... - 1)`), and the clamp is what collapsed two tiers and tripped the old set-size check. Taking the better option: `test/closeness.test.ts` now asserts the tiers ARE `[0..CLOSENESS_TIER_COUNT-1]`. Re-ran the unclamped mutation against the strengthened test - 2 failed / 10 passed, so it now catches what it missed. TASK.md's Verification section carries a dated correction rather than a silent edit.
- [x] R1.2 (MINOR) src/ui/treeVisualizer.ts:40 - The closeness tier reaches the player only as a colour. Three of the five hues (`#d8c04a` yellow, `#e08a3c` orange, `#4ca86a` green) are the classic deuteranope confusion set, and unlike the share grid there is no glyph to fall back on. Consider setting `box.title` (or an `aria-label`) naming the tier in words when `closenessTier` is set. Not blocking - the grid has the same property, so this is a pre-existing scale being carried onto the board rather than a regression.
  - Response: AGREED, DEFERRED to a new task - `20260730-094852` (p62, feature/ux/a11y). Not fixed on this branch on purpose. The suggested `title`/`aria-label` is new player-facing COPY whose wording is a tone call, and it is only half a fix anyway: a tooltip needs a hover, which a phone does not have. The task frames the real fork - tooltip vs a second visual channel vs a lightness-monotonic palette - and flags that the third option REVERSES `DECISION.md` fork 1 (mirror the grid's hues) and so needs a supersede link on both records. That is a decision for the user, not something to infer while addressing a review.
- [x] R1.3 (NIT) src/ui/onboarding.ts:129-133 and src/faq.html:41-47 - Neither surface is now false, but both describe how to read the tree ("Reading the tree", "What does the tree show?") and neither mentions the colour the board has just started speaking. TASK.md's own Notes anticipate this, and the onboarding task is already on master. One clause in the how-to-play card would close the loop the Story is about.
  - Response: AGREED, DEFERRED to a new task - `20260730-094916` (p55, docs/ux). Same reason: player-facing copy. The task notes it depends on `20260730-094852`, since that one may change what the colour IS - writing the copy first would just have to be rewritten.
- [x] R1.4 (NIT) src/closeness.ts:8 - `guessCloseness` is exported but has exactly one caller, `guessTier`, in the same file. Dropping the `export` would make `guessTier`/`closenessTier` the module's only surface and keep "the boundaries live here and nowhere else" enforced by the module boundary rather than by comment.
  - Response: FIXED. `guessCloseness` is no longer exported; `guessTier` and `closenessTier` are the module's only surface, so nothing outside can bucket a closeness its own way. Gate re-run green after the change.

### What the out-of-context reviewer checked

Read AGENTS.md, LESSONS.md, TASK.md and DECISION.md, then the whole code diff. Checked `ss -ltnp` first: nothing on 8080 or 8181.

Full gate `E2E_PORT=8181 nix develop -c npm run ci`: green. 14 suites / 236 Jest tests, 78 Playwright passed and 1 skipped (the pre-existing `test.fixme`), format and lint clean. Matches the TASK.md Verification numbers exactly.

Every DoD proof run individually and passing: tier parity over the real payload; `CLOSENESS_CELLS.length === CLOSENESS_TIER_COUNT`; the two-call-site grep (`src/treeBuilder.ts:2,375` and `src/gameState.ts:1,340`); target-carries-no-tier in all three states; a CSS rule per tier; and the browser test that two guesses paint differently.

Two mutation experiments, copies taken first and restored by `cp`, never `git checkout`. (1) The unclamped `- 1` tier drift in `buildGuessTree` - caught by the parity test only, which is R1.1. (2) Moving the `.node-close-*` block above `.node-species` - the browser test failed with all five tiers painting `rgb(91, 113, 153)`, so that TASK.md claim holds verbatim.

Also confirmed: no existing test was deleted or weakened; the old `guessCloseness`/`closenessCell`/`CLOSENESS_TIERS` symbols have no references left outside the append-only `tasks/` tree; the share-grid arithmetic is behaviour-identical and `share.test.ts` is still green; CSS source order is `.node-species`(512) -> `.node-close-0..4`(537-565) -> `.node-mystery`(567)/`.node-winner`(577)/`.node-revealed`(586); the `@media (max-width: 768px)` `.node-box` rule touches only padding and font-size, so it cannot clobber the tints on a phone; `buildCladeSubtree` only emits species nodes for guessed species, so no unguessed species can pick up a tier; and DECISION.md records all three load-bearing choices.

### In-session supplement

R1.1 was re-derived rather than adopted: the unclamped `guessTier(...) - 1` mutation was re-run here and reproduced 1 failed / 11 passed. The finding is correct, and the cause of the discrepancy is now understood - the experiment the Verification section DESCRIBED (unclamped) is not the one that was RUN (`Math.max(0, ... - 1)`). The clamp collapses tiers 0 and 1 into one value, which is what tripped the set-size check; the unclamped shift preserves five distinct ascending values and slips past it. The prose was wrong about which mutation produced the result, and the test really is weaker than the record implied. This is the ledger's `a-verification-result-expires-when-the-code-it-ran-against-changes` in a new key: the result was true of the code it ran against, and the WRITE-UP silently described different code.

### Pending manual DoD item

- "The mystery node and the winning node stay visually distinct from the closeness scale" (desktop and phone screenshots, inspected). The out-of-context reviewer did not judge this and notes that nothing in the branch backs the Verification prose, because the screenshot rig was a throwaway deleted before commit. Carry R1.2's colour-blindness point into the same look. This is the user's acceptance check at the flow Finish.

## Round 2

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

Round-1 fixes confirmed by the round-1 reviewer against the new diff, which is what ticked their boxes above:

- R1.1 CONFIRMED FIXED. The reviewer re-ran BOTH drift shapes against the strengthened test: unclamped `guessTier(...) - 1` gives 2 failed / 10 passed (was 1 failed / 11 passed), and the clamped `Math.max(0, ... - 1)` also gives 2 failed / 10. They verified the dated correction's arithmetic - clamped tiers are `[0,0,1,2,3]`, set size 4, which is why the old set-size check tripped; unclamped are `[-1,0,1,2,3]`, set size 5 and ascending, which is why it did not. They judged the exact-tiers assertion NOT over-tight: it will fail if a content change moves a ladder species off its rung, and that is the right outcome, because a silent degradation to four covered tiers would gut the parity test above it.
- R1.4 CONFIRMED FIXED. `grep -rn "guessCloseness"` over `src/`, `test/`, `e2e/`, `scripts/` finds two hits, both inside `src/closeness.ts`.
- R1.2 and R1.3: the reviewer judged the deferral legitimate and both new task files faithful to the findings, including the supersede-link warning on this task's DECISION.md fork 1.

- [x] R2.1 (MAJOR) tasks/20260729-182255/DECISION.md:1 - The branch reddens `tatr check`, which AGENTS.md names as a conformance gate to keep clean: it exits 1 with `bad-decision-status: DECISION.md has no STATUS line`. All 13 DECISION.md records on master carry a document-level `- STATUS:` / `- DATE:` header block under the H1; this one put a bare `STATUS: ACCEPTED (user, at the plan gate)` inside each fork section and no top-level line, so the linter could not see it. Add the header block, keeping the per-fork lines. Present in the round-1 diff and missed then; not introduced by 3e44053, but a verified gate failure that will not self-resolve.
  - Response: FIXED, and re-verified here rather than adopted - `tatr check` on the branch reproduced both complaints, and the header convention was confirmed against `tasks/20260729-141424/DECISION.md`. Added the `- DATE:` / `- STATUS: ACCEPTED` / `- CONTEXT:` block under the H1, with a sentence saying the header is what `tatr check` reads and the per-fork lines record who accepted each fork. `tatr check` now reports only `closed-missing-retro`, which is expected at this point in the flow and clears when `/compound` writes RETRO.md.

### What the out-of-context reviewer checked

Read the full round-2 diff. Ran the gate again (`E2E_PORT=8181`): green, 236 Jest and 78 Playwright (1 pre-existing skip), format and lint clean, including the `onboarding.spec.ts` clipping specs at 1280x620 / 1366x600 / 1440x660 / 320x568 - which matters because `20260730-094916` will add copy to that card. Ran `tatr check` and `tatr check --ledger LESSONS.md` on the branch and on master, and cross-checked the DECISION.md header convention across all 13 records on master. Confirmed the round-2 commit changes no product behaviour - one `export` keyword, one assertion pair, and task records - so round 1's verification of the shipped feature still stands.

### Pending manual DoD item

Unchanged from round 1, and still the user's call at the flow Finish: "The mystery node and the winning node stay visually distinct from the closeness scale" (desktop and phone screenshots, inspected). Nothing in the branch backs the Verification prose, because the screenshot rig was a throwaway deleted before commit. Carry R1.2's colour-blindness point into that same look.

## Round 3

- VERDICT: APPROVE
- REVIEWER: in-session (R2.1 was the round's only finding, it is a one-block records fix with a mechanical proof, and that proof - `tatr check` going from two complaints to the one expected `closed-missing-retro` - was re-run here rather than asserted)

No open BLOCKER or MAJOR findings. The pending manual DoD item above carries forward to the flow Finish.
