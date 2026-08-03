# Review: Name the closeness colour in the how-to-play copy

- TASK: 20260730-094916
- BRANCH: docs/name-closeness-colour

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (NIT) src/faq.html:48 - the new sentence carries three trailing
  modifiers ("running cold to hot...", "with the brightest green closest", "on
  the same steps as..."). Split after "closest.": "A guessed node's colour says
  the same thing, running cold to hot with the brightest green closest. Those
  are the same steps as the squares in the grid you share at the end of a
  round."
  - Response:
- [ ] R1.2 (NIT) src/ui/onboarding.ts:122 - "the node's colour" has no
  antecedent noun in the clause it attaches to; the preceding subject is "the
  tree". Change "the node's colour" to "your guess's colour", matching the
  FAQ's "A guessed node's colour" and the card's own opening "Your guess is
  placed...".
  - Response:

Both findings are NIT and non-blocking, and both sit against the plan's literal
text: Step 2 names "- the node's colour runs cold to hot, brightest green
closest" as its example clause, and Step 3 asks for ONE sentence in the FAQ, so
R1.1's split and R1.2's rewording each trade a Step's wording for a style
preference. Take them or leave them; neither changes what the copy asserts.

The reviewer counted the FAQ sentence at 43 words; it is 35. The structural
observation stands, the number does not.

Pending user check (`manual:`, not the reviewer's to close):

- DoD 3 - "the new wording agrees with the share grid's tiers, and the
  how-to-play card still fits its panel" (manual: user judgement). TASK.md
  records a throwaway Playwright probe at 320x568 and 360x640 finding
  `#panel-card-container` unclipped on both. That is evidence offered, not a
  self-tick; the item stays open for the user.

Verified in this recording pass, independently of the out-of-context reviewer:

- Proof 1 red on base: `grep -c -ie colour src/ui/onboarding.ts src/faq.html`
  on `master` reports 0 and 0, exit 1. Green on the branch at
  `src/ui/onboarding.ts:122` and `src/faq.html:49`, exit 0.
- Proof 2: `nix develop -c npm run ci` exit 0 in the worktree, 165 Playwright
  tests passed, covering the `e2e/onboarding.spec.ts` sweep to 320x568. An
  earlier run of the same command showed 30 mobile failures; it overlapped the
  out-of-context reviewer's own suite on the same worktree and dev-server port.
  The clean re-run is green and matches the reviewer's independent exit 0.
- The load-bearing copy claim, re-derived from source rather than the record:
  `.node-close-0..4` (`src/partials/tree.css:202-229`) ramps grey -> blue ->
  yellow -> orange -> green with fill alpha 0.06 -> 0.11 -> 0.16 -> 0.22 ->
  0.30, so "cold to hot, brightest green closest" is true on hue and lightness
  alike. `CLOSENESS_CELLS` (`src/shareText.ts:35`) and the board's classes both
  index `closenessTier`, so "the same steps as the squares in the grid" holds
  literally. Neither surface states a tier count, a boundary, or a hex;
  `TIER_UPPER_BOUNDS` (`src/closeness.ts:41`) stays the sole written scale.
- Every Step's literal text against the diff: one clause in the card, one
  sentence in the FAQ, `briefCopy()` untouched, British "colour" on both
  surfaces. No test file appears in the diff, so nothing was weakened or
  deleted to reach green - consistent with Notes, which established that no
  test asserts these strings.
- Close-out honesty: the recorded 165-test count and both proof outcomes
  reproduce here.
