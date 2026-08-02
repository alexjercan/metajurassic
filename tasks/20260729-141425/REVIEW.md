# Review: Filter the species archive by clade

- TASK: 20260729-141425
- BRANCH: feat/archive-clade-filter

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) src/species.ts:106 - the diff's principal structural change
  to `species.ts` is untested. `setupCarouselNav` was reshaped to attach once
  and return `updateButtons`, and `renderCards` now calls `carousel.scrollLeft
  = 0; refreshNav()` - Step 4 spent its whole text on this, naming
  `src/profile/dinosaurList.ts:48` as the defect not to copy. No test in `e2e/`
  touches the carousel nav at all (`grep -rn "carousel-right" e2e/` matches
  only `archiveFilter.spec.ts`, and only via `.archive-carousel`). Moving
  `setupCarouselNav` back inside `renderCards` would stack a duplicate listener
  set per filter change and every check would still pass. Add to
  `e2e/archiveFilter.spec.ts`: after two `selectOption` calls, one click on
  `#carousel-right` advances `scrollLeft` by the single `scrollAmount` of 370
  and not 740 (duplicate listeners double each `scrollBy`); and filtering to
  `avialae`, the one clade with a single member, leaves `#carousel-right`
  disabled, which pins the `refreshNav()` call rather than the listener count.
  - Response: fixed. Three tests added to `e2e/archiveFilter.spec.ts`, each
    falsified against a deliberately regressed `species.ts` before being kept.
    The finding's suggested nav-click assertion turned out to be unfalsifiable
    and was replaced: two smooth `scrollBy` calls issued in one tick resolve to
    the same target instead of adding up, so duplicate button listeners are
    invisible. The wheel handler scrolls instantly, so the test wheels over the
    carousel instead and compares the distance before and after two filter
    changes - that fails 1450 vs 722 with the nav re-wired inside the render.
    The forward-nav test fails as predicted with `refreshNav()` removed. The
    third assertion, that a filter change starts the new list at its beginning,
    could NOT be made to fail, and that is a real defect it uncovered rather
    than a weak test: `carousel.innerHTML = ""` already clamps `scrollLeft` to
    0, so the explicit `carousel.scrollLeft = 0` was dead code and its comment
    claimed a rewind that never happens. The line and the comment are removed,
    the assertion is kept as a guard on the re-render as a whole, and Step 4 is
    corrected in TASK.md.

- [x] R1.2 (MINOR) src/species.html:16 - `archive-container-filtered` names a
  state the class does not track. It is applied unconditionally in the markup
  and never toggled, so it means "this archive has a filter row", while its
  name tells a cold reader it is set while a filter is active. Its one rule
  (`src/partials/archive.css:126`) is a permanent height-budget change, not a
  filtered-state style. Rename the class to `archive-container-with-filter` in
  `src/species.html` and `src/partials/archive.css`.
  - Response: fixed. Renamed to `archive-container-with-filter` in both files,
    and the rule's comment now says it applies to any archive carrying a filter
    row rather than while a filter is applied.

- [x] R1.3 (NIT) src/partials/archive.css:131 - a blank line was inserted
  between `text-align: center;` and `margin-top: 2vh;` inside `.archive-back`,
  a rule the task does not otherwise touch. Drop it to keep the diff to the
  feature.
  - Response: fixed. Blank line removed; `.archive-back` is untouched by the
    diff again.

### Verified

- `npm run ci` run in full from the worktree: format:check, lint, pipeline,
  24 Jest suites / 336 tests, 135 Playwright tests, all green.
- Re-derived the load-bearing content numbers independently of
  `cladeFilter.ts`, walking `src/jurassic/index.json` in Python: Cerapoda has
  35 members drawn from 22 distinct immediate clades, none of which is
  `cerapoda`; Dinosauria returns all 150; exactly one of the 108 clades has a
  single member, so DECISION.md's "107 of the 108 have more than one" holds.
- Re-derived DECISION.md's footer claim rather than taking it: removed the
  `.footer-label-long` rule from `src/partials/responsive.css` and ran
  `e2e/onboarding.spec.ts`, which failed at 320x568 with "extends 12px past the
  bottom of .game-area" - the exact clip the record cites. Restored from a
  scratch copy; tree clean.
- The latent coupling the new code leans on - `Clade.id` is the raw JSON key
  while `buildGameData` keys the map by `name.toLowerCase()`, so an option's
  `value` would stop resolving through `findCladeById` if the two diverged - is
  already pinned by the pre-existing "keeps every clade's JSON key equal to its
  lowercased display name" in `test/dataIntegrity.test.ts`. Not a finding.
- Doc-surface sweep for the changed surfaces (`/species`, the footer, the
  `?clade=` param) across `README.md`, `AGENTS.md` and `src/faq.html`: no stale
  text. The FAQ's archive links and copy remain accurate.
- Every Step's literal text against the diff. Step 8 is the one deviation: it
  said to adjust the `calc(100vh - 200px)` budget at `archive.css:50` and its
  `responsive.css` override together, and the diff instead adds a
  `.archive-container-filtered .archive-card` override. Accepted - it avoids a
  second magic number, wins on specificity inside the media query, and both
  viewports are pinned by the new `expectFullyVisibleWithin` tests.

- Process signal: the footer's narrow-viewport budget was discovered during the
  work, not planned - adding a fourth footer link cost the onboarding brief
  12px at 320x568. The plan's Step 8 anticipated the same class of problem for
  `/species` but not for the footer link in Step 7. A `page-fixed` height
  budget is a shared resource, and any Step adding chrome to a shared partial
  is worth checking against it up front.

## Round 2

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R2.1 (MAJOR) src/species.ts:98 - the round-1 fix deleted
  `carousel.scrollLeft = 0` on the claim that `carousel.innerHTML = ""` already
  clamps `scrollLeft` to 0, and wrote that claim into the comment, into TASK.md
  Step 4 and into the R1.1 Response. The claim is false. Re-derived in Chromium
  on a synthetic overflow box: setting `scrollLeft = 3000`, then
  `innerHTML = ""`, then re-appending children in the SAME tick with no
  intervening layout read leaves `scrollLeft` at 3000 unchanged; it drops to 0
  only when a layout is flushed while the box is empty. The 0 observed on
  `/species` is incidental - `shrinkCardTitle(card)` forces a synchronous layout
  after the first card is appended, and one card is narrower than the carousel,
  so the clamp lands on 0. `renderCards` neither states nor guards that
  coupling, so a caller that stopped measuring per card would silently carry the
  old scroll position into the new list. Restore the explicit
  `carousel.scrollLeft = 0` in `renderCards`, and rewrite the comment to the
  part that IS true: the reset fires no `scroll` event when the position was
  already 0, which is why `refreshNav()` is called explicitly. Correct the same
  false premise in TASK.md Step 4 and in the R1.1 Response.
  - Response: fixed, finding accepted in full. I re-derived the claim before
    conceding it rather than taking it on trust, and it fails exactly as
    described: on a synthetic overflow box, `scrollLeft = 3000` then
    `innerHTML = ""` then re-append in one tick reports 3000, and reports 0 only
    with a layout flushed while the box is empty. `carousel.scrollLeft = 0` is
    restored in `renderCards`, and the comment now says the reset is needed
    BECAUSE the wipe does not reliably do it, naming `shrinkCardTitle` as the
    incidental flush not to lean on. TASK.md Step 4 is restored to its original
    instruction with the bogus round-1 correction removed, and the R1.1 Response
    above is left standing as the record of the wrong call. The e2e assertion is
    unchanged but its comment no longer credits the wipe.
    Corrected in round 3: this Response originally ended by claiming the
    assertion "now pins the explicit reset - which the removal had made
    unfalsifiable". That was wrong, and wrong in the same way as the claim it
    was correcting. See R3.1.

- [x] R2.2 (MINOR) src/clades.ts:30 - the `See species in X` link, this task's
  own route from `/clades` into the filtered archive, is clipped and not
  hit-testable at 320x568: the carousel box ends at y=494 while the link
  occupies 503-536, and `elementFromPoint` at its centre does not return it.
  `/clades` cards already overflowed their carousel on master, so the dead zone
  is pre-existing, but this branch is what puts interactive content into it, and
  the only coverage of the link runs at a desktop viewport. Give `/clades` the
  same carousel-box-relative card budget `/species` got instead of the shared
  `calc(100vh - 200px)`, and add a narrow-viewport case to the `/clades` link
  test so the geometry is pinned.
  - Response: fixed, both halves. Reproduced first: at 320x568 the link
    rendered 38px past the bottom of `.archive-carousel`. `/clades` now carries
    the same carousel-relative card budget, and since both archives need it for
    the same reason the class is renamed once more - `archive-container-fitted`,
    named for what it does rather than for the filter that first needed it - and
    applied to `src/clades.html` as well. Added "the clade card's link into the
    archive is reachable on a small phone", which asserts the geometry AND
    hit-tests the centre point, since the link was visible-but-untappable in the
    original defect. Falsified by removing the class from `src/clades.html`: it
    fails with the link 46px past the carousel's bottom edge.

- [x] R2.3 (MINOR) tasks/20260729-141425/TASK.md:215 - the close-out names
  `.archive-container-filtered .archive-card`, the selector R1.2 renamed. Update
  it to `.archive-container-with-filter`.
  - Response: fixed. The close-out now names `.archive-container-fitted`, the
    name the class ended up with under R2.2, and records why `/clades` joined
    it.

- [x] R2.4 (NIT) tasks/20260729-141425/TASK.md:227 - stale evidence after the
  round-1 fix: "9 tests" in `e2e/archiveFilter.spec.ts` (now 12) and "135 E2E"
  (now 138). Refresh both numbers.
  - Response: fixed. Now 13 tests in the spec and 139 E2E, both re-counted from
    a full `npm run ci` after the R2.1 and R2.2 fixes rather than carried over.

### Verified

- R1.1, R1.2 and R1.3 confirmed fixed and ticked. The out-of-context pass
  reproduced the R1.1 falsification independently: with `refreshNav()` removed,
  "the forward nav re-evaluates" fails at `archiveFilter.spec.ts:169` with
  `#carousel-right` disabled where enabled was expected; file restored
  byte-identically by `sha256sum`.
- The wheel-based duplicate-listener test is the right substitute for the
  nav-click assertion R1.1 originally suggested. Both passes measured the same
  smooth-scroll collapse: two `scrollBy` calls in one tick land at 358px, as
  does one.
- The recording pass re-derived R2.1's load-bearing claim rather than taking it
  from the reviewer, since it reverses a round-1 change: same-tick wipe and
  re-append with no layout read reported `scrollLeft` 3000, and 0 only with a
  layout flushed while empty.
- `npm run ci` green in both passes: 24 Jest suites / 336 tests, 138 Playwright
  tests.

- Process signal: the R1.1 Response asserted a browser fact as settled and used
  it to delete code AND rewrite a plan Step, but the falsification behind it
  only showed a test staying green - which is equally consistent with an
  incidental clamp. Deleting code and amending a plan on a mechanism claim needs
  the mechanism probed directly, not just its symptom observed.

## Round 3

- REVIEWER: out-of-context
- VERDICT: APPROVE

R2.1 through R2.4 are confirmed fixed and ticked. Two MINOR findings remain
open; neither affects behaviour or the Story, so under the verdict rule they do
not block.

- [x] R3.1 (MINOR) e2e/archiveFilter.spec.ts:231 - the test comment claims "the
  wipe alone does not reset it ... so this pins the explicit reset", and the
  R2.1 Response repeats it. Both are false. Re-derived by the recording pass as
  well as the reviewer: with `carousel.scrollLeft = 0` removed from
  `renderCards`, "a filter change starts the new list at its beginning" still
  PASSES; it only fails if the line is changed to a non-zero value. The
  incidental `shrinkCardTitle` layout flush that R2.1 itself identified is what
  keeps it green, so the assertion cannot tell the explicit reset apart from the
  clamp. Restoring the line was still correct - it guards a coupling
  `renderCards` must not depend on - but the comment should say so: rewrite it
  as a guard on the re-render as a whole that cannot fail for the explicit reset
  - Response: fixed. Re-derived before accepting, and the finding holds: with
    `carousel.scrollLeft = 0` removed the test still passes, so it never pinned
    that line. The comment now states what the assertion does and does not
    cover, and names the non-zero-value case that does make it fail. The R2.1
    Response above is corrected in place with a pointer here rather than
    silently, since it is the second time the same mistake was made.

- [x] R3.2 (MINOR) src/partials/archive.css:114 - `.archive-card`'s
  `max-height: calc(100vh - 200px)` and `min-height: min(420px, calc(100vh -
  200px))`, with their narrow twins at `src/partials/responsive.css:257-258`,
  are now dead for every consumer: both archives override them through
  `.archive-container-fitted .archive-card` and `/profile` through
  `.profile-carousel .archive-card`. A reader tuning those numbers - which
  TASK.md Step 8 still instructs - would see no effect. Delete the four height
  declarations, keeping `flex`, `height: auto` and `scroll-snap-align`, and
  - Response: fixed. Confirmed dead against every consumer first - `archive-card`
    is applied in only `src/clades.ts`, `src/species.ts` and
    `src/profile/dinosaurList.ts`, the first two under
    `.archive-container-fitted` and the third under `.profile-carousel`, both of
    which win on specificity in the narrow media query too. Removed the two
    height declarations from `.archive-card` in `src/partials/archive.css` and
    the two narrow twins in `src/partials/responsive.css`, keeping `flex`,
    `height: auto` and `scroll-snap-align`. Step 8 is reduced to a note. Full
    `npm run ci` and `npm run build` green after the removal.

### Verified

- The rename sweep is clean: `archive-container-fitted` appears only in
  `src/species.html:16`, `src/clades.html:16` and `src/partials/archive.css`,
  with no earlier name surviving outside REVIEW.md's own history. The rule beats
  the narrow `.archive-card` block on specificity (0,2,0 vs 0,1,0), so it holds
  inside the media query.
- R2.2's new test falsified independently: without the class on
  `src/clades.html` the link lands 37px past the carousel's bottom edge.
- No fix-induced layout regression: `.archive-container` exists only on the two
  archive pages, `/profile` cards sit under `.profile-carousel`, which overrides
  both height terms itself, and the other `/clades` coverage
  (`images.spec.ts`, `routes.spec.ts`) passes.
- Record accuracy re-counted from a fresh run: 13 tests in
  `e2e/archiveFilter.spec.ts`, 6 in `test/cladeFilter.test.ts`, 336 unit and 139
  E2E - matching the close-out.
- `npm run ci` green and `npm run build` compiles, in both the reviewing and the
  recording pass.

- Process signal: three rounds, three sets of real defects, and each round's
  fix introduced the next round's finding - the deleted reset (R2.1) came from
  R1.1's fix, and R3.1's false comment came from R2.1's fix. Every one of them
  was a claim about browser behaviour asserted from a passing test rather than
  from the mechanism. The cheap habit that would have caught all three earlier:
  when a test's greenness is the evidence for a claim, change the line the claim
  is about and watch the test go red before believing it.

## Round 4

- REVIEWER: in-session (verification of two MINOR fixes whose evidence this pass
  had already re-derived first-hand: R3.1's falsification was run here before
  the finding was accepted, and R3.2's dead-code claim was checked against all
  three `archive-card` consumers. A fourth out-of-context reviewer for two
  non-behavioural findings on an already-APPROVEd branch is disproportionate.)
- VERDICT: APPROVE

R3.1 and R3.2 are fixed and ticked. No findings.

Both were raised after round 3's APPROVE and fixed at the user's direction
rather than because they blocked the verdict.

### Verified

- R3.1: the test comment now says the assertion guards the re-render as a whole
  and cannot fail for the explicit reset alone, which matches the measured
  behaviour - removing `carousel.scrollLeft = 0` leaves it green, changing the
  value to non-zero turns it red. The R2.1 Response is corrected in place with a
  pointer to R3.1 rather than rewritten, so the record still shows the wrong
  call was made twice.
- R3.2: the four height declarations are gone from `src/partials/archive.css`
  and `src/partials/responsive.css`; `flex`, `height: auto` and
  `scroll-snap-align` are kept. Every `archive-card` consumer was enumerated
  before the removal - `src/clades.ts`, `src/species.ts` under
  `.archive-container-fitted`, `src/profile/dinosaurList.ts` under
  `.profile-carousel` - and both overriding selectors are (0,2,0), so they win
  inside the narrow media query as well.
- `npm run ci` green after the removal: 24 Jest suites / 336 tests, 139
  Playwright tests, including every archive and profile geometry assertion.
  `npm run build` compiles.
