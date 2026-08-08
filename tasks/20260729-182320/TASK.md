# Rank-ladder summary of what the guesses have narrowed

- STATUS: CLOSED
- PRIORITY: 58
- TAGS: feature, ux, gameplay

## Story

As a player mid-round, I want a compact summary of what my guesses have established, so that I can see how far the answer still is instead of re-reading the tree each turn.

## Review Findings

- REFERENCE (`tasks/20260729-092452/NOTES.md`, section 1.7): Metazooa ships a `Show table` toggle that swaps the tree for a table over the answer's rank ladder - columns `Rank`, `Name`, `Guesses`, `Hints`, orderings `Summary` and `Chronological`, and a `Return to tree` link. Its ladder ends in a `???` species row, so the player can see how many ranks still separate them from the answer.
- Metajurassic has no equivalent. The tree shows the revealed chain, so a player can see WHERE they are but not HOW FAR is left.
- The information is not free. Depth-to-target is real difficulty information: `20260729-092435` F1.3 measured the candidate field collapsing to a median of 3 by guess 3 for a deducing player, and showing remaining depth would speed that further.

## Steps

- [x] DECIDE FIRST, and record it in a `DECISION.md` before building: should Metajurassic give the player depth-to-target at all? DONE 20260803 - the user chose option B, the ladder over the REVEALED lineage only. `DECISION.md` also fixes the second fork (rows are the target's chain only; every guess is attributed to its join clade). `NOTES.md` holds the build plan the steps below execute.
- [x] Write `test/rankLadder.test.ts` FIRST against `test/treeFixtures.ts`'s synthetic tree (node env, no DOM): row order root -> deepest, per-row guess buckets, per-row provenance (`root` / guesses / hint), the header counts, a guess whose tree bucket is an off-chain pairwise LCA rolling up to its nearest chain ancestor, and the invariant that NO clade outside the revealed chain and NO unrevealed clade ever appears.
- [x] Add `src/rankLadder.ts`: `buildRankLadder(state: GameState, roots: CladeNode[]) -> LadderRow[]`. Pure, no DOM, no new state. Walks the `CladeNode[]` `buildGuessTree` already returned rather than re-traversing the graph; carries each guess's existing `SpeciesNode.closenessTier` through untouched so the card, the board and the share grid cannot disagree.
- [x] Add `src/ui/ladderCard.ts`: `buildLadderCard(rows) -> HTMLElement`, mirroring `createCladeCard`'s shape in `src/ui/card.ts` and mounted with the existing `mountCard`. Keep it dumb - jest excludes `src/ui/**` from coverage, so every decision belongs in `rankLadder.ts` (same argument as `SpeciesNode.closenessTier`'s doc comment).
- [x] Add the `Info` / `Summary` tab strip to `#info-panel` in `src/index.html`, above `#panel-card-container`. NOTE: `webpack.config.js` registers this template twice, as the daily page and as `/practice/`; the summary is valid in both, so it ships active rather than `hidden`.
- [x] Wire the tabs in `src/ui/panel.ts`: tab state plus `renderLadderCard(state, data, roots)`, defaulting to `Info` so a player who never taps `Summary` sees today's game unchanged. Do NOT route through `openPanel()` - it also clears `manuallyClosedPanel` (LESSONS.md read-the-helper-body-not-its-name-before-reusing-it), the exact trap `renderLastGuess` already documents.
- [x] Call the summary render from `updateUI()` in `src/game/index.ts`, reusing the `roots` already built there for `renderLastGuess` and `renderTree`. One `buildGuessTree` call per update, as today.
- [x] Style the tab strip and the ladder rows in `src/partials/panel.css`. No new partial, so `src/style.css` stays untouched; touch `src/partials/responsive.css` only if the strip needs a narrow-viewport height, and keep it last in the cascade.
- [x] Add `e2e/ladder.spec.ts` (Pixel 5, alongside `e2e/mobile.spec.ts`): seed a round with the existing `e2e/helpers/` round helpers, open the panel, switch to `Summary`, and assert the card does not occlude the tree and that its deepest row is a revealed clade with no `???` row present.
- [x] One ordering only (`Summary`); `Chronological` stays out of scope (`20260729-092452` NOTES section 5). No `Return to tree` link - the tree is never replaced.

## Definition of Done

- A `DECISION.md` records the depth-to-target fork and the user's call. (cmd: `test -s tasks/20260729-182320/DECISION.md`) - already green as of 20260803.
- The ladder never leaks depth-to-target: no unrevealed clade, no `???` row, no remaining-rank count on the surface. (test: `test/rankLadder.test.ts` invariant case; red on base - the module does not exist)
- A guess bucketed under an off-chain pairwise LCA still appears exactly once, under its join clade. (test: `test/rankLadder.test.ts` roll-up case)
- The summary mounts in the existing panel behind the `Info` / `Summary` tabs, with `Info` still the default. (cmd: `grep -q 'panel-tab' src/index.html`; red on base)
- The surface does not occlude the tree on a phone. (test: `e2e/ladder.spec.ts` on Pixel 5; red on base - the spec does not exist)
- `npm run ci` passes. (cmd: `nix develop -c npm run ci`)

## Close-out

Built option (b) from `DECISION.md`: a `Round summary` card in the existing
info panel, behind an `Info` / `Summary` tab strip with `Info` still the
default. Rows are the revealed clades on the TARGET's chain, root -> deepest;
each carries the guesses that joined the target there, with the board's own
closeness tier. No `???` row, no rank count, no total depth.

### What, and why it is shaped this way

- `src/rankLadder.ts` derives everything from the `CladeNode[]` the board is
  already drawing, so the card cannot disagree with the tree it sits beside.
  The chain is found as the path from the root to the clade holding the target
  node, which IS the revealed part of the target's lineage - so the
  "no unrevealed clade" invariant holds by construction rather than by filter.
- Guess attribution rolls an off-chain pairwise-LCA bucket up to its nearest
  chain ancestor. That ancestor is provably the guess's join with the target:
  if a clade `c` off the chain held two guesses whose joins were both strictly
  deeper than `c`, both guesses would sit inside the deeper of those two joins,
  so their LCA would be deeper than `c` too. Hence every guess appears exactly
  once, at the clade the player already saw when they spent it.
- A species is listed only if `state.guesses` holds it. That single rule covers
  all three target states: the unsolved `?` placeholder and the
  revealed-after-a-loss node are not guesses and get no chip, while a WON
  target is a guess and gets one - with `closenessTier` undefined, since the
  answer is not a temperature (`SpeciesNode.closenessTier`).
- `src/ui/ladderCard.ts` only paints. Chips reuse the board's `.node-close-*`
  classes rather than restating the palette.

### Deviations from the planned Steps

- `buildRankLadder` returns `RankLadder` (`{guessCount, hintCount, rows}`),
  not a bare `LadderRow[]`. Step 2 required the header counts to be tested and
  Step 4 required the card to stay dumb; one return value satisfies both
  without a second function.
- `renderRoundSummary(state, roots)` drops the planned `data` argument - names
  and tiers all come off the tree nodes, so `GameData` was unused.
- Two sibling containers (`#panel-card-container`, `#panel-summary-container`)
  toggled by `hidden`, rather than one container whose content is swapped. The
  Info card then keeps its state across a tab round-trip.
- `playwright.config.ts` gained a shared `MOBILE_SPECS` regex. The mobile
  project matched `mobile.spec.ts` literally, so a new Pixel 5 spec would
  otherwise have run on the desktop project instead.

### Difficulties

- `.panel-card-container` sets `display: flex`, which outranks the UA's
  `[hidden] { display: none }`; without an explicit
  `.panel-card-container[hidden]` rule both panes stacked. Pinned by a comment.
- panel.css is imported BEFORE card.css and AFTER tree.css, so the ladder's
  header override is scoped under `.ladder-card`, and the chip uses
  `border-width`/`border-style` rather than the `border` shorthand, which would
  have reset each tier's border colour.
- `e2e/onboarding.spec.ts` asserted on `#info-panel .card-title`, which the
  second card made ambiguous under strict mode. Narrowed to
  `#panel-card-container .card-title` - the Info pane it always meant.

### Evidence

- `nix develop -c npm run ci` green (152 E2E, coverage, lint, format, pipeline).
- `nix develop -c npm run build` green.
- `test/rankLadder.test.ts`: 12 cases; red on base with
  `TS2307: Cannot find module '../src/rankLadder'`, verified by moving the
  module aside.
- `e2e/ladder.spec.ts`: 2 cases on `mobile-chromium` (Pixel 5).
- Rendered surface checked on a Pixel 5 screenshot of a 5-guess seeded
  practice round.

### Reflection

The invariant worth defending is not "do not print a `???` row" but "derive
only from the drawn tree". Deriving from `GameState` plus the graph would have
made every leak a filter that could be forgotten; deriving from the
`CladeNode[]` makes a leak require adding a node the board does not show.

### Review round 1

All five findings answered; see `REVIEW.md` for the per-finding responses.

- R1.1 (MAJOR) was a real bug and the one that mattered: the tab strip had no
  owner outside its own click handlers, so tapping `Summary` parked the pane
  there for the rest of the round while the pull tab kept advertising museum
  cards it was mounting into a hidden container. `noteCardRendered` now selects
  the Info pane as its first statement - the pane and the promise are decided
  in the same place. New `e2e/ladder.spec.ts` case, verified red on the unfixed
  code (`#panel-summary-container` still "visible" after the promised card) and
  green with the fix.
- R1.2 (MINOR) was diagnosed correctly but fixed differently: `mountCard`'s
  auto-shrink is now not called for this card at all, rather than re-run when
  the pane becomes visible. The title is a fixed literal that fits unaided, and
  a re-measure would have subtracted the counts line as a horizontal sibling
  when `.ladder-card .card-header` stacks it vertically. Deleting the
  measurement beat scheduling it correctly.
- R1.3, R1.4 taken as directed (`role="tabpanel"` + `aria-labelledby`;
  `rankLadder.ts` added to the AGENTS.md Core list). R1.5 took the reviewer's
  stated call: the unreachable empty-ladder branch and its `.ladder-empty` rule
  are deleted.
- Evidence: `nix develop -c npm run ci` green from the worktree, exit 0, 153
  E2E tests (152 + the new case). Both `cmd:` proofs re-run green.
- Process note: a sabotage check that moved the `selectTab` call after the
  early return still passed, because on the closed-panel path the statement
  runs either way. The honest red came from the pre-fix code itself. A sabotage
  that does not change the behaviour under test proves nothing - check what the
  edit actually reaches before trusting its verdict.

### Review round 2

All three findings answered; see `REVIEW.md` for the per-finding responses.

- R2.1 (MAJOR) taken as directed. The tab strip put the first focusable
  controls this panel has ever held into a subtree that a closed panel only
  moves off-screen with a transform, so both buttons stayed in the tab order on
  every load. `#info-panel` now ships `inert`, cleared in `openPanel()` and
  re-set in `closePanel()`. Worth naming: the CSS convention "closed means
  translated out of view" was fine for as long as the panel held nothing but
  text, and this task is what invalidated it. The comment in `index.html` says
  so, so the next person adding a control here does not have to rediscover it.
- R2.2 (MINOR) fixed, and the fix as specified turned out to be half of one.
  Gating the Info reset on `mountedCardTitle` stops a rejected guess yanking a
  player off Summary, but it also swallows the case where the player asks for
  the mounted card DELIBERATELY, by tapping its node in the tree. So the
  automatic repaint (`noteCardRendered`) and the explicit request (the new
  exported `showCardPane()`, called from the tree's `onSelect`) are now
  separate: one is gated on the card changing, the other never is. Both
  directions are pinned by new `e2e/ladder.spec.ts` cases.
- R2.3 (NIT) taken as directed.
- Evidence: `nix develop -c npm run ci` green from the worktree, exit 0, 156
  E2E tests (153 + three new cases). All three new cases verified red first;
  the "tree tap" case initially failed for the wrong reason - the open panel is
  `width: 100%` on a phone and intercepted the click - and was corrected to
  close the panel first, which is the real shape of that scenario anyway.
  All four `cmd:`-style proofs re-run green.

### Review round 3

- R3.1 (MAJOR) taken as directed, first remedy. The round-2 gate split one
  decision into two: `noteCardRendered` stopped switching the pane for an
  unchanged card but kept advertising it on the pull tab, so a valid guess that
  did not deepen the best clade left the tab naming a card that opening the
  panel would not show. The gate is now a single early return - an unchanged
  card is a repaint, so it neither steals the pane nor claims the unseen
  marker. The alternative the round-3 reviewer offered (`changed ||
  !isPanelOpen()`) closes the same divergence but keeps the spurious unseen
  marker on a rejected guess, which is the same defect one case along.
- Worth naming: the round-2 fix was correct about WHICH condition and wrong
  about HOW FAR it reached. `unseenCardTitle` and `selectTab("info")` are two
  expressions of one promise ("this card is what the panel is about to show"),
  and gating only one of them is what produced the divergence. The comment in
  `panel.ts` now states that they are one decision, so the next edit does not
  re-split them.
- Evidence: `nix develop -c npm run ci` green from the worktree, exit 0, 157
  E2E tests (156 + one new case). The new case was verified red first, for the
  intended reason: `has-unseen` present on the pull tab, advertising
  "Averostra". All `cmd:`-style proofs re-run green.

## Notes

- Filed by `20260729-092452` (Metazooa alignment) at LOW priority on purpose: it is the least certain of the alignment findings, and closing it as "decided not to build, here is why" is a legitimate outcome.
- Related: `20260729-141425` (clade membership) is the other "give the player more information" decision. They should be decided consistently - both trade difficulty for legibility.
