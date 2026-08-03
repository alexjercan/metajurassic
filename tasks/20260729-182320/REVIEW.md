# Review: Rank-ladder summary of what the guesses have narrowed

- TASK: 20260729-182320
- BRANCH: feat/rank-ladder-summary

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) src/ui/panel.ts:155 - `selectTab` is called only from the
  two click handlers, so once the player taps `Summary` the pane is sticky for
  the rest of the round. Every later guess mounts its museum card into the now
  `hidden` `#panel-card-container`, and with the panel closed `syncPullTab`
  still advertises it (`aria-label="Open info panel: <clade>"` plus the
  `has-unseen` dot) - opening the panel then shows the Summary pane instead of
  the advertised card. Make `noteCardRendered` (panel.ts:67) call
  `selectTab("info")` as its first statement, before the
  `if (isPanelOpen()) return;` early return, so a newly rendered card is the
  pane the pull tab promises.
  - Response: fixed as directed - `selectTab("info")` is now the first
    statement of `noteCardRendered`, before the `isPanelOpen()` early return.
    Pinned by a new `e2e/ladder.spec.ts` case, "a later guess brings the panel
    back to the card the tab promises": it parks the pane on Summary, closes
    the panel, guesses again, and asserts the pull tab's `aria-label` names the
    card the Info pane then shows. Confirmed red on the unfixed code
    (`toBeHidden` on `#panel-summary-container` received "visible") and green
    with the fix.
- [x] R1.2 (MINOR) src/ui/panel.ts:177 - `renderRoundSummary` goes through
  `mountCard`, which runs `shrinkCardTitle` -> `autoShrinkText`
  (src/ui/autoShrink.ts:12). The summary pane is `hidden` at every render, so
  `parent.clientWidth` and `el.scrollWidth` are both 0, the shrink loop never
  runs, and `.ladder-card .card-title` keeps the inline `font-size: 1.8rem`
  maximum - it is never re-measured when the tab is later shown. Either call
  `shrinkCardTitle` on the mounted summary card inside `selectTab` when
  `showSummary` is true, or pin `.ladder-card .card-title { font-size: 1rem }`
  in `src/partials/panel.css` beside the existing `.ladder-card .card-header`
  override.
  - Response: the diagnosis is right; took neither remedy. `renderRoundSummary`
    now mounts the card WITHOUT `mountCard`'s auto-shrink instead of working
    around a shrink that cannot measure. Two reasons to delete rather than
    re-run it: the title is the fixed literal "Round summary", which fits at
    the 1.8rem maximum on the narrowest supported viewport (now asserted in
    `e2e/ladder.spec.ts`, `scrollWidth - clientWidth <= 0`); and a re-measure on
    tab switch would MIS-measure, because `.ladder-card .card-header` is
    `flex-direction: column` and `autoShrinkText` subtracts the stacked counts
    line as though it sat beside the title. The CSS remedy would also have
    needed `!important`, since `autoShrinkText` writes an inline `font-size`
    unconditionally. Noted: the new assertion is vacuous today (it passes with
    and without a shrink call) - it pins the "fits unaided" claim the deletion
    rests on, not the deletion itself.
- [x] R1.3 (MINOR) src/index.html:97 - The two panes are named by
  `aria-controls` from `role="tab"` buttons but are plain
  `div.panel-card-container` with no `role="tabpanel"`, so a screen reader
  reads a tablist that controls nothing. Add `role="tabpanel"` plus
  `aria-labelledby="panel-tab-info"` / `aria-labelledby="panel-tab-summary"` to
  `#panel-card-container` and `#panel-summary-container`.
  - Response: fixed as directed in `src/index.html`; both panes now carry
    `role="tabpanel"` and the matching `aria-labelledby`.
- [x] R1.4 (MINOR) AGENTS.md:21 - The repository map's Core list enumerates the
  top-level `src/` modules (`gameState.ts`, `gameData.ts`, `treeBuilder.ts`,
  `hintRule.ts`, `puzzleKey.ts`, `shareText.ts`); this branch adds a seventh and
  leaves the list stale. Add `rankLadder.ts` to that Core list.
  - Response: fixed; `rankLadder.ts` added to the Core list in AGENTS.md.
- [x] R1.5 (NIT) src/ui/ladderCard.ts:109 - The `ladder.rows.length === 0`
  branch is unreachable in the shipped app: `buildRankLadder` returns empty rows
  only for empty `roots`, and `buildGuessTree` returns an empty array only when
  the target or its lineage is missing from the graph, which
  `test/dataIntegrity.test.ts` already forbids. Deleting the branch and the
  `.ladder-empty` rule at src/partials/panel.css:174 is defensible; so is
  keeping it, since `test/rankLadder.test.ts:202` pins the empty ladder as part
  of the module's contract. Reviewer's call is delete; take it or leave it.
  - Response: took the reviewer's call. Both the branch and the `.ladder-empty`
    rule are gone. `test/rankLadder.test.ts:202` pins `buildRankLadder`'s
    contract, not the card's copy for it, and an empty ladder still paints a
    valid header-only card rather than throwing.

Verification, re-derived in-session rather than taken from the reviewer:

- `nix develop -c npm run ci` from the worktree: exit 0, 152 Playwright tests
  passed, jest green.
- R1.1 re-derived by reading src/ui/panel.ts:43-98 and :155-177: nothing outside
  the two `addEventListener` calls ever invokes `selectTab`, and
  `noteCardRendered` has no pane awareness.
- R1.2 re-derived by reading src/ui/autoShrink.ts: the loop guard is
  `el.scrollWidth > availableWidth`, both 0 inside a `hidden` subtree.
- Proofs: `test -s tasks/20260729-182320/DECISION.md` passes;
  `grep -q 'panel-tab' src/index.html` passes here and is red on master (0
  matches); the invariant case, the roll-up case and `e2e/ladder.spec.ts` on
  `mobile-chromium` all pass on their stated criteria and are new files, so red
  on base is structural.
- The roll-up rule is sound: a guess bucketed at an off-chain clade `c` has
  `LCA(guess, target)` equal to `c`'s nearest chain ancestor. Rows come only
  from the path to the target's node in the drawn tree, so no unrevealed clade
  and no `???` row can appear.
- No self-ticked `manual:` proof exists; the close-out notes match the diff.

Not verified: the Pixel 5 screenshot cited under Evidence has no artifact in the
worktree (`e2e/ladder.spec.ts` was relied on instead), and the visual legibility
of the reused `.node-close-*` tier classes on a pill-shaped chip rather than a
`.node-box`.

Process signal: `e2e/onboarding.spec.ts:172` was narrowed from
`#info-panel .card-title` to `#panel-card-container .card-title`. Confirmed a
disambiguation, not a weakening - it still pins the same "how to play" title, on
the pane it always meant.

## Round 2

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R2.1 (MAJOR) src/index.html:74 - The two `role="tab"` buttons are the
  first focusable controls ever placed inside `#info-panel` (confirmed: on
  master the `#info-panel` subtree contains no `button`, `a`, `input` or
  `tabindex`). A closed panel is hidden only by `transform: translateX(105%)`
  (src/partials/panel.css:18), and a transform does not remove elements from
  the tab order. So on every page load, daily and practice, a keyboard user
  tabs into two off-screen buttons with no visible focus ring, and activating
  one silently swaps a pane they cannot see. Escalated from the round-2
  reviewer's MINOR: this ships a keyboard-navigation regression on every load,
  in the same surface round 1 just fixed for screen readers (R1.3). Add `inert`
  to the `#info-panel` element in `src/index.html`, and set it in
  `src/ui/panel.ts`: `panel.inert = false` in `openPanel()` (panel.ts:88) and
  `panel.inert = true` in `closePanel()` (panel.ts:83). Not in `syncPullTab()`,
  which early-returns when `pullTab` is absent. Pin it in `e2e/ladder.spec.ts`:
  with the panel closed, assert neither tab button is reachable by keyboard.
  Response: fixed. `#info-panel` ships `inert` in `src/index.html`, cleared in
  `openPanel()` and re-set in `closePanel()` (src/ui/panel.ts), not in
  `syncPullTab()`. Pinned by `e2e/ladder.spec.ts` "keeps the tabs out of reach
  while the panel is closed", which focuses each tab button with the panel
  closed and asserts `document.activeElement` is not it, then asserts the
  opposite once the panel is open so the assertion cannot pass vacuously.
- [x] R2.2 (MINOR) src/ui/panel.ts:72 - `selectTab("info")` now runs on every
  `noteCardRendered`, and `updateUI()` is called from `submitGuess`'s `finally`
  (src/game/index.ts:148) even when the guess was REJECTED. Re-derived by
  reading both bodies: a rejection leaves `state.lastGuessId` unchanged, so
  `renderLastGuess` re-renders the SAME clade card, which calls
  `noteCardRendered` again. A player parked on `Summary` who mistypes a species
  name is yanked back to `Info` with no new card behind the switch. Gate the
  reset on the card actually changing: keep a module-level `mountedCardTitle`,
  and in `noteCardRendered(title)` call `selectTab("info")` only when
  `title !== mountedCardTitle`, then assign it. That still satisfies R1.1 - an
  accepted guess produces a different clade or species card.
  Response: fixed as directed, plus one thing the finding did not cover. The
  module-level `mountedCardTitle` gate is in `noteCardRendered`, pinned by
  `e2e/ladder.spec.ts` "a rejected guess leaves the player on Summary". But
  gating on the title alone also swallows an EXPLICIT request: a player parked
  on Summary who taps the tree node whose card is already mounted would get
  nothing, because the title did not change. So `panel.ts` exports
  `showCardPane()` and the tree `onSelect` handler (src/game/index.ts) calls it
  before `openPanel()` - the automatic repaint stays quiet, the deliberate tap
  still brings the pane forward. Pinned by "a tree tap on the mounted card
  still shows the card pane". `showCardPane()` deliberately does NOT open the
  panel, for the same `manuallyClosedPanel` reason `selectTab` documents.
- [x] R2.3 (NIT) src/index.html:74 - `#panel-tabs` has `role="tablist"` with no
  accessible name, so it announces as an unnamed tablist. Add
  `aria-label="Info panel views"`. Roving tabindex / arrow-key handling is
  optional at two tabs; leaving it out is fine.
  Response: fixed. `aria-label="Info panel views"` on `#panel-tabs`
  (src/index.html). Roving tabindex left out, as the finding allows.

Round 1 verification, each confirmed against the diff before its box was
ticked:

- R1.1 CONFIRMED. `selectTab("info")` is the first statement of
  `noteCardRendered` (src/ui/panel.ts:72), before the `isPanelOpen()` early
  return. The reviewer sabotaged that exact line and re-ran
  `e2e/ladder.spec.ts` on `mobile-chromium`: 1 failed, `toBeHidden` on
  `#panel-summary-container` received "visible" at ladder.spec.ts:82. Restored;
  worktree clean.
- R1.2 PUSHBACK ACCEPTED. `renderRoundSummary` (src/ui/panel.ts:191) bypasses
  `mountCard` entirely. The reasoning holds: `.ladder-card .card-header` is
  `flex-direction: column` while `autoShrinkText` subtracts sibling
  `offsetWidth` as horizontal (src/ui/autoShrink.ts:20-27), so a re-measure on
  tab switch would under-size. `.card-title` is `white-space: nowrap;
  overflow: hidden` (src/partials/card.css:254), so the new
  `scrollWidth - clientWidth <= 0` assertion is a real overflow check. It is
  vacuous with respect to the deletion, as the Response itself states, and it
  does pin the "fits unaided" claim the deletion rests on.
- R1.3 CONFIRMED. Both panes carry `role="tabpanel"` and the matching
  `aria-labelledby` (src/index.html:99-100, 105-106).
- R1.4 CONFIRMED. `rankLadder.ts` is in the AGENTS.md Core list.
- R1.5 CONFIRMED. No `ladder-empty` match anywhere in `src/`, `e2e/` or
  `test/`; `test/rankLadder.test.ts:202` still pins the empty-ladder contract
  on the module rather than on the card.

Verification, re-derived in-session rather than taken from the reviewer:

- `nix develop -c npm run ci` from the worktree: exit 0, 153 Playwright tests
  passed, 27 jest suites / 369 tests, format, lint, pipeline and coverage
  clean.
- R2.1 re-derived by `git show master:src/index.html` over the `#info-panel`
  subtree: zero `button`, `a`, `input` or `tabindex` matches, so the two tab
  buttons are newly focusable-while-offscreen, not a pre-existing hole.
- R2.2 re-derived by reading `submitGuess` (src/game/index.ts:131-158) and
  `renderLastGuess` (src/ui/panel.ts:105-149): `updateUI()` sits in the
  `finally`, and the rejection path leaves `lastGuessId` untouched, so the same
  card re-renders and re-selects the Info tab.
- Proofs re-run: `test -s tasks/20260729-182320/DECISION.md` passes;
  `grep -q 'panel-tab' src/index.html` passes here and is 0 matches on master;
  `test/rankLadder.test.ts` 12/12 including the invariant and roll-up cases;
  `e2e/ladder.spec.ts` 3/3 on `mobile-chromium`. No `manual:` proofs exist.
- Also verified: `buildGuessTree` returns at most one root, so the
  roll-up-to-`rows[0]` fallback cannot mis-attribute across components; and
  `.card-content` keeps `overflow-y: auto`, so a long ladder scrolls rather
  than clipping.

Not verified: the Pixel 5 screenshot cited under Evidence still has no artifact
in the worktree; the visual legibility of the reused `.node-close-*` tier
classes on a pill-shaped chip; the tab strip under a real screen reader.

Process signal: TASK.md's Evidence section still says "152 E2E" while the
round-1 subsection corrects it to 153, which matches this run. Stale but
self-corrected in the same file.

## Round 3

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R3.1 (MAJOR) src/ui/panel.ts:85 - the R2.2 `changed` gate splits what the
  pull tab PROMISES from what the panel OPENS onto. `noteCardRendered` now runs
  `if (changed) selectTab("info")` but still assigns `unseenCardTitle = title`
  unconditionally on the closed-panel path (panel.ts:86-87), so an unchanged
  card still lights `has-unseen` and sets
  `aria-label="Open info panel: <clade>"` (`syncPullTab`, panel.ts:47-67).
  Re-derived in-session, not taken from the reviewer: `renderLastGuess` picks
  the card with `findBestHintCladeId(roots)` (panel.ts:151), so a valid guess
  whose LCA with the target sits at or above the current best clade re-mounts
  the SAME clade card, and on a narrow viewport the same function deliberately
  does not `openPanel()` (panel.ts:164-167), which makes closed-panel the
  default mobile state. Player parked on `Summary`, panel closed, makes a
  non-deepening guess: the pull tab names a clade card, and tapping it opens
  the `Summary` pane with that card mounted into the `hidden` Info container.
  This is a regression the round-2 fix introduced - before it, `selectTab`
  was unconditional and the promise always matched the pane.
  Fix: gate the advertisement on the same condition as the pane, so the two
  cannot diverge - move `unseenCardTitle = title; syncPullTab();` inside the
  `changed` branch (an unchanged card is not new information, so it should not
  claim the unseen marker either, the same argument the pre-first-guess
  `clearUnseenCard()` at panel.ts:141 already makes). The narrower alternative
  the round-3 reviewer proposed, `if (changed || !isPanelOpen())
  selectTab("info")`, also closes the divergence and preserves R2.2, whose case
  only arises with the panel open; it leaves the spurious unseen marker on a
  rejected guess in place. Either is acceptable; the first deletes a case
  rather than adding one. Pin it in `e2e/ladder.spec.ts` with a guess that does
  NOT deepen the best clade - `ladder.spec.ts:65` uses `CLOSENESS_LADDER[3]`,
  which does deepen it, which is why the existing case passes.
  Response: fixed, taking the first remedy. `noteCardRendered` now early-returns
  on an unchanged card, so the pane switch AND the unseen advertisement sit
  behind the same gate and cannot diverge; the comment says why they are one
  decision rather than two. The narrower alternative was rejected for the reason
  the finding gives - it leaves the spurious unseen marker on a rejected guess,
  which is the same defect one case further along. Pinned by a new
  `e2e/ladder.spec.ts` case, "a non-deepening guess does not advertise a card
  behind Summary": it parks the pane on Summary, closes the panel, guesses
  Saltasaurus (a sauropod, so its LCA with the target sits ABOVE the theropod
  clade Ceratosaurus already revealed), asserts the museum card really did not
  change, then asserts no `has-unseen`, a plain `aria-label="Open info panel"`,
  and that opening the panel still lands on Summary. Confirmed red on the
  unfixed code for the intended reason: `has-unseen` present, advertising
  "Averostra".

Process signal:

- `showCardPane()` (panel.ts:195) is an exported one-statement wrapper with a
  single caller. It keeps `selectTab` private and the tab vocabulary out of
  `src/game/index.ts`, so it is not a YAGNI finding, but it is the thinnest
  abstraction the diff could have. Noted, not charged.
- The round-3 reviewer read TASK.md's "152 E2E" (line 101) as a stale
  self-contradiction. Rejected on inspection: lines 101, 139 and 168 are three
  separate per-round Evidence entries, each accurate when written, and the
  `tasks/` tree is append-only history. Not a finding and not a signal.

Round 2 verification, each re-derived against the diff before its box was
ticked:

- R2.1 CONFIRMED. `inert` on `#info-panel` (src/index.html:71), cleared in
  `openPanel()` (src/ui/panel.ts:108), set in `closePanel()` (panel.ts:101),
  absent from `syncPullTab()`. The closed panel is transform-only on both
  viewports (panel.css:18, responsive.css:114-125), so `inert` never covers a
  visible panel; the initial load ships closed and inert, and both other
  openers (`onboardingBrief.ts`, `hintChip.ts`) route through `openPanel()`.
  `e2e/ladder.spec.ts:99` is non-vacuous: focus fails while closed and
  succeeds while open.
- R2.2 CONFIRMED AS IMPLEMENTED, INCOMPLETE. The `mountedCardTitle` gate is at
  panel.ts:73-85 and `showCardPane()` is called from src/game/index.ts:202
  before `openPanel()`. Both new e2e cases fail with their fix deleted:
  without the gate the rejected-guess case hits `selectTab("info")` and fails
  `toBeVisible()` at ladder.spec.ts:137; without `showCardPane()` the tree tap
  leaves `changed === false` and fails `toBeVisible()` at ladder.spec.ts:168.
  The gate's remaining hole is R3.1.
- R2.3 CONFIRMED. `aria-label="Info panel views"` on `#panel-tabs`
  (src/index.html:80).

Verification run in-session:

- `nix develop -c npm run ci` from the worktree: exit 0, 27 jest suites /
  369 tests, 156 Playwright tests passed, lint, format, pipeline and coverage
  clean. Matches the round-3 close-out's claimed 156.
- Both `cmd:` proofs re-run green: `test -s tasks/20260729-182320/DECISION.md`
  and `grep -q 'panel-tab' src/index.html`. No `manual:` proofs exist.
- R3.1 re-derived by reading `noteCardRendered`, `syncPullTab` and
  `renderLastGuess` in full rather than accepting the reviewer's summary; the
  narrow-viewport no-auto-open branch is what makes the case ordinary rather
  than exotic.
- Worktree clean; no sabotage performed this round, so the deletion checks
  above are derived by reading.

Not verified: the Pixel 5 screenshot cited under Evidence still has no
artifact in the worktree; behaviour under a real screen reader; `inert`
fallback on browsers without support.

## Round 4

- REVIEWER: out-of-context
- VERDICT: APPROVE

No findings. The round-3 fix introduced no regression, and no BLOCKER or MAJOR
that rounds 1-3 missed survived this pass.

Round 3 verification:

- R3.1 CONFIRMED FIXED, by sabotage rather than by reading. `noteCardRendered`
  (src/ui/panel.ts:71-92) now opens with a single `if (!changed) return;`, so
  `selectTab("info")` and the `unseenCardTitle` / `syncPullTab()`
  advertisement sit behind ONE gate and cannot diverge. The out-of-context
  reviewer reverted the gate to its round-2 form and ran `e2e/ladder.spec.ts`
  on `mobile-chromium`: 1 failed / 6 passed, failing at ladder.spec.ts:173 with
  `class="panel-pull has-unseen"` and
  `aria-label="Open info panel: Averostra"` - exactly the red the fix's
  Response claims. Worktree restored; `git status --porcelain` empty.

Round 2 boxes ticked this round, on the round-3 reviewer's recorded
confirmations plus R3.1's close: R2.1 and R2.3 were CONFIRMED in round 3, and
R2.2's only recorded hole WAS R3.1, which is now closed. Their checkboxes had
been left unticked in the round-3 pass; the prose confirming them was already
committed.

Independently re-derived in-session, not accepted from the reviewer:

- The closed-panel state machine. With the early return in place,
  `unseenCardTitle` is assigned only on a pass that also ran
  `selectTab("info")`, and `selectTab` has exactly three callers - the two tab
  click handlers, which need an open non-inert panel, and `showCardPane()`,
  which selects Info. "The pull tab advertises a card" and "the pane is Info"
  are therefore the same state. The other three paths that can re-mount an
  unchanged card - `wireHintPurchase` (a hint deepens the best clade, so the
  card changes), `renderHowToPlayCard` via `onboardingBrief`, and the
  `#open-panel` re-render - cannot open onto the wrong pane.
- The comment above `selectTab("info")` reading "BEFORE the early return"
  refers to the `isPanelOpen()` return below it, not the `!changed` return
  above it, and is accurate as written.

Verification run in-session:

- `nix develop -c npm run ci` from the worktree: exit 0. 27 jest suites / 369
  tests, 157 Playwright tests passed, coverage 95.1% stmts / 80.04% branch,
  lint, format and pipeline clean. Matches the round-3 close-out's claimed 157.
- Both `cmd:` proofs green: `test -s tasks/20260729-182320/DECISION.md` and
  `grep -q 'panel-tab' src/index.html` (0 matches on master). `tatr proofs`
  lists six proofs and no `manual:` entries, so nothing is self-ticked and
  there are no pending user checks.
- Round-3 commit `5fa5d63` adds a test and weakens or deletes none; the six
  pre-existing ladder cases pass under the fix and under the sabotage.
- Doc sweep on the round-3 change: it renamed nothing and added no flag or
  path. `README.md:47`'s "the info panel" stays accurate; AGENTS.md's Core list
  already carries `rankLadder.ts` from R1.4.
- Honesty: the round-3 Evidence entry's count, its red-first claim and its
  stated failure reason all reproduce.

Not verified: the Pixel 5 screenshot cited under Evidence still has no
artifact in the worktree (carried forward from rounds 2 and 3); visual
legibility of the reused `.node-close-*` tier classes on a pill chip; the tab
strip under a real screen reader; `inert` fallback on browsers without support.
