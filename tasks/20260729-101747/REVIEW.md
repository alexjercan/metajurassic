# Review: puzzle key round-trip off-by-one fix

- VERDICT: APPROVE

## Round 1 - REQUEST_CHANGES (out-of-context reviewer)

Reviewed commit `266742f` on branch `fix/puzzle-key-roundtrip`.

Verdict: REQUEST_CHANGES, one HIGH finding; core fix math and tests confirmed
sound.

### Findings

1. [HIGH -> accepted as LOW/latent, fixed] `e2e/helpers.ts:computeDailyKey`
   still used the pre-fix formula `(index + 1).padStart(5)`, which diverges
   from the new `formatPuzzleId` at the modulus edge (residue 99999: old
   produces 6-digit `"100000"`, new produces `"00000"`). The helper's own
   comment declares it a mirror of `gameStateKey`, so the divergence is a
   maintainability defect. It is only latent today (daily seeds are in the
   hundreds and never reach the edge), so no e2e test currently fails, but the
   mirror must not silently drift from source.

   Resolution: updated `computeDailyKey` to apply the same `% 10^5` wrap, with
   a comment explaining why. Confirmed via reading that daily seeds cannot
   reach the edge, so behavior for the existing e2e suite is unchanged.

### Confirmed strengths (reviewer)

- `formatPuzzleId` / `parseGameStateKey` are true inverses over [0, 10^5);
  modulus wrap and negative-seed normalization correct.
- Existing saved localStorage keys stay valid; no migration needed.
- Round-trip property test genuinely crosses the format/parse seam; dating and
  streak regressions go through the production writer `saveGameState`.
- DST drift correctly scoped out to follow-up task 20260729-122943; streak
  tests anchored to `seedToDate` to stay robust to it.

## Round 2 - APPROVE

The single finding was addressed (e2e mirror wrapped to match source). Full
`npm run ci` re-run green inside `nix develop`. No further findings.

Verdict: APPROVE.
