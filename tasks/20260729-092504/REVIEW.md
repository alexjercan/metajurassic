# Review round 1

- VERDICT: REQUEST_CHANGES

The journey maps are accurate against the shipped code, and most of the new
assertions really do discriminate - I re-ran M1, M3, M4 and M7 from NOTES.md and
all reproduced, plus three mutations of my own that the branch did not record
(two of which the tests caught, one of which they did not). The change is close
to landable; the findings below are one assertion that provably cannot fail, one
fixture whose correctness nothing pins, and two doc claims that overstate.

## Findings

### [MAJOR] the "hidden autocomplete" assertion cannot fail
- Where: e2e/postgame.spec.ts:75
- What: `expect(page.locator("#autocomplete-box")).toBeHidden()` is satisfied by
  the STYLESHEET, not by `disableInput()`. `.autocomplete-box` carries
  `display: none` in src/style.css:1082 and the box is only shown while the
  player is typing; the fixture reloads into a finished round and never opens
  it. I deleted `autocompleteBox.style.display = "none";` from `disableInput()`
  (`// MUTANT E2`) and the test stayed GREEN (1 passed, 928ms). This is the
  element-exists-but-was-never-open variant of
  `a-mutation-must-reach-the-branch-it-claims-to-test` /
  `a-guard-no-test-can-fail-is-a-comment`, and TASK.md's step list advertises
  "hidden autocomplete" as covered.
- Why it matters: the one leg of the post-game close-out that this branch does
  NOT pin is presented as pinned, in a change whose entire value is
  discrimination. A future edit could leave a populated suggestion list open
  over a finished board and the suite would not notice.
- Suggested change: assert the thing `disableInput()` actually does, i.e. the
  INLINE style it writes - `expect(await page.locator("#autocomplete-box")
  .evaluate((el) => (el as HTMLElement).style.display)).toBe("none")` - or reach
  the branch for real by typing a prefix on a live round (so the box is open),
  finishing the round in-page, and then asserting hidden. Sibling assertions on
  the same line (`toBeDisabled`, `placeholder`) both fail under mutation, so
  only this one needs work.

### [MINOR] the loss-share streak fixture is not itself asserted, so the test can silently return to vacuity
- Where: e2e/share.spec.ts:94-119, 280
- What: the whole point of `seedPreviousDayWin` is that `formatStatsLine`'s guard
  is `mode === "daily" && isWin && stats.currentStreak > 0` (src/gameState.ts:382)
  - with `currentStreak === 0` the `not.toMatch(/day streak/)` assertion passes
  vacuously. The test's only check that the fixture landed is
  `expect(text).toContain("Avg.")`, which proves a win exists in storage but says
  nothing about its DATE, and `calculateStreak` only counts a streak when the
  last win is today or yesterday (src/gameStats.ts). If the yesterday key ever
  stops resolving to the previous calendar day (a change to
  e2e/dailyKeyMirror.ts, `formatPuzzleId`, or the frozen date), the fixture
  degrades to "a win from some other week", `Avg.` still prints, and the test
  goes green while asserting nothing. Note the sibling WIN test one describe up
  pins the exact value (`toContain("Avg. 4.0")`, line 154), so the weaker form
  here is an inconsistency as well as a hole.
- Why it matters: this is the exact two-condition-guard vacuity the branch
  claims to have eliminated ("Without that win the suppression branch is guarded
  on two conditions at once and the assertion would pass vacuously") - the
  elimination holds today (M4 confirmed, see Verified) but is unpinned for
  tomorrow.
- Suggested change: assert the fixture positively in the same test. Cheapest:
  `expect(text).toContain("Avg. 1.0")` (the prior win is the only win, so this
  pins that it was counted) PLUS a positive read of the streak - e.g. navigate
  to `/profile/` in the same test and
  `expect(page.locator("#current-streak-daily")).toHaveText("1")` before
  clicking share, which fails loudly if the derived key stops meaning
  "yesterday".

### [MINOR] TASK.md's coverage audit contradicts itself about the share wiring
- Where: tasks/20260729-092504/TASK.md, "Coverage audit (2026-07-30)"
- What: the audit lists `e2e/share.spec.ts` under "What EXISTS today" ("a WIN
  shared through the native sheet and through the clipboard fallback"), then
  three bullets later says under "What has NO coverage at any level" that "the
  share-button wiring [has] no direct test". The `#modal-share-btn` click
  handler in `initGame` was already driven end to end by the pre-existing
  share.spec.ts tests on master (verified: those tests exist at
  share.spec.ts:134 and :168 before this branch).
- Why it matters: the audit is the justification for this task's scope and the
  baseline the next task (`20260729-101838`) will read; an overstated gap is the
  same defect class as an overstated proof.
- Suggested change: narrow the bullet to what was genuinely uncovered - the
  post-game input disabling, the hint-chip swap, and the FAILING clipboard write
  - and drop "the share-button wiring" from the no-coverage list.

### [MINOR] the hint chip is asserted as markup, not as a working route
- Where: e2e/postgame.spec.ts:134-153
- What: the test is titled "the hint slot has become the practice route" and
  pins the class swap, the text, and `href` - but never clicks it. The modal's
  Practice action right beside it IS clicked and its navigation asserted (line
  155), so the asymmetry is visible. `.hint-box.disabled` sets
  `pointer-events: none` (src/style.css:211-215) and the anchor is nested inside
  the chip, so "reachable and navigates" is a genuinely separate property from
  "has an href" - the family of `a-claim-that-a-test-cannot-cheat-must-be-run-not-written`
  and `replacing-an-assertion-means-enumerating-what-it-asserted`.
- Why it matters: the retention route the task exists to cover is asserted one
  step short of the behaviour a player performs.
- Suggested change: click `#hint-text a` and `waitForURL(/\/practice\/?$/)` in
  the same test (or a sibling), keeping the markup assertions as they are.

### [NIT] "fresh practice round" claims more than the practice page guarantees
- Where: e2e/postgame.spec.ts:155-172
- What: `Guesses Left: 25` holds because this fixture has no practice round in
  storage. Per AGENTS.md and `20260729-101754`, the practice page RESUMES an
  unfinished round, so the Practice action does not guarantee a fresh board in
  general.
- Why it matters: a reader takes the title as the invariant; a later change that
  makes the modal link carry a seed would look like it broke a promise this test
  never actually made.
- Suggested change: retitle to "the Practice action opens a playable practice
  round" (the body's own comment already says "playable"), or clear practice
  storage in the fixture and say why.

### [NIT] two fixtures duplicated between the specs instead of living in helpers.ts
- Where: e2e/postgame.spec.ts:19-46, 199-214 vs e2e/share.spec.ts:76-133
- What: the frozen-clock + seed + reload flow and the "MAX_GUESSES wrong guesses
  from the served payload" helper now exist twice, comment text and all
  (`seedLoss` / `lossGuesses`), while e2e/helpers.ts is the shared fixture
  module.
- Why it matters: `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`
  (x2 in this ledger) - the next change to the loss fixture has two sites and no
  test that notices when only one moves.
- Suggested change: move `lossGuesses` and the open-finished-daily flow into
  e2e/helpers.ts and import them from both specs.

### [NIT] the mutation log is labelled "eight mutations (M1-M9)" but holds nine rows and no M8
- Where: tasks/20260729-092504/TASK.md ("Proof runs"), NOTES.md mutation table
- What: the table lists M1, M2, M3, M4, M5, M5b, M6, M7, M9 - nine experiments,
  with M8 absent from the numbering.
- Why it matters: a mutation log is the re-runnable record; a numbering gap makes
  a reader wonder which experiment was dropped and why.
- Suggested change: renumber contiguously (or say plainly that M8 was abandoned
  and what it was), and make the count in TASK.md match the table.

Also checked and found clean (no finding):

- NOTES.md's claim that the post-game chip cannot be misread as a disabled hint
  is CORRECT: `#hint-box` contains nothing but `#hint-text`
  (src/index.html:24-27), `updateHintButton` replaces that node's entire
  innerHTML, and `.hint-box.practice` restyles the border to amber while
  `.disabled`'s `opacity: 0.5; pointer-events: none` is removed
  (src/style.css:211-222). No residual hint wording survives.
- The claim that `initGame` has no test coverage is literally true as written in
  the spec header ("imported by no unit test"): `grep -rn initGame test/ e2e/ src/`
  returns only src/index.ts, src/practice.ts and its own definition.
- The yesterday-key derivation (decrement the 5-digit counter) IS sound for the
  frozen clock: `formatPuzzleId` is `(seed mod 1e5) + 1`, daily seeds are
  consecutive per calendar day, and 2026-06-15 sits at #00167, nowhere near the
  wrap. The only broken case is display `00000`, where
  `String(-1).padStart(5, "0")` yields `000-1` and the write lands under a key
  nothing reads - unreachable for daily seeds until the year 2299 and irrelevant
  under a frozen clock, so I am not filing it.
- The "no further guess is recorded" outcome assertion is real, not decorative:
  removing BOTH defending guards turns it red (see Verified), so the poll is not
  merely resolving on its first sample.
- Assertions use imported constants (`MAX_GUESSES`, the real
  `src/jurassic/index.json` species count) rather than restated numbers; no
  font-metric or geometric assertion was added; no `toContain` substring
  assertion with a longer-sibling collision.

## Verified

All runs: `cd <worktree> && nix develop -c env E2E_PORT=8181 npx playwright test
... --reporter=list`. src/ was mutated from and restored via a scratch copy
(`scratchpad/src-pristine`), never `git checkout`; `git diff --quiet -- src/`
is clean at the end (checked after every restore and at the end - `SRC_CLEAN`).

- Baseline, both specs: `13 passed (7.2s)`.
- Whole suite unmutated: `125 passed (36.6s)` - matches TASK.md's recorded proof
  run exactly.
- **M4** (`src/gameState.ts`: `if (mode === "daily" && isWin && stats.currentStreak > 0) {`
  -> `if (mode === "daily" && stats.currentStreak > 0) { // MUTANT M4`), `-g "bragging"`:
  1 failed at share.spec.ts:281, `Expected pattern: not /day streak/`, received
  `🔥 1 day streak | Avg. 1.0`. As described - and it also proves the fixture
  banks a real streak of 1 today, which is the claim NOTES.md makes for it.
- **M1** (`src/game.ts`: `        playerInput.disabled = true;` ->
  `        // MUTANT M1: disabled flag removed`), `-g "the input is closed"`:
  1 failed at postgame.spec.ts:73, `Expected: disabled / Received: enabled`. As
  described.
- **M3** (`src/game.ts`: `const roots = buildGuessTree(state, state.isGameOver());`
  -> `const roots = buildGuessTree(state, false); // MUTANT M3`, anchored on the
  preceding `updateHintButton();` line as NOTES.md says), `-g "reveals the answer"`:
  1 failed at postgame.spec.ts:241, `locator resolved to 0 elements` for
  `#tree-container .node-revealed`. As described.
- **M7** (`src/index.html`: the `<a class="modal-btn modal-btn-practice" ...>`
  element -> `<!-- MUTANT M7: practice action removed -->`), whole postgame spec:
  `3 failed, 6 passed`. NOTES.md records "2 failed", which is what its narrower
  two-pattern `-g` run would print; the third failure is the loss describe's
  "the same three retention actions are offered". Not a false claim, just a
  scoped one.
- **E2, mine** (`src/game.ts`: `        autocompleteBox.style.display = "none";`
  -> `        // MUTANT E2: autocomplete never hidden at game over`),
  `-g "the input is closed"`: **1 passed (928ms)** - the finding above.
- **E3, mine** (`src/game.ts`: `        playerInput.placeholder = "";` ->
  `        // MUTANT E3: placeholder left in place`), `-g "the input is closed"`:
  1 failed at postgame.spec.ts:74. The placeholder leg does discriminate.
- **E1, mine** (both defenders removed at once: `            if (playerInput.disabled) return;`
  -> a comment, AND `submitGuess`'s `if (state.isGameOver()) { showGameOverModal(); return; }`
  -> a comment), `-g "the input is closed"`: 1 failed at postgame.spec.ts:98,
  `Expected: 4 / Received: 5`. `GameState.makeGuess` does not itself refuse a
  finished round, so the guarantee is defended exactly twice as the spec's
  comment says, and the domain-counter assertion does catch their removal.

# Review round 2

- VERDICT: APPROVE

All seven round-1 findings are addressed, and the MAJOR one is addressed better
than I asked for: the answer is not a stronger assertion, it is the finding that
`disableInput`'s `autocompleteBox.style.display = "none"` is unfalsifiable
because it is redundant, plus a task record that says so instead of claiming
coverage. I tried to break that reachability argument with a path the branch did
not test and could not - detail below. One MINOR remains, and it is bookkeeping
only: the DoD's "Proof runs" numbers are stale relative to the round-2 tree. I
have already re-measured them (they are in Verified), so this needs an edit, not
another experiment.

## Findings

### [MINOR] the DoD's "Proof runs" block still records the round-1 numbers
- Where: tasks/20260729-092504/TASK.md:99-111
- What: it reports the E2E step as `125 passed (28.9s)`; the tree now has 126
  E2E tests (I measured `126 passed (22.2s)`). It also says "the eight mutations
  ... are in NOTES.md", while NOTES.md now documents nine (M1-M8 with M5 split)
  plus the four round-2 experiments E1-E4. Related: "Every new test was falsified
  by a mutation before being believed" is now true only via M1 for the newest
  test - the mutation table records M1's run as `-g "the input is closed"`, not
  against "the round ending in-page". (I checked: M1 does redden the new test,
  `Expected: disabled / Received: enabled` at postgame.spec.ts:256, so the claim
  is sound, just not evidenced by any recorded run.)
- Why it matters: `a-verification-result-expires-when-the-code-it-ran-against-changes`
  - a proof-run block that names a test count the branch no longer has is the
  exact drift that lesson exists for, and it is the first thing the next reader
  will trust.
- Suggested change: update the block to the re-measured figures (E2E
  `126 passed`, Jest `323 passed`, format:check and lint clean), say "nine
  mutations, M1-M8 with M5b, plus E1-E4 from the review", and add the M1-vs-
  in-page-test row so the "every new test" sentence has a run behind it.

### Round-1 findings: how each was resolved (verified, no finding)

- MAJOR (autocomplete): resolved by DELETING the claim rather than by a new
  assertion, which is the correct outcome. I re-ran E2 against the renamed test
  and reproduce their result exactly (`1 passed (1.0s)`). I then tried to defeat
  the reachability argument with the one path their own note names as the
  remaining candidate - a hint that spends the last HINT_COST guesses, which
  ends the round through `useHint`, never through `selectAndSubmit`, with the
  suggestion list on screen - and even that does not falsify the line. See
  Verified for the probe and its two runs. The argument in the spec comment,
  TASK.md and NOTES.md is accurate as written, including the enumeration: a
  round can only end via `makeGuess` (Enter and click both route through
  `selectAndSubmit`, which hides the box at src/ui/autocomplete.ts:67; a query
  with no matches was already hidden at line 79) or via `useHint` (blur timer,
  line 132). One empirical correction worth having in the record: the blur timer
  fires even with `page.clock.install` in force, so the "freeze the clock and
  catch the 100ms window" idea I had does not work either.
- MINOR (streak fixture): the profile read is the right shape, and E4 reproduces
  exactly (`#current-streak-daily` `Expected: "1" / Received: "0"`). `Avg. 1.0`
  now matches the precision of its sibling win test. I re-ran M4 against the
  CHANGED test, since my round-1 M4 result was against the old body: still red at
  share.spec.ts:280 with `🔥 1 day streak | Avg. 1.0`, so the suppression
  assertion still discriminates after the fixture gained the profile hop.
- MINOR (TASK.md contradiction): the audit bullet now says the share button is
  already covered on its win paths and scopes the gap to the loss branch and the
  failure path. Matches what is on disk in master's share.spec.ts.
- MINOR (hint chip): the test now clicks `#hint-text a`, waits for the URL, and
  checks the practice board is live. 25 repeats clean.
- NIT (fresh vs playable), NIT (duplication), NIT (numbering): all done.
  `wrongGuessIds` in e2e/helpers.ts is now the single owner of the
  "MAX_GUESSES wrong ids from the served payload" fixture, and the M8 row's
  honest note that its pasted string still reads `MUTANT M9` because that is
  what ran is exactly the right call under `quote-the-mutation-not-the-memory-of-it`.

### [NIT] nothing in src/ marks the redundant line as redundant
- Where: src/game.ts, `disableInput()`
- What: the knowledge that `autocompleteBox.style.display = "none"` is dead on
  every reachable path now lives only in tasks/20260729-092504/{TASK,NOTES}.md
  and in a comment in e2e/postgame.spec.ts.
- Why it matters: the next person to touch `disableInput` or the autocomplete
  blur timer has no local signal, and the pair is exactly the kind of
  belt-and-braces that gets "cleaned up" from one side.
- Suggested change: out of scope for a test-only branch, so either leave it or
  file a one-line follow-up (alongside 20260730-165921) to add the comment - or
  to drop the line - with the reachability argument attached. Not a blocker.

## Verified

Same protocol as round 1: mutations applied to and restored from scratch copies
(`scratchpad/src-pristine` for src/, `scratchpad/e2e-round2/` for the branch's
own spec files), never `git checkout`. `git diff --quiet -- src/` clean after
every restore and at the end; the scratch probe spec was deleted (`git status`
shows only the five intended modified files plus this REVIEW.md).

- **E2 vs the renamed in-page test** (`src/game.ts`:
  `        autocompleteBox.style.display = "none";` ->
  `        // MUTANT E2: autocomplete never hidden at game over`),
  `-g "in-page"`: `1 passed (1.0s)`. Reproduces the branch's recorded result.
- **My probe for a third reachable path** (scratch spec, since deleted): frozen
  clock, daily round seeded with `MAX_GUESSES - HINT_COST` = 22 wrong guesses so
  `Guesses Left: 3` and `#hint-box` is enabled, type an unguessed species to open
  the list (`expect(box).toBeVisible()`), then click `#hint-box` - `useHint`
  spends the last 3 guesses, `isRoundOver` fires on
  `guesses.size + hints * HINT_COST >= MAX_GUESSES`, and the round ends with the
  list on screen and `selectAndSubmit` never called.
  - pristine src: `1 passed (1.4s)`.
  - with E2 applied: `1 passed (1.3s)` - so `disableInput` is not what closes it.
  - with E2 **and** E5 (`src/ui/autocomplete.ts`, the blur timer body:
    `            autocompleteBox.style.display = "none";` ->
    `            // MUTANT E5: blur no longer hides the box`): **1 failed**,
    `#autocomplete-box` `unexpected value "visible"` at the `toBeHidden()` line.
  - Conclusion: the blur timer is the mechanism on this path too, it fires even
    under `page.clock.install`, and the two hides are redundant with respect to
    any non-racing assertion. The branch's claim stands.
- **E4 vs the fixture** (`e2e/share.spec.ts`:
  `const counter = String(Number(digits[1]) - 1).padStart(5, "0");` ->
  `const counter = String(Number(digits[1]) - 40).padStart(5, "0"); // MUTANT E4: win banked 40 days ago`),
  `-g "bragging"`: 1 failed at share.spec.ts:253,
  `#current-streak-daily` `Expected: "1" / Received: "0"`. As recorded.
- **M4 re-run against the CHANGED test** (`src/gameState.ts`:
  `if (mode === "daily" && isWin && stats.currentStreak > 0) {` ->
  `if (mode === "daily" && stats.currentStreak > 0) { // MUTANT M4`),
  `-g "bragging"`: 1 failed at share.spec.ts:280, received
  `🔥 1 day streak | Avg. 1.0`.
- **M1 vs the new in-page test** (`        playerInput.disabled = true;` ->
  `        // MUTANT M1: disabled flag removed`), `-g "in-page"`: 1 failed at
  postgame.spec.ts:256, `Expected: disabled / Received: enabled`.
- Whole E2E suite, unmutated: `126 passed (22.2s)`.
- Jest (`nix develop -c npx jest`): `21 suites, 323 passed`.
- `nix develop -c npm run format:check`: "All matched files use Prettier code
  style!". `nix develop -c npm run lint`: exit 0, no output (the gate runs at
  `--max-warnings=0` and the new e2e code is inside its globs).
- Flake, per `a-whole-file-repeat-count-is-not-a-sample-of-one-test` (each `-g`
  narrowed to the one test, so the total IS the repeat count):
  `-g "in-page" --repeat-each=25` -> 25 passed;
  `-g "hint slot" --repeat-each=25` -> 25 passed (this one now clicks and
  navigates, so it was the one worth stressing);
  `-g "bragging" --repeat-each=15` -> 15 passed (three page loads and a profile
  hop).
