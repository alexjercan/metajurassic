# Drive the guess budget in markup from MAX_GUESSES

- PRIORITY: 40
- TAGS: chore, content
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a maintainer changing the guess budget, I want every surface that states it
to follow the constant, so that a reprice does not leave the board and the FAQ
telling the player a different number from the one the game enforces.

## Finding

Raised as a pre-existing observation during the out-of-context review of
`20260729-092327` (see that task's `REVIEW.md`, round 1 prose notes). Not a
blocker on that branch: it predates it, and that branch fixed the same family of
defect for `HINT_COST` (deleting the hardcoded `Cost 3 Guesses` from
`src/index.html` and driving the chip from the constant).

Two copies of `MAX_GUESSES` remain typed into markup:

- `src/index.html` - `<div class="stat-box" id="stat-box">Guesses Left: 25</div>`.
  Harmless today because `updateUI()` overwrites it on first render, but it is
  what a reader sees in the template and what shows in the pre-hydration frame.
- `src/faq.html` - "You have 25 attempts to find the target." Nothing overwrites
  this one; it is a static page and would simply go stale.

`20260729-092327` added `src/ui/onboarding.ts`, whose brief copy already builds
its budget line from `MAX_GUESSES`, so the pattern to follow exists.

## Steps

- [ ] `src/index.html` - empty the `#stat-box` element the way `#hint-text` was
      emptied, leaving a comment that names `updateUI()` in `src/game/index.ts`
      as the filler and `MAX_GUESSES` as the source. `updateUI()` already runs
      unconditionally at init (`src/game/index.ts:255`), so no wiring changes.
- [ ] `src/faqCopy.ts` (new) - pure copy builder
      `guessBudgetAnswer(): string` returning the "How do I play?" answer's
      final sentence built from `MAX_GUESSES`. Pure, no DOM, so Jest can cover
      it; `src/ui/**` is excluded from coverage, this is not under `ui/`.
- [ ] `src/faq.html` - replace the literal on line 37 with an empty
      `<span id="faq-guess-budget"></span>` placeholder plus a comment naming
      `src/faq.ts` as the filler.
- [ ] `src/faq.ts` - fill `#faq-guess-budget` from `guessBudgetAnswer()` on
      load. Currently the file only imports `style.css`; keep it that thin.
- [ ] `test/faqCopy.test.ts` (new) - assert `guessBudgetAnswer()` contains
      `String(MAX_GUESSES)` and no other integer, i.e. the sentence follows the
      constant rather than restating it.
- [ ] `e2e/faq.spec.ts` (new) - load `/faq/`, load the board, and assert both
      state the same budget: parse the integer out of `#stat-box` on first
      render and assert `#faq-guess-budget` contains it. No literal `25` in the
      assertion.
- [ ] Sweep and record: run
      `grep -rnE '\b25\b|\b3 [Gg]uesses\b' src/*.html`
      and paste the (empty) output into the work record. The glob covers the
      page templates and the `_header`/`_footer`/`_head` partials (verified:
      `ls src/*.html` lists all eight). Narrowed to HTML because those are the
      surfaces no test renders
      against the constant; `.ts` prose comments and E2E fixtures that name 25
      are out of scope and stay.

## Definition of Done

- No page template states the guess budget as a literal. (cmd:
  `grep -rnE '\b25\b|\b3 [Gg]uesses\b' src/*.html` exits 1
  with empty output; red on base - run 2026-08-04, it matches `src/faq.html:37` and
  `src/index.html:24`. Narrowing reason recorded per `LESSONS.md`
  `absence-proving-greps-must-be-run-when-written`.)
- Changing `MAX_GUESSES` changes every surface that states it. (test:
  `npx jest test/faqCopy.test.ts` over the copy builder, plus
  `npx playwright test e2e/faq.spec.ts` asserting the board and the FAQ agree
  on a number neither test hardcodes. Both red on base - neither file exists.)
- `npm run ci` passes, including the existing `#stat-box` E2E specs that read
  "Guesses Left: N" after hydration. (cmd: `npm run ci`)

## Notes

- Discovered: `src/faq.ts` is already a webpack entry (`webpack.config.js`,
  `entry.faq`) chunked into `faq/index.html`, so the FAQ page runs JS today.
  Hydration is available without any build-config change.
- Discovered: `webpack-partials.js` `<%= key %>` substitution runs at
  `beforeEmit` with a fixed var set (basePath, siteUrl, page social copy). It
  is a build-time channel, but feeding it `MAX_GUESSES` means
  `webpack.config.js` (CommonJS) reading `src/constants.ts` (TypeScript) - see
  DECISION.md.
- Assumption: an empty `#stat-box` for the pre-hydration frame is acceptable.
  `.stat-box` is a fixed-size chip (`src/partials/game-shell.css:40`), and
  `#hint-text` already ships empty in the same top bar, so no new layout shift.
- Assumption: FAQ text rendered by JS rather than shipped in the HTML is
  acceptable for SEO. The page's crawler-facing copy (title, description,
  og/canonical) comes from `_head.html` and is untouched; one sentence of body
  prose moves behind hydration.
- Out of scope: E2E specs and code comments that spell 25 or 3 in prose
  (`e2e/postgame.spec.ts:318`, `src/ui/onboarding.ts:15-21`,
  `src/partials/responsive.css:5`, `src/gameOverCopy.ts:8`). Those are
  narrative about a past state or fixture expectations, not player-facing copy.
